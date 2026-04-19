import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

admin.initializeApp();

/**
 * Trigger: onLikeCreated
 * Path: likes/{likeId}
 * Detects mutual likes and creates match documents.
 * Also sends swap_request notifications for non-mutual likes.
 * Region set to asia-south1 (Mumbai) for optimal performance in India.
 */
export const onLikeCreated = onDocumentCreated({
  document: 'likes/{likeId}',
  region: 'asia-south1'
}, async (event) => {
  const likeData = event.data?.data();
  if (!likeData) return;

  const { fromUid, toUid, type } = likeData;
  if (type !== 'like') return; // Only process 'like' types, not 'pass'

  try {
    const db = admin.firestore();

    // 1. Check for mutual like (target user already liked current user)
    const reverseLikeQuery = await db.collection('likes')
      .where('fromUid', '==', toUid)
      .where('toUid', '==', fromUid)
      .where('type', '==', 'like')
      .limit(1)
      .get();

    if (!reverseLikeQuery.empty) {
      // MUTUAL MATCH - create match document
      const sortedUids = [fromUid, toUid].sort();
      const matchId = `${sortedUids[0]}_${sortedUids[1]}`;
      const matchRef = db.collection('matches').doc(matchId);

      // Check if match already exists (idempotent)
      const matchSnap = await matchRef.get();
      if (matchSnap.exists) {
        console.log(`Match ${matchId} already exists, skipping creation`);
        return;
      }

      // Create match document
      await matchRef.set({
        id: matchId,
        users: [fromUid, toUid],
        matchedAt: admin.firestore.FieldValue.serverTimestamp(),
        isBlocked: false,
      });

      console.log(`Match ${matchId} created between ${fromUid} and ${toUid}`);

      // Increment mutualMatches counter for both users
      const batch = db.batch();
      batch.update(db.collection('users').doc(fromUid), {
        mutualMatches: admin.firestore.FieldValue.increment(1)
      });
      batch.update(db.collection('users').doc(toUid), {
        mutualMatches: admin.firestore.FieldValue.increment(1)
      });
      await batch.commit();

      // Get user names for notifications
      const [fromUserDoc, toUserDoc] = await Promise.all([
        db.collection('users').doc(fromUid).get(),
        db.collection('users').doc(toUid).get()
      ]);

      const fromUserName = fromUserDoc.data()?.displayName || 'Someone';
      const fromUserPhotoURL = fromUserDoc.data()?.photoURL || '';
      const toUserName = toUserDoc.data()?.displayName || 'Someone';
      const toUserPhotoURL = toUserDoc.data()?.photoURL || '';

      // Send notifications to both users
      await Promise.all([
        // Notify the 'to' user (they received the second like that completed the match)
        createNotification(db, toUid, 'new_match', "It's a Match!", `You and ${fromUserName} are ready to swap skills!`, {
          matchId,
          targetUid: fromUid,
          targetName: fromUserName,
          targetPhotoURL: fromUserPhotoURL
        }),
        // Notify the 'from' user (they sent the second like)
        createNotification(db, fromUid, 'new_match', "It's a Match!", `You and ${toUserName} are ready to swap skills!`, {
          matchId,
          targetUid: toUid,
          targetName: toUserName,
          targetPhotoURL: toUserPhotoURL
        })
      ]);

      // Send push notifications
      await Promise.all([
        sendPush(db, toUid, "It's a Match!", `You matched with ${fromUserName}!`, {
          matchId,
          targetUid: fromUid,
          targetName: fromUserName,
          targetPhotoURL: fromUserPhotoURL,
          type: 'match'
        }),
        sendPush(db, fromUid, "It's a Match!", `You matched with ${toUserName}!`, {
          matchId,
          targetUid: toUid,
          targetName: toUserName,
          targetPhotoURL: toUserPhotoURL,
          type: 'match'
        })
      ]);

    } else {
      // NO MUTUAL MATCH - send swap_request notification to target user
      const fromUserDoc = await db.collection('users').doc(fromUid).get();
      const fromUserName = fromUserDoc.data()?.displayName || 'Someone';

      await createNotification(db, toUid, 'swap_request', 'New Swap Request!', `${fromUserName} wants to swap skills with you.`, {
        senderId: fromUid,
        senderName: fromUserName
      });

      await sendPush(db, toUid, 'New Swap Request!', `${fromUserName} wants to swap skills with you.`, {
        type: 'swap_request',
        senderId: fromUid
      });
    }
  } catch (error) {
    console.error('Error in onLikeCreated trigger:', error);
  }
});

/**
 * Helper: Create in-app notification
 */
async function createNotification(
  db: admin.firestore.Firestore,
  userId: string,
  type: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<void> {
  await db.collection('notifications').add({
    userId,
    type,
    title,
    body,
    read: false,
    data,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  console.log(`In-app notification created for ${userId}: ${type}`);
}

/**
 * Helper: Send push notification via Expo
 */
async function sendPush(
  db: admin.firestore.Firestore,
  userId: string,
  title: string,
  body: string,
  data: Record<string, any>
): Promise<void> {
  const userDoc = await db.collection('users').doc(userId).get();
  const pushToken = userDoc.data()?.pushToken;

  if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
    console.log(`No valid push token for user ${userId}`);
    return;
  }

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data
      })
    });
    console.log(`Push notification sent to ${userId}`);
  } catch (error) {
    console.error(`Failed to send push to ${userId}:`, error);
  }
}

/**
 * Trigger: onMessageCreated
 * Path: matches/{matchId}/messages/{messageId}
 * Sends a push notification to the recipient of a new message.
 * Region set to asia-south1 (Mumbai) for optimal performance in India.
 */
export const onMessageCreated = onDocumentCreated({
  document: 'matches/{matchId}/messages/{messageId}',
  region: 'asia-south1'
}, async (event) => {
  const messageData = event.data?.data();
  const matchId = event.params.matchId;

  if (!messageData) return;

  try {
    // 1. Get the match document to find the recipient
    const matchRef = admin.firestore().collection('matches').doc(matchId);
    const matchDoc = await matchRef.get();
    
    if (!matchDoc.exists) {
      console.warn(`Match ${matchId} not found`);
      return;
    }

    const matchData = matchDoc.data();
    const users = matchData?.users || [];
    const senderUid = messageData?.user?._id;
    
    // Find the recipient UID (the other user in the 'users' array)
    const recipientUid = users.find((uid: string) => uid !== senderUid);

    if (!recipientUid) {
      console.warn('Recipient UID not found for match:', matchId);
      return;
    }

    // 2. Get the recipient's push token from the 'users' collection
    const userRef = admin.firestore().collection('users').doc(recipientUid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.warn(`User ${recipientUid} not found`);
      return;
    }

    const userData = userDoc.data();
    const pushToken = userData?.pushToken;
    const senderName = messageData?.user?.name || 'Someone';
    const senderPhotoURL = messageData?.user?.avatar || '';

    // 3. Always create in-app notification document in the root 'notifications' collection
    await admin.firestore().collection('notifications').add({
      userId: recipientUid,
      type: 'new_message',
      title: `New message from ${senderName}`,
      body: messageData.text || '📷 Sent an image',
      read: false,
      data: {
        matchId: matchId,
        targetUid: senderUid,
        targetName: senderName,
        targetPhotoURL: senderPhotoURL,
        senderId: senderUid,
        senderName: senderName,
        senderPhotoURL: senderPhotoURL
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`In-app notification saved for ${recipientUid}`);

    // 4. Optionally send push notification via Expo Push API
    if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
      const notificationPayload = {
        to: pushToken,
        sound: 'default',
        title: `New message from ${senderName}`,
        body: messageData.text || '📷 Sent an image',
        data: {
          matchId: matchId,
          targetUid: senderUid,
          targetName: senderName,
          targetPhotoURL: senderPhotoURL,
          senderId: senderUid,
          senderName: senderName,
          senderPhotoURL: senderPhotoURL,
          type: 'message'
        },
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      });
      console.log(`Push notification sent to ${recipientUid}`);
    } else {
      console.log(`Skipping push notification for ${recipientUid}: No valid token`);
    }

  } catch (error) {
    console.error('Error in onMessageCreated trigger:', error);
  }
});

/**
 * OPTIONAL: Trigger: onMatchCreated
 * Path: matches/{matchId}
 * Region set to asia-south1 (Mumbai).
 */
export const onMatchCreated = onDocumentCreated({
  document: 'matches/{matchId}',
  region: 'asia-south1'
}, async (event) => {
  const matchId = event.params.matchId;
  const matchData = event.data?.data();
  if (!matchData) return;

  try {
    const users = matchData.users || [];
    if (users.length < 2) return;

    // Send notifications to both users
    for (const currentUser of users) {
      const otherUser = users.find((u: string) => u !== currentUser);
      if (!otherUser) continue;

      // 1. Get other user's name
      const otherUserDoc = await admin.firestore().collection('users').doc(otherUser).get();
      const otherUserData = otherUserDoc.data();
      const otherUserName = otherUserData?.displayName || 'Someone';
      const otherUserPhotoURL = otherUserData?.photoURL || '';

      // 2. Save in-app notification
      await admin.firestore().collection('notifications').add({
        userId: currentUser,
        type: 'new_match',
        title: "It's a Match!",
        body: `You and ${otherUserName} are ready to swap skills!`,
        read: false,
        data: {
          matchId: matchId,
          targetUid: otherUser,
          targetName: otherUserName,
          targetPhotoURL: otherUserPhotoURL
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Optional: Send push notification if token exists
      const currentUserDoc = await admin.firestore().collection('users').doc(currentUser).get();
      const currentUserData = currentUserDoc.data();
      const pushToken = currentUserData?.pushToken;

      if (pushToken && pushToken.startsWith('ExponentPushToken[')) {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: pushToken,
            sound: 'default',
            title: "It's a Match!",
            body: `You matched with ${otherUserName}!`,
            data: {
              matchId,
              targetUid: otherUser,
              targetName: otherUserName,
              targetPhotoURL: otherUserPhotoURL,
              type: 'match'
            }
          }),
        });
      }
    }
  } catch (error) {
    console.error('Error in onMatchCreated trigger:', error);
  }
});

export { revenueCatWebhook, seedNewUserCredits } from "./monetization";
export { spendCredits } from "./spendCredits";
export * from './payments';
export {
  acceptVideoCallInvite,
  createVideoCallInvite,
  declineVideoCallInvite,
  endVideoCall,
  getStreamVideoToken,
} from './videoCalls';
export { validateUserProfile } from './userValidation';
export { deleteChatThread } from './chatThreads';
export { acceptRequest, declineRequest } from './requests';
