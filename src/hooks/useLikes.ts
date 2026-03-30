import { useEffect, useState } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from '@react-native-firebase/firestore';
import { LikeDocument } from '../types/user';

const db = getFirestore();

/**
 * useLikes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time listener for all likes involving the current user.
 * Returns both incoming likes (as toUid) and outgoing likes (as fromUid).
 * Used to show pending likes in the Requests tab.
 */
export function useLikes(uid: string | null | undefined) {
  const [incomingLikes, setIncomingLikes] = useState<LikeDocument[]>([]);
  const [outgoingLikes, setOutgoingLikes] = useState<LikeDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setIncomingLikes((prev) => (prev.length === 0 ? prev : []));
      setOutgoingLikes((prev) => (prev.length === 0 ? prev : []));
      setIsLoading((prev) => (prev ? false : prev));
      return;
    }

    setIsLoading(true);

    // Query for incoming likes (people who liked current user)
    // limit(100) is required by Firestore security rules (request.query.limit <= 100)
    const incomingQuery = query(
      collection(db, 'likes'),
      where('toUid', '==', uid),
      where('type', '==', 'like'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    // Query for outgoing likes (people current user liked)
    // limit(100) is required by Firestore security rules (request.query.limit <= 100)
    const outgoingQuery = query(
      collection(db, 'likes'),
      where('fromUid', '==', uid),
      where('type', '==', 'like'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    let resolved = [false, false];
    let incomingData: LikeDocument[] = [];
    let outgoingData: LikeDocument[] = [];

    const notify = () => {
      if (resolved[0] && resolved[1]) {
        setIncomingLikes(incomingData);
        setOutgoingLikes(outgoingData);
        setIsLoading(false);
      }
    };

    const unsubIncoming = onSnapshot(
      incomingQuery,
      (snapshot) => {
        incomingData = snapshot.docs.map((d: any) => ({ 
          ...(d.data() as LikeDocument), 
          id: d.id 
        }));
        resolved[0] = true;
        notify();
      },
      (error) => {
        console.error('Error listening to incoming likes:', error);
        resolved[0] = true;
        notify();
      }
    );

    const unsubOutgoing = onSnapshot(
      outgoingQuery,
      (snapshot) => {
        outgoingData = snapshot.docs.map((d: any) => ({ 
          ...(d.data() as LikeDocument), 
          id: d.id 
        }));
        resolved[1] = true;
        notify();
      },
      (error) => {
        console.error('Error listening to outgoing likes:', error);
        resolved[1] = true;
        notify();
      }
    );

    return () => {
      unsubIncoming();
      unsubOutgoing();
    };
  }, [uid]);

  // Filter out likes that resulted in mutual matches
  // A like is "pending" if the other user hasn't liked back
  const pendingIncoming = incomingLikes.filter((like) => {
    // Check if current user has liked this person back
    return !outgoingLikes.some(
      (outLike) => outLike.toUid === like.fromUid
    );
  });

  const pendingOutgoing = outgoingLikes.filter((like) => {
    // Check if the target user has liked current user back
    return !incomingLikes.some(
      (inLike) => inLike.fromUid === like.toUid
    );
  });

  return {
    incomingLikes,
    outgoingLikes,
    pendingIncoming,
    pendingOutgoing,
    isLoading,
  };
}
