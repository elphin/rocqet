import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('can_manage_tiers')
      .eq('user_id', user.id)
      .single();
    
    if (!adminUser || !adminUser.can_manage_tiers) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const tier = await request.json();
    
    // Update tier configuration
    const { error } = await supabase
      .from('tier_configurations')
      .update({
        display_name: tier.display_name,
        monthly_price: tier.monthly_price,
        yearly_price: tier.yearly_price,
        description: tier.description,
        features: tier.features,
        limits: tier.limits,
        highlighted: tier.highlighted,
        cta: tier.cta,
        updated_at: new Date().toISOString()
      })
      .eq('id', tier.id);
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    return NextResponse.json({ message: 'Tier updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}