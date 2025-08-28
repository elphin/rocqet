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
    const { invite_id } = body;
    
    // Get the invite
    const { data: invite } = await supabase
      .from('workspace_invites')
      .select('*')
      .eq('id', invite_id)
      .eq('status', 'pending')
      .single();
    
    if (!invite) {
      return NextResponse.json({ 
        error: 'Invalid or expired invitation' 
      }, { status: 404 });
    }
    
    // Update the invite status to rejected
    const { error } = await supabase
      .from('workspace_invites')
      .update({ 
        status: 'rejected',
        rejected_by: user.id,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', invite_id);
    
    if (error) {
      return NextResponse.json({ 
        error: 'Failed to decline invitation' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      message: 'Invitation declined' 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}