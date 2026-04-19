import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, updateDoc, doc } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Center: Pune, Maharashtra
const CENTER = { lat: 18.5204, lng: 73.8567 };

async function activateUsers() {
  console.log('--- Starting User Activation (Pune Region) ---');
  const usersCol = collection(db, 'users');
  // Fetch more users to populate the map
  const snap = await getDocs(query(usersCol, limit(50)));
  
  if (snap.empty) {
    console.log('No users found to activate.');
    return;
  }

  console.log(`Found ${snap.size} users. Spreading across Pune region...`);

  for (const userDoc of snap.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();

    // Generate random offset within ~15km
    // 0.1 degree is roughly 11km
    const latOffset = (Math.random() - 0.5) * 0.25; 
    const lngOffset = (Math.random() - 0.5) * 0.25;
    
    const latitude = CENTER.lat + latOffset;
    const longitude = CENTER.lng + lngOffset;
    const geohash = geohashForLocation([latitude, longitude]);

    console.log(`Activating ${uid} (${data.displayName || 'Unnamed'}): [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`);

    try {
      await updateDoc(doc(db, 'users', uid), {
        coords: { latitude, longitude },
        geohash,
        isProfileComplete: false, 
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error(`Failed to update user ${uid}:`, (error as any).message);
    }
  }

  console.log('--- Activation Complete ---');
  process.exit(0);
}

activateUsers().catch(err => {
  console.error('Error activating users:', err);
  process.exit(1);
});
