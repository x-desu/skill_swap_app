import { useEffect, useRef, useState } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { UserDocument } from '../types/user';
import { getSwipedUserIds } from '../services/matchingService';
import { appendFeed, setIsPaginating, setSwipedIds } from '../store/discoverySlice';
import type { RootState } from '../store';

/**
 * Hook to fetch users for the Discovery Feed (Swipe Cards).
 * Transparently hydrates the Redux `discoverySlice` when the feed drops below 5.
 *
 * Performance notes:
 * - swipedIdsMap is accessed via ref to avoid re-triggering the effect on every swipe.
 * - feedLength is accessed via ref to avoid re-triggering the effect on every swipe (card removal).
 * - fetch is gated behind `feedLengthRef.current > 5 || isPaginatingRef.current` to prevent duplicate calls.
 */
export const useDiscoveryFeed = (currentUid: string | null) => {
  const dispatch = useDispatch();
  const feed = useSelector((state: RootState) => state.discovery.feed);
  const isPaginating = useSelector((state: RootState) => state.discovery.isPaginating);
  const authLoading = useSelector((state: RootState) => state.auth.isLoading);

  // --- Use refs for values that should NOT retrigger the fetch effect ---

  // swipedIds ref — updating swiped IDs should not cause a re-fetch
  const swipedIdsMap = useSelector((state: RootState) => state.discovery.swipedIds);
  const swipedIdsRef = useRef(swipedIdsMap);
  useEffect(() => {
    swipedIdsRef.current = swipedIdsMap;
  }, [swipedIdsMap]);

  // feedLength ref — card removal (swipe) should NOT retrigger fetch
  const feedLengthRef = useRef(feed.length);
  useEffect(() => {
    feedLengthRef.current = feed.length;
  }, [feed.length]);

  // isPaginating ref — prevents duplicate concurrent fetches
  const isPaginatingRef = useRef(isPaginating);
  useEffect(() => {
    isPaginatingRef.current = isPaginating;
  }, [isPaginating]);

  const blockedUidRef = useRef<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Trigger: only fires when the user changes or auth resolves.
  // Swipes no longer trigger this effect — feed.length removed from deps.
  useEffect(() => {
    if (!currentUid || authLoading) return;
    if (blockedUidRef.current === currentUid) return;

    const fetchFeed = async () => {
      // Re-check via refs inside async fn to avoid stale closure issues
      if (feedLengthRef.current > 5 || isPaginatingRef.current) return;

      try {
        dispatch(setIsPaginating(true));
        setErrorCode(null);

        let currentSwipedIds = Object.keys(swipedIdsRef.current);
        if (currentSwipedIds.length === 0) {
          const fetchedIds = await getSwipedUserIds(currentUid);
          dispatch(setSwipedIds(fetchedIds));
          currentSwipedIds = fetchedIds;
        }

        const excludedIds = new Set([...currentSwipedIds, currentUid]);

        const usersRef = collection(getFirestore(), 'users');
        const q = query(
          usersRef,
          where('isProfileComplete', '==', true),
          orderBy('rating', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);

        const fetchedUsers: UserDocument[] = [];
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data() as UserDocument;
          if (!excludedIds.has(data.uid)) {
            fetchedUsers.push(data);
          }
        });

        dispatch(appendFeed(fetchedUsers));
        setHasFetchedOnce(true);
      } catch (err: any) {
        setHasFetchedOnce(true);
        if (err?.code === 'firestore/permission-denied') {
          blockedUidRef.current = currentUid;
          setErrorCode('firestore/permission-denied');
          console.warn('[DiscoveryFeed] Firestore permission denied.');
        } else {
          setErrorCode(err?.code ?? 'unknown');
          console.error('Error fetching discovery feed:', err);
        }
      } finally {
        dispatch(setIsPaginating(false));
      }
    };

    fetchFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // feed.length intentionally excluded — read via ref to avoid fetch loops on every swipe
    // isPaginating intentionally excluded — read via ref to avoid concurrent fetch race
  }, [currentUid, authLoading, dispatch]);

  // Pagination: manually trigger when feed runs low after initial load
  useEffect(() => {
    if (!currentUid || authLoading || !hasFetchedOnce) return;
    if (feed.length > 5) return;
    if (isPaginatingRef.current) return;
    if (blockedUidRef.current === currentUid) return;

    const fetchMore = async () => {
      if (isPaginatingRef.current) return;
      try {
        dispatch(setIsPaginating(true));
        const currentSwipedIds = Object.keys(swipedIdsRef.current);
        const excludedIds = new Set([...currentSwipedIds, currentUid]);

        const usersRef = collection(getFirestore(), 'users');
        const q = query(
          usersRef,
          where('isProfileComplete', '==', true),
          orderBy('rating', 'desc'),
          limit(20)
        );
        const snapshot = await getDocs(q);
        const fetchedUsers: UserDocument[] = [];
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data() as UserDocument;
          if (!excludedIds.has(data.uid)) fetchedUsers.push(data);
        });
        dispatch(appendFeed(fetchedUsers));
      } catch (err: any) {
        console.error('Error paginating discovery feed:', err);
      } finally {
        dispatch(setIsPaginating(false));
      }
    };

    fetchMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.length, hasFetchedOnce, currentUid, authLoading, dispatch]);

  // Reset on user change
  useEffect(() => {
    blockedUidRef.current = null;
    setErrorCode(null);
    setHasFetchedOnce(false);
  }, [currentUid]);

  useEffect(() => {
    if (feed.length > 0) setHasFetchedOnce(true);
  }, [feed.length]);

  const loading =
    !!currentUid &&
    !authLoading &&
    feed.length === 0 &&
    !errorCode &&
    (!hasFetchedOnce || isPaginating);

  return {
    users: feed,
    loading,
    errorCode,
    hasLoaded: hasFetchedOnce || feed.length > 0,
  };
};
