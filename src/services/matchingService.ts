import firestore from '@react-native-firebase/firestore';
import { LikeDocument, MatchDocument } from '../types/user';

const db = firestore();

/**
 * Returns a list of UIDs that the current user has already liked or passed.
 * We use this to filter out users from the discovery feed.
 */
export const getSwipedUserIds = async (currentUid: string): Promise<string[]> => {
  const snapshot = await db
    .collection('likes')
    .where('fromUid', '==', currentUid)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data() as LikeDocument;
    return data.toUid;
  });
};

/**
 * Records a "Pass" (Left Swipe).
 */
export const passUser = async (currentUid: string, targetUid: string): Promise<void> => {
  await db.collection('likes').add({
    fromUid: currentUid,
    toUid: targetUid,
    type: 'pass',
    createdAt: firestore.FieldValue.serverTimestamp(),
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
  await db.collection('likes').add({
    fromUid: currentUid,
    toUid: targetUid,
    type: 'like',
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Check for mutual match
  const reverseLikeSnapshot = await db
    .collection('likes')
    .where('fromUid', '==', targetUid)
    .where('toUid', '==', currentUid)
    .where('type', '==', 'like')
    .limit(1)
    .get();

  if (!reverseLikeSnapshot.empty) {
    // IT'S A MATCH! Create a match document
    // Sort UIDs alphabetically to create a consistent, unique match ID
    const sortedUids = [currentUid, targetUid].sort();
    const matchId = `${sortedUids[0]}_${sortedUids[1]}`;

    const matchRef = db.collection('matches').doc(matchId);

    // Use set with merge in case it somehow already exists, though it shouldn't
    const newMatch = {
      id: matchId,
      users: [currentUid, targetUid],
      matchedAt: firestore.FieldValue.serverTimestamp(),
    };

    await matchRef.set(newMatch, { merge: true });

    // Optional: Increment mutualMatches count for both users in a batch
    const batch = db.batch();
    const user1Ref = db.collection('users').doc(currentUid);
    const user2Ref = db.collection('users').doc(targetUid);
    batch.update(user1Ref, { mutualMatches: firestore.FieldValue.increment(1) });
    batch.update(user2Ref, { mutualMatches: firestore.FieldValue.increment(1) });
    await batch.commit();

    return newMatch as unknown as MatchDocument; // Types match closely enough for return
  }

  return null;
};
