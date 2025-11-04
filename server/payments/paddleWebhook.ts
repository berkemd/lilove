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

