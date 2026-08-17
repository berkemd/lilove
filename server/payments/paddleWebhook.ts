import { paddle, verifyPaddleWebhook, updateUserSubscriptionFromPaddle } from './paddle';
import { db } from '../storage';
import { users, coinTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';
import { trackServerEvent } from '../analytics/posthog';

/**
 * Handle incoming Paddle webhooks with signature verification
 * SECURITY: Verifies HMAC-SHA256 signature to prevent webhook spoofing
 */
export async function handlePaddleWebhook(req: Request) {
  const signature = req.headers['paddle-signature'] as string;
  const rawBody = JSON.stringify(req.body);
  const event = req.body;
  
  // SECURITY: Verify webhook signature using PADDLE_WEBHOOK_SECRET
  const verificationResult = verifyPaddleWebhook(signature, rawBody);
  
  if (verificationResult === 'dev-mode') {
    // DEV MODE: Allow webhook processing without signature verification
  } else if (!verificationResult) {
    // PRODUCTION: Reject invalid signatures
    await trackServerEvent('system', 'paddle_webhook_rejected', {
      reason: 'invalid_signature',
      eventType: event.event_type,
      ip: req.ip || req.socket.remoteAddress,
    });
    throw new Error('Invalid webhook signature');
  }

  switch (event.event_type) {
    case 'subscription.created':
      await handleSubscriptionCreated(event.data);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(event.data);
      break;
    case 'subscription.canceled':
    case 'subscription.cancelled':
      await handleSubscriptionCancelled(event.data);
      break;
    case 'subscription.paused':
      await handleSubscriptionPaused(event.data);
      break;
    case 'subscription.resumed':
      await handleSubscriptionResumed(event.data);
      break;
    case 'transaction.completed':
      await handleTransactionCompleted(event.data);
      break;
    case 'transaction.payment_failed':
      await handlePaymentFailed(event.data);
      break;
    case 'subscription.past_due':
      await handleSubscriptionPastDue(event.data);
      break;
    default:
      // Unhandled webhook event type
      break;
  }
}

/**
 * Handle subscription created event
 * Tracks subscription creation in PostHog and updates user database
 * Handles trial periods (7 days if applicable)
 */
async function handleSubscriptionCreated(data: any) {
  const userId = data.custom_data?.userId;
  const subscriptionId = data.id;
  const status = data.status;
  const tier = data.custom_data?.tier || 'pro';
  const billingCycle = data.custom_data?.billingCycle || 'monthly';
  
  if (!userId) {
    return;
  }


  // Update user subscription in database
  await updateUserSubscriptionFromPaddle(userId, data);
  
  // Determine if this is a trial subscription
  const isTrial = data.scheduledChange?.action === 'pause' || status === 'trialing';
  
  // Track subscription creation in PostHog
  await trackServerEvent('subscription_created', userId, {
    subscription_id: subscriptionId,
    status,
    tier,
    billing_cycle: billingCycle,
    price_id: data.items?.[0]?.price?.id,
    amount: data.items?.[0]?.price?.unitPrice?.amount,
    currency: data.currencyCode || 'USD',
    is_trial: isTrial,
    trial_days: isTrial ? 7 : 0,
  });
  
}

/**
 * Handle subscription updated event
 * Tracks changes in PostHog (tier changes, billing cycle changes, etc.)
 */
async function handleSubscriptionUpdated(data: any) {
  const subscriptionId = data.id;
  const status = data.status;
  
  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  // Get previous tier before update
  const previousTier = user.subscriptionTier;
  const previousStatus = user.subscriptionStatus;

  // Update subscription in database
  await updateUserSubscriptionFromPaddle(user.id, data);
  
  // Track update in PostHog
  await trackServerEvent('subscription_updated', user.id, {
    subscription_id: subscriptionId,
    status,
    previous_tier: previousTier,
    previous_status: previousStatus,
    new_status: status,
    price_id: data.items?.[0]?.price?.id,
  });
  
}

/**
 * Handle subscription cancelled event
 * Gracefully handles cancellations - user retains access until period end
 * Tracks cancellation in PostHog
 */
async function handleSubscriptionCancelled(data: any) {
  const subscriptionId = data.id;
  const scheduledChange = data.scheduledChange;
  
  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  // Update user status - keep tier until period end
  await db.update(users)
    .set({
      subscriptionStatus: 'cancelled',
      // Note: subscriptionTier will be downgraded to 'free' when subscription actually expires
      // This allows users to keep access until their current period ends
    })
    .where(eq(users.id, user.id));
  
  // Track cancellation in PostHog
  await trackServerEvent('subscription_canceled', user.id, {
    subscription_id: subscriptionId,
    previous_tier: user.subscriptionTier,
    scheduled_change_date: scheduledChange?.effectiveAt,
    cancellation_effective_immediately: scheduledChange?.action === 'cancel',
  });
  
}

/**
 * Handle subscription paused event
 */
async function handleSubscriptionPaused(data: any) {
  const subscriptionId = data.id;
  
  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  await db.update(users)
    .set({
      subscriptionStatus: 'paused',
    })
    .where(eq(users.id, user.id));
}

/**
 * Handle subscription resumed event
 */
async function handleSubscriptionResumed(data: any) {
  const subscriptionId = data.id;
  
  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  await updateUserSubscriptionFromPaddle(user.id, data);
}

/**
 * Handle transaction completed event (payment successful)
 */
async function handleTransactionCompleted(data: any) {
  const userId = data.custom_data?.userId;
  const packageId = data.custom_data?.packageId;
  
  if (!userId) {
    return;
  }

  // If this is a coin package purchase
  if (packageId) {
    await handleCoinPackagePurchase(userId, packageId, data);
  }

  
  await trackServerEvent('payment_completed', userId, {
    transaction_id: data.id,
    amount: data.details?.totals?.total,
    currency: data.currency_code,
    package_id: packageId,
  });
}

/**
 * Handle coin package purchase
 * Updated to handle new coin packages: starter, value, power, ultimate
 */
async function handleCoinPackagePurchase(userId: string, packageId: string, transactionData: any) {
  // Coin package amounts - updated to match requirements
  const coinPackages: Record<string, number> = {
    // Current package IDs (packageType)
    'starter': 250,   // $49.99 - $0.20/prompt
    'value': 600,     // $99.99 - $0.17/prompt - Most Popular
    'power': 1500,    // $199.99 - $0.13/prompt
    'ultimate': 4000, // $399.99 - $0.10/prompt
    // Legacy numeric package IDs (for backwards compatibility)
    'coins.250': 250,
    'coins.600': 600,
    'coins.1500': 1500,
    'coins.4000': 4000,
    // Old legacy package IDs
    'starter-pack': 100,
    'popular-pack': 500,
    'value-pack': 1000,
    'mega-pack': 5000,
  };

  const coinsToAdd = coinPackages[packageId] || 0;
  
  if (coinsToAdd === 0) {
    return;
  }

  // Add coins to user balance
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return;
  }

  const newBalance = (user.coinBalance || 0) + coinsToAdd;

  await db.update(users)
    .set({ coinBalance: newBalance })
    .where(eq(users.id, userId));

  // Record transaction
  await db.insert(coinTransactions).values({
    userId,
    amount: coinsToAdd,
    type: 'purchase',
    balance: newBalance,
    source: 'purchase',
    sourceId: packageId,
    description: `Purchased ${coinsToAdd} coins via Paddle`,
  });

  
  // Track coin package purchase in PostHog
  await trackServerEvent('coin_package_purchased', userId, {
    package_id: packageId,
    coins_purchased: coinsToAdd,
    new_balance: newBalance,
    transaction_id: transactionData.id,
    amount: transactionData.details?.totals?.total,
    currency: transactionData.currency_code || 'USD',
  });
  
}

/**
 * Handle payment failed event
 * Tracks failed payments in PostHog for monitoring
 */
async function handlePaymentFailed(data: any) {
  const subscriptionId = data.subscription_id;
  
  if (!subscriptionId) {
    return;
  }

  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  await db.update(users)
    .set({
      subscriptionStatus: 'past_due',
    })
    .where(eq(users.id, user.id));
  
  // Track failed payment in PostHog
  await trackServerEvent('payment_failed', user.id, {
    subscription_id: subscriptionId,
    transaction_id: data.id,
    error_code: data.error_code,
  });
  
}

/**
 * Handle subscription past_due event
 * Sets subscription to past_due status and tracks in PostHog
 */
async function handleSubscriptionPastDue(data: any) {
  const subscriptionId = data.id;
  
  // Find user by Paddle subscription ID
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, subscriptionId))
    .limit(1);

  if (!user) {
    return;
  }


  await db.update(users)
    .set({
      subscriptionStatus: 'past_due',
    })
    .where(eq(users.id, user.id));
  
  // Track past due status in PostHog
  await trackServerEvent('subscription_past_due', user.id, {
    subscription_id: subscriptionId,
  });
  
}
