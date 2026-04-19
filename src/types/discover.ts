export type SkillCategory =
  | 'Tech'
  | 'Creative'
  | 'Music'
  | 'Languages'
  | 'Business'
  | 'Academics'
  | 'Health'
  | 'Lifestyle'
  | 'All';

export interface FilterState {
  maxDistance: number;         // Max distance in km (up to 100, or 0/null for any)
  category: SkillCategory;     // Currently selected main category filter
  searchQuery: string;         // Debounced text search (by name/skill/bio)
  minRating: number;           // 0 to 5 stars
  onlineOnly: boolean;         // Show only 'online' or active today users
  hasCredits: boolean;         // Filter out people with 0 credits
  matchMySkills: boolean;      // Auto-filter based on current User's wantSkills/teachSkills overlap
}

export const CATEGORY_SKILLS_MAP: Record<SkillCategory, string[]> = {
  All: [],
  Tech: ['coding', 'web', 'mobile', 'ai', 'data', 'software', 'programming', 'python', 'react', 'javascript', 'swift', 'cloud'],
  Creative: ['design', 'art', 'video', 'photo', 'graphic', 'ui', 'ux', 'animation', 'drawing', 'painting', 'figma'],
  Music: ['guitar', 'piano', 'singing', 'drums', 'vocals', 'production', 'dj', 'mixing', 'performing'],
  Languages: ['english', 'spanish', 'french', 'hindi', 'mandarin', 'japanese', 'german', 'translation'],
  Business: ['marketing', 'sales', 'finance', 'startup', 'management', 'writing', 'seo', 'strategy'],
  Academics: ['math', 'physics', 'science', 'history', 'tutoring', 'economics', 'research', 'test prep'],
  Health: ['fitness', 'yoga', 'gym', 'nutrition', 'sports', 'meditation', 'wellness', 'running'],
  Lifestyle: ['cooking', 'baking', 'diy', 'crafts', 'home', 'gardening', 'sewing', 'woodworking'],
};

export const DEFAULT_FILTERS: FilterState = {
  maxDistance: 25, // default 25km radius
  category: 'All',
  searchQuery: '',
  minRating: 0,
  onlineOnly: false,
  hasCredits: false,
  matchMySkills: false,
};
