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
  
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (timestamp < oneDayAgo) {
      processedEvents.delete(eventId);
    }
  }
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
    plan: planId,
    status: 'active',
    currentPeriodStart: new Date(current_billing_period.starts_at),
    currentPeriodEnd: new Date(current_billing_period.ends_at),
    cancelAtPeriodEnd: false,
  }).onConflictDoUpdate({
    target: userSubscriptions.userId,
    set: {
      paddleSubscriptionId: subscriptionId,
      paddleCustomerId: customer_id,
      plan: planId,
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
      canceledAt: canceled_at ? new Date(canceled_at) : null,
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
      canceledAt: new Date(),
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
    await db
      .update(users)
      .set({
        coins: db.raw(`coins + ${coinsToAdd}`),
      })
      .where(eq(users.id, userId));

    console.log(`✅ Awarded ${coinsToAdd} coins to user ${userId}`);
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
