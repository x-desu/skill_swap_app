import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, TrendingUp, TrendingDown, Plus, Crown, Settings } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { getProfileBaseColor } from '../../src/utils/colorUtils';
import { useProfile } from '../../src/hooks/useProfile';
import { listenToCreditLedger } from '../../src/services/firestoreService';
import { usePurchases } from '../../src/hooks/usePurchases';
import type { CreditLedgerEntry } from '../../src/types/credits';

export default function WalletScreen() {
  const { profile, isLoading } = useProfile();
  const [ledger, setLedger] = useState<CreditLedgerEntry[]>([]);
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  
  // RevenueCat subscription status
  const { isPro, proEntitlement, isLoading: isLoadingPurchases } = usePurchases(profile?.uid ?? null);

  useEffect(() => {
    if (!profile?.uid) return;
    return listenToCreditLedger(profile.uid, setLedger);
  }, [profile?.uid]);

  if (isLoading || !profile) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#FF5A5F" />
      </View>
    );
  }

  const baseColor = getProfileBaseColor({
    id: profile.uid,
    avatar: profile.photoURL || undefined,
    profileColor: '#FF5A5F',
  });
  const seedKey = `tab:wallet:${profile.uid}`;
  const balance = profile.credits ?? 0;

  return (
    <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
      <ScrollView style={[styles.container, { paddingTop: insets.top, paddingBottom: 90, backgroundColor: 'transparent' }]}>
        <Text style={[styles.title, { color: colors.text }]}>Wallet</Text>

        <View style={[styles.card, { backgroundColor: isDark ? '#1E1E1E' : '#333' }]}>
          <Text style={styles.cardLabel}>Available Balance</Text>
          <View style={styles.balanceRow}>
            <Clock color="#fff" size={32} />
            <Text style={styles.balance}>{balance.toFixed(1)}</Text>
            <Text style={styles.unit}>Credits</Text>
          </View>
          <Text style={styles.subText}>1 Credit ≈ 1 Hour of Service</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/paywall')}>
          <Plus color="#fff" size={20} />
          <Text style={styles.addButtonText}>Buy More Credits</Text>
        </TouchableOpacity>

        {/* Subscription Status Card */}
        <View style={[styles.subscriptionCard, isPro && styles.subscriptionCardPro]}>
          <View style={styles.subscriptionHeader}>
            <Crown color={isPro ? '#00C2A0' : '#999'} size={24} />
            <Text style={[styles.subscriptionTitle, isPro && styles.subscriptionTitlePro]}>
              {isPro ? 'Pro Member' : 'Free Member'}
            </Text>
            {isPro && (
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <Text style={styles.subscriptionDescription}>
            {isPro
              ? 'You have unlimited access to all premium features and priority matching.'
              : 'Upgrade to Pro for unlimited credits and exclusive features.'}
          </Text>
          <TouchableOpacity
            style={[styles.manageButton, isPro ? styles.manageButtonPro : styles.manageButtonFree]}
            onPress={() => router.push('/customer-center')}
          >
            <Settings color={isPro ? '#00C2A0' : '#fff'} size={16} />
            <Text style={[styles.manageButtonText, isPro && styles.manageButtonTextPro]}>
              {isPro ? 'Manage Subscription' : 'View Plans'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>

        {ledger.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text }]}>No transactions yet</Text>
        ) : (
          ledger.map((tx) => {
            const isEarn = tx.delta >= 0;
            const amountText = `${isEarn ? '+' : ''}${tx.delta.toFixed(1)}`;
            const created = tx.createdAt as { toDate?: () => Date } | undefined;
            const dateLabel = created?.toDate ? created.toDate()?.toLocaleDateString?.() ?? '' : '';
            const iconBg = isEarn
              ? isDark
                ? '#1a3320'
                : '#E8F5E9'
              : isDark
                ? '#332020'
                : '#FFEBEE';

            return (
              <View key={tx.id} style={styles.transaction}>
                <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                  {isEarn ? <TrendingUp color="#4CD964" size={24} /> : <TrendingDown color="#FF5A5F" size={24} />}
                </View>
                <View style={styles.transInfo}>
                  <Text style={[styles.transTitle, { color: colors.text }]}>{tx.reason}</Text>
                  <Text style={styles.transDate}>{dateLabel}</Text>
                </View>
                <Text style={isEarn ? styles.transAmountPositive : [styles.transAmountNegative, { color: colors.text }]}>
                  {amountText}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </ProfileGlowBackground>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, paddingHorizontal: 20 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cardLabel: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  balance: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  unit: {
    color: '#aaa',
    fontSize: 18,
  },
  subText: {
    color: '#666',
    fontSize: 12,
  },
  addButton: {
    backgroundColor: '#FF5A5F',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 30,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 5,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  transInfo: {
    flex: 1,
  },
  transTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  transDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  transAmountPositive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CD964',
  },
  transAmountNegative: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subscriptionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#333',
  },
  subscriptionCardPro: {
    borderColor: '#00C2A0',
    backgroundColor: '#00C2A010',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#999',
    marginLeft: 10,
    flex: 1,
  },
  subscriptionTitlePro: {
    color: '#00C2A0',
  },
  proBadge: {
    backgroundColor: '#00C2A0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  proBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  subscriptionDescription: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  manageButtonPro: {
    backgroundColor: '#00C2A020',
    borderWidth: 1,
    borderColor: '#00C2A0',
  },
  manageButtonFree: {
    backgroundColor: '#FF5A5F',
  },
  manageButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  manageButtonTextPro: {
    color: '#00C2A0',
  },
});
