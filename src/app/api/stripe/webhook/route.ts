import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe/config';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabase);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(invoice, supabase);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice, supabase);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const { 
    customer,
    subscription,
    metadata,
    customer_email
  } = session;

  if (!metadata?.user_id || !metadata?.workspace_id) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Get subscription details
  const sub = await stripe.subscriptions.retrieve(subscription as string);
  const quantity = sub.items.data[0]?.quantity || 1;
  const priceId = sub.items.data[0]?.price.id;

  // Determine tier based on product/price
  let tier = 'starter';
  if (metadata.tier) {
    tier = metadata.tier;
  }

  // Update workspace subscription
  const { error: workspaceError } = await supabase
    .from('workspaces')
    .update({
      subscription_tier: tier,
      stripe_customer_id: customer,
      stripe_subscription_id: subscription,
      subscription_status: 'active',
      seats: tier === 'team' ? quantity : 1,
      max_seats: tier === 'team' ? quantity : 1,
      subscription_started_at: new Date().toISOString()
    })
    .eq('id', metadata.workspace_id);

  if (workspaceError) {
    console.error('Error updating workspace:', workspaceError);
    throw workspaceError;
  }

  // For team tier, create or update account record
  if (tier === 'team') {
    const { error: accountError } = await supabase
      .from('accounts')
      .upsert({
        owner_id: metadata.user_id,
        subscription_tier: 'team',
        total_seats_purchased: quantity,
        stripe_customer_id: customer,
        stripe_subscription_id: subscription,
        stripe_price_id: priceId,
        subscription_status: 'active'
      }, {
        onConflict: 'owner_id,subscription_tier'
      });

    if (accountError) {
      console.error('Error updating account:', accountError);
    }
  }

  console.log(`✅ Subscription activated for workspace ${metadata.workspace_id}`);
}

/**
 * Handle subscription updates (upgrades, downgrades, quantity changes)
 */
async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const { metadata } = subscription;
  
  if (!metadata?.workspace_id) {
    console.error('No workspace_id in subscription metadata');
    return;
  }

  const quantity = subscription.items.data[0]?.quantity || 1;
  const status = subscription.status;

  // Update workspace
  const { error } = await supabase
    .from('workspaces')
    .update({
      subscription_status: status,
      seats: quantity,
      max_seats: quantity,
      subscription_ends_at: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error updating workspace subscription:', error);
  }

  // Update account if team tier
  if (metadata.tier === 'team' && metadata.user_id) {
    await supabase
      .from('accounts')
      .update({
        total_seats_purchased: quantity,
        subscription_status: status
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  console.log(`📝 Subscription updated: ${subscription.id}`);
}

/**
 * Handle subscription cancellation
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const { metadata } = subscription;

  if (!metadata?.workspace_id) {
    return;
  }

  // Downgrade to starter tier
  const { error } = await supabase
    .from('workspaces')
    .update({
      subscription_tier: 'starter',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      seats: 1,
      max_seats: 1,
      subscription_ends_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
  }

  // Update account if exists
  if (metadata.user_id) {
    await supabase
      .from('accounts')
      .update({
        subscription_status: 'canceled',
        stripe_subscription_id: null
      })
      .eq('stripe_subscription_id', subscription.id);
  }

  console.log(`❌ Subscription canceled: ${subscription.id}`);
}

/**
 * Handle successful payment
 */
async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  supabase: any
) {
  // Log successful payment
  console.log(`💰 Payment succeeded for invoice: ${invoice.id}`);
  
  // You can add payment history tracking here if needed
}

/**
 * Handle failed payment
 */
async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const subscription = invoice.subscription;
  
  if (!subscription) return;

  // Update subscription status to past_due
  const { error } = await supabase
    .from('workspaces')
    .update({
      subscription_status: 'past_due'
    })
    .eq('stripe_subscription_id', subscription);

  if (error) {
    console.error('Error updating payment status:', error);
  }

  console.log(`⚠️ Payment failed for invoice: ${invoice.id}`);
  
  // TODO: Send email notification to user
}