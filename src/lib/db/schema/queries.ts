import { pgTable, uuid, text, varchar, boolean, jsonb, timestamp, integer, uniqueIndex } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { databaseConnections } from './database-connections';
// import { folders } from './folders'; // TODO: Create folders schema
// import { users } from './auth'; // TODO: Create auth schema

// Main queries table
export const queries = pgTable('queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  connectionId: uuid('connection_id').notNull().references(() => databaseConnections.id, { onDelete: 'cascade' }),
  
  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  
  // Query content
  sqlTemplate: text('sql_template').notNull(),
  variablesSchema: jsonb('variables_schema').default([]),
  
  // Organization
  folderId: uuid('folder_id'), // TODO: Add reference when folders schema is created
  tags: text('tags').array().default([]),
  isFavorite: boolean('is_favorite').default(false),
  
  // Security
  isReadOnly: boolean('is_read_only').default(true),
  requiresApproval: boolean('requires_approval').default(false),
  allowedUsers: uuid('allowed_users').array().default([]),
  
  // Metadata
  createdBy: uuid('created_by').notNull(), // TODO: Add reference when auth schema is created
  updatedBy: uuid('updated_by').notNull(), // TODO: Add reference when auth schema is created
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  workspaceSlugUnique: uniqueIndex('queries_workspace_slug_unique').on(table.workspaceId, table.slug),
}));

// Query execution history
export const queryRuns = pgTable('query_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryId: uuid('query_id').notNull().references(() => queries.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(), // TODO: Add reference when auth schema is created
  
  // Execution details
  parameters: jsonb('parameters'),
  sqlExecuted: text('sql_executed').notNull(),
  
  // Results
  status: text('status').notNull(), // 'pending', 'running', 'success', 'error'
  rowsReturned: integer('rows_returned'),
  rowsAffected: integer('rows_affected'),
  executionTimeMs: integer('execution_time_ms'),
  errorMessage: text('error_message'),
  resultData: jsonb('result_data'), // Store first N rows for preview
  
  // Chain context (if run from chain)
  chainRunId: uuid('chain_run_id'),
  stepId: uuid('step_id'),
  
  executedAt: timestamp('executed_at', { withTimezone: true }).defaultNow(),
});

// Query versions (git-style)
export const queryVersions = pgTable('query_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryId: uuid('query_id').notNull().references(() => queries.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  
  // Version content
  sqlTemplate: text('sql_template').notNull(),
  variablesSchema: jsonb('variables_schema'),
  changeDescription: text('change_description'),
  
  // Metadata
  createdBy: uuid('created_by').notNull(), // TODO: Add reference when auth schema is created
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  queryVersionUnique: uniqueIndex('query_versions_unique').on(table.queryId, table.version),
}));

// Query results cache (optional, for expensive queries)
export const queryCache = pgTable('query_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryId: uuid('query_id').notNull().references(() => queries.id, { onDelete: 'cascade' }),
  parametersHash: varchar('parameters_hash', { length: 64 }).notNull(),
  
  // Cached data
  resultData: jsonb('result_data').notNull(),
  resultCount: integer('result_count'),
  
  // Cache management
  cachedAt: timestamp('cached_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  queryCacheUnique: uniqueIndex('query_cache_unique').on(table.queryId, table.parametersHash),
}));

// Query snippets - reusable SQL fragments
export const querySnippets = pgTable('query_snippets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  description: text('description'),
  sqlSnippet: text('sql_snippet').notNull(),
  
  createdBy: uuid('created_by').notNull(), // TODO: Add reference when auth schema is created
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  snippetSlugUnique: uniqueIndex('snippets_workspace_slug_unique').on(table.workspaceId, table.slug),
}));

// Export types
export type Query = typeof queries.$inferSelect;
export type NewQuery = typeof queries.$inferInsert;
export type QueryRun = typeof queryRuns.$inferSelect;
export type NewQueryRun = typeof queryRuns.$inferInsert;
export type QueryVersion = typeof queryVersions.$inferSelect;
export type QuerySnippet = typeof querySnippets.$inferSelect;