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
  deleteDoc,
  updateDoc,
  arrayUnion,
} from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { getStorage, ref, deleteObject } from '@react-native-firebase/storage';
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

function normalizeMessageDocument(
  messageId: string,
  rawMessage: Partial<MessageDocument> & {
    createdAt?: { toDate?: () => Date } | number | Date | null;
    user?: Partial<MessageDocument['user']> | null;
  },
): MessageDocument {
  const createdAtValue = rawMessage.createdAt;
  const createdAt =
    typeof createdAtValue === 'number'
      ? createdAtValue
      : createdAtValue instanceof Date
        ? createdAtValue.getTime()
        : typeof createdAtValue?.toDate === 'function'
          ? createdAtValue.toDate().getTime()
          : Date.now();

  const normalizedUserId =
    typeof rawMessage.user?._id === 'string' && rawMessage.user._id.trim()
      ? rawMessage.user._id
      : 'unknown-user';

  return {
    _id:
      typeof rawMessage._id === 'string' && rawMessage._id.trim()
        ? rawMessage._id
        : messageId,
    text: typeof rawMessage.text === 'string' ? rawMessage.text : '',
    createdAt,
    user: {
      _id: normalizedUserId,
      name:
        typeof rawMessage.user?.name === 'string' && rawMessage.user.name.trim()
          ? rawMessage.user.name
          : 'SkillSwap User',
      avatar:
        typeof rawMessage.user?.avatar === 'string' && rawMessage.user.avatar.trim()
          ? rawMessage.user.avatar
          : undefined,
    },
    image: typeof rawMessage.image === 'string' ? rawMessage.image : undefined,
    video: typeof rawMessage.video === 'string' ? rawMessage.video : undefined,
    audio: typeof rawMessage.audio === 'string' ? rawMessage.audio : undefined,
    system: Boolean(rawMessage.system),
    sent: Boolean(rawMessage.sent),
    received: Boolean(rawMessage.received),
    pending: Boolean(rawMessage.pending),
    // Preserve the deletedFor array so the caller can filter
    deletedFor: Array.isArray(rawMessage.deletedFor) ? (rawMessage.deletedFor as string[]) : [],
  };
}

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
  imageUrl: string,
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
    image: imageUrl,
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
 * Automatically filters out messages that have been "deleted for me" by
 * the given userId (stored in the Firestore `deletedFor` array field).
 * ONLY mount this when the Chat Screen is OPEN!
 */
export const listenToMessages = (
  matchId: string,
  onUpdate: (messages: MessageDocument[]) => void,
  currentUserId?: string,
) => {
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messagesQuery = query(
    collection(matchRef, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );

  return onSnapshot(messagesQuery, (snapshot) => {
      const messages = snapshot.docs
        .map((messageDoc: any) =>
          normalizeMessageDocument(messageDoc.id, messageDoc.data())
        )
        // Filter out messages this user soft-deleted
        .filter((m) => !currentUserId || !(m.deletedFor ?? []).includes(currentUserId));

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

/**
 * Permanently deletes a single message document from Firestore for all participants.
 * If the message contained an image uploaded to Firebase Storage under
 * `matches/{matchId}/messages/…`, that object is also deleted.
 *
 * Call this only for the current user's own messages.
 */
export const deleteMessageForEveryone = async (
  matchId: string,
  messageId: string,
  imageUrl?: string,
): Promise<void> => {
  // 1. Delete the Firestore message document
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messageRef = doc(collection(matchRef, 'messages'), messageId);
  await deleteDoc(messageRef);

  // 2. If there's an associated Storage image, try to remove it
  if (imageUrl) {
    try {
      // Only delete if the URL belongs to our own Firebase Storage bucket
      if (imageUrl.includes('firebasestorage.googleapis.com') && imageUrl.includes(`matches%2F${matchId}`)) {
        const storageRef = ref(getStorage(), `matches/${matchId}/messages/${messageId}`);
        await deleteObject(storageRef);
      }
    } catch {
      // Object may already be gone — safe to swallow
    }
  }
};

/**
 * Soft-deletes a message for the current user only.
 * Adds the user's UID to the message's `deletedFor` array in Firestore.
 * The next listener snapshot will automatically exclude this message
 * for this user, and the message remains visible for the other participant.
 */
export const deleteMessageForMe = async (
  matchId: string,
  messageId: string,
  userId: string,
): Promise<void> => {
  const matchRef = doc(collection(db, 'matches'), matchId);
  const messageRef = doc(collection(matchRef, 'messages'), messageId);
  await updateDoc(messageRef, {
    deletedFor: arrayUnion(userId),
  });
};
