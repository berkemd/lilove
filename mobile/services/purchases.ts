/**
 * RevenueCat Purchase Service
 * Handles in-app purchases and subscriptions through RevenueCat
 */

import Purchases, { 
  PurchasesPackage,
  PurchasesOffering,
  CustomerInfo,
  LOG_LEVEL 
} from 'react-native-purchases';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// RevenueCat API Keys from app configuration
const REVENUE_CAT_API_KEYS = {
  ios: Constants.expoConfig?.extra?.revenueCatApiKey?.ios || '',
  android: Constants.expoConfig?.extra?.revenueCatApiKey?.android || '',
};

/**
 * Initialize RevenueCat SDK
 * Should be called as early as possible in the app lifecycle
 */
export async function initializePurchases(userId?: string): Promise<void> {
  try {
    const apiKey = Platform.OS === 'ios' 
      ? REVENUE_CAT_API_KEYS.ios 
      : REVENUE_CAT_API_KEYS.android;

    if (!apiKey) {
      console.warn('⚠️  RevenueCat API key not configured');
      return;
    }

    // Configure SDK
    Purchases.setLogLevel(LOG_LEVEL.DEBUG); // Use LOG_LEVEL.INFO in production
    
    // Initialize with API key
    await Purchases.configure({ apiKey });
    
    // Set user ID if provided
    if (userId) {
      await Purchases.logIn(userId);
    }

    console.log('✅ RevenueCat initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RevenueCat:', error);
    throw error;
  }
}

/**
 * Get available subscription offerings
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.availablePackages.length > 0) {
      return offerings.current;
    }
    return null;
  } catch (error) {
    console.error('Failed to get offerings:', error);
    return null;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log('User cancelled purchase');
      return null;
    }
    console.error('Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    throw error;
  }
}

/**
 * Get customer info (subscription status, entitlements, etc.)
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo;
  } catch (error) {
    console.error('Failed to get customer info:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    // Check if user has any active entitlements
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Get user's subscription tier
 * Returns the entitlement identifier if active, null otherwise
 */
export async function getSubscriptionTier(): Promise<string | null> {
  try {
    const customerInfo = await getCustomerInfo();
    const activeEntitlements = Object.keys(customerInfo.entitlements.active);
    
    if (activeEntitlements.length > 0) {
      // Return the first active entitlement
      // You may want to customize this based on your subscription setup
      return activeEntitlements[0];
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get subscription tier:', error);
    return null;
  }
}

/**
 * Log in user (associate purchases with user ID)
 */
export async function loginUser(userId: string): Promise<CustomerInfo> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    return customerInfo;
  } catch (error) {
    console.error('Failed to log in user:', error);
    throw error;
  }
}

/**
 * Log out user
 */
export async function logoutUser(): Promise<CustomerInfo> {
  try {
    const customerInfo = await Purchases.logOut();
    return customerInfo;
  } catch (error) {
    console.error('Failed to log out user:', error);
    throw error;
  }
}

/**
 * Subscription package types mapped to plan IDs
 */
export const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  HEART: 'heart',
  PEAK: 'peak', 
  CHAMPION: 'champion',
} as const;

/**
 * Entitlement identifiers
 * These should match what's configured in RevenueCat dashboard
 */
export const ENTITLEMENTS = {
  PRO: 'pro',
  PREMIUM: 'premium',
  ALL_ACCESS: 'all_access',
} as const;
