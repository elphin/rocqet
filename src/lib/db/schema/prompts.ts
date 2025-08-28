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
  slug: varchar('slug', { length: 255 }).notNull(),
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
  
  // Documentation
  whenToUse: text('when_to_use'),
  exampleInput: jsonb('example_input').default({}),
  exampleOutput: text('example_output'),
  requirements: jsonb('requirements').default([]), // Array of strings
  warnings: jsonb('warnings').default([]), // Array of strings
  relatedPrompts: jsonb('related_prompts').default([]), // Array of prompt IDs
  
  // Collaboration
  visibility: varchar('visibility', { length: 20 }).default('private'), // public/private
  isShared: boolean('is_shared').default(false), // Shared with team
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
  uniqueSlugPerWorkspace: index('prompts_workspace_slug_unique').on(table.workspaceId, table.slug),
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

export const promptChains = pgTable('prompt_chains', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  // Basic Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Chain Configuration
  steps: jsonb('steps').notNull().default([]), // Full ChainStep[] with all advanced features
  defaultInputs: jsonb('default_inputs').default({}), // Default values for chain inputs
  variables: jsonb('variables').default([]), // Variable definitions
  
  // Advanced Features
  triggers: jsonb('triggers').default([]), // Webhook, schedule, event triggers
  errorHandling: jsonb('error_handling').default({}), // Global error handling config
  retryPolicy: jsonb('retry_policy').default({}), // Global retry configuration
  notifications: jsonb('notifications').default({}), // Alert/notification settings
  
  // Execution Settings
  maxExecutionTime: integer('max_execution_time'), // in seconds
  maxParallelSteps: integer('max_parallel_steps').default(5),
  requireApproval: boolean('require_approval').default(false),
  approvers: jsonb('approvers').default([]), // List of approver IDs
  
  // Stats & Monitoring
  runCount: integer('run_count').default(0),
  successCount: integer('success_count').default(0),
  failureCount: integer('failure_count').default(0),
  lastRunAt: timestamp('last_run_at'),
  lastSuccessAt: timestamp('last_success_at'),
  lastFailureAt: timestamp('last_failure_at'),
  averageExecutionTime: integer('average_execution_time'), // in ms
  totalCost: integer('total_cost').default(0), // in cents
  totalTokens: integer('total_tokens').default(0),
  
  // SLA & Performance
  slaTarget: integer('sla_target'), // Target execution time in ms
  slaCompliance: integer('sla_compliance'), // Percentage * 100
  p95ExecutionTime: integer('p95_execution_time'), // 95th percentile in ms
  p99ExecutionTime: integer('p99_execution_time'), // 99th percentile in ms
  
  // Version Control
  version: integer('version').default(1),
  publishedVersion: integer('published_version'),
  isDraft: boolean('is_draft').default(true),
  
  // Metadata
  tags: jsonb('tags').default([]),
  category: varchar('category', { length: 100 }),
  isActive: boolean('is_active').default(true),
  isTemplate: boolean('is_template').default(false),
  templateCategory: varchar('template_category', { length: 100 }),
  
  // Scheduling
  schedule: jsonb('schedule').default({}), // Cron expression, timezone, etc.
  nextRunAt: timestamp('next_run_at'),
  
  // Access Control
  visibility: varchar('visibility', { length: 20 }).default('private'), // public/private/workspace
  allowedUsers: jsonb('allowed_users').default([]), // User IDs with access
  allowedRoles: jsonb('allowed_roles').default([]), // Role-based access
  
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('prompt_chains_workspace_idx').on(table.workspaceId),
  createdByIdx: index('prompt_chains_created_by_idx').on(table.createdBy),
  activeIdx: index('prompt_chains_active_idx').on(table.isActive),
  templateIdx: index('prompt_chains_template_idx').on(table.isTemplate),
  nextRunIdx: index('prompt_chains_next_run_idx').on(table.nextRunAt),
}));

export const promptChainRuns = pgTable('prompt_chain_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  chainId: uuid('chain_id').references(() => promptChains.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  // Execution Details
  inputs: jsonb('inputs').notNull(), // Initial inputs for the chain
  outputs: jsonb('outputs'), // Final outputs from the chain (null if failed)
  variables: jsonb('variables').default({}), // All variables during execution
  stepResults: jsonb('step_results').notNull(), // Detailed results from each step
  
  // Performance
  totalTokens: integer('total_tokens'),
  totalCost: integer('total_cost'), // In cents
  executionTime: integer('execution_time'), // In ms
  
  // Step Metrics
  totalSteps: integer('total_steps'),
  completedSteps: integer('completed_steps'),
  skippedSteps: integer('skipped_steps'),
  failedSteps: integer('failed_steps'),
  parallelExecutions: integer('parallel_executions'),
  
  // Debug Information
  executionPath: jsonb('execution_path').default([]), // Step IDs in execution order
  branchingDecisions: jsonb('branching_decisions').default({}), // Conditional/switch decisions
  loopIterations: jsonb('loop_iterations').default({}), // Loop iteration counts
  debugLog: jsonb('debug_log').default([]), // Debug messages
  
  // Error Tracking
  errors: jsonb('errors').default([]), // All errors during execution
  retryAttempts: jsonb('retry_attempts').default({}), // Retry counts per step
  
  // Status
  status: varchar('status', { length: 50 }).notNull(), // pending, running, paused, completed, failed, cancelled
  error: text('error'), // Main error message
  failedAtStep: varchar('failed_at_step', { length: 255 }), // Step ID where execution failed
  
  // Triggers & Context
  triggerType: varchar('trigger_type', { length: 50 }), // manual, webhook, schedule, api
  triggerData: jsonb('trigger_data').default({}), // Trigger-specific data
  parentRunId: uuid('parent_run_id'), // For sub-chain executions
  
  // Timestamps
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  executedBy: uuid('executed_by').notNull(),
  executedAt: timestamp('executed_at').defaultNow().notNull(),
}, (table) => ({
  chainIdx: index('prompt_chain_runs_chain_idx').on(table.chainId),
  workspaceIdx: index('prompt_chain_runs_workspace_idx').on(table.workspaceId),
  executedAtIdx: index('prompt_chain_runs_executed_at_idx').on(table.executedAt),
  statusIdx: index('prompt_chain_runs_status_idx').on(table.status),
  parentRunIdx: index('prompt_chain_runs_parent_idx').on(table.parentRunId),
}));

export const chainAlerts = pgTable('chain_alerts', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  chainId: uuid('chain_id').references(() => promptChains.id, { onDelete: 'cascade' }),
  
  // Alert Configuration
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).notNull(), // failure, sla_breach, cost_threshold, error_rate
  severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
  
  // Conditions
  conditions: jsonb('conditions').notNull(), // Alert trigger conditions
  threshold: integer('threshold'), // Numeric threshold value
  timeWindow: integer('time_window'), // Time window in seconds for rate-based alerts
  
  // Actions
  actions: jsonb('actions').notNull(), // [{type: 'email', recipients: []}, {type: 'webhook', url: ''}]
  cooldownPeriod: integer('cooldown_period').default(300), // Seconds before re-triggering
  
  // State
  isActive: boolean('is_active').default(true),
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),
  
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  workspaceIdx: index('chain_alerts_workspace_idx').on(table.workspaceId),
  chainIdx: index('chain_alerts_chain_idx').on(table.chainId),
  activeIdx: index('chain_alerts_active_idx').on(table.isActive),
}));

export const chainAlertHistory = pgTable('chain_alert_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  alertId: uuid('alert_id').references(() => chainAlerts.id, { onDelete: 'cascade' }).notNull(),
  chainRunId: uuid('chain_run_id').references(() => promptChainRuns.id, { onDelete: 'set null' }),
  
  // Alert Details
  triggeredAt: timestamp('triggered_at').defaultNow().notNull(),
  alertType: varchar('alert_type', { length: 50 }).notNull(),
  severity: varchar('severity', { length: 20 }).notNull(),
  
  // Context
  message: text('message').notNull(),
  details: jsonb('details').default({}), // Additional context data
  metrics: jsonb('metrics').default({}), // Metrics at time of alert
  
  // Actions Taken
  actionsExecuted: jsonb('actions_executed').default([]),
  actionResults: jsonb('action_results').default({}),
  
  // Resolution
  acknowledged: boolean('acknowledged').default(false),
  acknowledgedBy: uuid('acknowledged_by'),
  acknowledgedAt: timestamp('acknowledged_at'),
  notes: text('notes'),
}, (table) => ({
  alertIdx: index('chain_alert_history_alert_idx').on(table.alertId),
  runIdx: index('chain_alert_history_run_idx').on(table.chainRunId),
  triggeredIdx: index('chain_alert_history_triggered_idx').on(table.triggeredAt),
}));

export const chainTemplates = pgTable('chain_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  
  // Template Info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  
  // Template Content
  steps: jsonb('steps').notNull(), // Template chain steps
  variables: jsonb('variables').default([]), // Required variables
  defaultInputs: jsonb('default_inputs').default({}),
  documentation: text('documentation'),
  examples: jsonb('examples').default([]),
  
  // Marketplace
  isPublic: boolean('is_public').default(false),
  isOfficial: boolean('is_official').default(false), // Official ROCQET templates
  price: integer('price').default(0), // In cents, 0 = free
  
  // Usage & Ratings
  usageCount: integer('usage_count').default(0),
  forkCount: integer('fork_count').default(0),
  rating: integer('rating'), // Average rating * 10
  reviewCount: integer('review_count').default(0),
  
  // Metadata
  tags: jsonb('tags').default([]),
  requirements: jsonb('requirements').default([]), // Required integrations/permissions
  version: varchar('version', { length: 20 }).default('1.0.0'),
  
  createdBy: uuid('created_by').notNull(),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('chain_templates_category_idx').on(table.category),
  publicIdx: index('chain_templates_public_idx').on(table.isPublic),
  ratingIdx: index('chain_templates_rating_idx').on(table.rating),
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

export const promptChainsRelations = relations(promptChains, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [promptChains.workspaceId],
    references: [workspaces.id],
  }),
  runs: many(promptChainRuns),
}));

export const promptChainRunsRelations = relations(promptChainRuns, ({ one }) => ({
  chain: one(promptChains, {
    fields: [promptChainRuns.chainId],
    references: [promptChains.id],
  }),
  workspace: one(workspaces, {
    fields: [promptChainRuns.workspaceId],
    references: [workspaces.id],
  }),
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
export const insertPromptChainSchema = createInsertSchema(promptChains);
export const selectPromptChainSchema = createSelectSchema(promptChains);
export const insertPromptChainRunSchema = createInsertSchema(promptChainRuns);
export const selectPromptChainRunSchema = createSelectSchema(promptChainRuns);

export type Prompt = z.infer<typeof selectPromptSchema>;
export type NewPrompt = z.infer<typeof insertPromptSchema>;
export type PromptVersion = z.infer<typeof selectPromptVersionSchema>;
export type NewPromptVersion = z.infer<typeof insertPromptVersionSchema>;
export type Folder = z.infer<typeof selectFolderSchema>;
export type NewFolder = z.infer<typeof insertFolderSchema>;
export type PromptChain = z.infer<typeof selectPromptChainSchema>;
export type NewPromptChain = z.infer<typeof insertPromptChainSchema>;
export type PromptChainRun = z.infer<typeof selectPromptChainRunSchema>;
export type NewPromptChainRun = z.infer<typeof insertPromptChainRunSchema>;