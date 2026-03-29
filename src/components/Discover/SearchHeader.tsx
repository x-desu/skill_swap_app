import React, { memo } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react-native';
import { SkillCategory, CATEGORY_SKILLS_MAP } from '../../types/discover';

const COLORS = {
  rosePrimary: '#ff1a5c',
  rose20: 'rgba(255, 26, 92, 0.2)',
  bgBase: '#0d0202',
  bgDark: '#1a0505',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  glass: 'rgba(26, 5, 5, 0.8)',
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
      <View style={styles.headerTop}>
        <Text style={styles.title}>Discover</Text>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <SearchIcon color={COLORS.rosePrimary} size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Skills, people, or hobbies..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={onOpenFilters} activeOpacity={0.75}>
          <SlidersHorizontal color="#fff" size={20} />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesRow}
        keyboardShouldPersistTaps="handled"
        snapToInterval={80}
        decelerationRate="fast"
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                isActive && styles.categoryPillActive,
                isActive && { shadowColor: COLORS.rosePrimary }
              ]}
              onPress={() => onSelectCategory(cat)}
              activeOpacity={0.75}
            >
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const SearchHeader = memo(SearchHeaderComponent);

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 16,
    zIndex: 10,
  },
  headerTop: {
    paddingHorizontal: 22,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgDark,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  filterBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.rosePrimary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.bgBase,
    elevation: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  categoriesRow: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 4,
  },
  categoryPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: COLORS.bgDark,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: COLORS.rosePrimary,
    borderColor: COLORS.rosePrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: '#fff',
  },
});
