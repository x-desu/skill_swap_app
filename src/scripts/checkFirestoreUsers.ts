import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, limit } from 'firebase/firestore';
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

async function checkUsers() {
  const usersCol = collection(db, 'users');
  const q = query(usersCol, limit(10));
  const snap = await getDocs(q);
  
  console.log(`Total users found (limit 10): ${snap.size}`);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`User ${doc.id}: Geohash=${!!data.geohash}, Coords=${!!data.coords}`);
  });
  
  process.exit(0);
}

checkUsers().catch(console.error);
