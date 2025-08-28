import { pgTable, text, uuid, timestamp, jsonb, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

// Database connection types
export const databaseTypeEnum = pgEnum('database_type', [
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'elasticsearch',
  'clickhouse',
  'snowflake',
  'bigquery',
  'redshift',
  'dynamodb',
  'cosmosdb',
  'firebase',
  'supabase',
  'custom'
]);

// Database connections table
export const databaseConnections = pgTable('database_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  type: databaseTypeEnum('type').notNull(),
  
  // Connection details (encrypted in production)
  host: text('host'),
  port: text('port'),
  database: text('database'),
  username: text('username'),
  password: text('password'), // Should be encrypted
  
  // Additional connection options
  connectionString: text('connection_string'), // Alternative to individual fields
  sslEnabled: boolean('ssl_enabled').default(false),
  sslConfig: jsonb('ssl_config'), // SSL certificates, keys, etc.
  
  // Connection pooling settings
  poolMin: text('pool_min').default('2'),
  poolMax: text('pool_max').default('10'),
  connectionTimeout: text('connection_timeout').default('30000'), // ms
  
  // Advanced options
  options: jsonb('options'), // Type-specific options
  
  // Usage restrictions
  readOnly: boolean('read_only').default(true), // Safety default
  allowedOperations: jsonb('allowed_operations').default(['select']), // ['select', 'insert', 'update', 'delete']
  ipWhitelist: jsonb('ip_whitelist'), // Array of allowed IPs
  
  // Monitoring
  lastTestedAt: timestamp('last_tested_at'),
  lastUsedAt: timestamp('last_used_at'),
  isActive: boolean('is_active').default(true),
  testStatus: text('test_status'), // 'success', 'failed', 'untested'
  testMessage: text('test_message'),
  
  // Metadata
  createdBy: uuid('created_by').notNull().references(() => users.id),
  updatedBy: uuid('updated_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Database connection usage logs
export const databaseConnectionLogs = pgTable('database_connection_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull().references(() => databaseConnections.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  
  // Query details
  operation: text('operation').notNull(), // 'query', 'test', 'schema_fetch'
  query: text('query'), // The actual query (sanitized)
  queryHash: text('query_hash'), // For grouping similar queries
  
  // Performance metrics
  executionTime: text('execution_time'), // ms
  rowsAffected: text('rows_affected'),
  bytesTransferred: text('bytes_transferred'),
  
  // Result
  status: text('status').notNull(), // 'success', 'error'
  error: text('error'),
  
  // Context
  chainId: uuid('chain_id'), // If used in a chain
  promptId: uuid('prompt_id'), // If used in a prompt
  
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Database schemas cache (for autocomplete and validation)
export const databaseSchemas = pgTable('database_schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  connectionId: uuid('connection_id').notNull().references(() => databaseConnections.id, { onDelete: 'cascade' }),
  
  // Schema information
  schemaName: text('schema_name'),
  tableName: text('table_name'),
  columns: jsonb('columns'), // Array of column definitions
  indexes: jsonb('indexes'),
  constraints: jsonb('constraints'),
  
  // Metadata
  rowCount: text('row_count'),
  sizeBytes: text('size_bytes'),
  
  lastSyncedAt: timestamp('last_synced_at').notNull().defaultNow(),
});

// Relations
export const databaseConnectionsRelations = relations(databaseConnections, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [databaseConnections.workspaceId],
    references: [workspaces.id],
  }),
  createdByUser: one(users, {
    fields: [databaseConnections.createdBy],
    references: [users.id],
    relationName: 'createdByUser',
  }),
  updatedByUser: one(users, {
    fields: [databaseConnections.updatedBy],
    references: [users.id],
    relationName: 'updatedByUser',
  }),
  logs: many(databaseConnectionLogs),
  schemas: many(databaseSchemas),
}));

export const databaseConnectionLogsRelations = relations(databaseConnectionLogs, ({ one }) => ({
  connection: one(databaseConnections, {
    fields: [databaseConnectionLogs.connectionId],
    references: [databaseConnections.id],
  }),
  workspace: one(workspaces, {
    fields: [databaseConnectionLogs.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [databaseConnectionLogs.userId],
    references: [users.id],
  }),
}));

export const databaseSchemasRelations = relations(databaseSchemas, ({ one }) => ({
  connection: one(databaseConnections, {
    fields: [databaseSchemas.connectionId],
    references: [databaseConnections.id],
  }),
}));

// Types
export type DatabaseConnection = typeof databaseConnections.$inferSelect;
export type NewDatabaseConnection = typeof databaseConnections.$inferInsert;
export type DatabaseConnectionLog = typeof databaseConnectionLogs.$inferSelect;
export type NewDatabaseConnectionLog = typeof databaseConnectionLogs.$inferInsert;
export type DatabaseSchema = typeof databaseSchemas.$inferSelect;
export type NewDatabaseSchema = typeof databaseSchemas.$inferInsert;