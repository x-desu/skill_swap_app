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
exports.grantAllUsersPlusTenCredits = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
const OPERATION_ID = 'bulk_grant_all_users_plus10_20260330';
const OPERATION_MARKER = 'bulkGrants.plus10_20260330';
const ADMIN_TOKEN = 'skillswap-bulk-grant-20260330-w2L9nQ8pR4mX7tK1vB6cD3zF';
exports.grantAllUsersPlusTenCredits = (0, https_1.onRequest)({
    region: 'asia-south1',
    timeoutSeconds: 540,
    memory: '1GiB',
    invoker: 'public',
}, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method-not-allowed' });
        return;
    }
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
        res.status(401).json({ error: 'unauthorized' });
        return;
    }
    const opRef = db.collection('adminOperations').doc(OPERATION_ID);
    const opSnap = await opRef.get();
    if (opSnap.exists && opSnap.data()?.status === 'completed') {
        res.status(200).json({
            success: true,
            alreadyCompleted: true,
            ...opSnap.data(),
        });
        return;
    }
    await opRef.set({
        operationId: OPERATION_ID,
        status: 'running',
        delta: 10,
        startedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    let lastDoc = null;
    let updatedCount = 0;
    let skippedCount = 0;
    let scannedCount = 0;
    while (true) {
        let q = db
            .collection('users')
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(400);
        if (lastDoc) {
            q = q.startAfter(lastDoc);
        }
        const snap = await q.get();
        if (snap.empty) {
            break;
        }
        const batch = db.batch();
        snap.docs.forEach((docSnap) => {
            scannedCount += 1;
            const data = docSnap.data();
            if (data.bulkGrants?.plus10_20260330) {
                skippedCount += 1;
                return;
            }
            updatedCount += 1;
            batch.update(docSnap.ref, {
                credits: FieldValue.increment(10),
                [OPERATION_MARKER]: true,
                updatedAt: FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
        lastDoc = snap.docs[snap.docs.length - 1];
    }
    await opRef.set({
        status: 'completed',
        delta: 10,
        updatedCount,
        skippedCount,
        scannedCount,
        completedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    res.status(200).json({
        success: true,
        operationId: OPERATION_ID,
        delta: 10,
        updatedCount,
        skippedCount,
        scannedCount,
    });
});
//# sourceMappingURL=adminBulkCredits.js.map