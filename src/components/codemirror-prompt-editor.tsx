'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { 
  bracketMatching, 
  indentOnInput,
  syntaxHighlighting,
  defaultHighlightStyle,
  StreamLanguage,
  LanguageSupport
} from '@codemirror/language';
import { xml } from '@codemirror/lang-xml';
import { markdown } from '@codemirror/lang-markdown';
import { 
  autocompletion, 
  completionKeymap,
  CompletionContext,
  CompletionResult
} from '@codemirror/autocomplete';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Variable, 
  Code, 
  FileText, 
  Type,
  Braces,
  Search,
  Undo,
  Redo,
  WrapText,
  X
} from 'lucide-react';

interface CodeMirrorPromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  detectedVariables?: string[];
  mode?: 'prompt' | 'xml' | 'markdown';
}

export function CodeMirrorPromptEditor({
  value,
  onChange,
  placeholder = 'Write your prompt here...',
  className = '',
  detectedVariables = [],
  mode = 'prompt'
}: CodeMirrorPromptEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const languageCompartment = useRef(new Compartment());

  // State for mode switching
  const [currentMode, setCurrentMode] = useState(mode);
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagName, setTagName] = useState('');
  
  // Update mode when prop changes or internal state changes
  useEffect(() => {
    if (!viewRef.current) return;
    
    let languageExtension;
    switch (currentMode) {
      case 'xml':
        languageExtension = xml();
        break;
      case 'markdown':
        languageExtension = markdown();
        break;
      default:
        // Custom prompt language with variable detection
        languageExtension = StreamLanguage.define({
          token(stream) {
            // Check for {{variable}} or ${variable}
            if (stream.match(/\{\{[^}]+\}\}/) || stream.match(/\$\{[^}]+\}/)) {
              return 'variable';
            }
            stream.next();
            return null;
          }
        });
    }
    
    // Reconfigure the language
    viewRef.current.dispatch({
      effects: languageCompartment.current.reconfigure(languageExtension)
    });
  }, [currentMode]);

  // Variable autocomplete
  const variableAutocomplete = (context: CompletionContext): CompletionResult | null => {
    const word = context.matchBefore(/\{\{?\w*/);
    if (!word) return null;
    
    if (word.text.startsWith('{{') || word.text.startsWith('{')) {
      const suggestions = detectedVariables.map(v => ({
        label: `{{${v}}}`,
        type: 'variable',
        detail: 'Variable',
        apply: `{{${v}}}`
      }));
      
      // Add common AI prompt variables
      const commonVars = [
        'topic', 'audience', 'tone', 'length', 'style', 
        'context', 'goal', 'format', 'language', 'examples'
      ];
      
      commonVars.forEach(v => {
        if (!detectedVariables.includes(v)) {
          suggestions.push({
            label: `{{${v}}}`,
            type: 'variable',
            detail: 'Common variable',
            apply: `{{${v}}}`
          });
        }
      });
      
      return {
        from: word.from,
        options: suggestions,
        validFor: /^\{\{?\w*$/
      };
    }
    
    return null;
  };

  // Custom theme
  const rocqetTheme = EditorView.theme({
    '&': {
      fontSize: '13px',
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
    },
    '.cm-content': {
      padding: '12px',
      minHeight: '200px'
    },
    '.cm-focused': {
      outline: '2px solid #9333ea',
      outlineOffset: '-1px'
    },
    '.cm-line': {
      lineHeight: '1.6'
    },
    '.cm-variable': {
      color: '#9333ea',
      fontWeight: 'bold',
      backgroundColor: 'rgba(147, 51, 234, 0.1)',
      padding: '0 2px',
      borderRadius: '3px'
    },
    '.cm-tag': {
      color: '#0ea5e9'
    },
    '.cm-attribute': {
      color: '#10b981'
    },
    '.cm-string': {
      color: '#f59e0b'
    },
    '&.cm-editor.cm-focused': {
      outline: 'none'
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(147, 51, 234, 0.2) !important'
    },
    '.cm-gutters': {
      backgroundColor: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
      color: '#9ca3af',
      minWidth: '40px'
    },
    '&.dark .cm-gutters': {
      backgroundColor: '#1f2937',
      borderRight: '1px solid #374151',
      color: '#6b7280'
    },
    '&.dark .cm-content': {
      backgroundColor: '#111827',
      color: '#f3f4f6'
    }
  });

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    // Language configuration based on mode
    let languageExtension;
    switch (currentMode) {
      case 'xml':
        languageExtension = xml();
        break;
      case 'markdown':
        languageExtension = markdown();
        break;
      default:
        // Custom prompt language with variable detection
        languageExtension = StreamLanguage.define({
          token(stream) {
            // Check for {{variable}} or ${variable}
            if (stream.match(/\{\{[^}]+\}\}/) || stream.match(/\$\{[^}]+\}/)) {
              return 'variable';
            }
            stream.next();
            return null;
          }
        });
    }

    const startState = EditorState.create({
      doc: value,
      extensions: [
        languageCompartment.current.of(languageExtension),
        rocqetTheme,
        EditorView.lineWrapping,
        history(),
        bracketMatching(),
        indentOnInput(),
        highlightSelectionMatches(),
        syntaxHighlighting(defaultHighlightStyle),
        autocompletion({
          override: mode === 'prompt' ? [variableAutocomplete] : undefined,
          activateOnTyping: true
        }),
        placeholderExt(placeholder),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...completionKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
          
          // Track selection
          const selection = update.state.selection.main;
          if (selection.from !== selection.to) {
            setSelectedText(update.state.doc.sliceString(selection.from, selection.to));
          } else {
            setSelectedText('');
          }
        })
      ]
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // Only create once

  // Update content when value changes externally
  useEffect(() => {
    if (viewRef.current && viewRef.current.state.doc.toString() !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: viewRef.current.state.doc.length,
          insert: value
        }
      });
    }
  }, [value]);

  // Editor actions
  const makeVariable = () => {
    if (!viewRef.current || !selectedText) return;
    
    const view = viewRef.current;
    const selection = view.state.selection.main;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `{{${selectedText}}}`
      },
      selection: { anchor: selection.from + selectedText.length + 4 }
    });
    
    view.focus();
  };

  const wrapInXMLTag = () => {
    if (!viewRef.current || !selectedText) return;
    setShowTagModal(true);
    setTagName('');
  };
  
  const applyXMLTag = () => {
    if (!viewRef.current || !selectedText || !tagName) return;
    
    const view = viewRef.current;
    const selection = view.state.selection.main;
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert: `<${tagName}>${selectedText}</${tagName}>`
      }
    });
    
    setShowTagModal(false);
    setTagName('');
    view.focus();
  };

  const insertMarkdown = (type: 'bold' | 'italic' | 'code' | 'link') => {
    if (!viewRef.current) return;
    
    const view = viewRef.current;
    const selection = view.state.selection.main;
    const text = selectedText || 'text';
    let insert = '';
    
    switch (type) {
      case 'bold':
        insert = `**${text}**`;
        break;
      case 'italic':
        insert = `*${text}*`;
        break;
      case 'code':
        insert = `\`${text}\``;
        break;
      case 'link':
        const url = prompt('Enter URL:') || 'https://example.com';
        insert = `[${text}](${url})`;
        break;
    }
    
    view.dispatch({
      changes: {
        from: selection.from,
        to: selection.to,
        insert
      }
    });
    
    view.focus();
  };

  const undo = () => {
    if (viewRef.current) {
      viewRef.current.dispatch({ effects: EditorView.scrollIntoView(0) });
      document.execCommand('undo');
    }
  };

  const redo = () => {
    if (viewRef.current) {
      document.execCommand('redo');
    }
  };

  const search = () => {
    if (viewRef.current) {
      // Trigger search with Ctrl/Cmd+F
      const event = new KeyboardEvent('keydown', {
        key: 'f',
        ctrlKey: true,
        bubbles: true
      });
      viewRef.current.contentDOM.dispatchEvent(event);
    }
  };

  return (
    <>
    <div className={`border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
        {/* Mode selector */}
        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-neutral-200 dark:border-neutral-700">
          <Button
            size="sm"
            variant={currentMode === 'prompt' ? 'default' : 'ghost'}
            onClick={() => setCurrentMode('prompt')}
            className="h-7 px-2 text-xs"
          >
            <Type className="h-3 w-3 mr-1" />
            Prompt
          </Button>
          <Button
            size="sm"
            variant={currentMode === 'xml' ? 'default' : 'ghost'}
            onClick={() => setCurrentMode('xml')}
            className="h-7 px-2 text-xs"
          >
            <Code className="h-3 w-3 mr-1" />
            XML
          </Button>
          <Button
            size="sm"
            variant={currentMode === 'markdown' ? 'default' : 'ghost'}
            onClick={() => setCurrentMode('markdown')}
            className="h-7 px-2 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            Markdown
          </Button>
        </div>

        {/* Actions */}
        {selectedText && (
          <>
            <Button
              size="sm"
              onClick={makeVariable}
              onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
              className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Variable className="h-3 w-3 mr-1" />
              Make Variable
            </Button>
            
            {currentMode === 'xml' && (
              <Button
                size="sm"
                onClick={wrapInXMLTag}
                onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
                className="h-7 px-2 text-xs"
                variant="outline"
              >
                <Braces className="h-3 w-3 mr-1" />
                Wrap in Tag
              </Button>
            )}
          </>
        )}
        
        {currentMode === 'markdown' && (
          <>
            <Button
              size="sm"
              onClick={() => insertMarkdown('bold')}
              className="h-7 px-2 text-xs"
              variant="ghost"
              title="Bold"
            >
              <strong>B</strong>
            </Button>
            <Button
              size="sm"
              onClick={() => insertMarkdown('italic')}
              className="h-7 px-2 text-xs"
              variant="ghost"
              title="Italic"
            >
              <em>I</em>
            </Button>
            <Button
              size="sm"
              onClick={() => insertMarkdown('code')}
              className="h-7 px-2 text-xs"
              variant="ghost"
              title="Code"
            >
              <Code className="h-3 w-3" />
            </Button>
          </>
        )}
        
        <div className="flex-1" />
        
        {/* Right side tools */}
        <Button
          size="sm"
          onClick={search}
          className="h-7 px-2 text-xs"
          variant="ghost"
          title="Search (Ctrl+F)"
        >
          <Search className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          onClick={undo}
          className="h-7 px-2 text-xs"
          variant="ghost"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          onClick={redo}
          className="h-7 px-2 text-xs"
          variant="ghost"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-3 w-3" />
        </Button>
      </div>
      
      {/* Editor */}
      <div 
        ref={editorRef} 
        className="bg-white dark:bg-neutral-800 min-h-[200px]"
      />
      
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 text-[10px] text-neutral-500 dark:text-neutral-400">
        <div className="flex items-center gap-3">
          <span>{currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} mode</span>
          {detectedVariables.length > 0 && (
            <span>{detectedVariables.length} variables detected</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>Ctrl+F: Search</span>
          <span>Ctrl+Z: Undo</span>
          <span>Tab: Indent</span>
        </div>
      </div>
    </div>
    
    {/* XML Tag Modal */}
    {showTagModal && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-md mx-4">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Code className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                    Wrap in XML Tag
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-gray-500 mt-0.5">
                    Enter the tag name to wrap your selection
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTagModal(false);
                  setTagName('');
                }}
                className="text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300 -mt-1 -mr-1 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                  Tag Name
                </label>
                <Input
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g., instruction, context, example"
                  className="w-full"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagName) {
                      e.preventDefault(); // Prevent form submit
                      e.stopPropagation(); // Stop event bubbling
                      applyXMLTag();
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setShowTagModal(false);
                      setTagName('');
                    }
                  }}
                />
                <p className="text-xs text-neutral-500 dark:text-gray-500 mt-2">
                  Your selection will be wrapped: <code className="text-blue-600 dark:text-blue-400">&lt;{tagName || 'tag'}&gt;{selectedText.slice(0, 20)}{selectedText.length > 20 ? '...' : ''}&lt;/{tagName || 'tag'}&gt;</code>
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTagModal(false);
                  setTagName('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={applyXMLTag}
                disabled={!tagName}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Braces className="h-4 w-4 mr-2" />
                Apply Tag
              </Button>
            </div>
          </div>
        </div>
      </div>
    )}
  </>
  );
}