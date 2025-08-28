'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Activity,
  ArrowLeft,
  Edit,
  Trash2,
  Copy,
  Variable,
  History,
  Settings,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { executeChain, getChainExecution, cancelChainExecution } from '@/app/actions/chain-execution-actions';
import { deleteChain } from '@/app/actions/chain-actions';
import { format } from 'date-fns';

interface ChainExecutionPanelProps {
  chain: any;
  executions: any[];
  prompts: any[];
  queries: any[];
  workspaceSlug: string;
}

interface ExecutionStep {
  stepId: string;
  stepType: string;
  stepName: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: any;
  error?: string;
  executionTimeMs?: number;
}

export default function ChainExecutionPanel({
  chain,
  executions: initialExecutions,
  prompts,
  queries,
  workspaceSlug
}: ChainExecutionPanelProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRunning, setIsRunning] = useState(false);
  const [currentExecution, setCurrentExecution] = useState<any>(null);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [executions, setExecutions] = useState(initialExecutions);
  const [inputVariables, setInputVariables] = useState<Record<string, any>>({});
  const [deleting, setDeleting] = useState(false);

  // Extract required input variables from first step
  useEffect(() => {
    if (chain.steps && chain.steps.length > 0) {
      const firstStep = chain.steps[0];
      
      if (firstStep.type === 'prompt' && firstStep.config?.promptId) {
        const prompt = prompts.find(p => p.id === firstStep.config.promptId);
        if (prompt?.variables) {
          const vars: Record<string, any> = {};
          Object.keys(prompt.variables).forEach(key => {
            vars[key] = '';
          });
          setInputVariables(vars);
        }
      }
    }
  }, [chain, prompts]);

  const runChain = async () => {
    setIsRunning(true);
    setCurrentExecution(null);
    setExecutionSteps([]);

    try {
      const result = await executeChain(chain.id, inputVariables);
      
      if (result.success && result.data) {
        setCurrentExecution(result.data);
        // Convert steps to the correct format
        const formattedSteps: ExecutionStep[] = (result.data.steps || []).map((step: any) => ({
          ...step,
          startedAt: step.startedAt ? new Date(step.startedAt).toISOString() : undefined,
          completedAt: step.completedAt ? new Date(step.completedAt).toISOString() : undefined
        }));
        setExecutionSteps(formattedSteps);
        
        // Add to executions list
        setExecutions([
          {
            id: result.data.runId,
            status: result.data.status,
            started_at: result.data.startedAt,
            completed_at: result.data.completedAt,
            execution_time_ms: result.data.completedAt ? 
              new Date(result.data.completedAt).getTime() - new Date(result.data.startedAt).getTime() : 0,
            error: result.data.error
          },
          ...executions
        ]);
        
        if (result.data.status === 'completed') {
          toast.success('Chain executed successfully');
        } else if (result.data.status === 'failed') {
          toast.error(`Chain failed: ${result.data.error}`);
        }
        
        setActiveTab('execution');
      } else {
        toast.error(result.error || 'Failed to execute chain');
      }
    } catch (error: any) {
      console.error('Chain execution error:', error);
      toast.error('Failed to execute chain');
    } finally {
      setIsRunning(false);
    }
  };

  const cancelExecution = async () => {
    if (!currentExecution) return;
    
    try {
      const result = await cancelChainExecution(currentExecution.runId);
      if (result.success) {
        toast.success('Execution cancelled');
        setIsRunning(false);
        setCurrentExecution({
          ...currentExecution,
          status: 'cancelled'
        });
      } else {
        toast.error(result.error || 'Failed to cancel execution');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel execution');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this chain? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await deleteChain(chain.id);
      toast.success('Chain deleted successfully');
      router.push(`/${workspaceSlug}/chains`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete chain');
    } finally {
      setDeleting(false);
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'prompt': return '💭';
      case 'database': return '🗄️';
      case 'api_call': return '🌐';
      case 'condition': return '🔀';
      case 'loop': return '🔁';
      case 'webhook': return '🔗';
      case 'code': return '📝';
      case 'switch': return '🎛️';
      case 'approval': return '✅';
      default: return '📦';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'running': return 'bg-blue-500';
      case 'skipped': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'running': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'skipped': return <ChevronRight className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-blue-950/30">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${workspaceSlug}/chains`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-semibold">{chain.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {chain.description || 'No description'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isRunning ? (
                <Button variant="destructive" onClick={cancelExecution}>
                  <Pause className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              ) : (
                <Button onClick={runChain}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Chain
                </Button>
              )}
              
              <Link href={`/${workspaceSlug}/chains/edit/${chain.id}`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-2">
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="execution" className="gap-2">
              <Activity className="h-4 w-4" />
              Execution
              {isRunning && (
                <Badge variant="default" className="ml-2 bg-blue-500">
                  Running
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
              {executions.length > 0 && (
                <Badge variant="outline" className="ml-2">
                  {executions.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="variables" className="gap-2">
              <Variable className="h-4 w-4" />
              Variables
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chain Steps */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Chain Steps</h3>
                  <div className="space-y-3">
                    {chain.steps?.map((step: any, index: number) => (
                      <div
                        key={step.id}
                        className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-white dark:bg-neutral-700 rounded-full flex items-center justify-center text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-shrink-0 text-xl">
                          {getStepIcon(step.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {step.name || `${step.type.charAt(0).toUpperCase() + step.type.slice(1)} Step`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {step.type.replace('_', ' ')}
                          </p>
                        </div>
                        {step.outputVariable && (
                          <Badge variant="outline" className="text-xs">
                            → {step.outputVariable}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Chain Info */}
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Information</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Created</dt>
                      <dd className="font-medium">
                        {format(new Date(chain.created_at), 'PPP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Last Updated</dt>
                      <dd className="font-medium">
                        {format(new Date(chain.updated_at), 'PPP')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Total Steps</dt>
                      <dd className="font-medium">{chain.steps?.length || 0}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant={chain.active ? 'default' : 'secondary'}>
                          {chain.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Statistics</h3>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Total Runs</dt>
                      <dd className="font-medium">{executions.length}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Success Rate</dt>
                      <dd className="font-medium">
                        {executions.length > 0
                          ? Math.round(
                              (executions.filter(e => e.status === 'completed').length /
                                executions.length) *
                                100
                            )
                          : 0}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Avg Duration</dt>
                      <dd className="font-medium">
                        {executions.length > 0
                          ? Math.round(
                              executions.reduce(
                                (acc, e) => acc + (e.execution_time_ms || 0),
                                0
                              ) / executions.length
                            )
                          : 0}{' '}
                        ms
                      </dd>
                    </div>
                  </dl>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Execution Tab */}
          <TabsContent value="execution">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Execution Steps */}
              <div className="lg:col-span-2">
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Execution Progress</h3>
                  
                  {executionSteps.length > 0 ? (
                    <div className="space-y-3">
                      {executionSteps.map((step, index) => (
                        <motion.div
                          key={step.stepId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3"
                        >
                          {/* Status indicator */}
                          <div className={`mt-1 w-2 h-2 rounded-full ${getStatusColor(step.status)}`} />
                          
                          {/* Step content */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{step.stepName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {step.stepType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                {getStatusIcon(step.status)}
                                <span className="text-muted-foreground">
                                  {step.executionTimeMs ? `${step.executionTimeMs}ms` : '-'}
                                </span>
                              </div>
                            </div>
                            
                            {step.error && (
                              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                                {step.error}
                              </div>
                            )}
                            
                            {step.output && (
                              <div className="text-sm bg-neutral-50 dark:bg-neutral-800 p-2 rounded font-mono">
                                <pre className="whitespace-pre-wrap">
                                  {typeof step.output === 'string'
                                    ? step.output
                                    : JSON.stringify(step.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      {isRunning ? (
                        <div className="flex flex-col items-center gap-4">
                          <RefreshCw className="h-8 w-8 animate-spin" />
                          <p>Initializing execution...</p>
                        </div>
                      ) : (
                        <p>No execution in progress. Click "Run Chain" to start.</p>
                      )}
                    </div>
                  )}
                </Card>
              </div>

              {/* Execution Details */}
              <div>
                <Card className="p-6">
                  <h3 className="font-semibold mb-4">Execution Details</h3>
                  
                  {currentExecution ? (
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Run ID</dt>
                        <dd className="font-mono text-xs">{currentExecution.runId}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>
                          <Badge
                            variant={
                              currentExecution.status === 'completed'
                                ? 'default'
                                : currentExecution.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {currentExecution.status}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Started</dt>
                        <dd className="font-medium">
                          {format(new Date(currentExecution.startedAt), 'HH:mm:ss')}
                        </dd>
                      </div>
                      {currentExecution.completedAt && (
                        <div>
                          <dt className="text-muted-foreground">Duration</dt>
                          <dd className="font-medium">
                            {currentExecution.completedAt.getTime() -
                              currentExecution.startedAt.getTime()}{' '}
                            ms
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No execution details available
                    </p>
                  )}
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Execution History</h3>
              
              {executions.length > 0 ? (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${
                          execution.status === 'completed'
                            ? 'bg-green-500'
                            : execution.status === 'failed'
                            ? 'bg-red-500'
                            : execution.status === 'cancelled'
                            ? 'bg-gray-500'
                            : 'bg-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">
                            {format(new Date(execution.started_at), 'PPp')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {execution.status} • {execution.execution_time_ms || 0}ms
                          </p>
                        </div>
                      </div>
                      
                      {execution.error && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  No execution history yet
                </p>
              )}
            </Card>
          </TabsContent>

          {/* Variables Tab */}
          <TabsContent value="variables">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Input Variables</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Set initial values for variables used in the first step of your chain
              </p>
              
              {Object.keys(inputVariables).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(inputVariables).map(([key, value]) => (
                    <div key={key}>
                      <Label htmlFor={key}>{key}</Label>
                      <Input
                        id={key}
                        value={value}
                        onChange={(e) =>
                          setInputVariables({
                            ...inputVariables,
                            [key]: e.target.value
                          })
                        }
                        placeholder={`Enter value for ${key}`}
                        className="mt-2"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No input variables required for this chain
                </p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}