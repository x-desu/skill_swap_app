import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import Constants from 'expo-constants';

let configured = false;
let revenueCatAvailable = true;

function getRevenueCatKey(): string | null {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;
  const key = Platform.OS === 'ios' ? extra.revenueCatIosApiKey : extra.revenueCatAndroidApiKey;
  return key?.trim() ? key.trim() : null;
}

function isInvalidApiKeyError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const lowered = message.toLowerCase();
  return lowered.includes('invalid api key') || lowered.includes('wrong api key') || lowered.includes('configuration error');
}

export function isRevenueCatEnabled(): boolean {
  return revenueCatAvailable && Boolean(getRevenueCatKey());
}

/**
 * Initialize RevenueCat SDK
 * Should be called once when the app starts
 */
export async function initRevenueCat(): Promise<boolean> {
  if (!revenueCatAvailable) return false;
  if (configured) return true;

  const key = getRevenueCatKey();

  if (!key) {
    revenueCatAvailable = false;
    return false;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    await Purchases.configure({ apiKey: key });
    configured = true;
    return true;
  } catch (e) {
    if (isInvalidApiKeyError(e)) {
      revenueCatAvailable = false;
      return false;
    }
    throw e;
  }
}

/**
 * Login user to RevenueCat
 * Must be called after Firebase Auth sign-in
 */
export async function revenueCatLogIn(uid: string): Promise<void> {
  if (!uid) return;
  if (!(await initRevenueCat())) return;
  try {
    await Purchases.logIn(uid);
  } catch {}
}

async function withRevenueCat<T>(action: () => Promise<T>, fallback: T): Promise<T> {
  if (!(await initRevenueCat())) return fallback;
  try {
    return await action();
  } catch (e) {
    if (isInvalidApiKeyError(e)) {
      revenueCatAvailable = false;
      return fallback;
    }
    return fallback;
  }
}

/**
 * Logout user from RevenueCat
 * Call on sign out
 */
export async function revenueCatLogOut(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {}
}

/**
 * Get current customer info including entitlements
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  return await withRevenueCat(() => Purchases.getCustomerInfo(), null);
}

/**
 * Check if user has Pro entitlement
 */
export async function checkProAccess(): Promise<boolean> {
  return await withRevenueCat(async () => {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['skillswap_pro'] !== undefined;
  }, false);
}

/**
 * Get current offerings (subscription packages)
 */
export async function getOfferings(): Promise<PurchasesOfferings | null> {
  return await withRevenueCat(() => Purchases.getOfferings(), null);
}

/**
 * Purchase a package
 */
export async function purchasePackage(pkg: any): Promise<{ success: boolean; error?: any }> {
  if (!(await initRevenueCat())) {
    return { success: false, error: 'disabled' };
  }
  try {
    await Purchases.purchasePackage(pkg);
    return { success: true };
  } catch (e: any) {
    if (e.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    return { success: false, error: e };
  }
}

/**
 * Restore previous purchases
 */
export async function restorePurchases(): Promise<boolean> {
  return await withRevenueCat(async () => {
    await Purchases.restorePurchases();
    return true;
  }, false);
}

/**
 * Present the code redemption sheet (iOS only)
 */
export async function presentCodeRedemptionSheet(): Promise<void> {
  if (!(await initRevenueCat())) return;
  try {
    await Purchases.presentCodeRedemptionSheet();
  } catch {}
}

/**
 * Show manage subscriptions sheet
 */
export async function showManageSubscriptions(): Promise<void> {
  if (!(await initRevenueCat())) return;
  try {
    await Purchases.showManageSubscriptions();
  } catch (e) {
    throw e;
  }
}

// Re-exports for convenience
export type { PurchasesPackage } from 'react-native-purchases';
export { Purchases };
