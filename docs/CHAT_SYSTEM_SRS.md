# SkillSwap Chat System - Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the SkillSwap Chat System, which enables real-time messaging between matched users who have mutually liked each other.

### 1.2 Scope
The chat system provides:
- Real-time text messaging between matched users
- Message persistence and history
- Read receipts and delivery status
- Typing indicators
- Push notifications for new messages
- Message reactions (emoji)
- Image sharing support

### 1.3 Definitions
- **Match**: Two users who have mutually liked each other
- **Message Thread**: A conversation between two matched users
- **Read Receipt**: Indicator showing a message has been read
- **Typing Indicator**: Visual feedback when the other user is typing

## 2. System Overview

### 2.1 Current Architecture
The chat system uses:
- **Frontend**: React Native with react-native-gifted-chat
- **Backend**: Firebase Firestore
- **Real-time Sync**: Firestore onSnapshot listeners
- **Data Structure**: Subcollection pattern (`matches/{matchId}/messages/{messageId}`)

### 2.2 Current Limitations
- No read receipts
- No typing indicators
- No push notifications
- No image sharing
- No message reactions
- Messages list limited to 50 most recent
- No offline message queuing

## 3. Functional Requirements

### 3.1 Core Messaging (FR-001 to FR-010)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-001 | Users can send text messages | P0 | ✅ Implemented |
| FR-002 | Messages display in real-time | P0 | ✅ Implemented |
| FR-003 | Messages show timestamp | P0 | ✅ Implemented |
| FR-004 | Messages persist in Firestore | P0 | ✅ Implemented |
| FR-005 | Messages ordered chronologically | P0 | ✅ Implemented |
| FR-006 | Chat header shows match's name and photo | P0 | 🔄 Needs Fix |
| FR-007 | Users can view message history | P0 | ✅ Implemented |
| FR-008 | Auto-scroll to latest message | P1 | ⬜ Pending |
| FR-009 | Message pagination for history | P1 | ⬜ Pending |
| FR-010 | Delete message option | P2 | ⬜ Pending |

### 3.2 Read Receipts (FR-011 to FR-015)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-011 | Mark messages as "delivered" when received | P1 | ⬜ Pending |
| FR-012 | Mark messages as "read" when viewed | P1 | ⬜ Pending |
| FR-013 | Show read receipt to sender | P1 | ⬜ Pending |
| FR-014 | Show delivery receipt to sender | P1 | ⬜ Pending |
| FR-015 | Read status synced across devices | P1 | ⬜ Pending |

### 3.3 Typing Indicators (FR-016 to FR-020)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-016 | Detect when user is typing | P1 | ⬜ Pending |
| FR-017 | Show "typing..." indicator to other user | P1 | ⬜ Pending |
| FR-018 | Typing timeout after 3 seconds of inactivity | P1 | ⬜ Pending |
| FR-019 | Typing status synced in real-time | P1 | ⬜ Pending |
| FR-020 | Respect user privacy (can disable) | P2 | ⬜ Pending |

### 3.4 Push Notifications (FR-021 to FR-025)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-021 | Send push notification on new message | P0 | ⬜ Pending |
| FR-022 | Notification shows sender name and message preview | P0 | ⬜ Pending |
| FR-023 | Tapping notification opens chat | P0 | ⬜ Pending |
| FR-024 | No notification if user is in chat | P1 | ⬜ Pending |
| FR-025 | Batch notifications for multiple messages | P2 | ⬜ Pending |

### 3.5 Media Sharing (FR-026 to FR-030)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-026 | Send images in chat | P1 | ⬜ Pending |
| FR-027 | Image compression before upload | P1 | ⬜ Pending |
| FR-028 | Image preview in chat | P1 | ⬜ Pending |
| FR-029 | Tap to view full image | P1 | ⬜ Pending |
| FR-030 | Image upload progress indicator | P2 | ⬜ Pending |

### 3.6 Message Reactions (FR-031 to FR-035)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-031 | Add emoji reaction to message | P2 | ⬜ Pending |
| FR-032 | Show reaction count per emoji | P2 | ⬜ Pending |
| FR-033 | Toggle reaction on/off | P2 | ⬜ Pending |
| FR-034 | Show who reacted | P2 | ⬜ Pending |
| FR-035 | Limited to 6 common emojis | P2 | ⬜ Pending |

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-001 to NFR-005)

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Message send latency | < 500ms |
| NFR-002 | Message receive latency | < 1 second |
| NFR-003 | Initial chat load time | < 2 seconds |
| NFR-004 | Support 1000+ messages per chat | ✅ |
| NFR-005 | Battery efficient listeners | Background pause |

### 4.2 Security (NFR-006 to NFR-010)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-006 | Only match participants can access chat | ✅ Firestore Rules |
| NFR-007 | Messages encrypted in transit | ✅ HTTPS/TLS |
| NFR-008 | No message content in push notifications (optional) | ⬜ Pending |
| NFR-009 | Rate limiting on message send | ⬜ Pending |
| NFR-010 | Content moderation for messages | ⬜ Pending |

### 4.3 Reliability (NFR-011 to NFR-015)

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-011 | Message delivery guarantee | ⬜ Pending |
| NFR-012 | Offline message queuing | ⬜ Pending |
| NFR-013 | Automatic reconnection | ✅ Firebase SDK |
| NFR-014 | Message deduplication | ✅ UUID-based |
| NFR-015 | 99.9% uptime SLA | ✅ Firebase |

## 5. Data Model

### 5.1 Message Document
```typescript
interface MessageDocument {
  _id: string;                    // UUID
  text: string;                   // Message content
  createdAt: Timestamp;           // Server timestamp
  user: {
    _id: string;                  // Sender UID
    name: string;                 // Sender display name
    avatar?: string;              // Sender photo URL
  };
  image?: string;                 // Optional image URL
  reactions?: {                   // Emoji reactions
    [emoji: string]: string[];    // Array of user UIDs
  };
  readBy?: string[];              // Array of user UIDs who read
  deliveredTo?: string[];         // Array of user UIDs delivered
  status: 'sent' | 'delivered' | 'read';
}
```

### 5.2 Match Document (Chat Metadata)
```typescript
interface MatchDocument {
  id: string;                     // Combined UID string
  users: string[];                // [uidA, uidB]
  matchedAt: Timestamp;
  
  // Chat metadata
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
  unreadCount: {                  // Per-user unread counts
    [uid: string]: number;
  };
  
  // Typing indicators
  typingStatus?: {
    [uid: string]: boolean;
  };
  typingUpdatedAt?: Timestamp;
}
```

### 5.3 Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Messages subcollection - only match participants
    match /matches/{matchId}/messages/{messageId} {
      allow read: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.users;
      allow create: if request.auth != null && 
        request.auth.uid in get(/databases/$(database)/documents/matches/$(matchId)).data.users &&
        request.resource.data.user._id == request.auth.uid;
      allow update, delete: if false; // Messages immutable
    }
    
    // Match document - only participants can update typing/unread
    match /matches/{matchId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.users;
      allow update: if request.auth != null && 
        request.auth.uid in resource.data.users &&
        (
          request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['lastMessage', 'lastMessageTime', 'lastMessageSender', 'unreadCount', 'typingStatus', 'typingUpdatedAt'])
        );
    }
  }
}
```

## 6. User Interface Requirements

### 6.1 Chat Screen Layout
- **Header**: Back button, user avatar + name, options menu
- **Message List**: Bubble-style messages, right for me, left for them
- **Input Area**: Text field, send button, image attachment button
- **Empty State**: "Say hello to start the conversation"

### 6.2 Message Bubble Design
- **Sent**: Rose primary color (#ff1a5c), white text, right-aligned
- **Received**: Semi-transparent white, white text, left-aligned
- **Timestamp**: Below bubble, small, muted color
- **Read Receipt**: Double checkmark when read

### 6.3 Typing Indicator
- Positioned above input area
- Animated dots or "User is typing..." text
- Auto-dismiss after 3 seconds

## 7. Integration Requirements

### 7.1 Firebase Services
- **Firestore**: Message storage and real-time sync
- **Cloud Functions**: Push notification triggers
- **Storage**: Image uploads
- **FCM**: Push notifications

### 7.2 External Services
- **Expo Notifications**: Local notification handling
- **ImagePicker**: Photo selection
- **ImageManipulator**: Compression

## 8. Testing Requirements

### 8.1 Unit Tests
- Message sending logic
- Message formatting
- Timestamp conversion
- Read receipt calculations

### 8.2 Integration Tests
- Firestore listener setup/teardown
- Message persistence
- Real-time updates

### 8.3 E2E Tests
- Full chat flow between two users
- Push notification delivery
- Image upload and display
- Offline behavior

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Message delivery rate | > 99.5% |
| Average message latency | < 1 second |
| Chat open rate from push | > 60% |
| User satisfaction (chat) | > 4.0/5.0 |
| Message errors per day | < 0.1% |

---

**Document Version**: 1.0
**Last Updated**: March 28, 2026
**Author**: SkillSwap Development Team
