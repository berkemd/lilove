import Stripe from 'stripe';
import { db } from '../storage';
import { users, paymentTransactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey) {
  console.warn('⚠️  Stripe secret key not configured');
}

const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2025-08-27.basil',
}) : null;

// Stripe Price IDs
const STRIPE_PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || '',
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || '',
  team_monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || '',
  team_yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || '',
  enterprise_monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || '',
  enterprise_yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || '',
};

class PaymentService {
  // Create Stripe checkout session
  async createStripeCheckout(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Get or create Stripe customer
      let customerId = user[0].stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user[0].email || undefined,
          name: user[0].displayName || undefined,
          metadata: {
            userId: userId,
          },
        });
        
        customerId = customer.id;
        
        await db.update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, userId));
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId: userId,
        },
        allow_promotion_codes: true,
        billing_address_collection: 'required',
      });

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error('Stripe checkout error:', error);
      throw new Error(`Failed to create Stripe checkout: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Create Stripe payment intent for one-time payment (coins)
  async createStripePaymentIntent(
    userId: string,
    amount: number,
    currency: string = 'usd',
    description: string = 'Coin purchase'
  ) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Get or create Stripe customer
      let customerId = user[0].stripeCustomerId;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user[0].email || undefined,
          name: user[0].displayName || undefined,
          metadata: {
            userId: userId,
          },
        });
        
        customerId = customer.id;
        
        await db.update(users)
          .set({ stripeCustomerId: customerId })
          .where(eq(users.id, userId));
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        customer: customerId,
        description: description,
        metadata: {
          userId: userId,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new Error(`Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get subscription details
  async getStripeSubscription(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const subscription: any = await stripe.subscriptions.retrieve(subscriptionId);
      
      return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
        currentPeriodStart: new Date((subscription.current_period_start || 0) * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        items: subscription.items?.data || [],
      };
    } catch (error) {
      console.error('Failed to get Stripe subscription:', error);
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Cancel Stripe subscription
  async cancelStripeSubscription(subscriptionId: string, immediate: boolean = false) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      let subscription;
      
      if (immediate) {
        subscription = await stripe.subscriptions.cancel(subscriptionId);
      } else {
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      };
    } catch (error) {
      console.error('Failed to cancel Stripe subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Resume canceled subscription
  async resumeStripeSubscription(subscriptionId: string) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      return {
        success: true,
        subscription: {
          id: subscription.id,
          status: subscription.status,
        },
      };
    } catch (error) {
      console.error('Failed to resume Stripe subscription:', error);
      throw new Error(`Failed to resume subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get customer portal URL
  async getStripePortalUrl(customerId: string, returnUrl: string) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      return {
        success: true,
        url: session.url,
      };
    } catch (error) {
      console.error('Failed to create portal session:', error);
      throw new Error(`Failed to create portal session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle Stripe webhook
  async handleStripeWebhook(signature: string, rawBody: string) {
    if (!stripe) {
      throw new Error('Stripe not configured');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

      console.log('Received Stripe webhook:', event.type);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        default:
          console.log('Unhandled Stripe webhook event:', event.type);
      }

      return { received: true };
    } catch (error) {
      console.error('Stripe webhook error:', error);
      throw error;
    }
  }

  private async handleCheckoutCompleted(session: any) {
    const userId = session.metadata?.userId;
    if (!userId) return;

    if (session.mode === 'subscription' && session.subscription) {
      const subscription: any = await stripe!.subscriptions.retrieve(session.subscription as string);
      
      // Determine tier from price
      let tier = 'pro';
      if (subscription.items?.data?.length > 0) {
        const priceId = subscription.items.data[0].price?.id;
        if (priceId?.includes('team')) tier = 'team';
        else if (priceId?.includes('enterprise')) tier = 'enterprise';
      }

      await db.update(users)
        .set({
          subscriptionTier: tier,
          subscriptionStatus: subscription.status,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          paymentProvider: 'stripe',
          subscriptionCurrentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
        })
        .where(eq(users.id, userId));
    }
  }

  private async handleInvoicePaid(invoice: any) {
    const customerId = invoice.customer as string;
    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      const user = await db.select()
        .from(users)
        .where(eq(users.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (user.length > 0) {
        await db.update(users)
          .set({
            subscriptionStatus: 'active',
          })
          .where(eq(users.id, user[0].id));
      }
    }
  }

  private async handlePaymentFailed(invoice: any) {
    const subscriptionId = invoice.subscription as string;

    if (subscriptionId) {
      const user = await db.select()
        .from(users)
        .where(eq(users.stripeSubscriptionId, subscriptionId))
        .limit(1);

      if (user.length > 0) {
        await db.update(users)
          .set({
            subscriptionStatus: 'past_due',
          })
          .where(eq(users.id, user[0].id));
      }
    }
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const user = await db.select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (user.length > 0) {
      await db.update(users)
        .set({
          subscriptionStatus: subscription.status,
          subscriptionCurrentPeriodEnd: new Date((subscription.current_period_end || 0) * 1000),
        })
        .where(eq(users.id, user[0].id));
    }
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const user = await db.select()
      .from(users)
      .where(eq(users.stripeSubscriptionId, subscription.id))
      .limit(1);

    if (user.length > 0) {
      await db.update(users)
        .set({
          subscriptionStatus: 'cancelled',
          subscriptionTier: 'free',
        })
        .where(eq(users.id, user[0].id));
    }
  }
}

export const paymentService = new PaymentService();
