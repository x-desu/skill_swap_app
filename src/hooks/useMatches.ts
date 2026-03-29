import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { MatchDocument } from '../types/user';

/**
 * Real-time hook to listen to all matches for the current user.
 * Mounts in the Chat List (`messages.tsx`) to show active conversations.
 */
export const useMatches = (currentUid: string | null) => {
  const [matches, setMatches] = useState<MatchDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUid) {
      setMatches([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const matchRef = firestore()
      .collection('matches')
      .where('users', 'array-contains', currentUid)
      .orderBy('lastMessageTime', 'desc');

    const unsubscribe = matchRef.onSnapshot(
      (snapshot) => {
        const fetchedMatches = snapshot.docs.map((doc) => doc.data() as MatchDocument);
        setMatches(fetchedMatches);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching matches:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUid]);

  return { matches, loading, error };
};
