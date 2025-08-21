import { pgTable, text, timestamp, uuid, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // This will match Supabase Auth user ID
  
  // Profile
  email: varchar('email', { length: 255 }).unique().notNull(),
  fullName: varchar('full_name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  bio: text('bio'),
  
  // Preferences
  preferences: jsonb('preferences').default({
    theme: 'system',
    defaultModel: 'gpt-4',
    emailNotifications: true,
    browserNotifications: false,
  }),
  
  // API Keys (encrypted)
  apiKeys: jsonb('api_keys').default({}), // Will be encrypted
  
  // Status
  isActive: boolean('is_active').default(true),
  emailVerified: boolean('email_verified').default(false),
  
  // Metadata
  lastActiveAt: timestamp('last_active_at'),
  onboardingCompleted: boolean('onboarding_completed').default(false),
  metadata: jsonb('metadata').default({}),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  
  // Activity details
  type: varchar('type', { length: 50 }).notNull(), // prompt_created, prompt_updated, member_invited, etc.
  entityType: varchar('entity_type', { length: 50 }).notNull(), // prompt, workspace, folder, etc.
  entityId: uuid('entity_id').notNull(),
  
  // Activity data
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  
  // IP tracking for security
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id'),
  
  type: varchar('type', { length: 50 }).notNull(), // mention, share, invite, system
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  
  data: jsonb('data').default({}),
  
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
  notifications: many(notifications),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Zod Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertActivitySchema = createInsertSchema(activities);
export const selectActivitySchema = createSelectSchema(activities);
export const insertNotificationSchema = createInsertSchema(notifications);
export const selectNotificationSchema = createSelectSchema(notifications);

export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type Activity = z.infer<typeof selectActivitySchema>;
export type NewActivity = z.infer<typeof insertActivitySchema>;
export type Notification = z.infer<typeof selectNotificationSchema>;
export type NewNotification = z.infer<typeof insertNotificationSchema>;