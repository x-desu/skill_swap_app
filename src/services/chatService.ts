import firestore from '@react-native-firebase/firestore';
import { MessageDocument } from '../types/user';

const db = firestore();

/**
 * Sends a new message in a specific match conversation.
 * Also updates the `lastMessage` and `lastMessageTime` on the Match doc.
 */
export const sendMessage = async (matchId: string, message: MessageDocument): Promise<void> => {
  const batch = db.batch();

  // 1. Add the message to the subcollection
  const messagesRef = db.collection('matches').doc(matchId).collection('messages').doc(message._id);
  batch.set(messagesRef, {
    ...message,
    // Ensure we use server timestamp for consistency, fallback to local if needed
    createdAt: firestore.FieldValue.serverTimestamp(),
  });

  // 2. Update the parent match document with the latest message snippet
  const matchRef = db.collection('matches').doc(matchId);
  batch.update(matchRef, {
    lastMessage: message.text || (message.image ? '📷 Image' : 'New message'),
    lastMessageTime: firestore.FieldValue.serverTimestamp(),
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
  return db
    .collection('matches')
    .doc(matchId)
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(50) // Basic pagination/limit
    .onSnapshot((snapshot) => {
      const messages = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          ...data,
          // Gifted Chat needs Date objects or numbers for `createdAt`
          createdAt: data.createdAt?.toDate()?.getTime() || Date.now(),
        } as MessageDocument;
      });
      onUpdate(messages);
    });
};
