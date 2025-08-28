'use client';

import { useState } from 'react';
import { X, FileJson, FileText, FileCode, Table, Download } from 'lucide-react';
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

const formatDescriptions = {
  json: 'Complete data including all metadata, variables, and version history. Perfect for backup or transferring to another account.',
  markdown: 'Human-readable format ideal for documentation, sharing in chat, or posting to forums.',
  yaml: 'Configuration format commonly used in CI/CD pipelines and automation tools.',
  csv: 'Spreadsheet-compatible format for bulk operations and data analysis.'
};

export function ExportModal({ isOpen, onClose, prompt }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      // Simulate export delay for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
    } catch (error) {
      toast.error('Failed to export prompt');
    } finally {
      setExporting(false);
    }
  };

  const formats = [
    { id: 'json', name: 'JSON', icon: FileJson },
    { id: 'markdown', name: 'Markdown', icon: FileText },
    { id: 'yaml', name: 'YAML', icon: FileCode },
    { id: 'csv', name: 'CSV', icon: Table }
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">Export Prompt</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Current Selection */}
          <div className="mb-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Exporting: <span className="font-medium text-zinc-900 dark:text-zinc-100">{prompt.name}</span>
            </p>
          </div>

          {/* Export Format Label */}
          <div className="mb-3">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Export Format
            </label>
          </div>

          {/* Format Options */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {formats.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id as ExportFormat)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border transition-all
                    ${selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                    }
                  `}
                >
                  <Icon 
                    size={18} 
                    className={selectedFormat === format.id ? 'text-blue-500' : 'text-zinc-400'} 
                  />
                  <span className={`text-sm font-medium ${
                    selectedFormat === format.id ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {format.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Format Description */}
          <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex gap-2">
              <div className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
                {selectedFormat.toUpperCase()} format:
              </div>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
              {formatDescriptions[selectedFormat]}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={exporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2"
            disabled={exporting}
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}