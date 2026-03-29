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
exports.spendCredits = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
exports.spendCredits = (0, https_1.onCall)({ region: 'asia-south1' }, async (request) => {
    var _a, _b, _c, _d;
    if (!((_a = request.auth) === null || _a === void 0 ? void 0 : _a.uid)) {
        throw new https_1.HttpsError('unauthenticated', 'Sign in required');
    }
    const uid = request.auth.uid;
    const amount = Number((_b = request.data) === null || _b === void 0 ? void 0 : _b.amount);
    const reason = String((_d = (_c = request.data) === null || _c === void 0 ? void 0 : _c.reason) !== null && _d !== void 0 ? _d : 'credit_spend');
    if (!Number.isFinite(amount) || amount <= 0) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid amount');
    }
    await db.runTransaction(async (tx) => {
        var _a, _b;
        const userRef = db.collection('users').doc(uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new https_1.HttpsError('failed-precondition', 'User profile missing');
        }
        const cur = (_b = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.credits) !== null && _b !== void 0 ? _b : 0;
        if (cur < amount) {
            throw new https_1.HttpsError('failed-precondition', 'Insufficient credits');
        }
        const next = cur - amount;
        tx.update(userRef, { credits: next });
        const ledgerRef = db.collection('creditLedger').doc();
        tx.set(ledgerRef, {
            userId: uid,
            delta: -amount,
            balanceAfter: next,
            reason,
            referenceType: 'callable_spend',
            referenceId: ledgerRef.id,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: 'backend',
        });
    });
    return { ok: true };
});
//# sourceMappingURL=spendCredits.js.map