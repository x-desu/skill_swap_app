import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Zap } from 'lucide-react-native';
import { router } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';

import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../src/store';
import { useTheme } from '../../src/context/ThemeContext';
import { useDiscoveryFeed } from '../../src/hooks/useDiscoveryFeed';
import { useDiscoverFilters } from '../../src/hooks/useDiscoverFilters';
import { useSubscriptionStatus } from '../../src/hooks/useSubscriptionStatus';

import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { CardStack } from '../../src/components/Discover/CardStack';
import { SearchHeader } from '../../src/components/Discover/SearchHeader';
import { FilterBottomSheet } from '../../src/components/Discover/FilterBottomSheet';
import { getProfileBaseColor } from '../../src/utils/colorUtils';

import { likeUser, passUser } from '../../src/services/matchingService';
import { removeFeedItem, recordSwipeData } from '../../src/store/discoverySlice';

const DAILY_SWIPE_LIMIT_FREE = 5;

const COLORS = {
  rosePrimary: '#ff1a5c',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
};

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const { colors, isDark } = useTheme();
  const { isPro } = useSubscriptionStatus();
  const dispatch = useDispatch();

  const bottomSheetRef = useRef<BottomSheet>(null);

  const currentUid = authUser?.uid ?? null;
  const { users: rawUsers, loading, hasLoaded } = useDiscoveryFeed(currentUid);
  const { filters, setFilter, resetFilters, applyFilters } = useDiscoverFilters();

  // filteredUsers only recomputes when rawUsers or filters change, not on every render
  // Pass profile as arg — applyFilters no longer captures it in closure, so filteredUsers
  // only recomputes when rawUsers or filters change, NOT on every Firestore profile update.
  const filteredUsers = useMemo(() => applyFilters(rawUsers, profile), [rawUsers, profile, applyFilters]);

  const [dailySwipeCount, setDailySwipeCount] = useState(0);
  const [isScreenReady, setIsScreenReady] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Defer heavy work until after navigation transition completes
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsScreenReady(true);
    });
    return () => task.cancel();
  }, []);

  const currentProfile = filteredUsers.length > 0 ? filteredUsers[0] : null;
  const nextProfile = filteredUsers.length > 1 ? filteredUsers[1] : null;
  const hasUsers = filteredUsers.length > 0;

  const shouldShowCards = isScreenReady && hasUsers;
  const shouldShowLoading = isScreenReady && loading && !hasUsers;

  const canSwipe = isPro || dailySwipeCount < DAILY_SWIPE_LIMIT_FREE;
  const remainingSwipes = isPro ? '∞' : Math.max(0, DAILY_SWIPE_LIMIT_FREE - dailySwipeCount);

  // Memoize so CardStack props stay stable between renders
  const handleSwipeRight = useCallback(async () => {
    if (!filteredUsers.length || !currentUid) return;
    const target = filteredUsers[0];
    dispatch(removeFeedItem(target.uid));
    dispatch(recordSwipeData({ targetUid: target.uid, type: 'like' }));
    setDailySwipeCount((prev) => prev + 1);
    try {
      const match = await likeUser(currentUid, target.uid);
      if (match) {
        router.push({
          pathname: '/match-celebration',
          params: {
            matchId: match.id,
            targetUid: target.uid,
            targetName: target.displayName,
            targetPhoto: target.photoURL || '',
          },
        });
      }
    } catch (e) {
      console.error('Failed to like user', e);
    }
  }, [filteredUsers, currentUid, dispatch]);

  const handleSwipeLeft = useCallback(async () => {
    if (!filteredUsers.length || !currentUid) return;
    const target = filteredUsers[0];
    dispatch(removeFeedItem(target.uid));
    dispatch(recordSwipeData({ targetUid: target.uid, type: 'pass' }));
    setDailySwipeCount((prev) => prev + 1);
    try {
      await passUser(currentUid, target.uid);
    } catch (e) {
      console.error('Failed to pass user', e);
    }
  }, [filteredUsers, currentUid, dispatch]);

  const openFilters = useCallback(() => {
    setShowFilterSheet(true);
    setTimeout(() => bottomSheetRef.current?.expand(), 50);
  }, []);

  const closeFilters = useCallback(() => {
    bottomSheetRef.current?.close();
    setTimeout(() => setShowFilterSheet(false), 300);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.maxDistance < 100 && filters.maxDistance > 0) count++;
    if (filters.category !== 'All') count++;
    if (filters.minRating > 0) count++;
    if (filters.onlineOnly) count++;
    if (filters.hasCredits) count++;
    if (filters.matchMySkills) count++;
    return count;
  }, [filters]);

  // Background only changes when the TOP card changes uid — not on every re-render
  const baseColor = useMemo(
    () =>
      currentProfile
        ? getProfileBaseColor({ id: currentProfile.uid, avatar: currentProfile.photoURL ?? undefined })
        : '#0a0a0a',
    [currentProfile?.uid, currentProfile?.photoURL]
  );
  const seedKey = useMemo(
    () => `tab:discover:${currentProfile?.uid || 'empty'}`,
    [currentProfile?.uid]
  );

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
            activeFilterCount={activeFilterCount}
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

          {shouldShowLoading ? (
            <View style={[styles.center, { flex: 1 }]}>
              <Text style={{ color: '#aaa', fontSize: 16 }}>Finding local skill swapers...</Text>
            </View>
          ) : !isScreenReady ? (
            <View style={[styles.center, { flex: 1 }]}>
              <Text style={{ color: '#aaa', fontSize: 16 }}>Loading...</Text>
            </View>
          ) : !hasUsers && hasLoaded ? (
            <View style={[styles.center, { flex: 1 }]}>
              <Text style={[styles.noMoreText, { color: colors.text }]}>No more swapers nearby!</Text>
              <Text style={[styles.subText, { color: isDark ? '#aaa' : '#ccc' }]}>
                Try adjusting your filters.
              </Text>
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
            />
          )}

          {hasUsers && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.passButton, { opacity: canSwipe ? 1 : 0.5 }]}
                onPress={handleSwipeLeft}
                disabled={!canSwipe}
              >
                <X color="#fff" size={30} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.likeButton, { opacity: canSwipe ? 1 : 0.5 }]}
                onPress={handleSwipeRight}
                disabled={!canSwipe}
              >
                <Heart color="#fff" size={30} fill="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {showFilterSheet && (
            <FilterBottomSheet
              ref={bottomSheetRef}
              filters={filters}
              setFilter={setFilter}
              resetFilters={resetFilters}
              resultCount={filteredUsers.length}
            />
          )}
        </View>
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
    color: '#ff1a5c',
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
    elevation: 5,
  },
  passButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  likeButton: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  noMoreText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    marginBottom: 20,
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
});
