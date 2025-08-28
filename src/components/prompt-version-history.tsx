'use client';

import { useState } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  Clock, 
  User, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { revertToVersion } from '@/app/actions/prompt-versions';
import { toast } from '@/lib/toast-config';

interface VersionHistoryProps {
  versions: any[];
  currentPromptId: string;
  workspaceSlug: string;
  promptSlug: string;
}

export function PromptVersionHistory({ 
  versions, 
  currentPromptId,
  workspaceSlug,
  promptSlug
}: VersionHistoryProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [reverting, setReverting] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState<string | null>(null);

  const handleRevert = async (versionId: string, versionNumber: number) => {
    if (!confirm(`Revert to version ${versionNumber}? This will create a new version.`)) {
      return;
    }

    setReverting(versionId);
    try {
      await revertToVersion({
        promptId: currentPromptId,
        versionId,
        workspaceSlug,
        promptSlug
      });
      
      toast.success(`Reverted to version ${versionNumber}`);
      // Reload to show new version
      window.location.reload();
    } catch (error) {
      console.error('Failed to revert:', error);
      toast.error('Failed to revert version');
    } finally {
      setReverting(null);
    }
  };

  const renderDiff = (diff: any[]) => {
    if (!diff || diff.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
        <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Changes</h4>
        <div className="space-y-2 font-mono text-xs">
          {diff.map((change, idx) => {
            const op = change.op;
            const path = change.path;
            const value = change.value;
            
            return (
              <div key={idx} className="flex items-start gap-2">
                {op === 'add' && (
                  <>
                    <Plus className="w-3 h-3 text-green-500 mt-0.5" />
                    <span className="text-green-700 dark:text-green-400">
                      Added: {path}
                    </span>
                  </>
                )}
                {op === 'remove' && (
                  <>
                    <Minus className="w-3 h-3 text-red-500 mt-0.5" />
                    <span className="text-red-700 dark:text-red-400">
                      Removed: {path}
                    </span>
                  </>
                )}
                {op === 'replace' && (
                  <>
                    <GitCommit className="w-3 h-3 text-yellow-500 mt-0.5" />
                    <span className="text-yellow-700 dark:text-yellow-400">
                      Modified: {path}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Git-style timeline */}
      <div className="relative">
        {/* Vertical line connecting commits */}
        <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-gray-300 dark:bg-neutral-600" />
        
        {versions.map((version, index) => (
          <div key={version.id} className="relative">
            {/* Commit node */}
            <div className="absolute left-2.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-neutral-900" />
            
            {/* Version card */}
            <div className="ml-10 pb-6">
              <div 
                className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpandedVersion(
                  expandedVersion === version.id ? null : version.id
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Version header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        v{version.version}
                      </span>
                      {index === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                          Current
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* Commit message */}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {version.message || `Version ${version.version}`}
                    </p>
                    
                    {/* Author info */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {version.created_by || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {index !== 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevert(version.id, version.version);
                        }}
                        disabled={reverting === version.id}
                        className="text-xs hover:bg-gray-100 dark:hover:bg-neutral-700"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Revert
                      </Button>
                    )}
                    {expandedVersion === version.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>
                
                {/* Expanded content */}
                {expandedVersion === version.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-700">
                    {/* Show diff if available */}
                    {version.diff && renderDiff(version.diff)}
                    
                    {/* Preview button */}
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDiff(showDiff === version.id ? null : version.id);
                        }}
                        className="text-xs"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        {showDiff === version.id ? 'Hide' : 'Show'} Content
                      </Button>
                    </div>
                    
                    {/* Content preview */}
                    {showDiff === version.id && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-900 rounded-lg">
                        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {version.content}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}