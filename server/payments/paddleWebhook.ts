import { Request, Response } from 'express';
import { Paddle, EventName } from '@paddle/paddle-node-sdk';
import { db } from '../storage';
import { users, paymentTransactions, coinTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Paddle SDK
const paddle = new Paddle(process.env.PADDLE_API_KEY || '', {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
});

const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET || '';

export async function handlePaddleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['paddle-signature'] as string;
    
    if (!signature) {
      console.error('Missing Paddle signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify the webhook signature
    const isValid = paddle.webhooks.unmarshal(
      JSON.stringify(req.body),
      PADDLE_WEBHOOK_SECRET,
      signature
    );

    if (!isValid) {
      console.error('Invalid Paddle webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    const eventType = event.event_type;

    console.log(`Processing Paddle webhook: ${eventType}`);

    switch (eventType) {
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

      case EventName.TransactionCompleted:
        await handleTransactionCompleted(event);
        break;

      case EventName.TransactionPaid:
        await handleTransactionPaid(event);
        break;

      default:
        console.log(`Unhandled Paddle webhook event: ${eventType}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleSubscriptionCreated(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;
  const planId = data.custom_data?.planId;

  if (!userId) {
    console.error('Missing userId in subscription created event');
    return;
  }

  // Update user subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'active',
      subscriptionPlanId: planId,
      subscriptionEndsAt: new Date(data.current_billing_period.ends_at),
      paddleSubscriptionId: data.id,
      paddleCustomerId: data.customer_id
    })
    .where(eq(users.id, userId));

  console.log(`Subscription created for user ${userId}`);
}

async function handleSubscriptionUpdated(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;

  if (!userId) {
    console.error('Missing userId in subscription updated event');
    return;
  }

  // Update subscription details
  await db.update(users)
    .set({
      subscriptionStatus: data.status,
      subscriptionEndsAt: new Date(data.current_billing_period.ends_at)
    })
    .where(eq(users.id, userId));

  console.log(`Subscription updated for user ${userId}`);
}

async function handleSubscriptionCanceled(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;

  if (!userId) {
    console.error('Missing userId in subscription canceled event');
    return;
  }

  // Update user subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'cancelled',
      subscriptionEndsAt: new Date(data.canceled_at || Date.now())
    })
    .where(eq(users.id, userId));

  console.log(`Subscription cancelled for user ${userId}`);
}

async function handleSubscriptionPaused(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;

  if (!userId) {
    console.error('Missing userId in subscription paused event');
    return;
  }

  // Update user subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'paused'
    })
    .where(eq(users.id, userId));

  console.log(`Subscription paused for user ${userId}`);
}

async function handleSubscriptionResumed(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;

  if (!userId) {
    console.error('Missing userId in subscription resumed event');
    return;
  }

  // Update user subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'active',
      subscriptionEndsAt: new Date(data.current_billing_period.ends_at)
    })
    .where(eq(users.id, userId));

  console.log(`Subscription resumed for user ${userId}`);
}

async function handleTransactionCompleted(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;
  const type = data.custom_data?.type;

  if (!userId) {
    console.error('Missing userId in transaction completed event');
    return;
  }

  // Record payment transaction
  await db.insert(paymentTransactions).values({
    userId,
    type: type || 'subscription',
    description: `Paddle transaction ${data.id}`,
    amount: (data.details.totals.total / 100).toString(), // Convert from cents
    currency: data.currency_code.toLowerCase(),
    status: 'completed',
    provider: 'paddle',
    providerTransactionId: data.id
  });

  // If this is a coin purchase, award coins
  if (type === 'coins') {
    const packageId = data.custom_data?.packageId;
    if (packageId) {
      // Get coin package details and award coins
      const coinPackages = await import('@shared/schema').then(m => m.coinPackages);
      const packageRecord = await db.select()
        .from(coinPackages)
        .where(eq(coinPackages.id, packageId))
        .limit(1);

      if (packageRecord.length > 0) {
        const pkg = packageRecord[0];
        const totalCoins = pkg.coinAmount + (pkg.bonusCoins || 0);

        // Award coins to user
        const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (userRecord.length > 0) {
          const currentCoins = userRecord[0].coins || 0;
          const newBalance = currentCoins + totalCoins;

          await db.update(users)
            .set({ coins: newBalance })
            .where(eq(users.id, userId));

          // Log coin transaction
          await db.insert(coinTransactions).values({
            userId,
            amount: totalCoins,
            type: 'purchased',
            description: `Purchased ${pkg.name}`,
            balanceAfter: newBalance
          });

          console.log(`Awarded ${totalCoins} coins to user ${userId}`);
        }
      }
    }
  }

  console.log(`Transaction completed for user ${userId}`);
}

async function handleTransactionPaid(event: any) {
  const { data } = event;
  const userId = data.custom_data?.userId;

  if (!userId) {
    console.error('Missing userId in transaction paid event');
    return;
  }

  // Update transaction status
  await db.update(paymentTransactions)
    .set({ status: 'paid' })
    .where(eq(paymentTransactions.providerTransactionId, data.id));

  console.log(`Transaction paid for user ${userId}`);
}
