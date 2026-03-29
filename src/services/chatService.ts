import { 
  getFirestore,
  collection, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  serverTimestamp,
  getDocs,
  startAfter,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove
} from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { MessageDocument } from '../types/user';

const db = () => getFirestore();

/**
 * Sends a new message in a specific match conversation.
 * Optimized for horizontal scaling and low latency by using batch writes.
 */
export const sendMessage = async (
  matchId: string, 
  message: MessageDocument, 
  recipientUid: string
): Promise<void> => {
  try {
    console.log('[ChatService] Sending message to:', recipientUid, 'match:', matchId);
    const batch = writeBatch(db());

    // 1. Add the message to the subcollection
    const messagesRef = doc(db(), 'matches', matchId, 'messages', message._id);
    
    batch.set(messagesRef, {
      ...message,
      createdAt: serverTimestamp(),
      status: 'sent',
      deliveredTo: [],
      readBy: [],
    });

    // 2. Update the parent match document with the latest message snippet and unread count
    const matchRef = doc(db(), 'matches', matchId);
    batch.set(matchRef, {
      lastMessage: message.text || (message.image ? '📷 Image' : 'New message'),
      lastMessageTime: serverTimestamp(),
      lastMessageSender: message.user._id,
      unreadCount: { 
        [recipientUid]: increment(1) 
      },
    }, { merge: true });

    // Note: Notifications are created by Cloud Function onMessageCreated trigger
    // Do not add notification creation here - client is not allowed per SRS

    await batch.commit();
    console.log('[ChatService] Message sent successfully');
  } catch (error) {
    console.error('[ChatService] Error sending message:', error);
    throw error;
  }
};

/**
 * Marks all messages in a match as read for the current user.
 * Resets the unread count for the current user.
 */
export const markMatchAsRead = async (
  matchId: string, 
  currentUid: string
): Promise<void> => {
  try {
    const matchRef = doc(db(), 'matches', matchId);
    // Check existence first to avoid firestore/not-found error
    const snap = await getDoc(matchRef);
    if (!snap.exists) return;

    await updateDoc(matchRef, {
      [`unreadCount.${currentUid}`]: 0,
    });
  } catch (error) {
    console.warn('[ChatService] markMatchAsRead failed:', error);
  }
};

/**
 * Marks a specific message as read by the current user.
 * Updates the readBy array and status.
 */
export const markMessageAsRead = async (
  matchId: string,
  messageId: string,
  currentUid: string
): Promise<void> => {
  try {
    const messageRef = doc(db(), 'matches', matchId, 'messages', messageId);
    const snap = await getDoc(messageRef);
    if (!snap.exists) return; // Silent return if message was deleted
    
    await updateDoc(messageRef, {
      readBy: arrayUnion(currentUid),
      status: 'read',
    });
  } catch (error) {
    console.warn('[ChatService] markMessageAsRead failed:', error);
  }
};

/**
 * Marks a specific message as delivered to a user.
 */
export const markMessageAsDelivered = async (
  matchId: string,
  messageId: string,
  userUid: string
): Promise<void> => {
  try {
    const messageRef = doc(db(), 'matches', matchId, 'messages', messageId);
    const snap = await getDoc(messageRef);
    if (!snap.exists) return;
    
    await updateDoc(messageRef, {
      deliveredTo: arrayUnion(userUid),
      status: 'delivered',
    });
  } catch (error) {
    console.warn('[ChatService] markMessageAsDelivered failed:', error);
  }
};

/**
 * Updates the typing status for a user in a match.
 * Typing status auto-expires after 3 seconds of inactivity.
 */
export const updateTypingStatus = async (
  matchId: string,
  userUid: string,
  isTyping: boolean
): Promise<void> => {
  try {
    const matchRef = doc(db(), 'matches', matchId);
    const snap = await getDoc(matchRef);
    if (!snap.exists) return;

    await updateDoc(matchRef, {
      [`typingStatus.${userUid}`]: isTyping,
      typingUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('[ChatService] updateTypingStatus failed (match might not exist):', error);
  }
};

/**
 * Real-time listener for typing status in a match.
 * Returns an unsubscribe function.
 */
export const subscribeToTypingStatus = (
  matchId: string,
  onUpdate: (typingStatus: { [uid: string]: boolean }) => void
) => {
  const matchRef = doc(db(), 'matches', matchId);
  
  return onSnapshot(matchRef, (snapshot) => {
    if (!snapshot.exists) {
      onUpdate({});
      return;
    }
    const data = snapshot.data();
    // Check if typing status is stale (older than 5 seconds)
    const typingUpdatedAt = data?.typingUpdatedAt?.toDate();
    const isStale = typingUpdatedAt && (Date.now() - typingUpdatedAt.getTime() > 5000);
    
    if (isStale) {
      onUpdate({});
    } else {
      onUpdate(data?.typingStatus || {});
    }
  });
};

/**
 * Real-time listener for messages in a specific match.
 * Returns an unsubscribe function.
 */
export const subscribeToMessages = (
  matchId: string,
  onUpdate: (messages: MessageDocument[]) => void
) => {
  const q = query(
    collection(db(), 'matches', matchId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((docSnapshot: any) => {
      const data = docSnapshot.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate()?.getTime() || Date.now(),
      } as MessageDocument;
    });
    
    onUpdate(messages);
  });
};

/**
 * Load more (older) messages for pagination.
 * Returns older messages before the given timestamp.
 */
export const loadMoreMessages = async (
  matchId: string,
  beforeTimestamp: number,
  limitCount: number = 20
): Promise<MessageDocument[]> => {
  const beforeDate = new Date(beforeTimestamp);
  
  const q = query(
    collection(db(), 'matches', matchId, 'messages'),
    orderBy('createdAt', 'desc'),
    startAfter(beforeDate),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnapshot: any) => {
    const data = docSnapshot.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate()?.getTime() || Date.now(),
    } as MessageDocument;
  });
};

/**
 * Upload an image to Firebase Storage and send as a message.
 * Returns the download URL of the uploaded image.
 */
export const sendImageMessage = async (
  matchId: string,
  imageUri: string,
  senderUid: string,
  senderName: string,
  recipientUid: string,
  senderAvatar?: string
): Promise<string> => {
  // Generate a unique filename
  const filename = `${matchId}_${Date.now()}.jpg`;
  const storageRef = storage().ref(`chat-images/${matchId}/${filename}`);
  
  // Upload the image
  await storageRef.putFile(imageUri);
  
  // Get the download URL
  const downloadUrl = await storageRef.getDownloadURL();
  
  // Send message with image
  const batch = writeBatch(db());
  const messageId = crypto.randomUUID();
  const messagesRef = doc(db(), 'matches', matchId, 'messages', messageId);
  
  batch.set(messagesRef, {
    _id: messageId,
    text: '',
    image: downloadUrl,
    createdAt: serverTimestamp(),
    user: {
      _id: senderUid,
      name: senderName,
      avatar: senderAvatar,
    },
    status: 'sent',
    deliveredTo: [],
    readBy: [],
  });
  
  // Update match document
  const matchRef = doc(db(), 'matches', matchId);
  batch.set(matchRef, {
    lastMessage: '📷 Image',
    lastMessageTime: serverTimestamp(),
    lastMessageSender: senderUid,
    unreadCount: {
      [recipientUid]: increment(1)
    },
  }, { merge: true });
  
  // Note: Notifications are created by Cloud Function onMessageCreated trigger
  // Do not add notification creation here - client is not allowed per SRS
  
  await batch.commit();
  
  return downloadUrl;
};

/**
 * Toggle an emoji reaction on a message.
 * Adds the reaction if user hasn't reacted, removes if they have.
 */
export const toggleReaction = async (
  matchId: string,
  messageId: string,
  emoji: string,
  userUid: string
): Promise<void> => {
  const messageRef = doc(db(), 'matches', matchId, 'messages', messageId);
  const messageSnap = await getDoc(messageRef);
  
  if (!messageSnap.exists) {
    throw new Error('Message not found');
  }
  
  const data = messageSnap.data() as MessageDocument;
  const reactions = data.reactions || {};
  const usersWhoReacted = reactions[emoji] || [];
  
  if (usersWhoReacted.includes(userUid)) {
    // User already reacted - remove their reaction
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayRemove(userUid),
    });
  } else {
    // User hasn't reacted - add their reaction
    await updateDoc(messageRef, {
      [`reactions.${emoji}`]: arrayUnion(userUid),
    });
  }
};
