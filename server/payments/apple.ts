import {
  AppStoreServerAPIClient,
  Environment,
  SignedDataVerifier,
  ReceiptUtility,
} from '@apple/app-store-server-library';
import { db } from '../storage';
import {
  users,
  userSubscriptions,
  subscriptionPlans,
  paymentTransactions,
  coinTransactions,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { trackServerEvent } from '../analytics';

// ===== CONFIGURATION =====

const APPSTORE_ISSUER_ID = process.env.APPSTORE_ISSUER_ID;
const APPSTORE_KEY_ID = process.env.APPSTORE_KEY_ID;
const APPSTORE_PRIVATE_KEY_PEM = process.env.APPSTORE_PRIVATE_KEY_PEM;
const APPSTORE_BUNDLE_ID = process.env.APPSTORE_BUNDLE_ID || 'org.lilove.app';

// Check configuration (log only in development)
if (!APPSTORE_ISSUER_ID || !APPSTORE_KEY_ID || !APPSTORE_PRIVATE_KEY_PEM) {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️  Apple App Store credentials not configured. IAP features will be disabled.');
  }
}

// Environment detection (sandbox vs production)
const isProduction = process.env.NODE_ENV === 'production';
const environment = isProduction ? Environment.PRODUCTION : Environment.SANDBOX;

// ===== TYPE DEFINITIONS =====

export interface AppleReceipt {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date;
  expiresDate?: Date;
  isTrialPeriod: boolean;
  isInIntroOfferPeriod: boolean;
  environment: 'Sandbox' | 'Production';
}

export interface AppleSubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expiryDate?: Date;
  autoRenewing?: boolean;
  tier?: string;
  billingCycle?: string;
  isTrialPeriod?: boolean;
  willAutoRenew?: boolean;
  gracePeriodExpiresDate?: Date;
}

export interface AppleWebhookPayload {
  notificationType: string;
  subtype?: string;
  data: {
    appAppleId?: number;
    bundleId?: string;
    bundleVersion?: string;
    environment?: string;
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
  };
}

// ===== PRODUCT ID UTILITIES =====

/**
 * Extract tier from product ID
 * org.lilove.app.sub.pro.monthly → 'pro'
 * org.lilove.app.sub.team.yearly → 'team'
 */
export function extractTierFromProductId(productId: string): string {
  const parts = productId.split('.');
  
  // Check if it's a subscription product
  if (parts.includes('sub')) {
    const subIndex = parts.indexOf('sub');
    if (subIndex >= 0 && subIndex + 1 < parts.length) {
      const tier = parts[subIndex + 1];
      return tier.toLowerCase();
    }
  }
  
  return 'free';
}

/**
 * Extract billing cycle from product ID
 * org.lilove.app.sub.pro.monthly → 'monthly'
 * org.lilove.app.sub.team.yearly → 'yearly'
 */
export function extractBillingCycleFromProductId(productId: string): 'monthly' | 'yearly' {
  if (productId.includes('yearly') || productId.includes('annual')) {
    return 'yearly';
  }
  return 'monthly';
}

/**
 * Check if product is a subscription
 */
export function isSubscriptionProduct(productId: string): boolean {
  return productId.includes('sub');
}

/**
 * COIN PACKS — the four consumables that exist in App Store Connect.
 *
 * WHY THIS MAP IS THE SOURCE OF TRUTH
 * The amount a purchase is worth must NEVER come from the client. A
 * client that can say "credit me 5000 coins" is a client that will.
 * The app sends one thing only: the Apple transaction ID. Apple tells
 * us which product it was; this map says what that product is worth.
 *
 * The IDs are copied from App Store Connect, not invented:
 *   org.lilove.app.coins.100 / .500 / .1000 / .5000
 */
export const COIN_PRODUCTS: Record<string, number> = {
  'org.lilove.app.coins.100': 100,
  'org.lilove.app.coins.500': 500,
  'org.lilove.app.coins.1000': 1000,
  'org.lilove.app.coins.5000': 5000,
};

/**
 * Is this one of the consumable coin packs?
 *
 * Deliberately an exact lookup, not a `startsWith`. A prefix test would
 * happily accept `org.lilove.app.coins.999999` — a product that does not
 * exist today but that a typo, or an attacker, could make us honour.
 */
export function isCoinProduct(productId: string): boolean {
  return Object.prototype.hasOwnProperty.call(COIN_PRODUCTS, productId);
}

// ===== APP STORE SERVER API CLIENT =====

class AppleIAPService {
  private client: AppStoreServerAPIClient | null = null;
  private verifier: SignedDataVerifier | null = null;
  private isConfigured: boolean = false; // Track if env vars are present (not runtime failures)

  constructor() {
    this.initializeClient();
  }

  /**
   * Initialize App Store Server API client
   */
  private initializeClient() {
    if (!APPSTORE_ISSUER_ID || !APPSTORE_KEY_ID || !APPSTORE_PRIVATE_KEY_PEM) {
      this.isConfigured = false; // Explicitly mark as not configured (dev-mode)
      return;
    }

    this.isConfigured = true; // ENV vars are present, configuration is intentional

    try {
      // Clean up and format the private key properly
      let privateKey = APPSTORE_PRIVATE_KEY_PEM.trim();
      
      // Remove existing headers/footers and all whitespace
      let base64Content = privateKey
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\s+/g, '');
      
      // Format as proper multi-line PEM (64 chars per line)
      const lines: string[] = [];
      for (let i = 0; i < base64Content.length; i += 64) {
        lines.push(base64Content.substring(i, i + 64));
      }
      
      // Reconstruct with proper PEM format
      privateKey = `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`;


      // Initialize API client
      this.client = new AppStoreServerAPIClient(
        privateKey,
        APPSTORE_KEY_ID,
        APPSTORE_ISSUER_ID,
        APPSTORE_BUNDLE_ID,
        environment
      );

      // Initialize verifier for signed data
      // Note: SignedDataVerifier expects Apple root certificates, not private key
      // When enableOnlineChecks is true, it can verify without local certificates
      // appAppleId is required for production - get from App Store Connect
      const appAppleId = process.env.APPLE_APP_ID ? parseInt(process.env.APPLE_APP_ID) : undefined;
      
      // In production, appAppleId is required for SignedDataVerifier
      // If not set, we skip verifier but keep the API client working
      if (isProduction && !appAppleId) {
        this.verifier = null;
      } else {
        this.verifier = new SignedDataVerifier(
          [],  // Apple root certificates (optional when online checks enabled)
          true, // Enable online checks
          environment,
          APPSTORE_BUNDLE_ID,
          appAppleId // Required for production, optional for sandbox
        );
      }

    } catch (error: any) {
      // CRITICAL: Configuration present but initialization failed (production issue!)
      this.client = null;
      this.verifier = null;
      // isConfigured stays true - we WANT to fail loudly in production
    }
  }

  /**
   * Verify receipt with App Store Server API
   */
  async verifyReceipt(
    userId: string,
    receiptData: string,
    transactionId?: string
  ): Promise<AppleReceipt> {
    if (!this.client) {
      throw new Error('Apple App Store client not initialized');
    }

    try {

      // Get transaction info from App Store
      let transactionInfo;
      
      if (transactionId) {
        // Use transaction ID to get info
        const response = await this.client.getTransactionInfo(transactionId);
        transactionInfo = response.signedTransactionInfo;
      } else {
        // Parse receipt data for transaction ID
        // Note: Modern StoreKit 2 uses signed transactions instead of receipts
        throw new Error('Transaction ID required for App Store Server API');
      }

      // Verify and decode the signed transaction
      if (!this.verifier) {
        throw new Error('Signed data verifier not initialized');
      }

      if (!transactionInfo) {
        throw new Error('Transaction info is missing');
      }

      const decodedTransaction = await this.verifier.verifyAndDecodeTransaction(transactionInfo);

      // Extract receipt information with proper null checks
      const receipt: AppleReceipt = {
        transactionId: decodedTransaction.transactionId || '',
        originalTransactionId: decodedTransaction.originalTransactionId || '',
        productId: decodedTransaction.productId || '',
        purchaseDate: decodedTransaction.purchaseDate 
          ? new Date(decodedTransaction.purchaseDate)
          : new Date(),
        expiresDate: decodedTransaction.expiresDate 
          ? new Date(decodedTransaction.expiresDate)
          : undefined,
        isTrialPeriod: decodedTransaction.offerType === 0, // 0 = Introductory offer
        isInIntroOfferPeriod: decodedTransaction.offerType === 2, // 2 = Promotional offer
        environment: decodedTransaction.environment === 'Production' ? 'Production' : 'Sandbox',
      };

      // CONSUMABLE OR SUBSCRIPTION — NOT THE SAME THING.
      //
      // Before this branch every verified transaction was pushed through
      // `updateUserSubscription`, including the coin packs. A coin
      // purchase would have written a row into `user_subscriptions` with
      // tier 'free' (because `extractTierFromProductId` finds no 'sub'
      // segment) and credited the user NOTHING. The app sold coins that
      // never arrived.
      if (isCoinProduct(receipt.productId)) {
        await this.creditCoins(userId, receipt);
      } else {
        await this.updateUserSubscription(userId, receipt);
      }

      // Track event in PostHog
      trackServerEvent(userId, 'iap_receipt_verified', {
        productId: receipt.productId,
        transactionId: receipt.transactionId,
        isTrialPeriod: receipt.isTrialPeriod,
        environment: receipt.environment,
      });

      return receipt;
    } catch (error: any) {
      // Track failed verification
      trackServerEvent(userId, 'iap_receipt_verification_failed', {
        error: error.message,
        transactionId,
      });

      throw new Error(`Receipt verification failed: ${error.message}`);
    }
  }

  /**
   * Credit a coin pack purchase.
   *
   * IDEMPOTENT BY CONSTRUCTION. StoreKit re-delivers an unfinished
   * transaction on every app launch, and the client is expected to call
   * verify again until it succeeds. If this method were not idempotent,
   * a user who force-quit the app during a purchase would be credited
   * twice, three times, as often as they relaunched.
   *
   * The guard is Apple's own transaction ID, stored in `sourceId`. It is
   * unique per purchase and Apple, not the client, decides it.
   */
  private async creditCoins(userId: string, receipt: AppleReceipt) {
    const amount = COIN_PRODUCTS[receipt.productId];
    if (!amount) {
      throw new Error(`Unknown coin product: ${receipt.productId}`);
    }

    const [already] = await db
      .select()
      .from(coinTransactions)
      .where(
        and(
          eq(coinTransactions.source, 'apple_iap'),
          eq(coinTransactions.sourceId, receipt.transactionId)
        )
      )
      .limit(1);

    if (already) {
      // Not an error: this is the normal path when StoreKit replays a
      // transaction the server has already honoured.
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new Error('User not found while crediting coins');
    }

    const yeniBakiye = (user.coinBalance || 0) + amount;

    await db
      .update(users)
      .set({ coinBalance: yeniBakiye })
      .where(eq(users.id, userId));

    await db.insert(coinTransactions).values({
      userId,
      type: 'purchase',
      amount,
      balance: yeniBakiye,
      source: 'apple_iap',
      sourceId: receipt.transactionId,
      description: `${amount} coins (App Store, ${receipt.productId})`,
    });

    trackServerEvent(userId, 'coins_purchased', {
      productId: receipt.productId,
      amount,
      transactionId: receipt.transactionId,
      environment: receipt.environment,
    });
  }

  /**
   * Update user subscription based on receipt
   */
  private async updateUserSubscription(userId: string, receipt: AppleReceipt) {
    try {
      const tier = extractTierFromProductId(receipt.productId);
      const billingCycle = extractBillingCycleFromProductId(receipt.productId);

      // Check if subscription already exists
      const [existingSubscription] = await db
        .select()
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.appleOriginalTransactionId, receipt.originalTransactionId)
          )
        )
        .limit(1);

      // Get plan ID for tier
      const [plan] = await db
        .select()
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.name, tier))
        .limit(1);

      const planId = plan?.id || 'default';

      if (existingSubscription) {
        // Update existing subscription
        await db
          .update(userSubscriptions)
          .set({
            status: 'active',
            appleTransactionId: receipt.transactionId,
            billingCycle,
            currentPeriodEnd: receipt.expiresDate || new Date(),
            appleProductId: receipt.productId,
          })
          .where(eq(userSubscriptions.id, existingSubscription.id));
      } else {
        // Create new subscription
        await db.insert(userSubscriptions).values({
          userId,
          planId,
          status: 'active',
          billingCycle,
          appleTransactionId: receipt.transactionId,
          appleOriginalTransactionId: receipt.originalTransactionId,
          appleProductId: receipt.productId,
          startedAt: receipt.purchaseDate,
          currentPeriodStart: receipt.purchaseDate,
          currentPeriodEnd: receipt.expiresDate || new Date(),
        });
      }

      // Update user tier
      await db
        .update(users)
        .set({
          subscriptionTier: tier,
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: receipt.expiresDate || new Date(),
        })
        .where(eq(users.id, userId));

      // Record payment transaction
      await db.insert(paymentTransactions).values({
        userId,
        type: 'subscription',
        provider: 'apple',
        description: `Apple IAP: ${receipt.productId}`,
        amount: '0', // Price is not available in transaction info
        currency: 'USD',
        status: 'succeeded',
        appleTransactionId: receipt.transactionId,
        appleOriginalTransactionId: receipt.originalTransactionId,
        processedAt: new Date(),
      });

    } catch (error) {
      throw error;
    }
  }

  /**
   * Get subscription status from App Store
   */
  async getSubscriptionStatus(userId: string): Promise<AppleSubscriptionStatus> {
    try {
      // Get user's latest Apple subscription from database
      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.userId, userId))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);

      if (!subscription || !subscription.appleOriginalTransactionId) {
        return {
          isActive: false,
        };
      }

      // Check with App Store if we have a client
      if (this.client) {
        try {
          const response = await this.client.getAllSubscriptionStatuses(
            subscription.appleOriginalTransactionId
          );

          if (response.data && response.data.length > 0) {
            const latestStatus = response.data[0].lastTransactions?.[0];
            const renewalInfo = latestStatus ? (latestStatus as any).renewalInfo : null;

            return {
              isActive: subscription.status === 'active',
              productId: subscription.appleProductId || undefined,
              expiryDate: subscription.currentPeriodEnd,
              autoRenewing: renewalInfo?.autoRenewStatus === 1,
              tier: extractTierFromProductId(subscription.appleProductId || ''),
              billingCycle: subscription.billingCycle as string,
              willAutoRenew: renewalInfo?.autoRenewStatus === 1,
            };
          }
        } catch (error) {
        }
      }

      // Fallback to database data
      return {
        isActive: subscription.status === 'active',
        productId: subscription.appleProductId || undefined,
        expiryDate: subscription.currentPeriodEnd,
        tier: extractTierFromProductId(subscription.appleProductId || ''),
        billingCycle: subscription.billingCycle as string,
      };
    } catch (error) {
      return {
        isActive: false,
      };
    }
  }

  /**
   * Verify Apple webhook signature using App Store Server API
   * SECURITY: Validates JWT signature with Apple public keys
   * Returns structured result to distinguish dev-mode from production failures
   */
  async verifyWebhookSignature(payload: any, signedPayload?: string): Promise<{ status: 'ok' | 'dev-mode' | 'error', reason?: string }> {
    try {
      // DEV MODE: ENV vars not configured - intentional dev-mode
      if (!this.isConfigured) {
        return { status: 'dev-mode', reason: 'APPSTORE_* env vars not configured' };
      }

      // PRODUCTION FAILURE: Configuration present but verifier failed to initialize
      if (!this.verifier) {
        return { status: 'error', reason: 'Verifier initialization failed despite configuration being present' };
      }

      // If we have a signedPayload (from header), verify it
      if (signedPayload) {
        try {
          await this.verifier.verifyAndDecodeNotification(signedPayload);
          return { status: 'ok' };
        } catch (error: any) {
          return { status: 'error', reason: `Signature verification failed: ${error.message}` };
        }
      }

      // Verify the signed transaction info from the payload
      if (payload.data?.signedTransactionInfo) {
        try {
          await this.verifier.verifyAndDecodeTransaction(payload.data.signedTransactionInfo);
          return { status: 'ok' };
        } catch (error: any) {
          return { status: 'error', reason: `Transaction verification failed: ${error.message}` };
        }
      }

      return { status: 'error', reason: 'No signature data in payload' };
    } catch (error: any) {
      return { status: 'error', reason: error.message || 'Unknown verification error' };
    }
  }

  /**
   * Process App Store Server Notification V2
   * SECURITY: Verifies JWT signature before processing
   * In dev-mode (not configured), logs payload and returns gracefully
   * In production (configured), requires verifier or throws
   */
  async processWebhook(payload: AppleWebhookPayload, userId?: string): Promise<void> {
    try {
      const { notificationType, subtype, data } = payload;

      // DEV MODE: Not configured (ENV vars missing) - return gracefully
      if (!this.isConfigured) {
        return; // Graceful return in dev-mode
      }

      // PRODUCTION: Configuration present - verifier must be available
      if (!this.verifier) {
        throw new Error('CRITICAL: Apple webhook verifier unavailable despite configuration being present. Check initialization errors above.');
      }

      // PRODUCTION: Verify and decode signed transaction info
      if (!data.signedTransactionInfo) {
        throw new Error('Missing transaction info in webhook payload');
      }

      const transaction = await this.verifier.verifyAndDecodeTransaction(
        data.signedTransactionInfo
      );

      // Find user by original transaction ID
      const originalTxId = transaction.originalTransactionId;
      if (!originalTxId) {
        throw new Error('Missing original transaction ID');
      }

      const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(eq(userSubscriptions.appleOriginalTransactionId, originalTxId))
        .limit(1);

      if (!subscription) {
        return;
      }

      const actualUserId = userId || subscription.userId;

      // Process based on notification type
      switch (notificationType) {
        case 'SUBSCRIBED':
        case 'INITIAL_BUY':
          await this.handleInitialPurchase(actualUserId, transaction);
          break;

        case 'DID_RENEW':
          await this.handleRenewal(actualUserId, transaction);
          break;

        case 'DID_FAIL_TO_RENEW':
          await this.handleFailedRenewal(actualUserId, transaction);
          break;

        case 'EXPIRED':
        case 'DID_CHANGE_RENEWAL_STATUS':
          await this.handleExpiration(actualUserId, transaction);
          break;

        case 'REFUND':
          await this.handleRefund(actualUserId, transaction);
          break;

        default:
      }

      // Track webhook event in PostHog
      trackServerEvent(actualUserId, 'apple_webhook_processed', {
        notificationType,
        subtype,
        productId: transaction.productId,
        transactionId: transaction.transactionId,
      });

    } catch (error: any) {
      // SECURITY FIX: Only log error message, not full error object
      throw error;
    }
  }

  /**
   * Handle initial purchase
   */
  private async handleInitialPurchase(userId: string, transaction: any) {

    const receipt: AppleReceipt = {
      transactionId: transaction.transactionId,
      originalTransactionId: transaction.originalTransactionId,
      productId: transaction.productId,
      purchaseDate: new Date(transaction.purchaseDate),
      expiresDate: transaction.expiresDate ? new Date(transaction.expiresDate) : undefined,
      isTrialPeriod: transaction.offerType === 0,
      isInIntroOfferPeriod: transaction.offerType === 2,
      environment: transaction.environment === 'Production' ? 'Production' : 'Sandbox',
    };

    await this.updateUserSubscription(userId, receipt);

    // Track event
    trackServerEvent(userId, 'apple_initial_purchase', {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
      isTrialPeriod: receipt.isTrialPeriod,
    });
  }

  /**
   * Handle renewal
   */
  private async handleRenewal(userId: string, transaction: any) {

    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        appleTransactionId: transaction.transactionId,
        currentPeriodEnd: transaction.expiresDate ? new Date(transaction.expiresDate) : new Date(),
      })
      .where(eq(userSubscriptions.appleOriginalTransactionId, transaction.originalTransactionId));

    await db
      .update(users)
      .set({
        subscriptionStatus: 'active',
        subscriptionCurrentPeriodEnd: transaction.expiresDate 
          ? new Date(transaction.expiresDate) 
          : new Date(),
      })
      .where(eq(users.id, userId));

    // Track event
    trackServerEvent(userId, 'apple_subscription_renewed', {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
    });
  }

  /**
   * Handle failed renewal
   */
  private async handleFailedRenewal(userId: string, transaction: any) {

    await db
      .update(userSubscriptions)
      .set({
        status: 'past_due',
      })
      .where(eq(userSubscriptions.appleOriginalTransactionId, transaction.originalTransactionId));

    await db
      .update(users)
      .set({
        subscriptionStatus: 'past_due',
      })
      .where(eq(users.id, userId));

    // Track event
    trackServerEvent(userId, 'apple_renewal_failed', {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
    });
  }

  /**
   * Handle expiration
   */
  private async handleExpiration(userId: string, transaction: any) {

    await db
      .update(userSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(userSubscriptions.appleOriginalTransactionId, transaction.originalTransactionId));

    await db
      .update(users)
      .set({
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'free',
      })
      .where(eq(users.id, userId));

    // Track event
    trackServerEvent(userId, 'apple_subscription_expired', {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
    });
  }

  /**
   * Handle refund
   */
  private async handleRefund(userId: string, transaction: any) {

    await db
      .update(userSubscriptions)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(userSubscriptions.appleOriginalTransactionId, transaction.originalTransactionId));

    await db
      .update(users)
      .set({
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'free',
      })
      .where(eq(users.id, userId));

    // Track event
    trackServerEvent(userId, 'apple_subscription_refunded', {
      productId: transaction.productId,
      transactionId: transaction.transactionId,
    });
  }
}

// Export singleton instance
export const appleIAPService = new AppleIAPService();
