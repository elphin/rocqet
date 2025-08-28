import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, STRIPE_PRODUCTS } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tier,
      period = 'monthly',
      workspaceId,
      seats = 1,
      successUrl,
      cancelUrl
    } = body;

    // Validate tier
    if (!['pro', 'team'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check if user is owner
    const { data: membership } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can manage billing' }, { status: 403 });
    }

    // Get or create Stripe customer
    let customerId = workspace.stripe_customer_id;
    
    if (!customerId) {
      // Create Stripe customer
      const { stripe } = await import('@/lib/stripe/config');
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          user_id: user.id,
          workspace_id: workspaceId
        }
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('workspaces')
        .update({ stripe_customer_id: customerId })
        .eq('id', workspaceId);
    }

    // Get the appropriate price ID
    let priceId: string;
    let quantity = 1;

    if (tier === 'pro') {
      priceId = STRIPE_PRODUCTS.pro.prices[period];
    } else if (tier === 'team') {
      priceId = STRIPE_PRODUCTS.team.prices[period];
      quantity = seats; // For team, quantity is the number of seats
    } else {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    if (!priceId) {
      return NextResponse.json(
        { error: 'Stripe products not configured. Please set environment variables.' },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      customerEmail: user.email!,
      priceId,
      quantity,
      successUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/settings/billing?success=true`,
      cancelUrl: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/${workspace.slug}/settings/billing`,
      metadata: {
        user_id: user.id,
        workspace_id: workspaceId,
        tier,
        period
      }
    });

    return NextResponse.json({ 
      checkoutUrl: session.url,
      sessionId: session.id 
    });

  } catch (error: any) {
    console.error('Checkout session error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET: Check subscription status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Get workspace with subscription info
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // If no Stripe subscription, return basic info
    if (!workspace.stripe_subscription_id) {
      return NextResponse.json({
        hasSubscription: false,
        tier: workspace.subscription_tier || 'starter',
        status: 'inactive'
      });
    }

    // Get subscription from Stripe
    const { stripe } = await import('@/lib/stripe/config');
    const subscription = await stripe.subscriptions.retrieve(
      workspace.stripe_subscription_id
    );

    return NextResponse.json({
      hasSubscription: true,
      tier: workspace.subscription_tier,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      seats: workspace.seats || 1,
      pricePerSeat: subscription.items.data[0]?.price.unit_amount 
        ? subscription.items.data[0].price.unit_amount / 100 
        : 0
    });

  } catch (error: any) {
    console.error('Subscription check error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check subscription' },
      { status: 500 }
    );
  }
}