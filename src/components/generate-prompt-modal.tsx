'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Plus, Trash2, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface GeneratePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (prompt: GeneratedPromptData) => void;
  workspaceId: string;
}

interface GeneratedPromptData {
  title: string;
  description: string;
  content: string;
  variables: string[];
  tags: string[];
  generationId?: string;
}

interface ApiKeyOption {
  provider: string;
  isDefault: boolean;
}

const PLATFORMS = [
  { value: 'general', label: 'General' },
  { value: 'chatgpt', label: 'ChatGPT' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'llama', label: 'Llama' },
];

const STYLES = [
  { value: 'conversational', label: 'Conversational', icon: '💬' },
  { value: 'instructional', label: 'Instructional', icon: '📚' },
  { value: 'creative', label: 'Creative', icon: '🎨' },
  { value: 'analytical', label: 'Analytical', icon: '📊' },
];

export function GeneratePromptModal({
  isOpen,
  onClose,
  onGenerated,
  workspaceId,
}: GeneratePromptModalProps) {
  const [goal, setGoal] = useState('');
  const [platform, setPlatform] = useState('general');
  const [style, setStyle] = useState('instructional');
  const [variables, setVariables] = useState<string[]>([]);
  const [newVariable, setNewVariable] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [newExample, setNewExample] = useState('');
  const [provider, setProvider] = useState<string>('');
  const [availableProviders, setAvailableProviders] = useState<ApiKeyOption[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPromptData | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [showProviderWarning, setShowProviderWarning] = useState(false);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetchAvailableProviders();
    }
  }, [isOpen, workspaceId]);

  const fetchAvailableProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('workspace_api_keys')
        .select('provider, is_default')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

      if (error) throw error;

      if (data && data.length > 0) {
        setAvailableProviders(data);
        // Set default provider
        const defaultProvider = data.find(p => p.is_default);
        setProvider(defaultProvider?.provider || data[0].provider);
        setShowProviderWarning(false);
      } else {
        setShowProviderWarning(true);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setShowProviderWarning(true);
    }
  };

  const addVariable = () => {
    if (newVariable.trim() && !variables.includes(newVariable.trim())) {
      setVariables([...variables, newVariable.trim()]);
      setNewVariable('');
    }
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const addExample = () => {
    if (newExample.trim()) {
      setExamples([...examples, newExample.trim()]);
      setNewExample('');
    }
  };

  const removeExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const estimateCost = () => {
    // Rough estimate based on average token usage
    const estimatedTokens = (goal.length + variables.join('').length + examples.join('').length) * 2;
    const costPerToken = 0.00003; // Average cost per token
    setEstimatedCost(Math.round(estimatedTokens * costPerToken * 100) / 100);
  };

  useEffect(() => {
    estimateCost();
  }, [goal, variables, examples]);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast.error('Please describe what you want your prompt to do');
      return;
    }

    if (showProviderWarning) {
      toast.error('Please configure API keys in settings first');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          goal,
          platform,
          style,
          variables,
          examples,
          provider: availableProviders.length > 1 ? provider : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate prompt');
      }

      const generated = await response.json();
      
      setGeneratedPrompt({
        title: generated.title,
        description: generated.description,
        content: generated.content,
        variables: generated.variables || [],
        tags: generated.tags || [],
        generationId: generated.generationId,
      });

      // Show cost info
      if (generated.cost) {
        toast.success(`Prompt generated! Cost: $${generated.cost.toFixed(4)}`);
      } else {
        toast.success('Prompt generated successfully!');
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUsePrompt = () => {
    if (generatedPrompt) {
      onGenerated(generatedPrompt);
      handleClose();
    }
  };

  const handleGenerateAnother = () => {
    setGeneratedPrompt(null);
  };

  const handleClose = () => {
    setGoal('');
    setPlatform('general');
    setStyle('instructional');
    setVariables([]);
    setExamples([]);
    setGeneratedPrompt(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            {generatedPrompt ? 'Generated Prompt' : 'Generate Prompt with AI'}
          </DialogTitle>
          <DialogDescription>
            {generatedPrompt
              ? 'Review your generated prompt and use it or generate another one.'
              : 'Describe your needs and let AI create the perfect prompt for you.'}
          </DialogDescription>
        </DialogHeader>

        {showProviderWarning && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-md">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">No API keys configured</p>
              <p className="text-sm mt-1">
                Please add an OpenAI, Anthropic, or Google API key in your workspace settings to use this feature.
              </p>
            </div>
          </div>
        )}

        {!generatedPrompt ? (
          <div className="space-y-6">
            {/* Goal Input */}
            <div className="space-y-2">
              <Label htmlFor="goal">What do you want your prompt to do?</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Describe the purpose and goal of your prompt. Be specific about what you want to achieve..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label htmlFor="platform">Target Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Provider Selection (if multiple available) */}
              {availableProviders.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableProviders.map((p) => (
                        <SelectItem key={p.provider} value={p.provider}>
                          {p.provider.charAt(0).toUpperCase() + p.provider.slice(1)}
                          {p.isDefault && ' (Default)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div className="space-y-2">
              <Label>Style</Label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      style === s.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="text-xl">{s.icon}</span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Variables */}
            <div className="space-y-2">
              <Label>Variables (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  placeholder="Add a variable name..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addVariable())}
                />
                <Button onClick={addVariable} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {variables.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full"
                    >
                      <span className="text-sm">{`{{${variable}}}`}</span>
                      <button
                        onClick={() => removeVariable(index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Example Outputs */}
            <div className="space-y-2">
              <Label>Example Outputs (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Add an example of desired output..."
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addExample())}
                />
                <Button onClick={addExample} size="icon" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {examples.length > 0 && (
                <div className="space-y-2 mt-2">
                  {examples.map((example, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded"
                    >
                      <span className="text-sm flex-1">{example}</span>
                      <button
                        onClick={() => removeExample(index)}
                        className="text-gray-500 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost Estimate */}
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Estimated cost: ~${estimatedCost.toFixed(4)}</span>
              <span>This will use your {provider || 'default'} API key</span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !goal.trim() || showProviderWarning}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Prompt
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Generated Prompt Display */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Generated Title</h3>
                <p className="text-lg">{generatedPrompt.title}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-gray-600 dark:text-gray-400">{generatedPrompt.description}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Prompt Content</h3>
                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <pre className="whitespace-pre-wrap font-mono text-sm">{generatedPrompt.content}</pre>
                </div>
              </div>

              {generatedPrompt.variables.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Variables</h3>
                  <div className="flex flex-wrap gap-2">
                    {generatedPrompt.variables.map((variable, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                      >
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {generatedPrompt.tags.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {generatedPrompt.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleGenerateAnother}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Another
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleUsePrompt}>
                  Use This Prompt
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}