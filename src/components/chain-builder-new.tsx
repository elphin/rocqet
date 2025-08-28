'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Save, 
  Play,
  ChevronRight,
  ChevronDown,
  Settings,
  X,
  ArrowDown,
  FileText,
  Search,
  Link2,
  AlertCircle,
  Info,
  Copy,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast-config';
import { PromptSearchModal } from './prompt-search-modal';
import { SlugEditModal } from '@/components/modals/slug-edit-modal';

interface ChainStep {
  id: string;
  promptId: string;
  promptName?: string;
  name: string;
  description?: string;
  overrideModel?: boolean; // Whether to override the prompt's default model
  provider?: string;
  model?: string;
  variableMapping: Record<string, any>;
  useOutputAsInput: boolean; // Whether to use previous step output as input
  outputVariable?: string; // Name of the variable to store output in
}

interface ChainDocumentation {
  when_to_use?: string;
  expected_output?: string;
  requirements?: string;
  examples?: string;
}

interface ChainBuilderProps {
  workspaceId: string;
  workspaceSlug: string;
  availablePrompts: Array<{
    id: string;
    name: string;
    description: string | null;
    model?: string;
    variables: any;
    content?: string;
  }>;
  mode: 'create' | 'edit';
  existingChain?: any;
}

// Comprehensive list of AI providers and their models (updated December 2024)
const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4-turbo-preview',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-instruct',
      'text-davinci-003',
      'text-davinci-002'
    ]
  },
  anthropic: {
    name: 'Anthropic',
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2'
    ]
  },
  google: {
    name: 'Google AI',
    models: [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
      'palm-2',
      'text-bison-001',
      'chat-bison-001'
    ]
  },
  mistral: {
    name: 'Mistral',
    models: [
      'mistral-large-latest',
      'mistral-large-2402',
      'mistral-medium-latest',
      'mistral-medium-2312',
      'mistral-small-latest',
      'mistral-small-2402',
      'mistral-tiny-latest',
      'mistral-embed'
    ]
  },
  cohere: {
    name: 'Cohere',
    models: [
      'command',
      'command-light',
      'command-nightly',
      'command-r',
      'command-r-plus',
      'embed-english-v3.0',
      'embed-multilingual-v3.0'
    ]
  },
  huggingface: {
    name: 'Hugging Face',
    models: [
      'meta-llama/Llama-2-70b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'meta-llama/Llama-2-7b-chat-hf',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'mistralai/Mistral-7B-Instruct-v0.2',
      'tiiuae/falcon-180B-chat',
      'HuggingFaceH4/zephyr-7b-beta'
    ]
  }
};

export function ChainBuilderNew({
  workspaceId,
  workspaceSlug,
  availablePrompts,
  mode,
  existingChain
}: ChainBuilderProps) {
  const router = useRouter();
  const [name, setName] = useState(existingChain?.name || '');
  const [slug, setSlug] = useState(existingChain?.slug || '');
  const [description, setDescription] = useState(existingChain?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>(
    existingChain?.steps || []
  );
  const [documentation, setDocumentation] = useState<ChainDocumentation>(
    existingChain?.documentation || {}
  );
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchingForStep, setSearchingForStep] = useState<string | null>(null);
  const [configuredProviders, setConfiguredProviders] = useState<string[]>([]);
  const [showDocumentation, setShowDocumentation] = useState(false);
  const [showSlugModal, setShowSlugModal] = useState(false);

  // Load configured API providers
  useEffect(() => {
    const loadProviders = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('workspace_ai_keys')
        .select('provider')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

      if (data) {
        setConfiguredProviders(data.map(d => d.provider));
      }
    };

    loadProviders();
  }, [workspaceId]);

  const addStep = () => {
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      promptId: '',
      name: `Step ${steps.length + 1}`,
      variableMapping: {},
      useOutputAsInput: steps.length > 0, // Default to true if not first step
      provider: configuredProviders[0] || 'openai',
      model: AI_PROVIDERS[configuredProviders[0] as keyof typeof AI_PROVIDERS]?.models[0] || 'gpt-3.5-turbo'
    };
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
    if (expandedStep === stepId) {
      setExpandedStep(null);
    }
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < steps.length) {
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      setSteps(newSteps);
    }
  };

  const duplicateStep = (step: ChainStep) => {
    const newStep = {
      ...step,
      id: `step_${Date.now()}`,
      name: `${step.name} (Copy)`
    };
    const index = steps.findIndex(s => s.id === step.id);
    const newSteps = [...steps];
    newSteps.splice(index + 1, 0, newStep);
    setSteps(newSteps);
  };

  const openPromptSearch = (stepId: string) => {
    setSearchingForStep(stepId);
    setSearchModalOpen(true);
  };

  const handlePromptSelect = (prompt: any) => {
    if (searchingForStep) {
      updateStep(searchingForStep, {
        promptId: prompt.id,
        promptName: prompt.name,
        description: prompt.description
      });
    }
    setSearchModalOpen(false);
    setSearchingForStep(null);
  };

  const saveChain = async () => {
    if (!name.trim()) {
      toast.error('Please enter a chain name');
      return;
    }

    if (!slug.trim() && mode === 'edit') {
      toast.error('Please enter a chain slug');
      return;
    }

    if (steps.length === 0) {
      toast.error('Please add at least one step');
      return;
    }

    if (steps.some(step => !step.promptId)) {
      toast.error('Please select a prompt for each step');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to save a chain');
        return;
      }

      // Generate or format slug
      const generateSlug = (text: string): string => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
          .replace(/\s+/g, '-')          // Replace spaces with hyphens
          .replace(/-+/g, '-')           // Replace multiple hyphens with single
          .replace(/^-|-$/g, '');        // Remove leading/trailing hyphens
      };
      
      let finalSlug: string;
      
      if (mode === 'edit' && slug.trim()) {
        // Use user-provided slug in edit mode, but format it
        finalSlug = generateSlug(slug.trim());
        
        // Check if slug is unique (only if changed)
        if (finalSlug !== existingChain?.slug) {
          const { data: existingChain } = await supabase
            .from('chains')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('slug', finalSlug)
            .single();
          
          if (existingChain) {
            toast.error('A chain with this slug already exists. Please choose a different slug.');
            setSaving(false);
            return;
          }
        }
      } else {
        // Generate slug from name for new chains
        finalSlug = generateSlug(name.trim());
        
        // For new chains, check if slug already exists and append number if needed
        if (mode === 'create') {
          const { data: existingChains } = await supabase
            .from('chains')
            .select('slug')
            .eq('workspace_id', workspaceId)
            .like('slug', `${finalSlug}%`);
          
          if (existingChains && existingChains.length > 0) {
            const slugs = existingChains.map(c => c.slug);
            let counter = 1;
            let newSlug = finalSlug;
            while (slugs.includes(newSlug)) {
              counter++;
              newSlug = `${finalSlug}-${counter}`;
            }
            finalSlug = newSlug;
          }
        }
      }
      
      // Format steps for the new chains table structure
      const formattedSteps = steps.map((step, index) => ({
        id: step.id || `step-${index}`,
        type: 'prompt',
        name: step.prompt_name || step.name || `Step ${index + 1}`,
        config: {
          promptId: step.prompt_id,
          promptName: step.prompt_name,
          provider: step.provider
        },
        position: index
      }));
      
      const chainData: any = {
        workspace_id: workspaceId,
        slug: finalSlug,
        name: name.trim(),
        description: description.trim() || null,
        steps: formattedSteps,
        trigger: 'manual',
        active: true,
        created_by: mode === 'create' ? user.id : undefined,
        updated_by: user.id
      };

      if (mode === 'edit' && existingChain?.id) {
        const { error } = await supabase
          .from('chains')
          .update(chainData)
          .eq('id', existingChain.id);

        if (error) throw error;
        toast.success('Chain updated successfully');
      } else {
        const { error } = await supabase
          .from('chains')
          .insert(chainData);

        if (error) throw error;
        toast.success('Chain created successfully');
      }

      router.push(`/${workspaceSlug}/chains`);
    } catch (error: any) {
      console.error('Error saving chain:', error);
      toast.error(error.message || 'Failed to save chain');
    } finally {
      setSaving(false);
    }
  };

  const handleSlugSave = async (newSlug: string) => {
    const formattedSlug = newSlug
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug is unique (only if changed)
    if (formattedSlug !== existingChain?.slug) {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('chains')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('slug', formattedSlug)
        .single();

      if (existing) {
        throw new Error('A chain with this slug already exists');
      }
    }

    setSlug(formattedSlug);
  };

  const testChain = () => {
    // Navigate to test/run page
    if (mode === 'edit' && existingChain?.id) {
      router.push(`/${workspaceSlug}/chains/${existingChain.id}/run`);
    } else {
      toast.info('Save the chain first to test it');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {mode === 'edit' ? 'Edit Chain' : 'Create New Chain'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Build sequential workflows by chaining prompts together
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={testChain}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
            <Button
              onClick={saveChain}
              disabled={saving}
              variant="primaryCta"
              size="sm"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Chain'}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chain Name *
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Content Generation Pipeline"
                className="bg-gray-50 dark:bg-neutral-800"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this chain does..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* URL Section - Only in edit mode */}
          {mode === 'edit' && (
            <div className="md:col-span-1">
              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3 border border-gray-200 dark:border-neutral-700">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URL
                </label>
                <div className="space-y-2">
                  <div className="flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-neutral-900 rounded border border-gray-200 dark:border-neutral-700">
                    <Link2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <code className="text-xs text-blue-600 dark:text-blue-400 truncate">
                      /{workspaceSlug}/chains/{slug || 'your-slug'}
                    </code>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSlugModal(true)}
                      className="h-7 flex-1 text-xs"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/${workspaceSlug}/chains/${slug}`);
                        toast.success('URL copied');
                      }}
                      className="h-7 px-2"
                      title="Copy URL"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documentation Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800">
        <button
          onClick={() => setShowDocumentation(!showDocumentation)}
          className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-gray-100">
              Documentation
            </span>
            {(documentation.when_to_use || documentation.expected_output || documentation.requirements) && (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            )}
          </div>
          {showDocumentation ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showDocumentation && (
          <div className="p-6 pt-0 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                When to Use
              </label>
              <textarea
                value={documentation.when_to_use || ''}
                onChange={(e) => setDocumentation({...documentation, when_to_use: e.target.value})}
                placeholder="Describe when this chain should be used..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expected Output
              </label>
              <textarea
                value={documentation.expected_output || ''}
                onChange={(e) => setDocumentation({...documentation, expected_output: e.target.value})}
                placeholder="Describe what output this chain produces..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Requirements
              </label>
              <textarea
                value={documentation.requirements || ''}
                onChange={(e) => setDocumentation({...documentation, requirements: e.target.value})}
                placeholder="List any requirements or prerequisites..."
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Examples
              </label>
              <textarea
                value={documentation.examples || ''}
                onChange={(e) => setDocumentation({...documentation, examples: e.target.value})}
                placeholder="Provide examples of input/output..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-gray-50 dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Chain Steps */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Chain Steps
          </h2>
          {steps.length > 0 && (
            <Button
              onClick={addStep}
              variant="primaryCta"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          )}
        </div>

        {steps.length === 0 ? (
          <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-8 text-center">
            <Link2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No steps added yet. Add your first step to start building the chain.
            </p>
            <Button
              onClick={addStep}
              variant="primaryCta"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Step
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-800 overflow-hidden"
              >
                {/* Step Header */}
                <div className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveStep(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          Step {index + 1}
                        </span>
                        {index > 0 && step.useOutputAsInput && (
                          <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                            <Link2 className="w-3 h-3" />
                            Chained
                          </span>
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {step.promptName || 'Select a prompt'}
                        </p>
                        {step.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {step.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => duplicateStep(step)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                        title="Duplicate step"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded"
                      >
                        {expandedStep === step.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <Settings className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => removeStep(step.id)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Connection Line */}
                  {index < steps.length - 1 && (
                    <div className="flex items-center justify-center mt-4">
                      <ArrowDown className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Expanded Step Configuration */}
                {expandedStep === step.id && (
                  <div className="border-t border-gray-200 dark:border-neutral-800 p-4 bg-gray-50 dark:bg-neutral-800/50 space-y-4">
                    {/* Get the selected prompt for this step */}
                    {(() => {
                      const selectedPrompt = availablePrompts.find(p => p.id === step.promptId);
                      
                      return (
                        <>
                          {/* Prompt Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Select Prompt
                            </label>
                            <Button
                              onClick={() => openPromptSearch(step.id)}
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                            >
                              <Search className="w-4 h-4 mr-2" />
                              {step.promptName || 'Search and select a prompt...'}
                            </Button>
                          </div>

                          {/* Model Settings */}
                          <div className="space-y-3">
                            {/* Show prompt's default model with override option */}
                            {selectedPrompt && (
                              <div className="bg-gray-50 dark:bg-neutral-800 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Info className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      Uses prompt's default model: <span className="font-medium text-gray-700 dark:text-gray-300">{selectedPrompt.model || 'gpt-4'}</span>
                                    </span>
                                  </div>
                                  
                                  {/* Minimal override toggle */}
                                  <div className="group relative">
                                    <button
                                      onClick={() => {
                                        const newOverride = !step.overrideModel;
                                        updateStep(step.id, { 
                                          overrideModel: newOverride,
                                          // If unchecking, clear provider/model
                                          ...(newOverride ? {} : { provider: undefined, model: undefined })
                                        });
                                      }}
                                      className={`p-1.5 rounded-lg transition-all ${
                                        step.overrideModel 
                                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' 
                                          : 'hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-400 dark:text-gray-500'
                                      }`}
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                    
                                    {/* Tooltip */}
                                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 w-48">
                                      <div className="bg-neutral-900 dark:bg-neutral-800 text-white text-xs rounded-lg p-2 shadow-lg">
                                        <p className="leading-relaxed">
                                          {step.overrideModel ? 'Using custom model settings' : 'Override prompt\'s default model'}
                                        </p>
                                        <div className="absolute right-3 top-full">
                                          <div className="border-4 border-transparent border-t-neutral-900 dark:border-t-neutral-800"></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Show provider/model selection only when override is enabled */}
                            {step.overrideModel && (
                        <div className="space-y-3 pl-6 border-l-2 border-amber-200 dark:border-amber-800">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Overriding the model may affect prompt performance. The prompt was optimized for its default model.
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                AI Provider
                              </label>
                              <select
                                value={step.provider || 'openai'}
                                onChange={(e) => updateStep(step.id, { 
                                  provider: e.target.value,
                                  model: AI_PROVIDERS[e.target.value as keyof typeof AI_PROVIDERS].models[0]
                                })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                              >
                                {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                                  <option 
                                    key={key} 
                                    value={key}
                                    disabled={!configuredProviders.includes(key)}
                                  >
                                    {provider.name} {!configuredProviders.includes(key) && '(No API key)'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <select
                                value={step.model || ''}
                                onChange={(e) => updateStep(step.id, { model: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                              >
                                {step.provider && AI_PROVIDERS[step.provider as keyof typeof AI_PROVIDERS]?.models.map(model => (
                                  <option key={model} value={model}>
                                    {model}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Chaining Configuration */}
                    {index > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div className="flex-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={step.useOutputAsInput}
                                onChange={(e) => updateStep(step.id, { useOutputAsInput: e.target.checked })}
                                className="rounded border-gray-300 dark:border-neutral-600 text-blue-600"
                              />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Use previous step output as input
                              </span>
                            </label>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              When enabled, the output from Step {index} will be automatically passed as input to this step.
                              This creates a chain where each step builds on the previous one.
                            </p>
                          </div>
                        </div>

                        {step.useOutputAsInput && (
                          <div className="mt-3">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Output Variable Name (optional)
                            </label>
                            <Input
                              value={step.outputVariable || ''}
                              onChange={(e) => updateStep(step.id, { outputVariable: e.target.value })}
                              placeholder="e.g., previous_output"
                              className="text-sm"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Name the variable to reference the previous output in your prompt.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Step Name (optional)
                      </label>
                      <Input
                        value={step.name}
                        onChange={(e) => updateStep(step.id, { name: e.target.value })}
                        placeholder={`Step ${index + 1}`}
                      />
                    </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chaining Info */}
        {steps.length > 1 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  About Chain Output Flow
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  By default, each step can use the output from the previous step as input. 
                  This creates a pipeline where data flows through each prompt sequentially. 
                  You can disable this for any step to use only the original input instead.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Search Modal */}
      <PromptSearchModal
        isOpen={searchModalOpen}
        onClose={() => {
          setSearchModalOpen(false);
          setSearchingForStep(null);
        }}
        onSelect={handlePromptSelect}
        workspaceId={workspaceId}
      />

      {/* Slug Edit Modal */}
      {mode === 'edit' && (
        <SlugEditModal
          isOpen={showSlugModal}
          onClose={() => setShowSlugModal(false)}
          currentSlug={slug}
          title={name}
          workspaceSlug={workspaceSlug}
          type="chain"
          onSave={handleSlugSave}
        />
      )}
    </div>
  );
}