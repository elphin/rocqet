import { pgTable, uuid, varchar, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const shareLinks = pgTable('share_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  promptId: uuid('prompt_id').notNull(),
  workspaceId: uuid('workspace_id').notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxViews: integer('max_views'),
  currentViews: integer('current_views').default(0),
  allowCopying: boolean('allow_copying').default(true),
  showVariables: boolean('show_variables').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
});