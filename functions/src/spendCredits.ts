import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export const spendCredits = onCall({ region: 'asia-south1' }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in required');
  }
  const uid = request.auth.uid;
  const amount = Number(request.data?.amount);
  const reason = String(request.data?.reason ?? 'credit_spend');
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Invalid amount');
  }

  await db.runTransaction(async (tx) => {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) {
      throw new HttpsError('failed-precondition', 'User profile missing');
    }
    const cur = (userSnap.data()?.credits as number | undefined) ?? 0;
    if (cur < amount) {
      throw new HttpsError('failed-precondition', 'Insufficient credits');
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
