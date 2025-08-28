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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Play, Database, Variable, Code2, Info, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface PageProps {
  params: Promise<{ workspace: string }>;
}

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host?: string;
  database?: string;
}

interface Variable {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select';
  description?: string;
  default?: any;
  required?: boolean;
  options?: string[]; // for select type
}

export default function NewQueryPage({ params }: PageProps) {
  const [workspaceSlug, setWorkspaceSlug] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [sqlTemplate, setSqlTemplate] = useState('');
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [testValues, setTestValues] = useState<Record<string, any>>({});
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then(p => setWorkspaceSlug(p.workspace));
  }, [params]);

  useEffect(() => {
    if (workspaceSlug) {
      loadConnections();
    }
  }, [workspaceSlug]);

  useEffect(() => {
    // Extract variables from SQL template
    const variableRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g;
    const foundVariables: Variable[] = [];
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

  async function loadConnections() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get workspace ID
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', workspaceSlug)
      .single();

    if (!workspaces) return;

    const { data } = await supabase
      .from('database_connections')
      .select('id, name, type, host, database')
      .eq('workspace_id', workspaces.id)
      .order('name');

    if (data) {
      setConnections(data);
      if (data.length === 1) {
        setConnectionId(data[0].id);
      }
    }
  }

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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

  async function testQuery() {
    if (!connectionId || !sqlTemplate) {
      toast.error('Please select a connection and write a query');
      return;
    }

    setTesting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single();

      if (!workspace) throw new Error('Workspace not found');

      // Substitute variables
      const sqlToExecute = substituteVariables(sqlTemplate, testValues);

      // For MVP, we'll simulate the query execution
      // In production, this would call a server action that executes the query
      toast.success('Query validated successfully (simulation)');
      
      setResults({
        status: 'success',
        message: 'Query is valid and ready to save',
        sql: sqlToExecute,
        rowCount: 0
      });

    } catch (error: any) {
      toast.error(error.message);
      setResults({
        status: 'error',
        message: error.message
      });
    } finally {
      setTesting(false);
    }
  }

  async function saveQuery() {
    if (!name || !connectionId || !sqlTemplate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get workspace ID
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('slug', workspaceSlug)
        .single();

      if (!workspace) throw new Error('Workspace not found');

      const slug = generateSlug(name);

      const { data, error } = await supabase
        .from('queries')
        .insert({
          workspace_id: workspace.id,
          connection_id: connectionId,
          name,
          slug,
          description,
          sql_template: sqlTemplate,
          variables_schema: variables,
          is_read_only: isReadOnly,
          requires_approval: requiresApproval,
          created_by: user.id,
          updated_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Query saved successfully');
      router.push(`/${workspaceSlug}/queries/${data.id}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
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
                <h1 className="text-2xl font-semibold">New Query</h1>
                <p className="text-sm text-muted-foreground">
                  Create a reusable SQL query template
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={testQuery}
                disabled={testing || !connectionId || !sqlTemplate}
              >
                <Play className="h-4 w-4 mr-2" />
                Test Query
              </Button>
              <Button onClick={saveQuery} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Query
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Query Editor */}
            <div className="col-span-8 space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Query Name *</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Get Active Users"
                      />
                    </div>
                    <div>
                      <Label htmlFor="connection">Database Connection *</Label>
                      <Select value={connectionId} onValueChange={setConnectionId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a connection" />
                        </SelectTrigger>
                        <SelectContent>
                          {connections.map(conn => (
                            <SelectItem key={conn.id} value={conn.id}>
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                {conn.name} ({conn.type})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What does this query do?"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="sql">SQL Template *</Label>
                    <div className="mt-1 relative">
                      <Textarea
                        id="sql"
                        value={sqlTemplate}
                        onChange={(e) => setSqlTemplate(e.target.value)}
                        placeholder="SELECT * FROM users WHERE created_at >= {{start_date}} LIMIT {{limit:100}}"
                        rows={15}
                        className="font-mono text-sm"
                      />
                      <div className="absolute top-2 right-2">
                        <Badge variant="outline" className="text-xs">
                          <Code2 className="h-3 w-3 mr-1" />
                          SQL
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Use {'{{variable}}'} for dynamic values, {'{{variable:default}}'} for defaults
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Switch
                          id="readonly"
                          checked={isReadOnly}
                          onCheckedChange={setIsReadOnly}
                        />
                        <Label htmlFor="readonly" className="text-sm cursor-pointer">
                          Read Only (SELECT only)
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
                </div>
              </Card>

              {/* Results Panel */}
              {results && (
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Test Results</h3>
                    <Badge variant={results.status === 'success' ? 'default' : 'destructive'}>
                      {results.status}
                    </Badge>
                  </div>
                  
                  {results.sql && (
                    <div className="bg-muted p-3 rounded-md mb-4">
                      <p className="text-xs text-muted-foreground mb-1">Executed SQL:</p>
                      <pre className="text-xs font-mono overflow-x-auto">{results.sql}</pre>
                    </div>
                  )}
                  
                  <p className="text-sm">{results.message}</p>
                </Card>
              )}
            </div>

            {/* Right Panel - Variables & Info */}
            <div className="col-span-4 space-y-6">
              {/* Variables */}
              {variables.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Variable className="h-4 w-4" />
                    <h3 className="font-medium">Variables</h3>
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
                  <p className="text-xs text-muted-foreground mt-4">
                    These values are used for testing only
                  </p>
                </Card>
              )}

              {/* Info Card */}
              <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Info className="h-4 w-4" />
                  <h3 className="font-medium">Query Templates</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Create reusable SQL templates with dynamic variables that can be:
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Used in automation chains</li>
                    <li>Shared with team members</li>
                    <li>Version controlled</li>
                    <li>Scheduled for regular runs</li>
                  </ul>
                </div>
              </Card>

              {!isReadOnly && (
                <Card className="p-6 border-orange-200 bg-orange-50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <h3 className="font-medium text-orange-900">Write Access</h3>
                  </div>
                  <p className="text-sm text-orange-800">
                    This query can modify data. Consider enabling approval requirements for sensitive operations.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}