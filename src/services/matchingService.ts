import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  limit,
  doc,
  setDoc,
  writeBatch,
  increment,
} from '@react-native-firebase/firestore';
import { LikeDocument, MatchDocument } from '../types/user';

const db = getFirestore();

/**
 * Returns a list of UIDs that the current user has already liked or passed.
 * We use this to filter out users from the discovery feed.
 */
export const getSwipedUserIds = async (currentUid: string): Promise<string[]> => {
  const q = query(collection(db, 'likes'), where('fromUid', '==', currentUid));
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
  await addDoc(collection(db, 'likes'), {
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
  // 1. Record the like
  await addDoc(collection(db, 'likes'), {
    fromUid: currentUid,
    toUid: targetUid,
    type: 'like',
    createdAt: serverTimestamp(),
  });

  // 2. Check for mutual match
  const reverseLikeQuery = query(
    collection(db, 'likes'),
    where('fromUid', '==', targetUid),
    where('toUid', '==', currentUid),
    where('type', '==', 'like'),
    limit(1)
  );
  
  const reverseLikeSnapshot = await getDocs(reverseLikeQuery);

  if (!reverseLikeSnapshot.empty) {
    // IT'S A MATCH! Create a match document
    // Sort UIDs alphabetically to create a consistent, unique match ID
    const sortedUids = [currentUid, targetUid].sort();
    const matchId = `${sortedUids[0]}_${sortedUids[1]}`;

    const matchRef = doc(db, 'matches', matchId);

    // Use set with merge in case it somehow already exists, though it shouldn't
    const newMatch = {
      id: matchId,
      users: [currentUid, targetUid],
      matchedAt: serverTimestamp(),
    };

    await setDoc(matchRef, newMatch, { merge: true });

    // Optional: Increment mutualMatches count for both users in a batch
    const batch = writeBatch(db);
    const user1Ref = doc(db, 'users', currentUid);
    const user2Ref = doc(db, 'users', targetUid);
    batch.update(user1Ref, { mutualMatches: increment(1) });
    batch.update(user2Ref, { mutualMatches: increment(1) });
    await batch.commit();

    return newMatch as unknown as MatchDocument; // Types match closely enough for return
  }

  return null;
};
