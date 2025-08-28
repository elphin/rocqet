'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Variable, Hash } from 'lucide-react';

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  detectedVariables?: string[];
}

export function PromptEditor({ 
  value, 
  onChange, 
  placeholder,
  className = '',
  detectedVariables = []
}: PromptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [lineCount, setLineCount] = useState(1);

  // Update line numbers when content changes
  useEffect(() => {
    const lines = value.split('\n').length;
    setLineCount(lines);
  }, [value]);

  // Sync scroll position between textarea and highlight layer
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current && lineNumbersRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle text selection
  const handleSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelection({ start, end });
      } else {
        setSelection(null);
      }
    }
  };

  // Make selected text a variable
  const makeVariable = () => {
    if (!selection || !textareaRef.current) return;
    
    const selectedText = value.substring(selection.start, selection.end);
    if (!selectedText.trim()) return;
    
    // Check if already a variable
    if (selectedText.startsWith('{{') && selectedText.endsWith('}}')) return;
    
    const newValue = 
      value.substring(0, selection.start) + 
      `{{${selectedText}}}` + 
      value.substring(selection.end);
    
    onChange(newValue);
    
    // Clear selection
    setSelection(null);
    
    // Focus back on textarea
    textareaRef.current.focus();
  };

  // Auto-closing brackets
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Handle auto-closing brackets
    const pairs: Record<string, string> = {
      '{': '}',
      '[': ']',
      '(': ')',
      '"': '"',
      "'": "'",
      '`': '`'
    };

    if (pairs[e.key]) {
      e.preventDefault();
      
      // If text is selected, wrap it
      if (start !== end) {
        const newText = 
          text.substring(0, start) + 
          e.key + 
          text.substring(start, end) + 
          pairs[e.key] + 
          text.substring(end);
        onChange(newText);
        
        // Set cursor position after the selected text but before closing bracket
        setTimeout(() => {
          textarea.selectionStart = end + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
      } else {
        // Insert pair
        const newText = 
          text.substring(0, start) + 
          e.key + 
          pairs[e.key] + 
          text.substring(start);
        onChange(newText);
        
        // Set cursor position between the pair
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = start + 1;
        }, 0);
      }
    }
    
    // Handle backspace for bracket pairs
    if (e.key === 'Backspace' && start === end && start > 0) {
      const prevChar = text[start - 1];
      const nextChar = text[start];
      
      // Check if we're between a bracket pair
      if (pairs[prevChar] === nextChar) {
        e.preventDefault();
        const newText = 
          text.substring(0, start - 1) + 
          text.substring(start + 1);
        onChange(newText);
        
        // Set cursor position
        setTimeout(() => {
          textarea.selectionStart = start - 1;
          textarea.selectionEnd = start - 1;
        }, 0);
      }
    }
  };

  // Render highlighted content
  const renderHighlightedContent = () => {
    if (!value) return <span className="text-transparent">{placeholder}</span>;
    
    // Regex patterns for variables
    const variablePattern = /(\{\{[^}]+\}\}|\$\{[^}]+\})/g;
    
    const parts = value.split(variablePattern);
    
    return parts.map((part, index) => {
      if (part.match(variablePattern)) {
        // This is a variable - highlight it
        return (
          <span 
            key={index}
            className="text-purple-600 dark:text-purple-400 font-semibold"
          >
            {part}
          </span>
        );
      }
      // Regular text
      return <span key={index} className="text-transparent">{part}</span>;
    });
  };

  // Generate line numbers
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  return (
    <div className="relative">
      {/* Make Variable Button */}
      {selection && (
        <div className="absolute -top-10 left-0 z-10">
          <Button
            size="sm"
            onClick={makeVariable}
            className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Variable className="h-3 w-3 mr-1" />
            Make Variable
          </Button>
        </div>
      )}
      
      <div className="relative flex border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-white dark:bg-neutral-800">
        {/* Line Numbers */}
        <div 
          ref={lineNumbersRef}
          className="flex-shrink-0 w-12 py-2 px-3 bg-neutral-50 dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 text-right overflow-y-hidden select-none"
          style={{ 
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '12px',
            lineHeight: '20px'
          }}
        >
          {lineNumbers.map(num => (
            <div key={num} className="text-neutral-400 dark:text-neutral-600">
              {num}
            </div>
          ))}
        </div>
        
        {/* Editor Container */}
        <div className="relative flex-1">
          {/* Highlight Layer - behind textarea */}
          <div 
            ref={highlightRef}
            className="absolute inset-0 px-3 py-2 pointer-events-none overflow-auto whitespace-pre-wrap break-words"
            style={{ 
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '12px',
              lineHeight: '20px'
            }}
          >
            {renderHighlightedContent()}
          </div>
          
          {/* Textarea - on top, transparent text */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onSelect={handleSelect}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              relative w-full h-48 px-3 py-2 
              bg-transparent
              text-neutral-900 dark:text-gray-100
              placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0
              resize-y
              font-mono text-xs leading-5
              ${className}
            `}
            style={{ 
              caretColor: 'currentColor',
              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
              fontSize: '12px',
              lineHeight: '20px'
            }}
          />
        </div>
      </div>
      
      {/* Variable Detection Info */}
      {detectedVariables.length > 0 && (
        <div className="mt-3 flex items-start gap-2">
          <span className="text-[10px] text-neutral-500 dark:text-gray-400">Variables detected:</span>
          <div className="flex flex-wrap gap-1">
            {detectedVariables.map((v) => (
              <span
                key={v}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-mono"
              >
                {`{{${v}}}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}