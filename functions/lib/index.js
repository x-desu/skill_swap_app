"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.declineRequest = exports.acceptRequest = exports.deleteChatThread = exports.getStreamVideoToken = exports.endVideoCall = exports.declineVideoCallInvite = exports.createVideoCallInvite = exports.acceptVideoCallInvite = exports.spendCredits = exports.seedNewUserCredits = exports.revenueCatWebhook = exports.onMatchCreated = exports.onMessageCreated = exports.onLikeCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
/**
 * Trigger: onLikeCreated
 * Path: likes/{likeId}
 * Detects mutual likes and creates match documents.
 * Also sends swap_request notifications for non-mutual likes.
 * Region set to asia-south1 (Mumbai) for optimal performance in India.
 */
exports.onLikeCreated = (0, firestore_1.onDocumentCreated)({
    document: 'likes/{likeId}',
    region: 'asia-south1'
}, async (event) => {
    const likeData = event.data?.data();
    if (!likeData)
        return;
    const { fromUid, toUid, type } = likeData;
    if (type !== 'like')
        return; // Only process 'like' types, not 'pass'
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
        }
        else {
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
    }
    catch (error) {
        console.error('Error in onLikeCreated trigger:', error);
    }
});
/**
 * Helper: Create in-app notification
 */
async function createNotification(db, userId, type, title, body, data) {
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
async function sendPush(db, userId, title, body, data) {
    const userDoc = await db.collection('users').doc(userId).get();
    const pushToken = userDoc.data()?.pushToken;
    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
        console.log(`No valid push token for user ${userId}`);
        return;
    }
    try {
        await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
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
    }
    catch (error) {
        console.error(`Failed to send push to ${userId}:`, error);
    }
}
/**
 * Trigger: onMessageCreated
 * Path: matches/{matchId}/messages/{messageId}
 * Sends a push notification to the recipient of a new message.
 * Region set to asia-south1 (Mumbai) for optimal performance in India.
 */
exports.onMessageCreated = (0, firestore_1.onDocumentCreated)({
    document: 'matches/{matchId}/messages/{messageId}',
    region: 'asia-south1'
}, async (event) => {
    const messageData = event.data?.data();
    const matchId = event.params.matchId;
    if (!messageData)
        return;
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
        const recipientUid = users.find((uid) => uid !== senderUid);
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
            await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(notificationPayload),
            });
            console.log(`Push notification sent to ${recipientUid}`);
        }
        else {
            console.log(`Skipping push notification for ${recipientUid}: No valid token`);
        }
    }
    catch (error) {
        console.error('Error in onMessageCreated trigger:', error);
    }
});
/**
 * OPTIONAL: Trigger: onMatchCreated
 * Path: matches/{matchId}
 * Region set to asia-south1 (Mumbai).
 */
exports.onMatchCreated = (0, firestore_1.onDocumentCreated)({
    document: 'matches/{matchId}',
    region: 'asia-south1'
}, async (event) => {
    const matchId = event.params.matchId;
    const matchData = event.data?.data();
    if (!matchData)
        return;
    try {
        const users = matchData.users || [];
        if (users.length < 2)
            return;
        // Send notifications to both users
        for (const currentUser of users) {
            const otherUser = users.find((u) => u !== currentUser);
            if (!otherUser)
                continue;
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
                await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
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
    }
    catch (error) {
        console.error('Error in onMatchCreated trigger:', error);
    }
});
var monetization_1 = require("./monetization");
Object.defineProperty(exports, "revenueCatWebhook", { enumerable: true, get: function () { return monetization_1.revenueCatWebhook; } });
Object.defineProperty(exports, "seedNewUserCredits", { enumerable: true, get: function () { return monetization_1.seedNewUserCredits; } });
var spendCredits_1 = require("./spendCredits");
Object.defineProperty(exports, "spendCredits", { enumerable: true, get: function () { return spendCredits_1.spendCredits; } });
__exportStar(require("./payments"), exports);
var videoCalls_1 = require("./videoCalls");
Object.defineProperty(exports, "acceptVideoCallInvite", { enumerable: true, get: function () { return videoCalls_1.acceptVideoCallInvite; } });
Object.defineProperty(exports, "createVideoCallInvite", { enumerable: true, get: function () { return videoCalls_1.createVideoCallInvite; } });
Object.defineProperty(exports, "declineVideoCallInvite", { enumerable: true, get: function () { return videoCalls_1.declineVideoCallInvite; } });
Object.defineProperty(exports, "endVideoCall", { enumerable: true, get: function () { return videoCalls_1.endVideoCall; } });
Object.defineProperty(exports, "getStreamVideoToken", { enumerable: true, get: function () { return videoCalls_1.getStreamVideoToken; } });
var chatThreads_1 = require("./chatThreads");
Object.defineProperty(exports, "deleteChatThread", { enumerable: true, get: function () { return chatThreads_1.deleteChatThread; } });
var requests_1 = require("./requests");
Object.defineProperty(exports, "acceptRequest", { enumerable: true, get: function () { return requests_1.acceptRequest; } });
Object.defineProperty(exports, "declineRequest", { enumerable: true, get: function () { return requests_1.declineRequest; } });
//# sourceMappingURL=index.js.map