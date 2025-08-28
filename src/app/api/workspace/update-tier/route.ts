import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get request body
    const body = await request.json();
    const { workspace_id, tier } = body;
    
    if (!workspace_id || !tier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Validate tier
    const validTiers = ['free', 'pro', 'business', 'enterprise'];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }
    
    // Check user is owner/admin of workspace
    const { data: member } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Only owners/admins can change tiers' }, { status: 403 });
    }
    
    // Update workspace tier (use plan field if subscription_tier doesn't exist)
    const { data: workspace, error: updateError } = await supabase
      .from('workspaces')
      .update({ 
        plan: tier,
        subscription_status: 'active',
        // Update limits based on tier
        monthly_prompt_limit: tier === 'free' ? 1000 : tier === 'pro' ? 10000 : tier === 'business' ? 100000 : -1,
        member_limit: tier === 'free' ? 5 : tier === 'pro' ? 20 : tier === 'business' ? 100 : -1
      })
      .eq('id', workspace_id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Update error:', updateError);
      // Try with subscription_tier field if it exists
      const { data: workspaceAlt, error: altError } = await supabase
        .from('workspaces')
        .update({ subscription_tier: tier })
        .eq('id', workspace_id)
        .select()
        .single();
      
      if (altError) {
        throw updateError; // Use original error
      }
      
      return NextResponse.json({ 
        success: true, 
        workspace: workspaceAlt,
        message: `Workspace tier updated to ${tier}`
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      workspace,
      message: `Workspace tier updated to ${tier}`
    });
    
  } catch (error: any) {
    console.error('Update tier error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}