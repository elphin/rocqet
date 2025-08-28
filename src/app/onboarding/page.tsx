'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { Rocket, Sparkles, ArrowRight } from 'lucide-react';

export default function Onboarding() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const router = useRouter();
  const supabase = createClient();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleCreateWorkspace = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Check for pending invites first
      const { data: pendingInvites } = await supabase
        .from('workspace_invites')
        .select(`
          id,
          role,
          workspace_id,
          workspaces (
            id,
            name,
            slug
          )
        `)
        .eq('email', user.email)
        .eq('status', 'pending');

      // Accept any pending invites
      if (pendingInvites && pendingInvites.length > 0) {
        for (const invite of pendingInvites) {
          await supabase
            .from('workspace_members')
            .insert({
              workspace_id: invite.workspace_id,
              user_id: user.id,
              role: invite.role,
            });

          await supabase
            .from('workspace_invites')
            .update({ 
              status: 'accepted',
              accepted_by: user.id,
              accepted_at: new Date().toISOString()
            })
            .eq('id', invite.id);
        }
      }

      // Use user's name or email for default workspace
      const defaultName = workspaceName || `${user.user_metadata?.full_name || user.email?.split('@')[0] || 'Personal'}'s Workspace`;
      const slug = generateSlug(defaultName);

      // Create user record if doesn't exist
      await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
        }, {
          onConflict: 'id'
        });

      // Create personal workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: defaultName,
          slug: slug,
          description: 'My personal workspace',
          created_by: user.id,
          workspace_type: 'personal',
          is_personal: true,
          subscription_tier: 'starter'
        })
        .select()
        .single();

      if (workspaceError) {
        // If slug exists, try with random suffix
        const uniqueSlug = `${slug}-${Math.random().toString(36).substr(2, 5)}`;
        const { data: retryWorkspace } = await supabase
          .from('workspaces')
          .insert({
            name: defaultName,
            slug: uniqueSlug,
            description: 'My personal workspace',
            created_by: user.id,
            workspace_type: 'personal',
            is_personal: true,
            subscription_tier: 'starter'
          })
          .select()
          .single();
        
        if (retryWorkspace) {
          workspace = retryWorkspace;
        } else {
          throw new Error('Failed to create workspace');
        }
      }

      // Add user as owner
      await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        });

      // Set as default workspace
      await supabase
        .from('users')
        .update({ default_workspace_id: workspace.id })
        .eq('id', user.id);

      // Show message if user had team invites
      if (pendingInvites && pendingInvites.length > 0) {
        // Could show a toast here about being added to team workspaces
        console.log(`User added to ${pendingInvites.length} team workspace(s)`);
      }

      // Redirect to personal workspace
      router.push(`/${workspace.slug}/dashboard`);
    } catch (error) {
      console.error('Error creating workspace:', error);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600">
            <Rocket className="h-8 w-8 text-white" />
          </div>
          
          {step === 1 && (
            <>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Welcome to ROCQET! 🚀
              </h1>
              <p className="mb-8 text-gray-600">
                Let's set up your personal workspace in seconds
              </p>

              <div className="rounded-xl bg-white p-8 shadow-lg">
                <div className="mb-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-blue-100 p-1">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Organize your prompts</p>
                      <p className="text-sm text-gray-600">Keep all your AI prompts in one place</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-green-100 p-1">
                      <Sparkles className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Version control</p>
                      <p className="text-sm text-gray-600">Track changes and improvements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-purple-100 p-1">
                      <Sparkles className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">Test & optimize</p>
                      <p className="text-sm text-gray-600">Run and improve your prompts</p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setStep(2)}
                  className="w-full"
                  size="lg"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Name your workspace
              </h1>
              <p className="mb-8 text-gray-600">
                You can always change this later
              </p>

              <div className="rounded-xl bg-white p-8 shadow-lg">
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g., John's Prompts, Personal, My AI Lab"
                  className="mb-6"
                  autoFocus
                />

                <Button
                  onClick={handleCreateWorkspace}
                  disabled={loading}
                  className="w-full"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating workspace...
                    </>
                  ) : (
                    <>
                      Create Workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <button
                  onClick={() => handleCreateWorkspace()}
                  disabled={loading}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700"
                >
                  Skip and use default name
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}