import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import Constants from 'expo-constants';

let configured = false;

// RevenueCat API Keys - These should match your RevenueCat Dashboard
const IOS_API_KEY = 'test_TCYobYBTvsJfvNFHFKJcmIpgzOh';
const ANDROID_API_KEY = 'test_TCYobYBTvsJfvNFHFKJcmIpgzOh';

/**
 * Initialize RevenueCat SDK
 * Should be called once when the app starts
 */
export async function initRevenueCat(): Promise<boolean> {
  if (configured) return true;
  
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const key = Platform.OS === 'ios' 
    ? (extra.revenueCatIosApiKey || IOS_API_KEY)
    : (extra.revenueCatAndroidApiKey || ANDROID_API_KEY);
    
  if (!key) {
      console.warn('[RevenueCat] No API key available for this platform');
    return false;
  }
  
  Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
  await Purchases.configure({ apiKey: key });
  configured = true;
  console.log('[RevenueCat] Initialized successfully');
  return true;
}

/**
 * Login user to RevenueCat
 * Must be called after Firebase Auth sign-in
 */
export async function revenueCatLogIn(uid: string): Promise<void> {
  if (!uid) return;
  try {
    await Purchases.logIn(uid);
    console.log('[RevenueCat] User logged in:', uid);
  } catch (e) {
    console.warn('[RevenueCat] logIn failed:', e);
  }
}

/**
 * Logout user from RevenueCat
 * Call on sign out
 */
export async function revenueCatLogOut(): Promise<void> {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
  } catch (e) {
    console.warn('[RevenueCat] logOut failed:', e);
  }
}

/**
 * Get current customer info including entitlements
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    return await Purchases.getCustomerInfo();
  } catch (e) {
    console.warn('[RevenueCat] getCustomerInfo failed:', e);
    return null;
  }
}

/**
 * Check if user has Pro entitlement
 */
export async function checkProAccess(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['skillswap_pro'] !== undefined;
  } catch (e) {
    console.warn('[RevenueCat] checkProAccess failed:', e);
    return false;
  }
}

/**
 * Get current offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  try {
    return await Purchases.getOfferings();
  } catch (e) {
    console.warn('[RevenueCat] getOfferings failed:', e);
    return null;
  }
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: any): Promise<{ success: boolean; error?: any }> {
  try {
    const result = await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    console.error('[RevenueCat] purchasePackage failed:', e);
    return { success: false, error: e };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  try {
    const result = await Purchases.restorePurchases();
    return true;
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases failed:', e);
    return false;
  }
}

/**
 * Present the code redemption sheet (iOS only)
 */
export async function presentCodeRedemptionSheet(): Promise<void> {
  try {
    await Purchases.presentCodeRedemptionSheet();
  } catch (e) {
    console.warn('[RevenueCat] presentCodeRedemptionSheet failed:', e);
  }
}

/**
 * Show manage subscriptions sheet
 */
export async function showManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch (e) {
    console.warn('[RevenueCat] showManageSubscriptions failed:', e);
    throw e;
  }
}

// Re-exports for convenience
export type { PurchasesPackage } from 'react-native-purchases';
export { Purchases };
