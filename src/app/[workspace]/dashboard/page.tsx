import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import { getRecentActivities, getActivityStats } from '@/lib/activity/logger';
import Link from 'next/link';
import { 
  Plus, Folder, Clock, Star, TrendingUp, Users, Zap,
  FileText, Play, Activity, ArrowRight, Sparkles,
  BarChart3, GitBranch, DollarSign, Eye, Target,
  Calendar, Award, Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default async function WorkspaceDashboard({
  params
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: workspaceSlug } = await params;
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Validate workspace access
  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  
  if (!membership) {
    redirect('/');
    return null;
  }

  const workspace = membership.workspaces;
  // TypeScript workaround - we know workspace exists after membership validation
  const workspaceData = workspace as any;

  // Time ranges for analytics
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Get workspace statistics
  const { count: promptCount } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceData.id);

  const { count: memberCount } = await supabase
    .from('workspace_members')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceData.id);

  // Get recent prompts
  const { data: recentPrompts } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', workspaceData.id)
    .order('updated_at', { ascending: false })
    .limit(5);

  // Get trending prompts (most used in last 7 days)
  const { data: trendingPrompts } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', workspaceData.id)
    .order('usage_count', { ascending: false })
    .limit(5);

  // Get recent activity from activities table
  const recentActivities = await getRecentActivities(workspaceData.id, 20);
  
  // Get activity statistics for the last 30 days
  const activityStats = await getActivityStats(
    workspaceData.id,
    thirtyDaysAgo,
    now
  );

  // Get prompt runs
  const { data: promptRuns } = await supabase
    .from('prompt_runs')
    .select('*')
    .eq('workspace_id', workspace.id)
    .gte('executed_at', thirtyDaysAgo.toISOString())
    .order('executed_at', { ascending: false });

  // Calculate advanced statistics
  const totalRuns = promptRuns?.length || 0;
  const uniquePromptsRun = new Set(promptRuns?.map((r: any) => r.prompt_id)).size;
  const avgRunsPerDay = totalRuns / 30;
  const estimatedSavings = totalRuns * 0.15; // $0.15 saved per prompt use
  const activeToday = promptRuns?.filter((run: any) => {
    const runDate = new Date(run.executed_at);
    return runDate.toDateString() === now.toDateString();
  }).length || 0;

  // Calculate growth metrics
  const { count: lastMonthPrompts } = await supabase
    .from('prompts')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .lte('created_at', thirtyDaysAgo.toISOString());
    
  const promptGrowth = lastMonthPrompts && promptCount !== null
    ? Math.round(((promptCount - lastMonthPrompts) / lastMonthPrompts) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Welcome back to {workspace.name}!
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Here's what's happening in your workspace today
          </p>
        </div>

        {/* Main Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Prompts</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{promptCount || 0}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {promptGrowth > 0 ? '+' : ''}{promptGrowth}% from last month
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Team Members</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{memberCount || 1}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activeToday} active today</p>
              </div>
              <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Prompt Runs</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{totalRuns}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Last 30 days</p>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">AI Savings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  ${estimatedSavings.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">This month</p>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-3">
                <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent & Trending */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Link href={`/${workspaceSlug}/prompts/new`}>
                  <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Prompt
                  </Button>
                </Link>
                <Link href={`/${workspaceSlug}/prompts`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Folder className="mr-2 h-4 w-4" />
                    Browse Library
                  </Button>
                </Link>
                <Link href={`/${workspaceSlug}/settings/api-keys`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Sparkles className="mr-2 h-4 w-4" />
                    API Keys
                  </Button>
                </Link>
              </div>
            </div>

            {/* Recent Prompts */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Recent Prompts</h2>
                <Link 
                  href={`/${workspaceSlug}/prompts`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  View all →
                </Link>
              </div>
              
              {recentPrompts && recentPrompts.length > 0 ? (
                <div className="space-y-3">
                  {(recentPrompts as any[]).map((prompt: any) => (
                    <Link
                      key={prompt.id}
                      href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                      className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-neutral-800 p-4 transition-colors hover:bg-gray-50 dark:hover:bg-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-2">
                          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{prompt.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {prompt.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <GitBranch className="h-3 w-3" />
                          v{prompt.version || 1}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(prompt.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Folder className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="mt-4 text-gray-500 dark:text-gray-400">No prompts yet</p>
                  <Link href={`/${workspaceSlug}/prompts/new`}>
                    <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first prompt
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Trending & Activity */}
          <div className="space-y-6">
            {/* Trending Prompts */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trending</h2>
              </div>
              
              {trendingPrompts && trendingPrompts.length > 0 ? (
                <div className="space-y-3">
                  {(trendingPrompts as any[]).slice(0, 3).map((prompt: any, index: number) => (
                    <Link
                      key={prompt.id}
                      href={`/${workspaceSlug}/prompts/${prompt.slug}`}
                      className="flex items-start gap-3 group"
                    >
                      <span className="text-lg font-bold text-gray-400 dark:text-gray-600">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {prompt.name}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {prompt.usage_count || 0} uses
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No trending prompts yet
                </p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Live Activity</h2>
              </div>
              
              {recentActivities && recentActivities.length > 0 ? (
                <div className="space-y-3">
                  {(recentActivities as any[]).slice(0, 5).map((activity: any) => {
                    const getActivityIcon = () => {
                      if (activity.type.includes('prompt')) return <FileText className="h-3 w-3" />;
                      if (activity.type.includes('folder')) return <Folder className="h-3 w-3" />;
                      if (activity.type.includes('run')) return <Play className="h-3 w-3" />;
                      return <Zap className="h-3 w-3" />;
                    };
                    
                    const getActivityText = () => {
                      const user = activity.users?.metadata?.name || activity.users?.email?.split('@')[0] || 'Someone';
                      const metadata = activity.metadata || {};
                      
                      switch(activity.type) {
                        case 'prompt_created':
                          return `${user} created "${metadata.promptName || 'a prompt'}"`;
                        case 'prompt_updated':
                          return `${user} updated "${metadata.promptName || 'a prompt'}"`;
                        case 'prompt_run':
                          return `${user} ran "${metadata.promptName || 'a prompt'}"`;
                        case 'folder_created':
                          return `${user} created folder "${metadata.folderName || 'a folder'}"`;
                        default:
                          return `${user} performed ${activity.type.replace(/_/g, ' ')}`;
                      }
                    };
                    
                    return (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="rounded-full bg-gray-100 dark:bg-neutral-800 p-1.5 mt-0.5">
                          {getActivityIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                            {getActivityText()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No recent activity
                </p>
              )}
            </div>

            {/* Usage Chart Preview */}
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 p-6">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usage Trend</h3>
              </div>
              <div className="h-24 flex items-end gap-1">
                {(() => {
                  // Generate last 7 days of activity data
                  const last7Days = [];
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dayStr = date.toDateString();
                    const count = activityStats?.byDay?.[dayStr] || 0;
                    const maxCount = Math.max(...Object.values(activityStats?.byDay || {}), 1);
                    const height = Math.max((count / maxCount) * 100, 10); // Min 10% height
                    last7Days.push(height);
                  }
                  return last7Days.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-blue-500 dark:bg-blue-600 rounded-t opacity-80 transition-all hover:opacity-100"
                      style={{ height: `${height}%` }}
                    />
                  ));
                })()}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                Last 7 days
              </p>
            </div>
            
            {/* Performance Metrics */}
            <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Performance</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Runs/Day</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {avgRunsPerDay.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                      style={{ width: `${Math.min((avgRunsPerDay / 10) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-gray-400">Active Prompts</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {uniquePromptsRun}/{promptCount || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                      style={{ width: `${Math.min((uniquePromptsRun / (promptCount || 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}