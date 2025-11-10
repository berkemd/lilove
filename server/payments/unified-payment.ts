/**
 * Unified Payment Service
 * Supports Stripe, Paddle, and Mock payments for development
 */

import Stripe from 'stripe';

interface PaymentProvider {
  name: string;
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
  createSubscription(params: SubscriptionParams): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  verifyWebhook(payload: any, signature: string): boolean;
}

interface CheckoutParams {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CheckoutSession {
  id: string;
  url: string;
}

interface SubscriptionParams {
  userId: string;
  planId: string;
  paymentMethodId?: string;
}

interface Subscription {
  id: string;
  status: string;
  currentPeriodEnd: Date;
}

// Mock Payment Provider for Development
class MockPaymentProvider implements PaymentProvider {
  name = 'mock';

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    console.log('🧪 Mock: Creating checkout session', params);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const sessionId = `mock_session_${Date.now()}`;
    
    return {
      id: sessionId,
      url: `${params.successUrl}?session_id=${sessionId}&mock=true`
    };
  }

  async createSubscription(params: SubscriptionParams): Promise<Subscription> {
    console.log('🧪 Mock: Creating subscription', params);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      id: `mock_sub_${Date.now()}`,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log('🧪 Mock: Canceling subscription', subscriptionId);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  verifyWebhook(payload: any, signature: string): boolean {
    console.log('🧪 Mock: Verifying webhook');
    return true; // Always valid in mock mode
  }
}

// Stripe Payment Provider
class StripePaymentProvider implements PaymentProvider {
  name = 'stripe';
  private stripe: Stripe;

  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil' as any,
    });
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: params.planId, // Stripe Price ID
          quantity: 1,
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: params.userId,
    });

    return {
      id: session.id,
      url: session.url!,
    };
  }

  async createSubscription(params: SubscriptionParams): Promise<Subscription> {
    const subscription = await this.stripe.subscriptions.create({
      customer: params.userId, // Should be Stripe customer ID
      items: [{ price: params.planId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
    });

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  verifyWebhook(payload: any, signature: string): boolean {
    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      return true;
    } catch (error) {
      console.error('Stripe webhook verification failed:', error);
      return false;
    }
  }
}

// Paddle Payment Provider (Simplified)
class PaddlePaymentProvider implements PaymentProvider {
  name = 'paddle';

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
    // Paddle uses Paddle.js on the client side
    // Server-side we just return configuration
    
    const checkoutId = `paddle_checkout_${Date.now()}`;
    
    return {
      id: checkoutId,
      url: `https://buy.paddle.com/product/${params.planId}?customer_id=${params.userId}`
    };
  }

  async createSubscription(params: SubscriptionParams): Promise<Subscription> {
    // Paddle subscriptions are typically created via webhooks
    // after successful checkout
    
    return {
      id: `paddle_sub_${Date.now()}`,
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    // Paddle subscription cancellation via API
    console.log('Canceling Paddle subscription:', subscriptionId);
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // Paddle webhook verification
    // Implement HMAC-SHA256 verification
    return true;
  }
}

// Unified Payment Service
export class UnifiedPaymentService {
  private provider: PaymentProvider;

  constructor() {
    const paymentMode = process.env.PAYMENT_PROVIDER || 'mock';
    
    if (paymentMode === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      console.log('💳 Using Stripe payment provider');
      this.provider = new StripePaymentProvider(process.env.STRIPE_SECRET_KEY);
    } else if (paymentMode === 'paddle' && process.env.PADDLE_API_KEY) {
      console.log('💳 Using Paddle payment provider');
      this.provider = new PaddlePaymentProvider();
    } else {
      console.log('💳 Using Mock payment provider (development)');
      this.provider = new MockPaymentProvider();
    }
  }

  getProvider(): string {
    return this.provider.name;
  }

  async createCheckout(params: CheckoutParams): Promise<CheckoutSession> {
    return this.provider.createCheckoutSession(params);
  }

  async createSubscription(params: SubscriptionParams): Promise<Subscription> {
    return this.provider.createSubscription(params);
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    return this.provider.cancelSubscription(subscriptionId);
  }

  verifyWebhook(payload: any, signature: string): boolean {
    return this.provider.verifyWebhook(payload, signature);
  }

  // Helper method to get subscription plans
  getPlans() {
    return [
      {
        id: 'heart',
        name: 'Heart Plan',
        price: 9.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'AI Coaching',
          'Goal Tracking',
          'Basic Analytics',
          'Mobile App Access'
        ]
      },
      {
        id: 'peak',
        name: 'Peak Plan',
        price: 29.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Everything in Heart',
          'Advanced Analytics',
          'Team Collaboration',
          'Priority Support',
          'Custom Integrations'
        ]
      },
      {
        id: 'heart_yearly',
        name: 'Heart Plan (Yearly)',
        price: 99.99,
        currency: 'USD',
        interval: 'year',
        features: [
          'AI Coaching',
          'Goal Tracking',
          'Basic Analytics',
          'Mobile App Access',
          '2 months free!'
        ]
      },
      {
        id: 'peak_yearly',
        name: 'Peak Plan (Yearly)',
        price: 299.99,
        currency: 'USD',
        interval: 'year',
        features: [
          'Everything in Heart',
          'Advanced Analytics',
          'Team Collaboration',
          'Priority Support',
          'Custom Integrations',
          '2 months free!'
        ]
      }
    ];
  }
}

export const paymentService = new UnifiedPaymentService();