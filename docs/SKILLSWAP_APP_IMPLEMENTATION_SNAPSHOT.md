# SkillSwap App Implementation Snapshot

Updated: 2026-04-14

This document summarizes what the SkillSwap app currently implements in code. It is based on the live repository structure, app routes, services, Redux state, Firestore usage, and Firebase Cloud Functions in this repo.

## 1. Product Summary

SkillSwap is a mobile-first React Native app for discovering people, matching around skills, chatting after a match, and layering monetization on top of swipes/messages through credits and subscriptions.

The current product shape is:

- social discovery around teach / learn skills
- mutual-like matching
- real-time messaging after a match
- in-app and push notifications
- profile onboarding and profile editing
- credit-based action limits
- subscription and payment plumbing
- video call infrastructure for matched users

## 2. Primary Tech Stack

- Client shell: Expo Router + React Native + TypeScript
- State: Redux Toolkit
- UI: NativeWind + Gluestack UI + custom styled screens
- Auth: Firebase Auth
- Database: Firestore
- File storage: Firebase Storage
- Backend: Firebase Cloud Functions
- Push: Expo Notifications
- Payments: Razorpay
- Subscriptions: RevenueCat
- Video: Stream Video SDK

## 3. Route and Screen Map

### Auth flow

- `app/index.tsx`
  Redirect gate based on auth state and profile completeness.
- `app/(auth)/welcome.tsx`
  Entry screen with Google, Apple, and email paths.
- `app/(auth)/sign-in.tsx`
  Email sign-in plus Google / Apple.
- `app/(auth)/sign-up.tsx`
  Email registration.
- `app/(auth)/forgot-password.tsx`
  Firebase password reset flow.
- `app/(auth)/profile-setup.tsx`
  First-time onboarding with name, photo, location, teach skills, and want skills.

### Main app

- `app/(tabs)/index.tsx`
  Alias to the home screen.
- `app/(tabs)/home.tsx`
  Home / discovery dashboard with horizontal cards and quick actions.
- `app/(tabs)/discover.tsx`
  Primary swipe-based discovery experience.
- `app/(tabs)/matches.tsx`
  Combined Requests and Messages view.
- `app/(tabs)/messages.tsx`
  Redirects to `matches` with the messages tab selected.
- `app/(tabs)/profile.tsx`
  Current user profile, stats, skills, and subscription entry points.

### Additional screens

- `app/chat/[id].tsx`
  Match chat screen with text, images, emoji picker, and video call entry.
- `app/call/[id].tsx`
  Live video call screen backed by Stream.
- `app/notifications.tsx`
  In-app notification inbox.
- `app/settings.tsx`
  Theme, edit profile, sign out, and account deletion placeholder.
- `app/edit-profile.tsx`
  Full profile editing screen.
- `app/paywall.tsx`
  Credit pack purchase flow with Razorpay and localized paywall copy.
- `app/customer-center.tsx`
  RevenueCat subscription management screen.
- `app/match-celebration.tsx`
  Post-match success screen.

### Navigation notes

- The tab bar exposes `Home`, `Discovery`, `Swaps`, and `Profile`.
- `wallet.tsx` exists but is hidden from the tab bar.
- `messages.tsx` and `home.tsx` are also hidden from direct tab rendering and used as aliases / redirects.

## 4. What Is Implemented

### Authentication and session bootstrap

- Firebase Auth is the source of truth for signed-in state.
- Supported auth methods:
  - Google
  - Apple
  - email/password
  - password reset
- `app/_layout.tsx` listens to `onAuthStateChanged`, hydrates Redux auth state, ensures a Firestore profile exists, and gates navigation until the first profile snapshot arrives.

### User profile onboarding and editing

- New users complete profile setup before entering the main app.
- Profile setup supports:
  - display name
  - avatar upload from camera or library
  - reverse-geocoded location from device permissions
  - teach skills
  - want skills
- Profile editing supports:
  - updating display name
  - updating bio
  - updating location
  - updating skills
  - changing avatar
- Profile media uploads go through Firebase Storage.

### Discovery and swiping

- `discover.tsx` is the main card-swiping experience.
- Likes and passes are stored in Firestore `likes`.
- Mutual likes create a match.
- Daily swipe limits are enforced in the UI with credit-based overage spending.
- Filters exist for:
  - search query
  - category
  - distance slider
  - minimum rating
  - online-only
  - credits-only
  - match-my-skills
- The home screen also provides a lighter discovery surface with quick “Propose Swap” actions.

### Matching and request handling

- Real matches are stored in `matches`.
- Legacy `swapRequests` still exist and are still rendered in the app.
- The Requests tab combines:
  - pending likes
  - pending legacy swap requests
- Callable functions exist to accept or decline both:
  - likes
  - swap requests

### Real-time messaging

- Chats live under `matches/{matchId}/messages/{messageId}`.
- The app supports:
  - real-time message subscription
  - text messages
  - image messages
  - optimistic UI for sending
  - last message / last message time summary on match docs
  - unread count derivation from notifications
  - swipe-to-delete chat thread from the match list
- Opening a chat marks message notifications for that match as read.

### Notifications

- Expo notification permissions are requested after login.
- Expo push tokens are intended to be stored on the user profile.
- The app has a full notification inbox screen backed by Firestore `notifications`.
- Notification behaviors implemented:
  - live badge counts
  - mark as read
  - clear all
  - delete individual notifications
  - deep link into chat or requests
- Backend triggers create in-app notifications and push notifications for:
  - new likes / swap requests
  - new matches
  - new messages

### Monetization, credits, and subscriptions

- Daily free limits are defined for swipes and messages.
- When limits are exceeded, the app can spend credits through a callable function.
- `paywall.tsx` supports credit pack purchases through Razorpay.
- Razorpay backend functions support:
  - order creation
  - payment verification
  - webhook processing
  - credit ledger writes
- RevenueCat integration exists for subscription entitlements and customer info.
- Customer Center screen supports:
  - restore purchases
  - manage subscriptions
  - support links

### Video calls

- Chat can initiate a video call with a matched user.
- Backend call lifecycle supports:
  - create invite
  - accept
  - decline
  - end
  - fetch Stream user token
- Frontend call UX includes:
  - incoming call banner
  - ringing / accepted / ended states
  - Stream call join flow
  - cleanup when leaving the screen

### App-wide live data and state handling

- Redux slices are active for:
  - auth
  - profile
  - discovery
  - matches
  - chat
  - users / swap requests
- `DataProvider` subscribes globally to matches for the signed-in user.
- Profile data is subscribed in real time from Firestore.

## 5. Backend and Firestore Footprint

### Main Firestore collections used by the app

- `users`
- `likes`
- `matches`
- `matches/{matchId}/messages`
- `notifications`
- `swapRequests`
- `calls`
- `skills`
- `creditLedger`
- `payments`
- `purchaseEvents`

### Cloud Functions implemented

- Firestore triggers:
  - `onLikeCreated`
  - `onMessageCreated`
  - `onMatchCreated`
  - `seedNewUserCredits`
- Callable functions:
  - `spendCredits`
  - `createRazorpayOrder`
  - `verifyRazorpayPayment`
  - `getStreamVideoToken`
  - `createVideoCallInvite`
  - `acceptVideoCallInvite`
  - `declineVideoCallInvite`
  - `endVideoCall`
  - `deleteChatThread`
  - `acceptRequest`
  - `declineRequest`
- HTTP webhooks:
  - `razorpayWebhook`
  - `revenueCatWebhook`

## 6. Implementation Status by Area

| Area | Status | Notes |
|---|---|---|
| Auth | Implemented | Google, Apple, email/password, password reset |
| Profile onboarding | Implemented | Photo, location, skills, completeness gating |
| Profile editing | Implemented with caveats | UI exists, but see data-update gap below |
| Discovery | Implemented | Swipe flow, filters, likes, passes, limits |
| Matching | Implemented | Both client-side and backend trigger paths exist |
| Requests | Legacy + active | `swapRequests` still coexist with like-based requests |
| Chat | Implemented | Real-time text and image messages |
| Notifications | Implemented | In-app inbox and push trigger paths exist |
| Credits | Implemented | Callable spend + ledger writes |
| Razorpay payments | Implemented | Client + callable + webhook path |
| RevenueCat subscriptions | Implemented | Client entitlement checks + webhook sync |
| Video calling | Implemented | Stream-based invite / answer / end flow |
| Testing | Minimal | Setup file exists, but no meaningful test suite was found |

## 7. Important Gaps, Drift, and Known Risks

These are the main things a new teammate should know before assuming the repo is fully production-ready.

### 1. `upsertUserProfile` does not update many existing profile fields

In `src/services/firestoreService.ts`, the update path for existing user docs currently only writes:

- `email`
- `displayName`
- `photoURL`
- `hasPhoto`
- `updatedAt`

That means calls trying to update existing users with:

- `bio`
- `location`
- `teachSkills`
- `wantSkills`
- `pushToken`
- `lastActive`
- other profile fields

will not fully persist through this helper.

This affects the accuracy of:

- edit profile updates
- notification token storage
- presence / activity fields

### 2. Discovery is not truly geospatial yet

The product copy suggests “nearby” discovery, but the current discovery feed is a Firestore query ordered by rating and filtered client-side. There is no real geospatial search implementation in the active discovery code.

### 3. Match creation logic exists in two places

There is client-side match creation in `src/services/matchingService.ts` and backend match creation in the `onLikeCreated` trigger. That duplication can create long-term drift or edge-case inconsistencies even if it works for now.

### 4. Legacy and current request models coexist

The app still uses both:

- `likes`
- `swapRequests`

The UI merges them into one Requests experience, which is functional but increases complexity and makes the domain model harder to reason about.

### 5. Payment / subscription state is represented in multiple ways

Different parts of the repo use different fields such as:

- `isPremium`
- `premiumExpiresAt`
- `hasPremiumAccess`
- RevenueCat entitlement checks directly

This means the monetization model is implemented, but not yet fully normalized.

### 6. Some chat-related code is stale or unused

There are chat hooks/components in the repo that no longer match the current `chatService` API, including stale references such as:

- `subscribeToMessages`
- `markMessageAsRead`
- typing-status helpers that are not exported anymore

These look like older chat abstractions left behind after the current GiftedChat-based flow was introduced.

### 7. Root app TypeScript does not currently pass

Verification run on 2026-04-14:

- Root app: `npx tsc --noEmit` fails
- Functions package: `npm run build` passes

The root TypeScript errors are mainly from:

- stale chat hooks/components
- `MessageDocument` type drift
- GiftedChat dependency typing mismatches
- missing `vitest` type dependency for the test setup file

### 8. Testing is not established yet

There is a test setup file under `src/__tests__/setup.ts`, but no meaningful test suite was found in the app or functions source.

### 9. Placeholder / empty server files exist

These files are currently empty:

- `server.js`
- `src/routes/statusRoutes.js`
- `src/controllers/statusController.js`

They do not appear to participate in the active mobile app runtime.

## 8. Recommended Mental Model for New Contributors

If someone is onboarding to this repo, the most accurate mental model is:

1. The app is already feature-rich on the client.
2. Firebase Auth, Firestore, Storage, notifications, payments, and video calling are all wired in some form.
3. The project is in a transition phase, with both modern and legacy patterns still present.
4. The main work left is consistency, cleanup, and production hardening rather than greenfield feature scaffolding.

## 9. Best Files to Read First

- `app/_layout.tsx`
- `app/index.tsx`
- `app/(tabs)/discover.tsx`
- `app/(tabs)/matches.tsx`
- `app/chat/[id].tsx`
- `src/components/DataProvider.tsx`
- `src/services/firestoreService.ts`
- `src/services/matchingService.ts`
- `src/services/chatService.ts`
- `src/services/notificationService.ts`
- `functions/src/index.ts`
- `functions/src/payments.ts`
- `functions/src/videoCalls.ts`
- `functions/src/requests.ts`

