/**
 * Paddle v2 Payment Integration
 * 
 * This module provides Paddle subscription and payment management.
 * Requires environment variables:
 * - PADDLE_ENV: 'sandbox' or 'production'
 * - PADDLE_VENDOR_ID: Paddle vendor/seller ID
 * - PADDLE_API_KEY: Paddle API key
 * - PADDLE_WEBHOOK_SECRET: Webhook signature verification secret
 */

import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { db } from '../db';
import { userSubscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Paddle client
const paddleEnv = process.env.PADDLE_ENV === 'production' ? Environment.production : Environment.sandbox;
const paddleApiKey = process.env.PADDLE_API_KEY;
const paddleVendorId = process.env.PADDLE_VENDOR_ID;

let paddleClient: Paddle | null = null;

if (paddleApiKey) {
  try {
    paddleClient = new Paddle(paddleApiKey, {
      environment: paddleEnv,
    });
    console.log(`✅ Paddle initialized in ${paddleEnv} mode`);
  } catch (error) {
    console.error('❌ Failed to initialize Paddle:', error);
  }
} else {
  console.warn('⚠️  PADDLE_API_KEY not configured - payment features will be disabled');
}

/**
 * Paddle product/price IDs
 * TODO: Update these with your actual Paddle product IDs
 */
const PADDLE_PRODUCTS = {
  // Subscription plans
  'heart-monthly': process.env.PADDLE_PRODUCT_HEART_MONTHLY || 'pri_heart_monthly',
  'heart-annual': process.env.PADDLE_PRODUCT_HEART_ANNUAL || 'pri_heart_annual',
  'peak-monthly': process.env.PADDLE_PRODUCT_PEAK_MONTHLY || 'pri_peak_monthly',
  'peak-annual': process.env.PADDLE_PRODUCT_PEAK_ANNUAL || 'pri_peak_annual',
  'champion-monthly': process.env.PADDLE_PRODUCT_CHAMPION_MONTHLY || 'pri_champion_monthly',
  'champion-annual': process.env.PADDLE_PRODUCT_CHAMPION_ANNUAL || 'pri_champion_annual',
  
  // Coin packages (one-time purchases)
  'coins-100': process.env.PADDLE_PRODUCT_COINS_100 || 'pri_coins_100',
  'coins-500': process.env.PADDLE_PRODUCT_COINS_500 || 'pri_coins_500',
  'coins-1000': process.env.PADDLE_PRODUCT_COINS_1000 || 'pri_coins_1000',
  'coins-5000': process.env.PADDLE_PRODUCT_COINS_5000 || 'pri_coins_5000',
} as const;

interface CheckoutOptions {
  successUrl?: string;
  cancelUrl?: string;
  couponCode?: string;
}

/**
 * Create a Paddle checkout session for a subscription plan
 */
export async function createPaddleCheckout(
  userId: string, 
  planId: string,
  options: CheckoutOptions = {}
) {
  if (!paddleClient) {
    throw new Error('Paddle not configured - please set PADDLE_API_KEY');
  }

  const priceId = PADDLE_PRODUCTS[planId as keyof typeof PADDLE_PRODUCTS];
  if (!priceId) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  // Get user info for checkout
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  try {
    const checkout = await paddleClient.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customer: {
        email: user.email,
      },
      customData: {
        user_id: userId,
        plan_id: planId,
      },
      checkout: {
        urlType: 'overlay',
      },
      successUrl: options.successUrl || `${process.env.APP_URL || 'https://lilove.org'}/payment-success`,
      cancelUrl: options.cancelUrl || `${process.env.APP_URL || 'https://lilove.org'}/payment-cancelled`,
      ...(options.couponCode && { discount: { code: options.couponCode } }),
    });

    return {
      url: checkout.checkout?.url || checkout.id,
      transactionId: checkout.id,
    };
  } catch (error) {
    console.error('Paddle checkout creation failed:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Create a Paddle checkout for coin purchase (one-time payment)
 */
export async function createPaddleCoinCheckout(
  userId: string, 
  coinPackage: string,
  options: CheckoutOptions = {}
) {
  if (!paddleClient) {
    throw new Error('Paddle not configured - please set PADDLE_API_KEY');
  }

  const priceId = PADDLE_PRODUCTS[coinPackage as keyof typeof PADDLE_PRODUCTS];
  if (!priceId) {
    throw new Error(`Invalid coin package: ${coinPackage}`);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  try {
    const checkout = await paddleClient.transactions.create({
      items: [
        {
          priceId: priceId,
          quantity: 1,
        },
      ],
      customer: {
        email: user.email,
      },
      customData: {
        user_id: userId,
        coin_package: coinPackage,
      },
      checkout: {
        urlType: 'overlay',
      },
      successUrl: options.successUrl || `${process.env.APP_URL || 'https://lilove.org'}/payment-success`,
      cancelUrl: options.cancelUrl || `${process.env.APP_URL || 'https://lilove.org'}/payment-cancelled`,
    });

    return {
      url: checkout.checkout?.url || checkout.id,
      transactionId: checkout.id,
    };
  } catch (error) {
    console.error('Paddle coin checkout creation failed:', error);
    throw new Error('Failed to create coin checkout session');
  }
}

/**
 * Get Paddle subscription details for a user
 */
export async function getPaddleSubscription(userId: string) {
  if (!paddleClient) {
    return null;
  }

  try {
    // Get subscription from database
    const [subscription] = await db
      .select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId))
      .limit(1);

    if (!subscription || !subscription.paddleSubscriptionId) {
      return null;
    }

    // Fetch latest data from Paddle
    const paddleSubscription = await paddleClient.subscriptions.get(subscription.paddleSubscriptionId);

    return {
      id: paddleSubscription.id,
      status: paddleSubscription.status,
      currentBillingPeriod: paddleSubscription.currentBillingPeriod,
      nextBilledAt: paddleSubscription.nextBilledAt,
      canceledAt: paddleSubscription.canceledAt,
      pausedAt: paddleSubscription.pausedAt,
      items: paddleSubscription.items,
    };
  } catch (error) {
    console.error('Failed to fetch Paddle subscription:', error);
    return null;
  }
}

/**
 * Cancel a Paddle subscription
 */
export async function cancelPaddleSubscription(subscriptionId: string, immediate: boolean = false) {
  if (!paddleClient) {
    throw new Error('Paddle not configured - please set PADDLE_API_KEY');
  }

  try {
    await paddleClient.subscriptions.cancel(subscriptionId, {
      effectiveFrom: immediate ? 'immediately' : 'next_billing_period',
    });

    // Update database
    await db
      .update(userSubscriptions)
      .set({ 
        status: immediate ? 'canceled' : 'canceling',
        cancelledAt: new Date(),
      })
      .where(eq(userSubscriptions.paddleSubscriptionId, subscriptionId));

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel Paddle subscription:', error);
    throw new Error('Failed to cancel subscription');
  }
}

/**
 * Update subscription (upgrade/downgrade)
 */
export async function updatePaddleSubscription(
  subscriptionId: string,
  newPriceId: string,
  prorationBehavior: 'prorated_immediately' | 'full_immediately' | 'do_not_bill' = 'prorated_immediately'
) {
  if (!paddleClient) {
    throw new Error('Paddle not configured - please set PADDLE_API_KEY');
  }

  try {
    const updated = await paddleClient.subscriptions.update(subscriptionId, {
      items: [
        {
          priceId: newPriceId,
          quantity: 1,
        },
      ],
      prorationBillingMode: prorationBehavior,
    });

    return {
      success: true,
      subscription: updated,
    };
  } catch (error) {
    console.error('Failed to update Paddle subscription:', error);
    throw new Error('Failed to update subscription');
  }
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivatePaddleSubscription(subscriptionId: string) {
  if (!paddleClient) {
    throw new Error('Paddle not configured - please set PADDLE_API_KEY');
  }

  try {
    await paddleClient.subscriptions.resume(subscriptionId, {
      effectiveFrom: 'immediately',
    });

    // Update database
    await db
      .update(userSubscriptions)
      .set({ 
        status: 'active',
        cancelledAt: null,
      })
      .where(eq(userSubscriptions.paddleSubscriptionId, subscriptionId));

    return { success: true };
  } catch (error) {
    console.error('Failed to reactivate Paddle subscription:', error);
    throw new Error('Failed to reactivate subscription');
  }
}

/**
 * Get customer portal URL for subscription management
 */
export async function getPaddleCustomerPortal(userId: string) {
  // Get user and subscription
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new Error('User not found');
  }

  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);

  if (!subscription || !subscription.paddleCustomerId) {
    throw new Error('No active subscription found');
  }

  // Paddle customer portal URL
  const portalUrl = `https://${paddleEnv === Environment.production ? 'buy' : 'sandbox-buy'}.paddle.com/customer/${subscription.paddleCustomerId}`;

  return { url: portalUrl };
}

export { paddleClient, PADDLE_PRODUCTS };
