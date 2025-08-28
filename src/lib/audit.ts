/**
 * Audit logging utilities for tracking user actions
 */

import { createClient } from '@/lib/supabase/client';

export type AuditAction = 
  | 'create' 
  | 'update' 
  | 'delete' 
  | 'restore' 
  | 'share' 
  | 'unshare' 
  | 'duplicate'
  | 'export'
  | 'import'
  | 'execute';

export type EntityType = 
  | 'prompt' 
  | 'folder' 
  | 'api_key' 
  | 'workspace' 
  | 'tag'
  | 'chain'
  | 'member';

interface AuditLogEntry {
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string;
  entity_name?: string;
  action: AuditAction;
  changes?: Record<string, any>;
  user_id: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(entry: Omit<AuditLogEntry, 'user_id'>) {
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.warn('No user found for audit log');
    return;
  }

  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        ...entry,
        user_id: user.id,
        user_email: user.email,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to create audit log:', error);
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

/**
 * Log a prompt creation
 */
export async function auditPromptCreate(
  workspaceId: string,
  promptId: string,
  promptName: string
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'prompt',
    entity_id: promptId,
    entity_name: promptName,
    action: 'create'
  });
}

/**
 * Log a prompt update with changes
 */
export async function auditPromptUpdate(
  workspaceId: string,
  promptId: string,
  promptName: string,
  changes: Record<string, any>
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'prompt',
    entity_id: promptId,
    entity_name: promptName,
    action: 'update',
    changes
  });
}

/**
 * Log a prompt deletion
 */
export async function auditPromptDelete(
  workspaceId: string,
  promptId: string,
  promptName: string
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'prompt',
    entity_id: promptId,
    entity_name: promptName,
    action: 'delete'
  });
}

/**
 * Log a prompt restoration from trash
 */
export async function auditPromptRestore(
  workspaceId: string,
  promptId: string,
  promptName: string
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'prompt',
    entity_id: promptId,
    entity_name: promptName,
    action: 'restore'
  });
}

/**
 * Log API key creation
 */
export async function auditApiKeyCreate(
  workspaceId: string,
  keyId: string,
  keyName: string,
  provider: string
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'api_key',
    entity_id: keyId,
    entity_name: `${keyName} (${provider})`,
    action: 'create'
  });
}

/**
 * Log API key deletion
 */
export async function auditApiKeyDelete(
  workspaceId: string,
  keyId: string,
  keyName: string
) {
  return createAuditLog({
    workspace_id: workspaceId,
    entity_type: 'api_key',
    entity_id: keyId,
    entity_name: keyName,
    action: 'delete'
  });
}

/**
 * Get recent audit logs for a workspace
 */
export async function getWorkspaceAuditLogs(
  workspaceId: string,
  limit = 50
) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('audit_logs_with_users')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get activity summary for a workspace
 */
export async function getWorkspaceActivitySummary(workspaceId: string) {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('user_activity_summary')
    .select('*')
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('Failed to fetch activity summary:', error);
    return [];
  }

  return data || [];
}

/**
 * Track changes between two objects for audit logging
 */
export function trackChanges(
  before: Record<string, any>,
  after: Record<string, any>
): Record<string, any> {
  const changes: Record<string, any> = {};
  
  // Find changed fields
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes[key] = {
        before: before[key],
        after: after[key]
      };
    }
  }
  
  return changes;
}