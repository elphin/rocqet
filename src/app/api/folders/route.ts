import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspace_id');

  if (!workspaceId) {
    return NextResponse.json(
      { error: 'Workspace ID is required' },
      { status: 400 }
    );
  }

  const { data: folders, error } = await supabase
    .from('folders')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(folders);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { name, workspace_id, parent_id, description } = body;

    if (!name || !workspace_id) {
      return NextResponse.json(
        { error: 'Name and workspace_id are required' },
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

    // Get the max sort_order for this workspace
    const { data: maxOrder } = await supabase
      .from('folders')
      .select('sort_order')
      .eq('workspace_id', workspace_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextSortOrder = maxOrder ? (maxOrder.sort_order || 0) + 1 : 0;

    // Create the folder with all required fields
    const { data: folder, error } = await supabase
      .from('folders')
      .insert({
        name: name.trim(),
        workspace_id,
        parent_id: parent_id || null,
        created_by: user.id,
        position: 0,
        description: description?.trim() || null,
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(folder);
  } catch (error: any) {
    console.error('Error in POST /api/folders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create folder' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');

    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
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
    console.error('Error in DELETE /api/folders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete folder' },
      { status: 500 }
    );
  }
}