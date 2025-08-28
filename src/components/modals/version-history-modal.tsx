'use client';

import { useState, useEffect } from 'react';
import { X, GitBranch, Clock, User, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils/date';
import { toast } from 'sonner';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptId: string;
  currentVersion: number;
}

interface Version {
  id: string;
  version: number;
  content: string;
  changes: any;
  created_at: string;
  created_by: string;
}

export function VersionHistoryModal({ 
  isOpen, 
  onClose, 
  promptId,
  currentVersion 
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [comparingVersions, setComparingVersions] = useState<[number, number] | null>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    }
  }, [isOpen, promptId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_versions')
        .select('*')
        .eq('prompt_id', promptId)
        .order('version', { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      toast.error('Failed to load version history');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (version: Version) => {
    try {
      const response = await fetch('/api/prompts/restore-version', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptId,
          versionId: version.id,
          content: version.content
        })
      });

      if (!response.ok) throw new Error('Failed to restore version');
      
      toast.success(`Restored to version ${version.version}`);
      onClose();
      window.location.reload();
    } catch (error) {
      toast.error('Failed to restore version');
    }
  };

  const getChangesSummary = (changes: any) => {
    if (!changes) return 'No changes recorded';
    
    try {
      const changeObj = typeof changes === 'string' ? JSON.parse(changes) : changes;
      if (Array.isArray(changeObj)) {
        return `${changeObj.length} change${changeObj.length !== 1 ? 's' : ''}`;
      }
      return 'Changes recorded';
    } catch {
      return 'Changes recorded';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <GitBranch className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12">
              <GitBranch className="mx-auto text-zinc-300 dark:text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500 dark:text-zinc-400">No version history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className={`border rounded-lg transition-all ${
                    version.version === currentVersion
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                      : 'border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-lg">
                            Version {version.version}
                          </span>
                          {version.version === currentVersion && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-zinc-500 dark:text-zinc-400">
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDate(version.created_at)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User size={14} />
                            {version.created_by || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText size={14} />
                            {getChangesSummary(version.changes)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedVersion(
                            expandedVersion === version.id ? null : version.id
                          )}
                        >
                          {expandedVersion === version.id ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </Button>
                        {version.version !== currentVersion && (
                          <Button
                            size="sm"
                            onClick={() => handleRestore(version)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                    </div>

                    {expandedVersion === version.id && (
                      <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">
                            Content Preview
                          </div>
                          <pre className="text-sm font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {version.content.substring(0, 500)}
                            {version.content.length > 500 && '...'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}