'use client';

import React, { useState, useRef } from 'react';
import { nanoid } from 'nanoid';
import { 
  Plus, Trash2, GripVertical, Save, Play, Settings, X, Search,
  FileJson, Globe, Database, Code, Users, Webhook, GitBranch,
  Edit2, ChevronRight, Sparkles, Check, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ChainStep {
  id: string;
  type: string;
  name: string;
  promptId?: string;
  promptName?: string;
  outputVariable?: string;
  config?: any;
  description?: string;
  isNew?: boolean;
  isConfiguring?: boolean;
}

interface ChainBuilderSmoothProps {
  workspaceId: string;
  workspaceSlug: string;
  availablePrompts?: any[];
  availableQueries?: any[];
  availableConnections?: any[];
  mode: 'create' | 'edit';
  existingChain?: any;
}

const STEP_TYPES = [
  { value: 'prompt', label: 'Prompt', icon: FileJson },
  { value: 'api_call', label: 'API Call', icon: Globe },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
  { value: 'condition', label: 'Condition', icon: GitBranch },
  { value: 'code', label: 'Code', icon: Code },
];

export default function ChainBuilderSmooth({
  workspaceId,
  workspaceSlug,
  availablePrompts = [],
  mode,
  existingChain
}: ChainBuilderSmoothProps) {
  const router = useRouter();
  const [chainName, setChainName] = useState(existingChain?.name || '');
  const [description, setDescription] = useState(existingChain?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>(existingChain?.steps || []);
  const [draggedItem, setDraggedItem] = useState<ChainStep | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, step: ChainStep) => {
    setDraggedItem(step);
    e.dataTransfer.effectAllowed = 'move';
    // Make the dragged element semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (!draggedItem) return;
    
    const draggedIndex = steps.findIndex(s => s.id === draggedItem.id);
    
    // Get the mouse position relative to the card
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // If dragging over own position, don't show indicator
    if (draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    
    // Determine if we should show indicator above or below this card
    if (y < height / 2) {
      // Mouse is in top half - show indicator above this card
      setDragOverIndex(index);
    } else {
      // Mouse is in bottom half - show indicator below this card
      setDragOverIndex(index + 1);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedItem || dragOverIndex === null) return;
    
    const draggedIndex = steps.findIndex(s => s.id === draggedItem.id);
    const newSteps = [...steps];
    
    // Remove dragged item
    newSteps.splice(draggedIndex, 1);
    
    // Insert at new position
    let insertIndex = dragOverIndex;
    if (draggedIndex < dragOverIndex) {
      insertIndex = dragOverIndex - 1;
    }
    
    newSteps.splice(insertIndex, 0, draggedItem);
    setSteps(newSteps);
    
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const addStep = (type: string) => {
    const newStep: ChainStep = {
      id: nanoid(),
      type,
      name: `New ${type} step`,
      outputVariable: `step${steps.length + 1}Output`,
      isConfiguring: true
    };
    setSteps([...steps, newStep]);
  };

  const deleteStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  const updateStep = (id: string, updates: Partial<ChainStep>) => {
    setSteps(steps.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const saveChain = async () => {
    if (!chainName) {
      toast.error('Please enter a chain name');
      return;
    }

    try {
      const response = await fetch('/api/chains', {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: existingChain?.id,
          name: chainName,
          description,
          steps,
          workspace_id: workspaceId
        })
      });

      if (response.ok) {
        toast.success(`Chain ${mode === 'create' ? 'created' : 'updated'} successfully`);
        router.push(`/${workspaceSlug}/chains`);
      }
    } catch (error) {
      toast.error('Failed to save chain');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <Input
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="Chain name..."
              className="text-lg font-semibold mb-2"
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description (optional)..."
              className="text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveChain}>
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
            <Button variant="outline">
              <Play className="w-4 h-4 mr-2" />
              Test
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8 max-w-4xl mx-auto">
        {/* Steps List */}
        <div className="space-y-4 mb-8">
          {steps.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-neutral-900 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700">
              <Sparkles className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No steps yet</h3>
              <p className="text-neutral-500 mb-6">Add your first step to get started</p>
            </div>
          ) : (
            steps.map((step, index) => (
              <div
                key={step.id}
                className="relative"
              >
                {/* Drop Indicator - Show ABOVE this card */}
                {dragOverIndex === index && draggedItem && steps.findIndex(s => s.id === draggedItem.id) !== index && (
                  <div className="h-1 bg-blue-500 rounded-full animate-pulse mb-2" />
                )}

                {/* Step Card */}
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, step)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={cn(
                  "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800",
                  "rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow",
                  "group cursor-move"
                )}>
                  <div className="flex items-center gap-3">
                    {/* Drag Handle */}
                    <div className="opacity-40 hover:opacity-100 transition-opacity">
                      <GripVertical className="w-5 h-5 text-neutral-500" />
                    </div>

                    {/* Step Icon & Info */}
                    <div className="flex-1 flex items-center gap-3">
                      {(() => {
                        const stepType = STEP_TYPES.find(t => t.value === step.type);
                        const Icon = stepType?.icon || Settings;
                        return (
                          <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                            <Icon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
                          </div>
                        );
                      })()}
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{step.name}</h3>
                        <p className="text-sm text-neutral-500">
                          {step.type.charAt(0).toUpperCase() + step.type.slice(1).replace('_', ' ')}
                        </p>
                      </div>

                      {step.outputVariable && (
                        <div className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                          → {step.outputVariable}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateStep(step.id, { isConfiguring: true })}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => deleteStep(step.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Configuration Panel */}
                  {step.isConfiguring && (
                    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div className="space-y-4">
                        {step.type === 'prompt' && (
                          <>
                            <div>
                              <Label>Select Prompt</Label>
                              <select
                                className="w-full mt-2 px-3 py-2 border rounded-lg"
                                value={step.promptId || ''}
                                onChange={(e) => {
                                  const prompt = availablePrompts.find(p => p.id === e.target.value);
                                  updateStep(step.id, {
                                    promptId: e.target.value,
                                    promptName: prompt?.name
                                  });
                                }}
                              >
                                <option value="">Select a prompt...</option>
                                {availablePrompts.map(prompt => (
                                  <option key={prompt.id} value={prompt.id}>
                                    {prompt.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label>Output Variable</Label>
                              <Input
                                placeholder="e.g., promptResult"
                                value={step.outputVariable || ''}
                                onChange={(e) => updateStep(step.id, { outputVariable: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateStep(step.id, { isConfiguring: false })}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Done
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStep(step.id, { isConfiguring: false })}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Drop Indicator - Show BELOW this card (for last item) */}
                {dragOverIndex === index + 1 && draggedItem && steps.findIndex(s => s.id === draggedItem.id) !== index && (
                  <div className="h-1 bg-blue-500 rounded-full animate-pulse mt-2" />
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Step Buttons */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 border border-neutral-200 dark:border-neutral-800">
          <h3 className="text-sm font-medium mb-3">Add Step</h3>
          <div className="grid grid-cols-3 gap-2">
            {STEP_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  onClick={() => addStep(type.value)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}