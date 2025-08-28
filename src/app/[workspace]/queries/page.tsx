import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateWorkspaceAccess } from '@/lib/workspace/validate';
import Link from 'next/link';
import { Plus, Database, Search, Star, Clock, Play, Code2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  params: Promise<{ workspace: string }>;
  searchParams: Promise<{ search?: string; connection?: string; tag?: string }>;
}

async function QueriesContent({ 
  workspaceSlug, 
  searchQuery,
  connectionFilter,
  tagFilter 
}: { 
  workspaceSlug: string;
  searchQuery?: string;
  connectionFilter?: string;
  tagFilter?: string;
}) {
  const supabase = await createClient();
  
  // Get user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get workspace membership
  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  if (!membership) return null;

  const workspaceId = membership.workspaces.id;

  // Fetch queries with filters
  let queriesQuery = supabase
    .from('queries')
    .select(`
      *,
      database_connections (
        id,
        name,
        type
      ),
      query_runs (
        id,
        status,
        executed_at
      )
    `)
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  // Apply filters
  if (searchQuery) {
    queriesQuery = queriesQuery.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }
  
  if (connectionFilter) {
    queriesQuery = queriesQuery.eq('connection_id', connectionFilter);
  }

  const { data: queries = [] } = await queriesQuery;

  // Get all database connections for filter dropdown
  const { data: connections = [] } = await supabase
    .from('database_connections')
    .select('id, name, type')
    .eq('workspace_id', workspaceId)
    .order('name');

  // Get unique tags
  const allTags = new Set<string>();
  queries.forEach(q => {
    if (q.tags && Array.isArray(q.tags)) {
      q.tags.forEach(tag => allTags.add(tag));
    }
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Query Library</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and run SQL queries across your connected databases
              </p>
            </div>
            <Link href={`/${workspaceSlug}/queries/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Query
              </Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search queries..."
                className="pl-9"
                defaultValue={searchQuery}
              />
            </div>
            
            <select className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Connections</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>
                  {conn.name} ({conn.type})
                </option>
              ))}
            </select>

            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {queries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Database className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No queries yet</h2>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Create your first query to start automating database operations
            </p>
            <Link href={`/${workspaceSlug}/queries/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Query
              </Button>
            </Link>
          </div>
        ) : (
          <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queries.map((query) => {
              const lastRun = query.query_runs?.[0];
              
              return (
                <Link key={query.id} href={`/${workspaceSlug}/queries/${query.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium line-clamp-1">{query.name}</h3>
                        {query.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {query.description}
                          </p>
                        )}
                      </div>
                      {query.is_favorite && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 ml-2" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs">
                      <Badge variant="outline" className="gap-1">
                        <Database className="h-3 w-3" />
                        {query.database_connections?.name}
                      </Badge>
                      
                      {query.is_read_only ? (
                        <Badge variant="secondary">Read Only</Badge>
                      ) : (
                        <Badge variant="destructive">Write Access</Badge>
                      )}
                    </div>

                    {query.tags && query.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {query.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {query.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{query.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {lastRun && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last run: {new Date(lastRun.executed_at).toLocaleDateString()}
                        {lastRun.status === 'success' && (
                          <Badge variant="outline" className="text-xs bg-green-50">
                            Success
                          </Badge>
                        )}
                        {lastRun.status === 'error' && (
                          <Badge variant="outline" className="text-xs bg-red-50">
                            Failed
                          </Badge>
                        )}
                      </div>
                    )}
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function QueriesLoading() {
  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}

export default async function QueriesPage({ params, searchParams }: PageProps) {
  const { workspace: workspaceSlug } = await params;
  const { search, connection, tag } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  const membership = await validateWorkspaceAccess(workspaceSlug, user.id);
  if (!membership) {
    redirect('/dashboard');
    return null;
  }

  const workspace = membership.workspaces;

  // Check if workspace has pro or business tier - queries are not available on free tier
  if (!['pro', 'business'].includes(workspace.subscription_tier)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
              Query Library
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              Save and manage reusable SQL queries for your connected databases. This feature is available for Pro and Business workspaces.
            </p>
            <Link
              href={`/${workspaceSlug}/settings/billing`}
              className="inline-block bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-6 py-3 rounded-xl font-medium transition-colors"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<QueriesLoading />}>
      <QueriesContent 
        workspaceSlug={workspaceSlug}
        searchQuery={search}
        connectionFilter={connection}
        tagFilter={tag}
      />
    </Suspense>
  );
}