import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { UserDocument } from '../types/user';
import { listenToUserProfile, upsertUserProfile } from '../services/firestoreService';

/**
 * useProfile.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Subscribes to the current user's Firestore document in real-time.
 * - Creates a base doc automatically if this is the user's first login.
 * - Localized state replacement for the deleted profileSlice.
 */
export function useProfile() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  
  const [profile, setProfile] = useState<UserDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

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
        setProfile(doc);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  return { profile, isLoading };
}
