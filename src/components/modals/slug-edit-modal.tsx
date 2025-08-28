'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, Link2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SlugEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSlug: string;
  title: string;
  workspaceSlug: string;
  type: 'prompt' | 'chain';
  onSave: (newSlug: string) => Promise<void>;
}

export function SlugEditModal({
  isOpen,
  onClose,
  currentSlug,
  title,
  workspaceSlug,
  type,
  onSave
}: SlugEditModalProps) {
  const [slug, setSlug] = useState(currentSlug);
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSlug(currentSlug);
    setIsValid(true);
    setErrorMessage('');
  }, [currentSlug, isOpen]);

  // Global escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const formatSlug = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const validateSlug = (value: string): boolean => {
    if (!value) {
      setErrorMessage('Slug cannot be empty');
      return false;
    }
    if (value.length < 3) {
      setErrorMessage('Slug must be at least 3 characters');
      return false;
    }
    if (value.length > 50) {
      setErrorMessage('Slug must be less than 50 characters');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setErrorMessage('Slug can only contain lowercase letters, numbers, and hyphens');
      return false;
    }
    setErrorMessage('');
    return true;
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatSlug(e.target.value);
    setSlug(formatted);
    setIsValid(validateSlug(formatted));
  };

  const generateFromTitle = () => {
    const generated = formatSlug(title);
    setSlug(generated);
    setIsValid(validateSlug(generated));
  };

  const handleSave = async () => {
    if (!isValid || !slug) return;
    
    setIsSaving(true);
    try {
      await onSave(slug);
      toast.success('URL updated successfully');
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update URL');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && !isSaving) {
      handleSave();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  const fullUrl = `/${workspaceSlug}/${type}s/${slug || 'your-slug-here'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Edit URL Slug
            </h2>
            <p className="text-sm text-neutral-500 dark:text-gray-400 mt-1">
              Customize the URL for this {type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Input with generate button */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
              URL Slug
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={slug}
                  onChange={handleSlugChange}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., my-awesome-prompt"
                  className={`${
                    !isValid 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'focus:ring-blue-500'
                  }`}
                  autoFocus
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={generateFromTitle}
                title="Generate from title"
                className="h-10 w-10"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Error message */}
            {!isValid && errorMessage && (
              <div className="flex items-center gap-1 mt-2 text-red-500 text-xs">
                <AlertCircle className="h-3 w-3" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* URL Preview */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
              Preview
            </label>
            <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <Link2 className="h-4 w-4 text-neutral-400" />
              <code className="text-sm text-neutral-600 dark:text-gray-400 break-all">
                {fullUrl}
              </code>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving || slug === currentSlug}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}