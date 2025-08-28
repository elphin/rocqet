'use client';

import { useState, useEffect } from 'react';
import { Variable, X, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/toast-config';

interface VariableFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptContent: string;
  promptName: string;
  onCopy?: (filledContent: string) => void;
}

export function VariableFillModal({ 
  isOpen, 
  onClose, 
  promptContent,
  promptName,
  onCopy
}: VariableFillModalProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Detect variables in content
  useEffect(() => {
    if (!promptContent) return;
    
    // Support both {{variable}} and ${variable} formats
    const regex1 = /\{\{([^}]+)\}\}/g;
    const regex2 = /\$\{([^}]+)\}/g;
    
    const matches1 = promptContent.match(regex1) || [];
    const matches2 = promptContent.match(regex2) || [];
    
    const allMatches = [...matches1, ...matches2];
    
    if (allMatches.length > 0) {
      const vars = allMatches.map((m: string) => 
        m.replace(/[\{\}$]/g, '').trim()
      );
      setDetectedVariables([...new Set(vars)]);
    }
  }, [promptContent]);

  const handleCopyWithVariables = () => {
    let filledContent = promptContent || '';
    
    Object.entries(variableValues).forEach(([key, value]) => {
      // Replace both {{variable}} and ${variable} formats
      const regex1 = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      const regex2 = new RegExp(`\\$\\{\\s*${key}\\s*\\}`, 'g');
      
      filledContent = filledContent.replace(regex1, value);
      filledContent = filledContent.replace(regex2, value);
    });
    
    navigator.clipboard.writeText(filledContent);
    
    if (onCopy) {
      onCopy(filledContent);
    }
    
    toast.success('Copied with variables!', `"${promptName}" has been copied with your values`);
    onClose();
    setVariableValues({});
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Variable className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-gray-100">
                  Fill in Variables
                </h3>
                <p className="text-xs text-neutral-500 dark:text-gray-500 mt-0.5">
                  {promptName}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                setVariableValues({});
              }}
              className="text-neutral-400 dark:text-gray-500 hover:text-neutral-600 dark:hover:text-gray-300 -mt-1 -mr-1 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <p className="text-sm text-neutral-600 dark:text-gray-400 mt-3">
            Replace the variables in your prompt with actual values
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {detectedVariables.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-gray-500 text-center py-4">
                No variables detected in this prompt
              </p>
            ) : (
              detectedVariables.map((variable) => (
                <div key={variable}>
                  <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-gray-300 mb-2">
                    <span className="font-mono text-purple-600 dark:text-purple-400">
                      {`{{${variable}}}`}
                    </span>
                  </label>
                  <Input
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => setVariableValues({
                      ...variableValues,
                      [variable]: e.target.value
                    })}
                    placeholder={`Enter value for ${variable}`}
                    className="w-full"
                  />
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                onClose();
                setVariableValues({});
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCopyWithVariables}
              disabled={detectedVariables.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy with Values
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}