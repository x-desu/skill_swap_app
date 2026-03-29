import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FilterState, DEFAULT_FILTERS, CATEGORY_SKILLS_MAP } from '../types/discover';
import { UserDocument } from '../types/user';
import { calculateDistance } from '../utils/location';

const FILTERS_STORAGE_KEY = '@skillswap/discover_filters';

export function useDiscoverFilters(currentUser: UserDocument | null) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const stored = await AsyncStorage.getItem(FILTERS_STORAGE_KEY);
        if (stored) {
          setFilters(JSON.parse(stored));
        }
      } catch (e) {
        console.error('Failed to load filters:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadFilters();
  }, []);

  // Save to AsyncStorage when changed
  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => {
      const updated = { ...prev, ...newFilters };
      AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated)).catch((e) =>
        console.error('Failed to save filters:', e)
      );
      return updated;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(DEFAULT_FILTERS));
  }, []);

  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    updateFilters({ [key]: value });
  }, [updateFilters]);

  // Apply filters to an array of users
  const applyFilters = useCallback((users: UserDocument[]) => {
    if (!currentUser) return users;

    let result = [...users];

    // 1. Distance Filter
    if (filters.maxDistance > 0 && filters.maxDistance < 100) {
      result = result.filter(user => {
        // If either user is missing coordinates, filter them out in production strict mode.
        if (!user.location?.lat || !user.location?.lng || !currentUser.location?.lat || !currentUser.location?.lng) {
          return false; 
        }
        
        const dist = calculateDistance(
          currentUser.location.lat,
          currentUser.location.lng,
          user.location.lat,
          user.location.lng
        );
        
        return dist !== null && dist <= filters.maxDistance;
      });
    }

    // 2. Category Filter
    if (filters.category !== 'All') {
      const targetSkills = CATEGORY_SKILLS_MAP[filters.category];
      result = result.filter(user => {
        // Match if the user's teachSkills overlap with the category's mapped skills
        const lowerTeach = user.teachSkills?.map(s => s.toLowerCase()) || [];
        return targetSkills.some(catSkill => 
          lowerTeach.some(skill => skill.includes(catSkill))
        );
      });
    }

    // 3. Match My Skills
    if (filters.matchMySkills) {
      const myWants = currentUser.wantSkills?.map(s => s.toLowerCase()) || [];
      const myTeaches = currentUser.teachSkills?.map(s => s.toLowerCase()) || [];
      
      result = result.filter(user => {
        const theirTeaches = user.teachSkills?.map(s => s.toLowerCase()) || [];
        const theirWants = user.wantSkills?.map(s => s.toLowerCase()) || [];
        
        // Exact overlap check
        const theyTeachWhatIWant = myWants.some(w => theirTeaches.some(t => t.includes(w) || w.includes(t)));
        const theyWantWhatITeach = myTeaches.some(t => theirWants.some(w => w.includes(t) || t.includes(w)));
        
        return theyTeachWhatIWant || theyWantWhatITeach;
      });
    }

    // 4. Rating Filter
    if (filters.minRating > 0) {
      result = result.filter(user => (user.rating || 0) >= filters.minRating);
    }

    // 5. Online Only
    if (filters.onlineOnly) {
      result = result.filter(user => user.isOnline === true);
    }

    // 6. Credits
    if (filters.hasCredits) {
      result = result.filter(user => (user.credits || 0) > 0);
    }

    // 7. Search Query
    if (filters.searchQuery.trim().length > 0) {
      const query = filters.searchQuery.toLowerCase().trim();
      result = result.filter(user => {
        const matchName = user.displayName?.toLowerCase().includes(query);
        const matchBio = user.bio?.toLowerCase().includes(query);
        const matchTeach = user.teachSkills?.some(s => s.toLowerCase().includes(query));
        const matchWant = user.wantSkills?.some(s => s.toLowerCase().includes(query));
        
        return matchName || matchBio || matchTeach || matchWant;
      });
    }

    return result;
  }, [filters, currentUser]);

  return {
    filters,
    isLoaded,
    setFilter,
    updateFilters,
    resetFilters,
    applyFilters
  };
}
