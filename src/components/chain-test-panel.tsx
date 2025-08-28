'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Play,
  Pause,
  StopCircle,
  Bug,
  SkipForward,
  RefreshCw,
  Download,
  Upload,
  Code,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  GitBranch,
  Repeat,
  FileJson,
  Settings,
  Terminal,
  Info,
  ArrowRight,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { ChainStep, ChainExecution } from '@/types/chain-types';
import { ChainExecutionEngine, ExecutionOptions } from '@/lib/chain-execution-engine';
import { toast } from '@/lib/toast-config';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ChainTestPanelProps {
  chainId: string;
  steps: ChainStep[];
  defaultInputs?: Record<string, any>;
  workspaceId: string;
}

interface TestResult {
  stepId: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  duration?: number;
  tokens?: number;
  cost?: number;
}

interface Breakpoint {
  stepId: string;
  enabled: boolean;
  condition?: string;
}

export function ChainTestPanel({ chainId, steps, defaultInputs = {}, workspaceId }: ChainTestPanelProps) {
  const [mode, setMode] = useState<'test' | 'debug'>('test');
  const [inputs, setInputs] = useState<Record<string, any>>(defaultInputs);
  const [mockData, setMockData] = useState<Record<string, any>>({});
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [execution, setExecution] = useState<ChainExecution | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [debugLog, setDebugLog] = useState<Array<{ timestamp: string; message: string; data?: any }>>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  
  // Test options
  const [options, setOptions] = useState<ExecutionOptions>({
    stopOnError: true,
    maxParallel: 5,
    timeout: 60000,
    dryRun: false,
    debug: true,
    mockMode: false,
  });

  const handleRunTest = async () => {
    setIsRunning(true);
    setIsPaused(false);
    setTestResults({});
    setDebugLog([]);
    setCurrentStep(null);

    try {
      // Create execution context
      const executionContext: ChainExecution = {
        id: `test-${Date.now()}`,
        chainId,
        workspaceId,
        status: 'pending',
        variables: { ...inputs },
        results: {},
        errors: [],
        completedSteps: [],
        stepResults: {},
        startTime: new Date().toISOString(),
        options,
      };

      setExecution(executionContext);

      // Initialize engine
      const engine = new ChainExecutionEngine(executionContext, {
        ...options,
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        provider: 'openai',
      });

      // Add breakpoints to steps
      const stepsWithBreakpoints = steps.map(step => ({
        ...step,
        breakpoint: breakpoints.find(bp => bp.stepId === step.id && bp.enabled)?.enabled || false,
        mockOutput: mockData[step.id],
      }));

      // Execute
      const result = await engine.execute(stepsWithBreakpoints);
      setExecution(result);

      // Update test results
      const results: Record<string, TestResult> = {};
      Object.entries(result.stepResults).forEach(([stepId, stepResult]) => {
        results[stepId] = {
          stepId,
          status: stepResult.status,
          output: stepResult.output,
          error: stepResult.error,
          duration: stepResult.duration,
        };
      });
      setTestResults(results);

      // Get debug log
      setDebugLog(engine.getDebugLog());

      if (result.status === 'completed') {
        toast.success('Chain test completed successfully');
      } else if (result.status === 'failed') {
        toast.error(`Chain test failed: ${result.errors[0]?.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Test execution error:', error);
      toast.error('Failed to execute chain test');
    } finally {
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    // TODO: Implement pause functionality in engine
  };

  const handleResume = () => {
    setIsPaused(false);
    // TODO: Implement resume functionality in engine
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(null);
    // TODO: Implement stop functionality in engine
  };

  const handleSkipStep = () => {
    // TODO: Implement skip step functionality
  };

  const toggleBreakpoint = (stepId: string) => {
    setBreakpoints(prev => {
      const existing = prev.find(bp => bp.stepId === stepId);
      if (existing) {
        return prev.map(bp => 
          bp.stepId === stepId ? { ...bp, enabled: !bp.enabled } : bp
        );
      } else {
        return [...prev, { stepId, enabled: true }];
      }
    });
  };

  const handleExportResults = () => {
    const data = {
      execution,
      testResults,
      debugLog,
      inputs,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chain-test-${chainId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Test results exported');
  };

  const handleImportMockData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setMockData(data);
        toast.success('Mock data imported');
      } catch (error) {
        toast.error('Invalid mock data file');
      }
    };
    reader.readAsText(file);
  };

  const getStepIcon = (type: StepType) => {
    switch (type) {
      case 'condition':
        return <GitBranch className="w-4 h-4" />;
      case 'loop':
        return <Repeat className="w-4 h-4" />;
      case 'api_call':
        return <Globe className="w-4 h-4" />;
      case 'transformation':
        return <FileJson className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'skipped':
        return <SkipForward className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Chain Testing & Debugging</h3>
          <p className="text-sm text-gray-600">
            Test your chain with mock data and debug step-by-step
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={mode === 'test' ? 'default' : 'secondary'}>
            {mode === 'test' ? 'Test Mode' : 'Debug Mode'}
          </Badge>
          <Switch
            checked={mode === 'debug'}
            onCheckedChange={(checked) => setMode(checked ? 'debug' : 'test')}
          />
        </div>
      </div>

      <Tabs defaultValue="inputs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inputs">Inputs & Settings</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          {mode === 'debug' && <TabsTrigger value="debug">Debug Log</TabsTrigger>}
        </TabsList>

        {/* Inputs Tab */}
        <TabsContent value="inputs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Inputs</CardTitle>
              <CardDescription>
                Configure input variables for your test run
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.keys(defaultInputs).map(key => (
                <div key={key}>
                  <Label htmlFor={key}>{key}</Label>
                  <Textarea
                    id={key}
                    value={inputs[key] || ''}
                    onChange={(e) => setInputs({ ...inputs, [key]: e.target.value })}
                    placeholder={`Enter value for ${key}`}
                    className="mt-1"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Options</CardTitle>
              <CardDescription>
                Configure how the test should be executed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="stop-on-error">Stop on Error</Label>
                  <Switch
                    id="stop-on-error"
                    checked={options.stopOnError}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, stopOnError: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="dry-run">Dry Run</Label>
                  <Switch
                    id="dry-run"
                    checked={options.dryRun}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, dryRun: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="mock-mode">Mock Mode</Label>
                  <Switch
                    id="mock-mode"
                    checked={options.mockMode}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, mockMode: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="debug">Debug Output</Label>
                  <Switch
                    id="debug"
                    checked={options.debug}
                    onCheckedChange={(checked) => 
                      setOptions({ ...options, debug: checked })
                    }
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-parallel">Max Parallel Steps</Label>
                <Input
                  id="max-parallel"
                  type="number"
                  value={options.maxParallel || 5}
                  onChange={(e) => 
                    setOptions({ ...options, maxParallel: Number(e.target.value) })
                  }
                  min={1}
                  max={10}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  value={(options.timeout || 60000) / 1000}
                  onChange={(e) => 
                    setOptions({ ...options, timeout: Number(e.target.value) * 1000 })
                  }
                  min={1}
                  max={300}
                />
              </div>
            </CardContent>
          </Card>

          {options.mockMode && (
            <Card>
              <CardHeader>
                <CardTitle>Mock Data</CardTitle>
                <CardDescription>
                  Configure mock outputs for each step
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end mb-4">
                  <Button variant="outline" size="sm" asChild>
                    <label>
                      <Upload className="w-4 h-4 mr-1" />
                      Import Mock Data
                      <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportMockData}
                      />
                    </label>
                  </Button>
                </div>
                <Accordion type="multiple">
                  {steps.map(step => (
                    <AccordionItem key={step.id} value={step.id}>
                      <AccordionTrigger>
                        <div className="flex items-center gap-2">
                          {getStepIcon(step.type)}
                          <span>{step.name}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Textarea
                          value={mockData[step.id] ? JSON.stringify(mockData[step.id], null, 2) : ''}
                          onChange={(e) => {
                            try {
                              const data = JSON.parse(e.target.value);
                              setMockData({ ...mockData, [step.id]: data });
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          placeholder="Enter mock output as JSON"
                          className="font-mono text-sm h-32"
                        />
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Execution Tab */}
        <TabsContent value="execution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Control</CardTitle>
              <CardDescription>
                Run and control your chain test execution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-6">
                {!isRunning ? (
                  <Button onClick={handleRunTest} className="flex-1">
                    <Play className="w-4 h-4 mr-1" />
                    Run Test
                  </Button>
                ) : isPaused ? (
                  <>
                    <Button onClick={handleResume} className="flex-1">
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                    <Button onClick={handleStop} variant="destructive">
                      <StopCircle className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handlePause} variant="secondary" className="flex-1">
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                    <Button onClick={handleStop} variant="destructive">
                      <StopCircle className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  </>
                )}
                {mode === 'debug' && isRunning && (
                  <Button onClick={handleSkipStep} variant="outline">
                    <SkipForward className="w-4 h-4 mr-1" />
                    Skip Step
                  </Button>
                )}
              </div>

              {/* Step List */}
              <div className="space-y-2">
                {steps.map((step, index) => {
                  const result = testResults[step.id];
                  const isCurrentStep = currentStep === step.id;
                  const hasBreakpoint = breakpoints.find(bp => bp.stepId === step.id)?.enabled;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                        isCurrentStep && 'bg-blue-50 border-blue-300',
                        result?.status === 'failed' && 'bg-red-50 border-red-300',
                        result?.status === 'success' && 'bg-green-50 border-green-300',
                      )}
                    >
                      {mode === 'debug' && (
                        <Checkbox
                          checked={hasBreakpoint}
                          onCheckedChange={() => toggleBreakpoint(step.id)}
                          className="data-[state=checked]:bg-red-600"
                        />
                      )}
                      <div className="flex items-center gap-2 flex-1">
                        <span className="text-sm text-gray-500">#{index + 1}</span>
                        {getStepIcon(step.type)}
                        <span className="font-medium">{step.name}</span>
                        {step.condition && (
                          <Badge variant="outline" className="text-xs">
                            Conditional
                          </Badge>
                        )}
                        {step.parallelGroup && (
                          <Badge variant="outline" className="text-xs">
                            Parallel #{step.parallelGroup}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {result && (
                          <>
                            {getStatusIcon(result.status)}
                            {result.duration && (
                              <span className="text-xs text-gray-500">
                                {(result.duration / 1000).toFixed(2)}s
                              </span>
                            )}
                            {result.cost && (
                              <span className="text-xs text-gray-500">
                                ${(result.cost / 100).toFixed(3)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {execution && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <Badge
                      variant={
                        execution.status === 'completed' ? 'success' :
                        execution.status === 'failed' ? 'destructive' :
                        'default'
                      }
                    >
                      {execution.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium">
                      {execution.endTime 
                        ? `${((new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()) / 1000).toFixed(2)}s`
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="font-medium">
                      ${((execution.totalCost || 0) / 100).toFixed(3)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="font-medium">{execution.totalTokens || 0}</p>
                  </div>
                </div>

                {execution.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                    {execution.errors.map((error, i) => (
                      <p key={i} className="text-sm text-red-700">
                        Step {error.stepId}: {error.error}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Step Results</CardTitle>
              <CardDescription>
                Detailed results for each executed step
              </CardDescription>
              {Object.keys(testResults).length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportResults}
                  className="ml-auto"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Results
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" value={Array.from(expandedSteps)}>
                {steps.map(step => {
                  const result = testResults[step.id];
                  if (!result) return null;

                  return (
                    <AccordionItem key={step.id} value={step.id}>
                      <AccordionTrigger
                        onClick={() => {
                          const newExpanded = new Set(expandedSteps);
                          if (newExpanded.has(step.id)) {
                            newExpanded.delete(step.id);
                          } else {
                            newExpanded.add(step.id);
                          }
                          setExpandedSteps(newExpanded);
                        }}
                      >
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(result.status)}
                            <span>{step.name}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {result.duration && (
                              <span>{(result.duration / 1000).toFixed(2)}s</span>
                            )}
                            {result.tokens && (
                              <span>{result.tokens} tokens</span>
                            )}
                            {result.cost && (
                              <span>${(result.cost / 100).toFixed(3)}</span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-3">
                          {result.error && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-medium text-red-800">Error:</p>
                              <p className="text-sm text-red-700 mt-1">{result.error}</p>
                            </div>
                          )}
                          {result.output && (
                            <div>
                              <p className="text-sm font-medium mb-1">Output:</p>
                              <pre className="text-sm bg-gray-50 p-3 rounded-lg overflow-x-auto">
                                {JSON.stringify(result.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Debug Log Tab */}
        {mode === 'debug' && (
          <TabsContent value="debug">
            <Card>
              <CardHeader>
                <CardTitle>Debug Log</CardTitle>
                <CardDescription>
                  Detailed execution log for debugging
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {debugLog.map((entry, i) => (
                    <div key={i} className="flex gap-3 text-sm font-mono">
                      <span className="text-gray-500 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-gray-700">{entry.message}</span>
                      {entry.data && (
                        <span className="text-gray-500">
                          {JSON.stringify(entry.data)}
                        </span>
                      )}
                    </div>
                  ))}
                  {debugLog.length === 0 && (
                    <p className="text-sm text-gray-500">No debug output yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}