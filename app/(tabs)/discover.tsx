import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart, Zap } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet from '@gorhom/bottom-sheet';

import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../src/store';
import { useTheme } from '../../src/context/ThemeContext';
import { useDiscoveryFeed } from '../../src/hooks/useDiscoveryFeed';
import { useDiscoverFilters } from '../../src/hooks/useDiscoverFilters';
import { DAILY_FREE_LIMITS, ACTION_CREDIT_COSTS } from '../../src/constants/ActionLimits';

import { CardStack } from '../../src/components/Discover/CardStack';
import { SearchHeader } from '../../src/components/Discover/SearchHeader';
import { FilterBottomSheet } from '../../src/components/Discover/FilterBottomSheet';

import { likeUser, passUser } from '../../src/services/matchingService';
import { removeFeedItem, recordSwipeData } from '../../src/store/discoverySlice';
import { checkAndResetDailyLimits, incrementDailyLimit } from '../../src/services/firestoreService';
import { spendCreditsOnServer } from '../../src/services/creditsService';
import { Alert } from 'react-native';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgBase: '#0d0202',
  bgDark: '#1a0505',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
};

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch();

  const bottomSheetRef = useRef<BottomSheet>(null);

  const currentUid = authUser?.uid ?? null;
  const { users: rawUsers, loading, hasLoaded } = useDiscoveryFeed(currentUid);
  const { filters, setFilter, resetFilters, applyFilters } = useDiscoverFilters();

  // filteredUsers only recomputes when rawUsers or filters change, not on every render
  // Pass profile as arg — applyFilters no longer captures it in closure, so filteredUsers
  // only recomputes when rawUsers or filters change, NOT on every Firestore profile update.
  const filteredUsers = useMemo(() => applyFilters(rawUsers, profile), [rawUsers, profile, applyFilters]);

  const dailySwipeCount = profile?.dailySwipes || 0;
  const currentCredits = profile?.credits || 0;
  
  const [isScreenReady, setIsScreenReady] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const params = useLocalSearchParams<{ searchQuery?: string; category?: string }>();

  useEffect(() => {
    if (currentUid) {
      checkAndResetDailyLimits(currentUid).catch(console.error);
    }
  }, [currentUid]);

  useEffect(() => {
    if (params.searchQuery !== undefined) {
      setFilter('searchQuery', params.searchQuery);
    }
    if (params.category !== undefined) {
      setFilter('category', params.category);
    }
  }, [params.searchQuery, params.category, setFilter]);

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

  const remainingSwipes = Math.max(0, DAILY_FREE_LIMITS.SWIPES - dailySwipeCount);

  const handleSwipeRight = useCallback(async () => {
    if (!filteredUsers.length || !currentUid) return;
    
    // Check limits
    if (dailySwipeCount >= DAILY_FREE_LIMITS.SWIPES) {
      if (currentCredits < ACTION_CREDIT_COSTS.EXTRA_SWIPE) {
        Alert.alert('Out of Credits', 'You need credits to keep swiping after your free daily limit.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Credits', onPress: () => router.push('/paywall') }
        ]);
        return;
      }

      const confirm = await new Promise((resolve) => {
        Alert.alert('Spend Credit', `Spend ${ACTION_CREDIT_COSTS.EXTRA_SWIPE} credit to swipe?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Swipe', onPress: () => resolve(true) }
        ]);
      });
      if (!confirm) return;

      try {
        await spendCreditsOnServer(ACTION_CREDIT_COSTS.EXTRA_SWIPE, 'extra_swipe');
      } catch (e) {
        Alert.alert('Error', 'Failed to deduct credits.');
        return;
      }
    }

    const target = filteredUsers[0];
    dispatch(removeFeedItem(target.uid));
    dispatch(recordSwipeData({ targetUid: target.uid, type: 'like' }));
    incrementDailyLimit(currentUid, 'dailySwipes').catch(console.error);

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
  }, [filteredUsers, currentUid, dispatch, dailySwipeCount, currentCredits]);

  const handleSwipeLeft = useCallback(async () => {
    if (!filteredUsers.length || !currentUid) return;
    
    // Check limits
    if (dailySwipeCount >= DAILY_FREE_LIMITS.SWIPES) {
      if (currentCredits < ACTION_CREDIT_COSTS.EXTRA_SWIPE) {
        Alert.alert('Out of Credits', 'You need credits to keep swiping after your free daily limit.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Credits', onPress: () => router.push('/paywall') }
        ]);
        return;
      }

      const confirm = await new Promise((resolve) => {
        Alert.alert('Spend Credit', `Spend ${ACTION_CREDIT_COSTS.EXTRA_SWIPE} credit to swipe?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Swipe', onPress: () => resolve(true) }
        ]);
      });
      if (!confirm) return;

      try {
        await spendCreditsOnServer(ACTION_CREDIT_COSTS.EXTRA_SWIPE, 'extra_swipe');
      } catch (e) {
        Alert.alert('Error', 'Failed to deduct credits.');
        return;
      }
    }

    const target = filteredUsers[0];
    dispatch(removeFeedItem(target.uid));
    dispatch(recordSwipeData({ targetUid: target.uid, type: 'pass' }));
    incrementDailyLimit(currentUid, 'dailySwipes').catch(console.error);

    try {
      await passUser(currentUid, target.uid);
    } catch (e) {
      console.error('Failed to pass user', e);
    }
  }, [filteredUsers, currentUid, dispatch, dailySwipeCount, currentCredits]);

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


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.mainContainer, { backgroundColor: COLORS.bgBase }]}>
        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: 90 }]}>

          <SearchHeader
            searchQuery={filters.searchQuery}
            onSearchChange={(q) => setFilter('searchQuery', q)}
            selectedCategory={filters.category}
            onSelectCategory={(c) => setFilter('category', c)}
            onOpenFilters={openFilters}
            activeFilterCount={activeFilterCount}
          />

          <View style={styles.swipeCounterContainer}>
            <View style={styles.swipeCounter}>
              <Zap size={12} color="#fff" fill="#fff" />
              <Text style={styles.swipeCounterText}>
                {remainingSwipes > 0 ? `${remainingSwipes} Free Swipes Left` : 'Pay-As-You-Go Mode'}
              </Text>
            </View>
          </View>

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
                style={[styles.button, styles.passButton]}
                onPress={handleSwipeLeft}
                activeOpacity={0.8}
              >
                <X color="#fff" size={28} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.likeButton]}
                onPress={handleSwipeRight}
                activeOpacity={0.8}
              >
                <Heart color="#fff" size={28} fill="#fff" />
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
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
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
    backgroundColor: '#ff1a5c',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#ff1a5c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  swipeCounterText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    position: 'absolute',
    bottom: 80,
    width: '100%',
  },
  button: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  passButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  likeButton: {
    backgroundColor: '#ff1a5c',
    shadowColor: '#ff1a5c',
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
