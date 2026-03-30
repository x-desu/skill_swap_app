import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeftRight,
  Bell,
  ChevronRight,
  Compass,
  Crown,
  MessageSquare,
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import UserAvatar from '../components/UserAvatar';
import { useNotifications } from '../hooks/useNotifications';
import { useMySwaps } from '../hooks/useMySwaps';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';

const COLORS = {
  rosePrimary: '#ff1a5c',
  roseLight: '#ff4d7a',
  bgBase: '#090203',
  bgSurface: 'rgba(255, 255, 255, 0.05)',
  bgSurfaceStrong: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  blue: '#60a5fa',
  green: '#34d399',
  amber: '#fbbf24',
};

type SummaryCard = {
  key: string;
  label: string;
  value: number;
  accent: string;
  onPress: () => void;
};

export default function HomeDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const matches = useSelector((state: RootState) => state.matches.list);
  const { notifications, unreadCount, isLoading: notificationsLoading } = useNotifications();
  const { pendingCount, isLoading: swapsLoading } = useMySwaps();
  const { isPro, isLoading: subscriptionLoading } = useSubscriptionStatus();

  if (!authUser) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.rosePrimary} />
      </View>
    );
  }

  const firstName =
    (profile?.displayName || authUser.displayName || 'there').split(' ')[0] || 'there';
  const unreadMessages = notifications.filter(
    (notification) => notification.type === 'new_message' && !notification.read,
  ).length;
  const latestNotification = notifications[0];
  const membershipLabel = subscriptionLoading ? 'Checking membership...' : isPro ? 'Pro Member' : 'Free Member';
  const cardLoading = notificationsLoading || swapsLoading;

  const summaryCards: SummaryCard[] = [
    {
      key: 'notifications',
      label: 'Alerts',
      value: unreadCount,
      accent: COLORS.blue,
      onPress: () => router.push('/notifications'),
    },
    {
      key: 'messages',
      label: 'Messages',
      value: unreadMessages,
      accent: COLORS.green,
      onPress: () => router.push({ pathname: '/(tabs)/matches', params: { tab: 'messages' } }),
    },
    {
      key: 'requests',
      label: 'Requests',
      value: pendingCount,
      accent: COLORS.amber,
      onPress: () => router.push({ pathname: '/(tabs)/matches', params: { tab: 'requests' } }),
    },
    {
      key: 'matches',
      label: 'Matches',
      value: matches.length,
      accent: COLORS.roseLight,
      onPress: () => router.push({ pathname: '/(tabs)/matches', params: { tab: 'messages' } }),
    },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1b0509', '#0d0202', '#060102']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <UserAvatar
                uid={authUser.uid}
                displayName={profile?.displayName || authUser.displayName}
                photoURL={profile?.photoURL || authUser.photoURL}
                size={46}
              />
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>Main Page</Text>
                <Text style={styles.greeting}>Hi, {firstName}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.bellButton} onPress={() => router.push('/notifications')}>
              <Bell color={COLORS.textPrimary} size={20} />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={['rgba(255,26,92,0.28)', 'rgba(255,26,92,0.12)', 'rgba(255,255,255,0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroTopRow}>
              <View style={styles.membershipPill}>
                <Crown color={COLORS.rosePrimary} size={14} />
                <Text style={styles.membershipText}>{membershipLabel}</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Ready to find your next skill swap?</Text>
            <Text style={styles.heroSubtitle}>
              Discovery is your dedicated swipe space. Home keeps your alerts, requests, and conversations in one place.
            </Text>

            <View style={styles.heroActions}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/(tabs)/discover')}>
                <Compass color="#fff" size={18} />
                <Text style={styles.primaryButtonText}>Open Discovery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => router.push({ pathname: '/(tabs)/matches', params: { tab: 'messages' } })}
              >
                <Text style={styles.secondaryButtonText}>Go to Swaps</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>At a glance</Text>
            <View style={styles.summaryGrid}>
              {summaryCards.map((card) => (
                <TouchableOpacity key={card.key} style={styles.summaryCard} onPress={card.onPress}>
                  <View style={[styles.summaryAccent, { backgroundColor: card.accent }]} />
                  <Text style={styles.summaryLabel}>{card.label}</Text>
                  <Text style={styles.summaryValue}>
                    {cardLoading ? '...' : String(card.value)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue</Text>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(tabs)/matches', params: { tab: unreadMessages > 0 ? 'messages' : 'requests' } })}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(52, 211, 153, 0.14)' }]}>
                <MessageSquare color={COLORS.green} size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>
                  {unreadMessages > 0 ? 'Unread conversations' : 'Open your swaps inbox'}
                </Text>
                <Text style={styles.actionSubtitle}>
                  {unreadMessages > 0
                    ? `${unreadMessages} message${unreadMessages === 1 ? '' : 's'} waiting for you`
                    : `${matches.length} active match${matches.length === 1 ? '' : 'es'} ready to continue`}
                </Text>
              </View>
              <ChevronRight color={COLORS.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push({ pathname: '/(tabs)/matches', params: { tab: 'requests' } })}
            >
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(251, 191, 36, 0.14)' }]}>
                <ArrowLeftRight color={COLORS.amber} size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Review pending requests</Text>
                <Text style={styles.actionSubtitle}>
                  {pendingCount > 0
                    ? `${pendingCount} request${pendingCount === 1 ? '' : 's'} still need your attention`
                    : 'New inbound requests will appear here first'}
                </Text>
              </View>
              <ChevronRight color={COLORS.textMuted} size={18} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/notifications')}>
              <View style={[styles.actionIcon, { backgroundColor: 'rgba(96, 165, 250, 0.14)' }]}>
                <Bell color={COLORS.blue} size={18} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Notification center</Text>
                <Text style={styles.actionSubtitle}>
                  {latestNotification
                    ? latestNotification.title
                    : 'Keep track of matches, requests, and chat activity'}
                </Text>
              </View>
              <ChevronRight color={COLORS.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.discoveryPrompt} onPress={() => router.push('/(tabs)/discover')}>
            <View style={styles.discoveryPromptCopy}>
              <Text style={styles.discoveryPromptTitle}>Need fresh profiles?</Text>
              <Text style={styles.discoveryPromptSubtitle}>
                Jump into Discovery to swipe through real nearby skill matches.
              </Text>
            </View>
            <View style={styles.discoveryPromptIcon}>
              <Compass color={COLORS.textPrimary} size={20} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 20,
    gap: 22,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCopy: {
    marginLeft: 12,
  },
  eyebrow: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  greeting: {
    marginTop: 4,
    color: COLORS.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgSurfaceStrong,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.rosePrimary,
    paddingHorizontal: 5,
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  membershipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  membershipText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  heroTitle: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: COLORS.rosePrimary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    gap: 14,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    width: '48%',
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
    justifyContent: 'space-between',
  },
  summaryAccent: {
    width: 38,
    height: 5,
    borderRadius: 999,
  },
  summaryLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: COLORS.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.bgSurface,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCopy: {
    flex: 1,
    marginRight: 12,
  },
  actionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  actionSubtitle: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  discoveryPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 22,
    padding: 18,
  },
  discoveryPromptCopy: {
    flex: 1,
    marginRight: 12,
  },
  discoveryPromptTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  discoveryPromptSubtitle: {
    marginTop: 6,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  discoveryPromptIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: 'rgba(255,26,92,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
