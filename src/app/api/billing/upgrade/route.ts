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
    const { workspace_id, tier, period } = body;
    
    // Check if user is workspace owner
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace_id)
      .eq('user_id', user.id)
      .single();
    
    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only workspace owners can change billing' }, { status: 403 });
    }
    
    // In production, this would:
    // 1. Create/update Stripe subscription
    // 2. Handle payment
    // 3. Update database after successful payment
    
    // For development, directly update the tier
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        subscription_tier: tier,
        subscription_period: period,
        subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', workspace_id);
    
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    
    // Log the change in subscription history
    await supabase
      .from('subscription_history')
      .insert({
        workspace_id,
        tier,
        status: 'active',
        period,
        started_at: new Date().toISOString(),
        reason: 'manual_upgrade',
        metadata: {
          upgraded_by: user.id,
          previous_tier: body.previous_tier
        }
      });
    
    return NextResponse.json({ message: 'Subscription updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}