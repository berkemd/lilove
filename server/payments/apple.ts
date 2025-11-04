import { db } from '../storage';
import { users, paymentTransactions, userSubscriptions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Apple IAP Configuration
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'org.lilove.app';
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Product IDs for In-App Purchases
const APPLE_PRODUCT_IDS = {
  pro_monthly: 'org.lilove.pro.monthly',
  pro_yearly: 'org.lilove.pro.yearly',
  team_monthly: 'org.lilove.team.monthly',
  team_yearly: 'org.lilove.team.yearly',
  coins_small: 'org.lilove.coins.small',
  coins_medium: 'org.lilove.coins.medium',
  coins_large: 'org.lilove.coins.large',
  coins_mega: 'org.lilove.coins.mega',
};

// Coin amounts for each package
const COIN_AMOUNTS: Record<string, number> = {
  'org.lilove.coins.small': 500,
  'org.lilove.coins.medium': 1200,
  'org.lilove.coins.large': 2500,
  'org.lilove.coins.mega': 6000,
};

class AppleIAPService {
  constructor() {
    if (!APPLE_SHARED_SECRET) {
      console.warn('⚠️  Apple IAP shared secret not configured');
    } else {
      console.log('✅ Apple IAP initialized');
    }
  }

  // Verify and process an Apple IAP receipt
  async verifyReceipt(receiptData: string, userId: string) {
    try {
      // Verify with Apple's server
      const verificationUrl = IS_PRODUCTION
        ? 'https://buy.itunes.apple.com/verifyReceipt'
        : 'https://sandbox.itunes.apple.com/verifyReceipt';

      const response = await fetch(verificationUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'receipt-data': receiptData,
          'password': APPLE_SHARED_SECRET,
          'exclude-old-transactions': true,
        }),
      });

      const result = await response.json();

      if (result.status !== 0) {
        throw new Error(`Apple verification failed: ${result.status}`);
      }

      const receipt = result.receipt;
      const latestReceiptInfo = result.latest_receipt_info?.[0] || receipt.in_app?.[0];

      if (!latestReceiptInfo) {
        throw new Error('No transaction info in receipt');
      }

      const productId = latestReceiptInfo.product_id;
      const transactionId = latestReceiptInfo.transaction_id;
      const originalTransactionId = latestReceiptInfo.original_transaction_id;

      // Check if transaction already processed
      const existing = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.appleTransactionId, transactionId))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Transaction already processed',
        };
      }

      // Process based on product type
      if (productId.includes('coins')) {
        await this.processCoinPurchase(userId, productId, transactionId);
      } else {
        await this.processSubscription(userId, productId, transactionId, originalTransactionId, latestReceiptInfo);
      }

      return {
        success: true,
        productId,
        transactionId,
      };
    } catch (error) {
      console.error('Apple IAP verification error:', error);
      throw new Error(`Failed to verify receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process coin purchase
  private async processCoinPurchase(
    userId: string,
    productId: string,
    transactionId: string
  ) {
    const coinAmount = COIN_AMOUNTS[productId] || 0;

    // Add coins to user balance
    await db.update(users)
      .set({
        coinBalance: sql`${users.coinBalance} + ${coinAmount}`,
      })
      .where(eq(users.id, userId));

    // Create payment transaction record
    await db.insert(paymentTransactions).values({
      userId,
      type: 'coins',
      description: `Apple IAP: ${coinAmount} coins`,
      amount: this.getProductPrice(productId),
      currency: 'usd',
      status: 'completed',
      appleTransactionId: transactionId,
      provider: 'apple',
      processedAt: new Date(),
    });

    console.log(`Processed coin purchase: ${coinAmount} coins for user ${userId}`);
  }

  // Process subscription
  private async processSubscription(
    userId: string,
    productId: string,
    transactionId: string,
    originalTransactionId: string,
    receiptInfo: any
  ) {
    // Determine subscription tier
    let tier = 'pro';
    if (productId.includes('team')) {
      tier = 'team';
    }

    const expiresDate = receiptInfo.expires_date_ms
      ? new Date(parseInt(receiptInfo.expires_date_ms))
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    // Update user subscription
    await db.update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        paymentProvider: 'apple',
        subscriptionCurrentPeriodEnd: expiresDate,
      })
      .where(eq(users.id, userId));

    // Create or update user subscription record
    const existingSub = await db.select()
      .from(userSubscriptions)
      .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId))
      .limit(1);

    if (existingSub.length === 0) {
      // Create new subscription
      await db.insert(userSubscriptions).values({
        userId,
        planId: tier === 'team' ? 'team-plan-id' : 'pro-plan-id', // Should reference actual plan
        appleTransactionId: transactionId,
        appleOriginalTransactionId: originalTransactionId,
        appleProductId: productId,
        status: 'active',
        billingCycle: productId.includes('yearly') ? 'yearly' : 'monthly',
        startedAt: new Date(),
        currentPeriodStart: new Date(),
        currentPeriodEnd: expiresDate,
      });
    } else {
      // Update existing subscription
      await db.update(userSubscriptions)
        .set({
          status: 'active',
          currentPeriodEnd: expiresDate,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, existingSub[0].id));
    }

    // Create payment transaction record
    await db.insert(paymentTransactions).values({
      userId,
      type: 'subscription',
      description: `Apple IAP: ${tier} subscription`,
      amount: this.getProductPrice(productId),
      currency: 'usd',
      status: 'completed',
      appleTransactionId: transactionId,
      appleOriginalTransactionId: originalTransactionId,
      provider: 'apple',
      processedAt: new Date(),
    });

    console.log(`Processed subscription: ${tier} for user ${userId}`);
  }

  // Get subscription status
  async getSubscriptionStatus(userId: string) {
    try {
      const subscription = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .limit(1);

      if (subscription.length === 0) {
        return null;
      }

      return subscription[0];
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      throw new Error(`Failed to get subscription status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle App Store Server Notification (simplified)
  async handleNotification(notificationPayload: any) {
    try {
      const notificationType = notificationPayload.notification_type;
      
      console.log('Received Apple notification:', notificationType);

      switch (notificationType) {
        case 'RENEWAL':
          await this.handleRenewal(notificationPayload);
          break;
        case 'CANCEL':
          await this.handleCancellation(notificationPayload);
          break;
        case 'DID_FAIL_TO_RENEW':
          await this.handleFailedRenewal(notificationPayload);
          break;
        case 'REFUND':
          await this.handleRefund(notificationPayload);
          break;
        default:
          console.log('Unhandled notification type:', notificationType);
      }

      return { received: true };
    } catch (error) {
      console.error('Apple notification handling error:', error);
      throw error;
    }
  }

  private async handleRenewal(payload: any) {
    const originalTransactionId = payload.original_transaction_id;
    
    if (originalTransactionId) {
      await db.update(userSubscriptions)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));
    }
  }

  private async handleCancellation(payload: any) {
    const originalTransactionId = payload.original_transaction_id;
    
    if (originalTransactionId) {
      const sub = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId))
        .limit(1);

      if (sub.length > 0) {
        await db.update(userSubscriptions)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, sub[0].id));

        await db.update(users)
          .set({
            subscriptionStatus: 'cancelled',
          })
          .where(eq(users.id, sub[0].userId));
      }
    }
  }

  private async handleFailedRenewal(payload: any) {
    const originalTransactionId = payload.original_transaction_id;
    
    if (originalTransactionId) {
      const sub = await db.select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId))
        .limit(1);

      if (sub.length > 0) {
        await db.update(users)
          .set({
            subscriptionStatus: 'past_due',
          })
          .where(eq(users.id, sub[0].userId));
      }
    }
  }

  private async handleRefund(payload: any) {
    const transactionId = payload.transaction_id;
    
    if (transactionId) {
      await db.update(paymentTransactions)
        .set({
          status: 'refunded',
        })
        .where(eq(paymentTransactions.appleTransactionId, transactionId));
    }
  }

  // Get product price (hardcoded for now, should match App Store Connect)
  private getProductPrice(productId: string): string {
    const prices: Record<string, string> = {
      'org.lilove.pro.monthly': '9.99',
      'org.lilove.pro.yearly': '99.99',
      'org.lilove.team.monthly': '19.99',
      'org.lilove.team.yearly': '199.99',
      'org.lilove.coins.small': '4.99',
      'org.lilove.coins.medium': '9.99',
      'org.lilove.coins.large': '19.99',
      'org.lilove.coins.mega': '49.99',
    };
    
    return prices[productId] || '0.00';
  }
}

// Export singleton instance
export const appleIAPService = new AppleIAPService();
