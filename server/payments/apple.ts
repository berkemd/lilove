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

    if (!latestTransaction) {
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
  
  const expiresDate = transaction.expiresDate ? new Date(transaction.expiresDate) : undefined;

  await db
    .update(userSubscriptions)
    .set({
      status: 'active',
      currentPeriodStart: new Date(transaction.purchaseDate),
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
