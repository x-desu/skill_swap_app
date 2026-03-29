export type SkillCategory = 'Tech' | 'Music' | 'Art' | 'Language' | 'Sports' | 'Business' | 'Cooking' | 'All';

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
  Tech: ['react', 'python', 'coding', 'ai', 'javascript', 'swift', 'flutter', 'design', 'excel', 'tech'],
  Music: ['guitar', 'piano', 'singing', 'dj', 'music', 'drums'],
  Art: ['drawing', 'painting', 'photography', 'video', 'art', 'sculpting'],
  Language: ['spanish', 'french', 'hindi', 'mandarin', 'english', 'writing', 'language'],
  Sports: ['yoga', 'dance', 'football', 'cricket', 'swimming', 'fitness', 'workout'],
  Business: ['marketing', 'sales', 'business', 'startup', 'finance', 'accounting'],
  Cooking: ['baking', 'cooking', 'chef', 'culinary'],
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
