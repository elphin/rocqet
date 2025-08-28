import { pgTable, text, timestamp, uuid, varchar, jsonb, integer, boolean, index, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { workspaces } from './workspaces';
import { prompts } from './prompts';
import { users } from './users';

// Meta-prompt templates for generating prompts
export const metaPromptTemplates = pgTable('meta_prompt_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Template Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(), // coding, writing, analysis, customer_service, etc.
  
  // The actual meta-prompt template
  template: text('template').notNull(),
  
  // Model preferences
  modelPreference: varchar('model_preference', { length: 50 }), // gpt-4, claude-3, gemini-pro, etc.
  temperature: decimal('temperature', { precision: 2, scale: 1 }).default('0.7'),
  maxTokens: integer('max_tokens').default(2000),
  
  // Configuration
  supportedPlatforms: jsonb('supported_platforms').default(['general']), // ['chatgpt', 'claude', 'general']
  variables: jsonb('variables').default([]), // Variables this template expects
  exampleInputs: jsonb('example_inputs').default([]), // Example inputs for this template
  
  // Usage & Performance
  usageCount: integer('usage_count').default(0),
  successRate: integer('success_rate'), // Percentage * 100
  averageRating: decimal('average_rating', { precision: 2, scale: 1 }), // 1.0 to 5.0
  
  // Access Control
  isActive: boolean('is_active').default(true),
  isSystem: boolean('is_system').default(false), // System templates can't be edited
  isPublic: boolean('is_public').default(false), // Available to all workspaces
  
  // Metadata
  tags: jsonb('tags').default([]),
  version: varchar('version', { length: 20 }).default('1.0.0'),
  
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('meta_prompt_templates_workspace_idx').on(table.workspaceId),
  categoryIdx: index('meta_prompt_templates_category_idx').on(table.category),
  activeIdx: index('meta_prompt_templates_active_idx').on(table.isActive),
  publicIdx: index('meta_prompt_templates_public_idx').on(table.isPublic),
}));

// History of prompt generations
export const promptGenerations = pgTable('prompt_generations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Generation Input
  metaPromptId: uuid('meta_prompt_id').references(() => metaPromptTemplates.id, { onDelete: 'set null' }),
  input: jsonb('input').notNull(), // {goal, platform, style, variables, examples, etc.}
  
  // Generated Output
  generatedTitle: varchar('generated_title', { length: 255 }),
  generatedDescription: text('generated_description'),
  generatedContent: text('generated_content').notNull(),
  generatedVariables: jsonb('generated_variables').default([]),
  generatedTags: jsonb('generated_tags').default([]),
  
  // Additional generated metadata
  suggestedModel: varchar('suggested_model', { length: 100 }),
  suggestedTemperature: decimal('suggested_temperature', { precision: 2, scale: 1 }),
  suggestedExamples: jsonb('suggested_examples').default([]),
  
  // Generation Details
  provider: varchar('provider', { length: 50 }).notNull(), // openai, anthropic, google, groq
  modelUsed: varchar('model_used', { length: 100 }).notNull(),
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  cost: integer('cost'), // In cents
  generationTimeMs: integer('generation_time_ms'),
  
  // Usage Tracking
  wasUsed: boolean('was_used').default(false),
  usedInPromptId: uuid('used_in_prompt_id').references(() => prompts.id, { onDelete: 'set null' }),
  
  // Feedback
  userRating: integer('user_rating'), // 1-5
  userFeedback: text('user_feedback'),
  
  // Error Handling
  status: varchar('status', { length: 50 }).default('success'), // success, failed, partial
  error: text('error'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('prompt_generations_workspace_idx').on(table.workspaceId),
  userIdx: index('prompt_generations_user_idx').on(table.userId),
  metaPromptIdx: index('prompt_generations_meta_prompt_idx').on(table.metaPromptId),
  createdAtIdx: index('prompt_generations_created_at_idx').on(table.createdAt),
  wasUsedIdx: index('prompt_generations_was_used_idx').on(table.wasUsed),
}));

// Feedback on generated prompts
export const generationFeedback = pgTable('generation_feedback', {
  id: uuid('id').defaultRandom().primaryKey(),
  generationId: uuid('generation_id').references(() => promptGenerations.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Feedback Details
  rating: integer('rating').notNull(), // 1-5
  feedback: text('feedback'),
  
  // Improvement suggestions
  suggestedChanges: text('suggested_changes'),
  wasHelpful: boolean('was_helpful'),
  
  // Categories of feedback
  feedbackType: varchar('feedback_type', { length: 50 }), // quality, accuracy, relevance, formatting
  tags: jsonb('tags').default([]),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  generationIdx: index('generation_feedback_generation_idx').on(table.generationId),
  userIdx: index('generation_feedback_user_idx').on(table.userId),
}));

// A/B testing for meta-prompts
export const metaPromptVariants = pgTable('meta_prompt_variants', {
  id: uuid('id').defaultRandom().primaryKey(),
  originalId: uuid('original_id').references(() => metaPromptTemplates.id, { onDelete: 'cascade' }).notNull(),
  
  // Variant Details
  name: varchar('name', { length: 255 }).notNull(),
  template: text('template').notNull(),
  description: text('description'),
  
  // Test Configuration
  testPercentage: integer('test_percentage').default(50), // % of users who see this variant
  isActive: boolean('is_active').default(true),
  
  // Performance Metrics
  usageCount: integer('usage_count').default(0),
  successRate: integer('success_rate'), // Percentage * 100
  averageRating: decimal('average_rating', { precision: 2, scale: 1 }),
  conversionRate: integer('conversion_rate'), // % of generations that were used
  
  // Test Results
  winnerDeclared: boolean('winner_declared').default(false),
  testStartedAt: timestamp('test_started_at'),
  testEndedAt: timestamp('test_ended_at'),
  
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  originalIdx: index('meta_prompt_variants_original_idx').on(table.originalId),
  activeIdx: index('meta_prompt_variants_active_idx').on(table.isActive),
}));

// Relations
export const metaPromptTemplatesRelations = relations(metaPromptTemplates, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [metaPromptTemplates.workspaceId],
    references: [workspaces.id],
  }),
  generations: many(promptGenerations),
  variants: many(metaPromptVariants),
}));

export const promptGenerationsRelations = relations(promptGenerations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [promptGenerations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [promptGenerations.userId],
    references: [users.id],
  }),
  metaPrompt: one(metaPromptTemplates, {
    fields: [promptGenerations.metaPromptId],
    references: [metaPromptTemplates.id],
  }),
  usedInPrompt: one(prompts, {
    fields: [promptGenerations.usedInPromptId],
    references: [prompts.id],
  }),
  feedback: many(generationFeedback),
}));

export const generationFeedbackRelations = relations(generationFeedback, ({ one }) => ({
  generation: one(promptGenerations, {
    fields: [generationFeedback.generationId],
    references: [promptGenerations.id],
  }),
  user: one(users, {
    fields: [generationFeedback.userId],
    references: [users.id],
  }),
}));

export const metaPromptVariantsRelations = relations(metaPromptVariants, ({ one }) => ({
  original: one(metaPromptTemplates, {
    fields: [metaPromptVariants.originalId],
    references: [metaPromptTemplates.id],
  }),
}));

// Zod Schemas
export const insertMetaPromptTemplateSchema = createInsertSchema(metaPromptTemplates);
export const selectMetaPromptTemplateSchema = createSelectSchema(metaPromptTemplates);
export const insertPromptGenerationSchema = createInsertSchema(promptGenerations);
export const selectPromptGenerationSchema = createSelectSchema(promptGenerations);
export const insertGenerationFeedbackSchema = createInsertSchema(generationFeedback);
export const selectGenerationFeedbackSchema = createSelectSchema(generationFeedback);
export const insertMetaPromptVariantSchema = createInsertSchema(metaPromptVariants);
export const selectMetaPromptVariantSchema = createSelectSchema(metaPromptVariants);

// Types
export type MetaPromptTemplate = z.infer<typeof selectMetaPromptTemplateSchema>;
export type NewMetaPromptTemplate = z.infer<typeof insertMetaPromptTemplateSchema>;
export type PromptGeneration = z.infer<typeof selectPromptGenerationSchema>;
export type NewPromptGeneration = z.infer<typeof insertPromptGenerationSchema>;
export type GenerationFeedback = z.infer<typeof selectGenerationFeedbackSchema>;
export type NewGenerationFeedback = z.infer<typeof insertGenerationFeedbackSchema>;
export type MetaPromptVariant = z.infer<typeof selectMetaPromptVariantSchema>;
export type NewMetaPromptVariant = z.infer<typeof insertMetaPromptVariantSchema>;