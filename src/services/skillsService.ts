/**
 * skillsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global skills catalog — used for autocomplete suggestions.
 * The `skills` collection is populated lazily as users add new skills.
 */
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  increment,
  orderBy,
  limit
} from '@react-native-firebase/firestore';
import { Skill, SkillCategory } from '../types/user';

const db = () => getFirestore();
const skillsCol = () => collection(db(), 'skills');

/**
 * Search the global skills catalog by prefix (case-insensitive via nameLower).
 * Returns up to 10 matching skills for autocomplete.
 */
export const getSkillSuggestions = async (searchQuery: string): Promise<Skill[]> => {
  if (!searchQuery.trim()) return [];
  const lower = searchQuery.trim().toLowerCase();
  
  const q = query(
    skillsCol(),
    where('nameLower', '>=', lower),
    where('nameLower', '<=', lower + '\uf8ff'),
    orderBy('nameLower'),
    limit(10)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => ({ ...(d.data() as Skill), id: d.id }));
};

/**
 * Record that a skill was used by a user.
 * If it doesn't exist in the catalog yet, create it.
 */
export const recordSkillUsage = async (
  skillName: string,
  category: SkillCategory = 'Other',
): Promise<void> => {
  // Use the lowercased name as document ID so duplicates merge cleanly
  const id = skillName.toLowerCase().replace(/\s+/g, '_');
  const ref = doc(skillsCol(), id);
  const snap = await getDoc(ref);

  if (!snap.exists) {
    await setDoc(ref, {
      name: skillName,
      nameLower: skillName.toLowerCase(),
      category,
      usageCount: 1,
    });
  } else {
    await updateDoc(ref, {
      usageCount: increment(1),
    });
  }
};

/**
 * Get the most popular skills in a given category.
 * Used to populate suggestion chips on the profile setup screen.
 */
export const getPopularSkills = async (
  category?: SkillCategory,
  limitCount = 12,
): Promise<Skill[]> => {
  let q = query(skillsCol(), orderBy('usageCount', 'desc'), limit(limitCount));
  
  if (category) {
    q = query(
      skillsCol(),
      where('category', '==', category),
      orderBy('usageCount', 'desc'),
      limit(limitCount)
    );
  }
  
  const snap = await getDocs(q);
  return snap.docs.map((d: any) => ({ ...(d.data() as Skill), id: d.id }));
};
