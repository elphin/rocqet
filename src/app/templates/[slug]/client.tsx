'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Heart,
  Download,
  Eye,
  Star,
  Copy,
  ExternalLink,
  Flag,
  Edit,
  Trash2,
  Share2,
  Folder,
  X,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/client';
import { importTemplateToWorkspace } from '@/app/actions/template-actions';

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: any[];
  category: string;
  tags: string[];
  use_case?: string;
  author_id: string;
  author_name: string;
  author_avatar?: string;
  likes_count: number;
  uses_count: number;
  views_count: number;
  rating_avg?: number;
  rating_count?: number;
  is_featured: boolean;
  is_verified: boolean;
  is_liked: boolean;
  recommended_models?: string[];
  model_settings?: any;
  example_input?: string;
  example_output?: string;
  requirements?: string;
  warnings?: string;
  created_at: string;
  updated_at: string;
  reviews?: Review[];
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  user: {
    email: string;
    raw_user_meta_data: any;
  };
  created_at: string;
}

interface FolderNode {
  id: string;
  name: string;
  parent_id: string | null;
  children?: FolderNode[];
}

interface TemplateDetailProps {
  templateSlug: string;
  initialUser?: any;
  initialWorkspaces?: any[];
}

export function TemplateDetail({ templateSlug, initialUser, initialWorkspaces = [] }: TemplateDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(initialUser || null);
  const [workspaces, setWorkspaces] = useState<any[]>(initialWorkspaces);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>(
    initialWorkspaces.length > 0 ? initialWorkspaces[0].id : ''
  );
  
  const [showImportModal, setShowImportModal] = useState(false);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    fetchTemplate();
    // Only check auth if we don't have initial user data
    if (!initialUser) {
      checkAuth();
    }
  }, [templateSlug, initialUser]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    
    if (user) {
      // Fetch user's workspaces
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(id, name, slug)')
        .eq('user_id', user.id);
      
      if (memberData) {
        setWorkspaces(memberData.map(m => m.workspace));
        if (memberData.length > 0) {
          setSelectedWorkspace(memberData[0].workspace.id);
        }
      }
    }
  };

  const fetchTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/templates/${templateSlug}`);
      const data = await response.json();
      
      if (response.ok) {
        setTemplate(data);
      } else {
        toast.error('Template not found');
        router.push('/templates');
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error('Please sign in to like templates');
      router.push('/auth/signin');
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateSlug}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        const { liked } = await response.json();
        setTemplate(prev => prev ? {
          ...prev,
          is_liked: liked,
          likes_count: prev.likes_count + (liked ? 1 : -1)
        } : null);
        toast.success(liked ? 'Template liked!' : 'Like removed');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    }
  };

  // Fetch folders when workspace is selected
  useEffect(() => {
    if (selectedWorkspace && showImportModal) {
      fetchFolders(selectedWorkspace);
    }
  }, [selectedWorkspace, showImportModal]);

  const fetchFolders = async (workspaceId: string) => {
    const { data: folders } = await supabase
      .from('folders')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('name');
    
    if (folders) {
      setFolders(buildFolderTree(folders));
    }
  };

  const buildFolderTree = (folders: any[]): FolderNode[] => {
    const folderMap = new Map<string, FolderNode>();
    const rootFolders: FolderNode[] = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach(folder => {
      const node = folderMap.get(folder.id)!;
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        folderMap.get(folder.parent_id)!.children!.push(node);
      } else {
        rootFolders.push(node);
      }
    });

    return rootFolders;
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleUse = async () => {
    // Check if we have user from state first
    let user = currentUser;
    
    // If no user in state, try to get from supabase
    if (!user) {
      const { data: authData, error } = await supabase.auth.getUser();
      user = authData?.user;
      
      if (user) {
        setCurrentUser(user);
      }
    }
    
    if (!user) {
      toast.error('Please sign in to use templates');
      router.push('/auth/signin');
      return;
    }

    // If we don't have workspaces loaded yet, fetch them now
    if (workspaces.length === 0) {
      const { data: memberData } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(id, name, slug)')
        .eq('user_id', user.id);
      
      if (memberData && memberData.length > 0) {
        const workspacesList = memberData.map(m => m.workspace).filter(Boolean);
        setWorkspaces(workspacesList);
        if (workspacesList.length > 0) {
          setSelectedWorkspace(workspacesList[0].id);
        }
      } else {
        toast.error('No workspace found. Please create a workspace first.');
        router.push('/onboarding');
        return;
      }
    }

    if (!selectedWorkspace && workspaces.length > 0) {
      setSelectedWorkspace(workspaces[0].id);
    }

    // Show import modal with folder selector
    setShowImportModal(true);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importTemplateToWorkspace({
        templateId: template?.id || templateSlug,
        workspaceId: selectedWorkspace,
        folderId: selectedFolder || undefined
      });

      if (result.success) {
        toast.success(result.message || 'Template imported successfully!');
        setShowImportModal(false);
        
        // Navigate to the new prompt
        const workspace = workspaces.find(w => w.id === selectedWorkspace);
        if (workspace && result.promptSlug) {
          router.push(`/${workspace.slug}/prompts/${result.promptSlug}`);
        } else if (workspace && result.promptId) {
          // Fallback to ID if slug not available
          router.push(`/${workspace.slug}/prompts/${result.promptId}`);
        }
      } else {
        toast.error(result.error || 'Failed to import template');
      }
    } catch (error) {
      console.error('Failed to import template:', error);
      toast.error('Failed to import template');
    } finally {
      setImporting(false);
    }
  };

  const handleCopyContent = () => {
    navigator.clipboard.writeText(template?.content || '');
    toast.success('Prompt copied to clipboard');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Template deleted successfully');
        router.push('/templates');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
      toast.error('Failed to delete template');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-4 w-full mb-8" />
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!template) return null;

  const isOwner = currentUser?.id === template.author_id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          {isOwner && (
            <>
              <Button variant="outline" size="icon" asChild>
                <Link href={`/templates/${template?.slug || templateSlug}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {!isOwner && (
            <Button variant="outline" size="icon">
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Title & Meta */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{template.title}</h1>
            <p className="text-lg text-muted-foreground">{template.description}</p>
          </div>
          {template.is_featured && (
            <Badge variant="secondary" className="ml-4">Featured</Badge>
          )}
          {template.is_verified && (
            <Badge variant="default" className="ml-2">Verified</Badge>
          )}
        </div>

        {/* Author */}
        <div className="flex items-center gap-4 mb-4">
          <Avatar>
            <AvatarImage src={template.author_avatar} />
            <AvatarFallback>
              {template.author_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{template.author_name || 'Anonymous'}</p>
            <p className="text-sm text-muted-foreground">
              Published {formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLike}
            className={template.is_liked ? 'text-red-500' : ''}
          >
            <Heart className={`h-4 w-4 mr-1 ${template.is_liked ? 'fill-current' : ''}`} />
            {template.likes_count} Likes
          </Button>
          <div className="flex items-center text-sm text-muted-foreground">
            <Download className="h-4 w-4 mr-1" />
            {template.uses_count} Uses
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Eye className="h-4 w-4 mr-1" />
            {template.views_count} Views
          </div>
          {template.rating_avg && (
            <div className="flex items-center text-sm">
              <Star className="h-4 w-4 mr-1 fill-yellow-500 text-yellow-500" />
              {template.rating_avg.toFixed(1)} ({template.rating_count} reviews)
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="outline">{template.category}</Badge>
          {template.tags.map((tag, i) => (
            <Badge key={i} variant="outline">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Action Bar */}
      <Card className="p-4 mb-8 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium mb-1">Ready to use this template?</p>
            <p className="text-sm text-muted-foreground">
              Import it to your workspace with one click
            </p>
          </div>
          <div className="flex items-center gap-2">
            {workspaces.length > 0 && (
              <select
                value={selectedWorkspace}
                onChange={(e) => setSelectedWorkspace(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            )}
            <Button onClick={handleUse}>
              <Download className="h-4 w-4 mr-2" />
              Import to Workspace
            </Button>
            <Button variant="outline" onClick={handleCopyContent}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Prompt
            </Button>
          </div>
        </div>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="prompt" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="prompt">Prompt</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="prompt" className="space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Prompt Content</h3>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-md">
              {template.content}
            </pre>
          </Card>

          {template.variables && template.variables.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Variables</h3>
              <div className="space-y-2">
                {template.variables.map((variable: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted rounded">
                    <code className="font-mono text-sm">{variable.name || variable}</code>
                    {variable.description && (
                      <span className="text-sm text-muted-foreground">{variable.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          {template.example_input && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Example Input</h3>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {template.example_input}
              </pre>
            </Card>
          )}

          {template.example_output && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Example Output</h3>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {template.example_output}
              </pre>
            </Card>
          )}

          {!template.example_input && !template.example_output && (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No examples provided</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {template.recommended_models && template.recommended_models.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Recommended Models</h3>
              <div className="flex flex-wrap gap-2">
                {template.recommended_models.map((model, i) => (
                  <Badge key={i} variant="secondary">{model}</Badge>
                ))}
              </div>
            </Card>
          )}

          {template.model_settings && Object.keys(template.model_settings).length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Model Settings</h3>
              <div className="space-y-2">
                {Object.entries(template.model_settings).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-sm font-medium">{key}:</span>
                    <span className="text-sm text-muted-foreground">{String(value)}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {template.requirements && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Requirements</h3>
              <p className="text-sm">{template.requirements}</p>
            </Card>
          )}

          {template.warnings && (
            <Card className="p-6 border-yellow-500/50 bg-yellow-500/5">
              <h3 className="font-semibold mb-4 text-yellow-700 dark:text-yellow-400">
                Warnings
              </h3>
              <p className="text-sm">{template.warnings}</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          {template.reviews && template.reviews.length > 0 ? (
            template.reviews.map(review => (
              <Card key={review.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.user.raw_user_meta_data?.avatar_url} />
                      <AvatarFallback>
                        {review.user.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {review.user.raw_user_meta_data?.name || review.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < review.rating
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm">{review.review_text}</p>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No reviews yet</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Import Modal with Folder Selector */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900">Import Template</h3>
                </div>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFolder(null);
                  }}
                  className="text-neutral-400 hover:text-neutral-600 -mt-1 -mr-1 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-neutral-600 mb-6">
                Choose where to save this template in your workspace.
              </p>

              {workspaces.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Workspace
                  </label>
                  <select
                    value={selectedWorkspace}
                    onChange={(e) => setSelectedWorkspace(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Folder (Optional)
                </label>
                <div className="border border-neutral-200 rounded-lg max-h-60 overflow-y-auto">
                  <button
                    onClick={() => setSelectedFolder(null)}
                    className={`w-full text-left px-3 py-2 hover:bg-neutral-50 flex items-center gap-2 ${!selectedFolder ? 'bg-primary/5' : ''}`}
                  >
                    <Folder className="h-4 w-4" />
                    <span className="text-sm">Root (No folder)</span>
                  </button>
                  {folders.map(folder => (
                    <RenderFolder
                      key={folder.id}
                      folder={folder}
                      level={1}
                      selectedFolder={selectedFolder}
                      setSelectedFolder={setSelectedFolder}
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedFolder(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="bg-primary hover:bg-primary-dark text-white"
                >
                  {importing ? 'Importing...' : 'Import Template'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Folder rendering component
function RenderFolder({
  folder,
  level,
  selectedFolder,
  setSelectedFolder,
  expandedFolders,
  toggleFolder
}: {
  folder: any;
  level: number;
  selectedFolder: string | null;
  setSelectedFolder: (id: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
}) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isExpanded = expandedFolders.has(folder.id);
  const isSelected = selectedFolder === folder.id;

  return (
    <>
      <button
        onClick={() => setSelectedFolder(folder.id)}
        onDoubleClick={() => hasChildren && toggleFolder(folder.id)}
        className={`w-full text-left hover:bg-neutral-50 flex items-center gap-1 ${isSelected ? 'bg-primary/5' : ''}`}
        style={{ paddingLeft: `${level * 1.5}rem` }}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.id);
            }}
            className="p-0.5 hover:bg-neutral-200 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        <Folder className="h-4 w-4" />
        <span className="text-sm py-1.5">{folder.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <>
          {folder.children.map((child: any) => (
            <RenderFolder
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
            />
          ))}
        </>
      )}
    </>
  );
}