# SkillSwap Video Calling SRS

Version: 2.0
Date: 2026-03-30
Owner: SkillSwap Engineering
Status: Compatibility-first revision for the current codebase

---

## 1. Purpose

This document defines a video calling plan that fits the current SkillSwap app without assuming native dependencies or platform behavior that the repository does not already support.

This revision replaces the earlier provider proposal with a build-safe approach:
1. Start from the current Expo + Firebase architecture.
2. Treat media SDK adoption as a gated native integration.
3. Keep MVP scope small enough to avoid hidden iOS/Android build regressions.

---

## 2. Current Codebase Baseline

### 2.1 App Stack

- Expo SDK `54.0.32`
- React Native `0.81.5`
- React `19.1.0`
- Expo Router `6.0.22`
- React Native Firebase (`app`, `auth`, `firestore`, `functions`, `storage`)
- Redux Toolkit for app state
- Native iOS and Android directories are already committed

### 2.2 Existing Chat and Backend Architecture

- Matches are stored in `matches/{matchId}` and define who is allowed to chat.
- Messages are stored in `matches/{matchId}/messages/{messageId}`.
- Push and in-app notifications already use Expo Notifications plus Firebase Cloud Functions.
- User presence is currently lightweight and based on fields in `users/{uid}`.
- Cloud Functions already run in `asia-south1`.

### 2.3 Important Baseline Risks

The repository is not currently in a fully clean build state:
- `npx expo-doctor` reports dependency drift and a New Architecture warning for `react-native-razorpay`.
- `npx tsc --noEmit` currently fails in existing chat and matches code unrelated to video calling.
- `app.json` says `newArchEnabled: false`, but the checked-in native projects currently have New Architecture enabled.

Because of this, video calling must not be treated as a pure feature add. It must begin with a compatibility gate.

---

## 3. Compatibility Assessment

### 3.1 Compatible With Current Architecture

These requirements fit the current app with low architectural risk:

1. One-to-one calls between matched users only
2. Firestore-backed signaling and call state
3. Expo Router navigation from chat into an active call screen
4. Call invitation and missed-call notifications using the existing notification pipeline
5. Cloud Functions for provider token generation and authorization checks
6. Chat-level call history events such as "missed call" or "call ended"

### 3.2 Not Compatible As Previously Written

The previous SRS assumed features or versions that do not match the current app:

1. `@daily-co/react-native-daily-js@^0.25.0` is not an acceptable target for this codebase.
2. Screen sharing was listed as in-scope, but it requires extra native configuration and should not be part of MVP.
3. Background audio continuity was listed as a product requirement, but that is native-provider-dependent and not safe to promise before device testing.
4. Call quality indicators, adaptive bitrate rules, and aggressive reconnect logic were specified before a media SDK is even selected and proven in this repo.
5. Additional native packages such as `react-native-incall-manager` and `react-native-vibration` were assumed without a need to add them for MVP.

### 3.3 Daily Compatibility Conclusion

Daily is still a reasonable provider for this app, but only under a current version set that matches Expo 54 and only after a native compatibility spike passes.

For Expo `54.x`, the implementation must use the official compatible Daily stack rather than the old version from the previous SRS:

| Package | Required Direction |
|---------|--------------------|
| `@daily-co/react-native-daily-js` | Use Expo-54-compatible release line |
| `@daily-co/react-native-webrtc` | Use the matching Daily WebRTC version |
| `@daily-co/config-plugin-rn-daily-js` | Required for Expo config integration |
| `react-native-background-timer` | Add as Daily peer dependency |
| `react-native-get-random-values` | Add as Daily peer dependency |

Notes:
- `@react-native-async-storage/async-storage` is already present in this repo.
- MVP should keep `enableScreenShare` off.
- If New Architecture remains enabled in native projects, Daily must be on a version line that supports it.

### 3.4 MVP Dependency Policy

For the first implementation pass:

Safe to add:
1. Daily packages and required peers
2. Firestore rules and Cloud Functions for call lifecycle
3. App config changes required by the Daily Expo plugin

Do not add in MVP unless a specific need is proven:
1. `react-native-incall-manager`
2. `react-native-callkeep`
3. Extra network libraries only for quality indicators
4. Screen-share-only dependencies

---

## 4. Build-Safe Product Scope

### 4.1 In Scope for MVP

1. One-to-one calls between matched users
2. Video call start from chat
3. Audio-only fallback by starting or switching to audio-only inside the call
4. Accept, decline, cancel, timeout, and end call flows
5. Mute/unmute microphone
6. Turn camera on/off
7. Switch front/back camera
8. Foreground-only active call experience
9. Missed call event written back to chat/notifications
10. Provider tokens created server-side

### 4.2 Explicitly Out of Scope for MVP

1. Screen sharing
2. Group calls
3. Recording
4. Picture-in-picture
5. System CallKit / Telecom UI
6. Guaranteed background audio continuity
7. Advanced call quality scores
8. Dynamic network tier UI
9. Post-call rating flow

### 4.3 Product Success Criteria

The first release should optimize for correctness and build stability, not feature breadth.

MVP success criteria:
1. No new TypeScript errors are introduced
2. No new Expo Doctor failures are introduced
3. iOS and Android development builds complete after dependency integration
4. A matched user can complete a foreground call end-to-end
5. Unauthorized users cannot read or join another user's call

---

## 5. User Experience Requirements

### 5.1 Chat Entry Point

- Add a video call action to the existing chat header
- Keep the action visible only for matched-user chats
- Disable the action when a call is already active for the current user
- Do not rely on presence alone to decide if calling is allowed; presence is advisory only

### 5.2 Incoming Call Experience

- In-app incoming call modal when the app is foregrounded
- Show caller name and avatar
- `Accept` and `Decline` actions
- Ring timeout at 30 seconds
- If the app is backgrounded, rely on a push notification to bring the user back into the app

### 5.3 Active Call Experience

- Full-screen active call screen
- Remote video as the primary surface when video is enabled
- Local preview thumbnail
- Controls:
  - mute/unmute
  - camera on/off
  - switch camera
  - end call
- Show a simple call timer once connected

### 5.4 Background Behavior

For MVP, background behavior is best effort and not a release guarantee.

Required behavior:
1. If the app returns to foreground quickly, the client may attempt reconnect
2. If the media session cannot be restored, the call ends cleanly

Not required in MVP:
1. Long-running background audio
2. System-level incoming call UI
3. Background screen share

---

## 6. Technical Architecture

### 6.1 Recommended Provider

Recommended provider for this codebase: Daily, integrated through the official Expo config plugin path.

Reason:
1. The repo already has native iOS and Android projects, so custom native code is possible.
2. Firestore and Functions can handle signaling, authorization, and notifications.
3. Daily reduces the need to own TURN/STUN infrastructure during MVP.

### 6.2 High-Level Design

```
Chat Screen
    |
    v
Callable Function: startCall(matchId, calleeUid, mode)
    |
    +--> Validate authenticated user is part of the match
    +--> Create provider room metadata if needed
    +--> Create calls/{callId}
    +--> Create push/in-app notification for callee
    |
    v
Firestore calls/{callId}
    |
    +--> Caller listener
    +--> Callee listener
    |
    v
Callable Function: getCallJoinCredentials(callId)
    |
    +--> Verify participant membership
    +--> Verify call is still active
    +--> Return provider token / room info
    |
    v
Daily media session in active call screen
```

### 6.3 Required Firestore Collection

Add a top-level `calls` collection.

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

type CallMode = 'video' | 'audio';

interface CallDocument {
  id: string;
  matchId: string;
  participantUids: [string, string];
  callerUid: string;
  calleeUid: string;
  provider: 'daily';
  mode: CallMode;
  status: CallStatus;
  roomName: string;
  providerRoomUrl?: string;
  initiatedFrom: 'chat';
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  connectedAt?: Timestamp;
  endedAt?: Timestamp;
  updatedAt: Timestamp;
  endedBy?: string;
  endReason?: 'declined' | 'missed' | 'hangup' | 'error' | 'timeout' | 'network';
  expiresAt: Timestamp;
}
```

### 6.4 Notification Types

Extend the notification model to support:
1. `incoming_call`
2. `missed_call`
3. `call_ended`

These can continue using the existing top-level `notifications` collection.

### 6.5 Cloud Functions

Required callable functions:
1. `startCall`
2. `getCallJoinCredentials`
3. `endCall`

Optional trigger functions:
1. `onCallCreated` for push notifications
2. `onCallExpired` or scheduled cleanup for stale ringing calls

### 6.6 Firestore Rules Direction

`calls/{callId}` should be participant-only. Prefer server-created call documents.

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

## 7. Native and Dependency Requirements

### 7.1 Required App Config Changes

If Daily is selected, update Expo config with:
1. Daily Expo config plugin
2. Camera permission
3. Microphone permission
4. Native rebuild after dependency install

MVP plugin direction:

```json
[
  "@daily-co/config-plugin-rn-daily-js",
  {
    "enableCamera": true,
    "enableMicrophone": true,
    "enableScreenShare": false
  }
]
```

### 7.2 iOS Requirements

Required:
1. Camera permission string
2. Microphone permission string
3. Native rebuild after pods change

Conditional:
1. `UIBackgroundModes: ["voip"]` only when the Daily integration requires it for the chosen behavior
2. Screen share extension only in a future phase

### 7.3 Android Requirements

Required:
1. Camera permission
2. Record audio permission
3. Native rebuild after dependency install

Conditional:
1. Foreground service permissions only if the chosen provider flow actually needs them
2. Extra telecom integrations only in a later phase

### 7.4 Version Gate

The implementation must not use the dependency block from the previous SRS.

Instead, engineering must install a version set that matches Expo 54 and verify it on both platforms before any product code is merged.

---

## 8. Functional Requirements

### FR-001 to FR-006 Core Call Lifecycle

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Only matched users can start a call | P0 |
| FR-002 | Caller can start a video call from chat | P0 |
| FR-003 | Callee can accept or decline | P0 |
| FR-004 | Ringing call times out after 30 seconds | P0 |
| FR-005 | Either participant can end the call | P0 |
| FR-006 | Missed and ended calls create visible call events | P0 |

### FR-007 to FR-012 Active Call Controls

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-007 | Mute/unmute microphone during call | P0 |
| FR-008 | Turn camera on/off during call | P0 |
| FR-009 | Switch front/back camera | P1 |
| FR-010 | Start call in video mode | P0 |
| FR-011 | Support audio-only mode | P1 |
| FR-012 | Show call duration after connection | P1 |

### FR-013 to FR-017 Safety and Reliability

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-013 | Server validates participant membership before issuing provider credentials | P0 |
| FR-014 | Client cannot join ended or expired calls | P0 |
| FR-015 | Stale ringing calls expire automatically | P1 |
| FR-016 | App handles caller cancellation cleanly | P0 |
| FR-017 | App handles reconnect as best effort in foreground | P1 |

---

## 9. Non-Functional Requirements

### 9.1 Build and Release Safety

| ID | Requirement |
|----|-------------|
| NFR-001 | No new TypeScript failures |
| NFR-002 | No new Expo Doctor failures |
| NFR-003 | iOS dev build succeeds after native dependency changes |
| NFR-004 | Android dev build succeeds after native dependency changes |
| NFR-005 | Secrets remain server-side |

### 9.2 Performance

Use realistic goals for the first release:

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-006 | Call setup on stable network | < 8 seconds |
| NFR-007 | Crash-free call sessions | > 99% |
| NFR-008 | Ring timeout | 30 seconds |
| NFR-009 | Call teardown consistency | Call doc finalized within 5 seconds |

### 9.3 Security

| ID | Requirement |
|----|-------------|
| NFR-010 | Only participants can read call state |
| NFR-011 | Provider tokens are never generated on device |
| NFR-012 | Call media is never recorded by the app in MVP |
| NFR-013 | Match membership is revalidated server-side before join |

---

## 10. Implementation Plan

### Phase 0: Baseline Hardening

Must be complete before video work is merged:
1. Document and resolve current TypeScript failures that affect the chat stack
2. Decide whether the project is running with New Architecture on or off
3. Sync `app.json` with checked-in native config, or regenerate native projects intentionally

### Phase 1: Compatibility Spike

Goal: prove the media SDK can exist in this repo without breaking the build.

Tasks:
1. Add the Expo-54-compatible Daily dependency set in an isolated branch
2. Add the Daily Expo config plugin with screen sharing disabled
3. Rebuild native projects
4. Verify:
   - dependency install succeeds
   - `npx expo-doctor`
   - `npx tsc --noEmit`
   - iOS dev build
   - Android dev build

Exit criteria:
1. Both platforms compile
2. No new baseline regressions are introduced
3. Camera and mic permissions behave correctly

### Phase 2: Backend Call Lifecycle

1. Add `calls` collection rules
2. Implement callable functions for start/join/end flows
3. Add notification triggers for incoming and missed calls
4. Add timeout cleanup logic

### Phase 3: App UI

1. Add call button to chat header
2. Add incoming call modal
3. Add active call screen route
4. Add call event messages to chat history

### Phase 4: QA and Rollout

1. Test on physical iOS and Android devices
2. Validate call timeout and cleanup
3. Validate permission-denied flows
4. Validate foreground-only reconnect behavior
5. Release behind a feature flag if needed

### Phase 5: Deferred Enhancements

Only after MVP is stable:
1. Screen sharing
2. Background audio continuity
3. Picture-in-picture
4. System call UI
5. Quality indicators and analytics

---

## 11. Testing Checklist

### Functional

- [ ] Caller can start a call from chat
- [ ] Callee sees incoming call UI in foreground
- [ ] Callee can accept
- [ ] Callee can decline
- [ ] Caller can cancel before answer
- [ ] Ringing call becomes missed after timeout
- [ ] Either side can end the call
- [ ] Mute/unmute works
- [ ] Camera on/off works
- [ ] Camera switch works

### Security

- [ ] Unmatched users cannot start calls
- [ ] Non-participants cannot read a call document
- [ ] Non-participants cannot request join credentials
- [ ] Expired calls cannot be joined

### Build Safety

- [ ] `npx expo-doctor` passes without new failures
- [ ] `npx tsc --noEmit` passes or has no added failures beyond agreed baseline
- [ ] iOS dev build succeeds
- [ ] Android dev build succeeds

---

## 12. Final Recommendation

Proceed with video calling only under this order of operations:

1. Fix the current build baseline enough to establish trust in the repo state
2. Run a provider compatibility spike using the official Expo 54 Daily version set
3. Keep MVP to foreground one-to-one calls with minimal controls
4. Defer screen sharing, background calling guarantees, and advanced native telephony features

This approach fits the current SkillSwap architecture and minimizes the chance that video-call work breaks iOS or Android builds.
