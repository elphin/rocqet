import { pgTable, text, timestamp, uuid, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).unique().notNull(),
  description: text('description'),
  logoUrl: text('logo_url'),
  
  // Settings
  settings: jsonb('settings').default({
    defaultModel: 'gpt-4',
    enableVersioning: true,
    enableCollaboration: true,
    enableAI: true,
  }),
  
  // Subscription
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).default('active'),
  subscriptionEndDate: timestamp('subscription_end_date'),
  
  // Limits
  monthlyPromptLimit: integer('monthly_prompt_limit').default(1000),
  monthlyPromptUsage: integer('monthly_prompt_usage').default(0),
  memberLimit: integer('member_limit').default(5),
  
  // Metadata
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').notNull(),
  
  role: varchar('role', { length: 50 }).notNull(), // owner, admin, editor, viewer
  permissions: jsonb('permissions').default([]),
  
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  invitedBy: uuid('invited_by'),
  inviteAcceptedAt: timestamp('invite_accepted_at'),
});

export const workspaceInvites = pgTable('workspace_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  token: varchar('token', { length: 255 }).unique().notNull(),
  
  invitedBy: uuid('invited_by').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  invites: many(workspaceInvites),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
}));

// Zod Schemas
export const insertWorkspaceSchema = createInsertSchema(workspaces);
export const selectWorkspaceSchema = createSelectSchema(workspaces);
export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembers);
export const selectWorkspaceMemberSchema = createSelectSchema(workspaceMembers);

export type Workspace = z.infer<typeof selectWorkspaceSchema>;
export type NewWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type WorkspaceMember = z.infer<typeof selectWorkspaceMemberSchema>;
export type NewWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;