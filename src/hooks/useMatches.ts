import { useEffect, useState } from 'react';
import { subscribeToMatches } from '../services/matchingService';
import { MatchDocument } from '../types/user';

/**
 * useMatches.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time hook to listen to all matches for the current user.
 * Connects directly to Firestore, entirely independent of Redux.
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

    const unsubscribe = subscribeToMatches(
      currentUid,
      (fetchedMatches) => {
        setMatches(fetchedMatches);
        setLoading(false);
        setError(null);
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
