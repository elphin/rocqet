import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { action, tagIds, workspaceId, data } = body;
    
    // Verify user has permission
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    switch (action) {
      case 'delete':
        // Delete multiple tags
        for (const tagId of tagIds) {
          // Remove from prompts first
          await supabase
            .from('prompt_tags')
            .delete()
            .eq('tag_id', tagId);
        }
        
        // Delete all tags
        const { error: deleteError } = await supabase
          .from('tags')
          .delete()
          .in('id', tagIds)
          .eq('workspace_id', workspaceId);
        
        if (deleteError) {
          return NextResponse.json({ error: deleteError.message }, { status: 400 });
        }
        
        // Log activity
        await supabase
          .from('activity_logs')
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            action: 'tags_bulk_deleted',
            entity_type: 'tag',
            metadata: { count: tagIds.length, tagIds }
          });
        
        return NextResponse.json({ success: true, deleted: tagIds.length });
        
      case 'merge':
        // Merge multiple tags into one
        const { targetTagId, sourceTagIds } = data;
        
        if (!targetTagId || !sourceTagIds?.length) {
          return NextResponse.json({ error: 'Target tag and source tags required' }, { status: 400 });
        }
        
        // Get all prompts that have source tags
        const { data: promptTags } = await supabase
          .from('prompt_tags')
          .select('prompt_id, tag_id')
          .in('tag_id', sourceTagIds);
        
        // Add target tag to those prompts (avoiding duplicates)
        if (promptTags && promptTags.length > 0) {
          const uniquePromptIds = [...new Set(promptTags.map(pt => pt.prompt_id))];
          
          for (const promptId of uniquePromptIds) {
            // Check if target tag already exists for this prompt
            const { data: existing } = await supabase
              .from('prompt_tags')
              .select('id')
              .eq('prompt_id', promptId)
              .eq('tag_id', targetTagId)
              .single();
            
            if (!existing) {
              await supabase
                .from('prompt_tags')
                .insert({
                  prompt_id: promptId,
                  tag_id: targetTagId
                });
            }
          }
        }
        
        // Remove source tags from all prompts
        await supabase
          .from('prompt_tags')
          .delete()
          .in('tag_id', sourceTagIds);
        
        // Delete source tags
        await supabase
          .from('tags')
          .delete()
          .in('id', sourceTagIds)
          .eq('workspace_id', workspaceId);
        
        // Log activity
        await supabase
          .from('activity_logs')
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            action: 'tags_merged',
            entity_type: 'tag',
            entity_id: targetTagId,
            metadata: { sourceTagIds, promptsUpdated: uniquePromptIds?.length || 0 }
          });
        
        return NextResponse.json({ 
          success: true, 
          merged: sourceTagIds.length,
          targetTagId 
        });
        
      case 'update-color':
        // Update color for multiple tags
        const { color } = data;
        
        if (!color) {
          return NextResponse.json({ error: 'Color required' }, { status: 400 });
        }
        
        const { error: updateError } = await supabase
          .from('tags')
          .update({ color })
          .in('id', tagIds)
          .eq('workspace_id', workspaceId);
        
        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 400 });
        }
        
        return NextResponse.json({ success: true, updated: tagIds.length });
        
      case 'add-to-prompts':
        // Add tags to multiple prompts
        const { promptIds } = data;
        
        if (!promptIds?.length) {
          return NextResponse.json({ error: 'Prompt IDs required' }, { status: 400 });
        }
        
        let added = 0;
        for (const tagId of tagIds) {
          for (const promptId of promptIds) {
            // Check if already exists
            const { data: existing } = await supabase
              .from('prompt_tags')
              .select('id')
              .eq('prompt_id', promptId)
              .eq('tag_id', tagId)
              .single();
            
            if (!existing) {
              await supabase
                .from('prompt_tags')
                .insert({
                  prompt_id: promptId,
                  tag_id: tagId
                });
              added++;
            }
          }
        }
        
        return NextResponse.json({ success: true, added });
        
      case 'remove-from-prompts':
        // Remove tags from multiple prompts
        const { promptIds: removePromptIds } = data;
        
        if (!removePromptIds?.length) {
          return NextResponse.json({ error: 'Prompt IDs required' }, { status: 400 });
        }
        
        const { error: removeError } = await supabase
          .from('prompt_tags')
          .delete()
          .in('tag_id', tagIds)
          .in('prompt_id', removePromptIds);
        
        if (removeError) {
          return NextResponse.json({ error: removeError.message }, { status: 400 });
        }
        
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}