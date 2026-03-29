# SkillSwap Video Call Feature SRS

Version: 1.0
Date: 2026-03-30
Owner: SkillSwap Product + Engineering

---

## 1. Purpose

This document specifies the functional and technical requirements for a peer-to-peer video calling feature in SkillSwap that allows matched users to have secure video calls within the chat interface.

Primary capabilities:
1. One-to-one video calls between matched users
2. Audio-only mode fallback
3. Call signaling via Firebase (no external signaling server needed)
4. Screen sharing capability
5. Optimized for mobile networks with low bandwidth handling

---

## 2. Scope

### In Scope:
1. One-to-one video calls between matched users only
2. Call initiation, acceptance, rejection, and termination
3. Audio/video toggle during call
4. Switch camera (front/back)
5. Picture-in-picture view
6. Call duration tracking
7. Call quality indicators
8. Poor connection handling
9. Firebase-based signaling (call requests, ICE candidates)
10. End-to-end encrypted media (WebRTC DTLS-SRTP)

### Out of Scope:
1. Group video calls (3+ participants)
2. Recording or cloud storage of calls
3. Screen recording by the app
4. Virtual backgrounds/blur effects
5. AI noise cancellation (native device noise cancellation only)
6. File sharing during calls
7. Text chat during calls

---

## 3. Product Goals and Success Criteria

### Goals:
1. Sub-second call connection time for 95% of calls
2. Stable video quality at 360p minimum for mobile networks
3. Automatic fallback to audio-only on poor connections
4. Battery efficient - less than 15% drain for 10-minute call
5. Never miss a call notification (100% delivery rate)

### KPIs:
1. P95 call setup time < 2 seconds on stable network
2. P95 call drop rate < 1% on 4G/5G
3. Audio-only fallback rate < 5% of calls
4. Average call duration > 5 minutes
5. Call crash-free sessions > 99.5%

---

## 4. Technical Architecture

### 4.1 Provider Selection: Daily.co (Recommended)

**Why Daily.co over raw WebRTC/Agora:**
- Managed WebRTC infrastructure (no STUN/TURN server management)
- React Native SDK with optimized performance
- Automatic network adaptation
- Built-in bandwidth management
- HIPAA/GDPR compliant by default
- Prebuilt UI components customizable to SkillSwap design

### 4.2 Alternative: Raw WebRTC
If cost optimization needed later:
- Use Firebase Realtime Database for signaling
- Deploy custom Coturn server for STUN/TURN
- Higher dev cost, lower per-minute cost

### 4.3 Architecture Components

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Caller App    │────▶│   Daily.co API   │◀────│  Receiver App   │
│  (React Native) │     │   (WebRTC mesh)  │     │ (React Native)  │
└────────┬────────┘     └──────────────────┘     └────────┬────────┘
         │                                                │
         │ Signaling (call start, accept, reject)        │
         ▼                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firebase Firestore                            │
│  calls/{callId}: { status, callerUid, receiverUid, roomUrl }    │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Data Models

**Call Document (Firestore):**
```typescript
interface CallDocument {
  callId: string;              // UUID v4
  callerUid: string;           // Initiator
  receiverUid: string;         // Target user
  matchId: string;           // Reference to match
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined' | 'missed';
  roomUrl: string;            // Daily.co room URL
  startedAt: Timestamp;
  connectedAt?: Timestamp;
  endedAt?: Timestamp;
  endedBy?: string;          // UID of who ended
  endReason?: 'user' | 'timeout' | 'error' | 'network';
  callerPlatform: 'ios' | 'android';
  receiverPlatform?: 'ios' | 'android';
  callDuration?: number;      // Seconds
  videoEnabled: boolean;      // Call started with video
  audioEnabled: boolean;      // Call started with audio
}
```

**User Call Status (Firestore - real-time):**
```typescript
interface UserCallStatus {
  uid: string;
  inCall: boolean;
  currentCallId?: string;
  lastCallEndedAt?: Timestamp;
  doNotDisturb: boolean;      // User preference
}
```

---

## 5. Call Flow

### 5.1 Normal Call Flow

```
Caller                      Receiver                    Firestore
  │                           │                            │
  │──(1) Create call doc─────▶│                            │
  │   status: 'ringing'       │                            │
  │                           │                            │
  │                           │◀──(2) Listen on user/{uid} │
  │                           │   inCall: true               │
  │                           │                            │
  │                           │──(3) Show incoming call────▶
  │                           │   UI with accept/decline   │
  │                           │                            │
  │◀────────(4) Receiver─────│                            │
  │   accepts: update doc     │                            │
  │   status: 'connecting'    │                            │
  │                           │                            │
  │──(5) Join Daily.co──────▶│                            │
  │   room via roomUrl        │                            │
  │                           │                            │
  │                           │──(6) Join Daily.co room────▶
  │                           │                            │
  │◀────────(7) WebRTC───────▶│                            │
  │   peer connection         │                            │
  │   established             │                            │
  │                           │                            │
  │──(8) Update doc──────────▶│                            │
  │   status: 'connected'     │                            │
  │   connectedAt: now()      │                            │
```

### 5.2 Call Timeout Handling
- Ringing timeout: 30 seconds
- If no response: status → 'missed'
- Caller sees missed call notification
- Receiver gets missed call badge in chat

### 5.3 Call Interruption Handling
- App backgrounded: Audio continues, video pauses
- Phone call incoming: Pause SkillSwap call, resume after
- Network switch (WiFi ↔ 4G): Automatic reconnection with 5s timeout
- App killed: Call ends with 'ended' status

---

## 6. UI/UX Requirements

### 6.1 Chat Integration

**Call Buttons in ChatHeader:**
- Video call icon (right side of header)
- Audio call icon (next to video)
- Disabled if other user offline
- Disabled during active call

**Incoming Call UI:**
- Full-screen overlay (system alert style)
- Caller avatar + name
- Accept (green) / Decline (red) buttons
- Slide-to-answer gesture (iOS style)
- Ringtone + vibration

**Active Call Screen:**
- Main view: Remote video (fullscreen)
- Pip view: Local video (corner, draggable)
- Controls (bottom, fade after 3s tap):
  - Mute/unmute audio
  - Enable/disable video
  - Switch camera
  - Screen share (iOS 14.5+, Android 10+)
  - End call (red, always visible)
- Call duration timer (top)
- Network quality indicator (top-right)

### 6.2 States

**Pre-call:**
- Call button active only when matched and other user online
- Tooltip: "Start video call" on long press

**Ringing:**
- Caller: "Calling..." with cancel button
- Sound: Outgoing ring tone
- Receiver: Incoming call UI

**Connected:**
- Both video streams visible
- Connection quality indicator (excellent/good/poor)
- Auto-hide controls after 3 seconds
- Tap anywhere to show controls

**Ended:**
- Call summary: Duration, quality rating
- "Call ended" message in chat
- Option to call back

---

## 7. Security & Privacy

### 7.1 Requirements
1. **E2E Encryption:** All media encrypted via WebRTC DTLS-SRTP
2. **No Recording:** Call media never stored server-side
3. **Match Validation:** Calls only between matched users (enforced by Firestore rules)
4. **Room Security:** Daily.co rooms use random UUIDs, no guessable URLs
5. **Token-based Auth:** Short-lived tokens for Daily.co room access

### 7.2 Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /calls/{callId} {
      allow read: if request.auth != null && 
        (resource.data.callerUid == request.auth.uid || 
         resource.data.receiverUid == request.auth.uid);
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.callerUid &&
        exists(/databases/$(database)/documents/matches/$(request.resource.data.matchId)) &&
        get(/databases/$(database)/documents/matches/$(request.resource.data.matchId)).data.users.hasAll([request.auth.uid, request.resource.data.receiverUid]);
      allow update: if request.auth != null &&
        (resource.data.callerUid == request.auth.uid || 
         resource.data.receiverUid == request.auth.uid);
    }
  }
}
```

---

## 8. Performance Optimization

### 8.1 Video Quality Tiers

| Network | Resolution | FPS | Bitrate |
|---------|------------|-----|---------|
| Excellent (5G/WiFi) | 720p | 30 | 2.5 Mbps |
| Good (4G) | 480p | 24 | 1.0 Mbps |
| Fair (3G/weak 4G) | 360p | 20 | 500 Kbps |
| Poor | 240p | 15 | 250 Kbps |
| Very Poor | Audio only | - | 64 Kbps |

### 8.2 Battery Optimization
- Use VP8 codec (hardware accelerated on most devices)
- Reduce FPS when app backgrounded
- Pause video encoding when local video disabled
- Aggressive garbage collection of ICE candidates after connection

### 8.3 Network Adaptation
- Monitor packet loss every 2 seconds
- Adjust bitrate up/down by 20% based on RTT
- Switch to audio-only if packet loss > 5% for 5 seconds
- Auto-reconnect with exponential backoff (max 3 attempts)

---

## 9. Error Handling

### 9.1 Error Scenarios

| Error | User Message | Action |
|-------|--------------|--------|
| Camera permission denied | "Camera access needed for video calls" | Open settings button |
| Microphone permission denied | "Microphone access needed for calls" | Open settings button |
| Network unavailable | "No internet connection" | Retry button after 5s |
| Peer disconnected | "Other person disconnected" | Auto-end after 10s |
| Signaling failed | "Unable to start call" | Retry once, then error |
| Daily.co room full | "Call is no longer available" | Close call screen |

### 9.2 Retry Logic
- Initial connection: 3 attempts with 2s, 4s, 8s backoff
- ICE reconnection: 2 attempts with 3s, 6s backoff
- After max retries: Show error, log to Crashlytics

---

## 10. Implementation Plan

### Phase 1: Foundation (Week 1)
1. Add Daily.co dependency (`@daily-co/react-native-daily-js`)
2. Create Firestore `calls` collection and rules
3. Implement call signaling service (start, accept, reject, end)
4. Add call status listener to chat screen

### Phase 2: UI (Week 2)
1. Build IncomingCall overlay component
2. Build ActiveCall screen with Daily.co video views
3. Add call controls (mute, video toggle, camera switch)
4. Integrate call buttons into ChatHeader

### Phase 3: Polish (Week 3)
1. Add network quality indicators
2. Implement audio-only fallback
3. Add call duration tracking and summary
4. Background/foreground call handling
5. Push notifications for missed calls

### Phase 4: Testing (Week 4)
1. Network condition testing (3G/4G/5G/WiFi switching)
2. Battery consumption testing
3. Interruption testing (phone calls, notifications)
4. Security audit of Firestore rules

---

## 11. Dependencies

```json
{
  "@daily-co/react-native-daily-js": "^0.25.0",
  "@react-native-community/netinfo": "^11.0.0",
  "react-native-incall-manager": "^4.0.0",
  "react-native-vibration": "^1.0.0"
}
```

### iOS Podfile additions:
```ruby
pod 'Daily', '~> 0.25'
```

### Android Permissions:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

---

## 12. Testing Checklist

### Functional Tests
- [ ] Start call to online user
- [ ] Accept incoming call
- [ ] Decline incoming call
- [ ] Missed call notification
- [ ] End call from either side
- [ ] Mute/unmute audio during call
- [ ] Enable/disable video during call
- [ ] Switch front/back camera
- [ ] Call on 3G network (audio-only fallback)
- [ ] Background app during call (audio continues)

### Security Tests
- [ ] Cannot call unmatched user (Firestore rule blocks)
- [ ] Cannot join expired/ended call room
- [ ] Cannot intercept call media
- [ ] Call data not visible to other users

### Performance Tests
- [ ] 10-minute call < 15% battery drain
- [ ] Call connects in < 2 seconds (WiFi)
- [ ] Graceful degradation on poor network
- [ ] No memory leaks after 5 calls

---

## 13. Future Enhancements (Post-MVP)

1. **Group Calls:** Up to 4 participants (Daily.co supports this)
2. **Call Recording:** Opt-in recording with cloud storage
3. **Screen Sharing:** Share device screen during call
4. **Virtual Backgrounds:** Blur or replace background
5. **Call Effects:** Filters, stickers during call
6. **Call Scheduling:** Schedule calls, calendar integration

---

## 14. Appendix: Daily.co Configuration

### Room Configuration
```javascript
const roomConfig = {
  privacy: 'private',
  enable_screenshare: true,
  enable_chat: false,  // We use our own chat
  max_participants: 2,
  eject_at_room_exp: true,
  exp: Math.round(Date.now() / 1000) + (60 * 60), // 1 hour expiry
  enable_knocking: false,  // Auto-join for matched users
};
```

### Token Generation (Firebase Function)
```javascript
// Cloud Function to generate meeting token
const { Daily } = require('@daily-co/daily-js');

exports.generateCallToken = functions.https.onCall(async (data, context) => {
  const { roomUrl, callId } = data;
  const uid = context.auth.uid;
  
  // Verify user is part of this call
  const callDoc = await admin.firestore().doc(`calls/${callId}`).get();
  if (!callDoc.exists) throw new functions.https.HttpsError('not-found');
  
  const callData = callDoc.data();
  if (callData.callerUid !== uid && callData.receiverUid !== uid) {
    throw new functions.https.HttpsError('permission-denied');
  }
  
  // Generate token with 1 hour expiry
  const token = await Daily.createMeetingToken({
    room_name: extractRoomName(roomUrl),
    exp: Math.round(Date.now() / 1000) + (60 * 60),
    is_owner: callData.callerUid === uid,
  });
  
  return { token };
});
```

---

End of Document
