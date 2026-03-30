import {
  getFirestore,
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
} from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import type { VideoCallDocument, VideoCallStatus } from '../types/user';

const FUNCTIONS_REGION = 'asia-south1';

type StreamTokenResponse = {
  apiKey: string;
  token: string;
  userId: string;
  expiresInSeconds: number;
};

type VideoCallActionResponse = {
  callId: string;
  streamCallId?: string;
  streamCallType?: string;
  status: VideoCallStatus;
};

const db = () => getFirestore();
const functions = () => getFunctions(undefined, FUNCTIONS_REGION);

function snapshotExists(snapshot: { exists?: boolean | (() => boolean) }): boolean {
  if (typeof snapshot.exists === 'function') {
    return snapshot.exists();
  }
  return Boolean(snapshot.exists);
}

function toMillis(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }

  return 0;
}

function normalizeCallDocument(snapshot: any): VideoCallDocument | null {
  if (!snapshotExists(snapshot)) {
    return null;
  }

  const data = snapshot.data() as Omit<VideoCallDocument, 'id'> | undefined;
  if (!data) {
    return null;
  }

  return {
    ...data,
    id: snapshot.id,
  };
}

export function isVideoCallTerminalStatus(status?: VideoCallStatus | null): boolean {
  return status === 'declined' || status === 'cancelled' || status === 'ended' || status === 'missed';
}

export async function getStreamVideoToken(): Promise<StreamTokenResponse> {
  const callable = httpsCallable(functions(), 'getStreamVideoToken');
  const result = await callable({});
  return result.data as StreamTokenResponse;
}

export async function createVideoCallInvite(params: {
  matchId: string;
  calleeUid: string;
}): Promise<VideoCallActionResponse> {
  const callable = httpsCallable(functions(), 'createVideoCallInvite');
  const result = await callable(params);
  return result.data as VideoCallActionResponse;
}

export async function acceptVideoCallInvite(callId: string): Promise<VideoCallActionResponse> {
  const callable = httpsCallable(functions(), 'acceptVideoCallInvite');
  const result = await callable({ callId });
  return result.data as VideoCallActionResponse;
}

export async function declineVideoCallInvite(callId: string): Promise<VideoCallActionResponse> {
  const callable = httpsCallable(functions(), 'declineVideoCallInvite');
  const result = await callable({ callId });
  return result.data as VideoCallActionResponse;
}

export async function endVideoCall(callId: string): Promise<VideoCallActionResponse> {
  const callable = httpsCallable(functions(), 'endVideoCall');
  const result = await callable({ callId });
  return result.data as VideoCallActionResponse;
}

export function listenToVideoCall(
  callId: string,
  onUpdate: (call: VideoCallDocument | null) => void,
): () => void {
  const callRef = doc(collection(db(), 'calls'), callId);

  return onSnapshot(
    callRef,
    (snapshot) => {
      onUpdate(normalizeCallDocument(snapshot));
    },
    (error) => {
      console.error('[VideoCallService] Failed to listen to call:', error);
      onUpdate(null);
    },
  );
}

export function listenToIncomingVideoCalls(
  uid: string,
  onUpdate: (calls: VideoCallDocument[]) => void,
): () => void {
  const callsQuery = query(
    collection(db(), 'calls'),
    where('calleeUid', '==', uid),
    limit(10),
  );

  return onSnapshot(
    callsQuery,
    (snapshot) => {
      const calls = snapshot.docs
        .map((callDoc: any) => normalizeCallDocument(callDoc))
        .filter(
          (call: VideoCallDocument | null): call is VideoCallDocument =>
            call !== null && call.status === 'ringing',
        )
        .sort((a: VideoCallDocument, b: VideoCallDocument) => toMillis(b.createdAt) - toMillis(a.createdAt));

      onUpdate(calls);
    },
    (error) => {
      if ((error as { code?: string } | null)?.code === 'firestore/permission-denied') {
        console.warn(
          '[VideoCallService] Incoming-call listener was denied. Deploy firestore.rules so /calls is readable by call participants.',
        );
      } else {
        console.error('[VideoCallService] Failed to listen to incoming calls:', error);
      }
      onUpdate([]);
    },
  );
}
