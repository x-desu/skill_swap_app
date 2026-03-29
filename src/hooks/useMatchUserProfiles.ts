import { useEffect, useState } from 'react';
import { getUserProfile } from '../services/firestoreService';
import { UserDocument } from '../types/user';

/**
 * useMatchUserProfiles.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches user profiles for a list of UIDs. Used by the matches screen to display
 * user names and photos instead of raw UIDs.
 */
export const useMatchUserProfiles = (uids: string[]) => {
  const [profiles, setProfiles] = useState<Map<string, UserDocument>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uids.length === 0) {
      setProfiles(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);

    const fetchProfiles = async () => {
      const profileMap = new Map<string, UserDocument>();
      
      // Fetch all profiles in parallel
      await Promise.all(
        uids.map(async (uid) => {
          try {
            const profile = await getUserProfile(uid);
            if (profile) {
              profileMap.set(uid, profile);
            }
          } catch (error) {
            console.error(`Failed to fetch profile for ${uid}:`, error);
          }
        })
      );

      setProfiles(profileMap);
      setLoading(false);
    };

    fetchProfiles();
  }, [uids.join(',')]);

  return { profiles, loading };
};
