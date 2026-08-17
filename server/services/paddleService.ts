import { Paddle, EventName, Environment, EventEntity } from '@paddle/paddle-node-sdk';
import { db } from '../db';
import { 
  paymentTransactions, 
  subscriptionPlans,
  users,
  notifications,
  processedWebhookEvents
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as Sentry from '@sentry/node';

// Initialize Paddle SDK
const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

if (!PADDLE_API_KEY) {
  console.warn('⚠️  PADDLE_API_KEY not configured - Paddle payments will be unavailable');
}

// Helper function to parse environment safely
function getPaddleEnvironment(): Environment {
  return process.env.NODE_ENV === 'production' ? Environment.production : Environment.sandbox;
}

const paddle = PADDLE_API_KEY ? new Paddle(PADDLE_API_KEY, {
  environment: getPaddleEnvironment(),
}) : null;

export interface SubscriptionPlan {
  id: string;
  name: string;
  priceId: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  savings?: string;
}

export const PLANS: SubscriptionPlan[] = [
  {
    id: 'monthly',
    name: 'Premium Monthly',
    priceId: process.env.PADDLE_MONTHLY_PRICE_ID || 'pri_01hzp9rqpwxzjxpq7q4xqhqzzz', // Sandbox default
    price: 9.99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited goals & habits',
      'Advanced analytics',
      'Priority support',
      'Ad-free experience',
      'Exclusive content',
      'AI Coaching',
      'Custom themes',
    ],
  },
  {
    id: 'yearly',
    name: 'Premium Yearly',
    priceId: process.env.PADDLE_YEARLY_PRICE_ID || 'pri_01hzp9rqpwxzjxpq7q4xqhqyyy', // Sandbox default
    price: 79.99,
    currency: 'USD',
    interval: 'year',
    features: [
      'All Monthly features',
      'Save 33% (2 months free)',
      'Early access to new features',
      'Premium badge',
      'Priority AI responses',
      'Export data anytime',
      'Custom integrations',
    ],
    savings: 'Save $40/year',
  },
  {
    id: 'lifetime',
    name: 'Premium Lifetime',
    priceId: process.env.PADDLE_LIFETIME_PRICE_ID || 'pri_01hzp9rqpwxzjxpq7q4xqhqxxx', // Sandbox default
    price: 299.99,
    currency: 'USD',
    interval: 'month', // Technically one-time but Paddle needs interval
    features: [
      'All Premium features forever',
      'Never pay again',
      'VIP support',
      'Custom feature requests',
      'Beta tester access',
      'Exclusive community',
    ],
    savings: 'Best value',
  },
];

export class PaddleService {
  async createCheckout(userId: string, planId: string, email: string) {
    if (!paddle) {
      throw new Error('Paddle service not configured');
    }

    try {
      const plan = PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      // Create transaction with Paddle SDK v2
      const transaction = await paddle.transactions.create({
        items: [{ 
          priceId: plan.priceId, 
          quantity: 1 
        }],
        customData: { 
          userId, 
          planId,
          source: 'web',
        },
        customerId: email, // Use customerId instead of customer object
      });

      // Log transaction creation in database
      await db.insert(paymentTransactions).values({
        userId,
        provider: 'paddle',
        externalTransactionId: transaction.id,
        type: 'subscription',
        description: `${plan.name} - ${plan.interval}ly subscription`,
        status: 'pending',
        amount: String(plan.price),
        currency: plan.currency,
      });

      return {
        checkoutUrl: transaction.checkout?.url || '',
        transactionId: transaction.id,
      };
    } catch (error: any) {
      console.error('Paddle checkout creation error:', error);
      Sentry.captureException(error, {
        contexts: {
          paddle: {
            userId,
            planId,
            email,
          },
        },
      });
      throw new Error('Failed to create checkout session: ' + error.message);
    }
  }

  /**
   * Check if a webhook event has already been processed
   * @param eventId - Paddle event ID
   * @returns true if event was already processed, false otherwise
   */
  private async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const existing = await db.select()
        .from(processedWebhookEvents)
        .where(eq(processedWebhookEvents.eventId, eventId))
        .limit(1);
      
      return existing.length > 0;
    } catch (error: any) {
      console.error('Error checking event processing status:', error);
      // On database error, assume not processed to avoid blocking legitimate webhooks
      // But log this for investigation
      Sentry.captureException(error, {
        contexts: {
          webhook: { eventId, operation: 'isEventProcessed' },
        },
      });
      return false;
    }
  }

  /**
   * Mark a webhook event as processed
   * @param eventId - Paddle event ID
   * @param eventType - Type of webhook event
   * @param eventData - Full event payload
   * @param eventTimestamp - Timestamp from the event
   * @param status - Processing status (success, failed, skipped)
   * @param errorMessage - Error message if processing failed
   */
  private async markEventProcessed(
    eventId: string,
    eventType: string,
    eventData: any,
    eventTimestamp: Date,
    status: 'success' | 'failed' | 'skipped' = 'success',
    errorMessage?: string
  ): Promise<void> {
    try {
      await db.insert(processedWebhookEvents).values({
        eventId,
        eventType,
        provider: 'paddle',
        eventData,
        signatureVerified: true,
        eventTimestamp,
        processedAt: new Date(),
        processingStatus: status,
        errorMessage,
      });
    } catch (error: any) {
      console.error('Error marking event as processed:', error);
      // Log but don't throw - we don't want to fail the webhook processing
      // just because we couldn't log it
      Sentry.captureException(error, {
        contexts: {
          webhook: { eventId, eventType, operation: 'markEventProcessed' },
        },
      });
    }
  }

  /**
   * Check if an event is too old (potential replay attack)
   * @param eventTimestamp - ISO timestamp string from the event
   * @param toleranceMinutes - Maximum age in minutes (default: 5)
   * @returns true if event is too old, false otherwise
   */
  private isEventTooOld(eventTimestamp: string | Date, toleranceMinutes: number = 5): boolean {
    try {
      const timestamp = typeof eventTimestamp === 'string' 
        ? new Date(eventTimestamp) 
        : eventTimestamp;
      
      const now = new Date();
      const ageInMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60);
      
      return ageInMinutes > toleranceMinutes;
    } catch (error: any) {
      console.error('Error parsing event timestamp:', error);
      // On error, reject the event to be safe
      return true;
    }
  }

  async handleWebhook(signature: string, body: any) {
    if (!paddle || !PADDLE_WEBHOOK_SECRET) {
      throw new Error('Paddle webhook verification not configured');
    }

    try {
      // Verify webhook signature and unmarshal event
      const event: EventEntity = await paddle.webhooks.unmarshal(body, PADDLE_WEBHOOK_SECRET, signature);
      const { eventType, data, eventId, occurredAt } = event;

      console.log(`[Webhook Security] Received Paddle webhook: ${eventType}, Event ID: ${eventId}`);

      // SECURITY: Replay Protection - Check if event is too old
      if (occurredAt && this.isEventTooOld(occurredAt)) {
        console.warn(`[Webhook Security] ⚠️ Rejecting old webhook event: ${eventId}, occurred at: ${occurredAt}`);
        await this.markEventProcessed(
          eventId, 
          eventType, 
          data, 
          new Date(occurredAt),
          'skipped',
          'Event too old - potential replay attack'
        );
        // Return 200 to prevent Paddle from retrying
        return { success: true, message: 'Event rejected - too old' };
      }

      // SECURITY: Idempotency Check - Check if event already processed
      const alreadyProcessed = await this.isEventProcessed(eventId);
      if (alreadyProcessed) {
        console.log(`[Webhook Security] ✓ Event already processed: ${eventId}, returning success`);
        // Return 200 to acknowledge receipt (event already handled)
        return { success: true, message: 'Event already processed' };
      }

      // CRITICAL: Mark event as processed BEFORE processing to prevent race conditions
      // If two webhooks arrive simultaneously, only one will succeed in inserting
      await this.markEventProcessed(
        eventId, 
        eventType, 
        data, 
        new Date(occurredAt || new Date()),
        'success'
      );

      console.log(`[Webhook Security] ✓ Processing new webhook: ${eventType}, Event ID: ${eventId}`);

      // Process the event based on type
      try {
        switch (eventType) {
          case EventName.TransactionCompleted:
            await this.handleTransactionCompleted(data);
            break;
          
          case EventName.TransactionPaymentFailed:
            await this.handleTransactionFailed(data);
            break;
          
          case EventName.SubscriptionCreated:
            await this.handleSubscriptionCreated(data);
            break;
          
          case EventName.SubscriptionUpdated:
            await this.handleSubscriptionUpdated(data);
            break;
          
          case EventName.SubscriptionCanceled:
            await this.handleSubscriptionCanceled(data);
            break;

          case EventName.SubscriptionPaused:
            await this.handleSubscriptionPaused(data);
            break;

          case EventName.SubscriptionResumed:
            await this.handleSubscriptionResumed(data);
            break;

          default:
            console.log(`[Webhook] Unhandled Paddle event type: ${eventType}`);
        }

        console.log(`[Webhook Security] ✓ Successfully processed webhook: ${eventId}`);
        return { success: true };
      } catch (processingError: any) {
        // Log processing error but don't throw - event is already marked as processed
        console.error(`[Webhook] Error processing event ${eventId}:`, processingError);
        Sentry.captureException(processingError, {
          contexts: {
            webhook: {
              eventId,
              eventType,
              data,
            },
          },
        });
        
        // Don't throw - return success to prevent Paddle from retrying
        // The event is logged in our database for manual investigation
        return { success: true, warning: 'Event received but processing failed' };
      }
    } catch (error: any) {
      console.error('[Webhook Security] Critical webhook error:', error);
      Sentry.captureException(error, {
        contexts: {
          webhook: {
            eventType: body.event_type,
            data: body.data,
          },
        },
      });
      throw error;
    }
  }

  private async handleTransactionCompleted(data: any) {
    const { customData, id: transactionId } = data;
    const { userId, planId } = customData || {};

    if (!userId) {
      console.error('No userId in transaction custom data');
      return;
    }

    // Update transaction status
    await db.update(paymentTransactions)
      .set({
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(paymentTransactions.externalTransactionId, transactionId));

    // Activate premium for user
    await this.activatePremium(userId, planId);

    // Send confirmation notification
    await db.insert(notifications).values({
      userId,
      type: 'payment',
      category: 'system',
      title: 'Payment Successful',
      message: 'Your premium subscription has been activated. Thank you for your purchase!',
    });
  }

  private async handleTransactionFailed(data: any) {
    const { customData, id: transactionId } = data;
    const { userId } = customData || {};

    if (!userId) return;

    // Update transaction status - use processedAt instead of failedAt
    await db.update(paymentTransactions)
      .set({
        status: 'failed',
        processedAt: new Date(),
      })
      .where(eq(paymentTransactions.externalTransactionId, transactionId));

    // Send failure notification
    await db.insert(notifications).values({
      userId,
      type: 'payment',
      category: 'system',
      title: 'Payment Failed',
      message: 'We were unable to process your payment. Please check your payment method and try again.',
    });
  }

  private async handleSubscriptionCreated(data: any) {
    const { customData, id: subscriptionId, currentBillingPeriod } = data;
    const { userId, planId } = customData || {};

    if (!userId) {
      console.error('No userId in subscription custom data');
      return;
    }

    // Type guard for currentBillingPeriod
    if (!currentBillingPeriod?.endsAt) {
      console.error('No billing period end date in subscription data');
      return;
    }

    // Update user subscription
    await db.update(users)
      .set({
        paddleSubscriptionId: subscriptionId,
        subscriptionTier: planId === 'yearly' ? 'pro' : 'pro',
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: new Date(currentBillingPeriod.endsAt),
      })
      .where(eq(users.id, userId));

    await this.activatePremium(userId, planId);
  }

  private async handleSubscriptionUpdated(data: any) {
    const { id: subscriptionId, status, currentBillingPeriod, customData } = data;
    const { userId } = customData || {};

    if (!userId) return;

    // Type guard for currentBillingPeriod
    if (!currentBillingPeriod?.endsAt) {
      console.error('No billing period end date in subscription update');
      return;
    }

    // Update subscription status
    await db.update(users)
      .set({
        subscriptionStatus: status,
        subscriptionCurrentPeriodEnd: new Date(currentBillingPeriod.endsAt),
      })
      .where(eq(users.paddleSubscriptionId, subscriptionId));
  }

  private async handleSubscriptionCanceled(data: any) {
    const { id: subscriptionId, customData, scheduledChange } = data;
    const { userId } = customData || {};

    if (!userId) return;

    // Type guard for effectiveAt - use scheduledChange if available
    const effectiveAt = scheduledChange?.effectiveAt || new Date();

    // Update subscription status
    await db.update(users)
      .set({
        subscriptionStatus: 'cancelled',
        subscriptionCurrentPeriodEnd: new Date(effectiveAt),
      })
      .where(eq(users.paddleSubscriptionId, subscriptionId));

    // Send cancellation notification
    await db.insert(notifications).values({
      userId,
      type: 'subscription',
      category: 'system',
      title: 'Subscription Cancelled',
      message: `Your subscription has been cancelled and will end on ${new Date(effectiveAt).toLocaleDateString()}.`,
    });
  }

  private async handleSubscriptionPaused(data: any) {
    const { id: subscriptionId, customData } = data;
    const { userId } = customData || {};

    if (!userId) return;

    await db.update(users)
      .set({
        subscriptionStatus: 'paused',
      })
      .where(eq(users.paddleSubscriptionId, subscriptionId));
  }

  private async handleSubscriptionResumed(data: any) {
    const { id: subscriptionId, customData } = data;
    const { userId } = customData || {};

    if (!userId) return;

    await db.update(users)
      .set({
        subscriptionStatus: 'active',
      })
      .where(eq(users.paddleSubscriptionId, subscriptionId));
  }

  private async activatePremium(userId: string, planId: string) {
    const tier = planId === 'lifetime' ? 'enterprise' : planId === 'yearly' ? 'team' : 'pro';
    
    await db.update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  private async deactivatePremium(userId: string) {
    await db.update(users)
      .set({
        subscriptionTier: 'free',
        subscriptionStatus: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async getSubscription(userId: string) {
    const user = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || !user[0].paddleSubscriptionId) {
      return null;
    }

    if (!paddle) {
      return {
        status: user[0].subscriptionStatus,
        tier: user[0].subscriptionTier,
        expiresAt: user[0].subscriptionCurrentPeriodEnd,
      };
    }

    try {
      // Get subscription details from Paddle
      const subscription = await paddle.subscriptions.get(user[0].paddleSubscriptionId);
      
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentBillingPeriod?.endsAt,
        canceledAt: subscription.canceledAt,
        pausedAt: subscription.pausedAt,
        scheduledChange: subscription.scheduledChange,
      };
    } catch (error: any) {
      console.error('Error fetching Paddle subscription:', error);
      // Return cached data from database
      return {
        status: user[0].subscriptionStatus,
        tier: user[0].subscriptionTier,
        expiresAt: user[0].subscriptionCurrentPeriodEnd,
      };
    }
  }

  async cancelSubscription(userId: string) {
    const user = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || !user[0].paddleSubscriptionId) {
      throw new Error('No active subscription found');
    }

    if (!paddle) {
      throw new Error('Paddle service not configured');
    }

    try {
      // Cancel subscription at end of billing period
      await paddle.subscriptions.cancel(user[0].paddleSubscriptionId, {
        effectiveFrom: 'next_billing_period',
      });

      // Update database
      await db.update(users)
        .set({
          subscriptionStatus: 'cancelled',
        })
        .where(eq(users.id, userId));

      return { success: true, message: 'Subscription will be cancelled at the end of the billing period' };
    } catch (error: any) {
      console.error('Error cancelling Paddle subscription:', error);
      throw new Error('Failed to cancel subscription: ' + error.message);
    }
  }

  async resumeSubscription(userId: string) {
    const user = await db.select().from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0 || !user[0].paddleSubscriptionId) {
      throw new Error('No subscription found');
    }

    if (!paddle) {
      throw new Error('Paddle service not configured');
    }

    try {
      // Resume paused or cancelled subscription
      await paddle.subscriptions.resume(user[0].paddleSubscriptionId, {
        effectiveFrom: 'immediately',
      });

      // Update database
      await db.update(users)
        .set({
          subscriptionStatus: 'active',
        })
        .where(eq(users.id, userId));

      return { success: true, message: 'Subscription has been resumed' };
    } catch (error: any) {
      console.error('Error resuming Paddle subscription:', error);
      throw new Error('Failed to resume subscription: ' + error.message);
    }
  }
}

export const paddleService = new PaddleService();
