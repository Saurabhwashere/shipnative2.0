import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
import { sql } from 'drizzle-orm';

// ─── users ────────────────────────────────────────────────────────────────────
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    displayName: text('display_name'),
    avatarUrl: text('avatar_url'),
    plan: text('plan').notNull().default('free'), // 'free' | 'pro' | 'team'
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
    updatedAt: timestamptz('updated_at').notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('users_clerk_id_idx').on(t.clerkId),
    uniqueIndex('users_email_idx').on(t.email),
  ]
);

// ─── projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('Untitled App'),
    description: text('description'),
    templateKey: text('template_key'), // 'tasks-light-tabs' etc.
    category: text('category'),        // 'fitness', 'commerce', etc.
    theme: text('theme'),              // 'light' | 'dark'
    navPattern: text('nav_pattern'),   // 'bottom-tabs' | 'stack'
    isPublic: boolean('is_public').notNull().default(false),
    publicSlug: text('public_slug').unique(), // share URL slug
    deletedAt: timestamptz('deleted_at'),     // soft delete
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
    updatedAt: timestamptz('updated_at').notNull().default(sql`now()`),
  },
  (t) => [
    index('projects_user_deleted_idx').on(t.userId, t.deletedAt),
    index('projects_user_updated_idx').on(t.userId, t.updatedAt),
    uniqueIndex('projects_public_slug_idx').on(t.publicSlug),
  ]
);

// ─── conversations ────────────────────────────────────────────────────────────
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title'),
    phase: text('phase').notNull().default('interactive'), // 'interactive' | 'initial-build' | 'edit'
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
    updatedAt: timestamptz('updated_at').notNull().default(sql`now()`),
  },
  (t) => [
    index('conversations_project_active_idx').on(t.projectId, t.isActive),
    index('conversations_project_created_idx').on(t.projectId, t.createdAt),
  ]
);

// ─── messages ─────────────────────────────────────────────────────────────────
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // 'user' | 'assistant'
    content: text('content').notNull().default(''),
    toolName: text('tool_name'), // 'writeFile' | 'proposePlan' | etc.
    toolInput: jsonb('tool_input'),
    toolResult: jsonb('tool_result'),
    sequenceIndex: integer('sequence_index').notNull(),
    refImageUrl: text('ref_image_url'),     // Supabase Storage URL
    refImageIntent: text('ref_image_intent'), // 'design-reference' | 'asset' | 'element-copy' | 'ambiguous'
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
  },
  (t) => [
    index('messages_conversation_sequence_idx').on(t.conversationId, t.sequenceIndex),
    index('messages_conversation_role_tool_idx').on(t.conversationId, t.role, t.toolName),
  ]
);

// ─── project_files ────────────────────────────────────────────────────────────
export const projectFiles = pgTable(
  'project_files',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    path: text('path').notNull(), // 'App.jsx', 'screens/HomeScreen.jsx'
    content: text('content').notNull(),
    sizeBytes: integer('size_bytes').notNull().default(0),
    lastWrittenBy: text('last_written_by'), // 'ai' | 'user'
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
    updatedAt: timestamptz('updated_at').notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('project_files_project_path_idx').on(t.projectId, t.path),
    index('project_files_project_updated_idx').on(t.projectId, t.updatedAt),
  ]
);

// ─── snapshots ────────────────────────────────────────────────────────────────
export const snapshots = pgTable(
  'snapshots',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    conversationId: uuid('conversation_id').references(() => conversations.id, {
      onDelete: 'set null',
    }),
    label: text('label').notNull(),
    fileCount: integer('file_count').notNull().default(0),
    triggeredBy: text('triggered_by').notNull().default('user'), // 'user' | 'auto'
    createdAt: timestamptz('created_at').notNull().default(sql`now()`),
  },
  (t) => [index('snapshots_project_created_idx').on(t.projectId, t.createdAt)]
);

// ─── snapshot_files ───────────────────────────────────────────────────────────
export const snapshotFiles = pgTable(
  'snapshot_files',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => snapshots.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    content: text('content').notNull(),
  },
  (t) => [
    uniqueIndex('snapshot_files_snapshot_path_idx').on(t.snapshotId, t.path),
    index('snapshot_files_snapshot_idx').on(t.snapshotId),
  ]
);

// ─── Types ────────────────────────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type NewProjectFile = typeof projectFiles.$inferInsert;

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;

export type SnapshotFile = typeof snapshotFiles.$inferSelect;
export type NewSnapshotFile = typeof snapshotFiles.$inferInsert;
