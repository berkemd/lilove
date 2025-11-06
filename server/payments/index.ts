import { db } from '../storage';
import { 
  subscriptionPlans, 
  coinPackages, 
  userPurchases,
  coinTransactions,
  paymentTransactions,
  users
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import Stripe from 'stripe';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

// Initialize iyzipay for Turkish market
import Iyzipay from 'iyzipay';

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZIPAY_API_KEY || '',
  secretKey: process.env.IYZIPAY_SECRET_KEY || '',
  uri: process.env.NODE_ENV === 'production' ? 'https://api.iyzipay.com' : 'https://sandbox-api.iyzipay.com'
});

export interface PaymentService {
  // Subscription Management
  getUserSubscription(userId: string): Promise<any>;
  createSubscription(userId: string, planId: string, email: string, billingCycle?: string, currency?: string, provider?: string): Promise<any>;
  cancelSubscription(userId: string): Promise<any>;
  resumeSubscription(userId: string, email: string, currency?: string): Promise<any>;
  changeSubscriptionPlan(userId: string, newPlanId: string, email: string, currency?: string): Promise<any>;
  
  // Coin Management
  purchaseCoins(userId: string, packageId: string, email: string, currency?: string, provider?: string): Promise<any>;
  spendCoins(userId: string, amount: number, purpose: string, sourceId?: string): Promise<number>;
  awardCoins(userId: string, amount: number, reason: string): Promise<number>;
  getUserCoins(userId: string): Promise<number>;
  
  // Item Purchases
  purchaseItem(userId: string, itemId: string, paymentMethod: string): Promise<any>;
  
  // Payment Confirmation
  confirmPayment(paymentIntentId: string): Promise<any>;
}

class PaymentServiceImpl implements PaymentService {
  async getUserSubscription(userId: string): Promise<any> {
    // Get user's active subscription
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    
    // Check if user has an active subscription
    if (!user.subscriptionStatus || user.subscriptionStatus === 'cancelled') {
      return {
        active: false,
        status: 'none',
        plan: null
      };
    }

    // Get the subscription plan details
    const planRecord = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, user.subscriptionPlanId || ''))
      .limit(1);

    return {
      active: user.subscriptionStatus === 'active',
      status: user.subscriptionStatus,
      plan: planRecord.length > 0 ? planRecord[0] : null,
      currentPeriodEnd: user.subscriptionEndsAt,
      cancelAtPeriodEnd: user.subscriptionStatus === 'cancelling'
    };
  }

  async createSubscription(
    userId: string, 
    planId: string, 
    email: string, 
    billingCycle: string = 'monthly',
    currency: string = 'usd',
    provider: string = 'paddle'
  ): Promise<any> {
    // Get the plan details
    const planRecord = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!planRecord.length) {
      throw new Error('Plan not found');
    }

    const plan = planRecord[0];
    const amount = billingCycle === 'yearly' ? Number(plan.yearlyPrice || plan.monthlyPrice) : Number(plan.monthlyPrice);

    // For now, return a redirect URL to payment processor
    // In production, this would integrate with Paddle, Stripe, or iyzipay
    return {
      success: true,
      provider,
      checkoutUrl: '/pricing', // Redirect to pricing page for now
      planId,
      amount,
      currency,
      billingCycle
    };
  }

  async cancelSubscription(userId: string): Promise<any> {
    // Update user's subscription status
    await db.update(users)
      .set({ 
        subscriptionStatus: 'cancelled',
        subscriptionEndsAt: new Date()
      })
      .where(eq(users.id, userId));

    return {
      success: true,
      message: 'Subscription cancelled successfully'
    };
  }

  async resumeSubscription(userId: string, email: string, currency: string = 'usd'): Promise<any> {
    // Get user's last subscription plan
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    const planId = user.subscriptionPlanId;

    if (!planId) {
      throw new Error('No previous subscription found');
    }

    // Reactivate subscription
    return this.createSubscription(userId, planId, email, 'monthly', currency);
  }

  async changeSubscriptionPlan(
    userId: string, 
    newPlanId: string, 
    email: string, 
    currency: string = 'usd'
  ): Promise<any> {
    // Cancel current subscription and create new one
    await this.cancelSubscription(userId);
    return this.createSubscription(userId, newPlanId, email, 'monthly', currency);
  }

  async purchaseCoins(
    userId: string, 
    packageId: string, 
    email: string, 
    currency: string = 'usd',
    provider: string = 'paddle'
  ): Promise<any> {
    // Get the coin package
    const packageRecord = await db.select()
      .from(coinPackages)
      .where(eq(coinPackages.id, packageId))
      .limit(1);

    if (!packageRecord.length) {
      throw new Error('Coin package not found');
    }

    const coinPackage = packageRecord[0];
    const totalCoins = coinPackage.coinAmount + (coinPackage.bonusCoins || 0);

    // Return checkout URL
    return {
      success: true,
      provider,
      checkoutUrl: '/shop', // Redirect to shop page
      packageId,
      amount: Number(coinPackage.price),
      currency,
      coins: totalCoins
    };
  }

  async spendCoins(userId: string, amount: number, purpose: string, sourceId?: string): Promise<number> {
    // Get current coin balance
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    const currentBalance = user.coins || 0;

    if (currentBalance < amount) {
      throw new Error('Insufficient coins');
    }

    // Deduct coins
    const newBalance = currentBalance - amount;
    await db.update(users)
      .set({ coins: newBalance })
      .where(eq(users.id, userId));

    // Log transaction
    await db.insert(coinTransactions).values({
      userId,
      amount: -amount,
      type: 'spent',
      description: purpose,
      sourceId,
      balanceAfter: newBalance
    });

    return newBalance;
  }

  async awardCoins(userId: string, amount: number, reason: string): Promise<number> {
    // Get current coin balance
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      throw new Error('User not found');
    }

    const user = userRecord[0];
    const currentBalance = user.coins || 0;
    const newBalance = currentBalance + amount;

    // Add coins
    await db.update(users)
      .set({ coins: newBalance })
      .where(eq(users.id, userId));

    // Log transaction
    await db.insert(coinTransactions).values({
      userId,
      amount,
      type: 'earned',
      description: reason,
      balanceAfter: newBalance
    });

    return newBalance;
  }

  async getUserCoins(userId: string): Promise<number> {
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      return 0;
    }
    return userRecord[0].coins || 0;
  }

  async purchaseItem(userId: string, itemId: string, paymentMethod: string): Promise<any> {
    // Check if item is a coin purchase
    if (paymentMethod === 'coins') {
      // Deduct coins and grant item
      await this.spendCoins(userId, 100, `Purchase item: ${itemId}`, itemId);
      
      // Record purchase
      await db.insert(userPurchases).values({
        userId,
        itemId,
        purchasedAt: new Date()
      });

      return {
        success: true,
        message: 'Item purchased successfully'
      };
    }

    // For other payment methods, return checkout URL
    return {
      success: true,
      checkoutUrl: '/shop',
      itemId
    };
  }

  async confirmPayment(paymentIntentId: string): Promise<any> {
    // Verify payment with Stripe
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          status: 'succeeded'
        };
      }

      return {
        success: false,
        status: paymentIntent.status
      };
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentServiceImpl();
