import { 
  AppStoreServerAPIClient, 
  Environment, 
  SendTestNotificationResponse,
  TransactionInfoResponse,
  TransactionHistoryRequest,
  GetTransactionHistoryVersion
} from '@apple/app-store-server-library';
import { db } from '../storage';
import { users, iapReceipts, coinTransactions, paymentTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

// Apple App Store credentials
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || process.env.APPSTORE_KEY_ID || '';
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID || process.env.APPSTORE_ISSUER_ID || '';
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'org.lilove.app';
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY_PEM || process.env.appstore_private_key || '';
const APPLE_ENVIRONMENT = process.env.NODE_ENV === 'production' ? Environment.Production : Environment.Sandbox;

// Initialize Apple App Store Server API client
let appleClient: AppStoreServerAPIClient | null = null;

try {
  if (APPLE_KEY_ID && APPLE_ISSUER_ID && APPLE_PRIVATE_KEY) {
    appleClient = new AppStoreServerAPIClient(
      APPLE_PRIVATE_KEY,
      APPLE_KEY_ID,
      APPLE_ISSUER_ID,
      APPLE_BUNDLE_ID,
      APPLE_ENVIRONMENT
    );
    console.log('✅ Apple IAP service initialized');
  } else {
    console.warn('⚠️  Apple IAP credentials not configured - In-App Purchases will be unavailable');
  }
} catch (error) {
  console.error('❌ Failed to initialize Apple IAP service:', error);
}

export class AppleIAPService {
  // Verify and process a purchase receipt
  async verifyReceipt(userId: string, receiptData: string, transactionId: string) {
    if (!appleClient) {
      throw new Error('Apple IAP service not configured');
    }

    try {
      // Get transaction info
      const transactionInfo = await appleClient.getTransactionInfo(transactionId);
      
      if (!transactionInfo) {
        throw new Error('Transaction not found');
      }

      // Verify the transaction is valid
      const decodedTransaction = transactionInfo;
      
      // Check if receipt already exists
      const existingReceipt = await db.select()
        .from(iapReceipts)
        .where(eq(iapReceipts.transactionId, transactionId))
        .limit(1);

      if (existingReceipt.length > 0) {
        // Receipt already processed
        return {
          success: false,
          message: 'Receipt already processed'
        };
      }

      // Store receipt in database
      await db.insert(iapReceipts).values({
        userId,
        platform: 'ios',
        productId: decodedTransaction.productId,
        transactionId,
        receiptData,
        purchaseDate: new Date(decodedTransaction.purchaseDate || Date.now()),
        expirationDate: decodedTransaction.expiresDate ? new Date(decodedTransaction.expiresDate) : null,
        status: 'valid'
      });

      // Process the purchase based on product type
      await this.processPurchase(userId, decodedTransaction.productId, transactionId);

      return {
        success: true,
        message: 'Purchase verified and processed'
      };
    } catch (error) {
      console.error('Apple IAP verification error:', error);
      throw error;
    }
  }

  // Process a verified purchase
  private async processPurchase(userId: string, productId: string, transactionId: string) {
    // Determine product type and process accordingly
    if (productId.includes('subscription')) {
      await this.processSubscription(userId, productId, transactionId);
    } else if (productId.includes('coins')) {
      await this.processCoinPurchase(userId, productId, transactionId);
    } else {
      await this.processOneTimePurchase(userId, productId, transactionId);
    }
  }

  // Process subscription purchase
  private async processSubscription(userId: string, productId: string, transactionId: string) {
    // Map product ID to subscription plan
    const planMapping: Record<string, string> = {
      'org.lilove.app.subscription.pro.monthly': 'pro',
      'org.lilove.app.subscription.pro.yearly': 'pro',
      'org.lilove.app.subscription.team.monthly': 'team',
      'org.lilove.app.subscription.team.yearly': 'team'
    };

    const planName = planMapping[productId];
    if (!planName) {
      console.error(`Unknown subscription product ID: ${productId}`);
      return;
    }

    // Get plan from database
    const subscriptionPlans = await import('@shared/schema').then(m => m.subscriptionPlans);
    const planRecord = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.name, planName))
      .limit(1);

    if (!planRecord.length) {
      console.error(`Plan not found: ${planName}`);
      return;
    }

    const plan = planRecord[0];

    // Calculate subscription end date
    const isYearly = productId.includes('yearly');
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + (isYearly ? 12 : 1));

    // Update user subscription
    await db.update(users)
      .set({
        subscriptionStatus: 'active',
        subscriptionPlanId: plan.id,
        subscriptionEndsAt: endDate,
        appleSubscriptionId: transactionId
      })
      .where(eq(users.id, userId));

    // Record payment transaction
    await db.insert(paymentTransactions).values({
      userId,
      type: 'subscription',
      description: `Apple IAP: ${productId}`,
      amount: (isYearly ? plan.yearlyPrice : plan.monthlyPrice) || '0',
      currency: 'usd',
      status: 'completed',
      provider: 'apple',
      providerTransactionId: transactionId
    });

    console.log(`Subscription activated for user ${userId}: ${planName}`);
  }

  // Process coin purchase
  private async processCoinPurchase(userId: string, productId: string, transactionId: string) {
    // Map product ID to coin amount
    const coinMapping: Record<string, number> = {
      'org.lilove.app.coins.100': 100,
      'org.lilove.app.coins.500': 500,
      'org.lilove.app.coins.1000': 1000,
      'org.lilove.app.coins.2500': 2500,
      'org.lilove.app.coins.5000': 5000,
      'org.lilove.app.coins.10000': 10000
    };

    const coinAmount = coinMapping[productId];
    if (!coinAmount) {
      console.error(`Unknown coin product ID: ${productId}`);
      return;
    }

    // Get current user coins
    const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!userRecord.length) {
      console.error(`User not found: ${userId}`);
      return;
    }

    const currentCoins = userRecord[0].coins || 0;
    const newBalance = currentCoins + coinAmount;

    // Update user coins
    await db.update(users)
      .set({ coins: newBalance })
      .where(eq(users.id, userId));

    // Log coin transaction
    await db.insert(coinTransactions).values({
      userId,
      amount: coinAmount,
      type: 'purchased',
      description: `Apple IAP: ${productId}`,
      balanceAfter: newBalance
    });

    console.log(`Awarded ${coinAmount} coins to user ${userId}`);
  }

  // Process one-time purchase
  private async processOneTimePurchase(userId: string, productId: string, transactionId: string) {
    // Record the purchase
    const { userPurchases } = await import('@shared/schema');
    await db.insert(userPurchases).values({
      userId,
      itemId: productId,
      purchasedAt: new Date()
    });

    console.log(`One-time purchase processed for user ${userId}: ${productId}`);
  }

  // Handle Apple Server-to-Server notifications
  async handleNotification(notification: any) {
    const notificationType = notification.notificationType;
    const data = notification.data;

    console.log(`Processing Apple notification: ${notificationType}`);

    switch (notificationType) {
      case 'SUBSCRIBED':
        // New subscription
        await this.handleSubscribed(data);
        break;

      case 'DID_RENEW':
        // Subscription renewed
        await this.handleRenewal(data);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        // Renewal status changed
        await this.handleRenewalStatusChange(data);
        break;

      case 'EXPIRED':
        // Subscription expired
        await this.handleExpired(data);
        break;

      case 'DID_FAIL_TO_RENEW':
        // Renewal failed
        await this.handleRenewalFailure(data);
        break;

      case 'REFUND':
        // Purchase refunded
        await this.handleRefund(data);
        break;

      default:
        console.log(`Unhandled Apple notification type: ${notificationType}`);
    }
  }

  private async handleSubscribed(data: any) {
    // Find user by transaction ID and update subscription
    const transactionId = data.transactionId;
    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    const userId = receipt[0].userId;
    await db.update(users)
      .set({ subscriptionStatus: 'active' })
      .where(eq(users.id, userId));
  }

  private async handleRenewal(data: any) {
    // Update subscription end date
    const transactionId = data.transactionId;
    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    const userId = receipt[0].userId;
    const expirationDate = new Date(data.expiresDate);

    await db.update(users)
      .set({ 
        subscriptionStatus: 'active',
        subscriptionEndsAt: expirationDate
      })
      .where(eq(users.id, userId));
  }

  private async handleRenewalStatusChange(data: any) {
    // Handle auto-renew status change
    const transactionId = data.transactionId;
    const autoRenewStatus = data.autoRenewStatus;

    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    const userId = receipt[0].userId;

    if (autoRenewStatus === false) {
      // User turned off auto-renewal
      await db.update(users)
        .set({ subscriptionStatus: 'cancelling' })
        .where(eq(users.id, userId));
    }
  }

  private async handleExpired(data: any) {
    // Subscription expired
    const transactionId = data.transactionId;
    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    const userId = receipt[0].userId;
    await db.update(users)
      .set({ subscriptionStatus: 'expired' })
      .where(eq(users.id, userId));
  }

  private async handleRenewalFailure(data: any) {
    // Renewal failed (payment issue)
    const transactionId = data.transactionId;
    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    const userId = receipt[0].userId;
    await db.update(users)
      .set({ subscriptionStatus: 'payment_failed' })
      .where(eq(users.id, userId));
  }

  private async handleRefund(data: any) {
    // Handle refund
    const transactionId = data.transactionId;
    const receipt = await db.select()
      .from(iapReceipts)
      .where(eq(iapReceipts.transactionId, transactionId))
      .limit(1);

    if (!receipt.length) {
      console.error(`Receipt not found for transaction: ${transactionId}`);
      return;
    }

    // Update receipt status
    await db.update(iapReceipts)
      .set({ status: 'refunded' })
      .where(eq(iapReceipts.transactionId, transactionId));

    // Cancel subscription if applicable
    const userId = receipt[0].userId;
    await db.update(users)
      .set({ subscriptionStatus: 'cancelled' })
      .where(eq(users.id, userId));
  }
}

export const appleIAPService = new AppleIAPService();
