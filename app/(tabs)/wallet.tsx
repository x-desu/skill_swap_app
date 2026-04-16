import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Wallet, Crown, Bell, MessageSquare, ChevronRight, Plus } from 'lucide-react-native';
import type { RootState } from '../../src/store';
import { useSubscriptionStatus } from '../../src/hooks/useSubscriptionStatus';
import UserAvatar from '../../src/components/UserAvatar';
import WalletSkeleton from '../../src/components/skeletons/WalletSkeleton';

export default function WalletScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const authUser = useSelector((state: RootState) => state.auth.user);
    const profile = useSelector((state: RootState) => state.profile.profile);
    const { isPro, isLoading } = useSubscriptionStatus();

    if (!authUser || !profile) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <WalletSkeleton show />
            </View>
        );
    }

    const membershipLabel = isLoading ? 'Checking membership...' : (isPro ? 'Pro Member' : 'Free Member');

    return (
        <ScrollView
            style={[styles.container, { paddingTop: insets.top }]}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.title}>Wallet</Text>
                    <Text style={styles.subtitle}>Credits, payments, and membership</Text>
                </View>
                <UserAvatar
                    uid={authUser.uid}
                    displayName={authUser.displayName}
                    photoURL={authUser.photoURL}
                    size={44}
                />
            </View>

            <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                    <View style={styles.balanceIcon}>
                        <Wallet color={COLORS.rosePrimary} size={24} />
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>Available Credits</Text>
                        <Text style={styles.membershipPill}>{membershipLabel}</Text>
                    </View>
                </View>

                <View style={styles.balanceRow}>
                    <Text style={styles.balance}>{profile.credits.toFixed(1)}</Text>
                    <Text style={styles.unit}>credits</Text>
                </View>

                <Text style={styles.subText}>
                    Buy more credits with Razorpay or manage premium access through RevenueCat.
                </Text>
            </View>

            <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/paywall')}>
                <Plus color="#fff" size={18} />
                <Text style={styles.primaryButtonText}>Buy Credits</Text>
            </TouchableOpacity>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Manage</Text>

                <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/customer-center')}>
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(255, 26, 92, 0.12)' }]}>
                        <Crown color={COLORS.rosePrimary} size={20} />
                    </View>
                    <View style={styles.actionTextWrap}>
                        <Text style={styles.actionTitle}>Customer Center</Text>
                        <Text style={styles.actionSubtitle}>Manage subscription and restore purchases</Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={18} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/notifications')}>
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                        <Bell color="#60a5fa" size={20} />
                    </View>
                    <View style={styles.actionTextWrap}>
                        <Text style={styles.actionTitle}>Notifications</Text>
                        <Text style={styles.actionSubtitle}>Open your in-app alerts and match activity</Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={18} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/(tabs)/matches')}>
                    <View style={[styles.actionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                        <MessageSquare color="#34d399" size={20} />
                    </View>
                    <View style={styles.actionTextWrap}>
                        <Text style={styles.actionTitle}>Chats & Matches</Text>
                        <Text style={styles.actionSubtitle}>Jump back into your active conversations</Text>
                    </View>
                    <ChevronRight color={COLORS.textMuted} size={18} />
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const COLORS = {
    rosePrimary: '#ff1a5c',
    bgBase: '#0d0202',
    cardBg: 'rgba(255, 255, 255, 0.04)',
    borderLight: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.72)',
    textMuted: 'rgba(255, 255, 255, 0.45)',
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgBase,
        paddingHorizontal: 20,
    },
    content: {
        paddingBottom: 120,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
    },
    subtitle: {
        marginTop: 6,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    balanceCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        padding: 25,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    balanceIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 26, 92, 0.12)',
        marginRight: 14,
    },
    cardLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    membershipPill: {
        marginTop: 6,
        color: COLORS.rosePrimary,
        fontSize: 13,
        fontWeight: '700',
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 8,
    },
    balance: {
        color: COLORS.textPrimary,
        fontSize: 48,
        fontWeight: '800',
    },
    unit: {
        color: COLORS.textSecondary,
        fontSize: 18,
        marginLeft: 8,
    },
    subText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: COLORS.rosePrimary,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 18,
        borderRadius: 15,
        marginBottom: 30,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        marginLeft: 8,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 15,
    },
    section: {
        marginBottom: 24,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: 12,
    },
    actionIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    actionTextWrap: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    actionSubtitle: {
        marginTop: 4,
        fontSize: 13,
        color: COLORS.textSecondary,
    },
});
