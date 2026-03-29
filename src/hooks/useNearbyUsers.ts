import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { setNearbyUsers } from '../store/usersSlice';
import { listenToNearbyUsers } from '../services/firestoreService';

/**
 * Subscribes to the Firestore nearby users collection and keeps Redux in sync.
 * Returns { nearby, isLoading } from Redux state.
 */
export function useNearbyUsers() {
  const dispatch = useDispatch<AppDispatch>();
  const uid = useSelector((s: RootState) => s.auth.user?.uid);
  const { nearby, isLoading } = useSelector((s: RootState) => s.users);

  useEffect(() => {
    if (!uid) return;
    const unsubscribe = listenToNearbyUsers(uid, (users) => {
      dispatch(setNearbyUsers(users));
    });
    return () => unsubscribe(); // cleanup listener on unmount
  }, [uid]);

  return { nearby, isLoading };
}
