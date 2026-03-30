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
exports.seedNewUserCredits = exports.revenueCatWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;
function loadCreditGrants() {
    const raw = process.env.PRODUCT_CREDIT_GRANTS;
    if (!raw)
        return {};
    try {
        return JSON.parse(raw);
    }
    catch (e) {
        console.error('PRODUCT_CREDIT_GRANTS JSON invalid', e);
        return {};
    }
}
function entitlementId() {
    return process.env.SKILLSWAP_ENTITLEMENT_ID || 'skillswap_plus';
}
function mapLedgerReason(eventType) {
    if (eventType === 'INITIAL_PURCHASE')
        return 'subscription_initial_credit_grant';
    if (eventType === 'RENEWAL')
        return 'subscription_renewal_credit_grant';
    return 'credit_pack_purchase';
}
const GRANT_EVENT_TYPES = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE']);
exports.revenueCatWebhook = (0, https_1.onRequest)({ region: 'asia-south1', invoker: 'public' }, async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!secret) {
        console.error('REVENUECAT_WEBHOOK_SECRET not set');
        res.status(500).send('Server misconfigured');
        return;
    }
    const authHeader = (req.headers.authorization || req.headers.Authorization || '');
    if (authHeader !== 'Bearer ${secret}'.replace('${secret}', secret)) {
        res.status(401).send('Unauthorized');
        return;
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = body?.event;
    if (!event?.id || !event.app_user_id) {
        res.status(400).send('Bad payload');
        return;
    }
    try {
        await db.runTransaction(async (tx) => {
            const evRef = db.collection('purchaseEvents').doc(String(event.id));
            const evSnap = await tx.get(evRef);
            if (evSnap.exists && evSnap.data()?.processed === true) {
                return;
            }
            const uid = String(event.app_user_id);
            const userRef = db.collection('users').doc(uid);
            const userSnap = await tx.get(userRef);
            const grants = loadCreditGrants();
            const productId = String(event.product_id || '');
            const creditDelta = grants[productId] ?? 0;
            const shouldGrant = GRANT_EVENT_TYPES.has(String(event.type)) && creditDelta !== 0;
            const userPatch = {};
            if (userSnap.exists) {
                const cur = userSnap.data()?.credits ?? 0;
                if (shouldGrant) {
                    const nextCredits = cur + creditDelta;
                    userPatch.credits = nextCredits;
                    const ledgerRef = db.collection('creditLedger').doc();
                    tx.set(ledgerRef, {
                        userId: uid,
                        delta: creditDelta,
                        balanceAfter: nextCredits,
                        reason: mapLedgerReason(String(event.type)),
                        referenceType: 'revenuecat_event',
                        referenceId: String(event.id),
                        productId: productId || null,
                        createdAt: FieldValue.serverTimestamp(),
                        createdBy: 'backend',
                    });
                }
            }
            const entIds = Array.isArray(event.entitlement_ids) ? event.entitlement_ids.map(String) : [];
            const ent = entitlementId();
            userPatch.revenueCatAppUserId = uid;
            if (productId)
                userPatch.subscriptionProductId = productId;
            if (event.expiration_at_ms != null) {
                userPatch.subscriptionExpiresAt = admin.firestore.Timestamp.fromMillis(Number(event.expiration_at_ms));
            }
            const t = String(event.type);
            if (t === 'EXPIRATION') {
                userPatch.hasPremiumAccess = false;
                userPatch.subscriptionStatus = 'expired';
            }
            else if (t === 'CANCELLATION') {
                userPatch.hasPremiumAccess = false;
                userPatch.subscriptionStatus = 'cancelled';
            }
            else if (entIds.includes(ent)) {
                userPatch.hasPremiumAccess = true;
                userPatch.subscriptionStatus = 'active';
            }
            if (userSnap.exists && Object.keys(userPatch).length > 0) {
                tx.update(userRef, userPatch);
            }
            tx.set(evRef, {
                eventId: String(event.id),
                type: String(event.type),
                appUserId: uid,
                productId: productId || null,
                processed: true,
                processedAt: FieldValue.serverTimestamp(),
            }, { merge: true });
        });
        res.status(200).json({ received: true });
    }
    catch (e) {
        console.error('revenueCatWebhook error', e);
        res.status(500).send('Internal error');
    }
});
exports.seedNewUserCredits = (0, firestore_1.onDocumentCreated)({
    document: 'users/{uid}',
    region: 'asia-south1',
}, async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const data = snap.data();
    if (data.credits !== undefined && data.credits !== null)
        return;
    const initial = Number(process.env.INITIAL_USER_CREDITS ?? '10');
    const amount = Number.isFinite(initial) ? initial : 10;
    await snap.ref.update({ credits: amount });
});
//# sourceMappingURL=monetization.js.map