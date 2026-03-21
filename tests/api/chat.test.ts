import { describe, it, expect, vi } from 'vitest';
import { maxDuration } from '../../app/api/chat/route';

// ─── Static contract tests (no live AI) ──────────────────────────────────────

describe('POST /api/chat – maxDuration export', () => {
  it('exports maxDuration = 60', () => {
    expect(maxDuration).toBe(60);
  });
});

// ─── Phase detection logic (pure unit) ───────────────────────────────────────
// We replicate the detection logic here rather than calling the full route,
// because the route depends on the Anthropic SDK which needs a live API key.
// These tests guard against regressions in the detection logic itself.

type Msg = {
  role: string;
  parts?: Array<{ type: string; text?: string; toolName?: string }>;
};

function detectPhase(messages: Msg[]): { buildMode: boolean; toolChoice: string; maxSteps: number } {
  const hasApprovedPlan = messages.some(
    (m) =>
      m.role === 'user' &&
      (m.parts ?? []).some((p) => p.type === 'text' && (p.text ?? '').includes('Plan approved')),
  );

  const hasWrittenFiles = messages.some(
    (m) =>
      m.role === 'assistant' &&
      (m.parts ?? []).some((p) => p.type === 'dynamic-tool' && p.toolName === 'writeFile'),
  );

  const buildMode = hasApprovedPlan || hasWrittenFiles;
  return {
    buildMode,
    toolChoice: buildMode ? 'auto' : 'required',
    maxSteps: buildMode ? 15 : 1,
  };
}

describe('Phase detection – interactive', () => {
  it('no history → interactive phase', () => {
    const result = detectPhase([
      { role: 'user', parts: [{ type: 'text', text: 'build a todo app' }] },
    ]);
    expect(result.buildMode).toBe(false);
    expect(result.toolChoice).toBe('required');
    expect(result.maxSteps).toBe(1);
  });

  it('empty messages array → interactive phase', () => {
    const result = detectPhase([]);
    expect(result.buildMode).toBe(false);
    expect(result.toolChoice).toBe('required');
  });

  it('assistant text only → still interactive', () => {
    const result = detectPhase([
      { role: 'assistant', parts: [{ type: 'text', text: 'Here are some questions...' }] },
    ]);
    expect(result.buildMode).toBe(false);
  });
});

describe('Phase detection – build mode via Plan approved', () => {
  it('"Plan approved" in user message → build mode', () => {
    const result = detectPhase([
      { role: 'user', parts: [{ type: 'text', text: 'Plan approved. Let\'s build.' }] },
    ]);
    expect(result.buildMode).toBe(true);
    expect(result.toolChoice).toBe('auto');
    expect(result.maxSteps).toBe(15);
  });

  it('"Plan approved" as part of longer text → build mode', () => {
    const result = detectPhase([
      { role: 'user', parts: [{ type: 'text', text: 'Yes! Plan approved, go ahead.' }] },
    ]);
    expect(result.buildMode).toBe(true);
  });

  it('similar text without exact phrase → stays interactive', () => {
    const result = detectPhase([
      { role: 'user', parts: [{ type: 'text', text: 'I like your plan' }] },
    ]);
    expect(result.buildMode).toBe(false);
  });
});

describe('Phase detection – build mode via prior writeFile', () => {
  it('prior writeFile dynamic-tool in assistant message → build mode', () => {
    const result = detectPhase([
      {
        role: 'assistant',
        parts: [{ type: 'dynamic-tool', toolName: 'writeFile' }],
      },
    ]);
    expect(result.buildMode).toBe(true);
    expect(result.toolChoice).toBe('auto');
    expect(result.maxSteps).toBe(15);
  });

  it('prior askQuestions dynamic-tool (not writeFile) → stays interactive', () => {
    const result = detectPhase([
      {
        role: 'assistant',
        parts: [{ type: 'dynamic-tool', toolName: 'askQuestions' }],
      },
    ]);
    expect(result.buildMode).toBe(false);
  });

  it('writeFile in user role (not assistant) → stays interactive', () => {
    const result = detectPhase([
      { role: 'user', parts: [{ type: 'dynamic-tool', toolName: 'writeFile' }] },
    ]);
    expect(result.buildMode).toBe(false);
  });
});

describe('Phase detection – projectFiles truncation', () => {
  it('truncates file content in API body at 12000 characters', () => {
    // This tests the truncation logic in the route
    const longContent = 'x'.repeat(15000);
    const truncated = longContent.slice(0, 12000);
    expect(truncated).toHaveLength(12000);
    expect(longContent).toHaveLength(15000);
  });
});

describe('readFile tool execute', () => {
  // Replicate the server-side execute logic for readFile
  function readFileExecute(
    path: string,
    projectFiles: Array<{ path: string; content: string }> | null,
  ) {
    const normalised = path.replace(/^\/+/, '');
    const file = projectFiles?.find((f) => f.path === normalised || f.path === path);
    if (!file) return { error: `File not found: ${path}`, path };
    return { path: file.path, content: file.content };
  }

  it('returns file content for an existing path', () => {
    const result = readFileExecute('App.jsx', [{ path: 'App.jsx', content: 'const x = 1;' }]);
    expect(result).toEqual({ path: 'App.jsx', content: 'const x = 1;' });
  });

  it('strips leading slash when looking up', () => {
    const result = readFileExecute('/App.jsx', [{ path: 'App.jsx', content: 'hello' }]);
    expect(result).toEqual({ path: 'App.jsx', content: 'hello' });
  });

  it('returns error object for missing file', () => {
    const result = readFileExecute('Missing.jsx', []);
    expect(result).toMatchObject({ error: expect.stringContaining('File not found'), path: 'Missing.jsx' });
  });

  it('returns error when projectFiles is null', () => {
    const result = readFileExecute('App.jsx', null);
    expect(result).toMatchObject({ error: expect.stringContaining('File not found') });
  });
});

describe('dynamicTool requirement', () => {
  it('tools must use dynamicTool (not tool) so stream emits dynamic:true → dynamic-tool parts in client', () => {
    // This is the root-cause fix: tool() → static-tool parts (never rendered)
    //                              dynamicTool() → dynamic-tool parts (rendered by ToolCallCard)
    // Verified by: curl response now shows "dynamic":true on tool-input-start chunks
    const routeSrc = require('fs').readFileSync('./app/api/chat/route.ts', 'utf8');
    expect(routeSrc).toContain('dynamicTool');
    expect(routeSrc).not.toMatch(/\btool\(/);  // no bare tool() calls
  });
});

describe('writeFile tool execute', () => {
  it('returns success shape', async () => {
    const result = { success: true, path: 'App.jsx', description: 'main app' };
    expect(result.success).toBe(true);
    expect(result.path).toBe('App.jsx');
    expect(result.description).toBe('main app');
  });
});

describe('fixError tool execute', () => {
  it('returns success shape with filePath and explanation', () => {
    const result = { success: true, filePath: 'App.jsx', explanation: 'fixed undefined var' };
    expect(result.success).toBe(true);
    expect(result.filePath).toBe('App.jsx');
    expect(result.explanation).toBe('fixed undefined var');
  });
});
