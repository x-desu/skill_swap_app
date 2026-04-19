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
  increment,
  writeBatch,
  getCountFromServer,
} from '@react-native-firebase/firestore';
import { geohashForLocation, geohashQueryBounds, distanceBetween } from 'geofire-common';
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

  if (snap.exists()) {
    // Document exists — merge all supplied fields into the existing document.
    // Using { merge: true } ensures we never wipe fields the caller didn't supply.
    // This correctly persists ALL fields including isProfileComplete, teachSkills, etc.
    const updateData: Record<string, any> = {
      ...data,
      updatedAt: serverTimestamp(),
    };

    // If photoURL is being set, also flag hasPhoto
    if (data.photoURL) {
      updateData.hasPhoto = true;
    }

    // Remove undefined values — Firestore rejects them
    Object.keys(updateData).forEach((k) => {
      if (updateData[k] === undefined) delete updateData[k];
    });

    await updateDoc(ref, updateData);
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
  if (!snap.exists()) return null;
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
      if (!snap.exists()) {
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

// ─── Daily Limits ─────────────────────────────────────────────────────────────

/**
 * Check and reset daily limits if it's a new day.
 */
export const checkAndResetDailyLimits = async (uid: string): Promise<void> => {
  const ref = doc(usersCol(), uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  if (!data) return;

  const now = new Date();
  const lastReset = data.lastLimitResetAt?.toDate() || new Date(0);
  
  if (
    now.getFullYear() !== lastReset.getFullYear() ||
    now.getMonth() !== lastReset.getMonth() ||
    now.getDate() !== lastReset.getDate()
  ) {
    await updateDoc(ref, {
      dailySwipes: 0,
      dailyMessages: 0,
      dailyRequests: 0,
      dailyFollows: 0,
      lastLimitResetAt: serverTimestamp(),
    });
  }
};

/**
 * Increment a specific daily limit counter for the user.
 */
export const incrementDailyLimit = (uid: string, field: 'dailySwipes' | 'dailyMessages' | 'dailyRequests' | 'dailyFollows'): Promise<void> => {
  return updateDoc(doc(usersCol(), uid), {
    [field]: increment(1)
  });
};

// ─── Geospatial Operations ────────────────────────────────────────────────────

/**
 * Update the user's current location with geohash.
 */
export const updateUserLocation = async (
  uid: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  const geohash = geohashForLocation([latitude, longitude]);
  await updateDoc(doc(usersCol(), uid), {
    coords: { latitude, longitude },
    geohash,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Listen to users within a specific radius (in meters).
 * Note: Firestore doesn't support multi-range queries, so we combine multiple range listeners.
 */
export const listenToUsersInRange = (
  center: [number, number],
  radiusInMeters: number,
  callback: (users: UserDocument[]) => void
): (() => void) => {
  const bounds = geohashQueryBounds(center, radiusInMeters);
  const unsubs: (() => void)[] = [];
  const resultsMap: Record<string, UserDocument[]> = {};

  let timer: NodeJS.Timeout | null = null;
  const notify = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      // Merge results from all bound ranges and deduplicate by UID
      const allUsers: UserDocument[] = [];
      const seenUids = new Set<string>();

      Object.values(resultsMap).forEach(users => {
        users.forEach(user => {
          if (!seenUids.has(user.uid)) {
            // Verify distance (geohash bounds are rectangles, we want a circle)
            if (user.coords) {
              const dist = distanceBetween(center, [user.coords.latitude, user.coords.longitude]) * 1000;
              if (dist <= radiusInMeters) {
                allUsers.push(user);
                seenUids.add(user.uid);
              }
            }
          }
        });
      });

      callback(allUsers);
    }, 150); // Aggressive 150ms debounce to prevent MapView insertion floods
  };

  bounds.forEach((b, index) => {
    const q = query(
      usersCol(),
      orderBy('geohash'),
      where('geohash', '>=', b[0]),
      where('geohash', '<=', b[1]),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      resultsMap[index] = snap.docs.map(d => ({ ...(d.data() as UserDocument), uid: d.id }));
      notify();
    }, console.error);
    
    unsubs.push(unsub);
  });
  return () => unsubs.forEach(u => u());
};

/**
 * Permanently randomizes the location of users to simulate city-wide coverage.
 * Targets users clustered at Viman Nagar (home) and spreads them within 25km.
 */
export const permanentlySpreadUsersInPune = async (maxUsers = 250): Promise<number> => {
  const VIMAN_NAGAR = { lat: 18.5679, lng: 73.9143 };
  const snap = await getDocs(query(usersCol(), limit(maxUsers)));
  
  if (snap.empty) return 0;

  const db = getFirestore();
  const batch = writeBatch(db);
  let updatedCount = 0;

  for (const userDoc of snap.docs) {
    // Randomize within 20km for higher density in the city
    const radiusKm = 20 * Math.sqrt(Math.random());
    const angle = Math.random() * 2 * Math.PI;
    
    const newLat = VIMAN_NAGAR.lat + (radiusKm / 111.32) * Math.cos(angle);
    const newLng = VIMAN_NAGAR.lng + (radiusKm / (111.32 * Math.cos(VIMAN_NAGAR.lat * Math.PI / 180))) * Math.sin(angle);
    
    const newGeohash = geohashForLocation([newLat, newLng]);
    
    batch.update(userDoc.ref, {
      coords: { latitude: newLat, longitude: newLng },
      geohash: newGeohash,
      updatedAt: serverTimestamp(),
    });
    updatedCount++;
  }
  
  if (updatedCount > 0) await batch.commit();
  return updatedCount;
};

/**
 * Diagnostic: Returns total number of users in the collection.
 */
export const getTotalUsersCount = async (): Promise<number> => {
  try {
    // getCountFromServer is very efficient
    const snap = await getCountFromServer(usersCol());
    return snap.data().count;
  } catch (e) {
    console.log('[Diagnostic] getCountFromServer failed, falling back to full fetch', e);
    try {
      const snap = await getDocs(usersCol());
      return snap.size;
    } catch (e2) {
      console.error('[Diagnostic] Total count failed', e2);
      return -1;
    }
  }
};

/**
 * Detailed report of the repair operation.
 */
export interface RepairReport {
  totalDocs: number;
  updated: number;
  skipped: number;
  skippedIds: string[];
  allUniqueKeys: string[];
}

/**
 * Maintenance: Forcefully recalculates geohashes for ALL users with any coordinate data.
 * Broadened to detect location in many nested/renamed fields.
 */
export const repairMissingGeohashes = async (): Promise<RepairReport> => {
  console.log('[Maintenance] Starting deep repair...');
  
  const snap = await getDocs(usersCol());
  const report: RepairReport = {
    totalDocs: snap.size,
    updated: 0,
    skipped: 0,
    skippedIds: [],
    allUniqueKeys: []
  };

  const keySet = new Set<string>();
  const batch = writeBatch(getFirestore());

  for (const d of snap.docs) {
    const data = d.data() as any;
    
    // Collect all keys for structural awareness
    Object.keys(data).forEach(k => keySet.add(k));

    // Exhaustive coordinate detection
    const lat = data.coords?.latitude ?? data.latitude ?? data.lat ?? data.location?.latitude ?? data.location?.lat ?? data.pos?.latitude ?? data.position?.lat;
    const lng = data.coords?.longitude ?? data.longitude ?? data.lng ?? data.long ?? data.location?.longitude ?? data.location?.lng ?? data.pos?.longitude ?? data.position?.long;

    if (lat !== undefined && lng !== undefined && !isNaN(Number(lat))) {
      const g = geohashForLocation([Number(lat), Number(lng)]);
      
      batch.update(d.ref, {
        geohash: g,
        coords: { latitude: Number(lat), longitude: Number(lng) },
        updatedAt: serverTimestamp(),
      });
      report.updated++;
    } else {
      report.skipped++;
      report.skippedIds.push(d.id);
    }
  }
  
  report.allUniqueKeys = Array.from(keySet);

  if (report.updated > 0) {
    await batch.commit();
    console.log(`[Maintenance] Deep repair: Updated ${report.updated}, Skipped ${report.skipped}`);
  }

  return report;
};

/**
 * Diagnostic: Scans all users and returns unique keys found in their documents.
 */
export const getUserStructuralSamples = async (): Promise<string[]> => {
  const snap = await getDocs(usersCol());
  const keys = new Set<string>();
  snap.docs.forEach(d => {
    Object.keys(d.data()).forEach(k => keys.add(k));
  });
  return Array.from(keys).sort();
};
