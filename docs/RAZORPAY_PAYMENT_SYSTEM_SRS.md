# 📄 🧠 SRS — Razorpay Payment System (Firebase Only)

---

## 1. 🎯 OBJECTIVE

Implement a secure payment system using:

* Razorpay (payment processing)
* Firebase Cloud Functions (backend)
* Firestore (state)
* Expo app (UI)

System must:

* Accept real/test payments
* Verify payments securely
* Unlock premium features
* Handle missed cases via webhook

---

## 2. 🧱 ARCHITECTURE

```txt
Expo App
↓
Firebase Callable Function (create order)
↓
Razorpay Checkout (web)
↓
Firebase Function (verify payment)
↓
Firestore (user premium state)
↓
App UI updates (real-time)
```

---

## 3. 👤 USER FLOW

---

### 💸 Payment Flow

```txt
User clicks "Go Premium"
↓
App calls Firebase function → create order
↓
App opens Razorpay checkout
↓
User pays
↓
App sends payment response to Firebase
↓
Firebase verifies signature
↓
Firestore updated
↓
App unlocks premium
```

---

### 🔁 Backup Flow (Webhook)

```txt
Payment success
↓
Razorpay webhook triggers
↓
Firebase updates Firestore
↓
User still gets premium even if app closed
```

---

## 4. 📊 DATA MODEL

---

### users/{userId}

```ts
{
  isPremium: boolean,
  expiresAt: number,
  lastPaymentId: string,
  credits: number, // Added for credit-based system
}
```

---

### payments/{paymentId}

```ts
{
  userId: string,
  amount: number,
  status: "success",
  createdAt: timestamp,
  orderId: string,
  paymentId: string,
  signature: string
}
```

---

## 5. 🔐 SECURITY

* Verify signature in backend (Cloud Function)
* Do NOT trust frontend
* Store secret key ONLY in Firebase env/secrets
* Use webhook for redundancy
