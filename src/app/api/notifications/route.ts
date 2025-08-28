import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: Fetch notifications for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by workspace if provided
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    // Note: is_archived column doesn't exist yet, skip for now

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    });

  } catch (error: any) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST: Create a new notification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      recipientId,
      workspaceId,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      metadata = {}
    } = body;

    // Validate required fields
    if (!recipientId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create notification with only columns that exist
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        workspace_id: workspaceId,
        type,
        title,
        message,
        data: {
          entityType,
          entityId,
          actionUrl,
          ...metadata
        }
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger real-time update (Supabase will handle this through database triggers)
    
    return NextResponse.json({ notification: data });

  } catch (error: any) {
    console.error('Notification creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH: Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds, action = 'read' } = body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'notificationIds array required' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    
    switch (action) {
      case 'read':
        updateData = { is_read: true, read_at: new Date().toISOString() };
        break;
      case 'unread':
        updateData = { is_read: false, read_at: null };
        break;
      // Archive functionality needs database column - skip for now
      case 'archive':
      case 'unarchive':
        return NextResponse.json({ error: 'Archive functionality not yet implemented' }, { status: 501 });
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update notifications
    const { error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('user_id', user.id)
      .in('id', notificationIds);

    if (error) {
      console.error('Error updating notifications:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Notification update error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE: Delete notifications
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID required' },
        { status: 400 }
      );
    }

    // Delete notification
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Notification deletion error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' },
      { status: 500 }
    );
  }
}