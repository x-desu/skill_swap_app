/**
 * skillsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global skills catalog — used for autocomplete suggestions.
 * The `skills` collection is populated lazily as users add new skills.
 */
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as withLimit,
  getDocs,
  increment,
} from '@react-native-firebase/firestore';
import { Skill, SkillCategory } from '../types/user';

const skillsCol = () => collection(getFirestore(), 'skills');

/**
 * Search the global skills catalog by prefix (case-insensitive via nameLower).
 * Returns up to 10 matching skills for autocomplete.
 */
export const getSkillSuggestions = async (searchTerm: string): Promise<Skill[]> => {
  if (!searchTerm.trim()) return [];
  const lower = searchTerm.trim().toLowerCase();
  const skillsQuery = query(
    skillsCol(),
    where('nameLower', '>=', lower),
    where('nameLower', '<=', lower + '\uf8ff'),
    orderBy('nameLower'),
    withLimit(10),
  );
  const snap = await getDocs(skillsQuery);
  return snap.docs.map((skillDoc: any) => ({ ...(skillDoc.data() as Skill), id: skillDoc.id }));
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

  if (!snap.exists()) {
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
  limit = 12,
): Promise<Skill[]> => {
  let skillsQuery = query(skillsCol(), orderBy('usageCount', 'desc'), withLimit(limit));
  if (category) {
    skillsQuery = query(
      skillsCol(),
      where('category', '==', category),
      orderBy('usageCount', 'desc'),
      withLimit(limit),
    );
  }
  const snap = await getDocs(skillsQuery);
  return snap.docs.map((skillDoc: any) => ({ ...(skillDoc.data() as Skill), id: skillDoc.id }));
};
