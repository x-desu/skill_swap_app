import { useEffect, useState, useCallback, useRef } from 'react';
import firestore, { collection, query, where, orderBy, limit, getDocs, startAfter, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { UserDocument } from '../types/user';
import { getSwipedUserIds } from '../services/matchingService';

/**
 * Hook to fetch users for the Discovery Feed (Swipe Cards).
 * It transparently hydrates the feed array when it drops below 5 elements,
 * maintaining local state for swiped IDs and the current feed queue.
 */
export const useDiscoveryFeed = (currentUid: string | null) => {
  const [feed, setFeed] = useState<UserDocument[]>([]);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [isPaginating, setIsPaginating] = useState(false);
  const [hasFetchedSwipes, setHasFetchedSwipes] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  // Keep the cursor in a ref so it doesn't trigger effect loops
  const lastDocRef = useRef<FirebaseFirestoreTypes.QueryDocumentSnapshot | null>(null);

  // Expose an optimistic upater to pop users instantly upon swiping
  const removeUserFromFeed = useCallback((uidToRemove: string) => {
    setFeed((prevFeed) => prevFeed.filter((u) => u.uid !== uidToRemove));
  }, []);

  // Expose swipe recording (optimistic)
  const recordSwipe = useCallback((targetUid: string) => {
    setSwipedIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(targetUid);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (!currentUid) return;

    // Only fetch if feed is running low, we aren't paginating, and there are more users
    if (feed.length > 5 || isPaginating || !hasMore) return;

    const fetchFeed = async () => {
      try {
        setIsPaginating(true);

        let currentSwipedIds = swipedIds;
        // 1. If we haven't loaded their historical swipes from DB, do that first
        if (!hasFetchedSwipes) {
          const fetchedArray = await getSwipedUserIds(currentUid);
          currentSwipedIds = new Set(fetchedArray);
          setSwipedIds(currentSwipedIds);
          setHasFetchedSwipes(true);
        }

        // Always exclude self
        const excludedIds = new Set(currentSwipedIds);
        excludedIds.add(currentUid);

        // 2. Fetch a batch of potential users
        // Use cursor pagination to avoid grabbing the same top users
        const usersRef = collection(firestore(), 'users');
        let q = query(
          usersRef,
          where('isProfileComplete', '==', true),
          orderBy('rating', 'desc'),
          limit(20)
        );

        if (lastDocRef.current) {
          q = query(q, startAfter(lastDocRef.current));
        }

        const snapshot = await getDocs(q);

        if (snapshot.docs.length < 20) {
          setHasMore(false); // exhausted all remote docs
        }
        if (snapshot.docs.length > 0) {
          lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
        }

        const fetchedUsers: UserDocument[] = [];
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data() as UserDocument;
          // 3. Filter client-side
          // Avoid appending users we already have in the queue just in case
          const alreadyInFeed = feed.some(f => f.uid === data.uid);
          
          if (!excludedIds.has(data.uid) && !alreadyInFeed) {
            fetchedUsers.push(data);
          }
        });

        if (fetchedUsers.length > 0) {
          setFeed((prev) => [...prev, ...fetchedUsers]);
        }
        
        // If we fetched docs but all of them were excluded locally, and we still have more,
        // we could loop here. However, by relying on useEffect dependencies (feed.length < 5),
        // the effect will naturally re-run to fetch the NEXT 20 docs.
      } catch (err: any) {
        console.error('Error fetching discovery feed:', err);
      } finally {
        setIsPaginating(false);
      }
    };

    fetchFeed();
  }, [currentUid, feed.length, isPaginating, swipedIds, hasFetchedSwipes, hasMore]);

  return { 
    users: feed, 
    loading: feed.length === 0 && isPaginating, 
    removeUserFromFeed, 
    recordSwipe 
  }; 
};
