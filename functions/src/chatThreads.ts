import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'asia-south1';
const db = admin.firestore();

type MatchData = {
  users?: string[];
};

type CallData = {
  status?: 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended' | 'missed';
};

function requireAuthUid(request: { auth?: { uid?: string } | null }): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  return uid;
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpsError('invalid-argument', `${fieldName} is required`);
  }
  return value.trim();
}

function isActiveCall(status: CallData['status']): boolean {
  return status === 'ringing' || status === 'accepted';
}

async function deleteNotificationsForMatch(matchId: string): Promise<void> {
  const snapshot = await db
    .collection('notifications')
    .where('data.matchId', '==', matchId)
    .get();

  if (snapshot.empty) {
    return;
  }

  const docs = snapshot.docs;
  const chunkSize = 400;

  for (let index = 0; index < docs.length; index += chunkSize) {
    const chunk = docs.slice(index, index + chunkSize);
    const batch = db.batch();

    chunk.forEach((notificationDoc) => {
      batch.delete(notificationDoc.ref);
    });

    await batch.commit();
  }
}

export const deleteChatThread = onCall({ region: REGION }, async (request) => {
  const uid = requireAuthUid(request);
  const matchId = requireString(request.data?.matchId, 'matchId');

  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    throw new HttpsError('not-found', 'Chat not found');
  }

  const matchData = matchSnap.data() as MatchData | undefined;
  const users = Array.isArray(matchData?.users) ? matchData.users.filter(Boolean) : [];

  if (!users.includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not a participant in this chat');
  }

  const callRef = db.collection('calls').doc(matchId);
  const callSnap = await callRef.get();
  const callData = callSnap.data() as CallData | undefined;

  if (callSnap.exists && isActiveCall(callData?.status)) {
    throw new HttpsError(
      'failed-precondition',
      'End the active video call before deleting this chat',
    );
  }

  await Promise.all([
    db.recursiveDelete(matchRef),
    callSnap.exists ? callRef.delete() : Promise.resolve(),
    deleteNotificationsForMatch(matchId),
  ]);

  return {
    deleted: true,
    matchId,
  };
});
