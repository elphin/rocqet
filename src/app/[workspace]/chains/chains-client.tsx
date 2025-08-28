'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { 
  Link2, 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  Share2, 
  Play,
  MoreVertical,
  Search,
  Filter,
  ChevronRight,
  FileText,
  Settings,
  Zap,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast-config';
import { useRouter } from 'next/navigation';

interface Chain {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  steps: any[];
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  documentation?: {
    when_to_use?: string;
    expected_output?: string;
    requirements?: string;
  };
}

interface ChainsClientProps {
  chains: Chain[];
  workspaceSlug: string;
}

export function ChainsClient({ chains: initialChains, workspaceSlug }: ChainsClientProps) {
  const [chains, setChains] = useState(initialChains);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChains, setSelectedChains] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'simple' | 'advanced'>('all');
  const router = useRouter();
  
  // Detect if a chain is advanced (has non-prompt step types)
  const isAdvancedChain = (chain: Chain) => {
    if (!chain.steps || chain.steps.length === 0) return false;
    return chain.steps.some((step: any) => 
      step.type && ['condition', 'loop', 'switch', 'api_call', 'database', 'code', 'approval', 'webhook'].includes(step.type)
    );
  };

  // Filter chains based on search and type
  const filteredChains = chains.filter(chain => {
    // Filter by type
    if (filterType === 'simple' && isAdvancedChain(chain)) return false;
    if (filterType === 'advanced' && !isAdvancedChain(chain)) return false;
    
    // Filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      chain.name.toLowerCase().includes(query) ||
      chain.description?.toLowerCase().includes(query) ||
      chain.steps?.some((step: any) => 
        step.name?.toLowerCase().includes(query) ||
        step.prompt_name?.toLowerCase().includes(query)
      )
    );
  });

  const handleDelete = async (chainId: string) => {
    if (!confirm('Are you sure you want to delete this chain?')) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('chains')
      .delete()
      .eq('id', chainId);

    if (error) {
      toast.error('Failed to delete chain');
      return;
    }

    setChains(chains.filter(c => c.id !== chainId));
    toast.success('Chain deleted successfully');
  };

  const handleDuplicate = async (chain: Chain) => {
    const supabase = createClient();
    
    const newChain = {
      name: `${chain.name} (Copy)`,
      description: chain.description,
      steps: chain.steps,
      workspace_id: chain.workspace_id,
      documentation: chain.documentation
    };

    const { data, error } = await supabase
      .from('chains')
      .insert(newChain as any)
      .select()
      .single();

    if (error) {
      toast.error('Failed to duplicate chain');
      return;
    }

    if (data) {
      setChains([data, ...chains]);
      toast.success('Chain duplicated successfully');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedChains.size === 0) return;
    if (!confirm(`Delete ${selectedChains.size} chain(s)?`)) return;

    const supabase = createClient();
    const { error } = await supabase
      .from('chains')
      .delete()
      .in('id', Array.from(selectedChains));

    if (error) {
      toast.error('Failed to delete chains');
      return;
    }

    setChains(chains.filter(c => !selectedChains.has(c.id)));
    setSelectedChains(new Set());
    toast.success('Chains deleted successfully');
  };

  const toggleSelection = (chainId: string) => {
    const newSelection = new Set(selectedChains);
    if (newSelection.has(chainId)) {
      newSelection.delete(chainId);
    } else {
      newSelection.add(chainId);
    }
    setSelectedChains(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedChains.size === filteredChains.length) {
      setSelectedChains(new Set());
    } else {
      setSelectedChains(new Set(filteredChains.map(c => c.id)));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                Prompt Chains
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-800 px-2 py-1 rounded">
                  Workflows
                </span>
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create and manage sequential prompt workflows with advanced chaining logic
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Documentation
              </Button>
              <Link href={`/${workspaceSlug}/chains/advanced`}>
                <Button variant="accent">
                  <Settings className="w-4 h-4 mr-2" />
                  Advanced Chain
                </Button>
              </Link>
              <Link href={`/${workspaceSlug}/chains/new`}>
                <Button variant="primaryCta">
                  <Plus className="w-4 h-4 mr-2" />
                  New Chain
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search chains..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-700"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
              <Button
                variant={filterType === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('all')}
                className="px-3"
              >
                All
              </Button>
              <Button
                variant={filterType === 'simple' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('simple')}
                className="px-3"
              >
                <Link2 className="w-3 h-3 mr-1" />
                Simple
              </Button>
              <Button
                variant={filterType === 'advanced' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilterType('advanced')}
                className="px-3"
              >
                <Zap className="w-3 h-3 mr-1" />
                Advanced
              </Button>
            </div>
            {selectedChains.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkDelete}
              >
                Delete ({selectedChains.size})
              </Button>
            )}
          </div>
        </div>

        {/* Chains Table */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-neutral-800/50 border-b border-gray-200 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedChains.size === filteredChains.length && filteredChains.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 dark:border-neutral-600"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Chain Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Steps
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Documentation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-neutral-800">
              {filteredChains.map((chain) => {
                const steps = Array.isArray(chain.steps) ? chain.steps : [];
                const hasDocumentation = chain.documentation && 
                  (chain.documentation.when_to_use || 
                   chain.documentation.expected_output || 
                   chain.documentation.requirements);
                
                return (
                  <tr 
                    key={chain.id}
                    className="hover:bg-gray-50 dark:hover:bg-neutral-800/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedChains.has(chain.id)}
                        onChange={() => toggleSelection(chain.id)}
                        className="rounded border-gray-300 dark:border-neutral-600"
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${workspaceSlug}/chains/${chain.slug}`}
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {chain.name}
                          </Link>
                          {isAdvancedChain(chain) ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded">
                              <Zap className="w-3 h-3 mr-0.5" />
                              Advanced
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 rounded">
                              <Link2 className="w-3 h-3 mr-0.5" />
                              Simple
                            </span>
                          )}
                        </div>
                        {chain.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {chain.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {steps.slice(0, 3).map((step: any, index: number) => (
                          <div key={index} className="flex items-center gap-1">
                            <span className="inline-flex items-center px-2 py-0.5 text-xs bg-gray-100 dark:bg-neutral-800 rounded text-gray-700 dark:text-gray-300">
                              {step.name || `Step ${index + 1}`}
                            </span>
                            {index < Math.min(steps.length - 1, 2) && (
                              <ChevronRight className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        ))}
                        {steps.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{steps.length - 3}
                          </span>
                        )}
                        {steps.length === 0 && (
                          <span className="text-xs text-gray-400">No steps</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {hasDocumentation ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded">
                          <FileText className="w-3 h-3 mr-1" />
                          Documented
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(chain.updated_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/${workspaceSlug}/chains/${chain.slug}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Run Chain"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/${workspaceSlug}/chains/${chain.slug}/edit`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(chain)}
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(chain.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredChains.length === 0 && (
            <div className="text-center py-12">
              <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {searchQuery ? 'No chains found' : 'No chains yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first prompt chain to build sequential workflows.'}
              </p>
              {!searchQuery && (
                <Link href={`/${workspaceSlug}/chains/new`}>
                  <Button variant="primaryCta">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Chain
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {filteredChains.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredChains.length} of {chains.length} chains
          </div>
        )}
      </div>
    </div>
  );
}