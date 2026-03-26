/**
 * firestoreService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all Firestore operations in SkillSwap.
 * - All writes use serverTimestamp() for consistency
 * - All listeners return their unsubscribe function
 * - No direct Firestore calls should exist outside this file
 */
import firestore from '@react-native-firebase/firestore';
import {
  UserDocument,
  UserProfileInput,
  SwapRequest,
  SwapStatus,
} from '../types/user';

// ─── Collection references ────────────────────────────────────────────────────

const usersCol = () => firestore().collection('users');
const swapsCol = () => firestore().collection('swapRequests');

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
  const ref = usersCol().doc(uid);

  // Single set() with merge:true — atomic, no get() needed, no race condition.
  // Defaults fill missing fields on first write; subsequent writes only touch
  // what's in `data` plus updatedAt (merge preserves everything else).
  await ref.set(
    {
      // Defaults — overridden by `data` if provided
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
      credits: 10,
      isProfileComplete: false,
      hasPhoto: false,
      // Caller-supplied data wins over defaults
      ...data,
      // These are always written
      uid,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
};

/**
 * One-shot read of a single user document.
 */
export const getUserProfile = async (uid: string): Promise<UserDocument | null> => {
  const snap = await usersCol().doc(uid).get();
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
  usersCol()
    .doc(uid)
    .onSnapshot((snap) => {
      if (!snap.exists) {
        callback(null);
        return;
      }
      callback({ ...(snap.data() as UserDocument), uid: snap.id });
    }, console.error);

/**
 * Real-time listener for the home-screen user discovery feed.
 * Filters by isProfileComplete and optionally by a skill category keyword.
 */
export const listenToNearbyUsers = (
  currentUid: string,
  callback: (users: UserDocument[]) => void,
  categoryKeywords?: string[],
): (() => void) => {
  let query = usersCol()
    .where('isProfileComplete', '==', true)
    .orderBy('rating', 'desc')
    .limit(30);

  // If category keywords provided, filter by teachSkills array-contains-any
  if (categoryKeywords && categoryKeywords.length > 0) {
    query = usersCol()
      .where('isProfileComplete', '==', true)
      .where('teachSkills', 'array-contains-any', categoryKeywords.slice(0, 10))
      .orderBy('rating', 'desc')
      .limit(30);
  }

  return query.onSnapshot((snap) => {
    const users = snap.docs
      .map((d) => ({ ...(d.data() as UserDocument), uid: d.id }))
      .filter((u) => u.uid !== currentUid);
    callback(users);
  }, console.error);
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
  usersCol().doc(uid).update({
    teachSkills,
    wantSkills,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

/**
 * Add a single skill to the user's teach list (no duplicates).
 */
export const addTeachSkill = (uid: string, skill: string): Promise<void> =>
  usersCol().doc(uid).update({
    teachSkills: firestore.FieldValue.arrayUnion(skill),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

/**
 * Remove a single skill from the user's teach list.
 */
export const removeTeachSkill = (uid: string, skill: string): Promise<void> =>
  usersCol().doc(uid).update({
    teachSkills: firestore.FieldValue.arrayRemove(skill),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

/**
 * Add a single skill to the user's want list (no duplicates).
 */
export const addWantSkill = (uid: string, skill: string): Promise<void> =>
  usersCol().doc(uid).update({
    wantSkills: firestore.FieldValue.arrayUnion(skill),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

/**
 * Remove a single skill from the user's want list.
 */
export const removeWantSkill = (uid: string, skill: string): Promise<void> =>
  usersCol().doc(uid).update({
    wantSkills: firestore.FieldValue.arrayRemove(skill),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

// ─── User Discovery ───────────────────────────────────────────────────────────

/**
 * One-shot search: find users who teach a given skill string.
 * Returns up to 20 results.
 */
export const searchUsersBySkill = async (skill: string): Promise<UserDocument[]> => {
  const snap = await usersCol()
    .where('isProfileComplete', '==', true)
    .where('teachSkills', 'array-contains', skill)
    .limit(20)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as UserDocument), uid: d.id }));
};

// ─── Swap Requests ────────────────────────────────────────────────────────────

/**
 * Create a new swap request with denormalised sender display data.
 * status is always 'pending' on creation.
 */
export const createSwapRequest = async (
  data: Omit<SwapRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<void> => {
  await swapsCol().add({
    ...data,
    status: 'pending' as SwapStatus,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });
};


/**
 * Real-time listener for all swap requests involving the current user.
 * Returns both incoming (as toUid) and outgoing (as fromUid) documents.
 */
export const listenToMySwapRequests = (
  uid: string,
  callback: (incoming: SwapRequest[], outgoing: SwapRequest[]) => void,
): (() => void) => {
  let incoming: SwapRequest[] = [];
  let outgoing: SwapRequest[] = [];
  let resolved = [false, false];

  const notify = () => {
    if (resolved[0] && resolved[1]) callback(incoming, outgoing);
  };

  const unsubIncoming = swapsCol()
    .where('toUid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snap) => {
      incoming = snap.docs.map((d) => ({ ...(d.data() as SwapRequest), id: d.id }));
      resolved[0] = true;
      notify();
    }, console.error);

  const unsubOutgoing = swapsCol()
    .where('fromUid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .onSnapshot((snap) => {
      outgoing = snap.docs.map((d) => ({ ...(d.data() as SwapRequest), id: d.id }));
      resolved[1] = true;
      notify();
    }, console.error);

  return () => {
    unsubIncoming();
    unsubOutgoing();
  };
};

/**
 * Update a swap request's status (accept, decline, complete).
 */
export const updateSwapStatus = (id: string, status: SwapStatus): Promise<void> =>
  swapsCol().doc(id).update({
    status,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  });

/**
 * Delete a pending swap request (only the sender should be able to do this).
 */
export const deleteSwapRequest = (id: string): Promise<void> =>
  swapsCol().doc(id).delete();
