'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Plus,
  Trash2,
  GripVertical,
  Save,
  Play,
  Settings,
  X,
  ArrowDown,
  GitBranch,
  Database,
  Globe,
  Code,
  Users,
  Webhook,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  Info,
  Copy,
  RefreshCw,
  Zap,
  FileJson,
  Filter,
  Hash,
  Type,
  ToggleLeft,
  ArrowRight,
  GitMerge,
  Repeat,
  Edit2,
  Search
} from 'lucide-react';
import {
  ChainStep,
  StepType,
  ConditionalConfig,
  SwitchConfig,
  LoopConfig,
  ApiCallConfig,
  DatabaseQueryConfig,
  CodeExecutionConfig,
  TransformationConfig,
  HumanApprovalConfig,
  WebhookConfig,
  RetryConfig,
  ErrorHandling,
  validateStep
} from '@/types/chain-types';
import { toast } from '@/lib/toast-config';
import { PromptSearchModal } from './prompt-search-modal';

const STEP_TYPES: Array<{
  value: StepType;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: string;
}> = [
  {
    value: 'prompt',
    label: 'Prompt',
    icon: <FileJson className="w-4 h-4" />,
    description: 'Execute an AI prompt',
    category: 'Core'
  },
  {
    value: 'condition',
    label: 'If/Then/Else',
    icon: <GitBranch className="w-4 h-4" />,
    description: 'Conditional branching logic',
    category: 'Logic'
  },
  {
    value: 'switch',
    label: 'Switch/Case',
    icon: <GitMerge className="w-4 h-4" />,
    description: 'Multi-way branching',
    category: 'Logic'
  },
  {
    value: 'loop',
    label: 'Loop',
    icon: <Repeat className="w-4 h-4" />,
    description: 'Iterate over items or conditions',
    category: 'Logic'
  },
  {
    value: 'api_call',
    label: 'API Call',
    icon: <Globe className="w-4 h-4" />,
    description: 'Call external API',
    category: 'External'
  },
  {
    value: 'database_query',
    label: 'Database Query',
    icon: <Database className="w-4 h-4" />,
    description: 'Query database',
    category: 'External'
  },
  {
    value: 'code_execution',
    label: 'Code',
    icon: <Code className="w-4 h-4" />,
    description: 'Execute custom code',
    category: 'Advanced'
  },
  {
    value: 'transformation',
    label: 'Transform',
    icon: <Zap className="w-4 h-4" />,
    description: 'Transform data',
    category: 'Data'
  },
  {
    value: 'human_approval',
    label: 'Human Approval',
    icon: <Users className="w-4 h-4" />,
    description: 'Require human approval',
    category: 'Control'
  },
  {
    value: 'webhook',
    label: 'Webhook',
    icon: <Webhook className="w-4 h-4" />,
    description: 'Send webhook',
    category: 'External'
  },
  {
    value: 'wait',
    label: 'Wait',
    icon: <Clock className="w-4 h-4" />,
    description: 'Wait/delay execution',
    category: 'Control'
  },
  {
    value: 'parallel_group',
    label: 'Parallel Group',
    icon: <Layers className="w-4 h-4" />,
    description: 'Execute steps in parallel',
    category: 'Control'
  }
];

const OPERATORS = [
  { value: 'eq', label: 'Equals (==)' },
  { value: 'neq', label: 'Not Equals (!=)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater Than or Equal (>=)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less Than or Equal (<=)' },
  { value: 'contains', label: 'Contains' },
  { value: 'matches', label: 'Matches (Regex)' },
];

const TRANSFORM_TYPES = [
  { value: 'json_parse', label: 'JSON Parse' },
  { value: 'json_stringify', label: 'JSON Stringify' },
  { value: 'filter', label: 'Filter Array' },
  { value: 'map', label: 'Map Array' },
  { value: 'reduce', label: 'Reduce Array' },
  { value: 'sort', label: 'Sort Array' },
  { value: 'group_by', label: 'Group By' },
  { value: 'join', label: 'Join Array' },
  { value: 'split', label: 'Split String' },
  { value: 'regex_extract', label: 'Regex Extract' },
  { value: 'format', label: 'Format String' },
  { value: 'calculate', label: 'Calculate' },
  { value: 'custom', label: 'Custom Function' },
];

interface ChainBuilderAdvancedProps {
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
  onSave?: (chain: any) => void;
}

export function ChainBuilderAdvanced({
  workspaceId,
  workspaceSlug,
  availablePrompts,
  mode,
  existingChain,
  onSave
}: ChainBuilderAdvancedProps) {
  const [chainName, setChainName] = useState(existingChain?.name || '');
  const [chainDescription, setChainDescription] = useState(existingChain?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>([]);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [promptSearchOpen, setPromptSearchOpen] = useState(false);
  const [promptSearchStepId, setPromptSearchStepId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  
  // Edit mode state for step configuration
  const [editingStep, setEditingStep] = useState<ChainStep | null>(null);
  const [isNewStep, setIsNewStep] = useState(false);

  useEffect(() => {
    if (existingChain?.steps) {
      setSteps(existingChain.steps);
    }
  }, [existingChain]);

  const addStep = (type: StepType) => {
    const newStep: ChainStep = {
      id: `step_${Date.now()}`,
      name: `New ${type} Step`,
      type,
      enabled: true,
      inputMapping: {},
      errorHandling: { onError: 'stop' }
    };

    // Set defaults based on type
    switch (type) {
      case 'condition':
        newStep.conditionalConfig = {
          condition: {
            type: 'comparison',
            left: '',
            operator: 'eq',
            right: ''
          },
          then: [],
          else: []
        };
        break;
      case 'switch':
        newStep.switchConfig = {
          variable: '',
          cases: [],
          default: []
        };
        break;
      case 'loop':
        newStep.loopConfig = {
          type: 'for_each',
          items: '',
          itemVariable: 'item',
          indexVariable: 'index',
          steps: []
        };
        break;
      case 'api_call':
        newStep.apiCallConfig = {
          method: 'GET',
          url: '',
          responseType: 'json'
        };
        break;
      case 'transformation':
        newStep.transformConfig = {
          type: 'json_parse',
          input: '',
          output: ''
        };
        break;
    }

    // Don't add to steps yet - put in edit mode first
    setEditingStep(newStep);
    setIsNewStep(true);
    setSelectedStep(newStep.id);
    setExpandedSteps(new Set([...expandedSteps, newStep.id]));
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    // If we're in edit mode, update the editing step
    if (editingStep && editingStep.id === stepId) {
      setEditingStep({ ...editingStep, ...updates });
    } else {
      // Otherwise update the actual step
      setSteps(steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      ));
      
      // Validate the updated step
      const step = steps.find(s => s.id === stepId);
      if (step) {
        const updatedStep = { ...step, ...updates };
        const validation = validateStep(updatedStep);
        setValidationErrors(prev => ({
          ...prev,
          [stepId]: validation.errors
        }));
      }
    }
  };
  
  // Start editing an existing step
  const startEditingStep = (stepId: string) => {
    const step = steps.find(s => s.id === stepId);
    if (step) {
      setEditingStep({ ...step }); // Create a copy
      setIsNewStep(false);
      setSelectedStep(stepId);
    }
  };
  
  // Save the edited step
  const saveEditingStep = () => {
    if (!editingStep) return;
    
    // Validate before saving
    const validation = validateStep(editingStep);
    if (!validation.valid) {
      setValidationErrors(prev => ({
        ...prev,
        [editingStep.id]: validation.errors
      }));
      toast.error('Please fix validation errors before saving');
      return;
    }
    
    if (isNewStep) {
      // Add new step to the list
      setSteps([...steps, editingStep]);
    } else {
      // Update existing step
      setSteps(steps.map(step => 
        step.id === editingStep.id ? editingStep : step
      ));
    }
    
    // Clear validation errors for this step
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[editingStep.id];
      return newErrors;
    });
    
    // Exit edit mode
    setEditingStep(null);
    setIsNewStep(false);
  };
  
  // Cancel editing
  const cancelEditingStep = () => {
    if (editingStep) {
      // Clear validation errors for this step
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[editingStep.id];
        return newErrors;
      });
      
      // If it was a new step that wasn't saved yet, deselect it
      if (isNewStep) {
        setSelectedStep(null);
      } else {
        // For existing steps being edited, restore the original values
        // by simply clearing the edit mode (the original is still in steps array)
        // No need to remove anything
      }
    }
    
    setEditingStep(null);
    setIsNewStep(false);
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
    if (selectedStep === stepId) {
      setSelectedStep(null);
    }
  };

  const toggleStepExpanded = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < steps.length) {
      [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
      setSteps(newSteps);
    }
  };

  const renderStepIcon = (type: StepType) => {
    const stepType = STEP_TYPES.find(st => st.value === type);
    return stepType?.icon || <Settings className="w-4 h-4" />;
  };

  const renderStepContent = (step: ChainStep, disabled: boolean = false) => {
    switch (step.type) {
      case 'prompt':
        return (
          <div className="space-y-4">
            <div>
              <Label>Select Prompt</Label>
              <div className="flex gap-2">
                <Select
                  value={step.promptId || ''}
                  onValueChange={(value) => updateStep(step.id, { promptId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prompt" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrompts.map(prompt => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPromptSearchStepId(step.id);
                    setPromptSearchOpen(true);
                  }}
                >
                  Search
                </Button>
              </div>
            </div>
            
            <div>
              <Label>Output Variable</Label>
              <Input
                placeholder="e.g., promptResult"
                value={step.outputVariable || ''}
                onChange={(e) => updateStep(step.id, { outputVariable: e.target.value })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Store the prompt output in this variable
              </p>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label>Condition Type</Label>
              <Select
                value={step.conditionalConfig?.condition.type || 'comparison'}
                onValueChange={(value) => updateStep(step.id, {
                  conditionalConfig: {
                    ...step.conditionalConfig!,
                    condition: {
                      ...step.conditionalConfig!.condition,
                      type: value as any
                    }
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="exists">Variable Exists</SelectItem>
                  <SelectItem value="regex">Regex Match</SelectItem>
                  <SelectItem value="expression">Custom Expression</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {step.conditionalConfig?.condition.type === 'comparison' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Left Value</Label>
                  <Input
                    placeholder="{{variable}} or value"
                    value={step.conditionalConfig?.condition.left || ''}
                    onChange={(e) => updateStep(step.id, {
                      conditionalConfig: {
                        ...step.conditionalConfig!,
                        condition: {
                          ...step.conditionalConfig!.condition,
                          left: e.target.value
                        }
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Operator</Label>
                  <Select
                    value={step.conditionalConfig?.condition.operator || 'eq'}
                    onValueChange={(value) => updateStep(step.id, {
                      conditionalConfig: {
                        ...step.conditionalConfig!,
                        condition: {
                          ...step.conditionalConfig!.condition,
                          operator: value as any
                        }
                      }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Right Value</Label>
                  <Input
                    placeholder="{{variable}} or value"
                    value={step.conditionalConfig?.condition.right || ''}
                    onChange={(e) => updateStep(step.id, {
                      conditionalConfig: {
                        ...step.conditionalConfig!,
                        condition: {
                          ...step.conditionalConfig!.condition,
                          right: e.target.value
                        }
                      }
                    })}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Then Branch (if true)</Label>
                <div className="text-xs text-muted-foreground">
                  Select steps to execute if condition is true
                </div>
              </div>
              <div>
                <Label>Else Branch (if false)</Label>
                <div className="text-xs text-muted-foreground">
                  Select steps to execute if condition is false
                </div>
              </div>
            </div>
          </div>
        );

      case 'loop':
        return (
          <div className="space-y-4">
            <div>
              <Label>Loop Type</Label>
              <Select
                value={step.loopConfig?.type || 'for_each'}
                onValueChange={(value) => updateStep(step.id, {
                  loopConfig: {
                    ...step.loopConfig!,
                    type: value as any
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_each">For Each</SelectItem>
                  <SelectItem value="while">While</SelectItem>
                  <SelectItem value="for_range">For Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {step.loopConfig?.type === 'for_each' && (
              <>
                <div>
                  <Label>Items Variable</Label>
                  <Input
                    placeholder="{{arrayVariable}}"
                    value={step.loopConfig?.items || ''}
                    onChange={(e) => updateStep(step.id, {
                      loopConfig: {
                        ...step.loopConfig!,
                        items: e.target.value
                      }
                    })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Item Variable Name</Label>
                    <Input
                      placeholder="item"
                      value={step.loopConfig?.itemVariable || ''}
                      onChange={(e) => updateStep(step.id, {
                        loopConfig: {
                          ...step.loopConfig!,
                          itemVariable: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <Label>Index Variable Name</Label>
                    <Input
                      placeholder="index"
                      value={step.loopConfig?.indexVariable || ''}
                      onChange={(e) => updateStep(step.id, {
                        loopConfig: {
                          ...step.loopConfig!,
                          indexVariable: e.target.value
                        }
                      })}
                    />
                  </div>
                </div>
              </>
            )}

            {step.loopConfig?.type === 'for_range' && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Start</Label>
                  <Input
                    type="number"
                    value={step.loopConfig?.start || 0}
                    onChange={(e) => updateStep(step.id, {
                      loopConfig: {
                        ...step.loopConfig!,
                        start: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>End</Label>
                  <Input
                    type="number"
                    value={step.loopConfig?.end || 10}
                    onChange={(e) => updateStep(step.id, {
                      loopConfig: {
                        ...step.loopConfig!,
                        end: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
                <div>
                  <Label>Step</Label>
                  <Input
                    type="number"
                    value={step.loopConfig?.step || 1}
                    onChange={(e) => updateStep(step.id, {
                      loopConfig: {
                        ...step.loopConfig!,
                        step: parseInt(e.target.value)
                      }
                    })}
                  />
                </div>
              </div>
            )}

            {step.loopConfig?.type === 'while' && (
              <div>
                <Label>Max Iterations</Label>
                <Input
                  type="number"
                  placeholder="1000"
                  value={step.loopConfig?.maxIterations || 1000}
                  onChange={(e) => updateStep(step.id, {
                    loopConfig: {
                      ...step.loopConfig!,
                      maxIterations: parseInt(e.target.value)
                    }
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Prevent infinite loops
                </p>
              </div>
            )}
          </div>
        );

      case 'api_call':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <Label>Method</Label>
                <Select
                  value={step.apiCallConfig?.method || 'GET'}
                  onValueChange={(value) => updateStep(step.id, {
                    apiCallConfig: {
                      ...step.apiCallConfig!,
                      method: value as any
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3">
                <Label>URL</Label>
                <Input
                  placeholder="https://api.example.com/{{endpoint}}"
                  value={step.apiCallConfig?.url || ''}
                  onChange={(e) => updateStep(step.id, {
                    apiCallConfig: {
                      ...step.apiCallConfig!,
                      url: e.target.value
                    }
                  })}
                />
              </div>
            </div>

            <div>
              <Label>Headers (JSON)</Label>
              <Textarea
                placeholder='{"Content-Type": "application/json"}'
                value={JSON.stringify(step.apiCallConfig?.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateStep(step.id, {
                      apiCallConfig: {
                        ...step.apiCallConfig!,
                        headers
                      }
                    });
                  } catch {}
                }}
              />
            </div>

            {['POST', 'PUT', 'PATCH'].includes(step.apiCallConfig?.method || '') && (
              <div>
                <Label>Body (JSON)</Label>
                <Textarea
                  placeholder='{"key": "{{value}}"}'
                  value={JSON.stringify(step.apiCallConfig?.body || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const body = JSON.parse(e.target.value);
                      updateStep(step.id, {
                        apiCallConfig: {
                          ...step.apiCallConfig!,
                          body
                        }
                      });
                    } catch {}
                  }}
                />
              </div>
            )}

            <div>
              <Label>Output Variable</Label>
              <Input
                placeholder="apiResponse"
                value={step.apiCallConfig?.outputVariable || ''}
                onChange={(e) => updateStep(step.id, {
                  apiCallConfig: {
                    ...step.apiCallConfig!,
                    outputVariable: e.target.value
                  }
                })}
              />
            </div>
          </div>
        );

      case 'transformation':
        return (
          <div className="space-y-4">
            <div>
              <Label>Transformation Type</Label>
              <Select
                value={step.transformConfig?.type || 'json_parse'}
                onValueChange={(value) => updateStep(step.id, {
                  transformConfig: {
                    ...step.transformConfig!,
                    type: value as any
                  }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSFORM_TYPES.map(tt => (
                    <SelectItem key={tt.value} value={tt.value}>
                      {tt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Input Variable</Label>
              <Input
                placeholder="{{sourceVariable}}"
                value={step.transformConfig?.input || ''}
                onChange={(e) => updateStep(step.id, {
                  transformConfig: {
                    ...step.transformConfig!,
                    input: e.target.value
                  }
                })}
              />
            </div>

            <div>
              <Label>Output Variable</Label>
              <Input
                placeholder="transformedData"
                value={step.transformConfig?.output || ''}
                onChange={(e) => updateStep(step.id, {
                  transformConfig: {
                    ...step.transformConfig!,
                    output: e.target.value
                  }
                })}
              />
            </div>

            {['regex_extract', 'split', 'join'].includes(step.transformConfig?.type || '') && (
              <div>
                <Label>
                  {step.transformConfig?.type === 'regex_extract' ? 'Pattern' : 'Separator'}
                </Label>
                <Input
                  placeholder={
                    step.transformConfig?.type === 'regex_extract' ? 
                    '\\d+' : ','
                  }
                  value={
                    step.transformConfig?.type === 'regex_extract' ?
                    step.transformConfig?.pattern || '' :
                    step.transformConfig?.separator || ''
                  }
                  onChange={(e) => updateStep(step.id, {
                    transformConfig: {
                      ...step.transformConfig!,
                      [step.transformConfig?.type === 'regex_extract' ? 'pattern' : 'separator']: e.target.value
                    }
                  })}
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-muted-foreground">
            Configuration for {step.type} coming soon...
          </div>
        );
    }
  };

  const renderErrorHandling = (step: ChainStep, disabled: boolean = false) => (
    <div className="space-y-4 p-4 border rounded-lg">
      <h4 className="font-medium flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Error Handling
      </h4>
      
      <div>
        <Label>On Error</Label>
        <Select
          value={step.errorHandling?.onError || 'stop'}
          onValueChange={(value) => updateStep(step.id, {
            errorHandling: {
              ...step.errorHandling,
              onError: value as any
            }
          })}
          disabled={disabled}
        >
          <SelectTrigger disabled={disabled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stop">Stop Chain</SelectItem>
            <SelectItem value="continue">Continue to Next Step</SelectItem>
            <SelectItem value="fallback">Execute Fallback Steps</SelectItem>
            <SelectItem value="retry">Retry Step</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {step.errorHandling?.onError === 'retry' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Max Attempts</Label>
            <Input
              type="number"
              value={step.retryConfig?.maxAttempts || 3}
              onChange={(e) => updateStep(step.id, {
                retryConfig: {
                  ...step.retryConfig,
                  maxAttempts: parseInt(e.target.value)
                }
              })}
              disabled={disabled}
            />
          </div>
          <div>
            <Label>Backoff (ms)</Label>
            <Input
              type="number"
              value={step.retryConfig?.backoffMs || 1000}
              onChange={(e) => updateStep(step.id, {
                retryConfig: {
                  ...step.retryConfig,
                  backoffMs: parseInt(e.target.value)
                }
              })}
              disabled={disabled}
            />
          </div>
        </div>
      )}

      <div>
        <Label>Error Variable (optional)</Label>
        <Input
          placeholder="lastError"
          value={step.errorHandling?.errorVariable || ''}
          onChange={(e) => updateStep(step.id, {
            errorHandling: {
              ...step.errorHandling,
              errorVariable: e.target.value
            }
          })}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Store error details in this variable
        </p>
      </div>
    </div>
  );

  const saveChain = async () => {
    // Validate all steps
    let hasErrors = false;
    const newErrors: Record<string, string[]> = {};
    
    steps.forEach(step => {
      const validation = validateStep(step);
      if (!validation.valid) {
        hasErrors = true;
        newErrors[step.id] = validation.errors;
      }
    });
    
    setValidationErrors(newErrors);
    
    if (hasErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    if (!chainName) {
      toast.error('Please enter a chain name');
      return;
    }

    const chainData = {
      name: chainName,
      description: chainDescription,
      steps,
      workspaceId
    };

    if (onSave) {
      onSave(chainData);
    } else {
      // Default save implementation
      toast.success('Chain saved successfully');
    }
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - Step List */}
      <div className="w-80 border-r bg-muted/10 overflow-y-auto">
        <div className="p-4 border-b">
          <Input
            placeholder="Chain Name"
            value={chainName}
            onChange={(e) => setChainName(e.target.value)}
            className="mb-2"
          />
          <Textarea
            placeholder="Description (optional)"
            value={chainDescription}
            onChange={(e) => setChainDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Steps</h3>
            <Badge variant="secondary">{steps.length}</Badge>
          </div>

          <div className="space-y-2 mb-4">
            {/* Show new step being configured separately */}
            {isNewStep && editingStep && (
              <Card className="ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground opacity-50" />
                      {renderStepIcon(editingStep.type)}
                      <span className="font-medium text-sm">{editingStep.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        New - Not Saved
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            )}
            
            {steps.map((step, index) => {
              // Check if this step is being edited
              const isEditing = editingStep?.id === step.id && !isNewStep;
              
              return (
                <Card
                  key={step.id}
                  className={`cursor-pointer transition-colors ${
                    selectedStep === step.id ? 'ring-2 ring-primary' : ''
                  } ${isEditing ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => {
                    setSelectedStep(step.id);
                    if (!editingStep || editingStep.id !== step.id) {
                      startEditingStep(step.id);
                    }
                  }}
                >
                  <CardHeader className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        {renderStepIcon(step.type)}
                        <span className="font-medium text-sm">{step.name}</span>
                        {isEditing && (
                          <Badge variant="outline" className="text-xs">
                            Editing
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {validationErrors[step.id]?.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {validationErrors[step.id].length}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStepExpanded(step.id);
                          }}
                        >
                          {expandedSteps.has(step.id) ? 
                            <ChevronDown className="w-4 h-4" /> : 
                            <ChevronRight className="w-4 h-4" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingStep?.id === step.id) {
                              cancelEditingStep();
                            }
                            deleteStep(step.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {expandedSteps.has(step.id) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Type: {step.type}
                        {step.outputVariable && (
                          <div>Output: {step.outputVariable}</div>
                        )}
                      </div>
                    )}
                  </CardHeader>
                </Card>
              );
            })}
          </div>

          <div className="space-y-2">
            <Label>Add Step</Label>
            <div className="grid grid-cols-2 gap-2">
              {STEP_TYPES.map(stepType => (
                <Button
                  key={stepType.value}
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => addStep(stepType.value)}
                >
                  {stepType.icon}
                  <span className="ml-2 text-xs">{stepType.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t">
          <Button 
            className="w-full" 
            onClick={saveChain}
            disabled={steps.length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Chain
          </Button>
        </div>
      </div>

      {/* Right Panel - Step Configuration */}
      <div className="flex-1 overflow-y-auto">
        {selectedStep ? (
          <div className="p-6">
            {(() => {
              // Determine which step to show (editing or actual)
              const currentStep = editingStep?.id === selectedStep 
                ? editingStep 
                : steps.find(s => s.id === selectedStep);
              
              if (!currentStep) return null;
              
              const isInEditMode = editingStep?.id === selectedStep;
              
              return (
                <>
                  {/* Edit mode banner */}
                  {isInEditMode && (
                    <Card className="mb-4 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Settings className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-sm">
                              {isNewStep ? 'Configuring New Step' : 'Editing Step Configuration'}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={saveEditingStep}
                            >
                              {isNewStep ? 'Add Step' : 'Update'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditingStep}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )}
                  
                  {/* Start edit button for existing steps */}
                  {!isInEditMode && !isNewStep && (
                    <div className="mb-4 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditingStep(selectedStep)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Configuration
                      </Button>
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <Label>Step Name</Label>
                    <Input
                      value={currentStep.name || ''}
                      onChange={(e) => updateStep(selectedStep, { name: e.target.value })}
                      disabled={!isInEditMode}
                    />
                  </div>

                  <Tabs defaultValue="config">
                    <TabsList>
                      <TabsTrigger value="config">Configuration</TabsTrigger>
                      <TabsTrigger value="error">Error Handling</TabsTrigger>
                      <TabsTrigger value="advanced">Advanced</TabsTrigger>
                    </TabsList>

                    <TabsContent value="config" className="space-y-4">
                      {renderStepContent(currentStep, !isInEditMode)}
                    </TabsContent>

                    <TabsContent value="error">
                      {renderErrorHandling(currentStep, !isInEditMode)}
                    </TabsContent>

                    <TabsContent value="advanced" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Wait Before (ms)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={currentStep.waitBefore || ''}
                            onChange={(e) => updateStep(selectedStep, { 
                              waitBefore: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            disabled={!isInEditMode}
                          />
                        </div>
                        <div>
                          <Label>Wait After (ms)</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={currentStep.waitAfter || ''}
                            onChange={(e) => updateStep(selectedStep, { 
                              waitAfter: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            disabled={!isInEditMode}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Timeout (ms)</Label>
                        <Input
                          type="number"
                          placeholder="30000"
                          value={currentStep.timeout || ''}
                          onChange={(e) => updateStep(selectedStep, { 
                            timeout: e.target.value ? parseInt(e.target.value) : undefined 
                          })}
                          disabled={!isInEditMode}
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={currentStep.breakpoint || false}
                          onCheckedChange={(checked) => updateStep(selectedStep, { breakpoint: checked })}
                          disabled={!isInEditMode}
                        />
                        <Label>Set Breakpoint (for debugging)</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={currentStep.skipInDryRun || false}
                          onCheckedChange={(checked) => updateStep(selectedStep, { skipInDryRun: checked })}
                          disabled={!isInEditMode}
                        />
                        <Label>Skip in Dry Run</Label>
                      </div>

                      <div>
                        <Label>Mock Output (JSON)</Label>
                        <Textarea
                          placeholder='{"test": "data"}'
                          value={currentStep.mockOutput ? JSON.stringify(currentStep.mockOutput, null, 2) : ''}
                          onChange={(e) => {
                            if (e.target.value === '') {
                              updateStep(selectedStep, { mockOutput: undefined });
                            } else {
                              try {
                                const mockOutput = JSON.parse(e.target.value);
                                updateStep(selectedStep, { mockOutput });
                              } catch {
                                // Invalid JSON, don't update
                              }
                            }
                          }}
                          disabled={!isInEditMode}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Used for testing without executing the actual step
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {validationErrors[selectedStep]?.length > 0 && (
                    <Card className="mt-4 border-destructive">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm text-destructive">
                          Validation Errors
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="text-sm space-y-1">
                          {validationErrors[selectedStep].map((error, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <X className="w-3 h-3 mt-0.5 text-destructive" />
                              <span>{error}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a step to configure</p>
              <p className="text-sm mt-2">or add a new step to get started</p>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Search Modal */}
      {promptSearchOpen && (
        <PromptSearchModal
          workspaceId={workspaceId}
          onSelect={(prompt) => {
            if (promptSearchStepId) {
              updateStep(promptSearchStepId, { promptId: prompt.id });
            }
            setPromptSearchOpen(false);
            setPromptSearchStepId(null);
          }}
          onClose={() => {
            setPromptSearchOpen(false);
            setPromptSearchStepId(null);
          }}
        />
      )}
    </div>
  );
}