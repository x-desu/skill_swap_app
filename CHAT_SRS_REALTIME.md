# SkillSwap Realtime Chat SRS (Firebase)

Version: 1.0
Date: 2026-03-28
Owner: SkillSwap Product + Engineering

## 1. Purpose
This document specifies the functional and technical requirements for a WhatsApp-like realtime chat system in SkillSwap using Firebase.

Primary capabilities:
1. Realtime one-to-one messaging
2. Online/offline presence
3. Message delivery receipts
4. Message read receipts
5. Fast, resilient performance on mobile networks

## 2. Scope
In scope:
1. One-to-one chat between matched users
2. Firebase Auth identity trust boundary
3. Firestore message storage and subscriptions
4. Realtime Database presence backbone with Firestore mirror
5. Delivered/read status semantics and UI mapping
6. Unread counters and chat list freshness
7. Offline/reconnect behavior

Out of scope:
1. Group chat
2. Full E2E encryption redesign
3. Audio/video calls
4. Rich media CDN optimization

## 3. Product Goals and Success Criteria
Goals:
1. Sender sees outgoing message instantly via optimistic UI
2. Receiver gets message in near-realtime
3. Sender sees clear status progression: sent -> delivered -> read
4. Presence is accurate enough for "online now" and "last seen"
5. Chat remains smooth under weak/unstable connectivity

KPIs:
1. P95 sender-to-receiver fan-in latency < 800 ms on stable network
2. P95 chat list freshness after send < 500 ms
3. Presence stale rate < 2%
4. Receipt mismatch incidents < 0.5%
5. Chat crash-free sessions > 99.9%

## 4. Definitions
1. Sent: message write committed by Firestore backend.
2. Delivered: receiver device listener has observed the message document.
3. Read: receiver opened thread and passed read watermark over message timestamp.
4. Online: user has >= 1 active device connection.
5. Last seen: server timestamp for final disconnection.

## 5. Current System Baseline (SkillSwap)
Relevant files:
1. src/services/chatService.ts
2. src/hooks/useChat.ts
3. src/hooks/useSendMessage.ts
4. app/chat/[id].tsx
5. src/types/user.ts
6. firestore.rules
7. firestore.indexes.json

Observed baseline:
1. Realtime message subscription exists.
2. Optimistic send exists.
3. Read/delivered fields are partially present in schema.
4. Presence field exists in types but no robust presence architecture is active.

## 6. Target Architecture
### 6.1 Data systems
1. Firestore = source of truth for messages, match metadata, unread counts.
2. Realtime Database = source of truth for connection presence via .info/connected + onDisconnect.
3. Cloud Functions = secure mirroring from Realtime Database status to Firestore status docs.

### 6.2 Runtime flow
1. Sender sends message -> optimistic local render -> Firestore commit.
2. Receiver subscription gets message -> marks delivered (idempotent).
3. Receiver opens thread/focuses chat -> marks read up to watermark.
4. Match doc updates unread count, last message summary.
5. Presence updates from RTDB -> mirrored to Firestore -> header shows online/last seen.

## 7. Data Model Requirements
### 7.1 Firestore collections
1. matches/{matchId}
2. matches/{matchId}/messages/{messageId}
3. status/{uid} (mirrored presence)

### 7.2 matches/{matchId}
Required fields:
1. id: string
2. users: string[]
3. matchedAt: Timestamp
4. lastMessage: string
5. lastMessageSender: string
6. lastMessageTime: Timestamp
7. unreadCount: { [uid: string]: number }
8. typingStatus: { [uid: string]: boolean }
9. typingUpdatedAt: Timestamp

### 7.3 messages/{messageId}
Required fields:
1. _id: string
2. matchId: string
3. senderUid: string
4. receiverUid: string
5. text: string
6. createdAt: Timestamp
7. status: 'sent' | 'delivered' | 'read'
8. deliveredTo: string[]
9. readBy: string[]
10. deliveredAt: Timestamp | null
11. readAt: Timestamp | null
12. pending: boolean (client-only or server false)
13. failed: boolean (client-only or server false)

Status transition rules:
1. sent -> delivered -> read
2. No backward transitions allowed
3. delivered/read updates must be idempotent

### 7.4 Presence in Realtime Database
Paths:
1. status/{uid}/connections/{connectionId} = true
2. status/{uid}/lastOnline = serverTimestamp

### 7.5 Presence mirror in Firestore
Path:
1. status/{uid}

Fields:
1. state: 'online' | 'offline'
2. activeConnections: number
3. lastChanged: Timestamp
4. lastSeen: Timestamp

## 8. Functional Requirements
### FR-1 Send Message
1. Client validates auth + match membership context.
2. Client creates optimistic message locally.
3. Firestore write creates message doc and updates match summary atomically.
4. Receiver unreadCount increments by 1.

Acceptance:
1. Message appears immediately in sender UI.
2. Persisted message appears in both users' thread.
3. Chat list preview updates without manual refresh.

### FR-2 Delivery Receipt
1. Receiver subscription callback detects unseen inbound message.
2. Receiver marks delivered if receiverUid == currentUid.
3. Sender sees delivered indicator (double tick gray).

Acceptance:
1. Delivered only shown after receiver listener sees message.
2. Multiple callbacks do not duplicate delivery state.

### FR-3 Read Receipt
1. On chat focus/open, receiver writes read watermark.
2. Messages below watermark update readBy/readAt/status.
3. unreadCount for receiver resets to 0.

Acceptance:
1. Sender sees read indicator (double tick accent).
2. Unread badge clears reliably on list and thread.

### FR-4 Presence
1. On connect, create RTDB connection node.
2. Register onDisconnect removal and lastOnline write.
3. Cloud Function aggregates connections and mirrors to Firestore status doc.

Acceptance:
1. Hard app kill eventually marks offline.
2. Multi-device user stays online while any connection active.

### FR-5 Offline & Retry
1. Firestore offline persistence enabled.
2. Optimistic message queue retries on reconnect.
3. Failed sends are visible and retryable.

Acceptance:
1. No duplicate messages after retry.
2. Local UI remains responsive when offline.

### FR-6 Typing Indicator
1. Typing status updates with debounce (existing approach retained).
2. Auto-expire stale typing state after timeout.

Acceptance:
1. Typing indicator disappears within timeout when user stops typing/disconnects.

## 9. Non-Functional Requirements
Performance:
1. Initial thread load: P95 < 1200 ms with warm cache
2. Pagination fetch: P95 < 500 ms
3. Scroll FPS in long thread (1000 msgs logical): > 55 fps

Reliability:
1. At-least-once UI delivery semantics
2. Idempotent receipt updates
3. No unread drift after restart

Security:
1. Only participants can read/write conversation docs
2. Only sender can create message as senderUid
3. Only receiver can mark delivered/read for self
4. Immutable message fields protected

Scalability:
1. Cursor pagination mandatory after first page
2. Batch updates for read receipts
3. Avoid per-message heavy listeners where possible

## 10. Security Rules Requirements
For firestore.rules:
1. Verify match participant for every message read/write.
2. Validate create request.auth.uid == senderUid.
3. Restrict updates to allowed fields only for receipts.
4. Enforce valid status progression.
5. Deny updates that alter senderUid, receiverUid, text, createdAt after creation.

For RTDB rules:
1. User can write only under status/{auth.uid}/...
2. Prevent writing status of other users.

## 11. Indexing Requirements
In firestore.indexes.json ensure:
1. matches: users array-contains + lastMessageTime desc
2. messages: matchId + createdAt desc
3. status: state + lastChanged desc (if querying online users)
4. optional analytics indexes for unread/status reporting

## 12. API and Event Contracts
Client contracts:
1. sendMessage(matchId, payload, receiverUid) -> Promise<messageId>
2. subscribeToMessages(matchId, callback) -> unsubscribe
3. markMessageDelivered(matchId, messageId, currentUid) -> Promise<void>
4. markReadUpTo(matchId, currentUid, watermarkTs) -> Promise<void>
5. subscribePresence(uid, callback) -> unsubscribe

Backend contracts (Cloud Functions):
1. onRTDBPresenceWrite -> mirror to Firestore status/{uid}
2. optional onMessageCreate -> push notification fanout

## 13. UX Specification
Message status UI:
1. sent: one gray tick
2. delivered: two gray ticks
3. read: two accent ticks

Header UX:
1. "Online" when state=online
2. "Last seen X min ago" when offline

Failure UX:
1. pending bubble state while unsynced
2. failed bubble + retry action
3. optional inline banner when offline

## 14. Observability and Monitoring
Metrics:
1. send_to_delivered_ms
2. delivered_to_read_ms
3. receipt_write_error_rate
4. presence_lag_ms
5. unread_drift_count

Dashboards:
1. Chat latency panel
2. Receipt correctness panel
3. Presence accuracy panel

Alerts:
1. P95 send_to_delivered above threshold for 15 min
2. receipt errors > 1%
3. presence lag > 20 sec sustained

## 15. Test Plan
Unit tests:
1. status transition validator
2. idempotent delivered/read updates
3. unread counter math

Integration (Emulator):
1. participant-only access
2. sender spoof prevention
3. read/delivery updates by wrong user denied
4. reconnect and retry behavior

E2E scenarios:
1. A sends to B while B online
2. A sends to B while B offline then reconnect
3. B reads on second device syncs to first device
4. app kill + restart presence correctness

## 16. Rollout Plan
Phase 1 (Core correctness):
1. Sent/delivered/read semantics
2. unread counter correctness
3. status UI mapping

Phase 2 (Presence):
1. RTDB connection tracking
2. Firestore status mirror
3. chat header online/last seen

Phase 3 (Resilience):
1. retry queue hardening
2. telemetry + SLO tuning
3. load/performance optimization

## 17. Risks and Mitigations
1. Presence false positives due to transport differences
Mitigation: RTDB source-of-truth + function mirror + grace window.

2. Receipt race conditions
Mitigation: idempotent arrayUnion semantics + guarded transitions.

3. Unread drift
Mitigation: write batching + periodic reconciliation path.

## 18. Open Decisions
1. Read policy: watermark-only vs per-message explicit readBy updates.
2. Offline queue persistence depth and retention window.
3. Last seen privacy controls for users.

## 19. Implementation Mapping to Current Files
1. src/services/chatService.ts: add strict status transitions, delivered/read functions.
2. src/hooks/useChat.ts: invoke delivered before read, maintain idempotency.
3. src/hooks/useSendMessage.ts: robust retry/fail states.
4. app/chat/[id].tsx: show status ticks + presence in header.
5. src/types/user.ts: finalize receipt/presence fields.
6. firestore.rules: lock field-level update constraints.
7. firestore.indexes.json: add chat/presence index support.

## 20. Definition of Done
1. All acceptance criteria in FR-1..FR-6 pass.
2. Security rule tests pass in emulator.
3. Performance KPIs meet targets in staging.
4. No critical unread or receipt inconsistencies in soak test.
