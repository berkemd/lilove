import { AppStoreServerAPIClient, Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { db } from '../storage';
import { users, paymentTransactions } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Apple IAP Configuration
const APPLE_BUNDLE_ID = process.env.APPLE_BUNDLE_ID || 'org.lilove.app';
const APPLE_KEY_ID = process.env.APPLE_KEY_ID || process.env.APPSTORE_KEY_ID || '';
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID || '';
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY_PEM || process.env.APPSTORE_PRIVATE_KEY || '';
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
  private client: AppStoreServerAPIClient | null = null;
  private verifier: SignedDataVerifier | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (!APPLE_KEY_ID || !APPLE_ISSUER_ID || !APPLE_PRIVATE_KEY) {
      console.warn('⚠️  Apple IAP credentials not fully configured');
      return;
    }

    try {
      const environment = IS_PRODUCTION ? Environment.Production : Environment.Sandbox;
      
      // Initialize App Store Server API client
      this.client = new AppStoreServerAPIClient(
        APPLE_PRIVATE_KEY,
        APPLE_KEY_ID,
        APPLE_ISSUER_ID,
        APPLE_BUNDLE_ID,
        environment
      );

      // Initialize receipt verifier
      this.verifier = new SignedDataVerifier(
        [APPLE_PRIVATE_KEY], // Root certificates
        true, // Enable online checks
        environment,
        APPLE_BUNDLE_ID
      );

      console.log('✅ Apple IAP initialized');
    } catch (error) {
      console.error('Failed to initialize Apple IAP:', error);
    }
  }

  // Verify and process an Apple IAP receipt
  async verifyReceipt(transactionId: string, userId: string) {
    if (!this.client) {
      throw new Error('Apple IAP client not initialized');
    }

    try {
      // Get transaction info
      const transactionInfo = await this.client.getTransactionInfo(transactionId);
      
      if (!transactionInfo) {
        throw new Error('Transaction not found');
      }

      // Verify the transaction is valid
      const productId = transactionInfo.productId;
      const originalTransactionId = transactionInfo.originalTransactionId;

      // Check if transaction already processed
      const existing = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.appleTransactionId, originalTransactionId))
        .limit(1);

      if (existing.length > 0) {
        return {
          success: false,
          message: 'Transaction already processed',
        };
      }

      // Process based on product type
      if (productId.includes('coins')) {
        await this.processCoinPurchase(userId, productId, transactionId, originalTransactionId);
      } else {
        await this.processSubscription(userId, productId, transactionId, originalTransactionId);
      }

      return {
        success: true,
        productId,
        transactionId: originalTransactionId,
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
    transactionId: string,
    originalTransactionId: string
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
      appleOriginalTransactionId: originalTransactionId,
      appleProductId: productId,
      completedAt: new Date(),
    });

    console.log(`Processed coin purchase: ${coinAmount} coins for user ${userId}`);
  }

  // Process subscription
  private async processSubscription(
    userId: string,
    productId: string,
    transactionId: string,
    originalTransactionId: string
  ) {
    // Determine subscription tier
    let tier = 'pro';
    if (productId.includes('team')) {
      tier = 'team';
    }

    // Update user subscription
    await db.update(users)
      .set({
        subscriptionTier: tier,
        subscriptionStatus: 'active',
        paymentProvider: 'apple',
        appleTransactionId: transactionId,
        appleOriginalTransactionId: originalTransactionId,
        appleProductId: productId,
      })
      .where(eq(users.id, userId));

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
      appleProductId: productId,
      completedAt: new Date(),
    });

    console.log(`Processed subscription: ${tier} for user ${userId}`);
  }

  // Get subscription status
  async getSubscriptionStatus(originalTransactionId: string) {
    if (!this.client) {
      throw new Error('Apple IAP client not initialized');
    }

    try {
      const status = await this.client.getAllSubscriptionStatuses(originalTransactionId);
      return status;
    } catch (error) {
      console.error('Failed to get subscription status:', error);
      throw new Error(`Failed to get subscription status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Handle App Store Server Notification
  async handleNotification(signedPayload: string) {
    if (!this.verifier) {
      throw new Error('Apple IAP verifier not initialized');
    }

    try {
      // Verify the notification
      const notification = await this.verifier.verifyAndDecodeNotification(signedPayload);
      
      const notificationType = notification.notificationType;
      const data = notification.data;

      console.log('Received Apple notification:', notificationType);

      // Handle different notification types
      switch (notificationType) {
        case 'SUBSCRIBED':
          await this.handleSubscribed(data);
          break;
        case 'DID_RENEW':
          await this.handleRenewal(data);
          break;
        case 'DID_CHANGE_RENEWAL_STATUS':
          await this.handleRenewalStatusChange(data);
          break;
        case 'EXPIRED':
          await this.handleExpired(data);
          break;
        case 'DID_FAIL_TO_RENEW':
          await this.handleFailedRenewal(data);
          break;
        case 'REFUND':
          await this.handleRefund(data);
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

  private async handleSubscribed(data: any) {
    // Handle new subscription
    console.log('New subscription:', data);
  }

  private async handleRenewal(data: any) {
    // Handle subscription renewal
    console.log('Subscription renewed:', data);
  }

  private async handleRenewalStatusChange(data: any) {
    // Handle renewal status change
    console.log('Renewal status changed:', data);
  }

  private async handleExpired(data: any) {
    const originalTransactionId = data.originalTransactionId;
    
    // Find user by transaction ID
    const user = await db.select()
      .from(users)
      .where(eq(users.appleOriginalTransactionId, originalTransactionId))
      .limit(1);
      
    if (user.length === 0) {
      console.error('User not found for expired subscription');
      return;
    }

    // Update subscription status
    await db.update(users)
      .set({
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'free',
      })
      .where(eq(users.id, user[0].id));

    console.log('Subscription expired:', originalTransactionId);
  }

  private async handleFailedRenewal(data: any) {
    const originalTransactionId = data.originalTransactionId;
    
    // Find user by transaction ID
    const user = await db.select()
      .from(users)
      .where(eq(users.appleOriginalTransactionId, originalTransactionId))
      .limit(1);
      
    if (user.length === 0) {
      console.error('User not found for failed renewal');
      return;
    }

    // Update subscription status
    await db.update(users)
      .set({
        subscriptionStatus: 'past_due',
      })
      .where(eq(users.id, user[0].id));

    console.log('Renewal failed:', originalTransactionId);
  }

  private async handleRefund(data: any) {
    const originalTransactionId = data.originalTransactionId;
    
    // Update transaction status to refunded
    await db.update(paymentTransactions)
      .set({
        status: 'refunded',
        refundedAt: new Date(),
      })
      .where(eq(paymentTransactions.appleOriginalTransactionId, originalTransactionId));

    console.log('Refund processed:', originalTransactionId);
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
