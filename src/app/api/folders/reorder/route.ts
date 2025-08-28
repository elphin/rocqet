import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspace_id, folders } = await req.json();

    // Verify user has access to this workspace
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!membership || !['owner', 'admin', 'member'].includes(membership.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update sort order for each folder
    const updates = folders.map((folder: { id: string; sort_order: number }) =>
      supabase
        .from('folders')
        .update({ sort_order: folder.sort_order })
        .eq('id', folder.id)
        .eq('workspace_id', workspace_id)
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reordering folders:', error);
    return NextResponse.json(
      { error: 'Failed to reorder folders' },
      { status: 500 }
    );
  }
}