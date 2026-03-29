# ⚙️ 🚀 IMPLEMENTATION PLAN — Razorpay Payment System

---

# 🥇 PHASE 1 — FIREBASE SETUP

1. **Install dependencies**:
   ```bash
   cd functions
   npm install razorpay
   ```

2. **Secure Store Secrets**:
   Store `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in Firebase Cloud Functions configuration or secret manager.

---

# 🥈 PHASE 2 — CREATE ORDER FUNCTION

Implement a callable Firebase function `createRazorpayOrder` that:
* Accepts `amount` and `credits` from the app.
* Uses the Razorpay Node SDK to create a unique order.
* Returns the `orderId` to the app.

---

# 🥉 PHASE 3 — VERIFY PAYMENT FUNCTION

Implement a callable Firebase function `verifyRazorpayPayment` that:
* Accepts `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
* Verifies the signature using `crypto` and the `RAZORPAY_KEY_SECRET`.
* Updates the user's Firestore document (e.g., `isPremium: true`, adds `credits`).
* Logs the transaction in a `payments` collection.

---

# 🏁 PHASE 4 — WEBHOOK FUNCTION

Implement an HTTPS request function `razorpayWebhook` that:
* Listens for `payment.captured` events from Razorpay.
* Ensures the user gets their credits/premium status even if the app crashes during the client-side verification.

---

# 📱 PHASE 5 — EXPO APP INTEGRATION

1. **Update Paywall**: Replace RevenueCat logic with the new Razorpay flow.
2. **Handle Checkout**: Use `react-native-razorpay` or a custom WebView implementation for the checkout process.
3. **Listen for State**: Real-time Firestore listeners to react to premium status changes.

---

# 🧪 PHASE 6 — TESTING & SECURITY

* Use test cards for verification.
* Ensure secret keys are never exposed in the frontend.
* Validate all payment signatures on the backend.
