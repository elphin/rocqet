import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Search, Filter, MoreVertical, GitBranch, Clock, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function PromptsPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Get workspace (use most recently joined if multiple)
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces (
        id,
        name,
        slug,
        description
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1);

  if (!workspaceMembers || workspaceMembers.length === 0) {
    redirect('/dashboard/workspace-setup');
    return null;
  }

  const currentWorkspace = workspaceMembers[0].workspaces;

  // Get all prompts for the workspace
  const { data: prompts, error: promptsError } = await supabase
    .from('prompts')
    .select('*')
    .eq('workspace_id', currentWorkspace.id)
    .order('updated_at', { ascending: false });
  
  // Debug logging
  console.log('Fetching prompts for workspace:', currentWorkspace.id);
  console.log('Prompts found:', prompts?.length || 0);
  if (promptsError) {
    console.error('Error fetching prompts:', promptsError);
  }

  // Format date
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-2xl font-bold">
                ROCQET
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <h1 className="text-lg font-medium">All Prompts</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{currentWorkspace.name}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search prompts..."
                className="h-10 w-80 rounded-lg border border-gray-200 bg-white pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/prompts/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Prompt
            </Button>
          </Link>
        </div>

        {/* Table */}
        <div className="overflow-hidden bg-white rounded-lg shadow-sm">
          {prompts && prompts.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Model
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Version
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Uses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Updated
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {prompts.map((prompt) => (
                  <tr
                    key={prompt.id}
                    className="group hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/prompts/${prompt.id}`}
                        className="group/link flex flex-col"
                      >
                        <span className="font-medium text-gray-900 group-hover/link:text-blue-600 transition-colors">
                          {prompt.name}
                        </span>
                        {prompt.description && (
                          <span className="text-sm text-gray-500 mt-0.5">
                            {prompt.description}
                          </span>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                        {prompt.model}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <GitBranch className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          v{prompt.version}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {prompt.usage_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatDate(prompt.updated_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 rounded-full bg-gray-100 p-3">
                <GitBranch className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                No prompts yet
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Create your first prompt to get started
              </p>
              <Link href="/prompts/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Prompt
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pagination */}
        {prompts && prompts.length > 10 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">1</span> to{' '}
              <span className="font-medium">{Math.min(10, prompts.length)}</span> of{' '}
              <span className="font-medium">{prompts.length}</span> results
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}