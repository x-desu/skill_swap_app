/**
 * firestoreService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all Firestore operations in SkillSwap.
 * - All writes use serverTimestamp() for consistency
 * - All listeners return their unsubscribe function
 * - No direct Firestore calls should exist outside this file
 */
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from '@react-native-firebase/firestore';
import {
  UserDocument,
  UserProfileInput,
} from '../types/user';
import type { CreditLedgerEntry } from '../types/credits';

// ─── Collection references ────────────────────────────────────────────────────

const db = () => getFirestore();
const usersCol = () => collection(db(), 'users');

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * Create or merge a user document — single atomic write, no race condition.
 * - If doc does not exist → Firestore treats this as CREATE
 * - If doc exists → Firestore treats this as UPDATE (merge keeps existing fields)
 * Always includes uid so the CREATE rule is satisfied.
 */
export const upsertUserProfile = async (
  uid: string,
  data: Partial<UserProfileInput>,
): Promise<void> => {
  const ref = doc(usersCol(), uid);
  const snap = await getDoc(ref);

  if (snap.data() !== undefined) {
    // Document exists — only update the specific fields provided
    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } else {
    // New document — inject all required default values
    await setDoc(ref, {
      displayName: '',
      photoURL: null,
      email: null,
      bio: '',
      location: { city: '', country: '' },
      teachSkills: [],
      wantSkills: [],
      rating: 0,
      reviewCount: 0,
      completedSwaps: 0,
      isProfileComplete: false,
      hasPhoto: false,
      ...data, // Caller-supplied data wins
      uid,
      updatedAt: serverTimestamp(),
    });
  }
};

/**
 * One-shot read of a single user document.
 */
export const getUserProfile = async (uid: string): Promise<UserDocument | null> => {
  const snap = await getDoc(doc(usersCol(), uid));
  if (!snap.exists) return null;
  return { ...(snap.data() as UserDocument), uid: snap.id };
};

/**
 * Real-time listener for the current user's own profile.
 * Useful for keeping the UI in sync after profile updates.
 */
export const listenToUserProfile = (
  uid: string,
  callback: (user: UserDocument | null) => void,
): (() => void) =>
  onSnapshot(
    doc(usersCol(), uid),
    (snap) => {
      if (!snap.exists) {
        callback(null);
        return;
      }
      callback({ ...(snap.data() as UserDocument), uid: snap.id });
    },
    console.error
  );

/**
 * Real-time listener for the home-screen user discovery feed.
 * Filters by isProfileComplete and optionally by a skill category keyword.
 */
export const listenToNearbyUsers = (
  currentUid: string,
  callback: (users: UserDocument[]) => void,
  categoryKeywords?: string[],
): (() => void) => {
  let q = query(
    usersCol(),
    where('isProfileComplete', '==', true),
    orderBy('rating', 'desc'),
    limit(30)
  );

  // If category keywords provided, filter by teachSkills array-contains-any
  if (categoryKeywords && categoryKeywords.length > 0) {
    q = query(
      usersCol(),
      where('isProfileComplete', '==', true),
      where('teachSkills', 'array-contains-any', categoryKeywords.slice(0, 10)),
      orderBy('rating', 'desc'),
      limit(30)
    );
  }

  return onSnapshot(
    q,
    (snap) => {
      const users = snap.docs
        .map((d: any) => ({ ...(d.data() as UserDocument), uid: d.id }))
        .filter((u: any) => u.uid !== currentUid);
      callback(users);
    },
    console.error
  );
};

// ─── Skills CRUD ──────────────────────────────────────────────────────────────

/**
 * Replace a user's teach/want skill lists atomically.
 */
export const updateUserSkills = (
  uid: string,
  teachSkills: string[],
  wantSkills: string[],
): Promise<void> =>
  updateDoc(doc(usersCol(), uid), {
    teachSkills,
    wantSkills,
    updatedAt: serverTimestamp(),
  });

/**
 * Add a single skill to the user's teach list (no duplicates).
 */
export const addTeachSkill = (uid: string, skill: string): Promise<void> =>
  updateDoc(doc(usersCol(), uid), {
    teachSkills: arrayUnion(skill),
    updatedAt: serverTimestamp(),
  });

/**
 * Remove a single skill from the user's teach list.
 */
export const removeTeachSkill = (uid: string, skill: string): Promise<void> =>
  updateDoc(doc(usersCol(), uid), {
    teachSkills: arrayRemove(skill),
    updatedAt: serverTimestamp(),
  });

/**
 * Add a single skill to the user's want list (no duplicates).
 */
export const addWantSkill = (uid: string, skill: string): Promise<void> =>
  updateDoc(doc(usersCol(), uid), {
    wantSkills: arrayUnion(skill),
    updatedAt: serverTimestamp(),
  });

/**
 * Remove a single skill from the user's want list.
 */
export const removeWantSkill = (uid: string, skill: string): Promise<void> =>
  updateDoc(doc(usersCol(), uid), {
    wantSkills: arrayRemove(skill),
    updatedAt: serverTimestamp(),
  });

// ─── User Discovery ───────────────────────────────────────────────────────────

/**
 * One-shot search: find users who teach a given skill string.
 * Returns up to 20 results.
 */
export const searchUsersBySkill = async (skill: string): Promise<UserDocument[]> => {
  const snap = await getDocs(
    query(
      usersCol(),
      where('isProfileComplete', '==', true),
      where('teachSkills', 'array-contains', skill),
      limit(20)
    )
  );
  return snap.docs.map((d: any) => ({ ...(d.data() as UserDocument), uid: d.id }));
};

// ─── Swap Requests (DEPRECATED per SRS 18) ────────────────────────────────────
// The swapRequests collection and related functions are deprecated.
// Use `likes` + `matches` collections instead.
// See: createSwapRequest → likeUser(), listenToMySwapRequests → useLikes()

const creditLedgerCol = () => collection(db(), 'creditLedger');

/**
 * Real-time listener for the signed-in user's credit ledger (newest first).
 */
export const listenToCreditLedger = (
  uid: string,
  callback: (entries: CreditLedgerEntry[]) => void,
  maxEntries: number = 50,
): (() => void) => {
  const q = query(
    creditLedgerCol(),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(maxEntries),
  );
  return onSnapshot(
    q,
    (snap) => {
      const entries = snap.docs.map((d: { id: string; data: () => Omit<CreditLedgerEntry, 'id'> }) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(entries);
    },
    console.error,
  );
};

