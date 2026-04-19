import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

async function count() {
  const snap = await db.collection('users').count().get();
  console.log('TOTAL_USERS:', snap.data().count);
  
  const vimanSnap = await db.collection('users').where('geohash', '>=', 'tepf3').where('geohash', '<=', 'tepf3z').get();
  console.log('VIMAN_USERS:', vimanSnap.size);
}

count();
