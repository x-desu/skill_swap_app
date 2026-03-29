# SkillSwap Chat System - Implementation Plan

## Overview
This document provides a step-by-step implementation plan for the SkillSwap Chat System based on the SRS. The implementation is divided into phases to allow incremental delivery and testing.

## Phase 1: Core Improvements (P0)
**Timeline**: 1-2 days
**Goal**: Fix existing issues and add essential missing features

### 1.1 Fix Chat Header Display
**File**: `app/chat/[id].tsx`
- [ ] Pass user name and photo from matches screen to chat
- [ ] Update header to display actual user info instead of UID

### 1.2 Add Unread Message Counts
**Files**: 
- `src/services/chatService.ts`
- `src/hooks/useChat.ts`
- `app/(tabs)/matches.tsx`

**Implementation**:
1. Add `unreadCount` field to MatchDocument type
2. Update `sendMessage` to increment unread count for recipient
3. Update `useChat` to mark messages as read when chat is opened
4. Show unread badge on matches list

### 1.3 Message Pagination
**Files**:
- `src/services/chatService.ts`
- `src/hooks/useChat.ts`

**Implementation**:
1. Update `subscribeToMessages` to use cursor-based pagination
2. Add `loadMoreMessages` function
3. Implement "Load earlier messages" button in UI

## Phase 2: Read Receipts & Delivery Status (P1)
**Timeline**: 2-3 days
**Goal**: Implement message read and delivery tracking

### 2.1 Update Data Models
**File**: `src/types/user.ts`
```typescript
interface MessageDocument {
  // ... existing fields
  readBy?: string[];
  deliveredTo?: string[];
  status: 'sent' | 'delivered' | 'read';
}
```

### 2.2 Update Message Sending
**File**: `src/services/chatService.ts`
- Update `sendMessage` to initialize `deliveredTo` and `readBy` arrays
- Add `updateMessageStatus` function

### 2.3 Add Read Receipt Logic
**File**: `src/hooks/useChat.ts`
- Add `markAsRead` function
- Auto-mark visible messages as read
- Debounce read status updates (batch them)

### 2.4 UI Updates
**File**: `app/chat/[id].tsx`
- Add read receipt indicator (double checkmark) to message bubbles
- Show "Delivered" / "Read" status

## Phase 3: Typing Indicators (P1)
**Timeline**: 1-2 days
**Goal**: Real-time typing status

### 3.1 Update Match Document
**File**: `src/types/user.ts`
```typescript
interface MatchDocument {
  // ... existing fields
  typingStatus?: { [uid: string]: boolean };
  typingUpdatedAt?: Timestamp;
}
```

### 3.2 Typing Service
**File**: `src/services/chatService.ts`
- Add `updateTypingStatus(matchId, isTyping)` function
- Add 3-second timeout for auto-clearing typing status

### 3.3 Typing Hook
**File**: `src/hooks/useTyping.ts` (new)
```typescript
export const useTyping = (matchId: string) => {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  
  // Debounce typing updates
  // Listen to other user's typing status
  
  return { isTyping, otherUserTyping, setTyping };
};
```

### 3.4 UI Integration
**File**: `app/chat/[id].tsx`
- Add typing indicator above input
- Animate dots or show "User is typing..."

## Phase 4: Push Notifications (P0)
**Timeline**: 2-3 days
**Goal**: Notify users of new messages

### 4.1 FCM Token Management
**File**: `src/services/firestoreService.ts`
- Add `updateFcmToken(uid, token)` function
- Store token in user document

### 4.2 App Initialization
**File**: `src/services/appInit.ts`
- Request notification permissions
- Get FCM token on app launch
- Update token when it changes

### 4.3 Notification Handler
**File**: `src/services/notificationService.ts` (new)
```typescript
export const notificationService = {
  initialize: () => {
    // Set up notification listeners
    // Handle notification taps
  },
  
  showLocalNotification: (title, body, data) => {
    // Show local notification when app in foreground
  },
  
  handleBackgroundNotification: (notification) => {
    // Navigate to chat when tapped
  }
};
```

### 4.4 Cloud Functions
**New File**: `functions/src/index.ts` (Firebase Cloud Functions)
```typescript
exports.onNewMessage = functions.firestore
  .document('matches/{matchId}/messages/{messageId}')
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const matchId = context.params.matchId;
    
    // Get match data
    // Get recipient's FCM token
    // Send push notification
    // Skip if recipient is in the chat
  });
```

## Phase 5: Image Sharing (P1)
**Timeline**: 2-3 days
**Goal**: Share images in chat

### 5.1 Image Service
**File**: `src/services/chatService.ts`
- Add `sendImageMessage(matchId, imageUri, user)` function
- Compress image before upload
- Upload to Firebase Storage

### 5.2 Storage Rules
**File**: `storage.rules`
```
service firebase.storage {
  match /b/{bucket}/o {
    match /chat-images/{matchId}/{imageId} {
      allow write: if request.auth != null &&
        request.auth.uid in firestore.get(/databases/(default)/documents/matches/$(matchId)).data.users;
      allow read: if request.auth != null &&
        request.auth.uid in firestore.get(/databases/(default)/documents/matches/$(matchId)).data.users;
    }
  }
}
```

### 5.3 UI Updates
**File**: `app/chat/[id].tsx`
- Add image picker button to input toolbar
- Show image preview in message bubble
- Tap to view full image

## Phase 6: Message Reactions (P2)
**Timeline**: 1-2 days
**Goal**: Emoji reactions on messages

### 6.1 Update Types
**File**: `src/types/user.ts`
```typescript
interface MessageDocument {
  // ... existing fields
  reactions?: {
    [emoji: string]: string[]; // Array of user UIDs
  };
}
```

### 6.2 Reaction Service
**File**: `src/services/chatService.ts`
- Add `toggleReaction(matchId, messageId, emoji, userId)` function

### 6.3 UI Component
**File**: `src/components/MessageReactions.tsx` (new)
- Long press to show reaction picker
- Show reaction count below message

## Implementation Order

### Week 1: Core Improvements
1. Day 1: Fix chat header, add unread counts
2. Day 2: Message pagination, read receipts

### Week 2: Real-time Features
1. Day 3-4: Typing indicators
2. Day 5: Push notifications setup

### Week 3: Media & Polish
1. Day 6-7: Image sharing
2. Day 8: Message reactions
3. Day 9-10: Testing & bug fixes

## Testing Checklist

### Unit Tests
- [ ] Message sending
- [ ] Message formatting
- [ ] Read receipt logic
- [ ] Typing status updates

### Integration Tests
- [ ] Firestore listener lifecycle
- [ ] Message persistence
- [ ] Real-time sync

### E2E Tests
- [ ] Full chat flow
- [ ] Push notification delivery
- [ ] Image upload/display
- [ ] Offline behavior

## Firestore Index Requirements

```json
{
  "indexes": [
    {
      "collectionGroup": "matches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "users", "arrayConfig": "CONTAINS" },
        { "fieldPath": "matchedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "messages",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "matchId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Dependencies to Add

```json
{
  "dependencies": {
    "expo-notifications": "~0.28.0",
    "expo-image-picker": "~15.0.0",
    "expo-image-manipulator": "~12.0.0",
    "react-native-reanimated": "~3.10.0"
  }
}
```

## Success Criteria

| Phase | Criteria |
|-------|----------|
| 1 | Chat shows user names, unread counts work, pagination loads older messages |
| 2 | Read receipts display correctly, status updates in real-time |
| 3 | Typing indicator appears within 500ms, clears after 3s timeout |
| 4 | Push notifications received when app backgrounded, tapping opens chat |
| 5 | Images upload < 5s, display correctly, tap to view full |
| 6 | Reactions toggle on/off, show count, limited to 6 emojis |

## Rollback Plan

Each phase is designed to be independently reversible:
1. Keep old message format compatible
2. New fields are optional
3. Feature flags can disable new UI elements
4. Database migrations are additive only

---

**Document Version**: 1.0
**Last Updated**: March 28, 2026
**Next Review**: After Phase 1 completion
