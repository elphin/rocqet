'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import * as jsonpatch from 'fast-json-patch';

export async function createPromptVersion({
  promptId,
  content,
  message,
  workspaceSlug
}: {
  promptId: string;
  content: string;
  message: string;
  workspaceSlug: string;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get the current prompt
  const { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .select('*, prompt_versions(*)')
    .eq('id', promptId)
    .single();

  if (promptError || !prompt) {
    throw new Error('Prompt not found');
  }

  // Get the latest version
  const latestVersion = prompt.prompt_versions
    ?.sort((a: any, b: any) => b.version - a.version)[0];
  
  const newVersionNumber = (latestVersion?.version || 0) + 1;

  // Calculate diff using JSON Patch
  const previousContent = latestVersion?.content || prompt.content;
  const diff = jsonpatch.compare(
    { content: previousContent },
    { content }
  );

  // Create new version
  const { data: newVersion, error: versionError } = await supabase
    .from('prompt_versions')
    .insert({
      prompt_id: promptId,
      version: newVersionNumber,
      content,
      diff: diff,
      message: message || `Version ${newVersionNumber}`,
      created_by: user.id
    })
    .select()
    .single();

  if (versionError) {
    throw new Error('Failed to create version');
  }

  // Update the main prompt with new content
  const { error: updateError } = await supabase
    .from('prompts')
    .update({ 
      content,
      updated_at: new Date().toISOString()
    })
    .eq('id', promptId);

  if (updateError) {
    throw new Error('Failed to update prompt');
  }

  // Revalidate the prompt page
  revalidatePath(`/${workspaceSlug}/prompts/${prompt.slug}`);

  return newVersion;
}

export async function revertToVersion({
  promptId,
  versionId,
  workspaceSlug,
  promptSlug
}: {
  promptId: string;
  versionId: string;
  workspaceSlug: string;
  promptSlug: string;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get the version to revert to
  const { data: version, error: versionError } = await supabase
    .from('prompt_versions')
    .select('*')
    .eq('id', versionId)
    .single();

  if (versionError || !version) {
    throw new Error('Version not found');
  }

  // Get the current prompt
  const { data: prompt } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', promptId)
    .single();

  if (!prompt) {
    throw new Error('Prompt not found');
  }

  // Create a new version with the reverted content
  const { data: latestVersion } = await supabase
    .from('prompt_versions')
    .select('version')
    .eq('prompt_id', promptId)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  // Calculate diff
  const diff = jsonpatch.compare(
    { content: prompt.content },
    { content: version.content }
  );

  // Create new version entry
  await supabase
    .from('prompt_versions')
    .insert({
      prompt_id: promptId,
      version: newVersionNumber,
      content: version.content,
      diff: diff,
      message: `Reverted to version ${version.version}`,
      created_by: user.id
    });

  // Update the main prompt
  await supabase
    .from('prompts')
    .update({ 
      content: version.content,
      updated_at: new Date().toISOString()
    })
    .eq('id', promptId);

  revalidatePath(`/${workspaceSlug}/prompts/${promptSlug}`);
}

export async function compareVersions({
  versionId1,
  versionId2
}: {
  versionId1: string;
  versionId2: string;
}) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get both versions
  const { data: versions } = await supabase
    .from('prompt_versions')
    .select('*')
    .in('id', [versionId1, versionId2]);

  if (!versions || versions.length !== 2) {
    throw new Error('Versions not found');
  }

  const [v1, v2] = versions.sort((a, b) => a.version - b.version);
  
  // Calculate diff between versions
  const diff = jsonpatch.compare(
    { content: v1.content },
    { content: v2.content }
  );

  return {
    version1: v1,
    version2: v2,
    diff
  };
}