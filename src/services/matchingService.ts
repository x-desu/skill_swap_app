import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  serverTimestamp,
  limit,
  doc,
  setDoc,
  writeBatch,
  increment,
  onSnapshot,
  orderBy
} from '@react-native-firebase/firestore';
import { LikeDocument, MatchDocument } from '../types/user';

const db = () => getFirestore();

/**
 * Returns a list of UIDs that the current user has already liked or passed.
 * We use this to filter out users from the discovery feed.
 */
export const getSwipedUserIds = async (currentUid: string): Promise<string[]> => {
  const q = query(collection(db(), 'likes'), where('fromUid', '==', currentUid), limit(100));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnapshot: any) => {
    const data = docSnapshot.data() as LikeDocument;
    return data.toUid;
  });
};

/**
 * Records a "Pass" (Left Swipe).
 */
export const passUser = async (currentUid: string, targetUid: string): Promise<void> => {
  await addDoc(collection(db(), 'likes'), {
    fromUid: currentUid,
    toUid: targetUid,
    type: 'pass',
    createdAt: serverTimestamp(),
  });
};

/**
 * Records a "Like" (Right Swipe).
 * Checks if targetUid has already liked currentUid.
 * If yes -> returns a new Match!
 * If no -> returns null
 */
export const likeUser = async (currentUid: string, targetUid: string): Promise<MatchDocument | null> => {
  // 1. Record the like - this is the ONLY client-side action per SRS
  // Backend Cloud Function (onLikeCreated) will handle:
  // - Mutual match detection
  // - Match document creation
  // - Notification creation
  // - Counter updates
  await addDoc(collection(db(), 'likes'), {
    fromUid: currentUid,
    toUid: targetUid,
    type: 'like',
    createdAt: serverTimestamp(),
  });

  // 2. Check for existing mutual match (in case backend already created it)
  // This is for immediate UX feedback - the match subscription will update UI shortly
  const sortedUids = [currentUid, targetUid].sort();
  const matchId = `${sortedUids[0]}_${sortedUids[1]}`;
  const matchRef = doc(db(), 'matches', matchId);
  const matchSnap = await getDoc(matchRef);
  
  if (matchSnap.exists()) {
    return matchSnap.data() as MatchDocument;
  }

  return null;
};

/**
 * Real-time listener for the user's active matches.
 * Note: Requires Firestore composite index on `users` (array-contains) + `matchedAt` (desc)
 */
export const subscribeToMatches = (
  currentUid: string,
  onUpdate: (matches: MatchDocument[]) => void,
  onError: (error: Error) => void
) => {
  // Use matchedAt as the sort field since all matches have this field
  // New matches without messages will still appear
  const q = query(
    collection(db(), 'matches'),
    where('users', 'array-contains', currentUid),
    orderBy('matchedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const fetchedMatches = snapshot.docs.map((docSnap: any) => docSnap.data() as MatchDocument);
      onUpdate(fetchedMatches);
    },
    onError
  );
};

export const getMatchById = async (matchId: string): Promise<MatchDocument | null> => {
  const matchSnap = await getDoc(doc(db(), 'matches', matchId));

  if (!matchSnap.exists()) {
    return null;
  }

  return matchSnap.data() as MatchDocument;
};
