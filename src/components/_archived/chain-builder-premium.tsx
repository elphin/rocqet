'use client';

import React, { useState, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
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
  RefreshCw,
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
  Shield,
  Sparkles,
  ArrowRight
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

// Step type definitions - ordered by common usage patterns
const STEP_TYPES = [
  { value: 'webhook', label: 'Webhook', icon: Webhook, color: 'pink', description: 'Trigger from external event' },
  { value: 'prompt', label: 'Prompt', icon: FileJson, color: 'blue', description: 'Execute AI prompt' },
  { value: 'api_call', label: 'API Call', icon: Globe, color: 'orange', description: 'Fetch external data' },
  { value: 'database', label: 'Database', icon: Database, color: 'cyan', description: 'Query analytics data' },
  { value: 'condition', label: 'If/Then', icon: GitBranch, color: 'purple', description: 'Conditional logic' },
  { value: 'loop', label: 'Loop', icon: Repeat, color: 'green', description: 'Iterate over data' },
  { value: 'switch', label: 'Switch', icon: GitMerge, color: 'indigo', description: 'Multi-branch logic' },
  { value: 'code', label: 'Code', icon: Code, color: 'yellow', description: 'Custom JavaScript' },
  { value: 'approval', label: 'Approval', icon: Users, color: 'emerald', description: 'Manual approval' }
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
              {steps.length} steps • {lastSaved ? `Last saved ${lastSaved}` : 'Not saved'}
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

// Step Card Collapsed State
const StepCardCollapsed = ({ step, index, onExpand, onDelete, isDragging }: any) => {
  return (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3, ease: "easeOut" }}
    className="group relative"
  >
    {/* Connection Line */}
    {index > 0 && (
      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-blue-400/60 to-blue-600/80" />
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </div>
      </div>
    )}
    
    {/* Main Card */}
    <div 
      className={cn(
        "relative bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm",
        "border border-neutral-200/50 dark:border-neutral-700/50 rounded-2xl p-4",
        "hover:bg-white/80 dark:hover:bg-neutral-900/80 transition-all duration-300",
        "cursor-pointer group",
        isDragging && "opacity-50 scale-95"
      )}
      onClick={onExpand}
    >
      {/* Step Number Badge */}
      <div className="absolute -top-2 -left-2 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
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
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  `bg-${stepType?.color || 'gray'}-100 dark:bg-${stepType?.color || 'gray'}-900/30`
                )}>
                  <Icon className={cn("w-4 h-4", `text-${stepType?.color || 'gray'}-600 dark:text-${stepType?.color || 'gray'}-400`)} />
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
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-grab active:cursor-grabbing">
            <GripVertical className="w-4 h-4 text-neutral-400" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
  </motion.div>
  );
};

// Step Card Expanded State
const StepCardExpanded = ({ step, index, onCollapse, onUpdate, workspaceId }: any) => {
  const [promptSearchOpen, setPromptSearchOpen] = useState(false);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border border-neutral-200/60 dark:border-neutral-700/60 rounded-3xl overflow-hidden shadow-xl"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-neutral-800/30 dark:to-neutral-900/30 px-6 py-4 border-b border-neutral-200/30 dark:border-neutral-700/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-sm font-bold text-white">{index + 1}</span>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                Configure {step.type.charAt(0).toUpperCase() + step.type.slice(1).replace('_', ' ')}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Set up your step configuration
              </p>
            </div>
          </div>
          
          <button 
            onClick={onCollapse}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Configuration Content */}
      <div className="p-6 space-y-6">
        {step.type === 'prompt' && (
          <>
            {/* Prompt Selection */}
            <div className="space-y-3">
              <Label>Prompt Selection</Label>
              
              {!step.promptId ? (
                <button
                  onClick={() => setPromptSearchOpen(true)}
                  className="w-full p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                >
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                      <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      Search & Select Prompt
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Choose from your workspace prompts
                    </p>
                  </div>
                </button>
              ) : (
                <div className="p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200/50 dark:border-blue-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-sm">
                        <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {step.promptName}
                        </p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Selected prompt
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPromptSearchOpen(true)}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Output Variable */}
            <div className="space-y-3">
              <Label>Output Variable</Label>
              <div className="relative">
                <Input
                  placeholder="e.g., promptResult"
                  value={step.outputVariable || ''}
                  onChange={(e) => onUpdate({ outputVariable: e.target.value })}
                  className="pl-10"
                />
                <ArrowRight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Use this variable in subsequent steps as {"{{"}outputVariable{"}}"}
              </p>
            </div>
          </>
        )}

        {step.type === 'webhook' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-pink-50/50 to-purple-50/50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-pink-200/50 dark:border-pink-700/50">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white dark:bg-neutral-800 rounded-xl flex items-center justify-center shadow-sm">
                  <Webhook className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Webhook Endpoint
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-white dark:bg-neutral-800 px-3 py-1.5 rounded-lg flex-1 font-mono">
                      {`${window.location.origin}/api/webhooks/${workspaceId}/${step.id}`}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${workspaceId}/${step.id}`);
                        toast.success('Webhook URL copied');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step.type === 'database' && (
          <div className="space-y-4">
            <div className="bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200/50 dark:border-yellow-700/50 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Read-Only Analytics Database
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Queries run against a separate analytics database with aggregated data only.
                    No access to production data or personal information.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Search Modal */}
      <PromptSearchModal
        isOpen={promptSearchOpen}
        onClose={() => setPromptSearchOpen(false)}
        onSelect={(prompt) => {
          onUpdate({
            promptId: prompt.id,
            promptName: prompt.name,
            name: prompt.name
          });
          setPromptSearchOpen(false);
        }}
        workspaceId={workspaceId}
      />
    </motion.div>
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
          className="w-24 h-24 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl"
        >
          <Sparkles className="w-12 h-12 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600" />
        </motion.div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Choose Your Starting Point
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-md mx-auto">
          Begin with a trigger, prompt, or any other step type. 
          You can start your workflow however you need.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {STEP_TYPES.slice(0, 6).map((type) => {
            const Icon = type.icon;
            return (
              <motion.button
                key={type.value}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAdd(type.value)}
                className="group relative bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-700 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl p-4 transition-all shadow-sm hover:shadow-lg"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                    "bg-gradient-to-br",
                    type.color === 'pink' && "from-pink-400 to-rose-600",
                    type.color === 'blue' && "from-blue-400 to-indigo-600",
                    type.color === 'orange' && "from-orange-400 to-red-600",
                    type.color === 'cyan' && "from-cyan-400 to-teal-600",
                    type.color === 'purple' && "from-purple-400 to-pink-600",
                    type.color === 'green' && "from-green-400 to-emerald-600"
                  )}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      {type.label}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {type.description}
                    </p>
                  </div>
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
                <Icon className={cn("w-4 h-4", `text-${type.color}-600 dark:text-${type.color}-400`)} />
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
const FloatingActionBar = ({ onSave, onTest, saving }: any) => (
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
              className="bg-white/50 dark:bg-neutral-800/50"
            >
              <Play className="w-4 h-4 mr-2" />
              Test Chain
            </Button>
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25"
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
export function PremiumChainBuilder({
  workspaceId,
  workspaceSlug,
  availablePrompts,
  mode,
  existingChain
}: PremiumChainBuilderProps) {
  const router = useRouter();
  const [chainName, setChainName] = useState(existingChain?.name || '');
  const [description, setDescription] = useState(existingChain?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>(existingChain?.steps || []);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const addStep = (type: string) => {
    const newStep: ChainStep = {
      id: nanoid(),
      type,
      name: `New ${type} step`,
      outputVariable: `step${steps.length + 1}Output`
    };
    
    setSteps([...steps, newStep]);
    setExpandedStep(newStep.id);
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const deleteStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
    if (expandedStep === stepId) {
      setExpandedStep(null);
    }
  };

  const saveChain = async () => {
    if (!chainName) {
      toast.error('Please enter a chain name');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const slug = chainName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const chainData = {
        name: chainName,
        slug,
        description,
        steps,
        workspace_id: workspaceId
      };

      if (mode === 'edit') {
        const { error } = await supabase
          .from('prompt_chains')
          .update(chainData)
          .eq('id', existingChain.id);

        if (error) throw error;
        toast.success('Chain updated successfully');
      } else {
        const { data, error } = await supabase
          .from('prompt_chains')
          .insert(chainData)
          .select()
          .single();

        if (error) throw error;
        toast.success('Chain created successfully');
        router.push(`/${workspaceSlug}/chains/${data.slug}`);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save chain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-blue-950/30">
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
        <AnimatePresence mode="popLayout">
          <Reorder.Group
            axis="y"
            values={steps}
            onReorder={setSteps}
            className="space-y-6"
            as="div"
          >
            {steps.map((step, index) => (
              <Reorder.Item
                key={step.id}
                value={step}
                as="div"
                onDragStart={() => setIsDragging(true)}
                onDragEnd={() => setIsDragging(false)}
              >
                {expandedStep === step.id ? (
                  <StepCardExpanded
                    step={step}
                    index={index}
                    onCollapse={() => setExpandedStep(null)}
                    onUpdate={(updates: any) => updateStep(step.id, updates)}
                    workspaceId={workspaceId}
                  />
                ) : (
                  <StepCardCollapsed
                    step={step}
                    index={index}
                    onExpand={() => setExpandedStep(step.id)}
                    onDelete={() => deleteStep(step.id)}
                    isDragging={isDragging}
                  />
                )}
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </AnimatePresence>
        
        {/* Add Step Zone */}
        <AddStepZone onAdd={addStep} isEmpty={steps.length === 0} />
      </div>
      
      {/* Floating Action Bar */}
      <FloatingActionBar
        onSave={saveChain}
        onTest={() => toast.info('Test functionality coming soon')}
        saving={saving}
      />
    </div>
  );
}