'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { 
  FileText, Folder, Play, Zap, Users, Star,
  GitBranch, Tag, Key, Activity as ActivityIcon
} from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  metadata: any;
  created_at: string;
  user_id: string;
  users?: {
    email: string;
    metadata?: any;
  };
}

interface RealTimeActivityProps {
  workspaceId: string;
  initialActivities: Activity[];
}

export function RealTimeActivity({ workspaceId, initialActivities }: RealTimeActivityProps) {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [newActivityCount, setNewActivityCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    
    // Subscribe to new activities
    const channel = supabase
      .channel(`workspace-activity-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `workspace_id=eq.${workspaceId}`
        },
        async (payload) => {
          const newActivity = payload.new as Activity;
          
          // Fetch user data for the new activity
          const { data: userData } = await supabase
            .from('users')
            .select('email, metadata')
            .eq('id', newActivity.user_id)
            .single();
            
          newActivity.users = userData;
          
          setActivities(prev => [newActivity, ...prev].slice(0, 20));
          setNewActivityCount(prev => prev + 1);
          
          // Auto-reset notification count after 3 seconds
          setTimeout(() => setNewActivityCount(0), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const getActivityIcon = (type: string) => {
    if (type.includes('prompt')) return <FileText className="h-3 w-3" />;
    if (type.includes('folder')) return <Folder className="h-3 w-3" />;
    if (type.includes('tag')) return <Tag className="h-3 w-3" />;
    if (type.includes('member')) return <Users className="h-3 w-3" />;
    if (type.includes('api_key')) return <Key className="h-3 w-3" />;
    if (type.includes('run')) return <Play className="h-3 w-3" />;
    if (type.includes('fork')) return <GitBranch className="h-3 w-3" />;
    return <Zap className="h-3 w-3" />;
  };

  const getActivityText = (activity: Activity) => {
    const user = activity.users?.metadata?.name || 
                 activity.users?.email?.split('@')[0] || 
                 'Someone';
    const metadata = activity.metadata || {};
    
    switch(activity.type) {
      case 'prompt_created':
        return `${user} created "${metadata.promptName || 'a prompt'}"`;
      case 'prompt_updated':
        return `${user} updated "${metadata.promptName || 'a prompt'}"`;
      case 'prompt_deleted':
        return `${user} deleted "${metadata.promptName || 'a prompt'}"`;
      case 'prompt_run':
        return `${user} ran "${metadata.promptName || 'a prompt'}"`;
      case 'prompt_forked':
        return `${user} forked "${metadata.promptName || 'a prompt'}"`;
      case 'folder_created':
        return `${user} created folder "${metadata.folderName || 'a folder'}"`;
      case 'folder_updated':
        return `${user} updated folder "${metadata.folderName || 'a folder'}"`;
      case 'tag_created':
        return `${user} created tag "${metadata.tagName || 'a tag'}"`;
      case 'member_invited':
        return `${user} invited ${metadata.memberEmail || 'someone'} to the workspace`;
      case 'member_joined':
        return `${user} joined the workspace`;
      case 'api_key_created':
        return `${user} created a new API key`;
      default:
        return `${user} performed ${activity.type.replace(/_/g, ' ')}`;
    }
  };

  return (
    <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ActivityIcon className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Live Activity
          </h2>
        </div>
        {newActivityCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 animate-pulse">
            {newActivityCount} new
          </span>
        )}
      </div>
      
      {activities.length > 0 ? (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activities.map((activity, index) => (
            <div 
              key={activity.id} 
              className={`flex items-start gap-3 transition-all ${
                index === 0 && newActivityCount > 0 
                  ? 'bg-green-50 dark:bg-green-950/20 -mx-2 px-2 py-1 rounded' 
                  : ''
              }`}
            >
              <div className="rounded-full bg-gray-100 dark:bg-neutral-800 p-1.5 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {getActivityText(activity)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <ActivityIcon className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            No activity yet
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Activities will appear here in real-time
          </p>
        </div>
      )}
    </div>
  );
}