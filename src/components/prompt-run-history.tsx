'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  ChevronDown,
  ChevronRight,
  Eye,
  Copy,
  X,
  FileJson,
  FileText,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface RunHistoryProps {
  workspaceId: string;
  promptId?: string;
  promptName?: string;
}

interface PromptRun {
  id: string;
  prompt_id: string;
  executed_at: string;
  status: 'success' | 'error' | 'timeout';
  model: string;
  input: any;
  output: string;
  output_preview: string;
  tokens_used?: number;
  cost?: number;
  duration_ms?: number;
  error?: string;
  prompts?: {
    name: string;
    slug: string;
  };
  users?: {
    email: string;
    full_name: string;
  };
}

interface RunStats {
  total: number;
  successful: number;
  failed: number;
  avgDuration: number;
  totalCost: number;
  totalTokens: number;
}

export function PromptRunHistory({ workspaceId, promptId, promptName }: RunHistoryProps) {
  const [runs, setRuns] = useState<PromptRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stats, setStats] = useState<RunStats>({
    total: 0,
    successful: 0,
    failed: 0,
    avgDuration: 0,
    totalCost: 0,
    totalTokens: 0
  });
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detailed'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchRuns();
  }, [searchQuery, statusFilter, startDate, endDate, currentPage]);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        limit: pageSize.toString(),
        offset: ((currentPage - 1) * pageSize).toString(),
        status: statusFilter
      });

      if (promptId) params.append('prompt_id', promptId);
      if (searchQuery) params.append('q', searchQuery);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/prompts/runs/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs);
        setStats(data.stats);
        setTotalCount(data.total);
      }
    } catch (error) {
      console.error('Error fetching runs:', error);
      toast.error('Failed to load run history');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch('/api/prompts/runs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          promptId,
          format,
          filters: {
            status: statusFilter,
            startDate,
            endDate
          }
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt-runs-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success(`Exported runs as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error('Error exporting runs:', error);
      toast.error('Failed to export runs');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300';
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              Run History
            </h2>
            {promptName && (
              <p className="text-sm text-neutral-600 dark:text-gray-400 mt-1">
                For prompt: {promptName}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'list' ? 'detailed' : 'list')}
              className="border-neutral-200 dark:border-neutral-700"
            >
              <Eye className="h-4 w-4 mr-1" />
              {viewMode === 'list' ? 'Detailed' : 'List'} View
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-200 dark:border-neutral-700"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 hidden group-hover:block">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <FileJson className="h-3 w-3" />
                  Export JSON
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <FileText className="h-3 w-3" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
            <div className="flex items-center gap-2 text-neutral-600 dark:text-gray-400 text-xs mb-1">
              <Zap className="h-3 w-3" />
              Total Runs
            </div>
            <p className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
              {stats.total}
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-xs mb-1">
              <CheckCircle className="h-3 w-3" />
              Successful
            </div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              {stats.successful}
            </p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-xs mb-1">
              <XCircle className="h-3 w-3" />
              Failed
            </div>
            <p className="text-lg font-semibold text-red-700 dark:text-red-300">
              {stats.failed}
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs mb-1">
              <Clock className="h-3 w-3" />
              Avg Duration
            </div>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
              {stats.avgDuration}ms
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs mb-1">
              <Zap className="h-3 w-3" />
              Total Tokens
            </div>
            <p className="text-lg font-semibold text-purple-700 dark:text-purple-300">
              {stats.totalTokens.toLocaleString()}
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 text-xs mb-1">
              <DollarSign className="h-3 w-3" />
              Total Cost
            </div>
            <p className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">
              ${stats.totalCost.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in outputs..."
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-neutral-100 dark:bg-neutral-800' : ''}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filters
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2 block">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
                  >
                    <option value="all">All Status</option>
                    <option value="success">Success Only</option>
                    <option value="error">Errors Only</option>
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2 block">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="text-sm"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2 block">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setSearchQuery('');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Run List */}
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mt-4">Loading runs...</p>
          </div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-gray-400">No runs found</p>
            <p className="text-sm text-neutral-500 dark:text-gray-500 mt-1">
              {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Run some prompts to see history'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {runs.map((run) => (
              <div key={run.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedRun(expandedRun === run.id ? null : run.id)}
                >
                  <div className="flex items-start gap-3">
                    <button className="mt-1">
                      {expandedRun === run.id ? (
                        <ChevronDown className="h-4 w-4 text-neutral-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-neutral-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(run.status)}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(run.status)}`}>
                            {run.status}
                          </span>
                          <span className="text-sm text-neutral-600 dark:text-gray-400">
                            {run.model}
                          </span>
                          {!promptId && run.prompts && (
                            <span className="text-sm font-medium text-neutral-700 dark:text-gray-300">
                              {run.prompts.name}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-neutral-500 dark:text-gray-500">
                          {formatDistanceToNow(new Date(run.executed_at), { addSuffix: true })}
                        </span>
                      </div>

                      {/* Output Preview */}
                      {viewMode === 'detailed' && run.output_preview && (
                        <div className="mt-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                          <p className="text-sm text-neutral-700 dark:text-gray-300 font-mono">
                            {run.output_preview}
                          </p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500 dark:text-gray-500">
                        {run.duration_ms && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {run.duration_ms}ms
                          </span>
                        )}
                        {run.tokens_used && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {run.tokens_used} tokens
                          </span>
                        )}
                        {run.cost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${parseFloat(run.cost).toFixed(4)}
                          </span>
                        )}
                        {run.users && (
                          <span>
                            by {run.users.full_name || run.users.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedRun === run.id && (
                  <div className="px-4 pb-4 ml-7 space-y-4">
                    {/* Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300">Input</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(JSON.stringify(run.input, null, 2))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs font-mono text-neutral-700 dark:text-gray-300 overflow-x-auto">
                        {JSON.stringify(run.input, null, 2)}
                      </pre>
                    </div>

                    {/* Output */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-neutral-700 dark:text-gray-300">Output</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(run.output || run.error || '')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <pre className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs font-mono text-neutral-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
                        {run.status === 'error' ? run.error : run.output}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <p className="text-sm text-neutral-600 dark:text-gray-400">
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} runs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-neutral-600 dark:text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}