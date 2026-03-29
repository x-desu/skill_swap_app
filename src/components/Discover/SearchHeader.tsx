import React, { memo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react-native';
import { SkillCategory, CATEGORY_SKILLS_MAP } from '../../types/discover';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgBase: '#0d0202',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  inputBg: 'rgba(255,255,255,0.08)',
};

// Computed once at module level — categories never change
const categories = Object.keys(CATEGORY_SKILLS_MAP) as SkillCategory[];

interface SearchHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: SkillCategory;
  onSelectCategory: (category: SkillCategory) => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
}

function SearchHeaderComponent({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onOpenFilters,
  activeFilterCount,
}: SearchHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Search & Filter Row — plain View instead of BlurView */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SearchIcon color={COLORS.textMuted} size={16} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search skills, names..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={onOpenFilters} activeOpacity={0.75}>
          <SlidersHorizontal color="#fff" size={18} />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Categories Row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        // Prevent category scroll from stealing swipe gestures on the card
        keyboardShouldPersistTaps="handled"
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
            onPress={() => onSelectCategory(cat)}
            activeOpacity={0.75}
          >
            <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export const SearchHeader = memo(SearchHeaderComponent);

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.inputBg,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.rosePrimary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.bgBase,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
  },
  categoryPillActive: {
    backgroundColor: COLORS.rosePrimary,
    borderColor: COLORS.rosePrimary,
  },
  categoryText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#fff',
  },
});
