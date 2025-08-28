'use client';

import { useState } from 'react';
import { X, Download, FileJson, FileText, FileCode, Table } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
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
    visibility: string;
    shortcode: string | null;
    created_at: string;
    updated_at: string;
  };
}

type ExportFormat = 'json' | 'markdown' | 'yaml' | 'csv';

export function ExportModal({ isOpen, onClose, prompt }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');

  if (!isOpen) return null;

  const formatData = () => {
    switch (selectedFormat) {
      case 'json':
        return JSON.stringify(prompt, null, 2);
      
      case 'markdown':
        return `# ${prompt.name}

${prompt.description || 'No description'}

## Content
\`\`\`
${prompt.content}
\`\`\`

## Configuration
- **Model**: ${prompt.model || 'Not specified'}
- **Temperature**: ${prompt.temperature ?? 'Default'}
- **Max Tokens**: ${prompt.max_tokens ?? 'Default'}
- **Top P**: ${prompt.top_p ?? 'Default'}

## Metadata
- **Tags**: ${prompt.tags?.join(', ') || 'None'}
- **Visibility**: ${prompt.visibility}
- **Shortcode**: ${prompt.shortcode || 'None'}
- **Created**: ${new Date(prompt.created_at).toLocaleString()}
- **Updated**: ${new Date(prompt.updated_at).toLocaleString()}`;
      
      case 'yaml':
        return `name: "${prompt.name}"
description: "${prompt.description || ''}"
content: |
  ${prompt.content.split('\n').join('\n  ')}
model: ${prompt.model || 'null'}
temperature: ${prompt.temperature ?? 'null'}
max_tokens: ${prompt.max_tokens ?? 'null'}
top_p: ${prompt.top_p ?? 'null'}
tags:
${prompt.tags?.map(tag => `  - ${tag}`).join('\n') || '  []'}
visibility: ${prompt.visibility}
shortcode: ${prompt.shortcode || 'null'}
created_at: ${prompt.created_at}
updated_at: ${prompt.updated_at}`;
      
      case 'csv':
        const headers = ['Name', 'Description', 'Content', 'Model', 'Temperature', 'Max Tokens', 'Top P', 'Tags', 'Visibility', 'Shortcode', 'Created', 'Updated'];
        const values = [
          `"${prompt.name}"`,
          `"${prompt.description || ''}"`,
          `"${prompt.content.replace(/"/g, '""')}"`,
          `"${prompt.model || ''}"`,
          prompt.temperature ?? '',
          prompt.max_tokens ?? '',
          prompt.top_p ?? '',
          `"${prompt.tags?.join(', ') || ''}"`,
          prompt.visibility,
          prompt.shortcode || '',
          prompt.created_at,
          prompt.updated_at
        ];
        return `${headers.join(',')}\n${values.join(',')}`;
      
      default:
        return '';
    }
  };

  const handleExport = () => {
    const data = formatData();
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${prompt.name.toLowerCase().replace(/\s+/g, '-')}.${selectedFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported as ${selectedFormat.toUpperCase()}`);
    onClose();
  };

  const formats = [
    { id: 'json', name: 'JSON', icon: FileJson, description: 'Structured data format' },
    { id: 'markdown', name: 'Markdown', icon: FileText, description: 'Human-readable documentation' },
    { id: 'yaml', name: 'YAML', icon: FileCode, description: 'Configuration format' },
    { id: 'csv', name: 'CSV', icon: Table, description: 'Spreadsheet compatible' }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold">Export Prompt</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              {formats.map((format) => {
                const Icon = format.icon;
                return (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id as ExportFormat)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${selectedFormat === format.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                      }
                    `}
                  >
                    <Icon size={24} className={`mb-2 ${selectedFormat === format.id ? 'text-blue-500' : 'text-zinc-400'}`} />
                    <div className="font-medium text-sm">{format.name}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {format.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Preview</div>
            <pre className="text-xs font-mono text-zinc-700 dark:text-zinc-300 overflow-x-auto max-h-32 overflow-y-auto">
              {formatData().substring(0, 300)}...
            </pre>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}