import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { db } from '../storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Environment detection
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PADDLE_ENVIRONMENT = IS_PRODUCTION ? Environment.production : Environment.sandbox;

// Initialize Paddle with API key and environment
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
if (!PADDLE_API_KEY && process.env.NODE_ENV === 'development') {
  console.warn('⚠️ PADDLE_API_KEY not found. Paddle payment features will be disabled.');
}

const paddle = new Paddle(PADDLE_API_KEY || '', {
  environment: PADDLE_ENVIRONMENT,
});

// Paddle price IDs for subscription plans
// Pro Monthly: $19.99/month
const PADDLE_PRO_MONTHLY_PRICE_ID = process.env.PADDLE_PRO_MONTHLY_PRICE_ID || '';
// Pro Yearly: $199.99/year (save $40/year, ~16.67% discount)
const PADDLE_PRO_YEARLY_PRICE_ID = process.env.PADDLE_PRO_YEARLY_PRICE_ID || '';
// Team Monthly: $99.99/month
const PADDLE_TEAM_MONTHLY_PRICE_ID = process.env.PADDLE_TEAM_MONTHLY_PRICE_ID || '';
// Team Yearly: $999/year (save $200/year, ~16.67% discount)
const PADDLE_TEAM_YEARLY_PRICE_ID = process.env.PADDLE_TEAM_YEARLY_PRICE_ID || '';

// Paddle price IDs for coin packages (one-time purchases)
// Starter Pack: 250 coins - $49.99 ($0.20/prompt)
const PADDLE_COINS_STARTER_PRICE_ID = process.env.PADDLE_COINS_STARTER_PRICE_ID || '';
// Value Pack: 600 coins - $99.99 ($0.17/prompt) - "Most Popular"
const PADDLE_COINS_VALUE_PRICE_ID = process.env.PADDLE_COINS_VALUE_PRICE_ID || '';
// Power Pack: 1500 coins - $199.99 ($0.13/prompt)
const PADDLE_COINS_POWER_PRICE_ID = process.env.PADDLE_COINS_POWER_PRICE_ID || '';
// Ultimate Pack: 4000 coins - $399.99 ($0.10/prompt)
const PADDLE_COINS_ULTIMATE_PRICE_ID = process.env.PADDLE_COINS_ULTIMATE_PRICE_ID || '';

// Paddle Client Token for frontend (publishable key)
export const PADDLE_CLIENT_TOKEN = process.env.PADDLE_CLIENT_TOKEN || '';

// Paddle Webhook Secret for signature verification
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

export interface CreatePaddleCheckoutParams {
  userId: string;
  email: string;
  tier: 'pro' | 'team';
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface PaddleCoinPackageParams {
  userId: string;
  email: string;
  packageId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

/**
 * Create a Paddle checkout session for subscription
 * Supports Pro ($19.99/month or $199.99/year) and Team ($99.99/month or $999/year) plans
 */
export async function createPaddleCheckout(params: CreatePaddleCheckoutParams) {
  // Select the appropriate price ID based on tier and billing cycle
  let priceId = '';
  
  if (params.tier === 'pro') {
    priceId = params.billingCycle === 'monthly' 
      ? PADDLE_PRO_MONTHLY_PRICE_ID 
      : PADDLE_PRO_YEARLY_PRICE_ID;
  } else if (params.tier === 'team') {
    priceId = params.billingCycle === 'monthly' 
      ? PADDLE_TEAM_MONTHLY_PRICE_ID 
      : PADDLE_TEAM_YEARLY_PRICE_ID;
  }
    
  if (!priceId) {
    throw new Error(`Paddle price ID not configured for ${params.tier} ${params.billingCycle}`);
  }

  if (!PADDLE_API_KEY) {
    throw new Error('Paddle API key not configured');
  }

  try {
    // Create transaction using Paddle SDK 3.x+ API
    // Type assertion needed as SDK types may be outdated
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      customer: { email: params.email },
      customData: { 
        userId: params.userId,
        tier: params.tier,
        billingCycle: params.billingCycle,
      },
      collectionMode: 'automatic',
    } as any);
    
    // Return checkout URL with success URL as query parameter
    // Frontend will append this when opening checkout
    if (!transaction.checkout?.url) {
      throw new Error('Paddle checkout URL not returned');
    }
    
    const checkoutUrl = new URL(transaction.checkout.url);
    checkoutUrl.searchParams.append('success_url', params.successUrl);
    
    return checkoutUrl.toString();
  } catch (error: any) {
    throw new Error(`Failed to create Paddle checkout: ${error.message}`);
  }
}

/**
 * Create a Paddle checkout session for coin packages
 */
export async function createPaddleCoinCheckout(params: PaddleCoinPackageParams) {
  try {
    // Create transaction using Paddle SDK 3.x+ API
    // Type assertion needed as SDK types may be outdated
    const transaction = await paddle.transactions.create({
      items: [{ priceId: params.priceId, quantity: 1 }],
      customer: { email: params.email },
      customData: { 
        userId: params.userId,
        packageId: params.packageId 
      },
      collectionMode: 'automatic',
    } as any);
    
    if (!transaction.checkout?.url) {
      throw new Error('Paddle checkout URL not returned');
    }
    
    const checkoutUrl = new URL(transaction.checkout.url);
    checkoutUrl.searchParams.append('success_url', params.successUrl);
    
    return checkoutUrl.toString();
  } catch (error: any) {
    throw new Error(`Failed to create Paddle coin checkout: ${error.message}`);
  }
}

/**
 * Create a Paddle subscription (manual subscription creation)
 * Note: This is typically handled automatically via checkout
 */
export async function createPaddleSubscription(customerId: string, priceId: string) {
  try {
    // Use type assertion as Paddle SDK types may not be fully up to date
    const result = await (paddle.subscriptions as any).create({
      customerId,
      items: [{ priceId, quantity: 1 }],
    });
    return result;
  } catch (error: any) {
    throw new Error(`Failed to create Paddle subscription: ${error.message}`);
  }
}

/**
 * Cancel a Paddle subscription
 */
export async function cancelPaddleSubscription(subscriptionId: string) {
  try {
    return await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period',
    });
  } catch (error: any) {
    throw new Error(`Failed to cancel Paddle subscription: ${error.message}`);
  }
}

/**
 * Get Paddle subscription details
 */
export async function getPaddleSubscription(subscriptionId: string) {
  try {
    return await paddle.subscriptions.get(subscriptionId);
  } catch (error: any) {
    throw new Error(`Failed to get Paddle subscription: ${error.message}`);
  }
}

/**
 * Update user subscription tier based on Paddle subscription
 */
export async function updateUserSubscriptionFromPaddle(
  userId: string,
  subscriptionData: any
) {
  const status = subscriptionData.status;
  
  // Determine subscription tier based on price ID
  let tier: 'free' | 'pro' | 'team' = 'free';
  const priceId = subscriptionData.items?.[0]?.price?.id;
  
  // Match price ID to tier
  if (priceId === PADDLE_PRO_MONTHLY_PRICE_ID || priceId === PADDLE_PRO_YEARLY_PRICE_ID) {
    tier = 'pro';
  } else if (priceId === PADDLE_TEAM_MONTHLY_PRICE_ID || priceId === PADDLE_TEAM_YEARLY_PRICE_ID) {
    tier = 'team';
  }

  // Extract billing cycle from custom data or price ID
  let billingCycle: 'monthly' | 'yearly' = 'monthly';
  if (subscriptionData.customData?.billingCycle) {
    billingCycle = subscriptionData.customData.billingCycle;
  } else if (priceId === PADDLE_PRO_YEARLY_PRICE_ID || priceId === PADDLE_TEAM_YEARLY_PRICE_ID) {
    billingCycle = 'yearly';
  }

  await db.update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: status,
      paddleSubscriptionId: subscriptionData.id,
      paddleCustomerId: subscriptionData.customerId,
      paymentProvider: 'paddle',
      subscriptionCurrentPeriodEnd: subscriptionData.currentBillingPeriod?.endsAt 
        ? new Date(subscriptionData.currentBillingPeriod.endsAt) 
        : null,
    })
    .where(eq(users.id, userId));
}

/**
 * Verify Paddle webhook signature
 * Uses PADDLE_WEBHOOK_SECRET from environment to verify webhook authenticity
 * Returns 'dev-mode' string if secret not configured (allows dev testing)
 */
export function verifyPaddleWebhook(signature: string | null, rawBody: string): boolean | 'dev-mode' {
  if (!PADDLE_WEBHOOK_SECRET) {
    return 'dev-mode';
  }

  if (!signature) {
    return false;
  }

  try {
    // Paddle SDK handles signature verification internally
    const event = paddle.webhooks.unmarshal(rawBody, PADDLE_WEBHOOK_SECRET, signature);
    return event !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get Paddle price ID for coin package type
 */
export function getCoinPackagePriceId(packageType: 'starter' | 'value' | 'power' | 'ultimate'): string {
  const priceIds = {
    starter: PADDLE_COINS_STARTER_PRICE_ID,
    value: PADDLE_COINS_VALUE_PRICE_ID,
    power: PADDLE_COINS_POWER_PRICE_ID,
    ultimate: PADDLE_COINS_ULTIMATE_PRICE_ID,
  };
  
  const priceId = priceIds[packageType];
  if (!priceId) {
    throw new Error(`Paddle price ID not configured for coin package: ${packageType}`);
  }
  
  return priceId;
}

/**
 * Get coin amount for package type
 */
export function getCoinPackageAmount(packageType: 'starter' | 'value' | 'power' | 'ultimate'): number {
  const amounts = {
    starter: 250,
    value: 600,
    power: 1500,
    ultimate: 4000,
  };
  
  return amounts[packageType];
}

export { paddle, IS_PRODUCTION, PADDLE_ENVIRONMENT };
