/**
 * skillsService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Global skills catalog — used for autocomplete suggestions.
 * The `skills` collection is populated lazily as users add new skills.
 */
import firestore from '@react-native-firebase/firestore';
import { Skill, SkillCategory } from '../types/user';

const skillsCol = () => firestore().collection('skills');

/**
 * Search the global skills catalog by prefix (case-insensitive via nameLower).
 * Returns up to 10 matching skills for autocomplete.
 */
export const getSkillSuggestions = async (query: string): Promise<Skill[]> => {
  if (!query.trim()) return [];
  const lower = query.trim().toLowerCase();
  const snap = await skillsCol()
    .where('nameLower', '>=', lower)
    .where('nameLower', '<=', lower + '\uf8ff')
    .orderBy('nameLower')
    .limit(10)
    .get();
  return snap.docs.map((d) => ({ ...(d.data() as Skill), id: d.id }));
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
  const ref = skillsCol().doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      name: skillName,
      nameLower: skillName.toLowerCase(),
      category,
      usageCount: 1,
    });
  } else {
    await ref.update({
      usageCount: firestore.FieldValue.increment(1),
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
  let query = skillsCol().orderBy('usageCount', 'desc').limit(limit);
  if (category) {
    query = skillsCol()
      .where('category', '==', category)
      .orderBy('usageCount', 'desc')
      .limit(limit);
  }
  const snap = await query.get();
  return snap.docs.map((d) => ({ ...(d.data() as Skill), id: d.id }));
};
