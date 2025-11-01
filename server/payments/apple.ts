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
/**
 * Apple In-App Purchase (IAP) Integration
 * 
 * Implements StoreKit 2 server-side verification using Apple's App Store Server API.
 * Handles receipt verification, transaction validation, and entitlement management.
 * 
 * Requires environment variables:
 * - ASC_ISSUER_ID: App Store Connect API issuer ID
 * - ASC_KEY_ID: App Store Connect API key ID
 * - ASC_PRIVATE_KEY: App Store Connect API private key (base64 or PEM)
 * - IOS_BUNDLE_ID: iOS app bundle identifier (org.lilove.app)
 */

import { 
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  ReceiptUtility
} from '@apple/app-store-server-library';
import { db } from '../db';
import { userSubscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configuration
const ASC_ISSUER_ID = process.env.ASC_ISSUER_ID;
const ASC_KEY_ID = process.env.ASC_KEY_ID;
const ASC_PRIVATE_KEY = process.env.ASC_PRIVATE_KEY;
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'org.lilove.app';
const APPLE_ROOT_CA_PATH = process.env.APPLE_ROOT_CA_PATH; // Optional: path to Apple Root CA cert

// Use sandbox for testing, production for live
const APP_STORE_ENVIRONMENT = process.env.APPLE_IAP_ENV === 'production' 
  ? Environment.PRODUCTION 
  : Environment.SANDBOX;

let appStoreClient: AppStoreServerAPIClient | null = null;
let signedDataVerifier: SignedDataVerifier | null = null;

// Initialize Apple App Store Server API client
if (ASC_ISSUER_ID && ASC_KEY_ID && ASC_PRIVATE_KEY) {
  try {
    // Decode private key if base64 encoded
    let privateKey = ASC_PRIVATE_KEY;
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = Buffer.from(privateKey, 'base64').toString('utf-8');
    }

    appStoreClient = new AppStoreServerAPIClient(
      privateKey,
      ASC_KEY_ID,
      ASC_ISSUER_ID,
      IOS_BUNDLE_ID,
      APP_STORE_ENVIRONMENT
    );

    // Initialize signed data verifier for webhook payloads
    const rootCertPath = APPLE_ROOT_CA_PATH || 'AppleRootCA-G3.cer';
    const rootCerts = [Buffer.from(rootCertPath)];
    signedDataVerifier = new SignedDataVerifier(
      rootCerts,
      true,
      APP_STORE_ENVIRONMENT,
      IOS_BUNDLE_ID
    );

    console.log(`✅ Apple IAP initialized in ${APP_STORE_ENVIRONMENT} mode`);
  } catch (error) {
    console.error('❌ Failed to initialize Apple IAP:', error);
  }
} else {
  console.warn('⚠️  Apple IAP credentials not configured - iOS payment features will be disabled');
}

/**
 * Product ID mapping to subscription tiers
 */
const PRODUCT_TIERS: Record<string, string> = {
  'org.lilove.app.sub.heart.monthly': 'heart',
  'org.lilove.app.sub.heart.annual': 'heart',
  'org.lilove.app.sub.peak.monthly': 'peak',
  'org.lilove.app.sub.peak.annual': 'peak',
  'org.lilove.app.sub.champion.monthly': 'champion',
  'org.lilove.app.sub.champion.annual': 'champion',
};

interface TransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date;
  expiresDate?: Date;
  isExpired: boolean;
  revocationDate?: Date;
}

/**
 * Verify App Store receipt and extract transaction information
 */
export async function verifyReceipt(receiptData: string): Promise<{ valid: boolean; transaction?: TransactionInfo }> {
  if (!appStoreClient) {
    throw new Error('Apple IAP not configured - please set ASC credentials');
  }

  try {
    // For StoreKit 2, we can use the transaction ID directly
    // Get transaction info from App Store Server API
    const transactionResponse = await appStoreClient.getTransactionInfo(receiptData);
    
    if (!transactionResponse || !transactionResponse.signedTransactionInfo) {
      return { valid: false };
    }

    // Decode signed transaction
    const transactionInfo = await signedDataVerifier?.verifyAndDecodeTransaction(
      transactionResponse.signedTransactionInfo
    );

    if (!transactionInfo) {
      return { valid: false };
    }

    // Check if transaction is valid and has required fields
    if (!transactionInfo.transactionId || !transactionInfo.originalTransactionId || !transactionInfo.productId) {
      return { valid: false };
    }

    const expiresDate = transactionInfo.expiresDate ? new Date(transactionInfo.expiresDate) : undefined;
    const isExpired = expiresDate ? expiresDate < new Date() : false;
    const revocationDate = transactionInfo.revocationDate ? new Date(transactionInfo.revocationDate) : undefined;

    return {
      valid: !isExpired && !revocationDate,
      transaction: {
        transactionId: transactionInfo.transactionId,
        originalTransactionId: transactionInfo.originalTransactionId,
        productId: transactionInfo.productId,
        purchaseDate: new Date(transactionInfo.purchaseDate || Date.now()),
        expiresDate,
        isExpired,
        revocationDate,
      },
    };
  } catch (error) {
    console.error('Receipt verification failed:', error);
    return { valid: false };
  }
}

/**
 * Process a transaction and grant entitlements
 */
export async function processTransaction(userId: string, receiptData: string) {
  const { valid, transaction } = await verifyReceipt(receiptData);

  if (!valid || !transaction) {
    return { success: false, error: 'Invalid receipt' };
  }

  // Get subscription tier from product ID
  const tier = PRODUCT_TIERS[transaction.productId];
  if (!tier) {
    return { success: false, error: 'Unknown product ID' };
  }

  try {
    // Determine billing cycle from product ID
    const billingCycle = transaction.productId.includes('annual') ? 'yearly' : 'monthly';
    
    // Create or update subscription in database
    await db.insert(userSubscriptions).values({
      userId,
      appleTransactionId: transaction.transactionId,
      appleOriginalTransactionId: transaction.originalTransactionId,
      appleProductId: transaction.productId,
      planId: tier, // Reference to subscriptionPlans.id
      status: 'active',
      billingCycle,
      startedAt: transaction.purchaseDate,
      currentPeriodStart: transaction.purchaseDate,
      currentPeriodEnd: transaction.expiresDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: false,
    }).onConflictDoUpdate({
      target: userSubscriptions.userId,
      set: {
        appleTransactionId: transaction.transactionId,
        appleOriginalTransactionId: transaction.originalTransactionId,
        appleProductId: transaction.productId,
        planId: tier,
        status: 'active',
        currentPeriodStart: transaction.purchaseDate,
        currentPeriodEnd: transaction.expiresDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: false,
      },
    });

    console.log(`✅ Transaction processed for user ${userId}: ${transaction.transactionId}`);

    return { success: true, transaction };
  } catch (error) {
    console.error('Transaction processing failed:', error);
    return { success: false, error: 'Database error' };
  }
}

/**
 * Get subscription status from App Store Server API
 */
export async function getSubscriptionStatus(originalTransactionId: string) {
  if (!appStoreClient) {
    throw new Error('Apple IAP not configured');
  }

  try {
    const statusResponse = await appStoreClient.getAllSubscriptionStatuses(originalTransactionId);

    if (!statusResponse || !statusResponse.data || statusResponse.data.length === 0) {
      return null;
    }

    // Get the latest subscription status
    const latestStatus = statusResponse.data[0];
    const latestTransaction = latestStatus.lastTransactions?.[0];

    if (!latestTransaction || !latestTransaction.signedTransactionInfo) {
      return null;
    }

    // Decode signed transaction info
    const transactionInfo = await signedDataVerifier?.verifyAndDecodeTransaction(
      latestTransaction.signedTransactionInfo
    );

    if (!transactionInfo) {
      return null;
    }

    return {
      originalTransactionId: latestTransaction.originalTransactionId,
      status: latestTransaction.status,
      transactionInfo,
    };
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return null;
  }
}

/**
 * Sync subscription status with App Store
 * Should be called periodically or when user opens app
 */
export async function syncSubscriptionStatus(userId: string, originalTransactionId: string) {
  const status = await getSubscriptionStatus(originalTransactionId);

  if (!status || !status.transactionInfo) {
    // Subscription not found or expired
    await db
      .update(userSubscriptions)
      .set({ status: 'canceled' })
      .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

    return { synced: true, active: false };
  }

  const expiresDate = status.transactionInfo.expiresDate 
    ? new Date(status.transactionInfo.expiresDate) 
    : undefined;
  const isExpired = expiresDate ? expiresDate < new Date() : false;

  // Update subscription in database
  await db
    .update(userSubscriptions)
    .set({
      status: isExpired ? 'expired' : 'active',
      currentPeriodEnd: expiresDate,
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`✅ Subscription synced for user ${userId}: ${isExpired ? 'expired' : 'active'}`);

  return { synced: true, active: !isExpired };
}

/**
 * Handle App Store Server Notifications (v2)
 * Called by webhook endpoint
 */
export async function handleAppStoreNotification(signedPayload: string) {
  if (!signedDataVerifier) {
    throw new Error('Signed data verifier not initialized');
  }

  try {
    // Verify and decode the signed payload
    const decodedPayload = await signedDataVerifier.verifyAndDecodeNotification(signedPayload);

    if (!decodedPayload) {
      throw new Error('Failed to verify notification signature');
    }

    const notificationType = decodedPayload.notificationType;
    const data = decodedPayload.data;

    console.log(`📥 App Store notification: ${notificationType}`);

    // Handle different notification types
    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
        await handleSubscriptionRenewed(data);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        await handleRenewalStatusChanged(data);
        break;

      case 'EXPIRED':
        await handleSubscriptionExpired(data);
        break;

      case 'GRACE_PERIOD_EXPIRED':
        await handleGracePeriodExpired(data);
        break;

      case 'REFUND':
        await handleRefund(data);
        break;

      default:
        console.log(`ℹ️  Unhandled notification type: ${notificationType}`);
    }

    return { processed: true };
  } catch (error) {
    console.error('Failed to process App Store notification:', error);
    throw error;
  }
}

async function handleSubscriptionRenewed(data: any) {
  const signedTransactionInfo = data?.signedTransactionInfo;
  if (!signedTransactionInfo) return;

  const transaction = await signedDataVerifier?.verifyAndDecodeTransaction(signedTransactionInfo);
  if (!transaction) return;

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return;
  
  const purchaseDate = transaction.purchaseDate ? new Date(transaction.purchaseDate) : new Date();
  const expiresDate = transaction.expiresDate ? new Date(transaction.expiresDate) : undefined;

  await db
    .update(userSubscriptions)
    .set({
      status: 'active',
      currentPeriodStart: purchaseDate,
      currentPeriodEnd: expiresDate,
      appleTransactionId: transaction.transactionId,
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`✅ Subscription renewed: ${originalTransactionId}`);
}

async function handleRenewalStatusChanged(data: any) {
  const signedRenewalInfo = data?.signedRenewalInfo;
  if (!signedRenewalInfo) return;

  const renewalInfo = await signedDataVerifier?.verifyAndDecodeRenewalInfo(signedRenewalInfo);
  if (!renewalInfo) return;

  const autoRenewStatus = renewalInfo.autoRenewStatus;
  const originalTransactionId = renewalInfo.originalTransactionId;
  if (!originalTransactionId) return;

  await db
    .update(userSubscriptions)
    .set({
      cancelAtPeriodEnd: !autoRenewStatus,
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`✅ Renewal status changed: ${originalTransactionId} -> ${autoRenewStatus ? 'enabled' : 'disabled'}`);
}

async function handleSubscriptionExpired(data: any) {
  const signedTransactionInfo = data?.signedTransactionInfo;
  if (!signedTransactionInfo) return;

  const transaction = await signedDataVerifier?.verifyAndDecodeTransaction(signedTransactionInfo);
  if (!transaction) return;

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return;

  await db
    .update(userSubscriptions)
    .set({
      status: 'expired',
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`✅ Subscription expired: ${originalTransactionId}`);
}

async function handleGracePeriodExpired(data: any) {
  const signedTransactionInfo = data?.signedTransactionInfo;
  if (!signedTransactionInfo) return;

  const transaction = await signedDataVerifier?.verifyAndDecodeTransaction(signedTransactionInfo);
  if (!transaction) return;

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return;

  await db
    .update(userSubscriptions)
    .set({
      status: 'expired',
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`⚠️  Grace period expired: ${originalTransactionId}`);
}

async function handleRefund(data: any) {
  const signedTransactionInfo = data?.signedTransactionInfo;
  if (!signedTransactionInfo) return;

  const transaction = await signedDataVerifier?.verifyAndDecodeTransaction(signedTransactionInfo);
  if (!transaction) return;

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return;

  await db
    .update(userSubscriptions)
    .set({
      status: 'canceled',
      cancelledAt: new Date(),
    })
    .where(eq(userSubscriptions.appleOriginalTransactionId, originalTransactionId));

  console.log(`⚠️  Refund processed: ${originalTransactionId}`);
}

export const appleIAPService = {
  verifyReceipt,
  processTransaction,
  getSubscriptionStatus,
  syncSubscriptionStatus,
  handleAppStoreNotification,
};
