import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: folderId } = await context.params;
  
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Update the folder
    const { data: folder, error } = await supabase
      .from('folders')
      .update({
        name: name.trim(),
        description: description || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('Error in PATCH /api/folders/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: folderId } = await context.params;
  
  try {
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if folder has any prompts
    const { data: prompts, error: promptsError } = await supabase
      .from('prompts')
      .select('id')
      .eq('folder_id', folderId)
      .limit(1);

    if (promptsError) {
      console.error('Error checking prompts:', promptsError);
      return NextResponse.json(
        { error: 'Failed to check folder contents' },
        { status: 500 }
      );
    }

    if (prompts && prompts.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with prompts. Please move or delete prompts first.' },
        { status: 400 }
      );
    }

    // Check if folder has subfolders
    const { data: subfolders, error: subfoldersError } = await supabase
      .from('folders')
      .select('id')
      .eq('parent_id', folderId)
      .limit(1);

    if (subfoldersError) {
      console.error('Error checking subfolders:', subfoldersError);
      return NextResponse.json(
        { error: 'Failed to check subfolders' },
        { status: 500 }
      );
    }

    if (subfolders && subfolders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with subfolders. Please delete subfolders first.' },
        { status: 400 }
      );
    }

    // Delete the folder
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folderId);

    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/folders/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete folder' },
      { status: 500 }
    );
  }
}