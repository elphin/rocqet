'use client';

import { ApiKeySettings } from '@/components/api-key-settings';

interface ApiKeysClientProps {
  workspace: any;
  membership: any;
  keys: any[];
  params: { workspace: string };
}

export function ApiKeysClient({ workspace, membership, keys, params }: ApiKeysClientProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          AI Provider API Keys
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Manage API keys for AI providers. These keys are used to execute prompts in your workspace.
        </p>
      </div>

      <ApiKeySettings workspaceId={workspace.id} />
    </div>
  );
}