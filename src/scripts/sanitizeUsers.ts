import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc, query, where, writeBatch } from 'firebase/firestore';
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

async function sanitizeUsers() {
  console.log('--- Starting Discovery Data Sanitization ---');
  const usersCol = collection(db, 'users');
  
  // Only check users currently marked as complete
  const q = query(usersCol, where('isProfileComplete', '==', true));
  const snap = await getDocs(q);
  
  if (snap.empty) {
    console.log('No "complete" users found to sanitize.');
    return;
  }

  console.log(`Analyzing ${snap.size} currently "complete" profiles...`);

  let sanitizedCount = 0;
  const batch = writeBatch(db);

  for (const userDoc of snap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;

    const hasPhoto = !!data.photoURL;
    const hasValidName = data.displayName && data.displayName.trim().length >= 3;
    const hasSkills = (data.teachSkills?.length > 0) && (data.wantSkills?.length > 0);

    // If they fail ANY of the rigor checks, they are no longer "complete"
    if (!hasPhoto || !hasValidName || !hasSkills) {
      console.log(`[Sanitizing] User ${uid}: Name="${data.displayName}", Photo=${hasPhoto}, Skills=${hasSkills}`);
      batch.update(doc(db, 'users', uid), {
        isProfileComplete: false,
        sanitizationReason: !hasPhoto ? 'missing_photo' : (!hasValidName ? 'invalid_name' : 'missing_skills')
      });
      sanitizedCount++;
    }
  }

  if (sanitizedCount > 0) {
    await batch.commit();
    console.log(`\nSuccessfully sanitized ${sanitizedCount} users.`);
    console.log('These users will no longer appear in the discovery feed until they finish profile setup.');
  } else {
    console.log('\nAll checked profiles meet the quality standards.');
  }

  console.log('--- Sanitization Complete ---');
  process.exit(0);
}

sanitizeUsers().catch(err => {
  console.error('Error sanitizing users:', err);
  process.exit(1);
});
