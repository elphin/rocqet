'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { Rocket, Users, Zap, CheckCircle, XCircle } from 'lucide-react';

export default function WorkspaceSetup() {
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setWorkspaceName(name);
    const slug = generateSlug(name);
    setWorkspaceSlug(slug);
    // Reset slug availability when changing
    setSlugAvailable(null);
  };

  // Check slug availability
  useEffect(() => {
    const checkSlug = async () => {
      if (!workspaceSlug || workspaceSlug.length < 3) {
        setSlugAvailable(null);
        return;
      }

      setCheckingSlug(true);
      const { data } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('slug', workspaceSlug)
        .single();
      
      setSlugAvailable(!data);
      setCheckingSlug(false);
    };

    const timer = setTimeout(checkSlug, 500);
    return () => clearTimeout(timer);
  }, [workspaceSlug]);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First create the user record if it doesn't exist
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (userError) {
        console.error('User creation error:', userError);
      }

      // Create the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName,
          slug: workspaceSlug,
          description: description || null,
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (workspaceError) {
        // Check if it's a unique constraint violation
        if (workspaceError.code === '23505' && workspaceError.message?.includes('workspaces_slug_unique')) {
          setError(`The workspace URL "${workspaceSlug}" is already taken. Please choose a different name or URL.`);
          setLoading(false);
          return;
        }
        throw workspaceError;
      }

      // Add the user as workspace owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString(),
        });

      if (memberError) {
        throw memberError;
      }

      // Store workspace in localStorage for quick access
      localStorage.setItem('currentWorkspaceId', workspace.id);
      localStorage.setItem('currentWorkspaceName', workspace.name);

      // Redirect directly to the new workspace
      router.push(`/${workspace.slug}/prompts`);
    } catch (err: any) {
      setError(err.message || 'Failed to create workspace');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Rocket className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome to ROCQET!</h1>
            <p className="mt-3 text-lg text-gray-600">
              Let's create your first workspace to get started
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleCreateWorkspace} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace Name
                </label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Awesome Workspace"
                  className="h-12 text-lg"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                  Workspace URL
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">rocqet.app/</span>
                  <div className="relative flex-1">
                    <Input
                      id="slug"
                      type="text"
                      required
                      value={workspaceSlug}
                      onChange={(e) => {
                        const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                        setWorkspaceSlug(newSlug);
                        setSlugAvailable(null);
                      }}
                      placeholder="my-workspace"
                      className={`pr-10 ${
                        slugAvailable === false ? 'border-red-300 focus:border-red-500' : 
                        slugAvailable === true ? 'border-green-300 focus:border-green-500' : ''
                      }`}
                      pattern="[a-z0-9-]+"
                    />
                    {checkingSlug && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                      </div>
                    )}
                    {!checkingSlug && slugAvailable === true && (
                      <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                    )}
                    {!checkingSlug && slugAvailable === false && (
                      <XCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-red-500" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {slugAvailable === false ? (
                    <span className="text-red-600">This URL is already taken. Please choose another.</span>
                  ) : (
                    "This will be your workspace's unique URL for all your prompts and chains."
                  )}
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you use this workspace for?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                disabled={loading || !workspaceName || !workspaceSlug}
              >
                {loading ? 'Creating workspace...' : 'Create Workspace'}
              </Button>
            </form>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-4">
                  <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Collaborate</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Invite team members to work together
                  </p>
                </div>
                <div className="p-4">
                  <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">AI-Powered</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Smart prompts with variable detection
                  </p>
                </div>
                <div className="p-4">
                  <Rocket className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold">Version Control</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Git-style versioning for your prompts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}