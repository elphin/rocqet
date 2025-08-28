'use client';

import { useState } from 'react';
import { Tag, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PopularTagsProps {
  workspaceId: string;
  onTagsCreated?: () => void;
}

// Categorized popular tags for AI prompts
const POPULAR_TAGS = {
  'Use Cases': [
    '📝 content-creation',
    '💼 business',
    '🎓 education',
    '💻 coding',
    '🎨 creative',
    '📊 analysis',
    '🔬 research',
    '✉️ email',
    '📱 social-media',
    '🛠️ productivity'
  ],
  'Industries': [
    '🏥 healthcare',
    '💰 finance',
    '🛍️ e-commerce',
    '🎮 gaming',
    '🏭 manufacturing',
    '🏢 real-estate',
    '✈️ travel',
    '🍔 food-service',
    '⚖️ legal',
    '📰 media'
  ],
  'Prompt Types': [
    '💬 conversation',
    '📋 template',
    '🔄 workflow',
    '🤖 automation',
    '📝 writing',
    '🌐 translation',
    '📊 data-processing',
    '🎯 classification',
    '💡 brainstorming',
    '✅ validation'
  ],
  'Complexity': [
    '🟢 beginner',
    '🟡 intermediate',
    '🔴 advanced',
    '⚡ quick',
    '🔧 detailed',
    '🎯 specific',
    '🌍 general'
  ],
  'Team': [
    '👥 shared',
    '🔒 private',
    '⭐ featured',
    '🧪 experimental',
    '✅ approved',
    '📌 pinned',
    '🚀 production',
    '🛠️ development'
  ]
};

export function PopularTags({ workspaceId, onTagsCreated }: PopularTagsProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const importTags = async () => {
    if (selectedTags.size === 0) {
      toast.error('Please select at least one tag to import');
      return;
    }

    setImporting(true);
    const supabase = createClient();

    try {
      // Create tags in the database
      const tagsToCreate = Array.from(selectedTags).map(tag => {
        // Remove emoji prefix if present
        const cleanTag = tag.replace(/^[^\s]+ /, '');
        return {
          workspace_id: workspaceId,
          name: cleanTag,
          color: getTagColor(tag)
        };
      });

      const { error } = await supabase
        .from('tags')
        .insert(tagsToCreate);

      if (error) throw error;

      toast.success(`Imported ${selectedTags.size} tags successfully!`);
      setSelectedTags(new Set());
      
      if (onTagsCreated) {
        onTagsCreated();
      }
    } catch (error: any) {
      console.error('Error importing tags:', error);
      toast.error(error.message || 'Failed to import tags');
    } finally {
      setImporting(false);
    }
  };

  // Helper to get a color based on category
  const getTagColor = (tag: string): string => {
    if (tag.includes('content') || tag.includes('creative')) return 'purple';
    if (tag.includes('business') || tag.includes('finance')) return 'blue';
    if (tag.includes('education') || tag.includes('research')) return 'green';
    if (tag.includes('coding') || tag.includes('automation')) return 'orange';
    if (tag.includes('beginner')) return 'green';
    if (tag.includes('intermediate')) return 'yellow';
    if (tag.includes('advanced')) return 'red';
    return 'gray';
  };

  const displayCategories = showAll ? Object.entries(POPULAR_TAGS) : Object.entries(POPULAR_TAGS).slice(0, 2);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-blue-500 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Quick Start with Popular Tags
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Select tags to organize your prompts. You can always create custom tags later.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {displayCategories.map(([category, tags]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {category}
            </h4>
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => {
                const isSelected = selectedTags.has(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 text-sm rounded-full transition-all ${
                      isSelected
                        ? 'bg-blue-500 text-white shadow-md transform scale-105'
                        : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-700 border border-gray-200 dark:border-neutral-700'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {!showAll && Object.keys(POPULAR_TAGS).length > 2 && (
        <button
          onClick={() => setShowAll(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-4"
        >
          Show more categories ({Object.keys(POPULAR_TAGS).length - 2} more)
        </button>
      )}

      {selectedTags.size > 0 && (
        <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedTags.size} tag{selectedTags.size !== 1 ? 's' : ''} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags(new Set())}
              >
                Clear All
              </Button>
              <Button
                size="sm"
                onClick={importTags}
                disabled={importing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {importing ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Importing...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Import Selected Tags
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}