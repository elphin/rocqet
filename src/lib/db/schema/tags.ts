import { pgTable, uuid, varchar, timestamp, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { workspaces } from './workspaces';
import { prompts } from './prompts';

// Tags table
export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 7 }).default('#3B82F6'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceNameUnique: unique('tags_workspace_id_name_key').on(table.workspaceId, table.name),
  workspaceIdIdx: index('idx_tags_workspace_id').on(table.workspaceId),
}));

// Prompt-Tags junction table
export const promptTags = pgTable('prompt_tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id').references(() => prompts.id, { onDelete: 'cascade' }).notNull(),
  tagId: uuid('tag_id').references(() => tags.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  promptTagUnique: unique().on(table.promptId, table.tagId),
  promptIdIdx: index('idx_prompt_tags_prompt_id').on(table.promptId),
  tagIdIdx: index('idx_prompt_tags_tag_id').on(table.tagId),
}));

// Relations
export const tagsRelations = relations(tags, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tags.workspaceId],
    references: [workspaces.id],
  }),
  promptTags: many(promptTags),
}));

export const promptTagsRelations = relations(promptTags, ({ one }) => ({
  prompt: one(prompts, {
    fields: [promptTags.promptId],
    references: [prompts.id],
  }),
  tag: one(tags, {
    fields: [promptTags.tagId],
    references: [tags.id],
  }),
}));

// Zod Schemas
export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export const insertPromptTagSchema = createInsertSchema(promptTags);
export const selectPromptTagSchema = createSelectSchema(promptTags);

// Types
export type Tag = z.infer<typeof selectTagSchema>;
export type NewTag = z.infer<typeof insertTagSchema>;
export type PromptTag = z.infer<typeof selectPromptTagSchema>;
export type NewPromptTag = z.infer<typeof insertPromptTagSchema>;