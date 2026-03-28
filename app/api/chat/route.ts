import { streamText, convertToModelMessages, stepCountIs, dynamicTool } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@clerk/nextjs/server';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { routeSkills } from '@/lib/skill-router';
import { buildFileContext } from '@/lib/file-context';
import { trimMessages } from '@/lib/history-utils';
import { askQuestionsTool, proposePlanTool, writeFileTool, readFileTool, fixErrorTool } from '@/lib/ai-tools';
import { rateLimiters } from '@/lib/rate-limit';
import { ChatRequestSchema } from '@/lib/validation/schemas';
import { sanitizeForPrompt } from '@/lib/sanitize';

export const maxDuration = 300;

const MAX_MESSAGES = 150;
const MAX_TOTAL_CHARS = 500_000; // ~125k tokens

export async function POST(req: Request) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const rl = rateLimiters.chat.check(clerkId);
  if (!rl.success) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(rl.limit),
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(Math.ceil(rl.resetInMs / 1000)),
      },
    });
  }

  // ── Parse & validate request body ────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const parsed = ChatRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { messages: rawMessages, projectFiles, referenceImage } = parsed.data;
  const messages = rawMessages ?? [];

  // ── Message size guards ───────────────────────────────────────────────────
  if (messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: 'Too many messages in conversation' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totalChars = messages.reduce((sum, m) => {
    const parts = (m.parts ?? []) as Array<{ type: string; text?: string }>;
    return sum + parts.filter((p) => p.type === 'text').reduce((s, p) => s + (p.text?.length ?? 0), 0);
  }, 0);

  if (totalChars > MAX_TOTAL_CHARS) {
    return new Response(JSON.stringify({ error: 'Conversation too large' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Sanitize user messages against prompt injection ───────────────────────
  const sanitizedMessages = messages.map((m) => {
    if (m.role !== 'user') return m;
    return {
      ...m,
      parts: ((m.parts ?? []) as Array<{ type: string; text?: string }>).map((p) =>
        p.type === 'text' && p.text ? { ...p, text: sanitizeForPrompt(p.text) } : p,
      ),
    };
  });

  const refImage = referenceImage as { dataUrl: string; mimeType: string } | null | undefined;

  console.log('[API] msgs:', messages.length, '| files:', projectFiles?.length ?? 0, '| image:', !!refImage);

  // ── Tool definitions with server-side execute functions ─────────────────
  const tools = {
    askQuestions: dynamicTool({
      ...askQuestionsTool,
      execute: async (args: unknown) => ({ success: true, questions: (args as { questions: unknown }).questions }),
    }),

    proposePlan: dynamicTool({
      ...proposePlanTool,
      execute: async (args: unknown) => ({ success: true, plan: args }),
    }),

    writeFile: dynamicTool({
      ...writeFileTool,
      execute: async (args: unknown) => ({ success: true, path: (args as { path: string; description: string }).path, description: (args as { path: string; description: string }).description }),
    }),

    readFile: dynamicTool({
      ...readFileTool,
      execute: async (args: unknown) => {
        const { path } = args as { path: string };
        const normalised = path.replace(/^\/+/, '');

        // ── Path traversal guard ────────────────────────────────────────
        if (normalised.includes('..') || normalised.includes('\0') || /^[/\\]/.test(normalised)) {
          return { error: `Invalid path: ${path}`, path };
        }

        const file = (projectFiles as Array<{ path: string; content: string }> | null)?.find(
          (f) => f.path === normalised || f.path === path,
        );
        if (!file) return { error: `File not found: ${path}`, path };
        return { path: file.path, content: file.content };
      },
    }),

    fixError: dynamicTool({
      ...fixErrorTool,
      execute: async (args: unknown) => ({
        success: true,
        filePath: (args as { filePath: string; explanation: string }).filePath,
        explanation: (args as { filePath: string; explanation: string }).explanation,
      }),
    }),
  };

  // ── Phase detection ──────────────────────────────────────────────────────
  type MsgPart = { type: string; text?: string; toolName?: string };
  type Msg = { role: string; parts?: MsgPart[] };
  const msgList = sanitizedMessages as Msg[];

  const hasApprovedPlan = msgList.some(
    (m) => m.role === 'user' &&
      (m.parts ?? []).some((p) => p.type === 'text' && (p.text ?? '').includes('Plan approved')),
  );

  const hasWrittenFiles = msgList.some(
    (m) => m.role === 'assistant' &&
      (m.parts ?? []).some((p) => p.type === 'dynamic-tool' && p.toolName === 'writeFile'),
  );

  const lastUserText = [...msgList].reverse()
    .find((m) => m.role === 'user')
    ?.parts?.find((p) => p.type === 'text')?.text ?? '';
  const isPlanApprovalMsg = lastUserText.includes('Plan approved');

  const buildMode = hasApprovedPlan || hasWrittenFiles;

  const phase = !buildMode
    ? 'interactive'
    : isPlanApprovalMsg || !hasWrittenFiles
      ? 'initial-build'
      : 'edit';

  const toolChoice = buildMode ? ('auto' as const) : ('required' as const);
  const maxSteps = buildMode ? 15 : 1;

  console.log('[API] phase:', phase, '| toolChoice:', toolChoice, '| maxSteps:', maxSteps, '| msgs:', messages.length);

  // ── Trim history to keep context window lean ─────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trimmedMessages = trimMessages(sanitizedMessages as any[]);

  // ── Convert UI messages → model messages ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelMessages = await convertToModelMessages(trimmedMessages as any, { tools });

  // ── Inject image into last user message with intent-based mode tag ──────────
  if (refImage?.dataUrl) {
    const base64Data = refImage.dataUrl.includes(',')
      ? refImage.dataUrl.split(',')[1]
      : refImage.dataUrl;

    // Enforce 5 MB limit on the decoded image buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    if (imageBuffer.length > MAX_IMAGE_BYTES) {
      return new Response(JSON.stringify({ error: 'Image exceeds 5 MB limit' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Detect intent from the user's text message
    const userText = lastUserText.toLowerCase();

    const isDesignRef =
      /make.{0,20}look like|design.{0,15}like|copy.{0,15}style|match.{0,15}design|inspired.{0,10}by|similar.{0,10}to|use.{0,15}(as|for).{0,15}(design|reference|style|template)|design reference/.test(userText);

    const isAsset =
      /use.{0,20}(as|for).{0,20}(background|hero|asset|icon|logo|avatar|image|photo|picture|banner|cover|header image)|add.{0,15}(this|the).{0,15}(image|photo|picture)|background image|splash/.test(userText);

    const ALLOWED_ELEMENTS = ['card', 'button', 'btn', 'nav', 'navbar', 'header', 'tab', 'modal', 'chip', 'badge', 'list', 'row', 'input', 'search', 'icon'] as const;
    type AllowedElement = (typeof ALLOWED_ELEMENTS)[number];
    const elementMatch = userText.match(
      /copy.{0,20}(card|button|btn|nav|navbar|header|tab|modal|chip|badge|list|row|input|search|icon)/,
    );
    const isElementCopy = !!elementMatch;

    let modeTag: string;
    if (isDesignRef) {
      modeTag = '[IMG:design-reference]';
    } else if (isElementCopy) {
      const rawElement = elementMatch![1].trim();
      // Whitelist the element name to prevent injection via the mode tag
      const element: AllowedElement = ALLOWED_ELEMENTS.includes(rawElement as AllowedElement)
        ? (rawElement as AllowedElement)
        : 'card';
      modeTag = `[IMG:element-copy:${element}]`;
    } else if (isAsset) {
      modeTag = '[IMG:asset]';
    } else {
      modeTag = '[IMG:ambiguous]';
    }

    let lastUserIdx = -1;
    for (let i = modelMessages.length - 1; i >= 0; i--) {
      if (modelMessages[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx !== -1) {
      const msg = modelMessages[lastUserIdx];
      const existing = Array.isArray(msg.content)
        ? msg.content
        : [{ type: 'text' as const, text: msg.content as string }];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingTextParts = existing.filter((p) => p.type === 'text') as any[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      modelMessages[lastUserIdx] = {
        ...msg,
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: modeTag },
          {
            type: 'image' as const,
            image: imageBuffer,
            mediaType: refImage.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          },
          ...existingTextParts,
        ] as any,
      };

      console.log('[API] image intent:', modeTag);
    }
  }

  // ── Per-phase system prompt assembly ─────────────────────────────────────
  const skillBlock = phase !== 'interactive' ? routeSkills(sanitizedMessages as any[]) : '';

  // ── Smart file context ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fileContext = buildFileContext(projectFiles, sanitizedMessages as any[], phase);

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: SYSTEM_PROMPT + skillBlock + fileContext,
    messages: modelMessages,
    tools,
    toolChoice,
    stopWhen: stepCountIs(maxSteps),
  });

  return result.toUIMessageStreamResponse();
}
