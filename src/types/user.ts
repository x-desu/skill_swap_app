import { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export type Timestamp = FirebaseFirestoreTypes.Timestamp;

// ─── Skill Catalog ────────────────────────────────────────────────────────────

export type SkillCategory =
  | 'Tech'
  | 'Music'
  | 'Art'
  | 'Language'
  | 'Sports'
  | 'Business'
  | 'Cooking'
  | 'Other';

export interface Skill {
  id: string;         // Firestore doc ID
  name: string;       // "Python", "Guitar"
  category: SkillCategory;
  usageCount: number; // incremented when a user adds this skill
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserDocument {
  uid: string;
  displayName: string;
  photoURL: string | null;
  email: string | null;
  bio: string;
  location: { 
    city: string; 
    country: string;
    lat?: number;
    lng?: number;
  };

  // Skills stored as plain strings for simplicity + speed of querying
  teachSkills: string[];
  wantSkills: string[];

  // Stats (updated via batch writes)
  rating: number;         // 0–5 average
  reviewCount: number;
  completedSwaps: number;
  credits?: number;       // server-owned wallet projection

  subscriptionTier?: string;
  subscriptionStatus?: string;
  subscriptionProductId?: string;
  subscriptionExpiresAt?: Timestamp;
  hasPremiumAccess?: boolean;
  revenueCatAppUserId?: string;

  // Flags
  isProfileComplete: boolean;
  hasPhoto: boolean;
  hasSeenPaywall?: boolean; // Track if user has seen onboarding paywall
  fcmToken?: string; // for push notifications (future)
  expoPushToken?: string; // legacy
  pushToken?: string;    // new standard push token key

  // Engagement Metrics (Phase 1)

  isOnline?: boolean;
  lastActive?: Timestamp;
  swipeRightCount?: number;
  swipeLeftCount?: number;
  mutualMatches?: number;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Swap Requests (Legacy - DEPRECATED per SRS 18) ───────────────────────────
// The swapRequests collection is deprecated. Use `likes` + `matches` instead.
// These types are kept for reference only - do not use in new code.

/** @deprecated Use likes/matches flow instead per SRS 18 */
export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed';

/** @deprecated Use LikeDocument/MatchDocument instead per SRS 18 */
export interface SwapRequest {
  id?: string;          // Firestore doc ID (injected client-side)
  fromUid: string;
  toUid: string;

  // Denormalised for display without extra reads
  fromName: string;
  toName: string;
  fromPhotoURL: string | null;
  toPhotoURL: string | null;

  offeredSkill: string;
  wantedSkill: string;
  message: string;
  status: SwapStatus;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Matching Engine (Phase 1) ────────────────────────────────────────────────

export interface LikeDocument {
  id?: string;
  fromUid: string;
  toUid: string;
  type: 'like' | 'pass';
  createdAt: Timestamp;
}

export interface MatchDocument {
  id: string; // usually a combined string of uidA_uidB
  users: string[]; // [uidA, uidB]
  matchedAt: Timestamp;
  lastMessage?: string;
  lastMessageTime?: Timestamp;
  lastMessageSender?: string;
  unreadCount?: { [uid: string]: number }; // Track unread messages per user
  
  // Typing indicators (Phase 3)
  typingStatus?: { [uid: string]: boolean };
  typingUpdatedAt?: Timestamp;
}

// ─── Chat System (Phase 1) ────────────────────────────────────────────────────

// Maps directly to react-native-gifted-chat IMessage interface
// NOTE: SRS 7.4 specifies `user.uid`, but we use `user._id` for GiftedChat compatibility.
// This is an intentional deviation from the canonical schema for UI library requirements.
export interface MessageDocument {
  _id: string; // Firestore doc ID (also GiftedChat message ID)
  text: string;
  createdAt: Timestamp | number | Date; // GiftedChat accepts number/Date; Firestore uses Timestamp
  user: {
    _id: string; // Note: SRS specifies 'uid', but GiftedChat requires '_id'
    name?: string;
    avatar?: string;
  };
  image?: string;
  video?: string;
  audio?: string;
  system?: boolean;
  sent?: boolean;
  received?: boolean;
  pending?: boolean;
  
  // Read receipts (Phase 2)
  readBy?: string[];              // Array of user UIDs who have read
  deliveredTo?: string[];         // Array of user UIDs delivered to
  status?: 'sent' | 'delivered' | 'read';
  
  // Reactions (Phase 6)
  reactions?: {
    [emoji: string]: string[];    // Array of user UIDs who reacted
  };
}

// ─── Notification (subcollection: users/{uid}/notifications/{id}) ──────────

export type NotificationType = 'swap_request' | 'swap_accepted' | 'swap_completed' | 'review' | 'new_match' | 'new_message' | 'system';

export interface AppNotification {
  id: string; // Document ID
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    matchId?: string;
    targetUid?: string;
    targetName?: string;
    targetPhotoURL?: string;
    senderId?: string;
    senderName?: string;
    senderPhotoURL?: string;
    screen?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: Timestamp;
}

// ── Convenience type for creating/updating user profiles ─────────────────────

export type UserProfileInput = Omit<UserDocument, 'uid' | 'createdAt' | 'updatedAt' | 'swipeRightCount' | 'swipeLeftCount' | 'mutualMatches' | 'credits' | 'subscriptionTier' | 'subscriptionStatus' | 'subscriptionProductId' | 'subscriptionExpiresAt' | 'hasPremiumAccess' | 'revenueCatAppUserId'>;
