'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  Search, 
  Filter, 
  TrendingUp, 
  Star, 
  Clock,
  Heart,
  Download,
  Eye,
  Grid3x3,
  List,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Template {
  id: string;
  slug?: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  author_id: string;
  author_name: string;
  author_avatar?: string;
  likes_count: number;
  uses_count: number;
  views_count: number;
  rating_avg?: number;
  is_featured: boolean;
  is_verified: boolean;
  is_liked: boolean;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  template_count: number;
}

export function TemplateGallery() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'trending');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch categories
  useEffect(() => {
    setCategoriesLoading(true);
    fetch('/api/templates/categories')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || []);
        setCategoriesLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch categories:', err);
        setCategories([]);
        setCategoriesLoading(false);
      });
  }, []);

  // Fetch templates
  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory, sortBy, page]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: selectedCategory,
        sort: sortBy,
        page: page.toString(),
        limit: '12'
      });

      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await fetch(`/api/templates?${params}`);
      const data = await response.json();
      
      setTemplates(data.templates || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchTemplates();
  };

  const handleLike = async (template: any) => {
    try {
      const response = await fetch(`/api/templates/${template.slug || template.id}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        const { liked } = await response.json();
        setTemplates(prev => prev.map(t => 
          t.id === template.id 
            ? { ...t, is_liked: liked, likes_count: t.likes_count + (liked ? 1 : -1) }
            : t
        ));
        toast.success(liked ? 'Template liked!' : 'Like removed');
      } else if (response.status === 401) {
        toast.error('Please sign in to like templates');
        router.push('/auth/signin');
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleUse = async (template: any) => {
    router.push(`/templates/${template.slug || template.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/5 to-background border-b">
        <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              🚀 Prompt Template Library
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover, share, and import professional AI prompts.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="space-y-6">
          {/* All Controls in One Line */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 lg:gap-4">
            {/* Category Dropdown */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {!categoriesLoading && categories && categories.length > 0 && 
                  categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.slug}>
                      <div className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {cat.template_count}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>

            {/* Search Bar */}
            <div className="flex gap-2 flex-1 max-w-md">
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} size="default">
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {/* Sort Tabs */}
            <Tabs value={sortBy} onValueChange={setSortBy}>
              <TabsList>
                <TabsTrigger value="trending">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Trending</span>
                </TabsTrigger>
                <TabsTrigger value="popular">
                  <Star className="h-4 w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Popular</span>
                </TabsTrigger>
                <TabsTrigger value="newest">
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="text-xs sm:text-sm">Newest</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-secondary' : ''}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-secondary' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Templates Grid/List */}
          {loading ? (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-4" />
                  <Skeleton className="h-20 w-full" />
                </Card>
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <p className="text-muted-foreground">No templates found</p>
            </Card>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {templates.map(template => (
                <Card
                  key={template.id}
                  className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/templates/${template.slug || template.id}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold line-clamp-1">
                        {template.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{template.author_name}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(template.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                    {template.is_featured && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {template.description}
                  </p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    {template.tags.slice(0, 2).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t">
                    <div className="flex items-center gap-2 sm:gap-3 text-sm text-muted-foreground">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLike(template);
                        }}
                      >
                        <Heart 
                          className={`h-4 w-4 mr-1 ${template.is_liked ? 'fill-red-500 text-red-500' : ''}`}
                        />
                        <span className="text-xs">{template.likes_count}</span>
                      </Button>
                      <span className="flex items-center">
                        <Download className="h-4 w-4 mr-1" />
                        <span className="text-xs">{template.uses_count}</span>
                      </span>
                      <span className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        <span className="text-xs">{template.views_count}</span>
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUse(template);
                      }}
                    >
                      Use
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}