import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';

// Hooks
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/context/ThemeContext';
import { useDiscoveryFeed } from '../../src/hooks/useDiscoveryFeed';
import { useDiscoverFilters } from '../../src/hooks/useDiscoverFilters';
import { useSubscriptionStatus } from '../../src/hooks/useSubscriptionStatus';

// Components
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { CardStack } from '../../src/components/Discover/CardStack';
import { SearchHeader } from '../../src/components/Discover/SearchHeader';
import { FilterBottomSheet } from '../../src/components/Discover/FilterBottomSheet';
import { getProfileBaseColor } from '../../src/utils/colorUtils';

// Services
import { likeUser, passUser } from '../../src/services/matchingService';

const DAILY_SWIPE_LIMIT_FREE = 5;

// Paywall Overlay Component (Kept inline as requested)
interface PaywallOverlayProps {
    onDismiss: () => void;
    onUpgrade: () => void;
}

function PaywallOverlay({ onDismiss, onUpgrade }: PaywallOverlayProps) {
    return (
        <View style={styles.paywallOverlay}>
            <View style={styles.paywallContent}>
                <Zap size={48} color="#ff1a5c" style={styles.paywallIcon} />
                <Text style={styles.paywallTitle}>Daily Limit Reached</Text>
                <Text style={styles.paywallMessage}>
                    You've used all {DAILY_SWIPE_LIMIT_FREE} free swipes for today. Upgrade to Pro for unlimited swipes and connect with more people!
                </Text>
                <View style={styles.paywallButtons}>
                    <TouchableOpacity style={styles.paywallButton} onPress={onDismiss}>
                        <Text style={styles.paywallButtonText}>Maybe Later</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.paywallButton, styles.paywallButtonPrimary]} onPress={onUpgrade}>
                        <Text style={[styles.paywallButtonText, styles.paywallButtonPrimaryText]}>Upgrade to Pro</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const { currentUser } = useStore();
    const { colors, isDark } = useTheme();
    const { isPro } = useSubscriptionStatus();
    
    // Bottom sheet ref
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Initialize feeds and filters
    const currentUid = currentUser?.uid || currentUser?.id;
    const { users: rawUsers, loading, removeUserFromFeed, recordSwipe } = useDiscoveryFeed(currentUid);
    const { filters, setFilter, resetFilters, applyFilters } = useDiscoverFilters(currentUser as any);
    
    // Process the feed locally through filters array
    const filteredUsers = useMemo(() => applyFilters(rawUsers), [rawUsers, applyFilters]);

    // Swipe limiting for free users
    const [dailySwipeCount, setDailySwipeCount] = useState(0);
    const [showPaywall, setShowPaywall] = useState(false);
    
    useEffect(() => {
        // Reset local swipe count for MVP.
        setDailySwipeCount(0);
    }, []);
    
    const canSwipe = isPro || dailySwipeCount < DAILY_SWIPE_LIMIT_FREE;
    const remainingSwipes = isPro ? '∞' : Math.max(0, DAILY_SWIPE_LIMIT_FREE - dailySwipeCount);
    
    const countActiveFilters = () => {
        let count = 0;
        if (filters.maxDistance < 100 && filters.maxDistance > 0) count++;
        if (filters.category !== 'All') count++;
        if (filters.minRating > 0) count++;
        if (filters.onlineOnly) count++;
        if (filters.hasCredits) count++;
        if (filters.matchMySkills) count++;
        return count;
    };

    const handleSwipeRight = async () => {
        if (!filteredUsers.length) return;
        const target = filteredUsers[0];

        // Optimistic UI updates
        removeUserFromFeed(target.uid || target.id);
        recordSwipe(target.uid || target.id);
        setDailySwipeCount(prev => prev + 1);

        try {
            const match = await likeUser(currentUid, target.uid || target.id);
            if (match) {
                // Future Enhancement: Show native celebration overlay before routing
                // router.push('/match-celebration');
            }
        } catch (e) {
            console.error("Failed to like user", e);
        }
    };

    const handleSwipeLeft = async () => {
        if (!filteredUsers.length) return;
        const target = filteredUsers[0];

        // Optimistic UI updates
        removeUserFromFeed(target.uid || target.id);
        recordSwipe(target.uid || target.id);
        setDailySwipeCount(prev => prev + 1);

        try {
            await passUser(currentUid, target.uid || target.id);
        } catch (e) {
            console.error("Failed to pass user", e);
        }
    };

    const openFilters = () => {
        bottomSheetRef.current?.expand();
    };

    const currentProfile = filteredUsers.length > 0 ? filteredUsers[0] : null;
    const nextProfile = filteredUsers.length > 1 ? filteredUsers[1] : null;
    const hasUsers = filteredUsers.length > 0;

    // Use current profile's base color for the dynamic gradient, else fade to default
    const baseColor = currentProfile ? getProfileBaseColor(currentProfile) : '#0a0a0a';
    const seedKey = `tab:discover:${currentProfile?.uid || currentProfile?.id || 'empty'}`;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
                <View style={[styles.content, { paddingTop: insets.top, paddingBottom: 90 }]}>
                    
                    <SearchHeader 
                        searchQuery={filters.searchQuery}
                        onSearchChange={(q) => setFilter('searchQuery', q)}
                        selectedCategory={filters.category}
                        onSelectCategory={(c) => setFilter('category', c)}
                        onOpenFilters={openFilters}
                        activeFilterCount={countActiveFilters()}
                    />

                    {!isPro && (
                        <View style={styles.swipeCounterContainer}>
                            <View style={styles.swipeCounter}>
                                <Zap size={14} color="#ff1a5c" fill="#ff1a5c" />
                                <Text style={styles.swipeCounterText}>
                                    {remainingSwipes}/{DAILY_SWIPE_LIMIT_FREE} Swipes Left
                                </Text>
                            </View>
                        </View>
                    )}

                    {loading && !hasUsers ? (
                        <View style={[styles.center, { flex: 1 }]}>
                            <Text style={{ color: '#aaa', fontSize: 16 }}>Finding local skill swapers...</Text>
                        </View>
                    ) : !hasUsers ? (
                        <View style={[styles.center, { flex: 1 }]}>
                            <Text style={[styles.noMoreText, { color: colors.text }]}>No more swapers nearby!</Text>
                            <Text style={[styles.subText, { color: isDark ? '#aaa' : '#ccc' }]}>Try adjusting your filters.</Text>
                            <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                                <Text style={styles.resetBtnText}>Reset Filters</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <CardStack
                            currentProfile={currentProfile}
                            nextProfile={nextProfile}
                            onSwipeRight={handleSwipeRight}
                            onSwipeLeft={handleSwipeLeft}
                            canSwipe={canSwipe}
                            onPaywallRequired={() => setShowPaywall(true)}
                        />
                    )}

                    {showPaywall && <PaywallOverlay onDismiss={() => setShowPaywall(false)} onUpgrade={() => { setShowPaywall(false); router.push('/paywall'); }} />}

                    {hasUsers && (
                        <View style={styles.footer}>
                            <TouchableOpacity 
                                style={[styles.button, styles.passButton, { 
                                    backgroundColor: 'rgba(0,0,0,0.25)', 
                                    borderColor: 'rgba(255,255,255,0.18)',
                                    opacity: canSwipe ? 1 : 0.5 
                                }]} 
                                onPress={handleSwipeLeft}
                                disabled={!canSwipe}
                            >
                                <X color="#fff" size={30} />
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.button, styles.likeButton, { 
                                    backgroundColor: 'rgba(0,0,0,0.25)', 
                                    borderColor: 'rgba(255,255,255,0.18)',
                                    opacity: canSwipe ? 1 : 0.5 
                                }]} 
                                onPress={handleSwipeRight}
                                disabled={!canSwipe}
                            >
                                <Heart color="#fff" size={30} fill="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <FilterBottomSheet 
                    ref={bottomSheetRef} 
                    filters={filters} 
                    setFilter={setFilter} 
                    resetFilters={resetFilters}
                    resultCount={filteredUsers.length}
                />
            </ProfileGlowBackground>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    content: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    swipeCounterContainer: {
        alignItems: 'center',
        marginBottom: 10,
        zIndex: 5,
    },
    swipeCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,26,92,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,26,92,0.3)',
    },
    swipeCounterText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#ff1a5c'
    },
    footer: {
        height: 100,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 40,
        position: 'absolute',
        bottom: 80,
        width: '100%',
    },
    button: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    passButton: { borderWidth: 1 },
    likeButton: { borderWidth: 1 },
    noMoreText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subText: {
        fontSize: 16,
        marginBottom: 20
    },
    resetBtn: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    resetBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    paywallOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    paywallContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320
    },
    paywallIcon: { marginBottom: 16 },
    paywallTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center'
    },
    paywallMessage: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20
    },
    paywallButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%'
    },
    paywallButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center'
    },
    paywallButtonPrimary: {
        backgroundColor: '#ff1a5c',
        borderColor: '#ff1a5c'
    },
    paywallButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff'
    },
    paywallButtonPrimaryText: { color: '#fff' }
});
