import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from '@react-native-firebase/firestore';

interface UserPresence {
  isOnline: boolean;
  lastActive: Date | null;
}

export function useUserPresence(userId: string | undefined): UserPresence {
  const [presence, setPresence] = useState<UserPresence>({
    isOnline: false,
    lastActive: null,
  });

  useEffect(() => {
    if (!userId) return;

    const db = getFirestore();
    const userRef = doc(db, 'users', userId);
    
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (!data) return;
          const isOnline = data.isOnline === true;
          const lastActive = data.lastActive?.toDate?.() || null;
          
          setPresence({ isOnline, lastActive });
        }
      },
      (error) => {
        console.error('[useUserPresence] Error:', error);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return presence;
}

export function formatLastActive(lastActive: Date | null): string {
  if (!lastActive) return 'Offline';
  
  const now = new Date();
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return lastActive.toLocaleDateString();
}
