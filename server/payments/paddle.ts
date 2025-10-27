import { Paddle } from '@paddle/paddle-node-sdk';
import { db } from '../storage';
import { users, subscriptionPlans, coinPackages, paymentTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Paddle SDK
const paddle = new Paddle(process.env.PADDLE_API_KEY || '', {
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
});

export async function createPaddleCheckout(
  userId: string,
  planId: string,
  email: string,
  billingCycle: 'monthly' | 'yearly' = 'monthly'
) {
  try {
    // Get the plan details
    const planRecord = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    if (!planRecord.length) {
      throw new Error('Plan not found');
    }

    const plan = planRecord[0];
    const priceId = billingCycle === 'yearly' 
      ? plan.paddleYearlyPriceId 
      : plan.paddleMonthlyPriceId;

    if (!priceId) {
      throw new Error('Paddle price ID not configured for this plan');
    }

    // Create a checkout session
    const checkout = await paddle.checkouts.create({
      items: [
        {
          priceId,
          quantity: 1
        }
      ],
      customerEmail: email,
      customData: {
        userId,
        planId,
        billingCycle
      }
    });

    return {
      success: true,
      checkoutUrl: checkout.url,
      checkoutId: checkout.id
    };
  } catch (error) {
    console.error('Paddle checkout error:', error);
    throw error;
  }
}

export async function createPaddleCoinCheckout(
  userId: string,
  packageId: string,
  email: string
) {
  try {
    // Get the coin package details
    const packageRecord = await db.select()
      .from(coinPackages)
      .where(eq(coinPackages.id, packageId))
      .limit(1);

    if (!packageRecord.length) {
      throw new Error('Coin package not found');
    }

    const coinPackage = packageRecord[0];
    const priceId = coinPackage.paddlePriceId;

    if (!priceId) {
      throw new Error('Paddle price ID not configured for this coin package');
    }

    // Create a checkout session
    const checkout = await paddle.checkouts.create({
      items: [
        {
          priceId,
          quantity: 1
        }
      ],
      customerEmail: email,
      customData: {
        userId,
        packageId,
        type: 'coins'
      }
    });

    return {
      success: true,
      checkoutUrl: checkout.url,
      checkoutId: checkout.id
    };
  } catch (error) {
    console.error('Paddle coin checkout error:', error);
    throw error;
  }
}

export async function getPaddleSubscription(subscriptionId: string) {
  try {
    const subscription = await paddle.subscriptions.get(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error fetching Paddle subscription:', error);
    throw error;
  }
}

export async function cancelPaddleSubscription(subscriptionId: string) {
  try {
    const result = await paddle.subscriptions.cancel(subscriptionId, {
      effectiveFrom: 'next_billing_period'
    });
    return result;
  } catch (error) {
    console.error('Error cancelling Paddle subscription:', error);
    throw error;
  }
}

export async function pausePaddleSubscription(subscriptionId: string) {
  try {
    const result = await paddle.subscriptions.pause(subscriptionId, {
      effectiveFrom: 'next_billing_period'
    });
    return result;
  } catch (error) {
    console.error('Error pausing Paddle subscription:', error);
    throw error;
  }
}

export async function resumePaddleSubscription(subscriptionId: string) {
  try {
    const result = await paddle.subscriptions.resume(subscriptionId, {
      effectiveFrom: 'immediately'
    });
    return result;
  } catch (error) {
    console.error('Error resuming Paddle subscription:', error);
    throw error;
  }
}

export async function updatePaddleSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  try {
    const result = await paddle.subscriptions.update(subscriptionId, {
      items: [
        {
          priceId: newPriceId,
          quantity: 1
        }
      ],
      prorationBillingMode: 'prorated_immediately'
    });
    return result;
  } catch (error) {
    console.error('Error updating Paddle subscription:', error);
    throw error;
  }
}
