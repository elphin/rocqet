'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Edit3, Play, Copy, Trash2, Star, Variable, Share2, 
  Download, Eye, GitBranch, Calendar, User, ChevronRight, X,
  Sparkles, BarChart, Clock, FolderOpen, Hash, BookOpen, TestTube,
  Clipboard, Files, Activity, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/date';
import { ExportModal } from '@/components/modals/export-modal-new';
import { ShareModal } from '@/components/modals/share-modal-v2';
import { VersionHistoryModal } from '@/components/modals/version-history-modal';
import { PromptPlaygroundEnhanced } from '@/components/prompt-playground-enhanced';
import { PromptVersionHistory } from '@/components/prompt-version-history';
import { PromptDocumentation } from '@/components/prompt-documentation';
import { SmartDiscovery } from '@/components/smart-discovery';
import { PromptRunHistory } from '@/components/prompt-run-history';
import { PromptDetailSidebar } from '@/components/prompt-detail-sidebar';

interface PromptDetailClientProps {
  prompt: any;
  versions: any[];
  runs: any[];
  membership: any;
  workspace: any;
  params: {
    workspace: string;
    id: string;
  };
}

export function PromptDetailClient({ 
  prompt, 
  versions, 
  runs, 
  membership, 
  workspace,
  params 
}: PromptDetailClientProps) {
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(prompt.is_favorite || false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'playground' | 'documentation' | 'history' | 'runs'>('playground');
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(prompt);
  
  const router = useRouter();
  const supabase = createClient();

  // Detect variables in content
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = currentPrompt.content?.match(regex);
    if (matches) {
      const vars = matches.map((m: string) => m.replace(/[{}]/g, '').trim());
      setDetectedVariables([...new Set(vars)]);
    } else {
      setDetectedVariables([]);
    }
  }, [currentPrompt.content]);

  const handlePromptUpdate = (updatedData: any) => {
    setCurrentPrompt(updatedData);
  };

  const handleToggleFavorite = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: newFavoriteState })
        .eq('id', currentPrompt.id)
        .eq('workspace_id', workspace.id);
      
      if (error) {
        setIsFavorite(!newFavoriteState);
        toast.error('Failed to update favorite status');
      } else {
        toast.success(newFavoriteState ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (err) {
      setIsFavorite(!newFavoriteState);
      toast.error('Failed to update favorite status');
    }
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(currentPrompt.content || '');
    toast.success('Prompt copied to clipboard!');
  };

  const handleCopyWithVariables = () => {
    let filledContent = currentPrompt.content || '';
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      filledContent = filledContent.replace(regex, value);
    });
    navigator.clipboard.writeText(filledContent);
    toast.success('Prompt with variables copied to clipboard!');
    setShowVariablesModal(false);
    setVariableValues({});
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this prompt? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/prompts?id=${currentPrompt.id}&workspace_id=${workspace.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/${params.workspace}/prompts`);
      } else {
        const error = await response.json();
        toast.error(`Failed to delete prompt: ${error.error}`);
        setDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast.error('Failed to delete prompt');
      setDeleting(false);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const response = await fetch('/api/prompts/duplicate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt_id: currentPrompt.id,
          workspace_id: workspace.id
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        router.push(`/${params.workspace}/prompts/${data.slug}`);
      } else {
        const error = await response.json();
        toast.error(`Failed to duplicate prompt: ${error.error}`);
        setDuplicating(false);
      }
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      toast.error('Failed to duplicate prompt');
      setDuplicating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Streamlined Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <Link href={`/${params.workspace}/prompts`}>
                <Button variant="ghost" size="icon" className="mt-1">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-neutral-900 dark:text-gray-100 mb-2">{currentPrompt.name}</h1>
                <p className="text-neutral-600 dark:text-gray-400 mb-3">{currentPrompt.description || 'No description provided'}</p>
                
                {/* Inline metadata */}
                <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Created by Jim
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(prompt.updated_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3.5 w-3.5" />
                    v{currentPrompt.version || 1}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {currentPrompt.views || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart className="h-3.5 w-3.5" />
                    {currentPrompt.uses || 0} uses
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons as icons */}
            <div className="flex items-center gap-2">
              {/* Icon actions */}
              <div className="flex items-center gap-1 mr-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavorite}
                  className={`h-9 w-9 ${isFavorite ? 'text-yellow-500' : 'text-neutral-400 dark:text-gray-500'}`}
                  title="Favorite"
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                {/* Always show copy raw button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyRaw}
                  className="h-9 w-9 text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300"
                  title="Copy to clipboard"
                >
                  <Clipboard className="h-4 w-4" />
                </Button>
                
                {/* Show variable button only if variables detected */}
                {detectedVariables.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVariablesModal(true)}
                    className="h-9 w-9 text-purple-500 dark:text-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                    title="Copy with variables"
                  >
                    <Variable className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  onClick={() => setShowShareModal(true)}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => setShowExportModal(true)}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300"
                  title="Export"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="h-9 w-9 text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
                  title="Duplicate prompt"
                >
                  <Files className="h-4 w-4" />
                </Button>
                {(membership.role === 'owner' || membership.role === 'admin') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="h-9 w-9 text-red-400 dark:text-red-500 hover:text-red-600 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Primary actions */}
              <Link href={`/${params.workspace}/prompts/${currentPrompt.slug}/playground`}>
                <Button 
                  variant="outline" 
                  size="icon"
                  className="h-9 w-9"
                  title="Test"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={`/${params.workspace}/prompts/${currentPrompt.slug}/edit`}>
                <Button 
                  size="icon" 
                  className="h-9 w-9 bg-neutral-900 dark:bg-blue-600 hover:bg-neutral-800 dark:hover:bg-blue-700 text-white"
                  title="Edit"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Tags and Folder */}
          {(currentPrompt.tags?.length > 0 || currentPrompt.folder) && (
            <div className="flex items-center gap-3 mt-4">
              {currentPrompt.folder && (
                <span className="flex items-center gap-1 text-sm text-neutral-600 dark:text-gray-400">
                  <FolderOpen className="h-3.5 w-3.5" />
                  {currentPrompt.folder.name}
                </span>
              )}
              {currentPrompt.tags?.map((tag: any, index: number) => {
                // Handle both string tags and object tags
                const isStringTag = typeof tag === 'string';
                const tagName = isStringTag ? tag : tag.name;
                const tagColor = isStringTag ? '#6B7280' : (tag.color || '#6B7280');
                const tagKey = isStringTag ? `tag-${index}` : (tag.id || `tag-${index}`);
                
                return (
                  <span
                    key={tagKey}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                    style={{ 
                      backgroundColor: `${tagColor}20`,
                      color: tagColor
                    }}
                  >
                    <Hash className="h-3 w-3 mr-1" />
                    {tagName}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-4 gap-6">
          {/* Content Area - 3 columns */}
          <div className="col-span-3 space-y-6">
            {/* Prompt Content Card */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="border-b border-neutral-100 dark:border-neutral-800 px-6 py-4">
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-gray-100">Prompt Content</h2>
              </div>
              <div className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm text-neutral-800 dark:text-gray-200 leading-relaxed">
                  {currentPrompt.content}
                </pre>
                
                {/* Variables detected */}
                {detectedVariables.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-neutral-700 dark:text-gray-300">Variables Detected</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detectedVariables.map((v) => (
                        <span
                          key={v}
                          className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Tabbed Section - Playground, Documentation, History */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-all duration-300">
              {/* Collapsible Header */}
              <button
                onClick={() => setIsTabsExpanded(!isTabsExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 text-neutral-600 dark:text-gray-400" />
                  <span className="font-medium text-neutral-900 dark:text-white">Quick Actions</span>
                  <div className="flex items-center gap-2">
                    {isTabsExpanded && (
                      <span className="text-sm text-neutral-500 dark:text-gray-400">
                        {activeTab === 'playground' && 'Test Playground'}
                        {activeTab === 'documentation' && 'Documentation'}
                        {activeTab === 'history' && 'Version History'}
                        {activeTab === 'runs' && 'Run History'}
                      </span>
                    )}
                    {!isTabsExpanded && (
                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <TestTube className="h-3 w-3" />
                          Playground
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Docs
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          History
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {isTabsExpanded ? (
                  <ChevronUp className="h-4 w-4 text-neutral-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-neutral-500 dark:text-gray-400" />
                )}
              </button>

              {/* Expandable Content */}
              {isTabsExpanded && (
                <>
                  {/* Tab Headers */}
                  <div className="border-t border-b border-neutral-100 dark:border-neutral-800">
                    <div className="flex">
                  <button
                    onClick={() => setActiveTab('playground')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'playground'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-neutral-600 dark:text-gray-400 border-transparent hover:text-neutral-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <TestTube className="h-4 w-4" />
                    Test Playground
                  </button>
                  <button
                    onClick={() => setActiveTab('documentation')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'documentation'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-neutral-600 dark:text-gray-400 border-transparent hover:text-neutral-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <BookOpen className="h-4 w-4" />
                    Documentation
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'history'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-neutral-600 dark:text-gray-400 border-transparent hover:text-neutral-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <GitBranch className="h-4 w-4" />
                    Version History
                    {versions && versions.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-gray-400">
                        {versions.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('runs')}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'runs'
                        ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                        : 'text-neutral-600 dark:text-gray-400 border-transparent hover:text-neutral-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    Run History
                    {runs && runs.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-gray-400">
                        {runs.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

                  {/* Tab Content */}
                  <div className="p-6">
                {activeTab === 'playground' && (
                  <PromptPlaygroundEnhanced 
                    content={currentPrompt.content || ''}
                    promptId={currentPrompt.id}
                    workspaceId={workspace.id}
                    workspaceSlug={params.workspace}
                    promptSlug={currentPrompt.slug}
                    model={currentPrompt.model}
                    temperature={currentPrompt.temperature ? currentPrompt.temperature / 10 : 0.7}
                  />
                )}
                
                {activeTab === 'documentation' && (
                  <PromptDocumentation
                    promptId={currentPrompt.id}
                    initialData={{
                      whenToUse: currentPrompt.when_to_use,
                      exampleInput: currentPrompt.example_input,
                      exampleOutput: currentPrompt.example_output,
                      requirements: currentPrompt.requirements,
                      warnings: currentPrompt.warnings,
                      relatedPrompts: currentPrompt.related_prompts
                    }}
                    readOnly={membership.role === 'viewer'}
                  />
                )}
                
                {activeTab === 'history' && (
                  <PromptVersionHistory
                    versions={versions || []}
                    currentVersion={currentPrompt.version || 1}
                    onRestore={(version) => {
                      // Handle version restore
                      toast.info('Version restore coming soon!');
                    }}
                  />
                )}
                
                {activeTab === 'runs' && (
                  <PromptRunHistory
                    workspaceId={workspace.id}
                    promptId={currentPrompt.id}
                    promptName={currentPrompt.name}
                  />
                )}
                  </div>
                </>
              )}
            </div>

            {/* Version History button - optional for quick access */}
            {versions && versions.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                <button
                  onClick={() => setActiveTab('history')}
                  className="w-full flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-neutral-800 p-3 -m-3 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-neutral-700 dark:text-gray-300">View Version History</span>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-gray-400 group-hover:text-neutral-700 dark:group-hover:text-gray-300">
                    {versions.length} version{versions.length !== 1 ? 's' : ''}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-4">
            {/* URL & Settings Card */}
            <PromptDetailSidebar
              prompt={currentPrompt}
              workspace={workspace}
              membership={membership}
              onPromptUpdate={handlePromptUpdate}
            />

            {/* Model Configuration */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-3">Configuration</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-neutral-500 dark:text-gray-400">Model</span>
                  <p className="text-sm font-medium text-neutral-900 dark:text-gray-100">{currentPrompt.model || 'GPT-4'}</p>
                </div>
                <div>
                  <span className="text-xs text-neutral-500 dark:text-gray-400">Temperature</span>
                  <p className="text-sm font-medium text-neutral-900 dark:text-gray-100">{(currentPrompt.temperature || 7) / 10}</p>
                </div>
                {currentPrompt.max_tokens && (
                  <div>
                    <span className="text-xs text-neutral-500 dark:text-gray-400">Max Tokens</span>
                    <p className="text-sm font-medium text-neutral-900 dark:text-gray-100">{currentPrompt.max_tokens}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Statistics */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-3">Usage</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 dark:text-gray-400">Total Uses</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-gray-100">{currentPrompt.usage_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 dark:text-gray-400">This Week</span>
                  <span className="text-sm font-medium text-neutral-900 dark:text-gray-100">{currentPrompt.weekly_uses || 0}</span>
                </div>
                {currentPrompt.last_used_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500 dark:text-gray-400">Last Used</span>
                    <span className="text-sm font-medium text-neutral-900 dark:text-gray-100">{formatDate(currentPrompt.last_used_at)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Runs */}
            {runs && runs.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-gray-100 mb-3">Recent Runs</h3>
                <div className="space-y-2">
                  {runs.slice(0, 3).map((run: any) => (
                    <div key={run.id} className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-neutral-400" />
                      <span className="text-xs text-neutral-600 dark:text-gray-400">
                        {formatDate(run.executed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Smart Discovery - Related Prompts */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <SmartDiscovery 
                workspaceId={workspace.id}
                workspaceSlug={params.workspace}
                currentPromptId={currentPrompt.id}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <Variable className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">Fill in Variables</h3>
                </div>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setVariableValues({});
                  }}
                  className="text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300 -mt-1 -mr-1 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-neutral-600 dark:text-gray-400 mb-6">
                Replace the variables in your prompt with actual values
              </p>
              
              <div className="space-y-4">
                {detectedVariables.map((variable) => (
                  <div key={variable}>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                      <code className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 rounded text-xs font-mono text-neutral-900 dark:text-gray-100">
                        {`{{${variable}}}`}
                      </code>
                      <span className="text-xs text-neutral-500 dark:text-gray-400">Optional</span>
                    </label>
                    <Input
                      value={variableValues[variable] || ''}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [variable]: e.target.value
                      })}
                      placeholder={`Enter ${variable}...`}
                      className="h-10 text-sm bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-gray-100"
                    />
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowVariablesModal(false);
                    setVariableValues({});
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyWithVariables}
                  className="flex-1 bg-neutral-900 hover:bg-neutral-800 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy with Values
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        prompt={currentPrompt}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        prompt={currentPrompt}
        workspace={workspace}
      />

      {/* Version History Modal */}
      <VersionHistoryModal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        promptId={currentPrompt.id}
        currentVersion={currentPrompt.version || 1}
      />
    </div>
  );
}