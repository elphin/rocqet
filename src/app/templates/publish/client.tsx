'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft,
  Plus,
  X,
  Info,
  Eye,
  EyeOff,
  Upload,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Variable {
  name: string;
  description: string;
  default_value?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export function PublishTemplate() {
  const router = useRouter();
  const supabase = createClient();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [useCase, setUseCase] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [variables, setVariables] = useState<Variable[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<string[]>([]);
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');
  const [requirements, setRequirements] = useState('');
  const [warnings, setWarnings] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  
  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to publish templates');
      router.push('/auth/signin');
      return;
    }
    setCurrentUser(user);

    // Load categories
    const categoriesRes = await fetch('/api/templates/categories');
    const categoriesData = await categoriesRes.json();
    setCategories(categoriesData.categories);

    // Load user's workspaces
    const { data: memberData } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(id, name, slug)')
      .eq('user_id', user.id);
    
    if (memberData) {
      setWorkspaces(memberData.map(m => m.workspace));
    }
  };

  // Extract variables from content
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = [...content.matchAll(regex)];
    const extractedVars = matches.map(match => match[1].trim());
    
    // Update variables list, preserving descriptions
    const newVariables = extractedVars.map(varName => {
      const existing = variables.find(v => v.name === varName);
      return existing || { name: varName, description: '' };
    });
    
    if (JSON.stringify(newVariables) !== JSON.stringify(variables)) {
      setVariables(newVariables);
    }
  }, [content]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddModel = (model: string) => {
    if (!recommendedModels.includes(model)) {
      setRecommendedModels([...recommendedModels, model]);
    }
  };

  const handleRemoveModel = (model: string) => {
    setRecommendedModels(recommendedModels.filter(m => m !== model));
  };

  const handleVariableUpdate = (index: number, field: keyof Variable, value: string) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }
    if (!content.trim()) {
      toast.error('Please enter the prompt content');
      return;
    }
    if (!category) {
      toast.error('Please select a category');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          content,
          variables,
          category,
          tags,
          use_case: useCase,
          visibility,
          recommended_models: recommendedModels,
          model_settings: {
            temperature,
            max_tokens: maxTokens
          },
          example_input: exampleInput,
          example_output: exampleOutput,
          requirements,
          warnings,
          workspace_id: selectedWorkspace || null
        })
      });

      if (response.ok) {
        const { template } = await response.json();
        toast.success('Template published successfully!');
        router.push(`/templates/${template.id}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to publish template');
      }
    } catch (error) {
      console.error('Failed to publish template:', error);
      toast.error('Failed to publish template');
    } finally {
      setLoading(false);
    }
  };

  const modelOptions = [
    'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo',
    'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku',
    'gemini-pro', 'palm-2', 'llama-2-70b'
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/templates')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Button>
          <h1 className="text-3xl font-bold">Publish a Template</h1>
          <p className="text-muted-foreground mt-2">
            Share your best prompts with the ROCQET community
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? (
            <>
              <EyeOff className="h-4 w-4 mr-2" />
              Edit
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </>
          )}
        </Button>
      </div>

      {previewMode ? (
        // Preview Mode
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-2">{title || 'Untitled Template'}</h2>
          <p className="text-muted-foreground mb-4">{description || 'No description'}</p>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge>{category || 'No category'}</Badge>
            {tags.map(tag => (
              <Badge key={tag} variant="outline">{tag}</Badge>
            ))}
          </div>

          <div className="bg-muted p-4 rounded-md mb-4">
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {content || 'No content'}
            </pre>
          </div>

          {variables.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Variables</h3>
              <div className="space-y-1">
                {variables.map(v => (
                  <div key={v.name} className="text-sm">
                    <code className="bg-muted px-1 rounded">{`{{${v.name}}}`}</code>
                    {v.description && <span className="ml-2 text-muted-foreground">- {v.description}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      ) : (
        // Edit Mode
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., SEO Blog Post Writer"
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {title.length}/255 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what your template does and when to use it"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      placeholder="Add tags..."
                    />
                    <Button onClick={handleAddTag} type="button">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="useCase">Use Case</Label>
                  <Textarea
                    id="useCase"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    placeholder="Describe specific use cases for this template"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        Public - Anyone can see and use
                      </SelectItem>
                      <SelectItem value="unlisted">
                        Unlisted - Only accessible via direct link
                      </SelectItem>
                      <SelectItem value="private">
                        Private - Only you can see
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {workspaces.length > 0 && (
                  <div>
                    <Label>Associate with Workspace (Optional)</Label>
                    <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select workspace..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {workspaces.map(ws => (
                          <SelectItem key={ws.id} value={ws.id}>
                            {ws.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="content">Prompt Content *</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter your prompt template here. Use {{variable}} syntax for variables."
                    rows={15}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use {`{{variable_name}}`} syntax to add variables
                  </p>
                </div>

                {variables.length > 0 && (
                  <div>
                    <Label>Variables Detected</Label>
                    <div className="space-y-2 mt-2">
                      {variables.map((variable, index) => (
                        <div key={variable.name} className="flex gap-2">
                          <Input
                            value={variable.name}
                            disabled
                            className="font-mono w-1/3"
                          />
                          <Input
                            value={variable.description}
                            onChange={(e) => handleVariableUpdate(index, 'description', e.target.value)}
                            placeholder="Description (optional)"
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="exampleInput">Example Input</Label>
                  <Textarea
                    id="exampleInput"
                    value={exampleInput}
                    onChange={(e) => setExampleInput(e.target.value)}
                    placeholder="Show an example of how to use this template"
                    rows={6}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label htmlFor="exampleOutput">Example Output</Label>
                  <Textarea
                    id="exampleOutput"
                    value={exampleOutput}
                    onChange={(e) => setExampleOutput(e.target.value)}
                    placeholder="Show what the AI might generate"
                    rows={6}
                    className="font-mono"
                  />
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label>Recommended Models</Label>
                  <div className="space-y-2 mt-2">
                    {modelOptions.map(model => (
                      <div key={model} className="flex items-center justify-between">
                        <span className="text-sm">{model}</span>
                        <Switch
                          checked={recommendedModels.includes(model)}
                          onCheckedChange={(checked) => 
                            checked ? handleAddModel(model) : handleRemoveModel(model)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Temperature: {temperature}</Label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>

                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    min={1}
                    max={32000}
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Requirements</Label>
                  <Textarea
                    id="requirements"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                    placeholder="Any special requirements or prerequisites"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="warnings">Warnings</Label>
                  <Textarea
                    id="warnings"
                    value={warnings}
                    onChange={(e) => setWarnings(e.target.value)}
                    placeholder="Any warnings or limitations users should know"
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-2 mt-8">
        <Button
          variant="outline"
          onClick={() => router.push('/templates')}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !title || !description || !content || !category}
        >
          {loading ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-pulse" />
              Publishing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Publish Template
            </>
          )}
        </Button>
      </div>
    </div>
  );
}