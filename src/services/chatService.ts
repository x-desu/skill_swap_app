import {
  getFirestore,
  writeBatch,
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { MessageDocument } from '../types/user';

const db = getFirestore();
const FUNCTIONS_REGION = 'asia-south1';
const functions = () => getFunctions(undefined, FUNCTIONS_REGION);

type DeleteChatThreadResponse = {
  deleted: boolean;
  matchId: string;
};

type RequestSource = 'like' | 'swap_request';

type RequestActionResponse = {
  source: RequestSource;
  sourceId: string;
  status: 'accepted' | 'declined' | 'completed' | 'pending';
  matchId?: string;
};

function isUnauthenticatedCallableError(error: unknown): boolean {
  const maybeError = error as {
    code?: string;
    message?: string;
    details?: string;
  } | null;

  return (
    maybeError?.code === 'functions/unauthenticated' ||
    maybeError?.code === 'unauthenticated' ||
    maybeError?.message === 'UNAUTHENTICATED' ||
    maybeError?.details === 'UNAUTHENTICATED'
  );
}

async function ensureFunctionsAuthReady(forceRefresh = false): Promise<void> {
  const currentUser = getAuth().currentUser;

  if (!currentUser) {
    throw new Error('Your session is still loading. Please try again in a moment.');
  }

  await currentUser.getIdToken(forceRefresh);
}

/**
 * Sends a new message in a specific match conversation.
 * Also updates the `lastMessage` and `lastMessageTime` on the Match doc.
 */
export const sendMessage = async (matchId: string, message: MessageDocument): Promise<void> => {
  const batch = writeBatch(db);
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messagesRef = doc(collection(matchRef, 'messages'), message._id);

  // 1. Add the message to the subcollection
  batch.set(messagesRef, {
    ...message,
    // Ensure we use server timestamp for consistency, fallback to local if needed
    createdAt: serverTimestamp(),
  });

  // 2. Update the parent match document with the latest message snippet
  batch.update(matchRef, {
    lastMessage: message.text || (message.image ? '📷 Image' : 'New message'),
    lastMessageTime: serverTimestamp(),
  });

  await batch.commit();
};

/**
 * Sends an image message in a specific match conversation.
 */
export const sendImageMessage = async (
  matchId: string,
  imageUri: string,
  user: { _id: string; name: string; avatar?: string }
): Promise<void> => {
  const batch = writeBatch(db);
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messageId = Math.random().toString(36).substring(7);
  const messagesRef = doc(collection(matchRef, 'messages'), messageId);

  // 1. Add the image message to the subcollection
  batch.set(messagesRef, {
    _id: messageId,
    text: '',
    image: imageUri,
    user,
    createdAt: serverTimestamp(),
  });

  // 2. Update the parent match document
  batch.update(matchRef, {
    lastMessage: '📷 Image',
    lastMessageTime: serverTimestamp(),
  });

  await batch.commit();
};

/**
 * Real-time listener for messages in a specific match.
 * ONLY mount this when the Chat Screen is OPEN!
 */
export const listenToMessages = (
  matchId: string,
  onUpdate: (messages: MessageDocument[]) => void
) => {
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messagesQuery = query(
    collection(matchRef, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs.map((messageDoc: any) => {
        const data = messageDoc.data();
        return {
          ...data,
          // Gifted Chat needs Date objects or numbers for `createdAt`
          createdAt: data.createdAt?.toDate()?.getTime() || Date.now(),
        } as MessageDocument;
      });
      onUpdate(messages);
    }, (error) => {
      if ((error as any)?.code === 'firestore/permission-denied') {
        console.warn(
          '[ChatService] Messages listener permission denied. Verify the live Firestore rules for matches/{id}/messages.',
        );
        onUpdate([]);
        return;
      }

      console.error('[ChatService] Messages listener error:', error);
    });
};

export const deleteChatThread = async (matchId: string): Promise<DeleteChatThreadResponse> => {
  await ensureFunctionsAuthReady(false);
  const callable = httpsCallable(functions(), 'deleteChatThread');

  try {
    const result = await callable({ matchId });
    return result.data as DeleteChatThreadResponse;
  } catch (error) {
    if (!isUnauthenticatedCallableError(error)) {
      throw error;
    }

    await ensureFunctionsAuthReady(true);
    const retryResult = await callable({ matchId });
    return retryResult.data as DeleteChatThreadResponse;
  }
};

async function callRequestAction(
  name: 'acceptRequest' | 'declineRequest',
  params: { source: RequestSource; sourceId: string },
): Promise<RequestActionResponse> {
  await ensureFunctionsAuthReady(false);
  const callable = httpsCallable(functions(), name);

  try {
    const result = await callable(params);
    return result.data as RequestActionResponse;
  } catch (error) {
    if (!isUnauthenticatedCallableError(error)) {
      throw error;
    }

    await ensureFunctionsAuthReady(true);
    const retryResult = await callable(params);
    return retryResult.data as RequestActionResponse;
  }
}

export const acceptRequest = (params: {
  source: RequestSource;
  sourceId: string;
}): Promise<RequestActionResponse> => callRequestAction('acceptRequest', params);

export const declineRequest = (params: {
  source: RequestSource;
  sourceId: string;
}): Promise<RequestActionResponse> => callRequestAction('declineRequest', params);
