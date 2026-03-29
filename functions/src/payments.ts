import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');

const razorpayKeyId = defineSecret('RAZORPAY_KEY_ID');
const razorpayKeySecret = defineSecret('RAZORPAY_KEY_SECRET');
const razorpayWebhookSecret = defineSecret('RAZORPAY_WEBHOOK_SECRET');

/**
 * Create a Razorpay Order
 * Callable from Expo app
 */
export const createRazorpayOrder = onCall(
  { region: 'asia-south1', secrets: [razorpayKeyId, razorpayKeySecret] },
  async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to create an order');
  }

  const { amount, credits } = request.data as { amount?: unknown; credits?: unknown };
  const amountNumber = typeof amount === 'number' ? amount : Number(amount);
  const creditsNumber = typeof credits === 'number' ? credits : Number(credits);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0 || !Number.isFinite(creditsNumber) || creditsNumber <= 0) {
    throw new HttpsError('invalid-argument', 'Amount and credits are required');
  }

  try {
    const razorpay = new Razorpay({
      key_id: razorpayKeyId.value(),
      key_secret: razorpayKeySecret.value(),
    });
    const order = await razorpay.orders.create({
      amount: Math.round(amountNumber * 100),
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: request.auth.uid,
        credits: String(creditsNumber),
      },
    });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  } catch (error) {
    console.error('[Razorpay] Create Order Error:', error);
    throw new HttpsError('internal', 'Failed to create Razorpay order');
  }
  }
);

/**
 * Verify Razorpay Payment Signature
 * Callable from Expo app
 */
export const verifyRazorpayPayment = onCall(
  { region: 'asia-south1', secrets: [razorpayKeySecret] },
  async (request) => {
  // Check if user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to verify payment');
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, amount } = request.data as {
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
    credits?: unknown;
    amount?: unknown;
  };

  if (
    typeof razorpay_order_id !== 'string' ||
    typeof razorpay_payment_id !== 'string' ||
    typeof razorpay_signature !== 'string'
  ) {
    throw new HttpsError('invalid-argument', 'Payment details are missing');
  }
  const creditsNumber = typeof credits === 'number' ? credits : Number(credits);
  const amountNumber = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(creditsNumber) || creditsNumber <= 0) {
    throw new HttpsError('invalid-argument', 'Credits are missing');
  }

  // Verify signature
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret.value())
    .update(body.toString())
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    console.error('[Razorpay] Signature Verification Failed');
    throw new HttpsError('invalid-argument', 'Invalid payment signature');
  }

  const userId = request.auth.uid;
  const db = admin.firestore();

  try {
    // Update User Profile (Credits + Premium status)
    const userRef = db.collection('users').doc(userId);
    
    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User document not found');
      }

      const currentCredits = (userDoc.data()?.credits as number) || 0;
      const nextCredits = currentCredits + creditsNumber;
      
      transaction.update(userRef, {
        credits: nextCredits,
        isPremium: true,
        premiumExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        lastPaymentId: razorpay_payment_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Log Payment in 'payments' collection
      const paymentRef = db.collection('payments').doc(razorpay_payment_id);
      transaction.set(paymentRef, {
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: Number.isFinite(amountNumber) ? amountNumber : 0,
        credits: creditsNumber,
        status: 'success',
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Add to creditLedger for tracking
      const ledgerRef = db.collection('creditLedger').doc();
      transaction.set(ledgerRef, {
        userId,
        delta: creditsNumber,
        balanceAfter: nextCredits,
        reason: 'credit_pack_purchase',
        referenceType: 'razorpay_payment',
        referenceId: razorpay_payment_id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: 'backend',
      });
    });

    console.log(`[Razorpay] Payment ${razorpay_payment_id} verified for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('[Razorpay] Verification/Firestore Error:', error);
    throw new HttpsError('internal', 'Payment verified but failed to update profile');
  }
  }
);

/**
 * Razorpay Webhook
 * HTTPS Request from Razorpay
 */
export const razorpayWebhook = onRequest(
  { region: 'asia-south1', secrets: [razorpayKeySecret, razorpayWebhookSecret] },
  async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-razorpay-signature'] as string;
  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', razorpayWebhookSecret.value())
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    console.error('[Razorpay Webhook] Invalid signature');
    res.status(400).send('Invalid signature');
    return;
  }

  console.log('[Razorpay Webhook] Signature verified');

  const event = req.body;
  const db = admin.firestore();

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const userId = payment.notes?.userId;
    const credits = parseInt(payment.notes?.credits || '0');

    if (userId && credits > 0) {
      console.log(`[Razorpay Webhook] Processing captured payment for user ${userId}`);
      
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();

      if (userDoc.exists) {
        const currentCredits = (userDoc.data()?.credits as number) || 0;
        
        // Ensure idempotency by checking if payment was already processed
        const paymentRef = db.collection('payments').doc(payment.id);
        const paymentDoc = await paymentRef.get();

        if (!paymentDoc.exists) {
          const nextCredits = currentCredits + credits;
          await db.runTransaction(async (transaction) => {
            transaction.update(userRef, {
              credits: nextCredits,
              isPremium: true,
              premiumExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 24 * 60 * 60 * 1000),
              lastPaymentId: payment.id,
            });

            transaction.set(paymentRef, {
              userId,
              orderId: payment.order_id,
              paymentId: payment.id,
              amount: payment.amount / 100,
              credits,
              status: 'success',
              source: 'webhook',
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const ledgerRef = db.collection('creditLedger').doc();
            transaction.set(ledgerRef, {
              userId,
              delta: credits,
              balanceAfter: nextCredits,
              reason: 'credit_pack_purchase',
              referenceType: 'razorpay_webhook',
              referenceId: payment.id,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              createdBy: 'webhook',
            });
          });
          console.log(`[Razorpay Webhook] Successfully updated credits via webhook for user ${userId}`);
        }
      }
    }
  }

  res.status(200).send('OK');
  }
);
