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
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  deleteDoc,
} from '@react-native-firebase/firestore';
import {
  UserDocument,
  UserProfileInput,
  SwapRequest,
  SwapStatus,
} from '../types/user';

// ─── Collection references ────────────────────────────────────────────────────

const db = () => getFirestore();
const usersCol = () => collection(db(), 'users');
const swapsCol = () => collection(db(), 'swapRequests');

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
      credits: 10,
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
  onSnapshot(doc(usersCol(), uid), (snap) => {
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
  let usersQuery = query(
    usersCol(),
    where('isProfileComplete', '==', true),
    orderBy('rating', 'desc'),
    limit(30),
  );

  // If category keywords provided, filter by teachSkills array-contains-any
  if (categoryKeywords && categoryKeywords.length > 0) {
    usersQuery = query(
      usersCol(),
      where('isProfileComplete', '==', true),
      where('teachSkills', 'array-contains-any', categoryKeywords.slice(0, 10)),
      orderBy('rating', 'desc'),
      limit(30),
    );
  }

  return onSnapshot(usersQuery, (snap) => {
    const users = snap.docs
      .map((userDoc: any) => ({ ...(userDoc.data() as UserDocument), uid: userDoc.id }))
      .filter((user: UserDocument) => user.uid !== currentUid);
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
  const usersQuery = query(
    usersCol(),
    where('isProfileComplete', '==', true),
    where('teachSkills', 'array-contains', skill),
    limit(20),
  );
  const snap = await getDocs(usersQuery);
  return snap.docs.map((userDoc: any) => ({ ...(userDoc.data() as UserDocument), uid: userDoc.id }));
};

// ─── Swap Requests ────────────────────────────────────────────────────────────

/**
 * Create a new swap request with denormalised sender display data.
 * status is always 'pending' on creation.
 */
export const createSwapRequest = async (
  data: Omit<SwapRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<void> => {
  await addDoc(swapsCol(), {
    ...data,
    status: 'pending' as SwapStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

  const incomingQuery = query(
    swapsCol(),
    where('toUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const unsubIncoming = onSnapshot(incomingQuery, (snap) => {
      incoming = snap.docs.map((requestDoc: any) => ({
        ...(requestDoc.data() as SwapRequest),
        id: requestDoc.id,
      }));
      resolved[0] = true;
      notify();
    }, console.error);

  const outgoingQuery = query(
    swapsCol(),
    where('fromUid', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  const unsubOutgoing = onSnapshot(outgoingQuery, (snap) => {
      outgoing = snap.docs.map((requestDoc: any) => ({
        ...(requestDoc.data() as SwapRequest),
        id: requestDoc.id,
      }));
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
  updateDoc(doc(swapsCol(), id), {
    status,
    updatedAt: serverTimestamp(),
  });

/**
 * Delete a pending swap request (only the sender should be able to do this).
 */
export const deleteSwapRequest = (id: string): Promise<void> =>
  deleteDoc(doc(swapsCol(), id));
