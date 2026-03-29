import { useEffect, useState, useCallback } from 'react';
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PurchasesEntitlementInfo,
} from 'react-native-purchases';
import { initRevenueCat, revenueCatLogIn } from '../services/revenueCatService';

const ENTITLEMENT_ID = 'skillswap_pro';

interface UsePurchasesReturn {
  // Customer info
  customerInfo: CustomerInfo | null;
  isLoading: boolean;
  error: Error | null;

  // Offerings
  offerings: PurchasesOfferings | null;
  currentOffering: PurchasesOfferings['current'] | null;
  packages: PurchasesPackage[];

  // Entitlements
  isPro: boolean;
  proEntitlement: PurchasesEntitlementInfo | null;
  activeSubscriptions: string[];

  // Actions
  refresh: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  presentCodeRedemptionSheet: () => Promise<void>;
}

/**
 * Hook for managing RevenueCat purchases and subscriptions.
 * Handles customer info, offerings, and purchase actions.
 */
export function usePurchases(uid: string | null): UsePurchasesReturn {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize RevenueCat and load data
  const loadData = useCallback(async () => {
    if (!uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Initialize RevenueCat
      const initialized = await initRevenueCat();
      if (!initialized) {
        throw new Error('Failed to initialize RevenueCat');
      }

      // Login user
      await revenueCatLogIn(uid);

      // Get customer info
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);

      // Get offerings
      const offeringsData = await Purchases.getOfferings();
      setOfferings(offeringsData);
    } catch (err) {
      console.error('[usePurchases] Error loading data:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [uid]);

  // Load data on mount and when uid changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    try {
      const result = await Purchases.purchasePackage(pkg);
      // Update customer info after purchase
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return true;
    } catch (err: any) {
      if (err.userCancelled) {
        return false;
      }
      console.error('[usePurchases] Purchase error:', err);
      throw err;
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<boolean> => {
    try {
      const result = await Purchases.restorePurchases();
      // Update customer info after restore
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      return true;
    } catch (err) {
      console.error('[usePurchases] Restore error:', err);
      return false;
    }
  }, []);

  // Present code redemption sheet (iOS only)
  const presentCodeRedemptionSheet = useCallback(async (): Promise<void> => {
    try {
      await Purchases.presentCodeRedemptionSheet();
    } catch (err) {
      console.error('[usePurchases] Code redemption error:', err);
    }
  }, []);

  // Derived values
  const isPro = customerInfo?.entitlements.active[ENTITLEMENT_ID] !== undefined;
  const proEntitlement = customerInfo?.entitlements.all[ENTITLEMENT_ID] ?? null;
  const activeSubscriptions = customerInfo?.activeSubscriptions ?? [];
  const currentOffering = offerings?.current ?? null;
  const packages = currentOffering?.availablePackages ?? [];

  return {
    customerInfo,
    isLoading,
    error,
    offerings,
    currentOffering,
    packages,
    isPro,
    proEntitlement,
    activeSubscriptions,
    refresh: loadData,
    purchasePackage,
    restorePurchases,
    presentCodeRedemptionSheet,
  };
}

export { ENTITLEMENT_ID };
export default usePurchases;
