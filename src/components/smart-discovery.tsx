'use client';

import { useState, useEffect } from 'react';
import { Search, Sparkles, TrendingUp, Users, Clock, Hash, FolderOpen, ChevronRight, Lightbulb, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface DiscoveryProps {
  workspaceId: string;
  workspaceSlug: string;
  currentPromptId?: string;
}

interface PromptResult {
  id: string;
  name: string;
  slug: string;
  description: string;
  when_to_use: string;
  created_at: string;
  updated_at: string;
  uses: number;
  views: number;
  tag_count: number;
  run_count: number;
  relevance_score: number;
  recommendation_reason?: string;
  folders?: { name: string };
  users?: { email: string; full_name: string };
}

export function SmartDiscovery({ workspaceId, workspaceSlug, currentPromptId }: DiscoveryProps) {
  const [mode, setMode] = useState<'search' | 'related' | 'recommended'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<PromptResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<PromptResult[]>([]);

  // Fetch recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, [workspaceId]);

  // Fetch related prompts if currentPromptId is provided
  useEffect(() => {
    if (currentPromptId) {
      fetchRelatedPrompts();
    }
  }, [currentPromptId]);

  const fetchRecommendations = async () => {
    try {
      const response = await fetch('/api/prompts/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          workspaceId,
          userId: 'current' // Will be handled by API
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    }
  };

  const fetchRelatedPrompts = async () => {
    if (!currentPromptId) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `/api/prompts/discover?mode=related&workspace_id=${workspaceId}&prompt_id=${currentPromptId}&limit=6`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error('Error fetching related prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setMode('search');
    
    try {
      const response = await fetch(
        `/api/prompts/discover?mode=documentation&workspace_id=${workspaceId}&q=${encodeURIComponent(searchQuery)}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400';
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-neutral-500 dark:text-neutral-400';
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100">
            Smart Discovery
          </h3>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search documentation, examples, requirements..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="h-9 px-4"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
            ) : (
              'Search'
            )}
          </Button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setMode('search')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              mode === 'search' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            Search Results
          </button>
          {currentPromptId && (
            <button
              onClick={() => {
                setMode('related');
                fetchRelatedPrompts();
              }}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                mode === 'related' 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Link2 className="h-3 w-3 inline mr-1" />
              Related
            </button>
          )}
          <button
            onClick={() => setMode('recommended')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${
              mode === 'recommended' 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Lightbulb className="h-3 w-3 inline mr-1" />
            Recommended
          </button>
        </div>
      </div>

      {/* Results */}
      {mode === 'search' && results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Results ({results.length})
          </h4>
          {results.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} workspaceSlug={workspaceSlug} />
          ))}
        </div>
      )}

      {mode === 'related' && results.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Related Prompts
          </h4>
          {results.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} workspaceSlug={workspaceSlug} />
          ))}
        </div>
      )}

      {mode === 'recommended' && recommendations.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Recommended for You
          </h4>
          {recommendations.map((prompt) => (
            <PromptCard 
              key={prompt.id} 
              prompt={prompt} 
              workspaceSlug={workspaceSlug}
              showReason 
            />
          ))}
        </div>
      )}

      {/* Empty States */}
      {mode === 'search' && results.length === 0 && searchQuery && !loading && (
        <div className="text-center py-8">
          <Search className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No prompts found matching your search
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Try different keywords or check the documentation
          </p>
        </div>
      )}

      {mode === 'related' && results.length === 0 && !loading && (
        <div className="text-center py-8">
          <Link2 className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No related prompts found
          </p>
        </div>
      )}

      {mode === 'recommended' && recommendations.length === 0 && (
        <div className="text-center py-8">
          <Lightbulb className="h-8 w-8 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            No recommendations yet
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
            Start using prompts to get personalized recommendations
          </p>
        </div>
      )}
    </div>
  );
}

// Prompt Card Component
function PromptCard({ 
  prompt, 
  workspaceSlug, 
  showReason = false 
}: { 
  prompt: PromptResult; 
  workspaceSlug: string;
  showReason?: boolean;
}) {
  return (
    <Link href={`/${workspaceSlug}/prompts/${prompt.slug}`}>
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 border border-neutral-200 dark:border-neutral-800 hover:border-purple-300 dark:hover:border-purple-700 transition-all hover:shadow-sm cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h5 className="text-sm font-medium text-neutral-900 dark:text-gray-100 flex items-center gap-2">
              {prompt.name}
              {prompt.relevance_score > 0 && (
                <span className={`text-xs ${getScoreColor(prompt.relevance_score)}`}>
                  {prompt.relevance_score.toFixed(1)}
                </span>
              )}
            </h5>
            {prompt.description && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                {prompt.description}
              </p>
            )}
            {prompt.when_to_use && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2 line-clamp-2">
                <strong>When to use:</strong> {prompt.when_to_use}
              </p>
            )}
            {showReason && prompt.recommendation_reason && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ✨ {prompt.recommendation_reason}
              </p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-400 flex-shrink-0" />
        </div>

        <div className="flex items-center gap-4 text-[10px] text-neutral-500 dark:text-neutral-500">
          {prompt.folders?.name && (
            <span className="flex items-center gap-1">
              <FolderOpen className="h-3 w-3" />
              {prompt.folders.name}
            </span>
          )}
          {prompt.tag_count > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {prompt.tag_count}
            </span>
          )}
          {prompt.run_count > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {prompt.run_count} runs
            </span>
          )}
          {prompt.uses > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {prompt.uses} uses
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(prompt.updated_at), { addSuffix: true })}
          </span>
        </div>
      </div>
    </Link>
  );
}

function getScoreColor(score: number) {
  if (score >= 8) return 'text-green-600 dark:text-green-400';
  if (score >= 5) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-neutral-500 dark:text-neutral-400';
}