import { z } from 'zod';

// ─── Shared ───────────────────────────────────────────────────────────────────

const SafeFilePath = z
  .string()
  .min(1)
  .max(255)
  .refine((p) => !p.includes('..') && !p.startsWith('/') && !p.includes('\0'), {
    message: 'File path must be relative and cannot contain ".." or null bytes',
  });

// ─── /api/chat ────────────────────────────────────────────────────────────────

const MessagePartSchema = z
  .object({
    type: z.string(),
    text: z.string().optional(),
    toolName: z.string().optional(),
  })
  .passthrough();

const MessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    parts: z.array(MessagePartSchema).optional(),
    content: z.union([z.string(), z.array(MessagePartSchema)]).optional(),
  })
  .passthrough();

const ProjectFileSchema = z.object({
  path: SafeFilePath,
  content: z.string().max(200_000, 'File content exceeds 200 KB limit'),
});

const ReferenceImageSchema = z
  .object({
    dataUrl: z.string().startsWith('data:'),
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  })
  .nullable()
  .optional();

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema).max(200, 'Too many messages in history'),
  projectFiles: z.array(ProjectFileSchema).max(100, 'Too many project files').nullable().optional(),
  referenceImage: ReferenceImageSchema,
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ─── /api/projects POST ───────────────────────────────────────────────────────

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  templateKey: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  navPattern: z.enum(['bottom-tabs', 'stack', 'drawer']).optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

// ─── /api/projects/[projectId] PATCH ─────────────────────────────────────────

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  publicSlug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  category: z.string().max(50).optional(),
  navPattern: z.enum(['bottom-tabs', 'stack', 'drawer']).optional(),
});

// ─── /api/projects/[projectId]/files PUT ─────────────────────────────────────

export const UpsertFilesSchema = z.object({
  files: z
    .array(
      z.object({
        path: SafeFilePath,
        content: z.string().max(200_000),
        lastWrittenBy: z.enum(['ai', 'user']).optional(),
      }),
    )
    .max(100, 'Too many files in a single request'),
});

// ─── /api/projects/[projectId]/snapshots POST ────────────────────────────────

export const CreateSnapshotSchema = z.object({
  label: z.string().min(1).max(200),
  files: z
    .array(
      z.object({
        path: SafeFilePath,
        content: z.string().max(200_000),
      }),
    )
    .max(100),
  conversationId: z.string().uuid().optional(),
  triggeredBy: z.enum(['user', 'auto']).optional(),
});

// ─── /api/conversations/[conversationId]/messages POST ───────────────────────

export const AppendMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(50_000).optional(),
        toolName: z.string().max(100).optional(),
        toolInput: z.unknown().optional(),
        toolResult: z.unknown().optional(),
        refImageUrl: z.string().url().max(500).optional(),
        refImageIntent: z
          .enum(['design-reference', 'asset', 'element-copy', 'ambiguous'])
          .optional(),
      }),
    )
    .min(1)
    .max(50, 'Cannot append more than 50 messages at once'),
});

// ─── /api/uploads/reference-image POST ───────────────────────────────────────

export const UploadReferenceImageSchema = z.object({
  dataUrl: z.string().startsWith('data:'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  fileName: z.string().max(255).optional(),
});
