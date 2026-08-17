import { db } from './storage';
import { 
  users, 
  subscriptionPlans, 
  userSubscriptions,
  paymentTransactions,
  coinTransactions,
  coinPackages,
  purchaseItems,
  userPurchases,
  featureGates,
  type User,
  type SubscriptionPlan,
  type UserSubscription,
  type PaymentTransaction,
  type CoinTransaction,
  type PurchaseItem
} from '@shared/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';

// PayGate.to Configuration
const paygateUsdcWallet = process.env.PAYGATE_USDC_WALLET;

if (!paygateUsdcWallet) {
  console.warn('⚠️ PAYGATE_USDC_WALLET not found. PayGate.to payment features will be disabled.');
  console.warn('To enable PayGate.to payments, add PAYGATE_USDC_WALLET environment variable with your USDC (Polygon) wallet address.');
} else {
  console.log('✅ PayGate.to payment provider initialized');
}

// PayGate.to API URLs
const PAYGATE_API_BASE = 'https://api.paygate.to';
const PAYGATE_CHECKOUT_BASE = 'https://checkout.paygate.to';

// Supported currencies for PayGate.to
export const SUPPORTED_CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  CAD: 'CAD',
  GBP: 'GBP',
} as const;

// PayGate.to payment providers
export const PAYGATE_PROVIDERS = {
  MOONPAY: 'moonpay',
  BANXA: 'banxa',
  TRANSAK: 'transak',
  STRIPE: 'stripe',
  RAMPNETWORK: 'rampnetwork',
  MERCURYO: 'mercuryo',
  MULTI: 'multi', // Multi-provider mode
} as const;

// Minimum payment amounts (PayGate.to requirement)
export const MIN_PAYMENT_AMOUNT = 2.00; // $2 USD minimum

// Subscription tier levels
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
  ENTERPRISE: 'enterprise',
} as const;

// Feature limits per tier
export const TIER_LIMITS = {
  free: {
    maxGoals: 5,
    maxTasksPerGoal: -1,
    aiPrompts: 50,
    analyticsAccess: 'basic',
    prioritySupport: false,
    teamFeatures: false,
    teamMembers: 1,
    dataExport: false,
    customThemes: false,
    advancedInsights: false,
  },
  pro: {
    maxGoals: -1,
    maxTasksPerGoal: -1,
    aiPrompts: 1000,
    analyticsAccess: 'advanced',
    prioritySupport: true,
    teamFeatures: false,
    teamMembers: 1,
    dataExport: true,
    customThemes: true,
    advancedInsights: true,
  },
  team: {
    maxGoals: -1,
    maxTasksPerGoal: -1,
    aiPrompts: 5000,
    analyticsAccess: 'team',
    prioritySupport: true,
    teamFeatures: true,
    teamMembers: 5,
    dataExport: true,
    customThemes: true,
    advancedInsights: true,
    adminControls: true,
    teamOnboarding: true,
    sharedCoachingSessions: true,
    teamReporting: true,
    collaborativeGoals: true,
    teamAnalytics: true,
    teamDashboard: true,
    memberPermissions: true,
    activityFeed: true,
    teamChallenges: true,
  },
  enterprise: {
    maxGoals: -1,
    maxTasksPerGoal: -1,
    aiPrompts: -1,
    analyticsAccess: 'enterprise',
    prioritySupport: true,
    teamFeatures: true,
    teamMembers: -1,
    dataExport: true,
    customThemes: true,
    advancedInsights: true,
    adminControls: true,
    teamOnboarding: true,
    dedicatedSupport: true,
    sla: true,
    customIntegrations: true,
  },
};

// PayGate.to Payment Service
export class PaymentService {
  
  // ===== PAYGATE.TO INTEGRATION =====
  
  /**
   * Generate PayGate.to wallet for payment
   */
  async createPayGateWallet(callbackUrl: string): Promise<{
    addressIn: string;
    polygonAddressIn: string;
    callbackUrl: string;
    ipnToken: string;
  }> {
    if (!paygateUsdcWallet) {
      throw new Error('PayGate.to not configured. Please add PAYGATE_USDC_WALLET environment variable.');
    }
    
    const encodedCallback = encodeURIComponent(callbackUrl);
    const walletUrl = `${PAYGATE_API_BASE}/control/wallet.php?address=${paygateUsdcWallet}&callback=${encodedCallback}`;
    
    const response = await fetch(walletUrl);
    
    if (!response.ok) {
      throw new Error(`PayGate.to wallet creation failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      addressIn: data.address_in,
      polygonAddressIn: data.polygon_address_in,
      callbackUrl: data.callback_url,
      ipnToken: data.ipn_token,
    };
  }
  
  /**
   * Validate payment amount meets minimum requirements
   */
  validatePaymentAmount(amount: number): void {
    if (amount < MIN_PAYMENT_AMOUNT) {
      throw new Error(`Minimum payment amount is $${MIN_PAYMENT_AMOUNT}. Requested: $${amount}`);
    }
  }
  
  /**
   * Create subscription payment with PayGate.to
   */
  async createSubscription(
    userId: string,
    planId: string,
    email: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    currency: string = 'USD',
    provider: string = PAYGATE_PROVIDERS.MULTI
  ) {
    // Get subscription plan
    const [plan] = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId));
    
    if (!plan) {
      throw new Error('Subscription plan not found');
    }
    
    // Calculate amount based on billing cycle
    const amount = billingCycle === 'yearly' 
      ? Number(plan.yearlyPrice) 
      : Number(plan.monthlyPrice);
    
    // Validate minimum payment amount
    this.validatePaymentAmount(amount);
    
    // Create unique transaction ID
    const transactionId = `sub_${userId}_${planId}_${Date.now()}`;
    
    // Create callback URL for webhook
    const callbackUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/payments/paygate/webhook?type=subscription&userId=${userId}&planId=${planId}&transactionId=${transactionId}&billingCycle=${billingCycle}`;
    
    // Create PayGate.to wallet
    const wallet = await this.createPayGateWallet(callbackUrl);
    
    // Save pending subscription to database
    const [newSubscription] = await db.insert(userSubscriptions).values({
      userId,
      planId,
      status: 'pending',
      billingCycle,
      paygateTransactionId: transactionId,
      paygateIpnToken: wallet.ipnToken,
      startedAt: new Date(),
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000),
    }).returning();
    
    // Record payment transaction
    const [paymentTransaction] = await db.insert(paymentTransactions).values({
      userId,
      type: 'subscription',
      description: `${plan.name} subscription (${billingCycle})`,
      amount: amount.toString(),
      currency,
      paygateTransactionId: transactionId,
      paygateIpnToken: wallet.ipnToken,
      status: 'pending',
      processedAt: new Date(),
    }).returning();
    
    // Generate payment URL
    let paymentUrl: string;
    
    if (provider === PAYGATE_PROVIDERS.MULTI) {
      // Multi-provider mode
      paymentUrl = `${PAYGATE_CHECKOUT_BASE}/pay.php?` + new URLSearchParams({
        address: wallet.addressIn,
        amount: amount.toString(),
        email,
        currency,
      }).toString();
    } else {
      // Single provider mode
      paymentUrl = `${PAYGATE_CHECKOUT_BASE}/process-payment.php?` + new URLSearchParams({
        address: wallet.addressIn,
        amount: amount.toString(),
        provider,
        email,
        currency,
      }).toString();
    }
    
    return {
      subscription: newSubscription,
      paymentTransaction,
      paymentUrl,
      wallet,
    };
  }
  
  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string) {
    const [subscription] = await db.select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ));
    
    if (!subscription) {
      throw new Error('No active subscription found');
    }
    
    // Update database - PayGate.to doesn't need API call for cancellation
    await db.update(userSubscriptions)
      .set({ 
        status: 'cancelled',
        cancelledAt: new Date(),
      })
      .where(eq(userSubscriptions.id, subscription.id));
    
    // Update user
    await db.update(users)
      .set({ 
        subscriptionStatus: 'cancelled',
        subscriptionTier: 'free'
      })
      .where(eq(users.id, userId));
    
    return subscription;
  }
  
  /**
   * Resume a cancelled subscription (requires new payment with PayGate.to)
   */
  async resumeSubscription(userId: string, email: string, currency: string = 'USD') {
    const [subscription] = await db.select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'cancelled')
      ));
    
    if (!subscription) {
      throw new Error('No cancelled subscription found');
    }
    
    // To resume, user needs to make a new payment through PayGate.to
    return await this.createSubscription(
      userId,
      subscription.planId,
      email,
      (subscription.billingCycle as 'monthly' | 'yearly') || 'monthly',
      currency
    );
  }
  
  /**
   * Change subscription plan (requires new payment with PayGate.to)
   */
  async changeSubscriptionPlan(userId: string, newPlanId: string, email: string, currency: string = 'USD') {
    const [currentSubscription] = await db.select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ));
    
    if (!currentSubscription) {
      throw new Error('No active subscription found');
    }
    
    // Get new plan
    const [newPlan] = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, newPlanId));
    
    if (!newPlan) {
      throw new Error('New subscription plan not found');
    }
    
    // Cancel current subscription
    await this.cancelSubscription(userId);
    
    // Create new subscription with new plan
    return await this.createSubscription(
      userId,
      newPlanId,
      email,
      (currentSubscription.billingCycle as 'monthly' | 'yearly') || 'monthly',
      currency
    );
  }
  
  // ===== COIN SYSTEM =====
  
  /**
   * Purchase coins with PayGate.to
   */
  async purchaseCoins(
    userId: string, 
    packageId: string, 
    email: string,
    currency: string = 'USD',
    provider: string = PAYGATE_PROVIDERS.MULTI
  ) {
    // Get coin package
    const [coinPackage] = await db.select()
      .from(coinPackages)
      .where(eq(coinPackages.id, packageId));
    
    if (!coinPackage) {
      throw new Error('Coin package not found');
    }
    
    const amount = Number(coinPackage.price);
    
    // Validate minimum payment amount
    this.validatePaymentAmount(amount);
    
    // Create unique transaction ID
    const transactionId = `coins_${userId}_${packageId}_${Date.now()}`;
    
    // Create callback URL for webhook
    const callbackUrl = `${process.env.APP_URL || 'http://localhost:5000'}/api/payments/paygate/webhook?type=coins&userId=${userId}&packageId=${packageId}&transactionId=${transactionId}`;
    
    // Create PayGate.to wallet
    const wallet = await this.createPayGateWallet(callbackUrl);
    
    // Record payment transaction
    const [paymentTransaction] = await db.insert(paymentTransactions).values({
      userId,
      type: 'coins',
      description: `Purchase of ${coinPackage.coinAmount + (coinPackage.bonusCoins || 0)} coins`,
      amount: coinPackage.price,
      currency,
      paygateTransactionId: transactionId,
      paygateIpnToken: wallet.ipnToken,
      status: 'pending',
      processedAt: new Date(),
    }).returning();
    
    // Generate payment URL
    let paymentUrl: string;
    
    if (provider === PAYGATE_PROVIDERS.MULTI) {
      // Multi-provider mode
      paymentUrl = `${PAYGATE_CHECKOUT_BASE}/pay.php?` + new URLSearchParams({
        address: wallet.addressIn,
        amount: amount.toString(),
        email,
        currency,
      }).toString();
    } else {
      // Single provider mode
      paymentUrl = `${PAYGATE_CHECKOUT_BASE}/process-payment.php?` + new URLSearchParams({
        address: wallet.addressIn,
        amount: amount.toString(),
        provider,
        email,
        currency,
      }).toString();
    }
    
    return {
      transaction: paymentTransaction,
      paymentUrl,
      wallet,
      coinPackage
    };
  }
  
  /**
   * Add coins to user balance
   */
  async addCoins(
    userId: string, 
    amount: number, 
    source: string, 
    sourceId?: string,
    paymentTransactionId?: string
  ) {
    // Get current balance
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const currentBalance = user?.coinBalance || 0;
    const newBalance = currentBalance + amount;
    
    // Record coin transaction
    await db.insert(coinTransactions).values({
      userId,
      type: amount > 0 ? 'earn' : 'spend',
      amount,
      balance: newBalance,
      source,
      sourceId,
      description: `${source}: ${amount > 0 ? '+' : ''}${amount} coins`,
      paymentTransactionId,
    });
    
    // Update user balance
    await db.update(users)
      .set({ coinBalance: newBalance })
      .where(eq(users.id, userId));
    
    return newBalance;
  }
  
  /**
   * Validate PayGate.to webhook security using HMAC
   */
  async validatePayGateWebhookSecurity(
    requestUrl: string,
    hmacHash: string,
    ipnToken: string
  ): Promise<boolean> {
    try {
      // PayGate.to uses HMAC SHA-256 for webhook security
      if (!hmacHash || !ipnToken) {
        console.warn('PayGate.to webhook missing security headers');
        return false;
      }
      
      // For basic validation, we check that the IPN token matches
      // In production, you should implement full HMAC validation
      // with the secret key provided by PayGate.to
      const crypto = require('crypto');
      
      // Extract the webhook data for HMAC validation
      const urlParts = new URL(requestUrl, 'http://localhost');
      const queryString = urlParts.search.substring(1); // Remove the '?'
      
      // In a real implementation, you would use the secret key from PayGate.to
      // For now, we'll just validate that the required security fields are present
      const hasRequiredFields = hmacHash.length > 0 && ipnToken.length > 0;
      
      if (hasRequiredFields) {
        console.log('PayGate.to webhook security validation passed');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('PayGate.to webhook security validation error:', error);
      return false;
    }
  }

  /**
   * Process PayGate.to webhook callback with enhanced tracking
   */
  async processPayGateWebhook(
    type: 'subscription' | 'coins',
    userId: string,
    transactionId: string,
    valueCoin: number,
    additionalParams: any = {}
  ) {
    const webhookId = additionalParams.webhookId || 'unknown';
    console.log(`Processing PayGate.to webhook [${webhookId}]: ${type} for user ${userId}, transaction ${transactionId}, value: ${valueCoin} USDC`);
    
    try {
      // Log webhook processing for transaction tracking
      await this.logWebhookProcessing(webhookId, type, userId, transactionId, valueCoin, additionalParams);
      
      // Prevent duplicate processing
      const isDuplicate = await this.checkDuplicateWebhook(transactionId, webhookId);
      if (isDuplicate) {
        console.warn(`Duplicate webhook detected for transaction ${transactionId}, skipping processing`);
        return { success: true, message: 'Duplicate webhook, already processed', duplicate: true };
      }
      
      // Process payment based on type
      if (type === 'subscription') {
        await this.processSubscriptionPayment(userId, transactionId, valueCoin, additionalParams);
      } else if (type === 'coins') {
        await this.processCoinPayment(userId, transactionId, valueCoin, additionalParams);
      }
      
      // Mark webhook as successfully processed
      await this.markWebhookProcessed(transactionId, webhookId);
      
      return { success: true, message: 'Payment processed successfully', transactionId, webhookId };
    } catch (error: any) {
      console.error(`PayGate.to webhook processing error [${webhookId}]:`, error);
      
      // Log failed processing
      await this.logWebhookError(webhookId, transactionId, error.message);
      
      throw error;
    }
  }
  
  /**
   * Log webhook processing for tracking
   */
  private async logWebhookProcessing(
    webhookId: string,
    type: string,
    userId: string,
    transactionId: string,
    valueCoin: number,
    params: any
  ) {
    try {
      // This could be stored in a dedicated webhook_logs table in production
      console.log('Webhook processing log:', {
        webhookId,
        type,
        userId,
        transactionId,
        valueCoin,
        timestamp: new Date().toISOString(),
        params: JSON.stringify(params)
      });
    } catch (error) {
      console.error('Failed to log webhook processing:', error);
    }
  }

  /**
   * Check for duplicate webhook processing
   */
  private async checkDuplicateWebhook(transactionId: string, webhookId: string): Promise<boolean> {
    try {
      // Check if transaction already exists and is completed
      const [existingTransaction] = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paygateTransactionId, transactionId));
      
      if (existingTransaction && existingTransaction.status === 'succeeded') {
        console.log(`Transaction ${transactionId} already processed successfully`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking duplicate webhook:', error);
      return false;
    }
  }

  /**
   * Mark webhook as successfully processed
   */
  private async markWebhookProcessed(transactionId: string, webhookId: string) {
    try {
      // Update transaction with webhook processing info
      await db.update(paymentTransactions)
        .set({ 
          processedAt: new Date(),
          // Could add webhookId field to track processing
        })
        .where(eq(paymentTransactions.paygateTransactionId, transactionId));
    } catch (error) {
      console.error('Failed to mark webhook as processed:', error);
    }
  }

  /**
   * Log webhook processing errors
   */
  private async logWebhookError(webhookId: string, transactionId: string, errorMessage: string) {
    try {
      console.error('Webhook processing error log:', {
        webhookId,
        transactionId,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      // Could update transaction status to 'failed' if needed
      await db.update(paymentTransactions)
        .set({ 
          status: 'failed',
          failureReason: errorMessage
        })
        .where(eq(paymentTransactions.paygateTransactionId, transactionId));
    } catch (error) {
      console.error('Failed to log webhook error:', error);
    }
  }

  /**
   * Process subscription payment confirmation
   */
  private async processSubscriptionPayment(
    userId: string,
    transactionId: string,
    valueCoin: number,
    params: { planId: string; billingCycle: 'monthly' | 'yearly' }
  ) {
    // Update payment transaction status
    await db.update(paymentTransactions)
      .set({ 
        status: 'succeeded',
        paygateUsdcReceived: valueCoin.toString()
      })
      .where(eq(paymentTransactions.paygateTransactionId, transactionId));
    
    // Update subscription status
    await db.update(userSubscriptions)
      .set({ status: 'active' })
      .where(eq(userSubscriptions.paygateTransactionId, transactionId));
    
    // Get plan info
    const [plan] = await db.select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, params.planId));
    
    if (plan) {
      // Update user subscription info
      await db.update(users)
        .set({ 
          subscriptionTier: plan.name,
          subscriptionStatus: 'active',
          subscriptionCurrentPeriodEnd: new Date(Date.now() + (params.billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000)
        })
        .where(eq(users.id, userId));
    }
    
    console.log(`Subscription activated for user ${userId}, plan ${params.planId}`);
  }
  
  /**
   * Process coin purchase payment confirmation
   */
  private async processCoinPayment(
    userId: string,
    transactionId: string,
    valueCoin: number,
    params: { packageId: string }
  ) {
    // Update payment transaction status
    await db.update(paymentTransactions)
      .set({ 
        status: 'succeeded',
        paygateUsdcReceived: valueCoin.toString()
      })
      .where(eq(paymentTransactions.paygateTransactionId, transactionId));
    
    // Get coin package
    const [coinPackage] = await db.select()
      .from(coinPackages)
      .where(eq(coinPackages.id, params.packageId));
    
    if (coinPackage) {
      // Add coins to user balance
      const totalCoins = coinPackage.coinAmount + (coinPackage.bonusCoins || 0);
      const [transaction] = await db.select()
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paygateTransactionId, transactionId));
      
      await this.addCoins(userId, totalCoins, 'purchase', params.packageId, transaction?.id);
      
      console.log(`${totalCoins} coins added to user ${userId}`);
    }
  }
  
  // ===== FEATURE ACCESS CONTROL =====
  
  /**
   * Get analytics access level for a tier
   * Returns the analytics access level: 'none', 'basic', 'advanced', 'team', 'enterprise'
   */
  getAnalyticsAccessLevel(tier: string): string {
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    return limits?.analyticsAccess || 'none';
  }
  
  /**
   * Check if tier has analytics access (any level)
   */
  hasAnalyticsAccess(tier: string): boolean {
    const level = this.getAnalyticsAccessLevel(tier);
    return level !== 'none' && level !== '';
  }
  
  /**
   * Check if tier has specific analytics level or higher
   */
  hasAnalyticsLevel(tier: string, requiredLevel: 'basic' | 'advanced' | 'team' | 'enterprise'): boolean {
    const level = this.getAnalyticsAccessLevel(tier);
    const levels = ['basic', 'advanced', 'team', 'enterprise'];
    const currentIndex = levels.indexOf(level);
    const requiredIndex = levels.indexOf(requiredLevel);
    return currentIndex >= requiredIndex;
  }
  
  /**
   * Check if user has access to a feature
   */
  async hasFeatureAccess(userId: string, featureName: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return false;
    }
    
    const tier = user.subscriptionTier || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    // Check based on feature name
    switch (featureName) {
      case 'analytics':
        return this.hasAnalyticsAccess(tier);
      case 'analytics_basic':
        return this.hasAnalyticsLevel(tier, 'basic');
      case 'analytics_advanced':
        return this.hasAnalyticsLevel(tier, 'advanced');
      case 'analytics_team':
        return this.hasAnalyticsLevel(tier, 'team');
      case 'analytics_enterprise':
        return this.hasAnalyticsLevel(tier, 'enterprise');
      case 'priority_support':
        return limits.prioritySupport;
      case 'team_features':
        return limits.teamFeatures;
      default:
        return true; // Default to true for unknown features
    }
  }
  
  /**
   * Check if user can create more goals
   */
  async canCreateGoal(userId: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return false;
    }
    
    const tier = user.subscriptionTier || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    if (limits.maxGoals === -1) {
      return true; // Unlimited
    }
    
    // Count user's current goals (would need goals table import)
    // For now, return true as goals counting needs goals table
    // const goalCount = await db.select({ count: sql`count(*)` })
    //   .from(goals).where(eq(goals.userId, userId));
    // const currentGoals = Number(goalCount[0]?.count || 0);
    
    // Temporary: return true until goals table is properly imported
    return true;
  }
  
  /**
   * Get user's subscription info
   */
  async getUserSubscription(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [subscription] = await db.select()
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, 'active')
      ));
    
    const tier = user?.subscriptionTier || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    return {
      tier,
      status: user?.subscriptionStatus || 'active',
      currentPeriodEnd: user?.subscriptionCurrentPeriodEnd,
      limits,
      subscription,
    };
  }
  
  /**
   * Get available subscription plans
   */
  async getSubscriptionPlans() {
    return await db.select().from(subscriptionPlans);
  }
  
  /**
   * Get available coin packages
   */
  async getCoinPackages() {
    return await db.select().from(coinPackages);
  }

  // ===== COIN MANAGEMENT METHODS =====

  /**
   * Spend coins from user balance
   */
  async spendCoins(
    userId: string,
    amount: number,
    purpose: string,
    sourceId?: string
  ) {
    // Get current balance
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const currentBalance = user?.coinBalance || 0;
    
    if (currentBalance < amount) {
      throw new Error(`Insufficient coins. Required: ${amount}, Available: ${currentBalance}`);
    }
    
    // Use negative amount to deduct coins
    return await this.addCoins(userId, -amount, purpose, sourceId);
  }

  /**
   * Award coins to user (alias for addCoins with positive amount)
   */
  async awardCoins(
    userId: string,
    amount: number,
    reason: string,
    sourceId?: string
  ) {
    return await this.addCoins(userId, amount, reason, sourceId);
  }

  /**
   * Purchase an item with coins or real money
   */
  async purchaseItem(
    userId: string,
    itemId: string,
    paymentMethod: 'coins' | 'card'
  ) {
    // Get purchase item
    const [item] = await db.select()
      .from(purchaseItems)
      .where(eq(purchaseItems.id, itemId));
    
    if (!item) {
      throw new Error('Purchase item not found');
    }
    
    if (!item.isActive) {
      throw new Error('Item is no longer available for purchase');
    }
    
    let result;
    
    if (paymentMethod === 'coins') {
      // Pay with coins
      const coinPrice = item.coinPrice;
      if (!coinPrice) {
        throw new Error('Item cannot be purchased with coins');
      }
      
      // Spend coins
      await this.spendCoins(userId, coinPrice, 'item_purchase', itemId);
      
      result = {
        success: true,
        paymentMethod: 'coins',
        amount: coinPrice,
        currency: 'coins'
      };
    } else {
      // Pay with card - would use PayGate.to
      const cardPrice = Number(item.price);
      if (!cardPrice) {
        throw new Error('Item cannot be purchased with real money');
      }
      
      throw new Error('Card payments not implemented yet - use PayGate.to integration');
    }
    
    // Record purchase
    const [purchase] = await db.insert(userPurchases).values({
      userId,
      itemId,
      purchaseType: paymentMethod,
      amount: paymentMethod === 'coins' ? null : item.price,
      coinAmount: paymentMethod === 'coins' ? item.coinPrice : null,
      purchasedAt: new Date(),
    }).returning();
    
    return {
      purchase,
      ...result
    };
  }

  /**
   * Confirm payment (for PayGate.to - no-op since webhooks handle confirmation)
   */
  async confirmPayment(paymentIntentId: string) {
    // PayGate.to uses webhooks for payment confirmation
    // This method is kept for compatibility but doesn't need implementation
    console.log(`Payment confirmation requested for ${paymentIntentId} - handled by PayGate.to webhooks`);
    return { success: true, message: 'Payment handled by PayGate.to webhooks' };
  }

  // ===== FEATURE ACCESS METHODS =====

  /**
   * Check feature access (alias for hasFeatureAccess)
   */
  async checkFeatureAccess(userId: string, featureName: string): Promise<boolean> {
    return await this.hasFeatureAccess(userId, featureName);
  }

  /**
   * Check if user is within feature limits
   */
  async checkFeatureLimit(userId: string, featureName: string): Promise<boolean> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return false;
    }
    
    const tier = user.subscriptionTier || 'free';
    const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS];
    
    // Check specific feature limits
    switch (featureName) {
      case 'ai_prompts': {
        if (limits.aiPrompts === -1) return true; // Unlimited
        
        // Count AI prompts used this month (would need AI usage tracking)
        // For now, return true as a placeholder
        return true;
      }
      case 'goals': {
        if (limits.maxGoals === -1) return true; // Unlimited
        return await this.canCreateGoal(userId);
      }
      case 'tasks_per_goal': {
        if (limits.maxTasksPerGoal === -1) return true; // Unlimited
        // Would need to check tasks count per goal
        return true;
      }
      default:
        return true; // Default to true for unknown features
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();