import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { UserDocument } from '../types/user';
import { getSwipedUserIds } from '../services/matchingService';

/**
 * Hook to fetch users for the Discovery Feed (Swipe Cards).
 * It fetches a batch of users and filters out anyone the current user
 * has already swiped on (liked or passed).
 */
export const useDiscoveryFeed = (currentUid: string | null) => {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUid) {
      setUsers([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchFeed = async () => {
      try {
        setLoading(true);

        // 1. Get all UIDs this user has already swiped on
        const swipedIds = await getSwipedUserIds(currentUid);
        
        // Always exclude self
        const excludedIds = new Set([...swipedIds, currentUid]);

        // 2. Fetch a batch of potential users
        // Note: For a real app at scale, you'd use geo-queries or Algolia here.
        // For MVP, we fetch 20 active profiles with completed setups.
        const snapshot = await firestore()
          .collection('users')
          .where('isProfileComplete', '==', true)
          .orderBy('rating', 'desc')
          .limit(20)
          .get();

        const fetchedUsers: UserDocument[] = [];
        snapshot.docs.forEach((doc) => {
          const data = doc.data() as UserDocument;
          // 3. Filter client-side
          if (!excludedIds.has(data.uid)) {
            fetchedUsers.push(data);
          }
        });

        if (isMounted) {
          setUsers(fetchedUsers);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error fetching discovery feed:', err);
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchFeed();

    return () => {
      isMounted = false;
    };
  }, [currentUid]);

  return { users, loading, error, setUsers }; // Expose setUsers so we can slice the array when swiping
};
