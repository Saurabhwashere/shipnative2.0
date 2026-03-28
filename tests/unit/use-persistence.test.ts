import { describe, expect, it } from 'vitest';
import { toPersistedMessageRows } from '../../lib/hooks/use-persistence';

describe('toPersistedMessageRows', () => {
  it('omits optional string fields instead of sending null', () => {
    const rows = toPersistedMessageRows([
      {
        role: 'assistant',
        parts: [
          {
            type: 'dynamic-tool',
            input: { path: 'App.jsx' },
            output: { ok: true },
          },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        role: 'assistant',
        toolInput: { path: 'App.jsx' },
        toolResult: { ok: true },
      },
    ]);
  });

  it('keeps text content and tool names when present', () => {
    const rows = toPersistedMessageRows([
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Built the screen.' },
          { type: 'dynamic-tool', toolName: 'writeFile', input: { path: 'App.jsx' } },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        role: 'assistant',
        content: 'Built the screen.',
        toolName: 'writeFile',
        toolInput: { path: 'App.jsx' },
      },
    ]);
  });

  it('does not serialize undefined tool input or output as null', () => {
    const rows = toPersistedMessageRows([
      {
        role: 'assistant',
        parts: [
          { type: 'dynamic-tool', toolName: 'writeFile' },
        ],
      },
    ]);

    expect(rows).toEqual([
      {
        role: 'assistant',
        toolName: 'writeFile',
      },
    ]);
    expect(JSON.stringify(rows)).not.toContain('null');
  });
});
