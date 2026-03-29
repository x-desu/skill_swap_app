import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Settings, Edit2, Plus, Crown, CreditCard, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import type { RootState } from '../../src/store';
import UserAvatar from '../../src/components/UserAvatar';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgDark: '#1a0505',
  bgBase: '#0d0202',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  cardBg: 'rgba(255, 255, 255, 0.03)',
  statBg: 'rgba(255, 26, 92, 0.05)',
};


export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const currentUser = useSelector((state: RootState) => state.profile.profile);

    if (!currentUser) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.rosePrimary} />
            </View>
        );
    }

    const followers = currentUser.mutualMatches ?? 0;
    const following = currentUser.swipeRightCount ?? 0;
    const sessions = currentUser.completedSwaps ?? 0;
    const creditsEarned = currentUser.credits ?? 0;
    const creditsSpent = currentUser.reviewCount ?? 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Profile</Text>
                <TouchableOpacity onPress={() => router.push('/settings')} style={styles.iconButton}>
                    <Settings color={COLORS.textPrimary} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.profileHeader}>
                    <UserAvatar
                        uid={currentUser.uid}
                        photoURL={currentUser.photoURL}
                        displayName={currentUser.displayName}
                        size={120}
                    />
                    <Text style={styles.name}>{currentUser.displayName}</Text>

                    <View style={styles.locationContainer}>
                        <MapPin color={COLORS.rosePrimary} size={14} />
                        <Text style={styles.location}>
                            {currentUser.location?.city ? `${currentUser.location.city}, ${currentUser.location.country}` : 'Global'}
                        </Text>
                    </View>

                    <TouchableOpacity style={styles.editButton} onPress={() => router.push('/(auth)/profile-setup')}>
                        <Edit2 color={COLORS.textPrimary} size={14} />
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{followers}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{following}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statNumber}>{sessions}</Text>
                            <Text style={styles.statLabel}>Sessions</Text>
                        </View>
                    </View>

                    <View style={styles.statsRowSecondary}>
                        <View style={styles.statItemSecondary}>
                            <Text style={styles.statSecondaryLabel}>Credits earned</Text>
                            <Text style={styles.statSecondaryValue}>{creditsEarned.toFixed(1)}</Text>
                        </View>
                        <View style={styles.statItemSecondary}>
                            <Text style={styles.statSecondaryLabel}>Credits spent</Text>
                            <Text style={styles.statSecondaryValue}>{creditsSpent.toFixed(1)}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Subscription</Text>
                    <TouchableOpacity style={styles.subscriptionCard} onPress={() => router.push('/paywall')}>
                        <View style={styles.subscriptionIcon}>
                            <Crown color={COLORS.rosePrimary} size={22} />
                        </View>
                        <View style={styles.subscriptionCopy}>
                            <Text style={styles.subscriptionTitle}>Upgrade Subscription</Text>
                            <Text style={styles.subscriptionSubtitle}>
                                Unlock premium benefits, manage Pro, and buy more credits.
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.subscriptionActionCard} onPress={() => router.push('/customer-center')}>
                        <View style={styles.subscriptionActionLeft}>
                            <View style={styles.subscriptionActionIcon}>
                                <CreditCard color={COLORS.textPrimary} size={18} />
                            </View>
                            <View style={styles.subscriptionActionCopy}>
                                <Text style={styles.subscriptionActionTitle}>Open Customer Center</Text>
                                <Text style={styles.subscriptionActionSubtitle}>
                                    Manage subscription status, restores, and billing help.
                                </Text>
                            </View>
                        </View>
                        <ChevronRight color={COLORS.textMuted} size={18} />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>About Me</Text>
                    <View style={styles.bioCard}>
                        <Text style={styles.bio}>{currentUser.bio || 'No bio provided yet. Add a few words about yourself!'}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills I Offer</Text>
                    <View style={styles.skillsContainer}>
                        {currentUser.teachSkills.map((skill: string, idx: number) => (
                            <View key={`teach-${idx}`} style={styles.skillChipPrimary}>
                                <Text style={styles.skillTextPrimary}>{skill}</Text>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addSkillChip}>
                            <Plus color={COLORS.textSecondary} size={14} />
                            <Text style={styles.addSkillText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Skills I Need</Text>
                    <View style={styles.skillsContainer}>
                        {currentUser.wantSkills.map((skill: string, index: number) => (
                            <View key={`want-${index}`} style={styles.skillChipSecondary}>
                                <Text style={styles.skillTextSecondary}>{skill}</Text>
                            </View>
                        ))}
                        <TouchableOpacity style={styles.addSkillChip}>
                            <Plus color={COLORS.textSecondary} size={14} />
                            <Text style={styles.addSkillText}>Add</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.bgBase 
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 15,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
        letterSpacing: 0.5,
    },
    iconButton: {
        padding: 8,
        backgroundColor: COLORS.cardBg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    content: { 
        paddingBottom: 120, 
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 35,
    },
    name: {
        fontSize: 26,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginTop: 15,
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    location: {
        color: COLORS.textSecondary,
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: COLORS.rosePrimary,
        marginBottom: 25,
        shadowColor: COLORS.rosePrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    editButtonText: {
        marginLeft: 8,
        fontWeight: '700',
        color: COLORS.textPrimary,
        fontSize: 14,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        backgroundColor: COLORS.cardBg,
        paddingVertical: 18,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginBottom: 15,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: COLORS.borderLight,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    statsRowSecondary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10,
    },
    statItemSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        marginHorizontal: 5,
    },
    statSecondaryLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    statSecondaryValue: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.rosePrimary,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    bioCard: {
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    subscriptionCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
    },
    subscriptionActionCard: {
        marginTop: 12,
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    subscriptionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 26, 92, 0.14)',
        marginRight: 14,
    },
    subscriptionCopy: {
        flex: 1,
    },
    subscriptionActionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    subscriptionActionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginRight: 12,
    },
    subscriptionActionCopy: {
        flex: 1,
    },
    subscriptionTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '700',
    },
    subscriptionSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 6,
    },
    subscriptionActionTitle: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '700',
    },
    subscriptionActionSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    bio: {
        fontSize: 15,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    skillChipPrimary: {
        backgroundColor: 'rgba(255, 26, 92, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 26, 92, 0.4)',
    },
    skillTextPrimary: {
        color: COLORS.rosePrimary,
        fontWeight: '700',
        fontSize: 14,
    },
    skillChipSecondary: {
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    skillTextSecondary: {
        color: COLORS.textPrimary,
        fontWeight: '600',
        fontSize: 14,
    },
    addSkillChip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.textSecondary,
        borderStyle: 'dashed',
    },
    addSkillText: {
        fontWeight: '600',
        color: COLORS.textSecondary,
        fontSize: 14,
        marginLeft: 4,
    }
});
