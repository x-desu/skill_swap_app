import { useEffect } from 'react';
import firestore, { collection, query, where, orderBy, limit, getDocs } from '@react-native-firebase/firestore';
import { useDispatch, useSelector } from 'react-redux';
import { UserDocument } from '../types/user';
import { getSwipedUserIds } from '../services/matchingService';
import { appendFeed, setIsPaginating, setSwipedIds } from '../store/discoverySlice';
import type { RootState } from '../store';

/**
 * Hook to fetch users for the Discovery Feed (Swipe Cards).
 * It transparently hydrates the Redux `discoverySlice` when the feed array drops below 5 elements.
 */
export const useDiscoveryFeed = (currentUid: string | null) => {
  const dispatch = useDispatch();
  const feed = useSelector((state: RootState) => state.discovery.feed);
  const isPaginating = useSelector((state: RootState) => state.discovery.isPaginating);
  const swipedIdsMap = useSelector((state: RootState) => state.discovery.swipedIds);

  useEffect(() => {
    if (!currentUid) return;

    // Only fetch if the feed is running low and we aren't already paginating
    if (feed.length > 5 || isPaginating) return;

    const fetchFeed = async () => {
      try {
        dispatch(setIsPaginating(true));

        // 1. Get all UIDs this user has already swiped on
        let currentSwipedIds = Object.keys(swipedIdsMap);
        if (currentSwipedIds.length === 0) {
          const fetchedIds = await getSwipedUserIds(currentUid);
          dispatch(setSwipedIds(fetchedIds));
          currentSwipedIds = fetchedIds;
        }

        // Always exclude self
        const excludedIds = new Set([...currentSwipedIds, currentUid]);

        // 2. Fetch a batch of potential users
        // For MVP, we fetch 20 active profiles with completed setups.
        const usersRef = collection(firestore(), 'users');
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
          // 3. Filter client-side
          if (!excludedIds.has(data.uid)) {
            fetchedUsers.push(data);
          }
        });

        dispatch(appendFeed(fetchedUsers));
      } catch (err: any) {
        console.error('Error fetching discovery feed:', err);
      } finally {
        dispatch(setIsPaginating(false));
      }
    };

    fetchFeed();
  }, [currentUid, feed.length, isPaginating, swipedIdsMap, dispatch]);

  return { users: feed, loading: feed.length === 0 && isPaginating }; 
};
