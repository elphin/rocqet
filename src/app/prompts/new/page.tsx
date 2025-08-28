'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Wand2, Variable, Settings } from 'lucide-react';
import Link from 'next/link';

export default function NewPrompt() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get workspace from localStorage
    const wsId = localStorage.getItem('currentWorkspaceId');
    if (wsId) {
      setWorkspaceId(wsId);
    } else {
      // Fetch workspace if not in localStorage
      fetchWorkspace();
    }
  }, []);

  const fetchWorkspace = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: workspaces } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();
      
      if (workspaces) {
        setWorkspaceId(workspaces.workspace_id);
        localStorage.setItem('currentWorkspaceId', workspaces.workspace_id);
      }
    }
  };

  // Detect variables in content (format: {{variable_name}})
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex);
    if (matches) {
      const vars = matches.map(m => m.replace(/[{}]/g, '').trim());
      setVariables([...new Set(vars)]);
    } else {
      setVariables([]);
    }
  }, [content]);

  const handleSave = async () => {
    if (!workspaceId) {
      setError('No workspace found. Please refresh the page.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a prompt name');
      return;
    }

    if (!content.trim()) {
      setError('Please enter prompt content');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        workspace_id: workspaceId,
        name,
        description,
        content,
        variables: variables.map(v => ({ name: v, type: 'text', defaultValue: '' })),
        model,
        temperature,
      };
      
      console.log('Saving prompt with payload:', payload);

      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log('API Response:', { status: response.status, result });

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create prompt');
      }

      console.log('Prompt saved successfully, redirecting to /prompts');
      router.push('/prompts');
    } catch (err: any) {
      console.error('Error saving prompt:', err);
      setError(err.message || 'Failed to create prompt');
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
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-semibold">Create New Prompt</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || !name || !content}
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Prompt'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prompt Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Blog Post Generator"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of what this prompt does"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Prompt Content
                </label>
                <div className="text-xs text-gray-500">
                  Use {`{{variable}}`} for dynamic values
                </div>
              </div>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Write your prompt here...

Example:
Write a blog post about {{topic}} for {{audience}}.
The tone should be {{tone}} and approximately {{length}} words.`}
                className="w-full h-64 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Variables */}
            {variables.length > 0 && (
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Variable className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium">Detected Variables</h3>
                </div>
                <div className="space-y-2">
                  {variables.map((varName) => (
                    <div
                      key={varName}
                      className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2"
                    >
                      <span className="text-sm font-mono text-blue-700">
                        {`{{${varName}}}`}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  These variables will be replaced with actual values when running the prompt
                </p>
              </div>
            )}

            {/* Settings */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4 text-gray-600" />
                <h3 className="font-medium">Model Settings</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="gpt-4">GPT-4</option>
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    <option value="claude-3-opus">Claude 3 Opus</option>
                    <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temperature: {temperature / 10}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={temperature}
                    onChange={(e) => setTemperature(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-lg bg-blue-50 p-6">
              <div className="mb-2 flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-blue-900">Pro Tips</h3>
              </div>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Use descriptive variable names</li>
                <li>• Test with different temperatures</li>
                <li>• Version your prompts regularly</li>
                <li>• Add examples for better results</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}