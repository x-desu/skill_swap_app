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
import { MessageDocument } from '../types/user';

const db = getFirestore();

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
