'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Edit3, Play, History, Copy, Trash2, MoreVertical, 
  GitBranch, Clock, User, Star, Variable, Share2, Download, Eye,
  TrendingUp, Heart, X, Folder, Calendar, ChevronDown, ChevronUp,
  FileText, Activity, Upload
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils/date';
import { publishPromptToTemplate, checkIsAdmin } from '@/app/actions/template-actions';

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
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // Start collapsed
  const [isAdmin, setIsAdmin] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishCategory, setPublishCategory] = useState('');
  const [publishWhenToUse, setPublishWhenToUse] = useState('');
  
  const router = useRouter();
  const supabase = createClient();
  const variables = prompt.variables as any[] || [];

  // Detect variables in content
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = prompt.content?.match(regex);
    if (matches) {
      const vars = matches.map((m: string) => m.replace(/[{}]/g, '').trim());
      setDetectedVariables([...new Set(vars)]);
    } else {
      setDetectedVariables([]);
    }
  }, [prompt.content]);

  // Check if user is admin
  useEffect(() => {
    checkIsAdmin().then(setIsAdmin);
  }, []);

  const handleToggleFavorite = async () => {
    const newFavoriteState = !isFavorite;
    setIsFavorite(newFavoriteState);
    
    try {
      const { error } = await supabase
        .from('prompts')
        .update({ is_favorite: newFavoriteState })
        .eq('id', prompt.id)
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
    navigator.clipboard.writeText(prompt.content || '');
    toast.success('Prompt copied to clipboard!');
  };

  const handleCopyWithVariables = () => {
    let filledContent = prompt.content || '';
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
      const response = await fetch(`/api/prompts?id=${prompt.id}&workspace_id=${workspace.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/${params.workspace}/prompts`);
      } else {
        const error = await response.json();
        alert(`Failed to delete prompt: ${error.error}`);
        setDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      alert('Failed to delete prompt');
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
          prompt_id: prompt.id,
          workspace_id: workspace.id
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        router.push(`/${params.workspace}/prompts/${data.slug}`);
      } else {
        const error = await response.json();
        alert(`Failed to duplicate prompt: ${error.error}`);
        setDuplicating(false);
      }
    } catch (error) {
      console.error('Error duplicating prompt:', error);
      alert('Failed to duplicate prompt');
      setDuplicating(false);
    }
  };

  const handlePublishToTemplate = async () => {
    if (!publishCategory) {
      toast.error('Please select a category');
      return;
    }

    setPublishing(true);
    try {
      const result = await publishPromptToTemplate({
        promptId: prompt.id,
        category: publishCategory,
        whenToUse: publishWhenToUse
      });

      if (result.success) {
        toast.success(result.message || 'Template published successfully');
        setShowPublishModal(false);
        setPublishCategory('');
        setPublishWhenToUse('');
        // Navigate to the published template
        if (result.templateSlug) {
          setTimeout(() => {
            router.push(`/templates/${result.templateSlug}`);
          }, 1000);
        } else if (result.templateId) {
          setTimeout(() => {
            router.push(`/templates/${result.templateId}`);
          }, 1000);
        }
      } else {
        toast.error(result.error || 'Failed to publish template');
      }
    } catch (error) {
      toast.error('Failed to publish template');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/30">
      <div className="mx-auto max-w-6xl">
        {/* Clean Header */}
        <div className="bg-white border-b border-neutral-100">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              {/* Left: Back + Title + Meta */}
              <div className="flex items-center gap-4">
                <Link href={`/${params.workspace}/prompts`}>
                  <Button variant="ghost" size="icon" className="h-9 w-9 -ml-1">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex items-center gap-6">
                  <div>
                    <h1 className="text-xl font-semibold text-neutral-900">{prompt.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(prompt.updated_at)}
                      </span>
                      <span>•</span>
                      <span>v{prompt.version || 1}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {prompt.views || 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {prompt.uses || 0} uses
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Icon Actions + Primary Buttons */}
              <div className="flex items-center gap-1">
                {/* Icon-based Quick Actions */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleFavorite}
                  className={`h-9 w-9 ${isFavorite ? 'text-amber-500 hover:text-amber-600' : 'text-neutral-500 hover:text-neutral-700'}`}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </Button>
                
                {detectedVariables.length > 0 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowVariablesModal(true)}
                    className="h-9 w-9 text-neutral-500 hover:text-neutral-700"
                    title="Copy with Variables"
                  >
                    <Variable className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopyRaw}
                    className="h-9 w-9 text-neutral-500 hover:text-neutral-700"
                    title="Copy Prompt"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-neutral-500 hover:text-neutral-700"
                  title="Share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDuplicate}
                  disabled={duplicating}
                  className="h-9 w-9 text-neutral-500 hover:text-neutral-700"
                  title="Duplicate"
                >
                  <Download className="h-4 w-4" />
                </Button>

                <div className="w-px h-6 bg-neutral-200 mx-2" />

                {/* Primary Actions */}
                <Link href={`/${params.workspace}/prompts/${prompt.slug}/playground`}>
                  <Button variant="outline" size="sm" className="h-9">
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Test
                  </Button>
                </Link>
                <Link href={`/${params.workspace}/prompts/${prompt.slug}/edit`}>
                  <Button size="sm" className="h-9 bg-neutral-900 hover:bg-neutral-800 text-white">
                    <Edit3 className="mr-2 h-3.5 w-3.5" />
                    Edit
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-8">
          <div className="grid gap-8 lg:grid-cols-4">
            {/* Main Content - 3 columns */}
            <div className="lg:col-span-3">
              {/* Description (if exists) */}
              {prompt.description && (
                <div className="mb-8">
                  <p className="text-neutral-600 leading-relaxed">{prompt.description}</p>
                </div>
              )}

              {/* Prompt Content - Clean Typography */}
              <div className="mb-8">
                <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                  <div className="p-6">
                    <div className="prose prose-neutral max-w-none">
                      <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-neutral-800 bg-neutral-50 rounded-lg p-4 border">
                        {prompt.content}
                      </pre>
                    </div>
                    
                    {/* Variables Pills */}
                    {detectedVariables.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-neutral-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-neutral-500 mr-2">Variables:</span>
                          {detectedVariables.map((v) => (
                            <span
                              key={v}
                              className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-medium border border-blue-100"
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Version History - Simplified */}
              {versions && versions.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-neutral-700">Recent Versions</h3>
                    <Link 
                      href={`/${params.workspace}/prompts/${prompt.slug}/history`}
                      className="text-xs text-neutral-500 hover:text-neutral-700 font-medium"
                    >
                      View all history →
                    </Link>
                  </div>
                  <div className="space-y-2">
                    {versions.slice(0, 3).map((version: any) => (
                      <div key={version.id} className="flex items-center justify-between py-2 px-4 bg-white rounded-lg border border-neutral-100">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-neutral-500 bg-neutral-50 px-2 py-1 rounded">
                            v{version.version}
                          </span>
                          <span className="text-sm text-neutral-700">{version.change_message || 'No message'}</span>
                        </div>
                        <span className="text-xs text-neutral-500">{formatDate(version.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="space-y-6">
              {/* Model Settings - Compact */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Configuration</h3>
                <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Model</span>
                    <span className="text-sm font-medium text-neutral-900">{prompt.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-neutral-500">Temperature</span>
                    <span className="text-sm font-medium text-neutral-900">{(prompt.temperature || 7) / 10}</span>
                  </div>
                  {prompt.max_tokens && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-500">Max Tokens</span>
                      <span className="text-sm font-medium text-neutral-900">{prompt.max_tokens}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage Stats */}
              <div>
                <h3 className="text-sm font-medium text-neutral-700 mb-3">Usage</h3>
                <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-4">
                  <div>
                    <div className="text-2xl font-bold text-neutral-900">{prompt.usage_count || 0}</div>
                    <div className="text-xs text-neutral-500">Total executions</div>
                  </div>
                  {prompt.last_used_at && (
                    <div className="pt-3 border-t border-neutral-100">
                      <div className="text-sm font-medium text-neutral-900">
                        {formatDate(prompt.last_used_at)}
                      </div>
                      <div className="text-xs text-neutral-500">Last executed</div>
                    </div>
                  )}
                  {prompt.average_rating && (
                    <div className="pt-3 border-t border-neutral-100">
                      <div className="text-sm font-medium text-neutral-900">
                        {(prompt.average_rating / 10).toFixed(1)} / 5.0
                      </div>
                      <div className="text-xs text-neutral-500">Average rating</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions - Collapsible */}
              <div className="bg-white rounded-lg border border-neutral-200 overflow-hidden">
                <button
                  onClick={() => setSidebarExpanded(!sidebarExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-neutral-500" />
                    <span className="text-sm font-medium text-neutral-700">Quick Actions</span>
                  </div>
                  {sidebarExpanded ? (
                    <ChevronUp className="h-4 w-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  )}
                </button>
                
                {sidebarExpanded && (
                  <div className="border-t border-neutral-200 p-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    <Link href={`/${params.workspace}/prompts/${prompt.slug}/playground`}>
                      <Button variant="ghost" className="w-full justify-start text-sm h-8">
                        <Play className="mr-2 h-3.5 w-3.5" />
                        Test Playground
                      </Button>
                    </Link>
                    <Link href={`/${params.workspace}/prompts/${prompt.slug}/history`}>
                      <Button variant="ghost" className="w-full justify-start text-sm h-8">
                        <History className="mr-2 h-3.5 w-3.5" />
                        Version History
                      </Button>
                    </Link>
                    <Link href={`/${params.workspace}/prompts/${prompt.slug}/documentation`}>
                      <Button variant="ghost" className="w-full justify-start text-sm h-8">
                        <FileText className="mr-2 h-3.5 w-3.5" />
                        Documentation
                      </Button>
                    </Link>
                    <Link href={`/${params.workspace}/prompts/${prompt.slug}/runs`}>
                      <Button variant="ghost" className="w-full justify-start text-sm h-8">
                        <TrendingUp className="mr-2 h-3.5 w-3.5" />
                        Run History
                      </Button>
                    </Link>
                    
                    <div className="border-t border-neutral-100 my-2" />
                    
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm h-8" 
                      onClick={handleDuplicate}
                      disabled={duplicating}
                    >
                      <Copy className="mr-2 h-3.5 w-3.5" />
                      {duplicating ? 'Duplicating...' : 'Duplicate'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-sm h-8"
                      onClick={() => {/* Add share functionality */}}
                    >
                      <Share2 className="mr-2 h-3.5 w-3.5" />
                      Share
                    </Button>
                    {isAdmin && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm h-8"
                        onClick={() => setShowPublishModal(true)}
                      >
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        Publish to Templates
                      </Button>
                    )}
                    {(membership.role === 'owner' || membership.role === 'admin') && (
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start text-sm h-8 text-red-600 hover:text-red-700 hover:bg-red-50" 
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-pale rounded-lg flex items-center justify-center">
                    <Variable className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">Fill in Variables</h3>
                </div>
                <button
                  onClick={() => {
                    setShowVariablesModal(false);
                    setVariableValues({});
                  }}
                  className="text-neutral-400 hover:text-neutral-600 -mt-1 -mr-1 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-sm text-neutral-600 mb-6">
                Replace the variables in your prompt with actual values
              </p>
              
              <div className="space-y-4">
                {detectedVariables.map((variable) => (
                  <div key={variable}>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 mb-2">
                      <code className="px-2 py-0.5 bg-neutral-100 rounded text-xs font-mono">
                        {`{{${variable}}}`}
                      </code>
                      <span className="text-xs text-neutral-500">Optional</span>
                    </label>
                    <Input
                      value={variableValues[variable] || ''}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [variable]: e.target.value
                      })}
                      placeholder={`Enter ${variable}...`}
                      className="h-10 text-sm"
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
                  className="flex-1 bg-neutral-800 hover:bg-neutral-900 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy with Values
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Publish to Template Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary-pale rounded-lg flex items-center justify-center">
                    <Upload className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">Publish to Template Library</h3>
                </div>
                <button
                  onClick={() => {
                    setShowPublishModal(false);
                    setPublishCategory('');
                    setPublishWhenToUse('');
                  }}
                  className="text-neutral-400 hover:text-neutral-600 -mt-1 -mr-1 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-neutral-600 mb-6">
                Share this prompt as a template for others to discover and use. All settings including model, temperature, and variables will be included.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={publishCategory}
                    onChange={(e) => setPublishCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a category</option>
                    <option value="marketing">Marketing</option>
                    <option value="development">Development</option>
                    <option value="writing">Writing</option>
                    <option value="business">Business</option>
                    <option value="education">Education</option>
                    <option value="productivity">Productivity</option>
                    <option value="creative">Creative</option>
                    <option value="research">Research</option>
                    <option value="data">Data & Analytics</option>
                    <option value="support">Customer Support</option>
                    <option value="translation">Translation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    When to Use (Optional)
                  </label>
                  <textarea
                    value={publishWhenToUse}
                    onChange={(e) => setPublishWhenToUse(e.target.value)}
                    placeholder="Describe scenarios or use cases when this prompt is most helpful..."
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPublishModal(false);
                    setPublishCategory('');
                    setPublishWhenToUse('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublishToTemplate}
                  disabled={!publishCategory || publishing}
                  className="bg-primary hover:bg-primary-dark text-white"
                >
                  {publishing ? 'Publishing...' : 'Publish Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}