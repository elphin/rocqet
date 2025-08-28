import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: keyId } = await params;
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get the key to check workspace and provider
    const { data: key } = await supabase
      .from('workspace_api_keys')
      .select('workspace_id, provider')
      .eq('id', keyId)
      .single();
    
    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }
    
    // Check user is admin/owner of workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', key.workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only admins can manage API keys' }, { status: 403 });
    }
    
    // Unset other defaults for this provider
    await supabase
      .from('workspace_api_keys')
      .update({ is_default: false })
      .eq('workspace_id', key.workspace_id)
      .eq('provider', key.provider)
      .neq('id', keyId);
    
    // Set this key as default
    const { error } = await supabase
      .from('workspace_api_keys')
      .update({ is_default: true })
      .eq('id', keyId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
    
  } catch (error: any) {
    console.error('Set default API key error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}