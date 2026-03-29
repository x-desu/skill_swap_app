import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ChevronLeft,
  Crown,
  RefreshCw,
  CreditCard,
  HelpCircle,
  MessageSquare,
  ExternalLink,
} from 'lucide-react-native';
import Purchases, { CustomerInfo, PurchasesEntitlementInfo } from 'react-native-purchases';
import { initRevenueCat, revenueCatLogIn } from '../services/revenueCatService';
import { useAuth } from '../hooks/useAuth';

const ENTITLEMENT_ID = 'skillswap_pro';

interface SubscriptionDetail {
  label: string;
  value: string;
}

/**
 * Customer Center Screen for managing subscriptions
 * Shows current subscription status, restore purchases, and support options
 */
export function CustomerCenter() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [proEntitlement, setProEntitlement] = useState<PurchasesEntitlementInfo | null>(null);

  useEffect(() => {
    loadCustomerInfo();
  }, [user?.uid]);

  const loadCustomerInfo = async () => {
    if (!user?.uid) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      await initRevenueCat();
      await revenueCatLogIn(user.uid);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setProEntitlement(info.entitlements.all[ENTITLEMENT_ID] ?? null);
    } catch (err) {
      console.error('[CustomerCenter] Error loading customer info:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsLoading(true);
      await Purchases.restorePurchases();
      await loadCustomerInfo();
      Alert.alert('Success', 'Your purchases have been restored.');
    } catch (err) {
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      // This will open the platform's subscription management page
      await Purchases.showManageSubscriptions();
    } catch (err) {
      // Fallback: try to open App Store or Play Store directly
      const url =
        Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';
      Linking.openURL(url);
    }
  };

  const getSubscriptionDetails = (): SubscriptionDetail[] => {
    if (!proEntitlement?.isActive) return [];

    const details: SubscriptionDetail[] = [];

    if (proEntitlement.productIdentifier) {
      details.push({
        label: 'Plan',
        value: formatProductName(proEntitlement.productIdentifier),
      });
    }

    if (proEntitlement.expirationDate) {
      const date = new Date(proEntitlement.expirationDate);
      details.push({
        label: proEntitlement.willRenew ? 'Renews on' : 'Expires on',
        value: date.toLocaleDateString(),
      });
    }

    if (proEntitlement.latestPurchaseDate) {
      const date = new Date(proEntitlement.latestPurchaseDate);
      details.push({
        label: 'Started on',
        value: date.toLocaleDateString(),
      });
    }

    return details;
  };

  const formatProductName = (identifier: string): string => {
    // Map product identifiers to human-readable names
    const names: Record<string, string> = {
      skillswap_monthly: 'Monthly Subscription',
      skillswap_yearly: 'Yearly Subscription',
      skillswap_lifetime: 'Lifetime Access',
      skillswap_credits_starter: 'Starter Pack',
      skillswap_credits_plus: 'Plus Pack',
      skillswap_credits_pro: 'Pro Pack',
    };
    return names[identifier] || identifier;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#00C2A0" />
      </View>
    );
  }

  const isPro = proEntitlement?.isActive ?? false;
  const subscriptionDetails = getSubscriptionDetails();

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color="#333" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status Card */}
      <View style={[styles.statusCard, isPro ? styles.statusCardPro : styles.statusCardFree]}>
        <View style={styles.statusIcon}>
          <Crown color={isPro ? '#00C2A0' : '#999'} size={32} />
        </View>
        <Text style={[styles.statusTitle, isPro ? styles.statusTitlePro : null]}>
          {isPro ? 'Pro Member' : 'Free Member'}
        </Text>
        <Text style={styles.statusDescription}>
          {isPro
            ? 'You have full access to all premium features and unlimited credits.'
            : 'Upgrade to Pro for unlimited access and premium features.'}
        </Text>
      </View>

      {/* Subscription Details */}
      {isPro && subscriptionDetails.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription Details</Text>
          <View style={styles.detailsCard}>
            {subscriptionDetails.map((detail, index) => (
              <View key={detail.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
                {index < subscriptionDetails.length - 1 && <View style={styles.detailDivider} />}
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>

        {!isPro && (
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/paywall')}>
            <View style={[styles.actionIcon, { backgroundColor: '#00C2A020' }]}>
              <Crown color="#00C2A0" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Upgrade to Pro</Text>
              <Text style={styles.actionSubtitle}>Get unlimited access</Text>
            </View>
            <ChevronLeft color="#999" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.actionButton} onPress={handleRestore}>
          <View style={[styles.actionIcon, { backgroundColor: '#F0F0F0' }]}>
            <RefreshCw color="#666" size={20} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Restore Purchases</Text>
            <Text style={styles.actionSubtitle}>Recover your subscriptions</Text>
          </View>
          <ChevronLeft color="#999" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        {isPro && (
          <TouchableOpacity style={styles.actionButton} onPress={handleManageSubscription}>
            <View style={[styles.actionIcon, { backgroundColor: '#F0F0F0' }]}>
              <CreditCard color="#666" size={20} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manage Subscription</Text>
              <Text style={styles.actionSubtitle}>View or cancel your plan</Text>
            </View>
            <ExternalLink color="#999" size={18} />
          </TouchableOpacity>
        )}
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Linking.openURL('mailto:support@skillswap.app')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F0F0F0' }]}>
            <MessageSquare color="#666" size={20} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Contact Support</Text>
            <Text style={styles.actionSubtitle}>Get help with your subscription</Text>
          </View>
          <ChevronLeft color="#999" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Linking.openURL('https://skillswap.app/help')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#F0F0F0' }]}>
            <HelpCircle color="#666" size={20} />
          </View>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Help Center</Text>
            <Text style={styles.actionSubtitle}>FAQs and guides</Text>
          </View>
          <ExternalLink color="#999" size={18} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Subscription management is handled securely through RevenueCat.
        </Text>
      </View>
    </ScrollView>
  );
}

// Customer Center Screen Component for navigation
export default function CustomerCenterScreen() {
  return <CustomerCenter />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  statusCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  statusCardPro: {
    backgroundColor: '#00C2A010',
    borderWidth: 1,
    borderColor: '#00C2A030',
  },
  statusCardFree: {
    backgroundColor: '#fff',
  },
  statusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#666',
    marginBottom: 8,
  },
  statusTitlePro: {
    color: '#00C2A0',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  detailRow: {
    position: 'relative',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  detailDivider: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  footer: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
