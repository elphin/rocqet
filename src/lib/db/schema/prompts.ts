import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { workspaces } from './workspaces';

export const prompts = pgTable('prompts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  content: text('content').notNull(),
  
  // Organization
  folderId: uuid('folder_id'),
  position: integer('position').default(0),
  
  // Variables & Parameters
  variables: jsonb('variables').default([]), // [{name, type, defaultValue, description}]
  parameters: jsonb('parameters').default({}), // Model parameters
  
  // AI Settings
  model: varchar('model', { length: 100 }).default('gpt-4'),
  temperature: integer('temperature').default(7), // 0-20, divide by 10 for actual value
  maxTokens: integer('max_tokens'),
  
  // Versioning
  version: integer('version').default(1).notNull(),
  isPublished: boolean('is_published').default(false),
  publishedAt: timestamp('published_at'),
  
  // Stats
  usageCount: integer('usage_count').default(0),
  lastUsedAt: timestamp('last_used_at'),
  averageRating: integer('average_rating'), // 1-5 stars * 10 for precision
  
  // Collaboration
  isShared: boolean('is_shared').default(false),
  shareSettings: jsonb('share_settings').default({}),
  
  // Metadata
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('prompts_workspace_idx').on(table.workspaceId),
  folderIdx: index('prompts_folder_idx').on(table.folderId),
  createdByIdx: index('prompts_created_by_idx').on(table.createdBy),
}));

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id').references(() => prompts.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  version: integer('version').notNull(),
  content: text('content').notNull(),
  variables: jsonb('variables').default([]),
  parameters: jsonb('parameters').default({}),
  
  // Change tracking
  changeType: varchar('change_type', { length: 50 }).notNull(), // create, update, publish, revert
  changeMessage: text('change_message'),
  diff: jsonb('diff'), // JSON Patch format
  
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  promptIdx: index('prompt_versions_prompt_idx').on(table.promptId),
  versionIdx: index('prompt_versions_version_idx').on(table.promptId, table.version),
}));

export const folders = pgTable('folders', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  parentId: uuid('parent_id'),
  
  color: varchar('color', { length: 7 }), // Hex color
  icon: varchar('icon', { length: 50 }), // Icon name
  
  position: integer('position').default(0),
  
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('folders_workspace_idx').on(table.workspaceId),
  parentIdx: index('folders_parent_idx').on(table.parentId),
}));

export const promptRuns = pgTable('prompt_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id').references(() => prompts.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  // Execution details
  input: jsonb('input').notNull(), // Variable values used
  output: text('output'),
  model: varchar('model', { length: 100 }).notNull(),
  parameters: jsonb('parameters').notNull(),
  
  // Performance
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  latencyMs: integer('latency_ms'),
  cost: integer('cost'), // In cents
  
  // Status
  status: varchar('status', { length: 50 }).notNull(), // pending, running, success, error
  error: text('error'),
  
  // User feedback
  rating: integer('rating'), // 1-5
  feedback: text('feedback'),
  
  executedBy: uuid('executed_by').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  promptIdx: index('prompt_runs_prompt_idx').on(table.promptId),
  workspaceIdx: index('prompt_runs_workspace_idx').on(table.workspaceId),
  executedAtIdx: index('prompt_runs_executed_at_idx').on(table.executedAt),
}));

// Relations
export const promptsRelations = relations(prompts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [prompts.workspaceId],
    references: [workspaces.id],
  }),
  folder: one(folders, {
    fields: [prompts.folderId],
    references: [folders.id],
  }),
  versions: many(promptVersions),
  runs: many(promptRuns),
}));

export const promptVersionsRelations = relations(promptVersions, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptVersions.promptId],
    references: [prompts.id],
  }),
  workspace: one(workspaces, {
    fields: [promptVersions.workspaceId],
    references: [workspaces.id],
  }),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [folders.workspaceId],
    references: [workspaces.id],
  }),
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
  }),
  children: many(folders),
  prompts: many(prompts),
}));

// Zod Schemas
export const insertPromptSchema = createInsertSchema(prompts);
export const selectPromptSchema = createSelectSchema(prompts);
export const insertPromptVersionSchema = createInsertSchema(promptVersions);
export const selectPromptVersionSchema = createSelectSchema(promptVersions);
export const insertFolderSchema = createInsertSchema(folders);
export const selectFolderSchema = createSelectSchema(folders);

export type Prompt = z.infer<typeof selectPromptSchema>;
export type NewPrompt = z.infer<typeof insertPromptSchema>;
export type PromptVersion = z.infer<typeof selectPromptVersionSchema>;
export type NewPromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type Folder = z.infer<typeof selectFolderSchema>;
export type NewFolder = z.infer<typeof insertFolderSchema>;