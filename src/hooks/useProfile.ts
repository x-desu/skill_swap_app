/**
 * useProfile.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to the current user's Firestore document in real-time.
 * - Creates a base doc automatically if this is the user's first login
 * - Dispatches to profileSlice
 * - Returns { profile, isLoading } from Redux
 */
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { setProfile, setProfileLoading } from '../store/profileSlice';
import { listenToUserProfile, upsertUserProfile } from '../services/firestoreService';

export function useProfile() {
  const dispatch = useDispatch<AppDispatch>();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { profile, isLoading } = useSelector((s: RootState) => s.profile);

  useEffect(() => {
    if (!authUser?.uid) {
      dispatch(setProfileLoading(false));
      return;
    }

    dispatch(setProfileLoading(true));

    // Real-time listener — automatically triggers profile creation on first listen
    const unsubscribe = listenToUserProfile(authUser.uid, async (doc) => {
      if (!doc) {
        // First login — create base document from Auth info
        await upsertUserProfile(authUser.uid, {
          displayName: authUser.displayName ?? '',
          email: authUser.email,
          photoURL: authUser.photoURL,
          hasPhoto: !!authUser.photoURL,
        });
        // The listener will fire again once the write completes
      } else {
        dispatch(setProfile(doc));
      }
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  return { profile, isLoading };
}
