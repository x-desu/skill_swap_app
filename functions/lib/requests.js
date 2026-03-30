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
exports.declineRequest = exports.acceptRequest = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const REGION = 'asia-south1';
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
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
function requireRequestSource(value) {
    if (value === 'like' || value === 'swap_request') {
        return value;
    }
    throw new https_1.HttpsError('invalid-argument', 'source must be "like" or "swap_request"');
}
function getMatchId(uidA, uidB) {
    return [uidA, uidB].sort().join('_');
}
async function ensureMatchExists(uidA, uidB) {
    const matchId = getMatchId(uidA, uidB);
    const matchRef = db.collection('matches').doc(matchId);
    const matchSnap = await matchRef.get();
    if (!matchSnap.exists) {
        await matchRef.set({
            id: matchId,
            users: [uidA, uidB],
            matchedAt: FieldValue.serverTimestamp(),
            isBlocked: false,
        });
    }
    return matchId;
}
async function acceptLikeRequest(uid, likeId) {
    const likeRef = db.collection('likes').doc(likeId);
    const likeSnap = await likeRef.get();
    if (!likeSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Request not found');
    }
    const likeData = likeSnap.data();
    const fromUid = likeData?.fromUid;
    const toUid = likeData?.toUid;
    if (!fromUid || !toUid || likeData?.type !== 'like') {
        throw new https_1.HttpsError('failed-precondition', 'This request is invalid');
    }
    if (toUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the receiving user can accept this request');
    }
    const reverseLikeQuery = await db
        .collection('likes')
        .where('fromUid', '==', uid)
        .where('toUid', '==', fromUid)
        .where('type', '==', 'like')
        .limit(1)
        .get();
    if (reverseLikeQuery.empty) {
        await db.collection('likes').add({
            fromUid: uid,
            toUid: fromUid,
            type: 'like',
            createdAt: FieldValue.serverTimestamp(),
        });
    }
    const matchId = getMatchId(uid, fromUid);
    return {
        source: 'like',
        sourceId: likeId,
        status: 'accepted',
        matchId,
    };
}
async function declineLikeRequest(uid, likeId) {
    const likeRef = db.collection('likes').doc(likeId);
    const likeSnap = await likeRef.get();
    if (!likeSnap.exists) {
        return {
            source: 'like',
            sourceId: likeId,
            status: 'declined',
        };
    }
    const likeData = likeSnap.data();
    if (likeData?.toUid !== uid || likeData?.type !== 'like') {
        throw new https_1.HttpsError('permission-denied', 'Only the receiving user can decline this request');
    }
    await likeRef.delete();
    return {
        source: 'like',
        sourceId: likeId,
        status: 'declined',
    };
}
async function acceptSwapRequest(uid, requestId) {
    const requestRef = db.collection('swapRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Request not found');
    }
    const requestData = requestSnap.data();
    const fromUid = requestData?.fromUid;
    const toUid = requestData?.toUid;
    if (!fromUid || !toUid || !requestData?.status) {
        throw new https_1.HttpsError('failed-precondition', 'This request is invalid');
    }
    if (toUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the receiving user can accept this request');
    }
    if (requestData.status === 'accepted') {
        return {
            source: 'swap_request',
            sourceId: requestId,
            status: 'accepted',
            matchId: getMatchId(fromUid, toUid),
        };
    }
    if (requestData.status !== 'pending') {
        throw new https_1.HttpsError('failed-precondition', 'Only pending requests can be accepted');
    }
    await requestRef.update({
        status: 'accepted',
        updatedAt: FieldValue.serverTimestamp(),
    });
    const matchId = await ensureMatchExists(fromUid, toUid);
    return {
        source: 'swap_request',
        sourceId: requestId,
        status: 'accepted',
        matchId,
    };
}
async function declineSwapRequest(uid, requestId) {
    const requestRef = db.collection('swapRequests').doc(requestId);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
        return {
            source: 'swap_request',
            sourceId: requestId,
            status: 'declined',
        };
    }
    const requestData = requestSnap.data();
    if (requestData?.toUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the receiving user can decline this request');
    }
    if (requestData.status !== 'pending') {
        return {
            source: 'swap_request',
            sourceId: requestId,
            status: requestData.status || 'declined',
        };
    }
    await requestRef.update({
        status: 'declined',
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        source: 'swap_request',
        sourceId: requestId,
        status: 'declined',
    };
}
exports.acceptRequest = (0, https_1.onCall)({ region: REGION }, async (request) => {
    const uid = requireAuthUid(request);
    const source = requireRequestSource(request.data?.source);
    const sourceId = requireString(request.data?.sourceId, 'sourceId');
    if (source === 'like') {
        return acceptLikeRequest(uid, sourceId);
    }
    return acceptSwapRequest(uid, sourceId);
});
exports.declineRequest = (0, https_1.onCall)({ region: REGION }, async (request) => {
    const uid = requireAuthUid(request);
    const source = requireRequestSource(request.data?.source);
    const sourceId = requireString(request.data?.sourceId, 'sourceId');
    if (source === 'like') {
        return declineLikeRequest(uid, sourceId);
    }
    return declineSwapRequest(uid, sourceId);
});
//# sourceMappingURL=requests.js.map