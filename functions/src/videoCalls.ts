import { randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { StreamClient } from '@stream-io/node-sdk';

const REGION = 'asia-south1';
const CALL_TYPE = 'default';
const STREAM_TOKEN_VALIDITY_SECONDS = 60 * 60;

const streamApiKey = defineSecret('STREAM_API_KEY');
const streamApiSecret = defineSecret('STREAM_API_SECRET');

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

type VideoCallStatus = 'ringing' | 'accepted' | 'declined' | 'cancelled' | 'ended' | 'missed';

interface MatchData {
  users?: string[];
}

interface UserProfileData {
  displayName?: string;
  photoURL?: string | null;
}

interface CallParticipantSummary {
  uid: string;
  displayName: string;
  photoURL: string | null;
}

interface VideoCallData {
  matchId?: string;
  streamCallId?: string;
  streamCallType?: string;
  callerUid?: string;
  calleeUid?: string;
  participantUids?: string[];
  status?: VideoCallStatus;
  caller?: CallParticipantSummary;
  callee?: CallParticipantSummary;
}

function getStreamClient(): StreamClient {
  return new StreamClient(streamApiKey.value(), streamApiSecret.value());
}

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

function isTerminalStatus(status: unknown): status is Exclude<VideoCallStatus, 'ringing' | 'accepted'> {
  return status === 'declined' || status === 'cancelled' || status === 'ended' || status === 'missed';
}

async function getValidatedMatch(matchId: string, participantUid: string): Promise<string[]> {
  const matchSnap = await db.collection('matches').doc(matchId).get();

  if (!matchSnap.exists) {
    throw new HttpsError('not-found', 'Match not found');
  }

  const matchData = matchSnap.data() as MatchData | undefined;
  const users = Array.isArray(matchData?.users) ? matchData.users.filter(Boolean) : [];

  if (users.length !== 2) {
    throw new HttpsError('failed-precondition', 'Video calling currently supports one-to-one matches only');
  }

  if (!users.includes(participantUid)) {
    throw new HttpsError('permission-denied', 'You are not a participant in this match');
  }

  return users;
}

async function getUserProfileSummary(uid: string): Promise<CallParticipantSummary> {
  const userSnap = await db.collection('users').doc(uid).get();
  const data = userSnap.data() as UserProfileData | undefined;

  return {
    uid,
    displayName: data?.displayName?.trim() || 'SkillSwap User',
    photoURL: data?.photoURL || null,
  };
}

async function upsertStreamUsers(streamClient: StreamClient, users: CallParticipantSummary[]): Promise<void> {
  await streamClient.upsertUsers(
    users.map((user) => ({
      id: user.uid,
      name: user.displayName,
      image: user.photoURL || undefined,
    })),
  );
}

async function getCallSnapshotForParticipant(callId: string, uid: string) {
  const callRef = db.collection('calls').doc(callId);
  const callSnap = await callRef.get();

  if (!callSnap.exists) {
    throw new HttpsError('not-found', 'Call not found');
  }

  const callData = callSnap.data() as VideoCallData | undefined;
  const participantUids = Array.isArray(callData?.participantUids)
    ? callData.participantUids.filter(Boolean)
    : [];

  if (!participantUids.includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not a participant in this call');
  }

  return { callRef, callData };
}

async function safeEndStreamCall(streamCallId?: string): Promise<void> {
  if (!streamCallId) {
    return;
  }

  try {
    await getStreamClient().video.endCall({
      type: CALL_TYPE,
      id: streamCallId,
    });
  } catch (error) {
    console.warn('[VideoCalls] Failed to end Stream call:', streamCallId, error);
  }
}

export const getStreamVideoToken = onCall(
  { region: REGION, secrets: [streamApiKey, streamApiSecret] },
  async (request) => {
    const uid = requireAuthUid(request);
    const profile = await getUserProfileSummary(uid);
    const streamClient = getStreamClient();

    await upsertStreamUsers(streamClient, [profile]);

    const token = streamClient.generateUserToken({
      user_id: uid,
      validity_in_seconds: STREAM_TOKEN_VALIDITY_SECONDS,
    });

    return {
      apiKey: streamApiKey.value(),
      token,
      userId: uid,
      expiresInSeconds: STREAM_TOKEN_VALIDITY_SECONDS,
    };
  },
);

export const createVideoCallInvite = onCall(
  { region: REGION, secrets: [streamApiKey, streamApiSecret] },
  async (request) => {
    const callerUid = requireAuthUid(request);
    const matchId = requireString(request.data?.matchId, 'matchId');
    const requestedCalleeUid = requireString(request.data?.calleeUid, 'calleeUid');
    const participants = await getValidatedMatch(matchId, callerUid);

    if (!participants.includes(requestedCalleeUid) || requestedCalleeUid === callerUid) {
      throw new HttpsError('invalid-argument', 'calleeUid must be the other user in the match');
    }

    const callRef = db.collection('calls').doc(matchId);
    const existingCallSnap = await callRef.get();
    if (existingCallSnap.exists) {
      const existingCall = existingCallSnap.data() as VideoCallData | undefined;
      if (existingCall?.status && !isTerminalStatus(existingCall.status)) {
        throw new HttpsError('failed-precondition', 'A video call is already active for this chat');
      }
    }

    const [caller, callee] = await Promise.all([
      getUserProfileSummary(callerUid),
      getUserProfileSummary(requestedCalleeUid),
    ]);

    const streamClient = getStreamClient();
    await upsertStreamUsers(streamClient, [caller, callee]);

    const streamCallId = randomUUID();
    const streamCall = streamClient.video.call(CALL_TYPE, streamCallId);

    await streamCall.getOrCreate({
      notify: false,
      ring: false,
      video: true,
      data: {
        created_by_id: callerUid,
        video: true,
        members: [
          { user_id: callerUid },
          { user_id: requestedCalleeUid },
        ],
        custom: {
          initiated_from: 'chat',
          matchId,
        },
      },
    });

    await callRef.set({
      matchId,
      streamCallId,
      streamCallType: CALL_TYPE,
      initiatedFrom: 'chat',
      callerUid,
      calleeUid: requestedCalleeUid,
      participantUids: participants,
      caller,
      callee,
      status: 'ringing',
      endedByUid: null,
      acceptedAt: null,
      endedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      callId: callRef.id,
      streamCallId,
      streamCallType: CALL_TYPE,
      status: 'ringing' as const,
    };
  },
);

export const acceptVideoCallInvite = onCall(
  { region: REGION, secrets: [streamApiKey, streamApiSecret] },
  async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);

    if (callData?.calleeUid !== uid) {
      throw new HttpsError('permission-denied', 'Only the invited user can accept this call');
    }

    if (callData?.status === 'accepted') {
      return {
        callId,
        streamCallId: callData.streamCallId,
        streamCallType: callData.streamCallType || CALL_TYPE,
        status: 'accepted' as const,
      };
    }

    if (callData?.status !== 'ringing') {
      throw new HttpsError('failed-precondition', 'This call can no longer be accepted');
    }

    await callRef.update({
      status: 'accepted',
      acceptedAt: FieldValue.serverTimestamp(),
      endedAt: null,
      endedByUid: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      callId,
      streamCallId: callData.streamCallId,
      streamCallType: callData.streamCallType || CALL_TYPE,
      status: 'accepted' as const,
    };
  },
);

export const declineVideoCallInvite = onCall(
  { region: REGION, secrets: [streamApiKey, streamApiSecret] },
  async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);
    const currentStatus = callData?.status;

    if (currentStatus && isTerminalStatus(currentStatus)) {
      return {
        callId,
        status: currentStatus,
      };
    }

    if (currentStatus !== 'ringing') {
      throw new HttpsError('failed-precondition', 'Only ringing calls can be declined');
    }

    const nextStatus = callData?.callerUid === uid ? 'cancelled' : 'declined';

    await callRef.update({
      status: nextStatus,
      endedAt: FieldValue.serverTimestamp(),
      endedByUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await safeEndStreamCall(callData?.streamCallId);

    return {
      callId,
      status: nextStatus,
    };
  },
);

export const endVideoCall = onCall(
  { region: REGION, secrets: [streamApiKey, streamApiSecret] },
  async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);
    const currentStatus = callData?.status;

    if (currentStatus && isTerminalStatus(currentStatus)) {
      return {
        callId,
        status: currentStatus,
      };
    }

    const nextStatus =
      currentStatus === 'ringing'
        ? callData?.callerUid === uid
          ? 'cancelled'
          : 'declined'
        : 'ended';

    await callRef.update({
      status: nextStatus,
      endedAt: FieldValue.serverTimestamp(),
      endedByUid: uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    await safeEndStreamCall(callData?.streamCallId);

    return {
      callId,
      status: nextStatus,
    };
  },
);
