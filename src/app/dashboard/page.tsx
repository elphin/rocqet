import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, Folder, Clock, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function Dashboard() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/auth/signin');
    return null;
  }

  // Check if user has any workspaces
  const { data: workspaceMembers } = await supabase
    .from('workspace_members')
    .select(`
      workspace_id,
      workspaces (
        id,
        name,
        slug,
        monthly_prompt_usage
      )
    `)
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false })
    .limit(1);

  if (!workspaceMembers || workspaceMembers.length === 0) {
    redirect('/dashboard/workspace-setup');
    return null;
  }

  // Get the current workspace (use most recently joined)
  const currentWorkspace = workspaceMembers[0].workspaces;
  
  // Redirect to workspace dashboard instead of showing this generic dashboard
  redirect(`/${currentWorkspace.slug}/prompts`);
  return null;

  // The code below won't run, but keeping for reference
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">ROCQET</h1>
              <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1">
                <span className="text-sm font-medium">{currentWorkspace.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
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

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-white p-4">
          <nav className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-blue-50 text-blue-600"
            >
              <Clock className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/prompts"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Folder className="h-4 w-4" />
              All Prompts
            </Link>
            <Link
              href="/favorites"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Star className="h-4 w-4" />
              Favorites
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
              <p className="mt-2 text-gray-600">
                Manage your prompts with version control and real-time collaboration
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Link href="/prompts/new">
                <Button className="w-full h-24 flex-col gap-2">
                  <Plus className="h-6 w-6" />
                  <span>Create New Prompt</span>
                </Button>
              </Link>
              <button className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50">
                <Folder className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                <span className="text-sm font-medium">Browse Templates</span>
              </button>
              <button className="rounded-lg border border-gray-200 bg-white p-4 text-center hover:bg-gray-50">
                <Star className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                <span className="text-sm font-medium">Import from GitHub</span>
              </button>
            </div>

            {/* Recent Prompts */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-semibold">Recent Prompts</h3>
              {prompts && prompts.length > 0 ? (
                <div className="space-y-3">
                  {prompts.map((prompt) => (
                    <div
                      key={prompt.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
                    >
                      <div>
                        <h4 className="font-medium">{prompt.name}</h4>
                        <p className="text-sm text-gray-600">{prompt.description}</p>
                      </div>
                      <div className="text-sm text-gray-500">
                        v{prompt.version}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No prompts yet</p>
                  <Link href="/prompts/new">
                    <Button>Create your first prompt</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="text-2xl font-bold">{prompts?.length || 0}</div>
                <div className="text-sm text-gray-600">Total Prompts</div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="text-2xl font-bold">0</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="text-2xl font-bold">{currentWorkspace.monthly_prompt_usage || 0}</div>
                <div className="text-sm text-gray-600">API Calls This Month</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}