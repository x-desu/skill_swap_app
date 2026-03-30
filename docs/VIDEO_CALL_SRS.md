# SkillSwap Video Calling SRS

Version: 3.0
Date: 2026-03-30
Owner: SkillSwap Engineering
Status: Stream Video revision for the current chat system

---

## 1. Purpose

This document defines a video calling feature for SkillSwap that is embedded inside the existing chat system.

This revision assumes:
1. Chat remains on Firebase / Firestore.
2. Video and audio media are handled by Stream Video.
3. Call invitations and chat-linked call history remain under SkillSwap control.
4. MVP optimizes for build safety and foreground calling first.

---

## 2. Current Codebase Baseline

### 2.1 Existing App Stack

- Expo SDK `54.0.32`
- React Native `0.81.5`
- React `19.1.0`
- Expo Router `6.0.22`
- React Native Firebase (`app`, `auth`, `firestore`, `functions`, `storage`)
- Expo Notifications
- Native iOS and Android directories already committed

### 2.2 Existing Chat Architecture

- Matches live in `matches/{matchId}`
- Messages live in `matches/{matchId}/messages/{messageId}`
- Notifications live in top-level `notifications`
- Chat screens already exist and expose voice/video placeholders
- Firebase Cloud Functions already create notifications and push payloads

### 2.3 Important Baseline Risks

The repo is not currently in a perfect build state:
1. `npx expo-doctor` reports dependency drift and a New Architecture warning
2. `npx tsc --noEmit` currently fails in parts of the existing chat/matches code
3. `app.json` says `newArchEnabled: false`, while checked-in native projects currently have New Architecture enabled

Because of this, Stream integration must begin with a compatibility gate and must not assume the current build is already clean.

---

## 3. Provider Decision: Stream Video

### 3.1 Why Stream Video

Stream is the selected provider for this revision because:
1. It has an official React Native + Expo integration path
2. It supports managed calling infrastructure, reducing custom RTC work
3. It can be added without replacing the current Firestore chat system
4. It gives SkillSwap a faster path to reliable one-to-one calls than raw WebRTC

### 3.2 Cost Note

As of 2026-03-30, Stream publicly advertises a free monthly credit allowance for new/build-tier usage. Pricing can change, so billing must be rechecked before implementation starts, but the current pricing posture makes Stream reasonable for an MVP spike.

### 3.3 Stream Role in SkillSwap

Stream will be used for:
1. Video/audio session management
2. Participant media transport
3. Call state inside the active media session

Firebase / Firestore will continue to handle:
1. Match authorization
2. Chat history
3. Call invite state
4. Missed call markers
5. App-level notifications

This split keeps the current chat architecture intact while avoiding a full call backend from scratch.

---

## 4. Compatibility Assessment

### 4.1 Compatible With the Current App

The following are compatible with the current codebase:

1. Adding a video call button to the existing chat header
2. Foreground one-to-one call invites tied to `matchId`
3. Firebase callable functions that mint Stream tokens
4. Firestore-backed call invite state
5. A dedicated active call route inside Expo Router
6. Stream Video SDK as a native dependency in the existing iOS/Android projects

### 4.2 What Is Not Safe for MVP

The following should not be part of the first implementation:

1. Full Stream ringing-call setup with phone-like background incoming call UX
2. CallKeep / Telecom / VoIP push integration
3. Picture-in-picture
4. Group calls
5. Screen sharing
6. Recording
7. Background audio continuity guarantees

### 4.3 Practical Compatibility Conclusion

Stream is a strong fit for this repo if MVP is scoped to:
1. In-chat call initiation
2. Foreground incoming call handling
3. Foreground active call screen
4. Best-effort reconnect when returning to foreground quickly

Stream becomes much riskier if MVP also tries to ship:
1. Ringing calls while app is backgrounded
2. OS-level incoming call UI
3. Full push-routing and telephony behavior on day one

---

## 5. Product Scope

### 5.1 In Scope for MVP

1. One-to-one video calls between matched users
2. Call start from the chat header
3. Incoming in-app call prompt when the receiver is in the foreground
4. Accept, decline, cancel, timeout, and end flows
5. Mute/unmute microphone
6. Enable/disable camera
7. Switch front/back camera
8. Audio-only mode by turning camera off
9. Call duration timer
10. Missed-call and ended-call chat events

### 5.2 Out of Scope for MVP

1. Background ringing with native call UI
2. Group calls
3. Screen sharing
4. Call recording
5. Picture-in-picture
6. Advanced connection quality UI
7. Post-call ratings
8. Scheduled calls

### 5.3 MVP Success Criteria

1. No new TypeScript failures are introduced
2. No new Expo Doctor failures are introduced
3. iOS and Android development builds succeed after Stream integration
4. A matched user can complete a foreground call end-to-end
5. Unauthorized users cannot create or join a call

---

## 6. User Experience Requirements

### 6.1 Chat Integration

- Add a video call icon to the chat header
- Keep the feature available only in matched-user chats
- Show disabled state when the current user already has an active call invite or active call
- Keep chat navigation and message history unchanged

### 6.2 Incoming Call UX

Foreground behavior:
1. Show a full-screen or modal incoming call UI
2. Display caller name and avatar
3. Provide `Accept` and `Decline`
4. Auto-timeout after 30 seconds

Background behavior:
1. MVP does not promise full ringing-call behavior
2. Existing push notifications may be used to bring the user back into the app
3. The call can be marked missed if the user does not return in time

### 6.3 Active Call UX

- Full-screen call screen
- Remote participant video as primary view
- Local preview thumbnail
- Controls:
  - mute/unmute
  - camera on/off
  - switch camera
  - end call
- Show call duration after connection

### 6.4 Chat Timeline UX

Add system-style chat events for:
1. `Missed call`
2. `Call declined`
3. `Call ended`

These call events belong in the current chat thread so the feature feels native to messaging.

---

## 7. High-Level Architecture

### 7.1 Source of Truth Split

Firestore is the source of truth for invite state.

Stream is the source of truth for the live media session.

### 7.2 Key Collections and Services

Firestore:
1. `matches/{matchId}`
2. `matches/{matchId}/messages/{messageId}`
3. `notifications/{id}`
4. New top-level `calls/{callId}`

Cloud Functions:
1. `getStreamVideoToken`
2. `createCallInvite`
3. `acceptCallInvite`
4. `endCall`
5. Optional cleanup for stale invites

Client:
1. `StreamVideoClient` bootstrap after auth
2. Chat header integration
3. Incoming call overlay
4. Active call screen

### 7.3 Recommended Flow

```
Caller taps Video in chat
    |
    v
Callable Function: createCallInvite(matchId, calleeUid)
    |
    +--> validate match membership
    +--> create Firestore calls/{callId}
    +--> create Stream call metadata / members
    +--> create notification for callee
    |
    v
Firestore calls/{callId} status = "ringing"
    |
    +--> caller listener
    +--> callee listener
    |
    v
Callee accepts
    |
    v
Callable Function: acceptCallInvite(callId)
    |
    +--> validate participant
    +--> update Firestore status = "accepted"
    |
    v
Both clients fetch Stream auth token
    |
    v
Both join the Stream call
    |
    v
Firestore status = "connected"
```

---

## 8. Firestore Data Model

Add a top-level `calls` collection for invite and lifecycle state.

```ts
type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'connecting'
  | 'connected'
  | 'declined'
  | 'missed'
  | 'cancelled'
  | 'ended'
  | 'failed';

interface CallDocument {
  id: string;
  matchId: string;
  callerUid: string;
  calleeUid: string;
  participantUids: [string, string];
  provider: 'stream';
  streamCallType: 'default';
  streamCallId: string;
  status: CallStatus;
  startedWithVideo: boolean;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  connectedAt?: Timestamp;
  endedAt?: Timestamp;
  updatedAt: Timestamp;
  endedBy?: string;
  endReason?: 'declined' | 'missed' | 'hangup' | 'timeout' | 'error' | 'network';
  expiresAt: Timestamp;
}
```

### 8.1 Why Firestore Still Matters

Even though Stream manages the call session, Firestore is still needed so SkillSwap can:
1. Tie invites to `matchId`
2. Enforce matched-user product rules
3. Render missed-call state in chat
4. Use the existing notification pipeline
5. Keep call history visible inside the conversation

---

## 9. Authentication and Security

### 9.1 Stream Token Strategy

Do not embed Stream secrets in the mobile app.

Use Firebase callable functions to:
1. Validate the current Firebase user
2. Create or sync the corresponding Stream user
3. Generate a short-lived Stream user token

### 9.2 Authorization Rules

Call creation rules:
1. Only authenticated users can create invites
2. Caller must be one of the users in the match
3. Callee must be the other matched user
4. Only one active ringing/connected call per match at a time

Call access rules:
1. Only call participants can read `calls/{callId}`
2. Only call participants can accept/decline/end
3. Non-participants cannot join a Stream call linked to another invite

### 9.3 Firestore Rules Direction

Recommended rule shape:

```text
match /calls/{callId} {
  allow read: if request.auth != null
    && request.auth.uid in resource.data.participantUids;

  allow create: if false; // callable function only

  allow update: if request.auth != null
    && request.auth.uid in resource.data.participantUids
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly([
      'status',
      'acceptedAt',
      'connectedAt',
      'endedAt',
      'updatedAt',
      'endedBy',
      'endReason'
    ]);
}
```

---

## 10. Stream SDK Integration Requirements

### 10.1 Dependencies

Use the official Stream React Native / Expo integration path.

Required packages for MVP:
1. `@stream-io/video-react-native-sdk`
2. `@stream-io/react-native-webrtc`
3. `@config-plugins/react-native-webrtc`
4. `@react-native-community/netinfo`

Already present and compatible with the plan:
1. `react-native-svg`
2. `expo-build-properties`
3. `@react-native-firebase/app`

### 10.2 App Config Requirements

Update Expo config to include:
1. Stream Video config plugin
2. WebRTC config plugin
3. Camera permission string
4. Microphone permission string
5. Android min SDK `24` through the existing `expo-build-properties` plugin

### 10.3 Development Model

This feature must be developed with native builds:
1. `expo run:ios`
2. `expo run:android`
3. Development builds if needed

Do not treat Stream Video as an Expo Go feature.

### 10.4 Root App Requirements

Before implementing Stream UI, confirm:
1. The app root is compatible with required gesture / native view setup
2. Stream provider is mounted after auth is resolved
3. Stream client cleanup happens on sign-out

---

## 11. Stream Client Lifecycle

### 11.1 Client Initialization

After Firebase auth resolves:
1. Fetch or refresh a Stream token from Firebase Functions
2. Create a `StreamVideoClient` for the signed-in user
3. Keep the client singleton in app-level state
4. Dispose of the client on sign-out

### 11.2 Call Join Strategy

Recommended approach:
1. Use the Firestore call invite as the product-level call object
2. Use `streamCallId = callId`
3. Have Cloud Functions create or validate the corresponding Stream call for the two participants
4. Join the Stream call only after the invite reaches `accepted`

This keeps call navigation deterministic and tied to the chat thread.

---

## 12. Notifications Strategy

### 12.1 MVP Notification Policy

Use the existing Firebase + Expo notification pipeline for MVP.

Send notifications for:
1. Incoming call invite
2. Missed call
3. Optional call accepted / callback later

### 12.2 Why MVP Avoids Stream Ringing Setup

Stream supports richer ringing behavior, but the official ringing setup adds extra native dependencies and platform complexity. That is not necessary for the first release.

Those extras are explicitly deferred:
1. `@react-native-firebase/messaging`
2. `@notifee/react-native`
3. `react-native-voip-push-notification`
4. `react-native-callkeep`
5. Additional iOS and Android background configuration

### 12.3 Product Decision

For MVP:
1. Foreground incoming call prompt is required
2. Background ringing is optional and deferred
3. Missed-call recovery inside chat is required

---

## 13. Functional Requirements

### 13.1 Core Lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Only matched users can start a call | P0 |
| FR-002 | Caller can start a video call from chat | P0 |
| FR-003 | Callee can accept or decline | P0 |
| FR-004 | Ringing invite times out after 30 seconds | P0 |
| FR-005 | Either side can end the call | P0 |
| FR-006 | Missed and ended call events appear in chat | P0 |

### 13.2 In-Call Controls

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-007 | Mute / unmute microphone | P0 |
| FR-008 | Camera on / off | P0 |
| FR-009 | Switch camera | P1 |
| FR-010 | Join with video by default | P0 |
| FR-011 | Continue as audio-only by disabling camera | P1 |
| FR-012 | Show elapsed call time | P1 |

### 13.3 Reliability and Safety

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-013 | Invite expires cleanly after timeout | P0 |
| FR-014 | Only participants can join the linked Stream call | P0 |
| FR-015 | App handles leave/end without orphaned call state | P0 |
| FR-016 | Foreground reconnect is best effort | P1 |
| FR-017 | Duplicate active invites for the same match are blocked | P1 |

---

## 14. Non-Functional Requirements

### 14.1 Build Safety

| ID | Requirement |
|----|-------------|
| NFR-001 | No new TypeScript failures |
| NFR-002 | No new Expo Doctor failures |
| NFR-003 | iOS dev build succeeds after Stream integration |
| NFR-004 | Android dev build succeeds after Stream integration |
| NFR-005 | Stream secrets remain server-side |

### 14.2 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-006 | Call setup on stable network | < 8 seconds |
| NFR-007 | Crash-free call sessions | > 99% |
| NFR-008 | Invite timeout | 30 seconds |
| NFR-009 | Call teardown state finalized | < 5 seconds |

### 14.3 Security

| ID | Requirement |
|----|-------------|
| NFR-010 | Only participants can read a call invite |
| NFR-011 | Stream tokens are minted server-side only |
| NFR-012 | Non-participants cannot join another call |
| NFR-013 | Match membership is validated before invite creation |

---

## 15. Implementation Plan

### Phase 0: Baseline Hardening

Before adding Stream:
1. Record the current TypeScript failure baseline
2. Decide whether New Architecture is on or off for this repo
3. Sync `app.json` and checked-in native project configuration

### Phase 1: Stream Compatibility Spike

Goal: prove Stream can be added without breaking the build.

Tasks:
1. Add Stream MVP dependencies
2. Update app config and native build properties
3. Rebuild iOS and Android
4. Verify:
   - `npx expo-doctor`
   - `npx tsc --noEmit`
   - `expo run:ios`
   - `expo run:android`

Exit criteria:
1. Both platforms compile
2. No new baseline regressions are introduced
3. Camera and microphone permissions work

### Phase 2: Backend and Auth

1. Add Stream token callable function
2. Add call invite callable functions
3. Add `calls` rules
4. Add cleanup for stale invites

### Phase 3: Chat Integration

1. Replace chat header video placeholder with real action
2. Add incoming call listener / overlay
3. Add active call screen route
4. Add chat system messages for call outcomes

### Phase 4: QA

1. Test physical iOS devices
2. Test physical Android devices
3. Validate timeout and missed-call flow
4. Validate accept / decline / cancel race conditions
5. Validate reconnect after brief background / foreground transitions

### Phase 5: Deferred Enhancements

Only after MVP is stable:
1. Stream ringing setup
2. CallKeep / VoIP push
3. Group calls
4. Picture-in-picture
5. Screen sharing

---

## 16. Testing Checklist

### Functional

- [ ] Start call from chat
- [ ] Accept call in foreground
- [ ] Decline call
- [ ] Caller cancel before answer
- [ ] Timeout becomes missed call
- [ ] End call from either side
- [ ] Mute/unmute works
- [ ] Camera on/off works
- [ ] Camera switch works

### Security

- [ ] Unmatched users cannot create calls
- [ ] Non-participants cannot read `calls/{callId}`
- [ ] Non-participants cannot fetch Stream auth for another call
- [ ] Expired invites cannot be joined

### Build Safety

- [ ] `npx expo-doctor` has no new failures
- [ ] `npx tsc --noEmit` has no new failures beyond agreed baseline
- [ ] iOS development build succeeds
- [ ] Android development build succeeds

---

## 17. Final Recommendation

Proceed with Stream Video under these constraints:

1. Keep Firebase as the chat and invite system
2. Use Stream only for live media sessions
3. Ship foreground one-to-one calls first
4. Defer full ringing/background call behavior
5. Treat the Stream dependency add as a native compatibility project, not a simple UI task

This gives SkillSwap a chat-native video call feature while keeping the first release compatible with the current app and much less likely to break the build.
