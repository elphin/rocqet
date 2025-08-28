'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  Hash, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Clock,
  FileText,
  ArrowLeft,
  AlertCircle,
  Network,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { formatDate } from '@/lib/utils/date';

interface TagAnalytics {
  totalTags: number;
  totalTaggedPrompts: number;
  mostUsedTags: TagUsageData[];
  mostPopularTags: TagUsageData[];
  recentlyUsedTags: TagUsageData[];
  unusedTags: TagUsageData[];
  tagGrowth: { date: string; count: number }[];
  tagRelationships: Record<string, Record<string, number>>;
  allTags: TagUsageData[];
}

interface TagUsageData {
  id: string;
  name: string;
  color: string;
  promptCount: number;
  totalUsage: number;
  lastUsed: string | null;
  prompts: any[];
}

interface TagAnalyticsClientProps {
  workspace: any;
  analytics: TagAnalytics;
  userRole: string;
}

export function TagAnalyticsClient({ workspace, analytics, userRole }: TagAnalyticsClientProps) {
  const [selectedMetric, setSelectedMetric] = useState<'usage' | 'popularity' | 'recent'>('usage');
  const [showRelationships, setShowRelationships] = useState(false);
  const router = useRouter();

  const getDisplayTags = () => {
    switch (selectedMetric) {
      case 'usage':
        return analytics.mostUsedTags;
      case 'popularity':
        return analytics.mostPopularTags;
      case 'recent':
        return analytics.recentlyUsedTags;
      default:
        return analytics.mostUsedTags;
    }
  };

  const getTopRelatedTags = (tagId: string) => {
    const relations = analytics.tagRelationships[tagId] || {};
    return Object.entries(relations)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([relatedTagId, count]) => {
        const tag = analytics.allTags.find(t => t.id === relatedTagId);
        return { tag, count };
      })
      .filter(item => item.tag);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/${workspace.slug}/tags`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tags
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-gray-100">Tag Analytics</h1>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
            Insights and usage patterns for your tags
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600 dark:text-gray-400">Total Tags</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-gray-100 mt-1">
                  {analytics.totalTags}
                </p>
              </div>
              <Hash className="w-8 h-8 text-blue-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600 dark:text-gray-400">Tagged Prompts</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-gray-100 mt-1">
                  {analytics.totalTaggedPrompts}
                </p>
              </div>
              <FileText className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600 dark:text-gray-400">Avg Tags/Prompt</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-gray-100 mt-1">
                  {analytics.totalTaggedPrompts > 0 
                    ? (analytics.allTags.reduce((sum, t) => sum + t.promptCount, 0) / analytics.totalTaggedPrompts).toFixed(1)
                    : '0'}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-neutral-600 dark:text-gray-400">Unused Tags</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-gray-100 mt-1">
                  {analytics.unusedTags.length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-amber-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Top Tags Section */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">Top Tags</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={selectedMetric === 'usage' ? 'default' : 'outline'}
                onClick={() => setSelectedMetric('usage')}
                className={selectedMetric === 'usage' 
                  ? 'bg-blue-600 text-white' 
                  : 'border-neutral-200 dark:border-neutral-700'}
              >
                <Activity className="w-3.5 h-3.5 mr-1" />
                Most Used
              </Button>
              <Button
                size="sm"
                variant={selectedMetric === 'popularity' ? 'default' : 'outline'}
                onClick={() => setSelectedMetric('popularity')}
                className={selectedMetric === 'popularity' 
                  ? 'bg-blue-600 text-white' 
                  : 'border-neutral-200 dark:border-neutral-700'}
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                Most Popular
              </Button>
              <Button
                size="sm"
                variant={selectedMetric === 'recent' ? 'default' : 'outline'}
                onClick={() => setSelectedMetric('recent')}
                className={selectedMetric === 'recent' 
                  ? 'bg-blue-600 text-white' 
                  : 'border-neutral-200 dark:border-neutral-700'}
              >
                <Clock className="w-3.5 h-3.5 mr-1" />
                Recently Used
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {getDisplayTags().map((tag, index) => (
              <div 
                key={tag.id}
                className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                onClick={() => router.push(`/${workspace.slug}/tags?filter=${tag.name}`)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-neutral-500 dark:text-gray-500 w-6">
                    #{index + 1}
                  </span>
                  <span 
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${tag.color}20`,
                      color: tag.color
                    }}
                  >
                    <Hash className="w-3 h-3 mr-1" />
                    {tag.name}
                  </span>
                  <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {tag.promptCount} prompts
                    </span>
                    {selectedMetric === 'usage' && (
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {tag.totalUsage} uses
                      </span>
                    )}
                    {selectedMetric === 'recent' && tag.lastUsed && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(tag.lastUsed)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-gray-500" />
              </div>
            ))}
          </div>
        </div>

        {/* Unused Tags Warning */}
        {analytics.unusedTags.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {analytics.unusedTags.length} Unused Tags
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  These tags are not assigned to any prompts:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {analytics.unusedTags.slice(0, 10).map(tag => (
                    <span 
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                      style={{ 
                        backgroundColor: `${tag.color}20`,
                        color: tag.color
                      }}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag.name}
                    </span>
                  ))}
                  {analytics.unusedTags.length > 10 && (
                    <span className="text-xs text-amber-700 dark:text-amber-300">
                      +{analytics.unusedTags.length - 10} more
                    </span>
                  )}
                </div>
                <Link href={`/${workspace.slug}/tags`}>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-3 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900"
                  >
                    Manage Tags
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Tag Relationships */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              Tag Relationships
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowRelationships(!showRelationships)}
              className="border-neutral-200 dark:border-neutral-700"
            >
              <Network className="w-3.5 h-3.5 mr-1" />
              {showRelationships ? 'Hide' : 'Show'} Relationships
            </Button>
          </div>

          {showRelationships && (
            <div className="space-y-3">
              {analytics.allTags
                .filter(tag => Object.keys(analytics.tagRelationships[tag.id] || {}).length > 0)
                .slice(0, 10)
                .map(tag => {
                  const relatedTags = getTopRelatedTags(tag.id);
                  if (relatedTags.length === 0) return null;
                  
                  return (
                    <div key={tag.id} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800">
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${tag.color}20`,
                            color: tag.color
                          }}
                        >
                          <Hash className="w-3 h-3 mr-1" />
                          {tag.name}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-gray-500">
                          frequently appears with:
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {relatedTags.map(({ tag: relatedTag, count }) => (
                          <span 
                            key={relatedTag!.id}
                            className="inline-flex items-center gap-1"
                          >
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ 
                                backgroundColor: `${relatedTag!.color}20`,
                                color: relatedTag!.color
                              }}
                            >
                              <Hash className="w-3 h-3 mr-1" />
                              {relatedTag!.name}
                            </span>
                            <span className="text-xs text-neutral-500 dark:text-gray-500">
                              ({count}x)
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}