'use client';

import { ChainBuilderNew } from '@/components/chain-builder-new';
import dynamic from 'next/dynamic';

const ChainBuilderPremiumV2 = dynamic(
  () => import('@/components/chain-builder-premium-v2'),
  { ssr: false }
);

interface ChainEditorClientProps {
  isAdvancedChain: boolean;
  workspaceId: string;
  workspaceSlug: string;
  availablePrompts: any[];
  availableQueries?: any[];
  availableConnections?: any[];
  existingChain: any;
}

export function ChainEditorClient({
  isAdvancedChain,
  workspaceId,
  workspaceSlug,
  availablePrompts,
  availableQueries,
  availableConnections,
  existingChain
}: ChainEditorClientProps) {
  if (isAdvancedChain) {
    return (
      <ChainBuilderPremiumV2
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        availablePrompts={availablePrompts}
        availableQueries={availableQueries || []}
        availableConnections={availableConnections || []}
        mode="edit"
        existingChain={existingChain}
      />
    );
  }

  return (
    <ChainBuilderNew
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      availablePrompts={availablePrompts}
      mode="edit"
      existingChain={existingChain}
    />
  );
}