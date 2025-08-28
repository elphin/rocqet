'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Database, 
  Variable, 
  Code2, 
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Trash2,
  Edit,
  AlertTriangle,
  Table,
  History,
  Settings,
  Link2
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface PageProps {
  params: Promise<{ workspace: string; id: string }>;
}

interface Query {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  sql_template: string;
  variables_schema: any[];
  is_read_only: boolean;
  requires_approval: boolean;
  connection_id: string;
  database_connections?: {
    id: string;
    name: string;
    type: string;
  };
  created_at: string;
  updated_at: string;
}

interface QueryRun {
  id: string;
  status: string;
  rows_returned: number;
  rows_affected: number;
  execution_time_ms: number;
  error_message: string;
  executed_at: string;
  parameters: any;
  result_data: any;
}

export default function QueryDetailPage({ params }: PageProps) {
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [queryId, setQueryId] = useState('');
  const [query, setQuery] = useState<Query | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sqlTemplate, setSqlTemplate] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [variables, setVariables] = useState<any[]>([]);
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [queryRuns, setQueryRuns] = useState<QueryRun[]>([]);
  const [activeTab, setActiveTab] = useState('query');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then(p => {
      setWorkspaceSlug(p.workspace);
      setQueryId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (queryId && workspaceSlug) {
      loadQuery();
      loadQueryRuns();
    }
  }, [queryId, workspaceSlug]);

  useEffect(() => {
    // Extract variables from SQL template
    const variableRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g;
    const foundVariables: any[] = [];
    let match;

    while ((match = variableRegex.exec(sqlTemplate)) !== null) {
      const [, varName, defaultValue] = match;
      if (!foundVariables.find(v => v.name === varName)) {
        foundVariables.push({
          name: varName,
          type: 'text',
          default: defaultValue,
          required: !defaultValue
        });
      }
    }

    setVariables(foundVariables);
  }, [sqlTemplate]);

  async function loadQuery() {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select(`
          *,
          database_connections (
            id,
            name,
            type
          )
        `)
        .eq('id', queryId)
        .single();

      if (error) throw error;

      setQuery(data);
      setName(data.name);
      setDescription(data.description || '');
      setSqlTemplate(data.sql_template);
      setIsReadOnly(data.is_read_only);
      setRequiresApproval(data.requires_approval);
      
      // Initialize test values with defaults
      if (data.variables_schema) {
        const defaults: Record<string, any> = {};
        data.variables_schema.forEach((v: any) => {
          if (v.default) {
            defaults[v.name] = v.default;
          }
        });
        setTestValues(defaults);
      }
    } catch (error: any) {
      toast.error('Failed to load query');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadQueryRuns() {
    try {
      const { data, error } = await supabase
        .from('query_runs')
        .select('*')
        .eq('query_id', queryId)
        .order('executed_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setQueryRuns(data || []);
    } catch (error: any) {
      console.error('Failed to load query runs:', error);
    }
  }

  function substituteVariables(sql: string, values: Record<string, any>): string {
    return sql.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (match, varName, defaultValue) => {
      const value = values[varName] ?? defaultValue ?? '';
      // Escape single quotes for SQL
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }
      return String(value);
    });
  }

  async function runQuery() {
    if (!query) return;

    setRunning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Substitute variables
      const sqlToExecute = substituteVariables(sqlTemplate, testValues);

      // Record the run
      const { data: runRecord, error: runError } = await supabase
        .from('query_runs')
        .insert({
          query_id: queryId,
          workspace_id: query.workspace_id,
          user_id: user.id,
          parameters: testValues,
          sql_executed: sqlToExecute,
          status: 'success',
          rows_returned: 0,
          execution_time_ms: Math.floor(Math.random() * 1000),
          result_data: { 
            message: 'Query executed successfully (simulation)',
            preview: [
              { id: 1, name: 'Sample Row 1', created_at: new Date().toISOString() },
              { id: 2, name: 'Sample Row 2', created_at: new Date().toISOString() },
            ]
          }
        })
        .select()
        .single();

      if (runError) throw runError;

      // For MVP, we simulate the results
      setResults({
        status: 'success',
        data: runRecord.result_data.preview,
        rowCount: 2,
        executionTime: runRecord.execution_time_ms,
        sql: sqlToExecute
      });

      // Reload runs
      loadQueryRuns();
      
      toast.success('Query executed successfully');
      setActiveTab('results');
    } catch (error: any) {
      toast.error(error.message);
      setResults({
        status: 'error',
        message: error.message
      });
    } finally {
      setRunning(false);
    }
  }

  async function saveQuery() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('queries')
        .update({
          name,
          description,
          sql_template: sqlTemplate,
          variables_schema: variables,
          is_read_only: isReadOnly,
          requires_approval: requiresApproval,
          updated_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', queryId);

      if (error) throw error;

      toast.success('Query updated successfully');
      setEditing(false);
      loadQuery();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuery() {
    if (!confirm('Are you sure you want to delete this query?')) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('queries')
        .delete()
        .eq('id', queryId);

      if (error) throw error;

      toast.success('Query deleted successfully');
      router.push(`/${workspaceSlug}/queries`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Query not found</p>
        <Link href={`/${workspaceSlug}/queries`}>
          <Button className="mt-4">Back to Queries</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${workspaceSlug}/queries`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                {editing ? (
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="text-2xl font-semibold"
                  />
                ) : (
                  <h1 className="text-2xl font-semibold">{query.name}</h1>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="gap-1">
                    <Database className="h-3 w-3" />
                    {query.database_connections?.name}
                  </Badge>
                  {query.is_read_only ? (
                    <Badge variant="secondary">Read Only</Badge>
                  ) : (
                    <Badge variant="destructive">Write Access</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    Updated {format(new Date(query.updated_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveQuery} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </>
              ) : (
                <>
                  <Link href={`/${workspaceSlug}/chains/new-advanced`}>
                    <Button variant="outline">
                      <Link2 className="h-4 w-4 mr-2" />
                      Use in Chain
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={deleteQuery} disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button onClick={runQuery} disabled={running}>
                    <Play className="h-4 w-4 mr-2" />
                    Run Query
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="query" className="gap-2">
                <Code2 className="h-4 w-4" />
                Query
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-2">
                <Table className="h-4 w-4" />
                Results
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                History
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="query">
              <div className="grid grid-cols-12 gap-6">
                {/* SQL Editor */}
                <div className="col-span-8">
                  <Card className="p-6">
                    {editing && (
                      <div className="mb-4">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="What does this query do?"
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                    )}
                    
                    <div>
                      <Label htmlFor="sql">SQL Template</Label>
                      <div className="mt-2 relative">
                        <Textarea
                          id="sql"
                          value={sqlTemplate}
                          onChange={(e) => editing && setSqlTemplate(e.target.value)}
                          readOnly={!editing}
                          rows={20}
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => {
                            navigator.clipboard.writeText(sqlTemplate);
                            toast.success('SQL copied to clipboard');
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Use {'{{variable}}'} for dynamic values, {'{{variable:default}}'} for defaults
                      </p>
                    </div>

                    {editing && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t">
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="readonly"
                              checked={isReadOnly}
                              onCheckedChange={setIsReadOnly}
                            />
                            <Label htmlFor="readonly" className="text-sm cursor-pointer">
                              Read Only
                            </Label>
                          </div>
                          
                          {!isReadOnly && (
                            <div className="flex items-center gap-2">
                              <Switch
                                id="approval"
                                checked={requiresApproval}
                                onCheckedChange={setRequiresApproval}
                              />
                              <Label htmlFor="approval" className="text-sm cursor-pointer">
                                Requires Approval
                              </Label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>

                {/* Variables Panel */}
                <div className="col-span-4">
                  {variables.length > 0 && (
                    <Card className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Variable className="h-4 w-4" />
                        <h3 className="font-medium">Query Variables</h3>
                      </div>
                      <div className="space-y-3">
                        {variables.map(variable => (
                          <div key={variable.name}>
                            <Label htmlFor={variable.name} className="text-sm">
                              {variable.name} {variable.required && '*'}
                            </Label>
                            <Input
                              id={variable.name}
                              value={testValues[variable.name] ?? variable.default ?? ''}
                              onChange={(e) => setTestValues({
                                ...testValues,
                                [variable.name]: e.target.value
                              })}
                              placeholder={variable.default ? `Default: ${variable.default}` : 'Enter test value'}
                              className="mt-1"
                            />
                          </div>
                        ))}
                      </div>
                      <Button 
                        onClick={runQuery} 
                        disabled={running}
                        className="w-full mt-4"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Run with Test Values
                      </Button>
                    </Card>
                  )}

                  {!isReadOnly && (
                    <Card className="p-6 mt-4 border-orange-200 bg-orange-50">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <h3 className="font-medium text-orange-900">Write Access</h3>
                      </div>
                      <p className="text-sm text-orange-800">
                        This query can modify data. Use with caution.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results">
              <Card className="p-6">
                {results ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">Query Results</h3>
                      <div className="flex items-center gap-4">
                        {results.status === 'success' && (
                          <>
                            <Badge variant="outline" className="bg-green-50">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {results.rowCount} rows • {results.executionTime}ms
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {results.sql && (
                      <div className="bg-muted p-3 rounded-md mb-4">
                        <p className="text-xs text-muted-foreground mb-1">Executed SQL:</p>
                        <pre className="text-xs font-mono overflow-x-auto">{results.sql}</pre>
                      </div>
                    )}

                    {results.data && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(results.data[0]).map(key => (
                                <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {results.data.map((row: any, idx: number) => (
                              <tr key={idx}>
                                {Object.values(row).map((value: any, i) => (
                                  <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {String(value)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {results.status === 'error' && (
                      <div className="text-red-600">
                        <p className="font-medium">Error:</p>
                        <p className="text-sm mt-1">{results.message}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Table className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No results yet. Run the query to see results.
                    </p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card className="p-6">
                <h3 className="font-medium mb-4">Execution History</h3>
                {queryRuns.length > 0 ? (
                  <div className="space-y-3">
                    {queryRuns.map(run => (
                      <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {run.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(run.executed_at), 'MMM d, yyyy h:mm a')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {run.rows_returned || 0} rows • {run.execution_time_ms}ms
                            </p>
                          </div>
                        </div>
                        {run.parameters && Object.keys(run.parameters).length > 0 && (
                          <Badge variant="outline">
                            {Object.keys(run.parameters).length} params
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No execution history yet
                  </p>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <Card className="p-6">
                <h3 className="font-medium mb-4">Query Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Query ID</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                        {query.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(query.id);
                          toast.success('ID copied');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label>Created</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(query.created_at), 'PPP')}
                    </p>
                  </div>

                  <div>
                    <Label>Last Updated</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(query.updated_at), 'PPP')}
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}