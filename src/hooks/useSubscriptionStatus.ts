import { useMemo } from 'react';
import { usePurchases } from './usePurchases';
import { useAuth } from './useAuth';

const PRO_ENTITLEMENT_ID = 'skillswap_pro';

/**
 * useSubscriptionStatus.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns user's subscription status based on RevenueCat entitlements.
 * 
 * Usage:
 *   const { isPro, isLoading, customerInfo } = useSubscriptionStatus();
 *   if (isPro) { showProFeatures(); }
 */
export function useSubscriptionStatus() {
  const { user } = useAuth();
  const { customerInfo, isLoading } = usePurchases(user?.uid ?? null);

  const isPro = useMemo(() => {
    if (!customerInfo) return false;
    const activeEntitlements = customerInfo.entitlements.active;
    return activeEntitlements[PRO_ENTITLEMENT_ID] !== undefined;
  }, [customerInfo]);

  // Extract expiration date if available
  const proExpiration = useMemo(() => {
    if (!customerInfo) return null;
    const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
    return entitlement?.expirationDate || null;
  }, [customerInfo]);

  // Check if subscription will renew
  const willRenew = useMemo(() => {
    if (!customerInfo) return false;
    const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT_ID];
    return entitlement?.willRenew || false;
  }, [customerInfo]);

  return {
    isPro,
    isLoading,
    customerInfo,
    proExpiration,
    willRenew,
  };
}
