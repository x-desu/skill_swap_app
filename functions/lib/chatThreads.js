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
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteChatThread = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'asia-south1';
const db = admin.firestore();
function requireAuthUid(request) {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    }
    return uid;
}
function requireString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new https_1.HttpsError('invalid-argument', `${fieldName} is required`);
    }
    return value.trim();
}
function isActiveCall(status) {
    return status === 'ringing' || status === 'accepted';
}
async function deleteNotificationsForMatch(matchId) {
    const snapshot = await db
        .collection('notifications')
        .where('data.matchId', '==', matchId)
        .get();
    if (snapshot.empty) {
        return;
    }
    const docs = snapshot.docs;
    const chunkSize = 400;
    for (let index = 0; index < docs.length; index += chunkSize) {
        const chunk = docs.slice(index, index + chunkSize);
        const batch = db.batch();
        chunk.forEach((notificationDoc) => {
            batch.delete(notificationDoc.ref);
        });
        await batch.commit();
    }
}
exports.deleteChatThread = (0, https_1.onCall)({ region: REGION }, async (request) => {
    const uid = requireAuthUid(request);
    const matchId = requireString(request.data?.matchId, 'matchId');
    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Chat not found');
    }
    const matchData = matchSnap.data();
    const users = Array.isArray(matchData?.users) ? matchData.users.filter(Boolean) : [];
    if (!users.includes(uid)) {
        throw new https_1.HttpsError('permission-denied', 'You are not a participant in this chat');
    }
    const callRef = db.collection('calls').doc(matchId);
    const callSnap = await callRef.get();
    const callData = callSnap.data();
    if (callSnap.exists && isActiveCall(callData?.status)) {
        throw new https_1.HttpsError('failed-precondition', 'End the active video call before deleting this chat');
    }
    await Promise.all([
        db.recursiveDelete(matchRef),
        callSnap.exists ? callRef.delete() : Promise.resolve(),
        deleteNotificationsForMatch(matchId),
    ]);
    return {
        deleted: true,
        matchId,
    };
});
//# sourceMappingURL=chatThreads.js.map