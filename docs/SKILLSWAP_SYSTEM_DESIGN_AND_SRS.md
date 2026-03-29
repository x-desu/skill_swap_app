# SkillSwap Production Architecture and Software Requirements Specification

**Document Status:** Production Baseline  
**Version:** 1.0  
**Last Updated:** March 28, 2026  
**Applies To:** Mobile app, Firebase backend, Firestore schema, Cloud Functions, and all future feature work  
**Audience:** Engineers, AI coding agents, product, QA, architecture reviewers

## 1. Purpose

This document is the canonical production architecture and SRS for SkillSwap. It defines the only approved system design for domain data, trusted writes, client behavior, backend responsibilities, and scaling rules.

Every code change, design decision, schema change, and AI-generated implementation must align with this document. Any proposal that conflicts with it should be treated as non-compliant unless this document is formally updated first.

## 2. Product Summary

SkillSwap is a mobile-first skill exchange platform where users:

- create and maintain profiles
- list skills they can teach
- list skills they want to learn
- discover other users
- like or pass profiles
- form mutual matches
- exchange messages in real time
- receive backend-generated notifications
- build trust through reviews and completed swaps

The system is designed for real-time mobile usage, offline tolerance, strong data ownership boundaries, and backend-enforced integrity.

## 3. Canonical Architectural Principles

The following principles are mandatory:

1. **Firestore is the single source of truth for domain data.**
2. **The client is responsible for UX, subscriptions, optimistic rendering, and user input.**
3. **Cloud Functions are responsible for trusted writes, side effects, projections, counters, moderation, and fanout.**
4. **There must be no parallel production state model.**
5. **Offline behavior relies on Firestore persistence, not duplicated local stores.**
6. **All backend workflows must be idempotent.**
7. **Feature work must preserve exact collection names and field names defined here.**

## 4. Approved Technology Stack

| Layer | Technology | Responsibility |
|---|---|---|
| Client Shell | Expo Router + React Native + TypeScript | Navigation, screens, native app shell |
| State Management | Redux Toolkit + hook state | Auth/session flags only in Redux; local UI state in hooks |
| UI | NativeWind + Gluestack UI | Theming, primitives, screen composition |
| Identity | Firebase Auth | Google, Apple, email authentication |
| Database | Firestore | Canonical operational data and realtime subscriptions |
| Storage | Firebase Storage | Media uploads and retrieval |
| Backend | Firebase Cloud Functions | Trusted writes, event handlers, counters, moderation, notifications |
| Notifications | Expo Push + FCM | Device push delivery |
| Observability | Firebase Crashlytics via React Native Firebase | Crash and runtime diagnostics |

## 5. High-Level System Architecture

### 5.1 Responsibility Split

**Client-owned responsibilities**

- authentication flows
- screen rendering
- realtime subscriptions
- optimistic interaction states
- paginated list loading
- safe direct writes to allowed collections
- upload initiation for profile and chat media

**Backend-owned responsibilities**

- match creation
- notification document creation
- push fanout
- counters and projections
- credit ledger writes
- review aggregation
- moderation and block enforcement
- unread counts and message summaries
- idempotent deduplication of event processing

### 5.2 Architectural Rule

The client may never act as the source of truth for:

- matches
- notifications
- credits or ledger entries
- derived counters
- moderation state
- review aggregates

## 6. Source of Truth Matrix

| Domain | Source of Truth | Write Owner | Read Pattern | Caching Strategy |
|---|---|---|---|---|
| Auth | Firebase Auth | Firebase | Auth listener | SDK persistence |
| Profile | `users/{uid}` | Client for editable fields, backend for computed fields | Realtime subscription | Firestore offline cache |
| Likes | `likes/{autoId}` | Client | Filtered queries by `fromUid` and `toUid` | Firestore query cache |
| Matches | `matches/{autoId}` | Backend only | Realtime subscription | Firestore offline cache |
| Messages | `matches/{matchId}/messages/{autoId}` | Client payload, backend side effects | Realtime with cursor pagination | Firestore offline cache |
| Notifications | `notifications/{autoId}` | Backend only | Query by `userId` | Firestore query cache |
| Credits | `creditLedger/{autoId}` | Backend only | Aggregate query or projection read | Client projection only |
| Reviews | `reviews/{autoId}` | Backend only | Query by `targetUid` | Firestore query cache |
| Blocks | `userBlocks/{autoId}` | Backend only | Query by `fromUid` or `targetUid` | Firestore query cache |
| Reports | `reports/{autoId}` | Backend only | Admin/backend reads | Firestore query cache |

## 7. Firestore Schema Contract

All fields below are canonical unless otherwise approved.

### 7.1 `users/{uid}`

```json
{
  "displayName": "string",
  "photoURL": "string",
  "email": "string",
  "bio": "string",
  "location": "geoPoint",
  "teachSkills": ["string"],
  "wantSkills": ["string"],
  "rating": 0,
  "reviewCount": 0,
  "completedSwaps": 0,
  "credits": 0,
  "isProfileComplete": true,
  "hasPhoto": true,
  "devices": {
    "deviceId": {
      "pushToken": "string",
      "lastActive": "timestamp"
    }
  },
  "isOnline": false,
  "lastActive": "timestamp",
  "swipeRightCount": 0,
  "mutualMatches": 0
}
```

**Ownership rules**

- editable profile fields are client-writable for the authenticated owner
- computed fields such as `credits`, `rating`, `reviewCount`, `completedSwaps`, `swipeRightCount`, and `mutualMatches` are backend-managed
- device push tokens are written through authenticated device registration flows and validated server-side where needed

### 7.2 `likes/{autoId}`

```json
{
  "fromUid": "string",
  "toUid": "string",
  "type": "like",
  "createdAt": "timestamp"
}
```

or

```json
{
  "fromUid": "string",
  "toUid": "string",
  "type": "pass",
  "createdAt": "timestamp"
}
```

**Rules**

- written by client only for the authenticated user as `fromUid`
- immutable after creation
- used as event input to backend match evaluation

### 7.3 `matches/{autoId}`

```json
{
  "users": ["uid1", "uid2"],
  "matchedAt": "timestamp",
  "lastMessage": {
    "text": "string",
    "senderUid": "string"
  },
  "lastMessageTime": "timestamp",
  "unreadCount": {
    "uid1": 0,
    "uid2": 0
  },
  "typingStatus": {
    "uid1": false,
    "uid2": true
  },
  "isBlocked": false
}
```

**Rules**

- `users` must always be stored as a sorted two-element array
- created only by backend after mutual like detection
- `unreadCount` is backend-managed
- `isBlocked` is backend-managed
- `typingStatus` may be updated through a controlled participant write path if preserved by rules, otherwise through backend mediation

### 7.4 `matches/{matchId}/messages/{autoId}`

```json
{
  "text": "string or null",
  "image": "string or null",
  "createdAt": "serverTimestamp",
  "user": {
    "uid": "string",
    "displayName": "string"
  },
  "readBy": ["string"],
  "status": "sent"
}
```

**Rules**

- message ordering uses `createdAt`
- client may create the payload for its own identity only
- backend updates related aggregates and notifications
- message update/delete paths must be restricted unless formally specified

### 7.5 `notifications/{autoId}`

```json
{
  "userId": "string",
  "type": "match",
  "title": "string",
  "body": "string",
  "data": {
    "matchId": "string",
    "screen": "string"
  },
  "read": false,
  "createdAt": "timestamp"
}
```

**Rules**

- backend only creation
- owner-only reads
- mutation rights should be limited to safe read-state changes if enabled

### 7.6 Additional Production Collections

#### `creditLedger/{autoId}`

Records immutable credit changes.

Recommended fields:

```json
{
  "userId": "string",
  "delta": 5,
  "reason": "swap_completed",
  "referenceId": "string",
  "createdAt": "timestamp",
  "createdBy": "backend"
}
```

#### `reviews/{autoId}`

Immutable review records written by backend after workflow validation.

Recommended fields:

```json
{
  "authorUid": "string",
  "targetUid": "string",
  "matchId": "string",
  "rating": 5,
  "comment": "string",
  "createdAt": "timestamp"
}
```

#### `userBlocks/{autoId}`

Represents trusted block actions.

Recommended fields:

```json
{
  "fromUid": "string",
  "targetUid": "string",
  "reason": "string",
  "createdAt": "timestamp"
}
```

#### `reports/{autoId}`

Records moderation reports for backend and admin handling.

Recommended fields:

```json
{
  "fromUid": "string",
  "targetUid": "string",
  "matchId": "string or null",
  "messageId": "string or null",
  "reason": "string",
  "details": "string",
  "createdAt": "timestamp",
  "status": "open"
}
```

## 8. State Management Policy

### 8.1 Approved State Layers

- **Redux Toolkit**
  - authenticated user session
  - auth loading state
  - app hydration flags
  - permission flags such as push notification permission state

- **Hook state**
  - input fields
  - temporary optimistic UI state
  - pagination cursors
  - loading and error states scoped to screens and hooks

- **Firestore subscriptions**
  - all domain data that must stay live and canonical

### 8.2 Prohibited Patterns

- no production use of Zustand for canonical app state
- no mirrored shadow data stores for users, matches, or messages
- no separate local domain model that disagrees with Firestore

### 8.3 Migration Rule

Any remaining Zustand usage in production paths must be moved to:

- Firestore-backed hooks for live domain data
- Redux only where session-wide app state is justified

Legacy demo or test-only state may remain isolated under non-production paths.

## 9. Query and Mutation Standards

### 9.1 Read Patterns

**Realtime subscriptions**

- use `onSnapshot()` for profile, matches, chat, and notifications where low-latency updates are expected

**Paginated lists**

- use `limit(n)` with `startAfter(lastDoc)`
- never use `offset()`
- discovery and message history must be cursor-based

**Offline behavior**

- Firestore persistence must be enabled for supported native environments
- UI must tolerate stale-but-cached reads while network reconnects

### 9.2 Write Patterns

**Client-safe writes**

- create a like/pass document
- create a message payload in an allowed match
- update editable fields on the current user's profile
- update local UI state optimistically

**Backend-only writes**

- create match documents
- write notification documents
- update unread counts
- update `lastMessage` and `lastMessageTime`
- create or update credits projections
- write ledger entries
- aggregate reviews
- apply moderation or block effects

### 9.3 Timestamp Standard

All ordering-sensitive writes must use `serverTimestamp()` or an equivalent trusted server-side timestamp. Client-generated local timestamps may be used only for temporary optimistic rendering and must not be treated as canonical ordering keys.

## 10. Idempotency and Event Safety

All event-driven backend logic must be idempotent.

### 10.1 Match Creation Rule

When processing a new like:

- compute a deterministic pair key using the sorted UIDs
- confirm whether the reverse like exists
- check whether the match already exists
- create at most one match document for the pair

### 10.2 Notification Fanout Rule

Notification handlers must safely tolerate:

- Cloud Function retries
- duplicate event deliveries
- partial push delivery failures

Use deterministic deduplication keys, transaction guards, or event IDs to prevent duplicate user-facing notifications.

### 10.3 Counter Update Rule

Unread counts, swipe counters, and match counters must be updated in transactions or another atomic backend-safe pattern.

## 11. Domain Flows

### 11.1 Matching Flow

1. Client writes `likes/{autoId}` with `type = "like"`.
2. Client updates UI optimistically.
3. Backend trigger evaluates the reciprocal like.
4. Backend creates `matches/{autoId}` if and only if mutual interest exists and no prior match exists.
5. Backend updates counters and writes notifications.
6. Client sees the new match through a realtime subscription.

### 11.2 Pass Flow

1. Client writes `likes/{autoId}` with `type = "pass"`.
2. Client immediately removes the card from the local discovery stack.
3. Backend may update analytical counters, but no match path is created.

### 11.3 Chat Flow

1. Client creates a message payload under `matches/{matchId}/messages/{autoId}`.
2. Client renders the optimistic message locally.
3. Backend updates `lastMessage`, `lastMessageTime`, unread counters, and notification fanout.
4. Client subscription reconciles the temporary state with canonical Firestore state.

### 11.4 Notification Flow

1. A trusted event occurs such as a new match, message, or review.
2. Backend writes a notification document.
3. Backend resolves active devices from the recipient user record.
4. Backend sends Expo Push notifications to eligible device tokens.
5. Client subscriptions update notification list and unread badge state.

### 11.5 Credits and Ledger Flow

1. A trusted business event occurs such as swap completion.
2. Backend validates the event.
3. Backend writes immutable `creditLedger` entries.
4. Backend updates the `users/{uid}.credits` projection.
5. Client reads the projection for fast UX and the ledger for history views.

### 11.6 Moderation Flow

1. User initiates a report or block request.
2. Backend validates actor identity and allowed action.
3. Backend writes `reports` or `userBlocks`.
4. Backend updates affected matches or visibility rules as needed.
5. Client views are filtered using the resulting trusted state.

## 12. Module and Code Organization

The canonical application structure is:

```text
src/
  features/
    auth/
    profile/
    discovery/
    matching/
    chat/
    notifications/
    wallet/
    settings/
  shared/
    firebase/
    services/
    hooks/
    types/
    utils/
```

### 12.1 Ownership Rule

Each feature should own:

- screens
- hooks
- feature-local services
- feature-local tests
- feature-specific types unless promoted to shared domain types

### 12.2 Shared Layer Rule

The shared layer should contain:

- Firebase initialization and wrappers
- domain types reused across features
- shared utility functions
- common hook infrastructure
- cross-feature service helpers

## 13. Security Model

### 13.1 Principles

- authenticated access only for protected collections
- least privilege by collection and document ownership
- server ownership for trusted writes
- validation of field shape, actor identity, and allowed mutations
- no client authority over derived or moderation-sensitive data

### 13.2 Baseline Firestore Rules Shape

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth.uid == uid;
    }

    match /matches/{matchId} {
      allow read: if request.auth != null
        && resource.data.users.hasAny([request.auth.uid]);
      allow write: if false;
    }

    match /matches/{matchId}/messages/{msgId} {
      allow read: if request.auth != null
        && get(/databases/$(database)/documents/matches/$(matchId)).data.users
          .hasAny([request.auth.uid]);
      allow create: if request.auth != null
        && request.resource.data.user.uid == request.auth.uid;
    }

    match /notifications/{notifId} {
      allow read: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if false;
    }
  }
}
```

### 13.3 Hardening Requirements

- validate max string lengths
- validate array size limits
- validate allowed enum values
- validate immutable fields on update
- validate participant membership on message creation
- rate-limit abuse-sensitive actions through backend or App Check aligned controls
- protect all backend-only collections from direct client writes

## 14. Functional Requirements

### 14.1 Authentication and Session

- Users shall sign in with Google, Apple, or email/password.
- The client shall subscribe to auth state changes at app startup.
- The app shall route users based on authentication state and profile completeness.
- The app shall persist session state according to Firebase Auth behavior.

### 14.2 Profile Management

- Users shall create and edit their own profile in `users/{uid}`.
- Users shall manage `teachSkills` and `wantSkills`.
- The app shall track `isProfileComplete` and `hasPhoto`.
- Computed profile metrics shall be backend-managed only.

### 14.3 Discovery

- The app shall present users with a cursor-based discovery feed.
- Discovery results shall exclude blocked users, the current user, and already acted-on candidates as business rules require.
- Discovery reads shall be optimized for mobile performance and offline tolerance.

### 14.4 Likes and Matching

- Users shall be able to like or pass another user.
- The client shall write only the `likes` record.
- Mutual matches shall be created by backend only.
- Duplicate match creation shall be prevented through idempotent backend logic.

### 14.5 Messaging

- Matched users shall be able to exchange realtime text messages.
- Messages shall be stored under `matches/{matchId}/messages/{autoId}`.
- Message ordering shall be based on server timestamps.
- Message history shall support cursor-based pagination.
- Backend shall maintain match-level summaries and unread counts.

### 14.6 Notifications

- Match, message, and review notifications shall be created by backend only.
- The client shall read notifications by querying `userId`.
- Tapping a notification shall route users to the intended destination when supported by the payload.

### 14.7 Wallet and Credits

- User-visible credit balances shall derive from backend-managed projections.
- Immutable ledger entries shall be stored separately from the balance projection.
- The client shall never directly mint, spend, or adjust credits.

### 14.8 Reviews

- Reviews shall be written only through trusted backend workflows.
- Aggregate rating data on user profiles shall be backend-managed.

### 14.9 Blocks and Reports

- Block and report actions shall be enforced through trusted backend paths.
- Blocking shall affect visibility and communication according to backend policy.
- Report records shall be immutable from the client perspective once submitted.

## 15. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Discovery initial load under 2 seconds on expected network conditions |
| Performance | Optimistic message send perceived under 500 ms |
| Reliability | Firestore offline persistence enabled where supported |
| Reliability | Backend handlers remain safe under retry and duplicate delivery |
| Security | No client writes to backend-owned projections or notifications |
| Scalability | Cursor pagination required for discovery and messages |
| Scalability | Counters and aggregates must support growth to 100k+ users |
| Observability | Crashlytics, backend logs, and event metrics must be enabled in production |

## 16. Observability and Operations

### 16.1 Mobile Observability

- capture crashes with Crashlytics
- record key flow failures such as auth issues, message send failures, and profile write failures
- expose enough metadata to debug environment-specific issues without logging sensitive content

### 16.2 Backend Observability

- structured logs for match creation, notification fanout, and ledger updates
- function-level error metrics and retry visibility
- event counters for throughput and failure analysis

### 16.3 Operational Rules

- production incidents affecting data integrity should prioritize backend disablement or guardrail changes before client patching alone
- schema changes must preserve backward compatibility during rollout or be coordinated with explicit migrations

## 17. Indexing and Query Requirements

Composite indexes must be provisioned for all multi-field queries used in:

- discovery feed filtering and ordering
- likes lookup by `fromUid`, `toUid`, and `type`
- matches list ordering by `lastMessageTime`
- notifications by `userId` and `createdAt`
- reviews by `targetUid` and `createdAt`
- message history by `createdAt`

Index definitions must be versioned in repository configuration and treated as required infrastructure for release readiness.

## 18. Legacy Cleanup and Migration Rules

The following legacy patterns are deprecated for production:

- `src/store/useStore.ts` as a production domain store
- legacy `swapRequests` production flows
- duplicate domain types that diverge from Firestore contracts
- client-generated notifications

### 18.1 Required Cleanup Direction

- move Zustand production usage to Firestore-backed hooks or Redux auth-only state
- remove `swapRequests` after migration completion
- unify domain types under shared production contracts
- delete or isolate demo-only state models under clearly non-production paths

## 19. Engineering Guardrails for AI Agents and Developers

1. Always start from this document before proposing or generating code.
2. Never invent alternate stacks, stores, or schemas.
3. Never add client writes for matches, notifications, counters, credits, ledger, or moderation state.
4. Use exact collection names and field names defined here.
5. Use cursor-based pagination, never `offset()`.
6. Treat Firestore as canonical domain state and Redux as auth/session state only.
7. Build all backend event handlers to be idempotent.
8. Propose incremental PRs against this baseline rather than architectural rewrites.

## 20. Delivery Checklist for New Features

Before merging a new production feature, confirm:

- schema matches this document
- writes respect ownership boundaries
- security rules are updated if needed
- indexes are added if queries require them
- Cloud Functions are idempotent
- realtime and pagination behavior are defined
- offline behavior has been considered
- observability hooks exist for failure paths
- no new parallel state store was introduced

## 21. Change Control

This document is the canonical baseline. Any architecture change affecting:

- collection structure
- field names
- write ownership
- trusted backend flows
- state management policy
- security model

must update this document in the same change set as the code. Code must not silently redefine architecture.

## 22. Appendix: Canonical Implementation Summary

### 22.1 Approved Client Pattern

- subscribe to Firestore for live domain data
- keep Redux focused on auth/session flags
- use hook-local state for view concerns
- render optimistically, then reconcile from Firestore

### 22.2 Approved Backend Pattern

- trigger on trusted events
- validate actor and document shape
- deduplicate safely
- write canonical aggregates and notifications
- log outcomes for debugging and metrics

### 22.3 Explicitly Rejected Patterns

- client-created match documents
- client-created notification documents
- client-managed unread counters as source of truth
- wallet balances stored only in local state
- parallel Zustand production architecture
- pagination using offsets
