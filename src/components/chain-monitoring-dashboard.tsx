'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle,
  RefreshCw,
  Download,
  Bell,
  BarChart,
  LineChart,
  PieChart,
  Timer,
  Zap,
  AlertCircle,
  Eye,
  Pause,
  Play,
  StopCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/lib/toast-config';
import { cn } from '@/lib/utils';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface ChainMonitoringDashboardProps {
  workspaceId: string;
  chainId?: string;
}

interface ChainMetrics {
  totalRuns: number;
  successRate: number;
  averageExecutionTime: number;
  totalCost: number;
  activeRuns: number;
  failedRuns: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  slaCompliance: number;
  errorRate: number;
  throughput: number;
  concurrency: number;
}

interface ChainRun {
  id: string;
  chainName: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  startedAt: string;
  completedAt?: string;
  executionTime?: number;
  totalSteps: number;
  completedSteps: number;
  cost?: number;
  tokens?: number;
  error?: string;
  executedBy: string;
}

interface Alert {
  id: string;
  type: 'failure' | 'sla_breach' | 'cost_threshold' | 'error_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
  chainName?: string;
}

const COLORS = {
  success: '#10b981',
  failure: '#ef4444',
  running: '#3b82f6',
  cancelled: '#6b7280',
  paused: '#f59e0b',
};

export function ChainMonitoringDashboard({ workspaceId, chainId }: ChainMonitoringDashboardProps) {
  const [timeRange, setTimeRange] = useState('24h');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedRun, setSelectedRun] = useState<string | null>(null);

  // Fetch metrics
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['chain-metrics', workspaceId, chainId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId,
        timeRange,
        ...(chainId && { chainId }),
      });
      const response = await fetch(`/api/chains/metrics?${params}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      return response.json() as Promise<ChainMetrics>;
    },
    refetchInterval: refreshInterval,
  });

  // Fetch recent runs
  const { data: runs, isLoading: runsLoading, refetch: refetchRuns } = useQuery({
    queryKey: ['chain-runs', workspaceId, chainId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId,
        timeRange,
        ...(chainId && { chainId }),
      });
      const response = await fetch(`/api/chains/runs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch runs');
      return response.json() as Promise<ChainRun[]>;
    },
    refetchInterval: refreshInterval,
  });

  // Fetch alerts
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['chain-alerts', workspaceId, chainId],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId,
        ...(chainId && { chainId }),
      });
      const response = await fetch(`/api/chains/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json() as Promise<Alert[]>;
    },
    refetchInterval: refreshInterval,
  });

  // Fetch time series data for charts
  const { data: timeSeries } = useQuery({
    queryKey: ['chain-time-series', workspaceId, chainId, timeRange],
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId,
        timeRange,
        ...(chainId && { chainId }),
      });
      const response = await fetch(`/api/chains/time-series?${params}`);
      if (!response.ok) throw new Error('Failed to fetch time series');
      return response.json();
    },
    refetchInterval: refreshInterval,
  });

  const handleRefresh = () => {
    refetchMetrics();
    refetchRuns();
    refetchAlerts();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        workspaceId,
        timeRange,
        ...(chainId && { chainId }),
      });
      const response = await fetch(`/api/chains/export?${params}`);
      if (!response.ok) throw new Error('Failed to export data');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chain-metrics-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success('Metrics exported successfully');
    } catch (error) {
      toast.error('Failed to export metrics');
    }
  };

  const handleCancelRun = async (runId: string) => {
    try {
      const response = await fetch(`/api/chains/runs/${runId}/cancel`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to cancel run');
      
      toast.success('Run cancelled successfully');
      refetchRuns();
    } catch (error) {
      toast.error('Failed to cancel run');
    }
  };

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/chains/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to acknowledge alert');
      
      toast.success('Alert acknowledged');
      refetchAlerts();
    } catch (error) {
      toast.error('Failed to acknowledge alert');
    }
  };

  const getStatusIcon = (status: ChainRun['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <StopCircle className="w-4 h-4" />;
      case 'paused':
        return <Pause className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: ChainRun['status']) => {
    switch (status) {
      case 'running':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      case 'paused':
        return 'text-yellow-600';
    }
  };

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
    }
  };

  if (metricsLoading || runsLoading || alertsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chain Monitoring</h2>
          <p className="text-gray-600">
            Real-time monitoring and analytics for your prompt chains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select 
            value={refreshInterval.toString()} 
            onValueChange={(v) => setRefreshInterval(Number(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">No Auto-refresh</SelectItem>
              <SelectItem value="10000">10 seconds</SelectItem>
              <SelectItem value="30000">30 seconds</SelectItem>
              <SelectItem value="60000">1 minute</SelectItem>
              <SelectItem value="300000">5 minutes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts && alerts.filter(a => !a.acknowledged).length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts
                .filter(a => !a.acknowledged)
                .slice(0, 3)
                .map(alert => (
                  <div 
                    key={alert.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        {alert.chainName && (
                          <p className="text-sm text-gray-600">Chain: {alert.chainName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(alert.triggeredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Runs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">{metrics?.totalRuns || 0}</span>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>
            {metrics?.activeRuns && metrics.activeRuns > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                {metrics.activeRuns} active
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {metrics?.successRate ? `${metrics.successRate.toFixed(1)}%` : '0%'}
              </span>
              {metrics?.successRate && metrics.successRate >= 95 ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <Progress 
              value={metrics?.successRate || 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Execution Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                {metrics?.averageExecutionTime 
                  ? `${(metrics.averageExecutionTime / 1000).toFixed(1)}s`
                  : '0s'}
              </span>
              <Timer className="w-5 h-5 text-gray-400" />
            </div>
            {metrics?.p95ExecutionTime && (
              <p className="text-sm text-gray-600 mt-1">
                P95: {(metrics.p95ExecutionTime / 1000).toFixed(1)}s
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold">
                ${((metrics?.totalCost || 0) / 100).toFixed(2)}
              </span>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            {metrics?.throughput && (
              <p className="text-sm text-gray-600 mt-1">
                {metrics.throughput.toFixed(1)} runs/hr
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="volume">Volume</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Time Trend</CardTitle>
              <CardDescription>
                Average, P95, and P99 execution times over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsLineChart data={timeSeries?.performance || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="average" 
                    stroke="#3b82f6" 
                    name="Average"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p95" 
                    stroke="#f59e0b" 
                    name="P95"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="p99" 
                    stroke="#ef4444" 
                    name="P99"
                  />
                </RechartsLineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Run Volume</CardTitle>
              <CardDescription>
                Number of chain runs over time by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeries?.volume || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="completed" 
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981"
                    name="Completed"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="failed" 
                    stackId="1"
                    stroke="#ef4444" 
                    fill="#ef4444"
                    name="Failed"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cancelled" 
                    stackId="1"
                    stroke="#6b7280" 
                    fill="#6b7280"
                    name="Cancelled"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Distribution</CardTitle>
              <CardDescription>
                Types of errors encountered in chain executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={timeSeries?.errors || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(timeSeries?.errors || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cost" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Breakdown</CardTitle>
              <CardDescription>
                Cost analysis by chain and over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={timeSeries?.cost || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="cost" fill="#3b82f6" name="Cost ($)" />
                  <Bar dataKey="tokens" fill="#10b981" name="Tokens" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Runs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Runs</CardTitle>
          <CardDescription>
            Latest chain executions and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Executed By</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs?.slice(0, 10).map(run => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{run.chainName}</TableCell>
                  <TableCell>
                    <div className={cn('flex items-center gap-1', getStatusColor(run.status))}>
                      {getStatusIcon(run.status)}
                      <span className="capitalize">{run.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(run.completedSteps / run.totalSteps) * 100}
                        className="w-20 h-2"
                      />
                      <span className="text-sm text-gray-600">
                        {run.completedSteps}/{run.totalSteps}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    {run.executionTime 
                      ? `${(run.executionTime / 1000).toFixed(1)}s`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {run.cost ? `$${(run.cost / 100).toFixed(3)}` : '-'}
                  </TableCell>
                  <TableCell>{run.executedBy}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedRun(run.id)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {run.status === 'running' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelRun(run.id)}
                        >
                          <StopCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}