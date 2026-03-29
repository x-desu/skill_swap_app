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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMatchCreated = exports.onMessageCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const node_fetch_1 = __importDefault(require("node-fetch"));
admin.initializeApp();
/**
 * Trigger: onMessageCreated
 * Path: matches/{matchId}/messages/{messageId}
 * Sends a push notification to the recipient of a new message.
 */
exports.onMessageCreated = functions.firestore
    .document('matches/{matchId}/messages/{messageId}')
    .onCreate(async (snapshot, context) => {
    var _a, _b;
    const messageData = snapshot.data();
    const matchId = context.params.matchId;
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
        const users = (matchData === null || matchData === void 0 ? void 0 : matchData.users) || [];
        const senderUid = (_a = messageData === null || messageData === void 0 ? void 0 : messageData.user) === null || _a === void 0 ? void 0 : _a._id;
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
        const pushToken = userData === null || userData === void 0 ? void 0 : userData.pushToken;
        if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
            console.log(`No valid push token for user ${recipientUid}`);
            return;
        }
        // 3. Prepare the notification payload
        const senderName = ((_b = messageData === null || messageData === void 0 ? void 0 : messageData.user) === null || _b === void 0 ? void 0 : _b.name) || 'Someone';
        const notificationPayload = {
            to: pushToken,
            sound: 'default',
            title: `New message from ${senderName}`,
            body: messageData.text || '📷 Sent an image',
            data: {
                matchId: matchId,
                targetUid: senderUid,
                type: 'message'
            },
        };
        // 4. Send the notification via Expo Push API
        const response = await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(notificationPayload),
        });
        const result = await response.json();
        console.log(`Notification sent to ${recipientUid}:`, result);
    }
    catch (error) {
        console.error('Error in onMessageCreated trigger:', error);
    }
});
/**
 * OPTIONAL: Trigger: onMatchCreated
 * Path: matches/{matchId}
 */
exports.onMatchCreated = functions.firestore
    .document('matches/{matchId}')
    .onCreate(async (snapshot, context) => {
    // Similar logic for potential match notifications
    console.log('Match created alert trigger (stub)');
});
//# sourceMappingURL=index.js.map