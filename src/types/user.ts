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
  location: { city: string; country: string };

  // Skills stored as plain strings for simplicity + speed of querying
  teachSkills: string[];
  wantSkills: string[];

  // Stats (updated via batch writes)
  rating: number;         // 0–5 average
  reviewCount: number;
  completedSwaps: number;
  credits: number;        // in-app credit system (future)

  // Flags
  isProfileComplete: boolean;
  hasPhoto: boolean;
  fcmToken?: string; // legacy push token field
  pushToken?: string; // current Expo push token field
  hasSeenPaywall?: boolean;
  revenueCatAppUserId?: string;

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

// ─── Swap Requests (Legacy - To be replaced by Matches) ───────────────────────

export type SwapStatus = 'pending' | 'accepted' | 'declined' | 'completed';

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
}

// ─── Video Calls (Chat-integrated MVP) ───────────────────────────────────────

export type VideoCallStatus =
  | 'ringing'
  | 'accepted'
  | 'declined'
  | 'cancelled'
  | 'ended'
  | 'missed';

export interface VideoCallParticipant {
  uid: string;
  displayName: string;
  photoURL?: string | null;
}

export interface VideoCallDocument {
  id: string;
  matchId: string;
  streamCallId: string;
  streamCallType: string;
  initiatedFrom: 'chat';
  callerUid: string;
  calleeUid: string;
  participantUids: string[];
  caller: VideoCallParticipant;
  callee: VideoCallParticipant;
  status: VideoCallStatus;
  acceptedAt?: Timestamp | number | Date | null;
  endedAt?: Timestamp | number | Date | null;
  endedByUid?: string | null;
  createdAt: Timestamp | number | Date | null;
  updatedAt: Timestamp | number | Date | null;
}

// ─── Chat System (Phase 1) ────────────────────────────────────────────────────

// Maps directly to react-native-gifted-chat IMessage interface
export interface MessageDocument {
  _id: string; // Firestore doc ID
  text: string;
  createdAt: Timestamp | number | Date; // GiftedChat accepts number/Date; Firestore uses Timestamp
  user: {
    _id: string;
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
}

// ─── In-App Notifications ─────────────────────────────────────────────────────

export type NotificationType =
  | 'swap_request'
  | 'swap_accepted'
  | 'swap_completed'
  | 'review'
  | 'new_match'
  | 'new_message'
  | 'system';

export interface AppNotificationData {
  matchId?: string;
  targetUid?: string;
  targetName?: string;
  targetPhotoURL?: string;
  senderId?: string;
  senderName?: string;
  senderPhotoURL?: string;
  type?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: AppNotificationData;
  read: boolean;
  createdAt: Timestamp | number | Date | null;
}

// ── Convenience type for creating/updating user profiles ─────────────────────

export type UserProfileInput = Omit<UserDocument, 'uid' | 'createdAt' | 'updatedAt' | 'lastActive' | 'swipeRightCount' | 'swipeLeftCount' | 'mutualMatches'>;
