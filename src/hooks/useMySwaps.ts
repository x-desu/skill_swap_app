/**
 * useMySwaps.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time listener for all swap requests involving the current user.
 * Returns { incoming, outgoing, isLoading } from Redux.
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { clearSwapRequests, setSwapRequests } from '../store/usersSlice';
import { listenToMySwapRequests } from '../services/firestoreService';

export function useMySwaps() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { incomingSwaps, outgoingSwaps, swapsLoading } = useSelector(
    (s: RootState) => s.users,
  );

  useEffect(() => {
    if (!uid) {
      dispatch(clearSwapRequests());
      return;
    }
    const unsubscribe = listenToMySwapRequests(uid, (incoming, outgoing) => {
      dispatch(setSwapRequests({ incoming, outgoing }));
    });
    return () => unsubscribe();
  }, [dispatch, uid]);

  return {
    incoming: incomingSwaps,
    outgoing: outgoingSwaps,
    isLoading: swapsLoading,
    pendingCount: incomingSwaps.filter((s) => s.status === 'pending').length,
  };
}
