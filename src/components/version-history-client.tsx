'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, GitBranch, Clock, User, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Version {
  id: string;
  version: number;
  content: string;
  variables: any;
  parameters: any;
  change_type: string;
  change_message?: string;
  created_at: string;
  created_by: string;
  diff?: any;
}

interface VersionHistoryClientProps {
  prompt: any;
  versions: Version[];
  workspace: any;
  membership: any;
  params: {
    workspace: string;
    id: string;
  };
}

export function VersionHistoryClient({
  prompt,
  versions,
  workspace,
  membership,
  params
}: VersionHistoryClientProps) {
  const router = useRouter();
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  const handleRestore = async (version: Version) => {
    if (!confirm(`Are you sure you want to restore to version ${version.version}?`)) {
      return;
    }

    setRestoringVersion(version.id);
    try {
      const response = await fetch('/api/prompts', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: prompt.id,
          workspace_id: workspace.id,
          content: version.content,
          variables: version.variables,
          model: (version.parameters as any)?.model,
          temperature: (version.parameters as any)?.temperature,
          version: prompt.version + 1,
          create_version: true
        }),
      });

      if (response.ok) {
        router.push(`/${params.workspace}/prompts/${prompt.slug}`);
        router.refresh();
      } else {
        alert('Failed to restore version');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    } finally {
      setRestoringVersion(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/${params.workspace}/prompts/${prompt.slug}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">Version History</h1>
                <p className="text-sm text-gray-500">{prompt.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Current version: v{prompt.version}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {versions && versions.length > 0 ? (
          <div className="space-y-4">
            {versions.map((version, index) => {
              const isCurrentVersion = version.version === prompt.version;
              const previousVersion = versions[index + 1];
              
              return (
                <div
                  key={version.id}
                  className={`rounded-lg bg-white shadow-sm ${
                    isCurrentVersion ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="p-6">
                    {/* Version Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4">
                        <div className={`rounded-full p-2 ${
                          isCurrentVersion ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <GitBranch className={`h-5 w-5 ${
                            isCurrentVersion ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              Version {version.version}
                            </h3>
                            {isCurrentVersion && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            {version.change_message || 'No description provided'}
                          </p>
                          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(version.created_at).toLocaleString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {version.created_by}
                            </span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                              {version.change_type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(version.content)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy
                        </Button>
                        {!isCurrentVersion && membership.role !== 'viewer' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleRestore(version)}
                            disabled={restoringVersion === version.id}
                          >
                            {restoringVersion === version.id ? 'Restoring...' : 'Restore'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Variables */}
                    {version.variables && (version.variables as any[]).length > 0 && (
                      <div className="mb-4 rounded-lg bg-gray-50 p-4">
                        <h4 className="mb-2 text-sm font-medium text-gray-700">Variables</h4>
                        <div className="flex flex-wrap gap-2">
                          {(version.variables as any[]).map((v: any) => (
                            <span
                              key={v.name}
                              className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700"
                            >
                              {`{{${v.name}}}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Model Settings */}
                    {version.parameters && (
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Model: {(version.parameters as any).model}</span>
                        <span>Temperature: {(version.parameters as any).temperature}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <GitBranch className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No version history</h3>
            <p className="mt-2 text-sm text-gray-500">
              Version history will appear here when you make changes to this prompt
            </p>
            <Link href={`/${params.workspace}/prompts/${prompt.slug}`}>
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Prompt
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}