'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Lock, Variable, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SharedPromptViewProps {
  prompt: {
    id: string;
    name: string;
    description: string | null;
    content: string;
    model: string | null;
    temperature: number | null;
    max_tokens: number | null;
    top_p: number | null;
    tags: string[] | null;
  };
  shareSettings: {
    allowCopying: boolean;
    showVariables: boolean;
    hasPassword: boolean;
    passwordHash: string | null;
  };
}

export function SharedPromptView({ prompt, shareSettings }: SharedPromptViewProps) {
  const [authenticated, setAuthenticated] = useState(!shareSettings.hasPassword);
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [showVariablesModal, setShowVariablesModal] = useState(false);

  useEffect(() => {
    // Detect variables in content
    const regex = /\{\{([^}]+)\}\}/g;
    const matches = prompt.content?.match(regex);
    if (matches) {
      const vars = matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
      setDetectedVariables([...new Set(vars)]);
      
      const initialValues: Record<string, string> = {};
      vars.forEach(v => { initialValues[v] = ''; });
      setVariableValues(initialValues);
    }
  }, [prompt.content]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple password check (in production, this should be done server-side)
    if (shareSettings.passwordHash && btoa(password) === shareSettings.passwordHash) {
      setAuthenticated(true);
    } else {
      toast.error('Incorrect password');
    }
  };

  const handleCopy = () => {
    if (!shareSettings.allowCopying) {
      toast.error('Copying is disabled for this shared prompt');
      return;
    }

    let contentToCopy = prompt.content;
    
    // Replace variables if they have values
    if (detectedVariables.length > 0 && Object.keys(variableValues).some(k => variableValues[k])) {
      Object.entries(variableValues).forEach(([key, value]) => {
        if (value) {
          contentToCopy = contentToCopy.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        }
      });
    }

    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    toast.success('Prompt copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyWithVariables = () => {
    if (!shareSettings.allowCopying) {
      toast.error('Copying is disabled for this shared prompt');
      return;
    }
    setShowVariablesModal(true);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-zinc-400" size={24} />
            <h2 className="text-xl font-semibold">Password Protected</h2>
          </div>
          <p className="text-zinc-600 mb-6">
            This prompt is password protected. Please enter the password to continue.
          </p>
          <form onSubmit={handlePasswordSubmit}>
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-4"
              autoFocus
            />
            <Button type="submit" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
              Unlock
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
            <Sparkles size={16} />
            <span>Shared Prompt</span>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900 mb-3">{prompt.name}</h1>
          {prompt.description && (
            <p className="text-zinc-600">{prompt.description}</p>
          )}
          
          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {prompt.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-neutral-900 mb-4">Configuration</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Model</p>
              <p className="text-sm font-medium">{prompt.model || 'Default'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Temperature</p>
              <p className="text-sm font-medium">{prompt.temperature ?? 'Default'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Max Tokens</p>
              <p className="text-sm font-medium">{prompt.max_tokens ?? 'Default'}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Top P</p>
              <p className="text-sm font-medium">{prompt.top_p ?? 'Default'}</p>
            </div>
          </div>
        </div>

        {/* Variables */}
        {shareSettings.showVariables && detectedVariables.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Variable className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-neutral-900">Variables Detected</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {detectedVariables.map((variable, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                >
                  {`{{${variable}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-neutral-900">Prompt Content</h3>
            {shareSettings.allowCopying && (
              <div className="flex gap-2">
                {detectedVariables.length > 0 && shareSettings.showVariables && (
                  <Button
                    onClick={handleCopyWithVariables}
                    size="sm"
                    variant="outline"
                  >
                    <Variable className="h-4 w-4 mr-2" />
                    Copy with Variables
                  </Button>
                )}
                <Button
                  onClick={handleCopy}
                  size="sm"
                  variant="outline"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
          <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-700 bg-zinc-50 rounded-lg p-4">
            {prompt.content}
          </pre>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-zinc-500">
          <p>Shared via ROCQET - The GitHub for AI Prompts</p>
        </div>
      </div>

      {/* Variables Modal */}
      {showVariablesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Fill in Variables</h3>
              <div className="space-y-4">
                {detectedVariables.map((variable) => (
                  <div key={variable}>
                    <label className="text-sm font-medium text-zinc-700">
                      {variable}
                    </label>
                    <Input
                      value={variableValues[variable]}
                      onChange={(e) => setVariableValues({
                        ...variableValues,
                        [variable]: e.target.value
                      })}
                      placeholder={`Enter value for ${variable}`}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => setShowVariablesModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleCopy();
                    setShowVariablesModal(false);
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy with Values
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}