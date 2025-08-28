import { pgTable, text, uuid, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

// Main chains table
export const chains = pgTable('chains', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').notNull().default([]),
  trigger: text('trigger').notNull().default('manual'), // manual, webhook, schedule, event
  triggerConfig: jsonb('trigger_config'),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedBy: uuid('updated_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chain executions table
export const chainExecutions = pgTable('chain_executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chainId: uuid('chain_id').notNull().references(() => chains.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'), // pending, running, completed, failed
  inputs: jsonb('inputs'),
  outputs: jsonb('outputs'),
  error: text('error'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  executedBy: uuid('executed_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chain versions table (for version control)
export const chainVersions = pgTable('chain_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  chainId: uuid('chain_id').notNull().references(() => chains.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').notNull(),
  trigger: text('trigger').notNull(),
  triggerConfig: jsonb('trigger_config'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Chain webhook logs
export const chainWebhookLogs = pgTable('chain_webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  chainId: uuid('chain_id').notNull().references(() => chains.id, { onDelete: 'cascade' }),
  executionId: uuid('execution_id').references(() => chainExecutions.id, { onDelete: 'cascade' }),
  method: text('method').notNull(),
  headers: jsonb('headers'),
  body: jsonb('body'),
  response: jsonb('response'),
  statusCode: integer('status_code'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const chainsRelations = relations(chains, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [chains.workspaceId],
    references: [workspaces.id],
  }),
  createdByUser: one(users, {
    fields: [chains.createdBy],
    references: [users.id],
    relationName: 'createdByUser',
  }),
  updatedByUser: one(users, {
    fields: [chains.updatedBy],
    references: [users.id],
    relationName: 'updatedByUser',
  }),
  executions: many(chainExecutions),
  versions: many(chainVersions),
  webhookLogs: many(chainWebhookLogs),
}));

export const chainExecutionsRelations = relations(chainExecutions, ({ one }) => ({
  chain: one(chains, {
    fields: [chainExecutions.chainId],
    references: [chains.id],
  }),
  workspace: one(workspaces, {
    fields: [chainExecutions.workspaceId],
    references: [workspaces.id],
  }),
  executedByUser: one(users, {
    fields: [chainExecutions.executedBy],
    references: [users.id],
  }),
}));

export const chainVersionsRelations = relations(chainVersions, ({ one }) => ({
  chain: one(chains, {
    fields: [chainVersions.chainId],
    references: [chains.id],
  }),
  createdByUser: one(users, {
    fields: [chainVersions.createdBy],
    references: [users.id],
  }),
}));

export const chainWebhookLogsRelations = relations(chainWebhookLogs, ({ one }) => ({
  chain: one(chains, {
    fields: [chainWebhookLogs.chainId],
    references: [chains.id],
  }),
  execution: one(chainExecutions, {
    fields: [chainWebhookLogs.executionId],
    references: [chainExecutions.id],
  }),
}));

// Types
export type Chain = typeof chains.$inferSelect;
export type NewChain = typeof chains.$inferInsert;
export type ChainExecution = typeof chainExecutions.$inferSelect;
export type NewChainExecution = typeof chainExecutions.$inferInsert;
export type ChainVersion = typeof chainVersions.$inferSelect;
export type NewChainVersion = typeof chainVersions.$inferInsert;
export type ChainWebhookLog = typeof chainWebhookLogs.$inferSelect;
export type NewChainWebhookLog = typeof chainWebhookLogs.$inferInsert;