import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

const REGION = 'asia-south1';
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

type RequestSource = 'like' | 'swap_request';
type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed';

type LikeData = {
  fromUid?: string;
  toUid?: string;
  type?: 'like' | 'pass';
};

type SwapRequestData = {
  fromUid?: string;
  toUid?: string;
  status?: SwapStatus;
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

function requireRequestSource(value: unknown): RequestSource {
  if (value === 'like' || value === 'swap_request') {
    return value;
  }
  throw new HttpsError('invalid-argument', 'source must be "like" or "swap_request"');
}

function getMatchId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

async function ensureMatchExists(uidA: string, uidB: string): Promise<string> {
  const matchId = getMatchId(uidA, uidB);
  const matchRef = db.collection('matches').doc(matchId);
  const matchSnap = await matchRef.get();

  if (!matchSnap.exists) {
    await matchRef.set({
      id: matchId,
      users: [uidA, uidB],
      matchedAt: FieldValue.serverTimestamp(),
      isBlocked: false,
    });
  }

  return matchId;
}

async function acceptLikeRequest(uid: string, likeId: string) {
  const likeRef = db.collection('likes').doc(likeId);
  const likeSnap = await likeRef.get();

  if (!likeSnap.exists) {
    throw new HttpsError('not-found', 'Request not found');
  }

  const likeData = likeSnap.data() as LikeData | undefined;
  const fromUid = likeData?.fromUid;
  const toUid = likeData?.toUid;

  if (!fromUid || !toUid || likeData?.type !== 'like') {
    throw new HttpsError('failed-precondition', 'This request is invalid');
  }

  if (toUid !== uid) {
    throw new HttpsError('permission-denied', 'Only the receiving user can accept this request');
  }

  const reverseLikeQuery = await db
    .collection('likes')
    .where('fromUid', '==', uid)
    .where('toUid', '==', fromUid)
    .where('type', '==', 'like')
    .limit(1)
    .get();

  if (reverseLikeQuery.empty) {
    await db.collection('likes').add({
      fromUid: uid,
      toUid: fromUid,
      type: 'like',
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  const matchId = getMatchId(uid, fromUid);

  return {
    source: 'like' as const,
    sourceId: likeId,
    status: 'accepted' as const,
    matchId,
  };
}

async function declineLikeRequest(uid: string, likeId: string) {
  const likeRef = db.collection('likes').doc(likeId);
  const likeSnap = await likeRef.get();

  if (!likeSnap.exists) {
    return {
      source: 'like' as const,
      sourceId: likeId,
      status: 'declined' as const,
    };
  }

  const likeData = likeSnap.data() as LikeData | undefined;

  if (likeData?.toUid !== uid || likeData?.type !== 'like') {
    throw new HttpsError('permission-denied', 'Only the receiving user can decline this request');
  }

  await likeRef.delete();

  return {
    source: 'like' as const,
    sourceId: likeId,
    status: 'declined' as const,
  };
}

async function acceptSwapRequest(uid: string, requestId: string) {
  const requestRef = db.collection('swapRequests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    throw new HttpsError('not-found', 'Request not found');
  }

  const requestData = requestSnap.data() as SwapRequestData | undefined;
  const fromUid = requestData?.fromUid;
  const toUid = requestData?.toUid;

  if (!fromUid || !toUid || !requestData?.status) {
    throw new HttpsError('failed-precondition', 'This request is invalid');
  }

  if (toUid !== uid) {
    throw new HttpsError('permission-denied', 'Only the receiving user can accept this request');
  }

  if (requestData.status === 'accepted') {
    return {
      source: 'swap_request' as const,
      sourceId: requestId,
      status: 'accepted' as const,
      matchId: getMatchId(fromUid, toUid),
    };
  }

  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Only pending requests can be accepted');
  }

  await requestRef.update({
    status: 'accepted',
    updatedAt: FieldValue.serverTimestamp(),
  });

  const matchId = await ensureMatchExists(fromUid, toUid);

  return {
    source: 'swap_request' as const,
    sourceId: requestId,
    status: 'accepted' as const,
    matchId,
  };
}

async function declineSwapRequest(uid: string, requestId: string) {
  const requestRef = db.collection('swapRequests').doc(requestId);
  const requestSnap = await requestRef.get();

  if (!requestSnap.exists) {
    return {
      source: 'swap_request' as const,
      sourceId: requestId,
      status: 'declined' as const,
    };
  }

  const requestData = requestSnap.data() as SwapRequestData | undefined;

  if (requestData?.toUid !== uid) {
    throw new HttpsError('permission-denied', 'Only the receiving user can decline this request');
  }

  if (requestData.status !== 'pending') {
    return {
      source: 'swap_request' as const,
      sourceId: requestId,
      status: requestData.status || 'declined',
    };
  }

  await requestRef.update({
    status: 'declined',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    source: 'swap_request' as const,
    sourceId: requestId,
    status: 'declined' as const,
  };
}

export const acceptRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireAuthUid(request);
  const source = requireRequestSource(request.data?.source);
  const sourceId = requireString(request.data?.sourceId, 'sourceId');

  if (source === 'like') {
    return acceptLikeRequest(uid, sourceId);
  }

  return acceptSwapRequest(uid, sourceId);
});

export const declineRequest = onCall({ region: REGION }, async (request) => {
  const uid = requireAuthUid(request);
  const source = requireRequestSource(request.data?.source);
  const sourceId = requireString(request.data?.sourceId, 'sourceId');

  if (source === 'like') {
    return declineLikeRequest(uid, sourceId);
  }

  return declineSwapRequest(uid, sourceId);
});
