'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { 
  Plus,
  Trash2,
  GripVertical,
  Save,
  Play,
  Settings,
  X,
  Search,
  ChevronRight,
  ChevronDown,
  Link2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  FileJson,
  Globe,
  Database,
  Code,
  Users,
  Webhook,
  GitBranch,
  GitMerge,
  Repeat,
  Edit2,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Loader2,
  XCircle,
  Clock,
  Info,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/lib/toast-config';
import { PromptSearchModal } from './prompt-search-modal';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { cn } from '@/lib/utils';
import { createChain, updateChain, executeChain } from '@/app/actions/chain-actions';

// Step type definitions - ordered by common usage patterns
const STEP_TYPES = [
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'neutral', description: 'Trigger from external event' },
  { value: 'prompt', label: 'Prompt', icon: FileJson, color: 'neutral', description: 'Execute AI prompt' },
  { value: 'api_call', label: 'API Call', icon: Globe, color: 'neutral', description: 'Fetch external data' },
  { value: 'database', label: 'Database', icon: Database, color: 'neutral', description: 'Query analytics data' },
  { value: 'condition', label: 'If/Then', icon: GitBranch, color: 'neutral', description: 'Conditional logic' },
  { value: 'loop', label: 'Loop', icon: Repeat, color: 'neutral', description: 'Iterate over data' },
  { value: 'switch', label: 'Switch', icon: GitMerge, color: 'neutral', description: 'Multi-branch logic' },
  { value: 'code', label: 'Code', icon: Code, color: 'neutral', description: 'Custom JavaScript' },
  { value: 'approval', label: 'Approval', icon: Users, color: 'neutral', description: 'Manual approval' }
];

interface ChainStep {
  id: string;
  type: string;
  name: string;
  description?: string;
  promptId?: string;
  promptName?: string;
  outputVariable?: string;
  config?: any;
  isNew?: boolean;
  isConfiguring?: boolean;
}

// Multi-step selector component for conditions and loops
interface MultiStepSelectorProps {
  selectedSteps: string[];
  availableSteps: Array<{ id: string; name: string; type: string }>;
  onChange: (stepIds: string[]) => void;
}

function MultiStepSelector({ selectedSteps, availableSteps, onChange }: MultiStepSelectorProps) {
  const toggleStep = (stepId: string) => {
    if (selectedSteps.includes(stepId)) {
      onChange(selectedSteps.filter(id => id !== stepId));
    } else {
      onChange([...selectedSteps, stepId]);
    }
  };

  const getStepIcon = (type: string) => {
    const stepType = STEP_TYPES.find(t => t.value === type);
    return stepType?.icon || FileJson;
  };

  return (
    <div className="space-y-2 mt-2">
      <div className="max-h-48 overflow-y-auto border border-neutral-200 dark:border-neutral-700 rounded-lg p-2">
        {availableSteps.length === 0 ? (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 p-2 text-center">
            No other steps available
          </p>
        ) : (
          <div className="space-y-1">
            {availableSteps.map((step) => {
              const Icon = getStepIcon(step.type);
              const isSelected = selectedSteps.includes(step.id);
              
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => toggleStep(step.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-all",
                    isSelected 
                      ? "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Icon className="w-4 h-4" />
                    <span className="truncate">{step.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {selectedSteps.length > 0 && (
        <p className="text-xs text-neutral-600 dark:text-neutral-400">
          {selectedSteps.length} step{selectedSteps.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

interface PremiumChainBuilderProps {
  workspaceId: string;
  workspaceSlug: string;
  availablePrompts: Array<{
    id: string;
    name: string;
    description: string | null;
    variables: any;
    content?: string;
  }>;
  availableQueries?: Array<{
    id: string;
    name: string;
    description: string | null;
    sql_template: string;
    variables_schema: any;
    connection_id: string;
    database_connections?: {
      id: string;
      name: string;
      type: string;
    };
  }>;
  availableConnections?: Array<{
    id: string;
    name: string;
    type: string;
    read_only: boolean;
  }>;
  mode: 'create' | 'edit';
  existingChain?: any;
}

// Header Component with Glass Morphism
const ChainHeader = ({ name, setName, description, setDescription, steps, lastSaved }: any) => (
  <motion.div 
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border-b border-white/20 dark:border-neutral-800/30"
  >
    <div className="max-w-6xl mx-auto px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full" />
          <div className="flex-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Untitled Chain"
              className="text-xl font-semibold bg-transparent border-none focus:ring-0 px-0 placeholder:text-neutral-400"
            />
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {steps.filter((s: ChainStep) => !s.isNew).length} steps • {lastSaved ? `Last saved ${lastSaved}` : 'Not saved'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-neutral-600">
            <Play className="w-4 h-4 mr-2" />
            Test
          </Button>
          <Button variant="ghost" size="sm" className="text-neutral-600">
            Preview
          </Button>
        </div>
      </div>
    </div>
  </motion.div>
);


// Step Card Component
const StepCard = ({ step, index, steps, onExpand, onDelete, isDragging, onUpdate, onConfirm, onCancel, workspaceId, availablePrompts, availableConnections, availableQueries }: any) => {
  const [promptSearchOpen, setPromptSearchOpen] = useState<false | 'main' | 'then' | 'else'>(false);
  const [editingData, setEditingData] = useState<any>(null);
  const isEditing = step.isConfiguring && !step.isNew;
  
  // Initialize editing data when entering edit mode
  React.useEffect(() => {
    if (step.isConfiguring && !step.isNew && !editingData) {
      // Create a deep copy of the step for editing
      setEditingData({
        name: step.name,
        promptId: step.promptId,
        promptName: step.promptName,
        outputVariable: step.outputVariable,
        config: step.config ? { ...currentData.config } : {},
        description: step.description
      });
    } else if (!step.isConfiguring) {
      // Clear editing data when not configuring
      setEditingData(null);
    }
  }, [step.isConfiguring, step.isNew]);
  
  // Use editingData for existing steps, original step for new steps
  const currentData = isEditing && editingData ? { ...step, ...editingData } : step;
  
  // Update function that updates editingData for existing steps
  const handleUpdate = (updates: any) => {
    if (isEditing && editingData) {
      // Update the temporary editing data
      setEditingData(prev => ({ ...prev, ...updates }));
    } else {
      // For new steps, update directly
      onUpdate(updates);
    }
  };
  
  if (step.isNew || step.isConfiguring) {
    // Step Configuration Card (New or Edit)
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative"
      >
        {/* Connection Line from Previous Step */}
        {index > 0 && (
          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
            <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700" />
          </div>
        )}
        
        <div className="bg-white dark:bg-neutral-900 border-2 border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {isEditing ? 'Edit' : 'Configure'} {currentData.type.charAt(0).toUpperCase() + currentData.type.slice(1).replace('_', ' ')} Step
            </h3>
            <button
              onClick={() => {
                if (isEditing) {
                  // Just close the editor, don't save changes
                  setEditingData(null);
                  onUpdate({ isConfiguring: false });
                } else {
                  // For new steps, delete them
                  onDelete(currentData.id);
                }
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
          
          <div className="space-y-4">
            {currentData.type === 'prompt' && (
              <>
                <div>
                  <Label>Select Prompt</Label>
                  {!currentData.promptId ? (
                    <button
                      onClick={() => setPromptSearchOpen('main')}
                      className="w-full mt-2 p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                    >
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                          <Search className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Search & Select Prompt
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="mt-2 p-3 bg-white dark:bg-neutral-800 rounded-xl border border-blue-200 dark:border-blue-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-neutral-100">
                              {currentData.promptName}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              Selected prompt
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPromptSearchOpen('main')}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label>Output Variable</Label>
                  <div className="relative mt-2">
                    <Input
                      placeholder="e.g., promptResult"
                      value={currentData.outputVariable || ''}
                      onChange={(e) => handleUpdate({ outputVariable: e.target.value })}
                      className="pl-10"
                    />
                    <ArrowRight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Use this variable in subsequent steps as {"{{outputVariable}}"}
                  </p>
                </div>
              </>
            )}
            
            {currentData.type === 'webhook' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-pink-200/50 dark:border-pink-700/50">
                  <div className="flex items-start gap-3">
                    <Webhook className="w-5 h-5 text-pink-600 dark:text-pink-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                        Webhook Endpoint
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-lg flex-1 font-mono">
                          {`${window.location.origin}/api/webhooks/${workspaceId}/${currentData.id}`}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${workspaceId}/${currentData.id}`);
                            toast.success('Webhook URL copied');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label>Output Variable</Label>
                  <div className="relative mt-2">
                    <Input
                      placeholder="e.g., webhookData"
                      value={currentData.outputVariable || ''}
                      onChange={(e) => handleUpdate({ outputVariable: e.target.value })}
                      className="pl-10"
                    />
                    <ArrowRight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Webhook payload will be stored in this variable
                  </p>
                </div>
              </div>
            )}
            
            {currentData.type === 'api_call' && (
              <div className="space-y-4">
                <div>
                  <Label>API Endpoint</Label>
                  <Input
                    placeholder="https://api.example.com/endpoint"
                    value={currentData.config?.url || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, url: e.target.value } })}
                    className="mt-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Method</Label>
                    <select
                      value={currentData.config?.method || 'GET'}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, method: e.target.value } })}
                      className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Output Variable</Label>
                    <Input
                      placeholder="e.g., apiResponse"
                      value={currentData.outputVariable || ''}
                      onChange={(e) => handleUpdate({ outputVariable: e.target.value })}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                {(step.config?.method === 'POST' || step.config?.method === 'PUT' || step.config?.method === 'PATCH') && (
                  <div>
                    <Label>Request Body (JSON)</Label>
                    <Textarea
                      placeholder='{"key": "value"}'
                      value={currentData.config?.body || ''}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, body: e.target.value } })}
                      className="mt-2 font-mono text-sm"
                      rows={4}
                    />
                  </div>
                )}
                
                <div>
                  <Label>Headers (Optional)</Label>
                  <Textarea
                    placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                    value={currentData.config?.headers || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, headers: e.target.value } })}
                    className="mt-2 font-mono text-sm"
                    rows={3}
                  />
                </div>
              </div>
            )}
            
            {currentData.type === 'database' && (
              <div className="space-y-4">
                {/* First select a database connection */}
                <div>
                  <Label>Database Connection</Label>
                  <select
                    value={currentData.config?.connectionId || ''}
                    onChange={(e) => {
                      handleUpdate({ 
                        config: { 
                          ...currentData.config, 
                          connectionId: e.target.value,
                          queryId: undefined, // Reset query when connection changes
                          queryName: undefined
                        } 
                      });
                    }}
                    className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                  >
                    <option value="">Select a connection...</option>
                    {availableConnections?.map(conn => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name} ({conn.type})
                      </option>
                    ))}
                  </select>
                  {!availableConnections?.length && (
                    <p className="text-xs text-neutral-500 mt-2">
                      No database connections found. Create one in Settings → Databases.
                    </p>
                  )}
                </div>
                
                {/* Only show queries if a connection is selected */}
                {currentData.config?.connectionId && (
                  <div>
                    <Label>Select Query</Label>
                    <select
                      value={currentData.config?.queryId || ''}
                      onChange={(e) => {
                        const selectedQuery = availableQueries?.find(q => q.id === e.target.value);
                        handleUpdate({ 
                          config: { 
                            ...currentData.config, 
                            queryId: e.target.value,
                            queryName: selectedQuery?.name
                          } 
                        });
                      }}
                      className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                    >
                      <option value="">Select a saved query...</option>
                      {availableQueries
                        ?.filter(query => query.connection_id === currentData.config?.connectionId)
                        ?.map(query => (
                          <option key={query.id} value={query.id}>
                            {query.name}
                          </option>
                        ))}
                    </select>
                    {!availableQueries?.filter(q => q.connection_id === currentData.config?.connectionId).length && (
                      <div className="mt-2">
                        <p className="text-xs text-neutral-500 mb-2">
                          No saved queries found for this connection.
                          </p>
                          <a 
                            href={`/${workspaceSlug}/queries/new`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          >
                            Create a new query →
                          </a>
                      </div>
                    )}
                    
                    {currentData.config?.queryId && availableQueries?.find(q => q.id === currentData.config.queryId)?.variables_schema?.length > 0 && (
                      <div>
                        <Label>Query Variables</Label>
                        <div className="space-y-2 mt-2">
                          {availableQueries.find(q => q.id === currentData.config.queryId)?.variables_schema.map((variable: any) => (
                            <div key={variable.name}>
                              <Label className="text-xs">{variable.name}</Label>
                              <Input
                                placeholder={`{{previousStep.output}} or static value`}
                                value={currentData.config?.variables?.[variable.name] || ''}
                                onChange={(e) => onUpdate({ 
                                  config: { 
                                    ...currentData.config, 
                                    variables: {
                                      ...currentData.config?.variables,
                                      [variable.name]: e.target.value
                                    }
                                  } 
                                })}
                                className="mt-1"
                              />
                              {variable.description && (
                                <p className="text-xs text-neutral-500 mt-1">{variable.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div>
                  <Label>Output Variable</Label>
                  <Input
                    placeholder="e.g., queryResult"
                    value={currentData.config?.outputVariable || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, outputVariable: e.target.value } })}
                    className="mt-2"
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    Query results will be available as {'{{outputVariable}}'}
                  </p>
                </div>
              </div>
            )}
            
            {currentData.type === 'condition' && (
              <div className="space-y-4">
                <div>
                  <Label>Condition Type</Label>
                  <select
                    value={currentData.config?.conditionType || 'simple'}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, conditionType: e.target.value } })}
                    className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                  >
                    <option value="simple">Simple Comparison</option>
                    <option value="contains">Contains Text</option>
                    <option value="regex">Regex Match</option>
                    <option value="exists">Variable Exists</option>
                  </select>
                </div>
                
                {(!currentData.config?.conditionType || currentData.config?.conditionType === 'simple') && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label>Left Value</Label>
                      <Input
                        placeholder="{{variable}}"
                        value={currentData.config?.left || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, left: e.target.value } })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Operator</Label>
                      <select
                        value={currentData.config?.operator || '=='}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, operator: e.target.value } })}
                        className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                      >
                        <option value="==">Equals</option>
                        <option value="!=">Not Equals</option>
                        <option value=">">Greater Than</option>
                        <option value="<">Less Than</option>
                        <option value=">=">Greater or Equal</option>
                        <option value="<=">Less or Equal</option>
                      </select>
                    </div>
                    <div>
                      <Label>Right Value</Label>
                      <Input
                        placeholder="value or {{var}}"
                        value={currentData.config?.right || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, right: e.target.value } })}
                        className="mt-2"
                      />
                    </div>
                  </div>
                )}
                
                {currentData.config?.conditionType === 'contains' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Text/Variable to Search In</Label>
                      <Input
                        placeholder="{{variable}} or text"
                        value={currentData.config?.searchIn || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, searchIn: e.target.value } })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Search For</Label>
                      <Input
                        placeholder="text to find"
                        value={currentData.config?.searchFor || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, searchFor: e.target.value } })}
                        className="mt-2"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={currentData.config?.caseSensitive || false}
                        onCheckedChange={(checked) => handleUpdate({ config: { ...currentData.config, caseSensitive: checked } })}
                      />
                      <Label className="cursor-pointer">Case Sensitive</Label>
                    </div>
                  </div>
                )}
                
                {currentData.config?.conditionType === 'regex' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Text/Variable to Test</Label>
                      <Input
                        placeholder="{{variable}} or text"
                        value={currentData.config?.testString || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, testString: e.target.value } })}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Regular Expression</Label>
                      <Input
                        placeholder="^[A-Z]+.*"
                        value={currentData.config?.pattern || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, pattern: e.target.value } })}
                        className="mt-2"
                      />
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Enter regex pattern without delimiters (no /.../)
                      </p>
                    </div>
                    <div>
                      <Label>Regex Flags (optional)</Label>
                      <Input
                        placeholder="gi"
                        value={currentData.config?.flags || ''}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, flags: e.target.value } })}
                        className="mt-2"
                      />
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Common flags: g (global), i (case-insensitive), m (multiline)
                      </p>
                    </div>
                  </div>
                )}
                
                {currentData.config?.conditionType === 'exists' && (
                  <div>
                    <Label>Variable Name</Label>
                    <Input
                      placeholder="variableName (without {{}})"
                      value={currentData.config?.checkVariable || ''}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, checkVariable: e.target.value } })}
                      className="mt-2"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Check if a variable exists and is not null/undefined/empty
                    </p>
                  </div>
                )}
                
                {/* Branching Configuration */}
                <div className="space-y-4 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <h4 className="font-medium text-sm text-neutral-900 dark:text-neutral-100">Branch Actions</h4>
                  
                  {/* Then Branch (True) */}
                  <div className="bg-green-50/30 dark:bg-green-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                      </div>
                      <Label className="text-green-800 dark:text-green-200 font-medium">When True (Then)</Label>
                    </div>
                    
                    <div className="space-y-3">
                      <select
                        value={currentData.config?.thenAction || 'continue'}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, thenAction: e.target.value } })}
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm"
                      >
                        <option value="continue">Continue to Next Step</option>
                        <option value="goto">Go to Specific Step</option>
                        <option value="set_variable">Set Variable</option>
                        <option value="run_prompt">Run Prompt</option>
                        <option value="run_chain">Run Another Chain</option>
                        <option value="stop">Stop Chain</option>
                      </select>
                      
                      {currentData.config?.thenAction === 'goto' && (
                        <div>
                          <Label className="text-xs">Execute Steps</Label>
                          <MultiStepSelector
                            selectedSteps={currentData.config?.thenSteps || []}
                            availableSteps={steps.filter(s => s.id !== step.id).map(s => ({ 
                              id: s.id, 
                              name: s.name || `Step ${steps.indexOf(s) + 1}`,
                              type: s.type 
                            }))}
                            onChange={(selectedIds) => handleUpdate({ 
                              config: { ...currentData.config, thenSteps: selectedIds } 
                            })}
                          />
                        </div>
                      )}
                      
                      {currentData.config?.thenAction === 'set_variable' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Variable name"
                            value={currentData.config?.thenVariableName || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, thenVariableName: e.target.value } })}
                            className="text-sm"
                          />
                          <Input
                            placeholder="Value to set"
                            value={currentData.config?.thenVariableValue || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, thenVariableValue: e.target.value } })}
                            className="text-sm"
                          />
                          <p className="text-xs text-neutral-500">Can use {'{{variables}}'} in the value</p>
                        </div>
                      )}
                      
                      {currentData.config?.thenAction === 'run_prompt' && (
                        <div>
                          <Button
                            variant="outline"
                            onClick={() => setPromptSearchOpen('then')}
                            className="w-full justify-between text-sm"
                          >
                            {currentData.config?.thenPromptName || 'Select a prompt...'}
                            <Search className="w-4 h-4 ml-2 text-neutral-400" />
                          </Button>
                          {currentData.config?.thenPromptName && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Selected: {currentData.config?.thenPromptName}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {currentData.config?.thenAction === 'run_chain' && (
                        <div>
                          <Input
                            placeholder="Chain ID to execute"
                            value={currentData.config?.thenChainId || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, thenChainId: e.target.value } })}
                            className="text-sm"
                          />
                          <p className="text-xs text-neutral-500 mt-1">The sub-chain will run with current context</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Else Branch (False) */}
                  <div className="bg-red-50/30 dark:bg-red-900/20 rounded-xl p-4 border border-red-200/50 dark:border-red-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                      </div>
                      <Label className="text-red-800 dark:text-red-200 font-medium">When False (Else)</Label>
                    </div>
                    
                    <div className="space-y-3">
                      <select
                        value={currentData.config?.elseAction || 'continue'}
                        onChange={(e) => handleUpdate({ config: { ...currentData.config, elseAction: e.target.value } })}
                        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm"
                      >
                        <option value="continue">Continue to Next Step</option>
                        <option value="goto">Go to Specific Step</option>
                        <option value="set_variable">Set Variable</option>
                        <option value="run_prompt">Run Prompt</option>
                        <option value="run_chain">Run Another Chain</option>
                        <option value="skip">Skip Next Steps</option>
                        <option value="stop">Stop Chain</option>
                      </select>
                      
                      {currentData.config?.elseAction === 'goto' && (
                        <div>
                          <Label className="text-xs">Execute Steps</Label>
                          <MultiStepSelector
                            selectedSteps={currentData.config?.elseSteps || []}
                            availableSteps={steps.filter(s => s.id !== step.id).map(s => ({ 
                              id: s.id, 
                              name: s.name || `Step ${steps.indexOf(s) + 1}`,
                              type: s.type 
                            }))}
                            onChange={(selectedIds) => handleUpdate({ 
                              config: { ...currentData.config, elseSteps: selectedIds } 
                            })}
                          />
                        </div>
                      )}
                      
                      {currentData.config?.elseAction === 'set_variable' && (
                        <div className="space-y-2">
                          <Input
                            placeholder="Variable name"
                            value={currentData.config?.elseVariableName || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, elseVariableName: e.target.value } })}
                            className="text-sm"
                          />
                          <Input
                            placeholder="Value to set"
                            value={currentData.config?.elseVariableValue || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, elseVariableValue: e.target.value } })}
                            className="text-sm"
                          />
                          <p className="text-xs text-neutral-500">Can use {'{{variables}}'} in the value</p>
                        </div>
                      )}
                      
                      {currentData.config?.elseAction === 'run_prompt' && (
                        <div>
                          <Button
                            variant="outline"
                            onClick={() => setPromptSearchOpen('else')}
                            className="w-full justify-between text-sm"
                          >
                            {currentData.config?.elsePromptName || 'Select a prompt...'}
                            <Search className="w-4 h-4 ml-2 text-neutral-400" />
                          </Button>
                          {currentData.config?.elsePromptName && (
                            <p className="text-xs text-neutral-500 mt-1">
                              Selected: {currentData.config?.elsePromptName}
                            </p>
                          )}
                        </div>
                      )}
                      
                      {currentData.config?.elseAction === 'run_chain' && (
                        <div>
                          <Input
                            placeholder="Chain ID to execute"
                            value={currentData.config?.elseChainId || ''}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, elseChainId: e.target.value } })}
                            className="text-sm"
                          />
                          <p className="text-xs text-neutral-500 mt-1">The sub-chain will run with current context</p>
                        </div>
                      )}
                      
                      {currentData.config?.elseAction === 'skip' && (
                        <div>
                          <Input
                            type="number"
                            placeholder="Number of steps to skip"
                            value={currentData.config?.elseSkipSteps || '1'}
                            onChange={(e) => handleUpdate({ config: { ...currentData.config, elseSkipSteps: e.target.value } })}
                            className="text-sm"
                          />
                          <p className="text-xs text-neutral-500 mt-1">Skip the next N steps in the chain</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50/30 dark:bg-blue-900/10 rounded-lg p-3 border border-blue-200/30 dark:border-blue-700/30">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 <strong>Tip:</strong> Branch actions control the flow of your chain. 
                      Use "Go to Step" for complex branching logic, or "Set Variable" to store conditional results.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {currentData.type === 'loop' && (
              <div className="space-y-4">
                <div>
                  <Label>Loop Type</Label>
                  <select
                    value={currentData.config?.loopType || 'forEach'}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, loopType: e.target.value } })}
                    className="w-full mt-2 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                  >
                    <option value="forEach">For Each Item</option>
                    <option value="while">While Condition</option>
                    <option value="times">Fixed Times</option>
                  </select>
                </div>
                
                {currentData.config?.loopType === 'forEach' && (
                  <div>
                    <Label>Array Variable</Label>
                    <Input
                      placeholder="{{arrayVariable}}"
                      value={currentData.config?.arrayVariable || ''}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, arrayVariable: e.target.value } })}
                      className="mt-2"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Each item will be available as {"{{item}}"} inside the loop
                    </p>
                  </div>
                )}
                
                {currentData.config?.loopType === 'times' && (
                  <div>
                    <Label>Number of Iterations</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={currentData.config?.iterations || ''}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, iterations: e.target.value } })}
                      className="mt-2"
                    />
                  </div>
                )}
                
                {currentData.config?.loopType === 'while' && (
                  <div>
                    <Label>While Condition</Label>
                    <Input
                      placeholder="{{counter}} < 10"
                      value={currentData.config?.whileCondition || ''}
                      onChange={(e) => handleUpdate({ config: { ...currentData.config, whileCondition: e.target.value } })}
                      className="mt-2"
                    />
                  </div>
                )}
                
                {/* Loop Body Steps */}
                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <Label>Loop Body Steps</Label>
                  <p className="text-xs text-neutral-500 mb-2">
                    Select steps to execute in each iteration
                  </p>
                  <MultiStepSelector
                    selectedSteps={currentData.config?.loopSteps || []}
                    availableSteps={steps.filter(s => s.id !== step.id).map(s => ({ 
                      id: s.id, 
                      name: s.name || `Step ${steps.indexOf(s) + 1}`,
                      type: s.type 
                    }))}
                    onChange={(selectedIds) => handleUpdate({ 
                      config: { ...currentData.config, loopSteps: selectedIds } 
                    })}
                  />
                </div>
              </div>
            )}
            
            {currentData.type === 'switch' && (
              <div className="space-y-4">
                <div>
                  <Label>Switch Expression</Label>
                  <Input
                    placeholder="{{variable}} or expression"
                    value={currentData.config?.expression || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, expression: e.target.value } })}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label>Cases</Label>
                  <div className="space-y-4 mt-2">
                    {(currentData.config?.cases || [{ value: '', label: '', steps: [] }]).map((caseItem: any, index: number) => (
                      <div key={index} className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Case value"
                            value={caseItem.value}
                            onChange={(e) => {
                              const newCases = [...(currentData.config?.cases || [])];
                              newCases[index] = { ...caseItem, value: e.target.value };
                              handleUpdate({ config: { ...currentData.config, cases: newCases } });
                            }}
                          />
                          <Input
                            placeholder="Case label"
                            value={caseItem.label}
                            onChange={(e) => {
                              const newCases = [...(currentData.config?.cases || [])];
                              newCases[index] = { ...caseItem, label: e.target.value };
                              handleUpdate({ config: { ...currentData.config, cases: newCases } });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCases = (currentData.config?.cases || []).filter((_: any, i: number) => i !== index);
                              handleUpdate({ config: { ...currentData.config, cases: newCases } });
                            }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div>
                          <Label className="text-xs">Steps for this case</Label>
                          <MultiStepSelector
                            selectedSteps={caseItem.steps || []}
                            availableSteps={steps.filter(s => s.id !== step.id).map(s => ({ 
                              id: s.id, 
                              name: s.name || `Step ${steps.indexOf(s) + 1}`,
                              type: s.type 
                            }))}
                            onChange={(selectedIds) => {
                              const newCases = [...(currentData.config?.cases || [])];
                              newCases[index] = { ...caseItem, steps: selectedIds };
                              handleUpdate({ config: { ...currentData.config, cases: newCases } });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newCases = [...(currentData.config?.cases || []), { value: '', label: '', steps: [] }];
                        handleUpdate({ config: { ...currentData.config, cases: newCases } });
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Case
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {currentData.type === 'code' && (
              <div className="space-y-4">
                <div>
                  <Label>JavaScript Code</Label>
                  <Textarea
                    placeholder="// Your code here&#10;// Access variables with: variables.variableName&#10;// Return value with: return result;"
                    value={currentData.config?.code || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, code: e.target.value } })}
                    className="mt-2 font-mono text-sm"
                    rows={8}
                  />
                </div>
                
                <div>
                  <Label>Output Variable</Label>
                  <Input
                    placeholder="e.g., codeResult"
                    value={step.outputVariable || ''}
                    onChange={(e) => onUpdate({ outputVariable: e.target.value })}
                    className="mt-2"
                  />
                </div>
                
                <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Sandboxed Execution</p>
                      <p className="text-xs mt-1">Code runs in a secure sandbox with limited permissions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {currentData.type === 'approval' && (
              <div className="space-y-4">
                <div>
                  <Label>Approval Message</Label>
                  <Textarea
                    placeholder="Please review and approve this action..."
                    value={currentData.config?.message || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, message: e.target.value } })}
                    className="mt-2"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label>Approvers (Email addresses)</Label>
                  <Input
                    placeholder="user@example.com, admin@example.com"
                    value={currentData.config?.approvers || ''}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, approvers: e.target.value } })}
                    className="mt-2"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Comma-separated list of email addresses
                  </p>
                </div>
                
                <div>
                  <Label>Timeout (hours)</Label>
                  <Input
                    type="number"
                    placeholder="24"
                    value={currentData.config?.timeout || '24'}
                    onChange={(e) => handleUpdate({ config: { ...currentData.config, timeout: e.target.value } })}
                    className="mt-2"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Auto-reject if no response within this time
                  </p>
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="outline"
                onClick={() => {
                  if (isEditing) {
                    // For existing steps being edited, discard changes and close
                    setEditingData(null);
                    onUpdate({ isConfiguring: false });
                  } else {
                    // For new steps, delete them
                    onDelete(step.id);
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (isEditing && editingData) {
                    // Apply the changes from editingData to the actual step
                    onUpdate({ ...editingData, isConfiguring: false, isNew: false });
                    setEditingData(null);
                  } else {
                    // For new steps, confirm as before
                    onUpdate({ ...currentData, isConfiguring: false, isNew: false });
                  }
                }}
                disabled={
                  (currentData.type === 'prompt' && !currentData.promptId) ||
                  (currentData.type === 'api_call' && !currentData.config?.url) ||
                  (currentData.type === 'database' && !currentData.config?.queryId) ||
                  (currentData.type === 'condition' && (!currentData.config?.conditionType || currentData.config?.conditionType === 'simple') && (!currentData.config?.left || !currentData.config?.right)) ||
                  (currentData.type === 'condition' && currentData.config?.conditionType === 'contains' && (!currentData.config?.searchIn || !currentData.config?.searchFor)) ||
                  (currentData.type === 'condition' && currentData.config?.conditionType === 'regex' && (!currentData.config?.testString || !currentData.config?.pattern)) ||
                  (currentData.type === 'condition' && currentData.config?.conditionType === 'exists' && !currentData.config?.checkVariable) ||
                  (currentData.type === 'loop' && currentData.config?.loopType === 'forEach' && !currentData.config?.arrayVariable) ||
                  (currentData.type === 'loop' && currentData.config?.loopType === 'times' && !currentData.config?.iterations) ||
                  (currentData.type === 'loop' && currentData.config?.loopType === 'while' && !currentData.config?.whileCondition) ||
                  (currentData.type === 'switch' && !currentData.config?.expression) ||
                  (currentData.type === 'code' && !currentData.config?.code) ||
                  (currentData.type === 'approval' && (!currentData.config?.message || !currentData.config?.approvers))
                }
                className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 transition-colors"
              >
                <Check className="w-4 h-4 mr-2" />
                {isEditing ? 'Update' : 'Add Step'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Prompt Search Modal */}
        <PromptSearchModal
          isOpen={!!promptSearchOpen}
          onClose={() => setPromptSearchOpen(false)}
          onSelect={(prompt) => {
            if (promptSearchOpen === 'main') {
              handleUpdate({
                promptId: prompt.id,
                promptName: prompt.name,
                name: prompt.name
              });
            } else if (promptSearchOpen === 'then') {
              handleUpdate({
                config: {
                  ...currentData.config,
                  thenPromptId: prompt.id,
                  thenPromptName: prompt.name
                }
              });
            } else if (promptSearchOpen === 'else') {
              handleUpdate({
                config: {
                  ...currentData.config,
                  elsePromptId: prompt.id,
                  elsePromptName: prompt.name
                }
              });
            }
            setPromptSearchOpen(false);
          }}
          workspaceId={workspaceId}
        />
      </motion.div>
    );
  }
  
  // Regular Step Card (Collapsed)
  return (
    <div
      className="group relative"
    >
      {/* Connection Line */}
      {index > 0 && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="w-px h-6 bg-neutral-300 dark:bg-neutral-700" />
        </div>
      )}
      
      {/* Main Card */}
      <div 
        className={cn(
          "relative bg-white dark:bg-neutral-900",
          "border border-neutral-200 dark:border-neutral-700 rounded-2xl p-4",
          "hover:bg-neutral-50 dark:hover:bg-neutral-800",
          "hover:shadow-md transition-all duration-200",
          "group"
        )}
      >
        {/* Step Number Badge */}
        <div className="absolute -top-2 -left-2 w-6 h-6 bg-neutral-700 dark:bg-neutral-600 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-xs font-bold text-white">{index + 1}</span>
        </div>
        
        {/* Content */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {(() => {
                const stepType = STEP_TYPES.find(t => t.value === step.type);
                const Icon = stepType?.icon || Settings;
                return (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-800">
                    <Icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  </div>
                );
              })()}
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                  {step.promptName || step.name || 'Untitled Step'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  {step.type.charAt(0).toUpperCase() + step.type.slice(1).replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <div className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100">
              <GripVertical className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({ isConfiguring: true });
              }}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Edit2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(step.id);
              }}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
        
        {/* Status Indicators */}
        {(step.promptId || step.config) && (
          <div className="flex items-center space-x-2 mt-3">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-neutral-600 dark:text-neutral-400">Configured</span>
            </div>
            {step.outputVariable && (
              <div className="flex items-center space-x-1">
                <Link2 className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-600 dark:text-blue-400">→ {step.outputVariable}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Add Step Zone
const AddStepZone = ({ onAdd, isEmpty }: any) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="mt-8"
  >
    {isEmpty ? (
      <div className="text-center py-16">
        <motion.div 
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-24 h-24 bg-neutral-100 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
        >
          <Sparkles className="w-12 h-12 text-neutral-600 dark:text-neutral-400" />
        </motion.div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Choose Your Starting Point
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
          Begin with a trigger, prompt, or any other step type. 
          You can start your workflow however you need.
        </p>
        <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto">
          {STEP_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.value}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onAdd(type.value)}
                className="group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 rounded-lg px-3 py-2 transition-all"
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-700 dark:group-hover:text-neutral-300" />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
                    {type.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    ) : (
      <div className="flex justify-center">
        <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
          {STEP_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.value}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAdd(type.value)}
                className={cn(
                  "flex items-center space-x-2 px-4 py-2.5",
                  "bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm",
                  "border border-neutral-200/50 dark:border-neutral-700/50",
                  "rounded-xl hover:bg-white/80 dark:hover:bg-neutral-900/80",
                  "transition-all shadow-lg hover:shadow-xl"
                )}
              >
                <Icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                  {type.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    )}
  </motion.div>
);

// Floating Action Bar
const FloatingActionBar = ({ onSave, onTest, saving, isSaved }: any) => (
  <motion.div
    initial={{ y: 100 }}
    animate={{ y: 0 }}
    className="fixed bottom-0 left-0 right-0 z-50"
  >
    <div className="backdrop-blur-xl bg-white/80 dark:bg-neutral-900/80 border-t border-white/20 dark:border-neutral-800/30">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              Auto-save enabled
            </Badge>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={onTest}
              disabled={!isSaved}
              className="bg-white/50 dark:bg-neutral-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isSaved ? "Save the chain first before testing" : ""}
            >
              <Play className="w-4 h-4 mr-2" />
              Test Chain
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 shadow-lg transition-colors"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Chain
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </motion.div>
);

// Main Component
export default function PremiumChainBuilderV2({
  workspaceId,
  workspaceSlug,
  availablePrompts,
  availableQueries,
  availableConnections,
  mode,
  existingChain
}: PremiumChainBuilderProps) {
  const router = useRouter();
  const [chainName, setChainName] = useState(existingChain?.name || '');
  const [description, setDescription] = useState(existingChain?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>(existingChain?.steps || []);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [savedChainId, setSavedChainId] = useState<string | null>(existingChain?.id || null);
  
  // Test/Run Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testVariables, setTestVariables] = useState<Record<string, any>>({});
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string>('');
  const [availableApiKeys, setAvailableApiKeys] = useState<any[]>([]);
  const [executionStatus, setExecutionStatus] = useState<{
    stepId: string;
    status: 'pending' | 'running' | 'success' | 'error';
    output?: any;
    error?: string;
    duration?: number;
  }[]>([]);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  
  // Load available API keys when modal opens
  React.useEffect(() => {
    if (showTestModal) {
      loadApiKeys();
    }
  }, [showTestModal]);
  
  const loadApiKeys = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('workspace_api_keys')
      .select('id, name, provider, is_default')
      .eq('workspace_id', workspaceId)
      .order('is_default', { ascending: false });
    
    if (data && data.length > 0) {
      setAvailableApiKeys(data);
      // Select default key or first available
      const defaultKey = data.find(k => k.is_default) || data[0];
      setSelectedApiKeyId(defaultKey.id);
    }
  };

  const addStep = (type: string) => {
    const newStep: ChainStep = {
      id: nanoid(),
      type,
      name: `New ${type} step`,
      outputVariable: `step${steps.filter(s => !s.isNew).length + 1}Output`,
      isNew: true,
      isConfiguring: true
    };
    
    setSteps([...steps, newStep]);
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const confirmStep = (stepId: string) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, isNew: false, isConfiguring: false } : step
    ));
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const saveChain = async () => {
    if (!chainName) {
      toast.error('Please enter a chain name');
      return null;
    }

    // Filter out any unconfigured new steps and transform config
    const configuredSteps = steps.filter(s => !s.isNew).map((step, index) => {
      // Transform the config based on step type
      let transformedConfig = { ...step.config };
      
      // Transform condition config to match execution engine expectations
      if (step.type === 'condition' && step.config) {
        const conditionalConfig: any = {
          condition: {
            type: step.config.conditionType || 'comparison',
            left: step.config.left,
            operator: step.config.operator || 'eq',
            right: step.config.right,
            expression: step.config.expression,
            pattern: step.config.pattern
          },
          then: [],
          else: []
        };
        
        // Handle then branch
        if (step.config.thenAction === 'goto') {
          if (step.config.thenSteps && step.config.thenSteps.length > 0) {
            // New multi-step format
            conditionalConfig.then = step.config.thenSteps;
          } else if (step.config.thenGotoStep) {
            // Legacy single step format
            const targetStep = steps.find(s => s.name === step.config.thenGotoStep || s.id === step.config.thenGotoStep);
            if (targetStep) conditionalConfig.then.push(targetStep.id);
          }
        }
        
        // Handle else branch
        if (step.config.elseAction === 'goto') {
          if (step.config.elseSteps && step.config.elseSteps.length > 0) {
            // New multi-step format
            conditionalConfig.else = step.config.elseSteps;
          } else if (step.config.elseGotoStep) {
            // Legacy single step format
            const targetStep = steps.find(s => s.name === step.config.elseGotoStep || s.id === step.config.elseGotoStep);
            if (targetStep) conditionalConfig.else.push(targetStep.id);
          }
        }
        
        transformedConfig = { ...step.config, conditionalConfig };
      }
      
      // Transform loop config
      if (step.type === 'loop' && step.config) {
        const loopConfig: any = {
          type: step.config.loopType || 'for_each',
          items: step.config.arrayVariable,
          itemVariable: step.config.itemVariable || 'item',
          indexVariable: step.config.indexVariable || 'index',
          condition: step.config.whileCondition ? {
            type: 'expression',
            expression: step.config.whileCondition
          } : undefined,
          maxIterations: step.config.maxIterations || 100,
          start: step.config.rangeStart,
          end: step.config.rangeEnd,
          step: step.config.rangeStep,
          steps: step.config.loopSteps || []
        };
        
        transformedConfig = { ...step.config, loopConfig };
      }
      
      // Transform switch config
      if (step.type === 'switch' && step.config) {
        const switchConfig: any = {
          variable: step.config.expression,
          cases: (step.config.cases || []).map((c: any) => ({
            value: c.value,
            steps: c.steps || []
          })),
          default: step.config.defaultSteps || []
        };
        
        transformedConfig = { ...step.config, switchConfig };
      }
      
      // Transform API call config to match schema
      if (step.type === 'api_call' && step.config) {
        // Ensure URL is valid
        let url = step.config.url || '';
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = url ? `https://${url}` : 'https://example.com';
        }
        
        transformedConfig = {
          url,
          method: step.config.method || 'GET',
          headers: step.config.headers || {},
          body: step.config.body,
          authentication: step.config.authentication || { type: 'none' }
        };
      }
      
      return {
        id: step.id,
        type: step.type,
        name: step.name || `Step ${index + 1}`,
        config: transformedConfig,
        position: index
      };
    });

    if (configuredSteps.length === 0) {
      toast.error('Please add at least one configured step');
      return null;
    }

    setSaving(true);

    try {
      const chainData = {
        name: chainName,
        description: description || undefined,
        steps: configuredSteps,
        trigger: 'manual' as const,
        active: true
      };

      if (mode === 'edit' && existingChain?.id) {
        await updateChain(existingChain.id, chainData);
        toast.success('Chain updated successfully');
        setSavedChainId(existingChain.id);
        return { id: existingChain.id };
      } else {
        const chain = await createChain(workspaceId, chainData);
        toast.success('Chain created successfully');
        setSavedChainId(chain.id);
        return chain;
      }
    } catch (error: any) {
      console.error('Save chain error:', error);
      toast.error(error.message || 'Failed to save chain');
      return null;
    } finally {
      setSaving(false);
    }
  };

  // Collect required variables from all steps
  const getRequiredVariables = () => {
    const variables = new Set<string>();
    const configuredSteps = steps.filter(s => !s.isNew);
    
    configuredSteps.forEach((step, index) => {
      if (index === 0 || !step.useOutputAsInput) {
        // First step or steps that don't use previous output need variables
        if (step.type === 'prompt' && step.promptId) {
          const prompt = availablePrompts?.find(p => p.id === step.promptId);
          if (prompt?.variables) {
            prompt.variables.forEach((v: string) => variables.add(v));
          }
        }
        // Add variables from other step types if needed
      }
    });
    
    return Array.from(variables);
  };

  const testChain = async () => {
    const configuredSteps = steps.filter(s => !s.isNew);

    if (configuredSteps.length === 0) {
      toast.error('Please add at least one configured step to test');
      return;
    }

    if (!existingChain?.id && mode === 'edit') {
      toast.info('Please save the chain first before testing');
      return;
    }

    // Open test modal
    setShowTestModal(true);
    setExecutionStatus(configuredSteps.map(step => ({
      stepId: step.id,
      status: 'pending'
    })));
    setExecutionResult(null);
  };
  
  const cancelChainExecution = () => {
    setIsCancelling(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Mark remaining steps as cancelled
    setExecutionStatus(prev => prev.map(s => 
      s.status === 'pending' || s.status === 'running' 
        ? { ...s, status: 'error', error: 'Cancelled by user' }
        : s
    ));
    
    setExecutionResult({
      success: false,
      error: 'Execution cancelled by user',
      totalDuration: 0
    });
    
    setTestRunning(false);
    setIsCancelling(false);
    toast.info('Chain execution cancelled');
  };
  
  const runChainExecution = async () => {
    setTestRunning(true);
    setIsCancelling(false);
    const configuredSteps = steps.filter(s => !s.isNew);
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    try {
      // Initialize all steps as pending
      setExecutionStatus(configuredSteps.map(step => ({
        stepId: step.id,
        status: 'pending'
      })));
      
      // Use the saved chain ID or the existing chain ID
      let chainId = savedChainId || existingChain?.id;
      if (!chainId) {
        const saveResult = await saveChain();
        if (!saveResult?.id) {
          throw new Error('Failed to save chain before execution');
        }
        chainId = saveResult.id;
      }
      
      // Start the chain execution using the new executeChain action
      const { execution, results } = await executeChain(chainId, testVariables);
      setExecutionId(execution.id);
      
      // Poll for execution status
      if (execution.id) {
        await pollExecutionStatus(execution.id, configuredSteps);
      } else {
        // If no executionId, assume immediate completion
        setExecutionResult({
          success: true,
          totalDuration: 0,
          outputs: results || {}
        });
        
        // Mark all steps as complete
        setExecutionStatus(configuredSteps.map(step => ({
          stepId: step.id,
          status: 'success',
          output: results?.[step.id]
        })));
      }
      
      toast.success('Chain executed successfully!');
    } catch (error: any) {
      console.error('Test chain error:', error);
      toast.error(error.message || 'Failed to execute chain');
      setExecutionResult({
        success: false,
        error: error.message
      });
      
      // Mark running steps as error
      setExecutionStatus(prev => prev.map(s => 
        s.status === 'running' ? { ...s, status: 'error', error: error.message } : s
      ));
    } finally {
      setTestRunning(false);
    }
  };
  
  const pollExecutionStatus = async (execId: string, configuredSteps: ChainStep[]) => {
    const supabase = createClient();
    let polling = true;
    let pollCount = 0;
    const maxPolls = 60; // Max 60 seconds
    
    while (polling && pollCount < maxPolls) {
      // Check if cancelled
      if (abortControllerRef.current?.signal.aborted) {
        polling = false;
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Poll every second
      pollCount++;
      
      // Get execution status
      const { data: execution } = await supabase
        .from('chain_runs')
        .select('status, output, error, steps, metadata')
        .eq('id', execId)
        .single();
      
      if (execution) {
        // Update step statuses based on execution data
        if (execution.steps && Array.isArray(execution.steps)) {
          const stepStatuses = execution.steps as any[];
          setExecutionStatus(configuredSteps.map((step, index) => {
            const stepStatus = stepStatuses.find(s => s.stepId === step.id) || stepStatuses[index];
            return {
              stepId: step.id,
              status: stepStatus?.status || 'pending',
              output: stepStatus?.output,
              error: stepStatus?.error,
              duration: stepStatus?.duration
            };
          }));
        }
        
        // Check if execution is complete
        if (execution.status === 'success' || execution.status === 'error') {
          polling = false;
          setExecutionResult({
            success: execution.status === 'success',
            error: execution.error,
            outputs: execution.output,
            totalDuration: execution.metadata?.duration
          });
        }
      }
    }
    
    if (pollCount >= maxPolls) {
      throw new Error('Execution timeout - took longer than 60 seconds');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <ChainHeader
        name={chainName}
        setName={setChainName}
        description={description}
        setDescription={setDescription}
        steps={steps}
        lastSaved={null}
      />
      
      {/* Main Canvas */}
      <div className="px-6 py-8 max-w-4xl mx-auto pb-32">
        
        
        {/* Render all steps in a single Reorder.Group */}
        {steps.length > 0 ? (
          <Reorder.Group
            axis="y"
            values={steps.map(s => s.id)}
            onReorder={(newIds) => {
              const newSteps = newIds.map(id => steps.find(s => s.id === id)!).filter(Boolean);
              setSteps(newSteps);
            }}
            className="space-y-4"
            as="div"
          >
            {steps.map((step, index) => {
              // Don't allow dragging for configuring or new steps
              const canDrag = !step.isNew && !step.isConfiguring;
              
              return (
                <Reorder.Item
                  key={step.id}
                  value={step.id}
                  id={step.id}
                  className="relative list-none"
                  drag={canDrag}
                  style={{ 
                    willChange: canDrag ? 'transform' : 'auto',
                    listStyle: 'none',
                  }}
                  whileDrag={canDrag ? {
                    scale: 1.02,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
                    zIndex: 100,
                  } : undefined}
                  transition={{
                    layout: {
                      type: "spring",
                      damping: 25,
                      stiffness: 300
                    }
                  }}
                >
                  <motion.div 
                    layout="position"
                    whileDrag={canDrag ? { opacity: 0.95 } : undefined}
                  >
                    <StepCard
                      step={step}
                      index={index}
                      steps={steps}
                      onExpand={() => updateStep(step.id, { isConfiguring: true })}
                      onDelete={deleteStep}
                      isDragging={isDragging}
                      onUpdate={(updates: any) => updateStep(step.id, updates)}
                      onConfirm={confirmStep}
                      workspaceId={workspaceId}
                      availablePrompts={availablePrompts}
                      availableConnections={availableConnections}
                      availableQueries={availableQueries}
                    />
                  </motion.div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        ) : null}
        
        {/* Add Step Zone - Only show if no unconfigured steps */}
        {!steps.some(s => s.isNew || s.isConfiguring) && (
          <AddStepZone onAdd={addStep} isEmpty={steps.length === 0} />
        )}
      </div>
      
      {/* Floating Action Bar */}
      <FloatingActionBar
        onSave={saveChain}
        onTest={testChain}
        saving={saving}
        isSaved={!!savedChainId}
      />
      
      {/* Test/Run Modal */}
      <AnimatePresence>
        {showTestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                if (testRunning) {
                  // Confirm cancellation if test is running
                  if (confirm('Stop the running test and close?')) {
                    cancelChainExecution();
                    setShowTestModal(false);
                  }
                } else {
                  setShowTestModal(false);
                }
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Test Chain Execution</h2>
                    <p className="text-sm text-neutral-500">{chainName || 'Unnamed Chain'}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => !testRunning && setShowTestModal(false)}
                  disabled={testRunning}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* API Key Selection */}
                {!testRunning && !executionResult && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">API Configuration</h3>
                    {availableApiKeys.length > 0 ? (
                      <div>
                        <Label>API Key</Label>
                        <select
                          value={selectedApiKeyId}
                          onChange={(e) => setSelectedApiKeyId(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                        >
                          {availableApiKeys.map(key => (
                            <option key={key.id} value={key.id}>
                              {key.name} ({key.provider}) {key.is_default && '⭐'}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-neutral-500 mt-1">
                          Select which API key to use for this execution
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                              No API Keys Configured
                            </p>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                              Please add API keys in your workspace settings to execute chains.
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => router.push(`/${workspaceSlug}/settings/api-keys`)}
                            >
                              Configure API Keys
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Variables Input Section */}
                {!testRunning && getRequiredVariables().length > 0 && !executionResult && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium mb-3">Input Variables</h3>
                    <div className="space-y-3">
                      {getRequiredVariables().map(variable => (
                        <div key={variable}>
                          <Label>{variable}</Label>
                          <Input
                            placeholder={`Enter ${variable}...`}
                            value={testVariables[variable] || ''}
                            onChange={(e) => setTestVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Execution Progress */}
                {(testRunning || executionStatus.some(s => s.status !== 'pending')) && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium mb-3">Execution Progress</h3>
                    {steps.filter(s => !s.isNew).map((step, index) => {
                      const status = executionStatus.find(s => s.stepId === step.id);
                      const stepType = STEP_TYPES.find(t => t.value === step.type);
                      const Icon = stepType?.icon || Settings;
                      
                      return (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={cn(
                            "border rounded-lg p-4 transition-all",
                            status?.status === 'running' && "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20",
                            status?.status === 'success' && "border-green-500 bg-green-50/50 dark:bg-green-900/20",
                            status?.status === 'error' && "border-red-500 bg-red-50/50 dark:bg-red-900/20",
                            status?.status === 'pending' && "border-neutral-200 dark:border-neutral-700"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                status?.status === 'running' && "bg-blue-100 dark:bg-blue-900/50",
                                status?.status === 'success' && "bg-green-100 dark:bg-green-900/50",
                                status?.status === 'error' && "bg-red-100 dark:bg-red-900/50",
                                status?.status === 'pending' && "bg-neutral-100 dark:bg-neutral-800"
                              )}>
                                {status?.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
                                {status?.status === 'success' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                                {status?.status === 'error' && <XCircle className="w-4 h-4 text-red-600" />}
                                {status?.status === 'pending' && <Icon className="w-4 h-4 text-neutral-400" />}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{step.name}</span>
                                  <span className="text-xs text-neutral-500">({step.type})</span>
                                </div>
                                {status?.duration && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3 text-neutral-400" />
                                    <span className="text-xs text-neutral-500">
                                      {(status.duration / 1000).toFixed(2)}s
                                    </span>
                                  </div>
                                )}
                                {status?.error && (
                                  <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                                    {status.error}
                                  </div>
                                )}
                                {status?.output && (
                                  <div className="mt-2">
                                    <details className="cursor-pointer">
                                      <summary className="text-xs text-neutral-500 hover:text-neutral-700">
                                        View Output
                                      </summary>
                                      <pre className="mt-2 text-xs bg-neutral-100 dark:bg-neutral-800 rounded p-2 overflow-x-auto">
                                        {JSON.stringify(status.output, null, 2)}
                                      </pre>
                                    </details>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                
                {/* Final Result */}
                {executionResult && (
                  <div className={cn(
                    "mt-6 p-4 rounded-lg border",
                    executionResult.success 
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                  )}>
                    <div className="flex items-start gap-3">
                      {executionResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {executionResult.success ? 'Chain Executed Successfully!' : 'Execution Failed'}
                        </h4>
                        {executionResult.totalDuration && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            Total duration: {(executionResult.totalDuration / 1000).toFixed(2)}s
                          </p>
                        )}
                        {executionResult.error && (
                          <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                            {executionResult.error}
                          </p>
                        )}
                        {executionResult.outputs && (
                          <details className="mt-3 cursor-pointer">
                            <summary className="text-sm text-neutral-600 hover:text-neutral-800">
                              View Final Outputs
                            </summary>
                            <pre className="mt-2 text-xs bg-white dark:bg-neutral-800 rounded p-3 overflow-x-auto">
                              {JSON.stringify(executionResult.outputs, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal Footer */}
              <div className="border-t border-neutral-200 dark:border-neutral-800 px-6 py-4 flex justify-end gap-3">
                {!testRunning && !executionResult && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowTestModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={runChainExecution}
                      disabled={
                        !selectedApiKeyId ||
                        getRequiredVariables().some(v => !testVariables[v])
                      }
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Run Chain
                    </Button>
                  </>
                )}
                {testRunning && (
                  <Button
                    variant="destructive"
                    onClick={cancelChainExecution}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Stopping...
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4 mr-2" />
                        Stop Execution
                      </>
                    )}
                  </Button>
                )}
                {executionResult && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExecutionResult(null);
                        setExecutionStatus([]);
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Run Again
                    </Button>
                    <Button
                      onClick={() => setShowTestModal(false)}
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}