# SkillSwap Detailed SRS: Realtime Chat, Presence, Delivery, and Read Receipts

Version: 2.0
Date: 2026-03-28
Status: Implementation Ready

## 1. Objective
This SRS defines a production-grade realtime chat system for SkillSwap using Firebase that supports:
1. Fast one-to-one messaging
2. Accurate online/offline presence
3. Delivered receipts
4. Read receipts
5. Resilient behavior on unreliable networks

## 2. Scope
In scope:
1. Matched-user one-to-one chats only
2. Firestore message persistence and conversation metadata
3. Presence via Realtime Database plus Firestore mirror
4. Message status lifecycle: sent, delivered, read
5. Unread counters and conversation ordering
6. Offline/reconnect handling and retry

Out of scope:
1. Group chat
2. Audio/video calls
3. End-to-end encryption redesign
4. Payments/scheduling features outside chat transport

## 3. Current State and Gaps
Current capabilities in project:
1. Realtime message stream exists in src/services/chatService.ts and src/hooks/useChat.ts
2. Optimistic send exists in src/hooks/useSendMessage.ts
3. Message schema includes deliveredTo/readBy fields in src/types/user.ts
4. Security baseline exists in firestore.rules

Known gaps:
1. Presence architecture is incomplete and not robust for disconnects
2. Delivered state is not enforced as a strict lifecycle
3. Read semantics are partially implemented and can drift in edge cases
4. Rules do not fully enforce immutable fields and transition constraints
5. Offline retry and reconciliation are incomplete

## 4. Functional Requirements

### FR-1 Send Message
1. Sender creates optimistic local message instantly.
2. Client writes to Firestore messages subcollection.
3. Same operation updates match summary fields and receiver unread counter.
4. On write success, optimistic item is reconciled with server item.

Acceptance criteria:
1. Sender sees message immediately.
2. Receiver sees message via realtime listener.
3. Match list preview updates within one subscription cycle.

### FR-2 Delivered Receipt
1. Receiver client marks message delivered when listener receives an inbound message.
2. Delivered update is idempotent and safe to call multiple times.
3. Sender sees status transition to delivered.

Acceptance criteria:
1. Delivered is never shown before receiver observation.
2. Duplicate delivery writes produce no inconsistent state.

### FR-3 Read Receipt
1. Receiver marks read when chat thread is focused and messages are in-view/readable.
2. System writes read watermark and updates unread counter to zero for receiver.
3. Sender sees status transition to read.

Acceptance criteria:
1. Read is never shown unless receiver has opened/focused chat.
2. Unread badges clear consistently across app restarts.

### FR-4 Presence
1. Presence source of truth uses Realtime Database .info/connected.
2. Each active device/tab writes a unique connection node under user presence path.
3. onDisconnect removes connection node and writes lastOnline timestamp.
4. Cloud Function mirrors aggregated presence to Firestore status documents.

Acceptance criteria:
1. Hard disconnect eventually marks user offline.
2. User remains online while at least one device connection remains active.

### FR-5 Offline and Retry
1. Firestore offline persistence remains enabled.
2. Failed outgoing messages are flagged and retryable.
3. Reconnect triggers queued send reconciliation.

Acceptance criteria:
1. No duplicate server messages after retries.
2. Pending and failed states are visible in UI.

## 5. Message State Machine
State order:
1. sent
2. delivered
3. read

Rules:
1. Forward-only transitions.
2. No rollback from read to delivered or sent.
3. Sender cannot self-mark delivered/read as receiver.
4. Transition writes must be idempotent.

## 6. Data Model Specification

### 6.1 Firestore: matches/{matchId}
Required fields:
1. id: string
2. users: string[]
3. matchedAt: Timestamp
4. lastMessage: string
5. lastMessageSender: string
6. lastMessageTime: Timestamp
7. unreadCount: map uid -> number
8. typingStatus: map uid -> boolean
9. typingUpdatedAt: Timestamp

### 6.2 Firestore: matches/{matchId}/messages/{messageId}
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

Optional fields:
1. image
2. video
3. audio
4. reactions

### 6.3 Realtime Database Presence
Paths:
1. status/{uid}/connections/{connectionId}: true
2. status/{uid}/lastOnline: server timestamp

### 6.4 Firestore Presence Mirror
Path:
1. status/{uid}

Fields:
1. state: online | offline
2. activeConnections: number
3. lastChanged: Timestamp
4. lastSeen: Timestamp

## 7. API/Service Contract Requirements

### 7.1 Chat service methods
1. sendMessage(matchId, payload, receiverUid)
2. subscribeToMessages(matchId, onUpdate)
3. markMessageAsDelivered(matchId, messageId, currentUid)
4. markMessageAsRead(matchId, messageId, currentUid)
5. markReadUpTo(matchId, currentUid, watermark)

Behavioral constraints:
1. markMessageAsDelivered only for receiver of the message.
2. markMessageAsRead only for receiver and only forward transition.
3. Service methods must be idempotent and safe on repeated network callbacks.

### 7.2 Presence service methods
1. initPresence(currentUid)
2. teardownPresence(currentUid, connectionId)
3. subscribeUserPresence(uid, callback)

## 8. Firestore Security Requirements
Mandatory constraints in firestore.rules:
1. Only participants in matches/{matchId}.users can read/write messages.
2. On create, request.auth.uid must equal senderUid.
3. Immutable after create: senderUid, receiverUid, text, createdAt, matchId.
4. Only receiver may set delivered/read for self.
5. Enforce status progression sent -> delivered -> read only.
6. Deny updates with disallowed changed keys.

## 9. Realtime Database Rules Requirements
Mandatory constraints:
1. User can write only to status/{auth.uid}/...
2. User cannot write another user presence path.
3. Read access policy aligned with privacy decisions.

## 10. Indexing Requirements
Required indexes in firestore.indexes.json:
1. matches users array-contains + lastMessageTime desc
2. messages matchId + createdAt desc
3. optional status state + lastChanged desc for online-user queries

## 11. Performance Requirements
Targets:
1. P95 send-to-receive under 800 ms on stable network
2. P95 chat open render under 1200 ms with warm cache
3. Message list scroll > 55 fps on typical devices
4. Presence state propagation under 10 seconds after abrupt disconnect

Engineering requirements:
1. Cursor pagination for message history
2. Limit active listener window
3. Memoized row rendering to minimize rerenders
4. Batched read updates when possible

## 12. UX Behavior Requirements
Message indicators:
1. sent: single gray tick
2. delivered: double gray tick
3. read: double accent tick

Presence header:
1. Show Online when status state is online
2. Show Last seen when status state is offline

Error and offline states:
1. Pending spinner for unsynced outgoing message
2. Failed state with retry action
3. Optional network banner for offline mode

## 13. Sequence Flows

### 13.1 Send Flow
1. User taps send
2. Optimistic bubble inserted
3. Firestore write created
4. Match summary and unread updated
5. Receiver snapshot receives message

### 13.2 Delivery Flow
1. Receiver listener sees new inbound message
2. Receiver writes delivered update
3. Sender listener receives status update and renders delivered icon

### 13.3 Read Flow
1. Receiver opens thread and focus confirmed
2. Receiver writes read update or watermark update
3. Match unread count reset for receiver
4. Sender sees read status

### 13.4 Presence Flow
1. User session starts
2. RTDB .info/connected true
3. Write connection node + onDisconnect handlers
4. Cloud Function mirrors to Firestore status
5. Other clients observe status doc changes

## 14. Edge Cases and Expected Outcomes
1. Receiver app backgrounded: delivered only when listener receives message in active subscribed state.
2. Receiver offline: message remains sent until reconnect delivery.
3. Sender retries after timeout: idempotency key avoids duplicate server message.
4. Multi-device receiver: delivered/read should reflect any active receiver device.
5. App crash: onDisconnect updates presence to offline and lastSeen.

## 15. Testing Requirements

### 15.1 Unit tests
1. Transition validator for sent/delivered/read
2. Receipt idempotency
3. Unread counter update math

### 15.2 Integration tests (Firebase Emulator)
1. Non-participant cannot read thread
2. Sender spoof create denied
3. Unauthorized delivered/read update denied
4. Presence writes denied across users

### 15.3 End-to-end scenarios
1. Online sender and online receiver
2. Sender online, receiver offline then reconnect
3. Multi-device receiver read sync
4. App force kill and presence correctness

## 16. Rollout Plan
Phase 1:
1. Harden message status lifecycle and receipts
2. Unread correctness and UI indicators

Phase 2:
1. Realtime Database presence plus Firestore mirror
2. Online/last seen in chat header

Phase 3:
1. Retry hardening and telemetry
2. Performance tuning and soak tests

## 17. Risks and Mitigations
1. Presence false positives
Mitigation: RTDB source-of-truth + Cloud Function mirror + short grace period.

2. Receipt race conditions
Mitigation: idempotent writes, transition guards, participant checks.

3. Unread drift
Mitigation: transactional/batched updates and periodic reconciliation checks.

## 18. Definition of Done
1. All FR acceptance criteria pass.
2. Security rules pass emulator tests.
3. Performance targets met in staging.
4. No critical receipt/presence inconsistencies after soak test.

## 19. Implementation Mapping to Existing Code
Primary files to update:
1. src/services/chatService.ts
2. src/hooks/useChat.ts
3. src/hooks/useSendMessage.ts
4. app/chat/[id].tsx
5. src/types/user.ts
6. firestore.rules
7. firestore.indexes.json

Expected outcomes by file:
1. chatService: strict delivered/read methods and transition safety.
2. useChat: delivered-before-read listener behavior.
3. useSendMessage: pending/failed/retry flow.
4. chat screen: correct ticks and presence header.
5. types: finalized schema for status/presence.
6. rules/indexes: secure, scalable query support.
