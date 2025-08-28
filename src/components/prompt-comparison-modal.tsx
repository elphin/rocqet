'use client';

import { useState, useMemo } from 'react';
import { 
  X, 
  ChevronDown, 
  Check, 
  TrendingUp, 
  TrendingDown,
  Zap,
  DollarSign,
  Clock,
  Hash,
  Settings,
  FileText,
  BarChart,
  Copy,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/toast-config';

interface PromptRun {
  id: string;
  prompt_id: string;
  input: any;
  output: string;
  model: string;
  parameters: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
  };
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  latency_ms?: number;
  cost?: number;
  status: string;
  executed_at: string;
  rating?: number;
}

interface ComparisonModalProps {
  runs: PromptRun[];
  onClose: () => void;
  onApplySettings: (run: PromptRun) => Promise<void>;
  onApplyContent: (run: PromptRun) => Promise<void>;
  onApplyBoth: (run: PromptRun) => Promise<void>;
}

export function PromptComparisonModal({
  runs,
  onClose,
  onApplySettings,
  onApplyContent,
  onApplyBoth
}: ComparisonModalProps) {
  const [selectedRunA, setSelectedRunA] = useState<PromptRun>(runs[0]);
  const [selectedRunB, setSelectedRunB] = useState<PromptRun>(runs[1] || runs[0]);
  const [winner, setWinner] = useState<'A' | 'B' | null>(null);
  const [activeTab, setActiveTab] = useState<'output' | 'prompt' | 'settings' | 'analysis'>('output');
  const [isApplying, setIsApplying] = useState(false);

  // Calculate metrics comparison
  const metrics = useMemo(() => {
    const costA = selectedRunA.cost || 0;
    const costB = selectedRunB.cost || 0;
    const tokensA = selectedRunA.total_tokens || 0;
    const tokensB = selectedRunB.total_tokens || 0;
    const speedA = selectedRunA.latency_ms || 0;
    const speedB = selectedRunB.latency_ms || 0;
    const ratingA = selectedRunA.rating || 0;
    const ratingB = selectedRunB.rating || 0;

    return {
      cost: {
        a: costA,
        b: costB,
        better: costA === costB ? null : (costA < costB ? 'A' : 'B'),
        diff: Math.abs(costA - costB),
        percentDiff: costB ? Math.round(((costA - costB) / costB) * 100) : 0
      },
      tokens: {
        a: tokensA,
        b: tokensB,
        better: tokensA === tokensB ? null : (tokensA < tokensB ? 'A' : 'B'),
        diff: Math.abs(tokensA - tokensB)
      },
      speed: {
        a: speedA,
        b: speedB,
        better: speedA === speedB ? null : (speedA < speedB ? 'A' : 'B'),
        diff: Math.abs(speedA - speedB)
      },
      rating: {
        a: ratingA,
        b: ratingB,
        better: ratingA === ratingB ? null : (ratingA > ratingB ? 'A' : 'B'),
        diff: Math.abs(ratingA - ratingB)
      }
    };
  }, [selectedRunA, selectedRunB]);

  // Extract provider from model
  const getProvider = (model: string) => {
    if (model?.includes('gpt')) return 'OpenAI';
    if (model?.includes('claude')) return 'Anthropic';
    if (model?.includes('gemini')) return 'Google';
    return 'Unknown';
  };

  const handleApply = async (type: 'settings' | 'content' | 'both') => {
    if (!winner) {
      toast.error('Please select a winner first');
      return;
    }

    const winningRun = winner === 'A' ? selectedRunA : selectedRunB;
    setIsApplying(true);

    try {
      if (type === 'settings') {
        await onApplySettings(winningRun);
        toast.success('Settings applied successfully');
      } else if (type === 'content') {
        await onApplyContent(winningRun);
        toast.success('Prompt content applied successfully');
      } else {
        await onApplyBoth(winningRun);
        toast.success('Settings and content applied successfully');
      }
      onClose();
    } catch (error) {
      toast.error('Failed to apply changes');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
      <div className="fixed inset-x-4 top-[calc(1rem+30px)] bottom-4 md:inset-x-8 md:top-[calc(2rem+30px)] md:bottom-8 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Compare Runs
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Winner:</span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="winner"
                      value="A"
                      checked={winner === 'A'}
                      onChange={() => setWinner('A')}
                      className="text-blue-600"
                    />
                    <span className="text-blue-600 font-medium">Run A</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="winner"
                      value="B"
                      checked={winner === 'B'}
                      onChange={() => setWinner('B')}
                      className="text-green-600"
                    />
                    <span className="text-green-600 font-medium">Run B</span>
                  </label>
                </div>
              </div>
              {winner && (
                <div className="flex items-center gap-2 ml-4 border-l pl-4 border-gray-300 dark:border-gray-600">
                  <span className="text-sm text-gray-500">Apply:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApply('settings')}
                    disabled={isApplying}
                    className="h-7 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Settings
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApply('content')}
                    disabled={isApplying}
                    className="h-7 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Prompt
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApply('both')}
                    disabled={isApplying}
                    className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Both
                  </Button>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Run Selection */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-600">Run A:</span>
              <select
                value={selectedRunA.id}
                onChange={(e) => {
                  const run = runs.find(r => r.id === e.target.value);
                  if (run) setSelectedRunA(run);
                }}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
              >
                {runs.map(run => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.executed_at).toLocaleString()} • {run.model} • {(run.parameters.temperature || 0).toFixed(1)} temp
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-green-600">Run B:</span>
              <select
                value={selectedRunB.id}
                onChange={(e) => {
                  const run = runs.find(r => r.id === e.target.value);
                  if (run) setSelectedRunB(run);
                }}
                className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
              >
                {runs.map(run => (
                  <option key={run.id} value={run.id}>
                    {new Date(run.executed_at).toLocaleString()} • {run.model} • {(run.parameters.temperature || 0).toFixed(1)} temp
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Comparison */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800">
          <div className="grid grid-cols-4 gap-4">
            {/* Cost */}
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cost</span>
                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">A: ${metrics.cost.a.toFixed(3)}</span>
                  {metrics.cost.better === 'A' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">B: ${metrics.cost.b.toFixed(3)}</span>
                  {metrics.cost.better === 'B' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                {metrics.cost.better && (
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.cost.better} is {Math.abs(metrics.cost.percentDiff)}% cheaper
                  </div>
                )}
              </div>
            </div>

            {/* Tokens */}
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Tokens</span>
                <Hash className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">A: {metrics.tokens.a.toLocaleString()}</span>
                  {metrics.tokens.better === 'A' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">B: {metrics.tokens.b.toLocaleString()}</span>
                  {metrics.tokens.better === 'B' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                {metrics.tokens.better && (
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.tokens.better} uses {metrics.tokens.diff} fewer
                  </div>
                )}
              </div>
            </div>

            {/* Speed */}
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Speed</span>
                <Clock className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">A: {(metrics.speed.a / 1000).toFixed(1)}s</span>
                  {metrics.speed.better === 'A' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">B: {(metrics.speed.b / 1000).toFixed(1)}s</span>
                  {metrics.speed.better === 'B' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                {metrics.speed.better && (
                  <div className="text-xs text-gray-500 mt-1">
                    {metrics.speed.better} is {(metrics.speed.diff / 1000).toFixed(1)}s faster
                  </div>
                )}
              </div>
            </div>

            {/* Quality */}
            <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Quality</span>
                <Sparkles className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs">A: {metrics.rating.a > 0 ? `${metrics.rating.a}/5` : 'Not rated'}</span>
                  {metrics.rating.better === 'A' && <span className="text-green-500 text-xs">✓</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">B: {metrics.rating.b > 0 ? `${metrics.rating.b}/5` : 'Not rated'}</span>
                  {metrics.rating.better === 'B' && <span className="text-green-500 text-xs">✓</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-2 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('output')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'output' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1.5" />
              Output
            </button>
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'prompt' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1.5" />
              Prompt
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Settings className="h-3.5 w-3.5 inline mr-1.5" />
              Settings
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                activeTab === 'analysis' 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <BarChart className="h-3.5 w-3.5 inline mr-1.5" />
              Analysis
            </button>
          </div>
        </div>

        {/* Content Comparison */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-2 gap-4 p-6">
            {/* Run A Panel */}
            <div className={`border-2 rounded-lg overflow-hidden ${
              winner === 'A' ? 'border-green-500' : 'border-gray-200 dark:border-neutral-700'
            }`}>
              <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-gray-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                    Run A • {getProvider(selectedRunA.model)} • {selectedRunA.model}
                  </span>
                  {winner === 'A' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                      Winner
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 overflow-auto h-[calc(100%-3rem)]">
                {activeTab === 'output' && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {selectedRunA.output || 'No output available'}
                  </div>
                )}
                {activeTab === 'prompt' && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {selectedRunA.input?.prompt_content || selectedRunA.input?.content || 'No prompt content available'}
                  </div>
                )}
                {activeTab === 'settings' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                      <span className="font-medium">{getProvider(selectedRunA.model)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="font-medium">{selectedRunA.model}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                      <span className="font-medium">{selectedRunA.parameters.temperature || 0.7}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Tokens:</span>
                      <span className="font-medium">{selectedRunA.parameters.max_tokens || 'Default'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Top P:</span>
                      <span className="font-medium">{selectedRunA.parameters.top_p || 1.0}</span>
                    </div>
                  </div>
                )}
                {activeTab === 'analysis' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Analysis coming soon...
                  </div>
                )}
              </div>
            </div>

            {/* Run B Panel */}
            <div className={`border-2 rounded-lg overflow-hidden ${
              winner === 'B' ? 'border-green-500' : 'border-gray-200 dark:border-neutral-700'
            }`}>
              <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-b border-gray-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Run B • {getProvider(selectedRunB.model)} • {selectedRunB.model}
                  </span>
                  {winner === 'B' && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                      Winner
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 overflow-auto h-[calc(100%-3rem)]">
                {activeTab === 'output' && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {selectedRunB.output || 'No output available'}
                  </div>
                )}
                {activeTab === 'prompt' && (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                    {selectedRunB.input?.prompt_content || selectedRunB.input?.content || 'No prompt content available'}
                  </div>
                )}
                {activeTab === 'settings' && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Provider:</span>
                      <span className="font-medium">{getProvider(selectedRunB.model)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Model:</span>
                      <span className="font-medium">{selectedRunB.model}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Temperature:</span>
                      <span className="font-medium">{selectedRunB.parameters.temperature || 0.7}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Max Tokens:</span>
                      <span className="font-medium">{selectedRunB.parameters.max_tokens || 'Default'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Top P:</span>
                      <span className="font-medium">{selectedRunB.parameters.top_p || 1.0}</span>
                    </div>
                  </div>
                )}
                {activeTab === 'analysis' && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Analysis coming soon...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}