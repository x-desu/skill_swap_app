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
exports.endVideoCall = exports.declineVideoCallInvite = exports.acceptVideoCallInvite = exports.createVideoCallInvite = exports.getStreamVideoToken = void 0;
const crypto_1 = require("crypto");
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const node_sdk_1 = require("@stream-io/node-sdk");
const REGION = 'asia-south1';
const CALL_TYPE = 'default';
const STREAM_TOKEN_VALIDITY_SECONDS = 60 * 60;
const streamApiKey = (0, params_1.defineSecret)('STREAM_API_KEY');
const streamApiSecret = (0, params_1.defineSecret)('STREAM_API_SECRET');
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
function getStreamClient() {
    return new node_sdk_1.StreamClient(streamApiKey.value(), streamApiSecret.value());
}
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
function isTerminalStatus(status) {
    return status === 'declined' || status === 'cancelled' || status === 'ended' || status === 'missed';
}
async function getValidatedMatch(matchId, participantUid) {
    const matchSnap = await db.collection('matches').doc(matchId).get();
    if (!matchSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Match not found');
    }
    const matchData = matchSnap.data();
    const users = Array.isArray(matchData?.users) ? matchData.users.filter(Boolean) : [];
    if (users.length !== 2) {
        throw new https_1.HttpsError('failed-precondition', 'Video calling currently supports one-to-one matches only');
    }
    if (!users.includes(participantUid)) {
        throw new https_1.HttpsError('permission-denied', 'You are not a participant in this match');
    }
    return users;
}
async function getUserProfileSummary(uid) {
    const userSnap = await db.collection('users').doc(uid).get();
    const data = userSnap.data();
    return {
        uid,
        displayName: data?.displayName?.trim() || 'SkillSwap User',
        photoURL: data?.photoURL || null,
    };
}
async function upsertStreamUsers(streamClient, users) {
    await streamClient.upsertUsers(users.map((user) => ({
        id: user.uid,
        name: user.displayName,
        image: user.photoURL || undefined,
    })));
}
async function getCallSnapshotForParticipant(callId, uid) {
    const callRef = db.collection('calls').doc(callId);
    const callSnap = await callRef.get();
    if (!callSnap.exists) {
        throw new https_1.HttpsError('not-found', 'Call not found');
    }
    const callData = callSnap.data();
    const participantUids = Array.isArray(callData?.participantUids)
        ? callData.participantUids.filter(Boolean)
        : [];
    if (!participantUids.includes(uid)) {
        throw new https_1.HttpsError('permission-denied', 'You are not a participant in this call');
    }
    return { callRef, callData };
}
async function safeEndStreamCall(streamCallId) {
    if (!streamCallId) {
        return;
    }
    try {
        await getStreamClient().video.endCall({
            type: CALL_TYPE,
            id: streamCallId,
        });
    }
    catch (error) {
        console.warn('[VideoCalls] Failed to end Stream call:', streamCallId, error);
    }
}
exports.getStreamVideoToken = (0, https_1.onCall)({ region: REGION, secrets: [streamApiKey, streamApiSecret] }, async (request) => {
    const uid = requireAuthUid(request);
    const profile = await getUserProfileSummary(uid);
    const streamClient = getStreamClient();
    await upsertStreamUsers(streamClient, [profile]);
    const token = streamClient.generateUserToken({
        user_id: uid,
        validity_in_seconds: STREAM_TOKEN_VALIDITY_SECONDS,
    });
    return {
        apiKey: streamApiKey.value(),
        token,
        userId: uid,
        expiresInSeconds: STREAM_TOKEN_VALIDITY_SECONDS,
    };
});
exports.createVideoCallInvite = (0, https_1.onCall)({ region: REGION, secrets: [streamApiKey, streamApiSecret] }, async (request) => {
    const callerUid = requireAuthUid(request);
    const matchId = requireString(request.data?.matchId, 'matchId');
    const requestedCalleeUid = requireString(request.data?.calleeUid, 'calleeUid');
    const participants = await getValidatedMatch(matchId, callerUid);
    if (!participants.includes(requestedCalleeUid) || requestedCalleeUid === callerUid) {
        throw new https_1.HttpsError('invalid-argument', 'calleeUid must be the other user in the match');
    }
    const callRef = db.collection('calls').doc(matchId);
    const existingCallSnap = await callRef.get();
    if (existingCallSnap.exists) {
        const existingCall = existingCallSnap.data();
        if (existingCall?.status && !isTerminalStatus(existingCall.status)) {
            throw new https_1.HttpsError('failed-precondition', 'A video call is already active for this chat');
        }
    }
    const [caller, callee] = await Promise.all([
        getUserProfileSummary(callerUid),
        getUserProfileSummary(requestedCalleeUid),
    ]);
    const streamClient = getStreamClient();
    await upsertStreamUsers(streamClient, [caller, callee]);
    const streamCallId = (0, crypto_1.randomUUID)();
    const streamCall = streamClient.video.call(CALL_TYPE, streamCallId);
    await streamCall.getOrCreate({
        notify: false,
        ring: false,
        video: true,
        data: {
            created_by_id: callerUid,
            video: true,
            members: [
                { user_id: callerUid },
                { user_id: requestedCalleeUid },
            ],
            custom: {
                initiated_from: 'chat',
                matchId,
            },
        },
    });
    await callRef.set({
        matchId,
        streamCallId,
        streamCallType: CALL_TYPE,
        initiatedFrom: 'chat',
        callerUid,
        calleeUid: requestedCalleeUid,
        participantUids: participants,
        caller,
        callee,
        status: 'ringing',
        endedByUid: null,
        acceptedAt: null,
        endedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        callId: callRef.id,
        streamCallId,
        streamCallType: CALL_TYPE,
        status: 'ringing',
    };
});
exports.acceptVideoCallInvite = (0, https_1.onCall)({ region: REGION, secrets: [streamApiKey, streamApiSecret] }, async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);
    if (callData?.calleeUid !== uid) {
        throw new https_1.HttpsError('permission-denied', 'Only the invited user can accept this call');
    }
    if (callData?.status === 'accepted') {
        return {
            callId,
            streamCallId: callData.streamCallId,
            streamCallType: callData.streamCallType || CALL_TYPE,
            status: 'accepted',
        };
    }
    if (callData?.status !== 'ringing') {
        throw new https_1.HttpsError('failed-precondition', 'This call can no longer be accepted');
    }
    await callRef.update({
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        endedAt: null,
        endedByUid: null,
        updatedAt: FieldValue.serverTimestamp(),
    });
    return {
        callId,
        streamCallId: callData.streamCallId,
        streamCallType: callData.streamCallType || CALL_TYPE,
        status: 'accepted',
    };
});
exports.declineVideoCallInvite = (0, https_1.onCall)({ region: REGION, secrets: [streamApiKey, streamApiSecret] }, async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);
    const currentStatus = callData?.status;
    if (currentStatus && isTerminalStatus(currentStatus)) {
        return {
            callId,
            status: currentStatus,
        };
    }
    if (currentStatus !== 'ringing') {
        throw new https_1.HttpsError('failed-precondition', 'Only ringing calls can be declined');
    }
    const nextStatus = callData?.callerUid === uid ? 'cancelled' : 'declined';
    await callRef.update({
        status: nextStatus,
        endedAt: FieldValue.serverTimestamp(),
        endedByUid: uid,
        updatedAt: FieldValue.serverTimestamp(),
    });
    await safeEndStreamCall(callData?.streamCallId);
    return {
        callId,
        status: nextStatus,
    };
});
exports.endVideoCall = (0, https_1.onCall)({ region: REGION, secrets: [streamApiKey, streamApiSecret] }, async (request) => {
    const uid = requireAuthUid(request);
    const callId = requireString(request.data?.callId, 'callId');
    const { callRef, callData } = await getCallSnapshotForParticipant(callId, uid);
    const currentStatus = callData?.status;
    if (currentStatus && isTerminalStatus(currentStatus)) {
        return {
            callId,
            status: currentStatus,
        };
    }
    const nextStatus = currentStatus === 'ringing'
        ? callData?.callerUid === uid
            ? 'cancelled'
            : 'declined'
        : 'ended';
    await callRef.update({
        status: nextStatus,
        endedAt: FieldValue.serverTimestamp(),
        endedByUid: uid,
        updatedAt: FieldValue.serverTimestamp(),
    });
    await safeEndStreamCall(callData?.streamCallId);
    return {
        callId,
        status: nextStatus,
    };
});
//# sourceMappingURL=videoCalls.js.map