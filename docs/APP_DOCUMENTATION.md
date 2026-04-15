# SkillSwap App Documentation

Document status: Current codebase snapshot  
Last reviewed: April 14, 2026  
Scope: App behavior and architecture as implemented in the local workspace

## 1. Overview

SkillSwap is a mobile app for exchanging skills with nearby or relevant people. Each user builds a profile with teachable skills and desired skills, explores other users, proposes swaps, forms matches, chats in real time, starts video calls, receives notifications, and can pay for extra actions or premium access.

This document is an app-level guide for the current codebase. It is meant to complement the deeper SRS documents already stored in `docs/`.

## 2. Product Snapshot

The current workspace reflects an app that is centered on:

- social skill discovery
- mutual matching and swap requests
- real-time messaging
- live notifications
- video calling between matched users
- credits and subscription-based monetization

The code also shows an in-progress cleanup where legacy `src/screens/*` screen files are being removed in favor of Expo Router routes under `app/`.

## 3. Primary User Journeys

### 3.1 Sign In And Onboard

1. A user lands on the auth flow and signs in with Google, Apple, or email.
2. Firebase Auth resolves the session.
3. The app upserts a Firestore user document and starts a live profile listener.
4. If the profile is incomplete, the user is sent to profile setup.
5. The user adds a display name, profile photo, skills offered, skills needed, and location.

### 3.2 Discover Other People

SkillSwap currently has two discovery surfaces:

- `Home`
  A curated browse experience with horizontally scrollable profile cards and a direct "Propose Swap" action.
- `Discover`
  A swipe-oriented screen with filters, daily action limits, and credit-based overflow once free usage is exhausted.

### 3.3 Requests, Matches, And Chat

1. A user likes another user.
2. If the like is not mutual yet, the other user receives a swap request notification.
3. If the like becomes mutual, a `matches/{matchId}` document is created.
4. The matched pair sees the relationship in the `Matches` screen.
5. They can chat in real time, send images, and mark notifications as read.

### 3.4 Video Calling

1. A matched user starts a video call from chat.
2. The app creates a call invite through Firebase Functions.
3. Stream Video is used for token generation and media sessions.
4. The call lifecycle is tracked in Firestore and reflected in the call screen.

### 3.5 Payments And Subscription Management

1. Users can buy credit packs through Razorpay.
2. Users can manage subscriptions through RevenueCat and the customer center.
3. The app uses daily free limits and credit spending for extra swipes and messages.

## 4. Navigation Map

### Root Navigation

- `app/index.tsx`
  Auth gate and routing entrypoint.
- `app/_layout.tsx`
  Global providers, auth hydration, notification setup, and stack routing.

### Auth Routes

- `app/(auth)/welcome.tsx`
- `app/(auth)/sign-up.tsx`
- `app/(auth)/sign-in.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/profile-setup.tsx`

### Main Tab Routes

- `app/(tabs)/index.tsx`
  Alias to the home screen.
- `app/(tabs)/home.tsx`
  Curated discovery and quick swap proposals.
- `app/(tabs)/discover.tsx`
  Swipe flow with filters and credit gating.
- `app/(tabs)/matches.tsx`
  Combined requests and messages area.
- `app/(tabs)/profile.tsx`
  User profile and account overview.

### Hidden Or Supporting Routes

- `app/(tabs)/wallet.tsx`
- `app/paywall.tsx`
- `app/customer-center.tsx`
- `app/notifications.tsx`
- `app/edit-profile.tsx`
- `app/settings.tsx`
- `app/match-celebration.tsx`
- `app/chat/[id].tsx`
- `app/call/[id].tsx`
- `app/splash.tsx`

## 5. Frontend Architecture

### 5.1 App Shell

The client uses:

- Expo Router for navigation and route grouping
- Redux Toolkit for cross-screen state
- React hooks for feature logic and subscriptions
- Gluestack UI plus custom styles for UI composition

### 5.2 Global Providers

`app/_layout.tsx` wires the main runtime:

- Redux `Provider`
- `GluestackUIProvider`
- custom `ThemeProvider`
- `DataProvider` for match listeners
- global incoming call banner

### 5.3 Auth And App Hydration

Auth resolution is driven by Firebase `onAuthStateChanged`. When a session becomes available:

- Redux auth state is updated
- the Firestore user profile is created or merged if missing
- a live profile listener is attached
- notification listeners are configured
- notification permissions are requested

This makes Firestore the operational source of truth for the user profile after login.

## 6. State Management

The app uses Redux Toolkit for shared state. Based on the current code, the important slices are:

- `authSlice`
  Session state, auth loading, profile completion flag, and auth errors.
- `profileSlice`
  Live Firestore-backed user profile data.
- `matchesSlice`
  Current user matches loaded by `DataProvider`.
- `chatSlice`
  Per-room message caches.
- `discoverySlice`
  Discovery feed, swipe history, pagination, and local feed mutations.

Feature hooks sit on top of those slices to provide app behavior:

- `useDiscoveryFeed`
- `useDiscoverFilters`
- `useNotifications`
- `useSwapsData`
- `useSubscriptionStatus`
- `useUserPresence`

## 7. Feature Breakdown

### 7.1 Authentication

Implemented methods:

- Google sign-in
- Apple sign-in
- email sign-up
- email sign-in
- password reset

Relevant files:

- `src/store/authSlice.ts`
- `app/(auth)/*`

### 7.2 Profile Setup And Editing

The profile flow supports:

- display name
- profile photo upload
- bio
- city and country
- teach skills
- want skills
- skill autocomplete

Editing is available after onboarding through `app/edit-profile.tsx`.

Profile photos are uploaded to Firebase Storage at `users/{uid}/avatar.jpg`.

### 7.3 Discovery

There are two discovery experiences:

- `Home`
  Shows horizontally scrollable cards with direct proposal actions.
- `Discover`
  Shows a swipe stack with advanced filtering and usage gating.

Current filter behavior includes:

- category filtering
- search query filtering
- minimum rating
- online only
- has credits
- match my skills

Important implementation note:

- distance filtering is not truly active yet because the user schema stores `city` and `country`, not coordinates; the hook explicitly skips geographic distance calculations for now

The discovery feed excludes:

- the signed-in user
- users already swiped by the signed-in user

### 7.4 Requests, Matches, And Messaging

The app currently mixes three relationship layers:

- `likes`
  Used for like and pass actions.
- `swapRequests`
  Legacy explicit requests that can still be accepted or declined.
- `matches`
  Active mutual relationships between two users.

`app/(tabs)/matches.tsx` combines this data into two segments:

- `Requests`
  Pending inbound and outbound actions from likes and swap requests.
- `Messages`
  Active match conversations with unread counts and previews.

Chat features include:

- real-time Firestore message listener
- text messaging
- image message uploads
- optimistic UI updates
- unread notification tracking
- delete-chat callable for thread cleanup

### 7.5 Notifications

Notifications exist in two layers:

- local OS notifications via Expo Notifications
- in-app notifications stored in a root Firestore `notifications` collection

The app:

- requests permission after login
- stores Expo push tokens on the user profile
- updates badge counts from unread notification totals
- opens chat or requests directly from notification taps

### 7.6 Video Calls

Video calls are powered by:

- Firebase callable functions for invite lifecycle
- Stream Video for tokens and media sessions
- Firestore `calls` documents for live status tracking

The call screen handles:

- joining accepted calls
- terminal statuses like declined, cancelled, missed, and ended
- cleanup when leaving the route

### 7.7 Wallet, Credits, And Paywall

The current monetization model uses both credits and subscriptions.

Daily free action limits:

- swipes: 5
- messages: 10
- swap requests: 2
- follows: 5

Credit costs for overflow actions:

- extra swipe: 1 credit
- extra message: 1 credit
- extra swap request: 3 credits
- extra follow: 1 credit

The paywall currently sells three Razorpay credit packs:

- 10 credits for INR 50
- 25 credits for INR 100
- 75 credits for INR 250

The paywall also uses live location display to personalize the purchase experience.

### 7.8 Subscription Management

RevenueCat is used for subscription access and customer management.

Current subscription features:

- RevenueCat initialization
- customer info lookup
- entitlement check for `skillswap_pro`
- restore purchases
- open platform manage-subscription UI

The customer center screen is focused on managing an existing subscription, while the paywall is focused on buying credits.

## 8. Data Model And Backend Responsibilities

### 8.1 Main Firestore Collections

- `users`
  Profile, skills, credits, profile-complete flag, push token, engagement fields, and daily limits.
- `likes`
  Like and pass events.
- `matches`
  Mutual relationships and chat metadata.
- `matches/{matchId}/messages`
  Real-time messages for each match.
- `notifications`
  In-app notification records.
- `swapRequests`
  Legacy explicit request documents.
- `calls`
  Video call lifecycle documents.
- `payments`
  Razorpay transaction records.
- `creditLedger`
  Credit balance mutations and audit trail.

### 8.2 Cloud Functions

The backend includes Firestore triggers and callable functions.

Verified triggers and callables in the current workspace include:

- `onLikeCreated`
  Detects mutual likes, creates matches, and emits request or match notifications.
- `onMessageCreated`
  Creates in-app notifications and pushes for new chat messages.
- `createRazorpayOrder`
- `verifyRazorpayPayment`
- `spendCredits`
- `acceptRequest`
- `declineRequest`
- `deleteChatThread`
- `getStreamVideoToken`
- `createVideoCallInvite`
- `acceptVideoCallInvite`
- `declineVideoCallInvite`
- `endVideoCall`

The functions are deployed in the `asia-south1` region, which matches the India-focused payment and backend setup seen in the app.

## 9. Key Services

Client services in `src/services/` are the main boundary around external systems:

- `firestoreService.ts`
  User profile CRUD, nearby users, swap requests, limit helpers.
- `matchingService.ts`
  Like, pass, mutual match lookup, swiped-user tracking.
- `chatService.ts`
  Send messages, send image messages, listen to messages, request actions, delete threads.
- `notificationService.ts`
  Permission prompts, Expo notifications, badge counts, notification CRUD, routing.
- `storageService.ts`
  Profile and chat image uploads.
- `videoCallService.ts`
  Call lifecycle and Firestore listeners.
- `streamVideoService.ts`
  Stream client lifecycle.
- `razorpayService.ts`
  Checkout flow and callable verification.
- `revenueCatService.ts`
  Entitlement and subscription management.
- `creditsService.ts`
  Server-side credit spend calls.

## 10. Project Structure Guide

Use this as the quick mental map for the repo:

- `app/`
  Router-first screen layer.
- `src/components/`
  Shared UI, avatars, chat UI, discovery cards, providers.
- `src/hooks/`
  View-model style hooks for discovery, notifications, matches, swaps, chat, and purchases.
- `src/store/`
  Redux store, slices, and shared state types.
- `src/services/`
  Integration and domain-service layer.
- `functions/src/`
  Cloud Functions for trusted writes and side effects.
- `docs/`
  Deep feature specs and design references.

## 11. Local Development Checklist

To run the app reliably, make sure the following are in place:

- Firebase iOS and Android config files are present.
- Firestore, Functions, Storage, and Auth are enabled for the project.
- Firestore security rules are deployed and compatible with current routes.
- `app.json` includes required identifiers and `expo.extra.razorpayKeyId`.
- RevenueCat keys are configured for the correct platforms.
- Firebase Functions secrets are configured for Razorpay and Stream Video.

Useful scripts from `package.json`:

- `npm run start`
- `npm run ios`
- `npm run android`
- `npm run web`

## 12. Important Implementation Notes

- The main authenticated app flow is controlled by `app/index.tsx` plus `app/_layout.tsx`.
- `app/splash.tsx` still contains an older simulated initialization pipeline and should be treated as secondary unless you intentionally route through it.
- Discovery filters persist to AsyncStorage.
- Geographic distance filtering is not fully implemented because the user schema lacks stored coordinates.
- Account deletion is still a placeholder in settings.
- The wallet screen exists as a route, but the visible main navigation focuses on Home, Discover, Matches, and Profile.
- The current workspace suggests an ongoing migration away from legacy screen files toward the Expo Router `app/` directory.

## 13. Related Documentation

This file is the high-level entry point. For deeper specs, use:

- `docs/SKILLSWAP_SYSTEM_DESIGN_AND_SRS.md`
- `docs/DISCOVER_TAB_SRS.md`
- `docs/CHAT_SYSTEM_SRS.md`
- `docs/VIDEO_CALL_SRS.md`
- `docs/RAZORPAY_PAYMENT_SYSTEM_SRS.md`
- `docs/REVENUECAT_SUBSCRIPTIONS_SRS_AND_IMPLEMENTATION.md`
- `docs/SUBSCRIPTION_FEATURE_GATING_SRS.md`

## 14. Open Questions For Product Or Founder Input

The codebase answers most of the technical behavior, but a polished external-facing product doc would still benefit from owner input on:

- the primary target audience and geography
- the exact business meaning of followers, following, and sessions in the profile UI
- whether credits, subscriptions, and premium status should remain separate concepts or be unified
- whether `swapRequests` is still a first-class concept or only a compatibility layer during migration
- the launch readiness of the splash flow, wallet route, and account deletion flow

If those answers are clarified later, this document can be upgraded from codebase documentation into onboarding, investor, partner, or App Store support documentation.
