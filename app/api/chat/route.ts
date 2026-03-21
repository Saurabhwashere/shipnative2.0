import { streamText, convertToModelMessages, stepCountIs, dynamicTool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { askQuestionsTool, proposePlanTool, writeFileTool, readFileTool, fixErrorTool } from '@/lib/ai-tools';

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, projectFiles, referenceImage } = body;
  const refImage = referenceImage as { dataUrl: string; mimeType: string } | null | undefined;

  console.log('[API] Messages received:', messages?.length ?? 0);
  console.log('[API] Last message role:', messages?.[messages.length - 1]?.role);
  console.log('[API] Project files:', projectFiles?.length ?? 0);
  console.log('[API] Reference image present:', !!refImage);

  // ── File context injected into system prompt ─────────────────────────────
  const fileContext =
    projectFiles && projectFiles.length > 0
      ? `\n\nCurrent project files:\n${projectFiles
          .map(
            (f: { path: string; content: string }) =>
              `--- ${f.path} (${f.content.split('\n').length} lines) ---\n${f.content}`,
          )
          .join('\n\n')}`
      : '\n\nNo files in the project yet.';

  // ── Tool definitions with server-side execute functions ─────────────────
  const tools = {
    askQuestions: dynamicTool({
      ...askQuestionsTool,
      // No server-side execution needed — client renders the QuestionCard
      execute: async (args) => ({ success: true, questions: args.questions }),
    }),

    proposePlan: dynamicTool({
      ...proposePlanTool,
      // No server-side execution needed — client renders the PlanCard
      execute: async (args) => ({ success: true, plan: args }),
    }),

    writeFile: dynamicTool({
      ...writeFileTool,
      // Execute returns success — the CLIENT writes to VFS by observing tool input
      execute: async (args) => ({ success: true, path: args.path, description: args.description }),
    }),

    readFile: dynamicTool({
      ...readFileTool,
      execute: async ({ path }) => {
        const normalised = path.replace(/^\/+/, '');
        const file = (projectFiles as Array<{ path: string; content: string }> | null)?.find(
          (f) => f.path === normalised || f.path === path,
        );
        if (!file) return { error: `File not found: ${path}`, path };
        return { path: file.path, content: file.content };
      },
    }),

    fixError: dynamicTool({
      ...fixErrorTool,
      // Client applies correctedCode to VFS by observing tool input (same pattern as writeFile)
      execute: async (args) => ({
        success: true,
        filePath: args.filePath,
        explanation: args.explanation,
      }),
    }),
  };

  // ── Phase detection ──────────────────────────────────────────────────────
  // Build mode = plan has been approved OR files have already been written.
  // Interactive mode = still in Q&A / plan approval phase.
  const msgList = (messages ?? []) as Array<{
    role: string;
    parts?: Array<{ type: string; text?: string; toolName?: string }>;
  }>;

  const hasApprovedPlan = msgList.some(
    (m) =>
      m.role === 'user' &&
      (m.parts ?? []).some(
        (p) => p.type === 'text' && (p.text ?? '').includes('Plan approved'),
      ),
  );

  const hasWrittenFiles = msgList.some(
    (m) =>
      m.role === 'assistant' &&
      (m.parts ?? []).some(
        (p) => p.type === 'dynamic-tool' && p.toolName === 'writeFile',
      ),
  );

  const buildMode = hasApprovedPlan || hasWrittenFiles;

  // Interactive phase: force exactly ONE tool call then stop — Claude calls
  // askQuestions (or proposePlan) and the stream ends, waiting for user input.
  // Build phase: allow up to 15 steps so Claude can write all files at once.
  const toolChoice = buildMode ? ('auto' as const) : ('required' as const);
  const maxSteps = buildMode ? 15 : 1;

  console.log('[API] phase:', buildMode ? 'build' : 'interactive', '| toolChoice:', toolChoice, '| maxSteps:', maxSteps);

  // ── Convert UI messages → model messages ────────────────────────────────
  const modelMessages = await convertToModelMessages(messages ?? [], { tools });

  // ── Inject reference image into last user message ─────────────────────────
  if (refImage?.dataUrl) {
    // The AI SDK requires a Uint8Array (not a data: URL string) for binary image data.
    // Strip the "data:<mime>;base64," prefix and decode to a Buffer.
    const base64Data = refImage.dataUrl.includes(',')
      ? refImage.dataUrl.split(',')[1]
      : refImage.dataUrl;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    let lastUserIdx = -1;
    for (let i = modelMessages.length - 1; i >= 0; i--) {
      if (modelMessages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx !== -1) {
      const msg = modelMessages[lastUserIdx];
      const existing = Array.isArray(msg.content)
        ? msg.content
        : [{ type: 'text' as const, text: msg.content as string }];
      modelMessages[lastUserIdx] = {
        ...msg,
        content: [
          {
            type: 'text' as const,
            text: '[DESIGN REFERENCE] The image below is a design reference screenshot. Analyze its visual DNA — extract specific hex colors, corner radius values, card style, typography weight, spacing density, and navigation pattern. You MUST apply this visual language when building the app. Do NOT use default palettes.',
          },
          {
            type: 'image' as const,
            image: imageBuffer,
            mimeType: refImage.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          },
          ...existing,
        ],
      };
    }
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: SYSTEM_PROMPT + fileContext,
    messages: modelMessages,
    tools,
    toolChoice,
    stopWhen: stepCountIs(maxSteps),
  });

  return result.toUIMessageStreamResponse();
}
