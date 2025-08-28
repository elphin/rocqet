'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMirrorPromptEditor } from '@/components/codemirror-prompt-editor';
import { GeneratePromptModal } from '@/components/generate-prompt-modal';
import { 
  ArrowLeft, Save, Variable, Settings, Lock, Globe, FolderOpen, 
  Hash, Plus, X, Info, ChevronDown, GitBranch, Loader2, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

interface NewPromptClientProps {
  workspace: any;
  workspaceSlug: string;
  userRole: string;
  folders: any[];
  tags: any[];
}

export function NewPromptClient({ 
  workspace, 
  workspaceSlug, 
  userRole, 
  folders, 
  tags: availableTags 
}: NewPromptClientProps) {
  // Basic fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [shortcode, setShortcode] = useState('');
  const [content, setContent] = useState('');
  
  // Organization fields
  const [folder, setFolder] = useState<{ id: string; name: string } | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string; color: string }[]>([]);
  const [isPublic, setIsPublic] = useState(workspace.subscription_tier === 'starter');
  
  // Model settings
  const [model, setModel] = useState('gpt-4');
  const [temperature, setTemperature] = useState(7);
  const [variables, setVariables] = useState<string[]>([]);
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  
  const router = useRouter();
  const supabase = createClient();

  const generateShortcode = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!shortcode) {
      setShortcode(generateShortcode(value));
    }
  };

  const extractVariables = (content: string) => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))];
  };

  const handleGeneratedPrompt = (generatedData: {
    title: string;
    description: string;
    content: string;
    variables: string[];
    tags: string[];
  }) => {
    // Fill in the form with generated data
    setName(generatedData.title);
    setDescription(generatedData.description);
    setContent(generatedData.content);
    setShortcode(generateShortcode(generatedData.title));
    
    // Extract and set variables
    const extractedVars = extractVariables(generatedData.content);
    setVariables(extractedVars);
    
    // Process tags (match with existing tags if possible)
    const matchedTags = generatedData.tags
      .map(tagName => availableTags.find(t => t.name.toLowerCase() === tagName.toLowerCase()))
      .filter(Boolean) as any[];
    setTags(matchedTags);
    
    toast.success('Prompt generated and form filled!');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter a prompt name');
      return;
    }

    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Create the prompt
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          shortcode: shortcode.trim() || generateShortcode(name),
          content: content.trim(),
          workspace_id: workspace.id,
          created_by: user.id,
          folder_id: folder?.id || null,
          visibility: isPublic ? 'public' : 'private',
          model,
          temperature: temperature / 10,
          variables: extractVariables(content)
        })
        .select()
        .single();

      if (promptError) {
        throw promptError;
      }

      // Add tags if any
      if (tags.length > 0) {
        await supabase
          .from('prompt_tags')
          .insert(
            tags.map(tag => ({
              prompt_id: prompt.id,
              tag_id: tag.id
            }))
          );
      }

      toast.success('Prompt created successfully!');
      router.push(`/${workspaceSlug}/prompts/${prompt.id}/edit`);
    } catch (error: any) {
      console.error('Error saving prompt:', error);
      toast.error(error.message || 'Failed to create prompt');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <div className="px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/${workspaceSlug}/prompts`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                New Prompt
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowGenerateModal(true)}
              variant="outline"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Create Prompt
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex">
        {/* Main Editor */}
        <div className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Basic Info */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Awesome Prompt"
                  className="bg-white dark:bg-neutral-800"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this prompt do?"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                  Shortcode
                </label>
                <Input
                  value={shortcode}
                  onChange={(e) => setShortcode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="my_awesome_prompt"
                  className="bg-white dark:bg-neutral-800 font-mono text-sm"
                />
                <p className="text-xs text-neutral-500 dark:text-gray-500 mt-1">
                  Unique identifier for API access
                </p>
              </div>
            </div>

            {/* Prompt Content */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100">
                  Prompt Content
                </h3>
                {variables.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {variables.map((variable) => (
                      <span
                        key={variable}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
                      >
                        <Variable className="h-3 w-3" />
                        {variable}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-96">
                <CodeMirrorPromptEditor
                  value={content}
                  onChange={(value) => {
                    setContent(value);
                    setVariables(extractVariables(value));
                  }}
                  placeholder="Enter your prompt here...

Use {{variable_name}} to add variables that can be replaced at runtime."
                />
              </div>
            </div>

            {/* Organization */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xs border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-gray-100 mb-3">
                Organization
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Folder
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700"
                    >
                      <span className={folder ? '' : 'text-neutral-500'}>
                        {folder ? folder.name : 'No folder'}
                      </span>
                      <ChevronDown className="h-4 w-4 text-neutral-400" />
                    </button>
                    
                    {showFolderDropdown && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setShowFolderDropdown(false)}
                        />
                        <div className="absolute top-full mt-1 w-full z-20 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          <button
                            onClick={() => {
                              setFolder(null);
                              setShowFolderDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                          >
                            No folder
                          </button>
                          {folders.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => {
                                setFolder(f);
                                setShowFolderDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700"
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-1">
                    Visibility
                  </label>
                  <button
                    onClick={() => workspace.subscription_tier !== 'starter' && setIsPublic(!isPublic)}
                    disabled={workspace.subscription_tier === 'starter'}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-md transition-colors ${
                      workspace.subscription_tier === 'starter' 
                        ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 cursor-not-allowed opacity-50'
                        : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {isPublic ? (
                        <>
                          <Globe className="h-4 w-4 text-green-600" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 text-yellow-600" />
                          Private
                        </>
                      )}
                    </span>
                    {workspace.subscription_tier === 'starter' && (
                      <span className="text-xs text-neutral-500">Starter tier</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Prompt Modal */}
      <GeneratePromptModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerated={handleGeneratedPrompt}
        workspaceId={workspace.id}
      />
    </div>
  );
}