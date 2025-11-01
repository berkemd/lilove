import { Paddle, EventName } from '@paddle/paddle-node-sdk';
import { db } from '../storage';
import { users, paymentTransactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { PADDLE_WEBHOOK_SECRET, PADDLE_ENVIRONMENT } from './paddle';

// Handle Paddle webhook events
export async function handlePaddleWebhook(signature: string, rawBody: string) {
  try {
    // Verify webhook signature
    if (!PADDLE_WEBHOOK_SECRET) {
      throw new Error('Paddle webhook secret not configured');
    }

    // Parse the webhook event
    const event = JSON.parse(rawBody);
    
    console.log('Received Paddle webhook:', event.event_type);

    // Handle different event types
    switch (event.event_type as EventName) {
      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event);
        break;
        
      case EventName.TransactionPaid:
        await handleTransactionPaid(event);
        break;
        
      case EventName.SubscriptionCreated:
        await handleSubscriptionCreated(event);
        break;
        
      case EventName.SubscriptionUpdated:
        await handleSubscriptionUpdated(event);
        break;
        
      case EventName.SubscriptionCanceled:
        await handleSubscriptionCanceled(event);
        break;
        
      case EventName.SubscriptionPaused:
        await handleSubscriptionPaused(event);
        break;
        
      case EventName.SubscriptionResumed:
        await handleSubscriptionResumed(event);
        break;
        
      case EventName.TransactionPaymentFailed:
        await handlePaymentFailed(event);
        break;
        
      default:
        console.log('Unhandled Paddle webhook event:', event.event_type);
    }

    return { received: true };
  } catch (error) {
    console.error('Paddle webhook error:', error);
    throw error;
  }
}

// Handle transaction completed event
async function handleTransactionCompleted(event: any) {
  const data = event.data;
  const userId = data.custom_data?.userId;
  
  if (!userId) {
    console.error('No userId in transaction custom_data');
    return;
  }

  // Create payment transaction record
  await db.insert(paymentTransactions).values({
    userId,
    type: data.custom_data?.type || 'subscription',
    description: `Paddle transaction ${data.id}`,
    amount: data.details?.totals?.total || '0',
    currency: data.currency_code || 'usd',
    status: 'completed',
    provider: 'paddle',
    processedAt: new Date(data.billed_at || Date.now()),
  });

  console.log('Transaction completed:', data.id);
}

// Handle transaction paid event
async function handleTransactionPaid(event: any) {
  const data = event.data;
  const userId = data.custom_data?.userId;
  
  if (!userId) {
    console.error('No userId in transaction custom_data');
    return;
  }

  // Check if it's a coin purchase
  if (data.custom_data?.type === 'coins') {
    const coinAmount = data.custom_data?.coinAmount || 0;
    
    // Add coins to user balance
    await db.update(users)
      .set({
        coinBalance: sql`${users.coinBalance} + ${coinAmount}`,
      })
      .where(eq(users.id, userId));
      
    console.log(`Added ${coinAmount} coins to user ${userId}`);
  }

  // Update payment transaction
  await db.update(paymentTransactions)
    .set({
      status: 'completed',
      paymentMethod: data.payment_method_type,
      processedAt: new Date(),
    })
    .where(eq(paymentTransactions.provider, 'paddle'));
}

// Handle subscription created event
async function handleSubscriptionCreated(event: any) {
  const data = event.data;
  const userId = data.custom_data?.userId;
  
  if (!userId) {
    console.error('No userId in subscription custom_data');
    return;
  }

  // Determine subscription tier from items
  let tier = 'pro';
  if (data.items && data.items.length > 0) {
    const priceId = data.items[0].price.id;
    if (priceId.includes('team')) {
      tier = 'team';
    } else if (priceId.includes('enterprise')) {
      tier = 'enterprise';
    }
  }

  // Update user subscription
  await db.update(users)
    .set({
      subscriptionTier: tier,
      subscriptionStatus: data.status,
      paddleSubscriptionId: data.id,
      paddleCustomerId: data.customer_id,
      paymentProvider: 'paddle',
      subscriptionCurrentPeriodEnd: data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null,
    })
    .where(eq(users.id, userId));

  console.log('Subscription created:', data.id);
}

// Handle subscription updated event
async function handleSubscriptionUpdated(event: any) {
  const data = event.data;
  
  // Find user by subscription ID
  const user = await db.select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, data.id))
    .limit(1);
    
  if (user.length === 0) {
    console.error('User not found for subscription:', data.id);
    return;
  }

  // Update subscription details
  await db.update(users)
    .set({
      subscriptionStatus: data.status,
      subscriptionCurrentPeriodEnd: data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null,
    })
    .where(eq(users.id, user[0].id));

  console.log('Subscription updated:', data.id);
}

// Handle subscription canceled event
async function handleSubscriptionCanceled(event: any) {
  const data = event.data;
  
  // Find user by subscription ID
  const user = await db.select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, data.id))
    .limit(1);
    
  if (user.length === 0) {
    console.error('User not found for subscription:', data.id);
    return;
  }

  // Update subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'cancelled',
      subscriptionCurrentPeriodEnd: data.current_billing_period?.ends_at ? new Date(data.current_billing_period.ends_at) : null,
    })
    .where(eq(users.id, user[0].id));

  console.log('Subscription canceled:', data.id);
}

// Handle subscription paused event
async function handleSubscriptionPaused(event: any) {
  const data = event.data;
  
  // Find user by subscription ID
  const user = await db.select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, data.id))
    .limit(1);
    
  if (user.length === 0) {
    console.error('User not found for subscription:', data.id);
    return;
  }

  // Update subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'paused',
    })
    .where(eq(users.id, user[0].id));

  console.log('Subscription paused:', data.id);
}

// Handle subscription resumed event
async function handleSubscriptionResumed(event: any) {
  const data = event.data;
  
  // Find user by subscription ID
  const user = await db.select()
    .from(users)
    .where(eq(users.paddleSubscriptionId, data.id))
    .limit(1);
    
  if (user.length === 0) {
    console.error('User not found for subscription:', data.id);
    return;
  }

  // Update subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'active',
    })
    .where(eq(users.id, user[0].id));

  console.log('Subscription resumed:', data.id);
}

// Handle payment failed event
async function handlePaymentFailed(event: any) {
  const data = event.data;
  
  // Find user by subscription ID or customer ID
  let user;
  if (data.subscription_id) {
    user = await db.select()
      .from(users)
      .where(eq(users.paddleSubscriptionId, data.subscription_id))
      .limit(1);
  } else if (data.customer_id) {
    user = await db.select()
      .from(users)
      .where(eq(users.paddleCustomerId, data.customer_id))
      .limit(1);
  }
    
  if (!user || user.length === 0) {
    console.error('User not found for failed payment');
    return;
  }

  // Update subscription status to past_due
  await db.update(users)
    .set({
      subscriptionStatus: 'past_due',
    })
    .where(eq(users.id, user[0].id));

  // Update transaction status
  await db.update(paymentTransactions)
    .set({
      status: 'failed',
      failureReason: data.details?.error_message || 'Payment failed',
    })
    .where(eq(paymentTransactions.provider, 'paddle'));

  console.log('Payment failed for transaction:', data.id);
}
/**
 * Paddle Webhook Handler
 * 
 * Handles Paddle webhook events for subscription lifecycle management.
 * Implements signature verification, idempotency, and event processing.
 * 
 * Requires: PADDLE_WEBHOOK_SECRET environment variable
 */

import type { RequestHandler } from "express";
import crypto from 'crypto';
import { db } from '../db';
import { userSubscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Verify Paddle webhook signature
 * 
 * Paddle sends a signature in the Paddle-Signature header using HMAC-SHA256.
 * Format: ts=<timestamp>;h1=<signature>
 */
function verifyPaddleSignature(
  payload: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) {
    console.error('[Paddle Webhook] No Paddle-Signature header found');
    return false;
  }

  try {
    // Parse signature header: ts=1234567890;h1=abcdef...
    const parts = signature.split(';');
    const timestampPart = parts.find(p => p.startsWith('ts='));
    const signaturePart = parts.find(p => p.startsWith('h1='));

    if (!timestampPart || !signaturePart) {
      console.error('[Paddle Webhook] Invalid Paddle-Signature format:', { signature });
      return false;
    }

    const timestamp = timestampPart.split('=')[1];
    const receivedSignature = signaturePart.split('=')[1];

    // Check timestamp (prevent replay attacks - allow 5 minute window)
    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    if (Math.abs(currentTime - webhookTime) > 300) {
      console.error('[Paddle Webhook] Timestamp verification failed:', {
        currentTime,
        webhookTime,
        diff: Math.abs(currentTime - webhookTime),
      });
      return false;
    }

    // Verify signature
    const signedPayload = `${timestamp}:${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('[Paddle Webhook] Signature verification failed:', {
        expected: expectedSignature.substring(0, 10) + '...',
        received: receivedSignature.substring(0, 10) + '...',
      });
    }

    return isValid;
  } catch (error) {
    console.error('[Paddle Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Idempotency: Store processed event IDs to prevent duplicate processing
 * In production, use Redis or database table. For now, in-memory Map.
 */
const processedEvents = new Map<string, number>();

// Clean up old events every hour (keep for 24 hours)
setInterval(() => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const entriesToDelete: string[] = [];
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (timestamp < oneDayAgo) {
      entriesToDelete.push(eventId);
    }
  }
  entriesToDelete.forEach(id => processedEvents.delete(id));
}, 60 * 60 * 1000);

function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

function markEventProcessed(eventId: string): void {
  processedEvents.set(eventId, Date.now());
}

/**
 * Handle subscription.activated event
 */
async function handleSubscriptionActivated(event: any) {
  const { id: subscriptionId, customer_id, items, status, current_billing_period } = event.data;
  const userId = event.data.custom_data?.user_id;

  if (!userId) {
    console.error('No user_id in custom_data for subscription.activated');
    return;
  }

  // Get plan from items
  const planItem = items[0];
  const planId = event.data.custom_data?.plan_id || 'unknown';

  // Create or update subscription in database
  await db.insert(userSubscriptions).values({
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customer_id,
    planId: planId,
    status: 'active',
    billingCycle: 'monthly', // TODO: determine from product
    startedAt: new Date(current_billing_period.starts_at),
    currentPeriodStart: new Date(current_billing_period.starts_at),
    currentPeriodEnd: new Date(current_billing_period.ends_at),
    cancelAtPeriodEnd: false,
  }).onConflictDoUpdate({
    target: userSubscriptions.userId,
    set: {
      paddleSubscriptionId: subscriptionId,
      paddleCustomerId: customer_id,
      planId: planId,
      status: 'active',
      currentPeriodStart: new Date(current_billing_period.starts_at),
      currentPeriodEnd: new Date(current_billing_period.ends_at),
      cancelAtPeriodEnd: false,
    },
  });

  console.log(`✅ Subscription activated for user ${userId}: ${subscriptionId}`);
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(event: any) {
  const { id: subscriptionId, status, current_billing_period, canceled_at } = event.data;

  await db
    .update(userSubscriptions)
    .set({
      status: status === 'canceled' ? 'canceled' : 'active',
      currentPeriodStart: current_billing_period ? new Date(current_billing_period.starts_at) : undefined,
      currentPeriodEnd: current_billing_period ? new Date(current_billing_period.ends_at) : undefined,
      cancelledAt: canceled_at ? new Date(canceled_at) : null,
      cancelAtPeriodEnd: status === 'canceled' && current_billing_period !== null,
    })
    .where(eq(userSubscriptions.paddleSubscriptionId, subscriptionId));

  console.log(`✅ Subscription updated: ${subscriptionId} -> ${status}`);
}

/**
 * Handle subscription.canceled event
 */
async function handleSubscriptionCanceled(event: any) {
  const { id: subscriptionId } = event.data;

  await db
    .update(userSubscriptions)
    .set({
      status: 'canceled',
      cancelledAt: new Date(),
    })
    .where(eq(userSubscriptions.paddleSubscriptionId, subscriptionId));

  console.log(`✅ Subscription canceled: ${subscriptionId}`);
}

/**
 * Handle subscription.past_due event
 */
async function handleSubscriptionPastDue(event: any) {
  const { id: subscriptionId } = event.data;

  await db
    .update(userSubscriptions)
    .set({
      status: 'past_due',
    })
    .where(eq(userSubscriptions.paddleSubscriptionId, subscriptionId));

  console.log(`⚠️  Subscription past due: ${subscriptionId}`);
}

/**
 * Handle transaction.completed event (for one-time purchases like coins)
 */
async function handleTransactionCompleted(event: any) {
  const userId = event.data.custom_data?.user_id;
  const coinPackage = event.data.custom_data?.coin_package;

  if (!userId || !coinPackage) {
    console.error('Missing user_id or coin_package in transaction.completed');
    return;
  }

  // Award coins based on package
  const coinAmounts: Record<string, number> = {
    'coins-100': 100,
    'coins-500': 500,
    'coins-1000': 1000,
    'coins-5000': 5000,
  };

  const coinsToAdd = coinAmounts[coinPackage] || 0;
  if (coinsToAdd > 0) {
    // Get current coins and add
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user) {
      await db
        .update(users)
        .set({
          coinBalance: (user.coinBalance || 0) + coinsToAdd,
        })
        .where(eq(users.id, userId));

      console.log(`✅ Awarded ${coinsToAdd} coins to user ${userId}`);
    }
  }
}

/**
 * Main webhook handler
 */
export const handlePaddleWebhook: RequestHandler = async (req, res) => {
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error('[Paddle Webhook] PADDLE_WEBHOOK_SECRET not configured - webhook security disabled');
    console.error('[Paddle Webhook] This is a critical security issue - webhooks are vulnerable to spoofing');
    return res.status(500).json({ 
      error: 'Webhook not configured',
      message: 'PADDLE_WEBHOOK_SECRET environment variable is required'
    });
  }

  try {
    // Get raw body and signature
    const signature = req.headers['paddle-signature'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify signature
    if (!verifyPaddleSignature(rawBody, signature, webhookSecret)) {
      console.error('[Paddle Webhook] Signature verification failed:', {
        hasSignature: !!signature,
        bodyLength: rawBody.length,
        eventType: req.body?.event_type,
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventId = event.event_id || event.id;
    const eventType = event.event_type;

    // Check idempotency
    if (isEventProcessed(eventId)) {
      console.log(`⚠️  [Paddle Webhook] Duplicate event ${eventId} (${eventType}) - already processed`);
      return res.json({ received: true, duplicate: true });
    }

    // Mark as processed before handling (to prevent race conditions)
    markEventProcessed(eventId);

    // Log event with context
    console.log(`📥 [Paddle Webhook] Event received:`, {
      eventId,
      eventType,
      customerId: event.data?.customer_id,
      subscriptionId: event.data?.id,
      userId: event.data?.custom_data?.user_id,
    });

    // Handle event by type
    switch (eventType) {
      case 'subscription.activated':
        await handleSubscriptionActivated(event);
        break;

      case 'subscription.updated':
        await handleSubscriptionUpdated(event);
        break;

      case 'subscription.canceled':
        await handleSubscriptionCanceled(event);
        break;

      case 'subscription.past_due':
        await handleSubscriptionPastDue(event);
        break;

      case 'transaction.completed':
        await handleTransactionCompleted(event);
        break;

      default:
        console.log(`ℹ️  [Paddle Webhook] Unhandled event type: ${eventType}`);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('[Paddle Webhook] Processing error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      eventType: req.body?.event_type,
      eventId: req.body?.event_id || req.body?.id,
    });
    
    // Return 500 to trigger Paddle retry
    res.status(500).json({ 
      error: 'Internal error processing webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
