import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from '@react-native-firebase/firestore';
import type { AppDispatch } from '../store';
import { setMatches, clearMatches } from '../store/matchesSlice';
import { clearChat } from '../store/chatSlice';
import { clearDiscovery } from '../store/discoverySlice';
import { MatchDocument } from '../types/user';

export default function DataProvider({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    // Single onAuthStateChanged subscription that drives ALL global listeners.
    // This ensures we never miss auth resolution — getAuth().currentUser is
    // synchronously null during app start while Firebase is still initialising.
    let unsubscribeMatches: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(getAuth(), (user) => {
      // Tear down any previous listener first
      if (unsubscribeMatches) {
        unsubscribeMatches();
        unsubscribeMatches = null;
      }

      if (!user) {
        // User signed out — clear all global state
        dispatch(clearMatches());
        dispatch(clearChat());
        dispatch(clearDiscovery());
        return;
      }

      // User is signed in — start the real-time matches listener
      const matchesQuery = query(
        collection(getFirestore(), 'matches'),
        where('users', 'array-contains', user.uid),
        orderBy('matchedAt', 'desc'),
      );

      unsubscribeMatches = onSnapshot(
        matchesQuery,
        (snapshot) => {
          if (!snapshot) return;
          const updatedMatches: MatchDocument[] = snapshot.docs.map(
            (doc: any) => ({ id: doc.id, ...doc.data() } as MatchDocument),
          );
          dispatch(setMatches(updatedMatches));
        },
        (error) => {
          if ((error as any)?.code === 'firestore/permission-denied') {
            console.warn(
              '[DataProvider] Matches listener permission denied — check Firestore security rules.',
            );
            // Still mark as loaded so the UI shows empty state, not spinner
            dispatch(setMatches([]));
            return;
          }
          console.error('[DataProvider] Matches listener error:', error);
        },
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeMatches) unsubscribeMatches();
    };
  }, [dispatch]);

  return <>{children}</>;
}
