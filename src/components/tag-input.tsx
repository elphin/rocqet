'use client';

import { useState, KeyboardEvent } from 'react';
import { X, Hash } from 'lucide-react';

interface Tag {
  id?: string;
  name: string;
  color?: string;
}

interface TagInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
  suggestions?: Tag[];
}

export function TagInput({
  tags,
  onTagsChange,
  placeholder = 'Add tags...',
  maxTags = 10,
  suggestions = []
}: TagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-red-100 text-red-700',
    'bg-gray-100 text-gray-700',
  ];

  const getTagColor = (index: number) => {
    return colors[index % colors.length];
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = input.trim().toLowerCase();
    if (trimmed && !tags.some(t => t.name.toLowerCase() === trimmed) && tags.length < maxTags) {
      const newTag: Tag = {
        name: trimmed,
        color: colors[tags.length % colors.length]
      };
      onTagsChange([...tags, newTag]);
      setInput('');
    }
  };

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  const addSuggestion = (suggestion: Tag) => {
    if (!tags.some(t => t.name === suggestion.name) && tags.length < maxTags) {
      onTagsChange([...tags, suggestion]);
      setInput('');
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => s.name.toLowerCase().includes(input.toLowerCase()) &&
         !tags.some(t => t.name === s.name)
  );

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 rounded-lg border border-gray-300 bg-white p-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {tags.map((tag, index) => (
          <span
            key={index}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tag.color || getTagColor(index)}`}
          >
            <Hash className="h-3 w-3" />
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        {tags.length < maxTags && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] px-2 py-1 text-sm focus:outline-none"
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border bg-white shadow-lg">
          <div className="p-1">
            {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => addSuggestion(suggestion)}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-gray-100"
              >
                <Hash className="h-3 w-3 text-gray-400" />
                {suggestion.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {tags.length >= maxTags && (
        <p className="mt-1 text-xs text-gray-500">Maximum {maxTags} tags allowed</p>
      )}
    </div>
  );
}