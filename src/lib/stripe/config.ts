import Stripe from 'stripe';

// Initialize Stripe only if secret key is provided
export const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    })
  : null;

// Stripe Product/Price IDs (you'll set these in Stripe Dashboard)
export const STRIPE_PRODUCTS = {
  pro: {
    productId: process.env.STRIPE_PRO_PRODUCT_ID || '',
    prices: {
      monthly: process.env.STRIPE_PRO_PRICE_MONTHLY || '',
      yearly: process.env.STRIPE_PRO_PRICE_YEARLY || ''
    }
  },
  team: {
    productId: process.env.STRIPE_TEAM_PRODUCT_ID || '',
    // For team, we'll use metered billing or quantity-based pricing
    prices: {
      monthly: process.env.STRIPE_TEAM_PRICE_MONTHLY || '',
      yearly: process.env.STRIPE_TEAM_PRICE_YEARLY || ''
    }
  }
} as const;

// Stripe webhook secret
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Calculate price with volume discount for team seats
 */
export function calculateTeamPrice(seats: number, period: 'monthly' | 'yearly' = 'monthly'): number {
  const basePrice = period === 'yearly' ? 150 : 15;
  
  let discount = 0;
  if (seats >= 50) {
    discount = 0.20; // 20% off
  } else if (seats >= 20) {
    discount = 0.15; // 15% off
  } else if (seats >= 10) {
    discount = 0.10; // 10% off
  }
  
  const pricePerSeat = basePrice * (1 - discount);
  return Math.round(seats * pricePerSeat * 100) / 100; // Round to 2 decimals
}

/**
 * Get the appropriate Stripe price ID based on quantity (for volume discounts)
 * In Stripe Dashboard, you'll create graduated pricing tiers
 */
export function getTeamPriceId(seats: number, period: 'monthly' | 'yearly' = 'monthly'): string {
  // Stripe will handle the volume discounts if you set up graduated pricing
  // For now, return the base price ID
  return STRIPE_PRODUCTS.team.prices[period];
}

/**
 * Create a Stripe checkout session for upgrading
 */
export async function createCheckoutSession({
  customerId,
  customerEmail,
  priceId,
  quantity,
  successUrl,
  cancelUrl,
  metadata = {}
}: {
  customerId?: string;
  customerEmail: string;
  priceId: string;
  quantity?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    customer_email: customerId ? undefined : customerEmail,
    payment_method_types: ['card', 'ideal', 'sepa_debit'],
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: quantity || 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
    subscription_data: {
      metadata
    },
    // Enable proration for immediate upgrade
    subscription_data: {
      proration_behavior: 'always_invoice',
      metadata
    },
    // Allow quantity adjustments for team seats
    ...(quantity && {
      line_items: [
        {
          price: priceId,
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: 999,
          },
          quantity,
        },
      ],
    }),
  };

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return session;
}

/**
 * Create a Stripe customer portal session for managing subscription
 */
export async function createPortalSession({
  customerId,
  returnUrl
}: {
  customerId: string;
  returnUrl: string;
}) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}

/**
 * Update subscription quantity (for adding/removing seats)
 */
export async function updateSubscriptionQuantity(
  subscriptionId: string,
  quantity: number
) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  if (!subscription.items.data[0]) {
    throw new Error('No subscription items found');
  }

  const updated = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        quantity,
      },
    ],
    proration_behavior: 'always_invoice', // Charge immediately for additional seats
  });

  return updated;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
) {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at end of billing period
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}