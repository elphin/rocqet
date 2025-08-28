'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

interface PublishToTemplateParams {
  promptId: string;
  category: string;
  whenToUse?: string;
}

export async function publishPromptToTemplate({ 
  promptId, 
  category, 
  whenToUse 
}: PublishToTemplateParams) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  // Check if user is admin (for now, hardcoded admin check)
  // TODO: Replace with proper role-based access control
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  const userEmail = user.email || '';
  
  if (!adminEmails.includes(userEmail)) {
    return { error: 'Only administrators can publish templates' };
  }

  try {
    // Get the prompt details
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (promptError || !prompt) {
      return { error: 'Prompt not found' };
    }

    // Check if template already exists for this prompt
    const { data: existingTemplate } = await supabase
      .from('prompt_templates')
      .select('id')
      .eq('source_prompt_id', promptId)
      .single();

    if (existingTemplate) {
      // Update existing template
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('prompt_templates')
        .update({
          title: prompt.name,
          description: prompt.description || '',
          content: prompt.content,
          shortcode: prompt.slug,
          variables: prompt.variables || [],
          model: prompt.model,
          temperature: prompt.temperature,
          max_tokens: prompt.max_tokens,
          parameters: prompt.parameters || {},
          category,
          when_to_use: whenToUse,
          tags: prompt.tags || [],
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id)
        .select()
        .single();

      if (updateError) throw updateError;

      revalidatePath('/templates');
      return { 
        success: true, 
        templateId: updatedTemplate.id,
        message: 'Template updated successfully' 
      };
    } else {
      // Generate slug for new template
      const baseSlug = prompt.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;

      // Create new template
      const { data: newTemplate, error: createError } = await supabase
        .from('prompt_templates')
        .insert({
          title: prompt.name,
          description: prompt.description || '',
          content: prompt.content,
          slug,
          shortcode: prompt.slug,
          variables: prompt.variables || [],
          model: prompt.model,
          temperature: prompt.temperature,
          max_tokens: prompt.max_tokens,
          parameters: prompt.parameters || {},
          category,
          when_to_use: whenToUse,
          tags: prompt.tags || [],
          author_id: user.id,
          author_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
          source_prompt_id: promptId,
          visibility: 'public',
          is_verified: true // Auto-verify admin templates
        })
        .select()
        .single();

      if (createError) throw createError;

      revalidatePath('/templates');
      return { 
        success: true, 
        templateId: newTemplate.id,
        templateSlug: newTemplate.slug,
        message: 'Template published successfully' 
      };
    }
  } catch (error: any) {
    console.error('Failed to publish template:', error);
    return { error: error.message || 'Failed to publish template' };
  }
}

interface ImportTemplateParams {
  templateId: string;
  workspaceId: string;
  folderId?: string;
}

export async function importTemplateToWorkspace({ 
  templateId, 
  workspaceId, 
  folderId 
}: ImportTemplateParams) {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('prompt_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return { error: 'Template not found' };
    }

    // Check user has access to workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return { error: 'No access to this workspace' };
    }

    // Generate unique slug for the workspace
    const baseSlug = template.shortcode || template.title.toLowerCase().replace(/\s+/g, '-');
    let slug = baseSlug;
    let counter = 1;
    
    // Check for existing slugs
    while (true) {
      const { data: existing } = await supabase
        .from('prompts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    // Create prompt in workspace
    const { data: newPrompt, error: createError } = await supabase
      .from('prompts')
      .insert({
        workspace_id: workspaceId,
        name: template.title,
        slug,
        description: template.description,
        content: template.content,
        variables: template.variables || [],
        parameters: template.parameters || {},
        model: template.model || 'gpt-4',
        temperature: template.temperature || 7,
        max_tokens: template.max_tokens,
        folder_id: folderId || null,
        tags: template.tags || [],
        when_to_use: template.when_to_use,
        visibility: 'private',
        is_shared: false,
        imported_from_template_id: templateId,
        created_by: user.id,
        updated_by: user.id
      })
      .select()
      .single();

    if (createError) throw createError;

    // Increment template usage count
    await supabase.rpc('increment', {
      table_name: 'prompt_templates',
      column_name: 'uses_count',
      row_id: templateId
    });

    // Track the import
    await supabase
      .from('template_uses')
      .insert({
        template_id: templateId,
        user_id: user.id,
        workspace_id: workspaceId,
        prompt_id: newPrompt.id
      });

    return { 
      success: true, 
      promptId: newPrompt.id,
      promptSlug: newPrompt.slug,
      message: 'Template imported successfully' 
    };
  } catch (error: any) {
    console.error('Failed to import template:', error);
    return { error: error.message || 'Failed to import template' };
  }
}

export async function checkIsAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return false;
  
  // For now, use environment variable for admin emails
  // TODO: Replace with proper role-based access control
  const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
  return adminEmails.includes(user.email || '');
}