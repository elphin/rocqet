'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Building2, Sparkles, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function NewWorkspaceClient() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const validateSlug = (slug: string) => {
    if (!slug) return { valid: false, message: 'Slug is required' };
    if (slug.length < 3) return { valid: false, message: 'Must be at least 3 characters' };
    if (slug.length > 50) return { valid: false, message: 'Must be less than 50 characters' };
    if (!/^[a-z0-9-]+$/.test(slug)) return { valid: false, message: 'Only lowercase letters, numbers, and hyphens allowed' };
    if (slug.startsWith('-') || slug.endsWith('-')) return { valid: false, message: 'Cannot start or end with a hyphen' };
    if (slug.includes('--')) return { valid: false, message: 'Cannot have consecutive hyphens' };
    return { valid: true, message: 'Valid workspace URL' };
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const handleSlugChange = (value: string) => {
    // Only allow valid characters while typing
    const cleanedSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(cleanedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !slug.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a workspace');
      }

      // Create workspace
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (wsError) {
        if (wsError.code === '23505') { // Unique violation
          throw new Error('A workspace with this slug already exists');
        }
        throw wsError;
      }

      // Add user as owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) {
        // Rollback workspace creation if member creation fails
        await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspace.id);
        throw memberError;
      }

      toast.success('Workspace created successfully!');
      router.push(`/${workspace.slug}/dashboard`);
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      setError(err.message || 'Failed to create workspace');
      toast.error(err.message || 'Failed to create workspace');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Create New Workspace</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white shadow-sm border p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Set up your workspace</h2>
            <p className="mt-2 text-sm text-gray-600">
              Workspaces help you organize your prompts and collaborate with your team
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Workspace Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome Workspace"
                className="mt-1"
                disabled={loading}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                This is how your workspace will appear throughout the app
              </p>
            </div>

            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                Workspace URL
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                  rocqet.app/
                </span>
                <Input
                  id="slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="my-workspace"
                  className={`rounded-l-none ${
                    slug && !validateSlug(slug).valid ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                  }`}
                  disabled={loading}
                />
              </div>
              
              {/* Slug validation feedback */}
              {slug && (
                <div className={`mt-2 flex items-start gap-2 text-xs ${
                  validateSlug(slug).valid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validateSlug(slug).valid ? (
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  )}
                  <span>{validateSlug(slug).message}</span>
                </div>
              )}

              {/* Warning about permanence */}
              <div className="mt-3 rounded-lg bg-yellow-50 border border-yellow-200 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-yellow-800">
                    <strong>Important:</strong> This URL cannot be changed after creation.
                  </div>
                </div>
              </div>

              {/* Requirements */}
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-600">URL Requirements:</p>
                <ul className="text-xs text-gray-500 space-y-0.5 ml-4">
                  <li>• 3-50 characters</li>
                  <li>• Only lowercase letters (a-z), numbers (0-9), and hyphens (-)</li>
                  <li>• Cannot start or end with a hyphen</li>
                  <li>• No spaces or special characters</li>
                  <li>• Must be unique across all workspaces</li>
                </ul>
              </div>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What will this workspace be used for?"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                rows={3}
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading || !name.trim() || !slug.trim()}
                className="flex-1"
              >
                {loading ? (
                  'Creating...'
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Workspace
                  </>
                )}
              </Button>
              <Link href="/" className="flex-1">
                <Button type="button" variant="outline" disabled={loading} className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="text-sm font-semibold text-blue-900">What's next?</h3>
          <ul className="mt-3 space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Create your first AI prompt with version control</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Invite team members to collaborate</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Set up folders to organize your prompts</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Configure API keys for testing</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}