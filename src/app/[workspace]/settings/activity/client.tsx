'use client';

import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { 
  Activity, 
  User, 
  FileText, 
  Folder, 
  Key, 
  Settings,
  Trash2,
  Edit,
  Plus,
  Share2,
  Download,
  Clock,
  TrendingUp,
  Users,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuditLog {
  id: string;
  workspace_id: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string;
  action: string;
  changes?: any;
  user_id: string;
  performer_email?: string;
  performer_name?: string;
  performer_role?: string;
  created_at: string;
}

interface ActivitySummary {
  user_id: string;
  user_email: string;
  total_actions: number;
  creates: number;
  updates: number;
  deletes: number;
  last_activity: string;
}

interface ActivityClientProps {
  workspace: any;
  membership: any;
  auditLogs: AuditLog[];
  activitySummary: ActivitySummary[];
  params: { workspace: string };
}

const ACTION_ICONS = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  restore: Download,
  share: Share2,
  execute: Activity,
};

const ACTION_COLORS = {
  create: 'text-green-600 bg-green-100',
  update: 'text-blue-600 bg-blue-100',
  delete: 'text-red-600 bg-red-100',
  restore: 'text-purple-600 bg-purple-100',
  share: 'text-indigo-600 bg-indigo-100',
  execute: 'text-orange-600 bg-orange-100',
};

const ENTITY_ICONS = {
  prompt: FileText,
  folder: Folder,
  api_key: Key,
  workspace: Settings,
};

export function ActivityClient({
  workspace,
  membership,
  auditLogs,
  activitySummary,
  params
}: ActivityClientProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    if (selectedUser && log.user_id !== selectedUser) return false;
    if (selectedAction && log.action !== selectedAction) return false;
    if (selectedEntity && log.entity_type !== selectedEntity) return false;
    return true;
  });

  // Get unique users, actions, and entities for filters
  const uniqueUsers = Array.from(new Set(auditLogs.map(l => l.performer_email))).filter(Boolean);
  const uniqueActions = Array.from(new Set(auditLogs.map(l => l.action)));
  const uniqueEntities = Array.from(new Set(auditLogs.map(l => l.entity_type)));

  const getActionDescription = (log: AuditLog) => {
    const entity = log.entity_name || log.entity_id;
    switch (log.action) {
      case 'create':
        return `created ${log.entity_type} "${entity}"`;
      case 'update':
        return `updated ${log.entity_type} "${entity}"`;
      case 'delete':
        return `deleted ${log.entity_type} "${entity}"`;
      case 'restore':
        return `restored ${log.entity_type} "${entity}"`;
      case 'share':
        return `shared ${log.entity_type} "${entity}"`;
      case 'execute':
        return `executed ${log.entity_type} "${entity}"`;
      default:
        return `${log.action} ${log.entity_type} "${entity}"`;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Activity Log
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Track all actions performed in your workspace
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {auditLogs.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total Actions</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {activitySummary.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Active Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {auditLogs.filter(l => l.action === 'create').length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Items Created</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {auditLogs[0] ? formatDistanceToNow(new Date(auditLogs[0].created_at), { addSuffix: true }) : 'Never'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Last Activity</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  User
                </label>
                <select
                  value={selectedUser || ''}
                  onChange={(e) => setSelectedUser(e.target.value || null)}
                  className="w-full rounded-md border-gray-300 dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="">All Users</option>
                  {uniqueUsers.map(email => (
                    <option key={email} value={auditLogs.find(l => l.performer_email === email)?.user_id}>
                      {email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Action
                </label>
                <select
                  value={selectedAction || ''}
                  onChange={(e) => setSelectedAction(e.target.value || null)}
                  className="w-full rounded-md border-gray-300 dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="">All Actions</option>
                  {uniqueActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Entity Type
                </label>
                <select
                  value={selectedEntity || ''}
                  onChange={(e) => setSelectedEntity(e.target.value || null)}
                  className="w-full rounded-md border-gray-300 dark:border-neutral-600 dark:bg-neutral-800"
                >
                  <option value="">All Types</option>
                  {uniqueEntities.map(entity => (
                    <option key={entity} value={entity}>{entity}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
        <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Activity
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-neutral-700">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No activity found
            </div>
          ) : (
            filteredLogs.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action as keyof typeof ACTION_ICONS] || Activity;
              const EntityIcon = ENTITY_ICONS[log.entity_type as keyof typeof ENTITY_ICONS] || FileText;
              const actionColor = ACTION_COLORS[log.action as keyof typeof ACTION_COLORS] || 'text-gray-600 bg-gray-100';
              
              return (
                <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Action Icon */}
                    <div className={`p-2 rounded-lg ${actionColor}`}>
                      <ActionIcon className="h-4 w-4" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {log.performer_email || 'Unknown User'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {getActionDescription(log)}
                        </span>
                        {log.performer_role && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-gray-400 rounded">
                            {log.performer_role}
                          </span>
                        )}
                      </div>
                      
                      {/* Changes preview */}
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          Changed: {Object.keys(log.changes).join(', ')}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        <span className="mx-1">•</span>
                        {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                    
                    {/* Entity Icon */}
                    <div className="text-gray-400 dark:text-gray-500">
                      <EntityIcon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Activity Summary */}
      {activitySummary.length > 0 && (
        <div className="mt-6 bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700">
          <div className="p-4 border-b border-gray-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              User Activity Summary (Last 30 Days)
            </h2>
          </div>
          
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3 text-center">Creates</th>
                  <th className="pb-3 text-center">Updates</th>
                  <th className="pb-3 text-center">Deletes</th>
                  <th className="pb-3 text-center">Total</th>
                  <th className="pb-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {activitySummary.map((summary) => (
                  <tr key={summary.user_id}>
                    <td className="py-3 text-sm text-gray-900 dark:text-gray-100">
                      {summary.user_email}
                    </td>
                    <td className="py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                      {summary.creates}
                    </td>
                    <td className="py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                      {summary.updates}
                    </td>
                    <td className="py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                      {summary.deletes}
                    </td>
                    <td className="py-3 text-sm text-center font-medium text-gray-900 dark:text-gray-100">
                      {summary.total_actions}
                    </td>
                    <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDistanceToNow(new Date(summary.last_activity), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}