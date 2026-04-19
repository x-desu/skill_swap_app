# SkillSwap — Software Requirements Specification (SRS)

**Version:** 1.1.0
**Platform:** Android (iOS planned)
**Package:** `com.skillswap.app`
**Last updated:** April 2026

---

## 1. Project Overview

SkillSwap is a React Native mobile application that lets users discover people nearby, propose skill swaps (teach one skill, learn another), chat, video call, and purchase credits via Razorpay. The core UX mirrors Tinder-style card swiping but for skill exchange rather than dating.

### Key Features
- 🃏 Swipe-based user discovery (like/pass)
- 💬 Real-time chat after mutual match
- 📹 1:1 video calling via Stream SDK
- 💳 Credit system with Razorpay INR payments
- 🔔 Push notifications (Firebase + Notifee)
- ♻️ OTA updates via Expo EAS (no app store needed)
- 🎫 In-app support ticket system
- 📊 Profile Strength tracker with animated progress
- 🛡️ AI-powered profile photo validation (Google Vision API)

---

## 2. Technology Stack

### Core Framework
| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript | ~5.9.2 |
| Runtime | React Native | 0.81.5 |
| Framework | Expo (bare workflow) | SDK 54 (~54.0.32) |
| Router | Expo Router (file-based) | ~6.0.22 |
| React | React | 19.1.0 |
| New Architecture | Enabled (`newArchEnabled: true`) | — |

### State Management
| Tool | Purpose |
|---|---|
| Redux Toolkit | Global auth, profile, discovery, chat, matches |
| React Redux | Component store binding |
| Zustand | Lightweight local UI state |

### Backend / Cloud
| Service | Provider | Purpose |
|---|---|---|
| Auth | Firebase Auth | Email/password + Google Sign-In |
| Database | Firestore | All user data, matches, chats, tickets |
| Storage | Firebase Storage | Profile photos, chat images |
| Functions | Firebase Cloud Functions (Node.js) | Payments, credit management |
| Video Calls | Stream Video SDK | WebRTC-based 1:1 video calls |

### Payments
| Tool | Purpose |
|---|---|
| Razorpay (`react-native-razorpay`) | INR payment gateway for credit packs |
| RevenueCat (`react-native-purchases`) | Legacy — kept but not in active payment flow |

### UI / Styling
| Tool | Purpose |
|---|---|
| NativeWind v4 | Tailwind CSS utility classes for React Native |
| Gluestack UI | Dark-mode component library |
| Lucide React Native | Icon set |
| React Native Reanimated v4 | Animations and layout transitions |
| React Native Gesture Handler | Swipe and drag gestures |
| React Native Deck Swiper | Tinder-style card swiping |
| Expo Linear Gradient | Gradient backgrounds |
| Expo Blur | Frosted glass / blur effects |
| React Native Maps | Google Maps in paywall radius view |
| React Native Gifted Chat | Chat message UI |
| React Native Toast Message | Toast notifications |

### Maps & Location
| Tool | Purpose |
|---|---|
| `expo-location` | Foreground GPS + reverse geocoding |
| `react-native-maps` | MapView with Circle/Marker in paywall |
| Google Maps API Key | Stored in `AndroidManifest.xml` meta-data |

### OTA Updates
| Config | Value |
|---|---|
| Package | `expo-updates` ~29.0.16 |
| Channel | `production` |
| Runtime Version | `1.0.0` |
| Update URL | `https://u.expo.dev/6842636a-67df-4aed-8533-8e686f247a15` |

---

## 3. Project Structure

```
skill_swap_app/
├── app/                          # Expo Router screens (file = route)
│   ├── _layout.tsx               # Root Stack + Redux Provider + OTA banner
│   ├── index.tsx                 # Entry → routes to splash/auth/tabs
│   ├── splash.tsx                # Animated loading/splash screen
│   ├── paywall.tsx               # Credit purchase (MapView + Razorpay)
│   ├── edit-profile.tsx          # Edit user profile fields
│   ├── settings.tsx              # App settings + sign out
│   ├── notifications.tsx         # In-app notification inbox
│   ├── customer-center.tsx       # Entry file → CustomerCenter component
│   ├── match-celebration.tsx     # "It's a Match!" modal overlay
│   ├── skills-directory.tsx      # Browse full skills catalog
│   ├── error.tsx                 # Global error boundary screen
│   ├── +not-found.tsx            # 404 fallback
│   ├── (auth)/                   # Unauthenticated route group
│   │   ├── welcome.tsx           # Landing / onboarding
│   │   ├── sign-in.tsx           # Email + Google sign-in
│   │   └── sign-up.tsx           # Email registration
│   ├── (tabs)/                   # Bottom-tab authenticated group
│   │   ├── home.tsx              # Card swiper discovery feed
│   │   ├── discover.tsx          # Advanced search + filters
│   │   ├── matches.tsx           # Mutual matches → chat list
│   │   ├── messages.tsx          # Redirects to matches tab
│   │   ├── profile.tsx           # Own profile + Profile Strength card
│   │   └── wallet.tsx            # Credits balance + transaction history
│   ├── chat/[id].tsx             # Real-time chat (matchId param)
│   ├── call/[id].tsx             # Video call screen (callId param)
│   └── user/[id].tsx             # View another user's profile
│
├── src/
│   ├── services/
│   │   ├── firestoreService.ts   # ⭐ Single source of truth for Firestore ops
│   │   ├── chatService.ts        # Real-time chat (subcollections)
│   │   ├── matchingService.ts    # Like/pass/mutual match logic
│   │   ├── notificationService.ts # Push + in-app notifications
│   │   ├── razorpayService.ts    # Razorpay payment + Cloud Functions
│   │   ├── revenueCatService.ts  # RevenueCat (legacy)
│   │   ├── skillsService.ts      # Skills catalog CRUD
│   │   ├── storageService.ts     # Firebase Storage uploads
│   │   ├── videoCallService.ts   # Stream Video call initiation
│   │   ├── streamVideoService.ts # Stream client init
│   │   ├── creditsService.ts     # Credit balance helpers
│   │   └── appInit.ts            # App bootstrap sequence
│   │
│   ├── store/
│   │   ├── index.ts              # Store config + RootState type
│   │   ├── authSlice.ts          # Auth state (user, loading, isProfileComplete)
│   │   ├── profileSlice.ts       # Current user Firestore profile
│   │   ├── discoverySlice.ts     # Discovery feed users list
│   │   ├── matchesSlice.ts       # Matched users list
│   │   ├── chatSlice.ts          # Active chat messages
│   │   └── usersSlice.ts         # Cached other-user profiles
│   │
│   ├── components/
│   │   ├── CustomerCenter.tsx    # ⭐ Full account/support screen (rebuilt)
│   │   ├── IncomingCallBanner.tsx # Incoming call overlay (global)
│   │   └── DataProvider.tsx      # Starts data listeners post-auth
│   │
│   ├── hooks/
│   │   ├── useAuth.ts            # { user, profile, loading }
│   │   └── useDiscoverFilters.ts # Discovery feed filter logic
│   │
│   └── types/user.ts             # All TypeScript types (canonical source)
│
├── functions/src/
│   ├── payments.ts               # createRazorpayOrder + verifyRazorpayPayment
│   ├── monetization.ts           # Credit top-up via Razorpay webhook
│   └── spendCredits.ts           # Deduct credits on swap request
│
├── android/                      # Bare Android project
├── app.json                      # Expo config (OTA, runtimeVersion, plugins)
├── eas.json                      # EAS Build profiles
├── firestore.rules               # Firestore security rules
├── google-services.json          # Firebase Android config (includes EAS SHA-1)
├── metro.config.js               # Metro bundler config (NativeWind)
├── SRS.md                        # This document
└── .github/workflows/build.yml   # CI/CD pipeline
```

---

## 4. Screen Map & Navigation

### Auth Flow
```
index.tsx → splash.tsx → welcome.tsx → sign-in.tsx / sign-up.tsx → (tabs)
```

### Main App Tabs
| Tab | Screen | Description |
|---|---|---|
| 1 | `home.tsx` | Card swiper — like/pass to discover users |
| 2 | `discover.tsx` | Search with skill + location filters |
| 3 | `matches.tsx` | Mutual match list → open chat |
| 4 | `profile.tsx` | Own profile, stats, Profile Strength card |
| 5 | `wallet.tsx` | Credits balance + transaction history |

### Screen Animations (all registered in `_layout.tsx`)
| Screen | Presentation | Animation |
|---|---|---|
| `paywall` | `transparentModal` | `slide_from_bottom` |
| `edit-profile` | `transparentModal` | `slide_from_bottom` |
| `settings` | `transparentModal` | `slide_from_bottom` |
| `notifications` | `transparentModal` | `slide_from_bottom` |
| `match-celebration` | `transparentModal` | `slide_from_bottom` |
| `customer-center` | default | `slide_from_right` |
| `skills-directory` | default | `slide_from_bottom` |
| `chat/[id]` | default | `slide_from_right` |
| `user/[id]` | default | `slide_from_right` |
| `call/[id]` | default | `slide_from_right` |

> **Why `transparentModal` not `modal`?** On Android, `presentation: 'modal'` without an explicit animation causes a white flash before content renders. `transparentModal` + `slide_from_bottom` eliminates this.

---

## 5. Firestore Data Model

### `users/{uid}`
```typescript
uid, displayName, photoURL, email, bio,
location: { city: string, country: string },
teachSkills: string[],     // skills user can teach
wantSkills: string[],      // skills user wants to learn
credits: number,           // in-app balance (Cloud Function only writes)
rating: number,            // 0–5 star average
reviewCount: number,
completedSwaps: number,
isProfileComplete: boolean,    // Server-managed (true only if AI validation passes)
profileStatus: string,         // 'pending' | 'complete' | 'rejected'
hasPhoto: boolean,
hasSeenPaywall: boolean,
isOnline: boolean,
lastActive: Timestamp,
fcmToken: string,          // FCM push token
dailySwipes: number,
dailyMessages: number,
lastLimitResetAt: Timestamp,
createdAt: Timestamp,
updatedAt: Timestamp
```

### `swapRequests/{id}`
```typescript
fromUid, toUid,
fromName, toName, fromPhotoURL, toPhotoURL,  // denormalised for display
offeredSkill, wantedSkill, message,
status: 'pending' | 'accepted' | 'declined' | 'completed',
participants: string[],    // [fromUid, toUid] — for array-contains queries
createdAt, updatedAt
```

### `matches/{id}`
```typescript
users: string[],           // [uidA, uidB]
matchedAt: Timestamp,
lastMessage: string,
lastMessageTime: Timestamp

// Subcollection:
matches/{id}/messages/{msgId}
  _id, text, createdAt,
  user: { _id, name, avatar },
  image?, deletedFor?: string[]
```

### `likes/{id}`
```typescript
fromUid, toUid,
type: 'like' | 'pass',
createdAt: Timestamp
```

### `calls/{id}`
```typescript
matchId, streamCallId, callerUid, calleeUid,
caller: { uid, displayName, photoURL },
callee: { uid, displayName, photoURL },
status: 'ringing' | 'accepted' | 'declined' | 'ended' | 'missed',
createdAt, updatedAt, acceptedAt?, endedAt?, endedByUid?
```

### `notifications/{id}`
```typescript
userId, type, title, body, read: boolean,
data: { matchId?, targetUid?, senderName?, ... },
createdAt: Timestamp
```

### `supportTickets/{id}` *(new)*
```typescript
uid, userEmail, subject, message,
status: 'open' | 'in_progress' | 'resolved',
createdAt: Timestamp
// Rules: user can create + read own tickets; delete only if status='open'
// Updates (status changes) are server-only
```

---

## 6. Payment Flow (Razorpay)

```
User picks credit pack → taps "Get Premium"
  → razorpayService.startRazorpayPayment(amount, credits, email)
      → Cloud Function: createRazorpayOrder({ amount, credits })
      → RazorpayCheckout.open()  ← native payment sheet
          ✅ Success  → Cloud Function: verifyRazorpayPayment(orderId, paymentId, signature, credits)
                        → HMAC-SHA256 verified
                        → users/{uid}.credits += N  (atomic increment)
          ❌ Cancel   → source: 'customer' → silently ignored (no alert)
          ❌ Network  → Alert.alert('Payment Failed', ...)
```

### Credit Packs
| ID | Credits | Price (INR) | Badge |
|---|---|---|---|
| `starter` | 10 | ₹99 | — |
| `value` | 25 | ₹250 | ⭐ Popular |
| `pro` | 75 | ₹499 | — |

### Razorpay API Key
Hardcoded fallback in `razorpayService.ts` for production builds where `Constants.expoConfig` is null.

---

## 7. Customer Center (Rebuilt)

Located at `src/components/CustomerCenter.tsx`. Full-stack component with real Firestore data.

### Overview Tab
- **Live credits balance** — real-time Firestore `onSnapshot` listener
- **Top Up Credits** button → navigates to `/paywall`
- **Account Info** — name, email, member since, completed swaps
- **Recent Swaps** — last 10 swap requests with status badges
- **Help links** — email support + help center URLs

### Support Tab (CRUD)
- **Create ticket** — modal with subject + 1000-char message
- **List tickets** — own tickets only (Firestore rules enforced)
- **Status badges** — 🟡 Open / 🔵 In Progress / 🟢 Resolved
- **Delete ticket** — only allowed on `open` status tickets
- **Pull to refresh** on both tabs

---

## 8. Profile Strength Card (New)

Located in `app/(tabs)/profile.tsx` → `ProfileStrengthCard` component.

Calculates profile completeness from 5 checks:
| Check | Condition |
|---|---|
| Profile photo | `photoURL != null` |
| Bio written | `bio.length > 10` |
| Skills to teach | `teachSkills.length > 0` |
| Skills to learn | `wantSkills.length > 0` |
| Location set | `location.city != null` |

### Visual States
| Completion | Bar color | Label |
|---|---|---|
| < 60% | 🔴 Rose | "Complete your profile" |
| 60–99% | 🟡 Amber | "Almost there!" |
| 100% | 🟢 Green | "🎉 Profile complete!" |

- Animated progress bar (0% → actual %, 900ms)
- "Complete Profile →" CTA button (hides at 100%)
- Card border turns green at 100%

---

## 9. OTA Update System

### Architecture
```
EAS Cloud Build → APK with expo-updates embedded (listens to "production" channel)
                          ↓
Developer: npx eas update --channel production --message "..."
                          ↓
User opens app → UpdateBanner checks EAS servers
  → Update found: banner slides down "Downloading update…"
  → Download complete: "✦ Update ready — Tap to restart"
  → User taps → Updates.reloadAsync() → new JS bundle runs instantly
```

### UpdateBanner (in `_layout.tsx`)
- `Updates.isEmbeddedLaunch` guard — skips in dev/Expo Go
- Uses React Native `Animated` API for spring-in effect
- Non-blocking — user chooses when to restart
- Silent failure — if check fails, banner never appears

### Critical: Channel Alignment
```json
// eas.json — preview profile MUST use "production" channel
{
  "build": {
    "preview": {
      "channel": "production"  ← must match eas update --channel
    }
  }
}
```

---

## 10. CI/CD Pipeline (`.github/workflows/build.yml`)

Automated on `git push`:
1. **OTA Update** — runs `eas update --channel production` on every push to `main`
2. **APK Build** — manual trigger → builds APK via `eas build` → uploads to Firebase App Distribution

---

## 11. Maintenance & Data Quality

### Sanitization Scripts
Located in `src/scripts/`:
- `sanitizeUsers.ts`: Scans Firestore for incomplete profiles and flags/hides them.
- `activateUsers.ts`: Hardened to prevent accidental activation of low-quality test accounts.
- `checkFirestoreUsers.ts`: Diagnostic tool for user counts and completion status.

### AI Validation Profile Flow
1. User uploads photo → Cloud Function `validateUserProfile` triggered.
2. Vision API checks for: `faceAnnotations`, `safeSearch`, and `labelAnnotations`.
3. If valid → `isProfileComplete` set to `true`.
4. If invalid → `profileStatus` set to `rejected`, user must re-upload.

---

## 11. Build Commands Reference

```powershell
# Dev / debug build (from project root)
npx expo run:android

# Local release APK (must run from project ROOT, not android/)
$env:NODE_OPTIONS="--max-old-space-size=8192"
cd android
.\gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk

# EAS cloud build — recommended (properly integrates expo-updates)
eas build --platform android --profile preview --no-wait

# OTA update (JS/UI changes — no rebuild needed)
npx eas update --channel production --message "describe what changed"

# List recent builds
eas build:list

# Get EAS keystore SHA-1 fingerprint
eas credentials --platform android

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

---

## 12. Firestore Security Rules Summary

| Collection | Read | Write | Notes |
|---|---|---|---|
| `users/{uid}` | Any signed-in user | Owner only | `credits`/`isProfileComplete` blocked client-side |
| `discovery` | Any signed-in user | `false` | Strictly filters `isProfileComplete == true` |
| `swapRequests/{id}` | Participants only | Creator (fromUid) | Status update limited to participants |
| `matches/{id}` | Participants only | Participants | lastMessage updatable by participants |
| `matches/{id}/messages` | Match users | Match users | Via `get()` check on parent |
| `notifications/{id}` | Owner (userId) | Owner | Create requires userId == auth.uid |
| `supportTickets/{id}` | Owner (uid) | Create (owner), Delete if open | Status updates server-only |
| `likes/{id}` | Sender or receiver | Sender only | |
| `calls/{id}` | Participants | `false` (server only) | |

---

## 13. Key Rules for Any AI Agent Working on This Project

> **Navigation params = primitives only.**
> Never pass `photoURL`, objects, or arrays through `router.push()`. Pass only `uid` or `matchId` — fetch full data from Redux or Firestore inside the target screen.

> **All Firestore writes go through `firestoreService.ts`.**
> No direct `setDoc/updateDoc/getDoc` in components.

> **Credits and Profile Completion are Server-only.**
> Firestore rules block client writes to `credits`, `isProfileComplete`, and `profileStatus`. Completion is triggered by the `validateUserProfile` Cloud Function.

> **`metro.config.js` — use plain `path.join()` for NativeWind input.**
> `pathToFileURL()` sends a `file://C:/` URL that breaks EAS Linux build servers permanently.

> **Run all terminal commands from the project root**, not from `android/` subdirectory.

> **`eas.json` preview profile channel must be `"production"`** — if it says `"preview"`, OTA updates are silently ignored by installed APKs.

> **Google Sign-In requires EAS keystore SHA-1 in Firebase.**
> EAS managed keystore SHA-1: `2B:F3:61:40:D6:90:7F:90:39:25:1F:74:ED:B7:FD:37:3D:9F:8E:E2`
> SHA-256: `6D:D9:40:21:40:0D:21:39:EC:44:0F:B7:91:2B:65:A3:0B:E9:33:5D:7A:C3:2F:3D:CA:5B:D9:63:95:74:54:4D`

---

## 14. Accounts & Services Reference

| Service | Account / Value |
|---|---|
| Expo / EAS account | `desudesai` |
| Firebase Project ID | `skillswap-de97f` |
| EAS Project ID | `6842636a-67df-4aed-8533-8e686f247a15` |
| Android Package | `com.skillswap.app` |
| EAS Build Dashboard | https://expo.dev/accounts/desudesai/projects/skill_swap_app/builds |
| EAS Updates Dashboard | https://expo.dev/accounts/desudesai/projects/skill_swap_app/updates |
| Google Cloud Project | `skillswap-de97f` — Maps SDK for Android + Geocoding API enabled |
| EAS Update URL | `https://u.expo.dev/6842636a-67df-4aed-8533-8e686f247a15` |
