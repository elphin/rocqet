'use client';

import Link from 'next/link';
import { 
  Plus, Folder, TrendingUp, Eye, GitBranch,
  FileText, BarChart3, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RealTimeActivity } from './real-time-activity';

interface DashboardClientProps {
  workspace: any;
  workspaceSlug: string;
  recentPrompts: any[];
  trendingPrompts: any[];
  recentActivities: any[];
  activityStats: any;
  metrics: {
    promptCount: number;
    promptGrowth: number;
    memberCount: number;
    activeToday: number;
    totalRuns: number;
    estimatedSavings: number;
    avgRunsPerDay: number;
    uniquePromptsRun: number;
  };
}

export function DashboardClient({
  workspace,
  workspaceSlug,
  recentPrompts,
  trendingPrompts,
  recentActivities,
  activityStats,
  metrics
}: DashboardClientProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Recent & Quick Actions */}
      <div className="lg:col-span-2 space-y-6">
        {/* Quick Actions */}
        <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link href={`/${workspaceSlug}/prompts/new`}>
              <Button variant="default" className="w-full justify-start">
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
                <GitBranch className="mr-2 h-4 w-4" />
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
              {recentPrompts.map((prompt) => (
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
                <Button variant="primaryCta" className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first prompt
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Activity & Analytics */}
      <div className="space-y-6">
        {/* Trending Prompts */}
        <div className="rounded-xl bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Trending</h2>
          </div>
          
          {trendingPrompts && trendingPrompts.length > 0 ? (
            <div className="space-y-3">
              {trendingPrompts.slice(0, 3).map((prompt, index) => (
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

        {/* Real-time Activity */}
        <RealTimeActivity 
          workspaceId={workspace.id}
          initialActivities={recentActivities}
        />

        {/* Usage Chart */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Usage Trend</h3>
          </div>
          <div className="h-24 flex items-end gap-1">
            {(() => {
              const last7Days = [];
              for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                const dayStr = date.toDateString();
                const count = activityStats?.byDay?.[dayStr] || 0;
                const maxCount = Math.max(...Object.values(activityStats?.byDay || {}), 1);
                const height = Math.max((count / maxCount) * 100, 10);
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
                  {metrics.avgRunsPerDay.toFixed(1)}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${Math.min((metrics.avgRunsPerDay / 10) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">Active Prompts</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.uniquePromptsRun}/{metrics.promptCount}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                  style={{ width: `${Math.min((metrics.uniquePromptsRun / (metrics.promptCount || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}