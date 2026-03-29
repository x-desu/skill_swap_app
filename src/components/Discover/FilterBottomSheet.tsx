import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Slider from '@react-native-community/slider';
import { FilterState } from '../../types/discover';
import { Star, CheckCircle, Smartphone, UserCheck, X } from 'lucide-react-native';

interface FilterBottomSheetProps {
  filters: FilterState;
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  resultCount: number;
}

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgDark: '#1a0505',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
};

export const FilterBottomSheet = forwardRef<BottomSheet, FilterBottomSheetProps>(
  ({ filters, setFilter, resetFilters, resultCount }, ref) => {
    
    const snapPoints = useMemo(() => ['65%'], []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.7}
        />
      ),
      []
    );

    const closeSheet = () => {
      // @ts-ignore
      ref?.current?.close();
    };

    return (
      <BottomSheet
        ref={ref}
        index={-1} // Closed by default
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        enablePanDownToClose
      >
        <BottomSheetScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Advanced Filters</Text>
            <TouchableOpacity onPress={resetFilters}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Distance */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Maximum Distance</Text>
              <Text style={styles.valueText}>
                {filters.maxDistance === 0 ? 'Anywhere' : `${filters.maxDistance} km`}
              </Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              step={5}
              value={filters.maxDistance}
              onValueChange={(val) => setFilter('maxDistance', val)}
              minimumTrackTintColor={COLORS.rosePrimary}
              maximumTrackTintColor="rgba(255,255,255,0.2)"
              thumbTintColor={COLORS.rosePrimary}
            />
            <Text style={styles.hintText}>Set to 0 to see people anywhere in the world.</Text>
          </View>

          {/* Smart Match Toggle */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.sectionTitle}>Smart Mutual Matching</Text>
                <Text style={styles.hintText}>Only show people looking for what you teach, who teach what you want.</Text>
              </View>
              <TouchableOpacity 
                style={[styles.switch, filters.matchMySkills && styles.switchActive]} 
                onPress={() => setFilter('matchMySkills', !filters.matchMySkills)}
              >
                {filters.matchMySkills && <CheckCircle size={14} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Minimum Rating */}
          <View style={styles.section}>
             <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Minimum Rating</Text>
              <Text style={styles.valueText}>{filters.minRating === 0 ? 'Any' : `${filters.minRating}+ Stars`}</Text>
            </View>
            <View style={styles.ratingRow}>
              {[0, 3, 4, 4.5, 4.8].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[styles.ratingPill, filters.minRating === rating && styles.ratingPillActive]}
                  onPress={() => setFilter('minRating', rating)}
                >
                  <Text style={[styles.ratingText, filters.minRating === rating && styles.ratingTextActive]}>
                    {rating === 0 ? 'Any' : rating}
                  </Text>
                  {rating > 0 && (
                    <Star 
                      size={12} 
                      color={filters.minRating === rating ? '#fff' : '#FFD700'} 
                      fill={filters.minRating === rating ? '#fff' : '#FFD700'} 
                      style={{ marginLeft: 4 }}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Toggles */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.gridToggles}>
              <TouchableOpacity 
                style={[styles.gridToggle, filters.onlineOnly && styles.gridToggleActive]}
                onPress={() => setFilter('onlineOnly', !filters.onlineOnly)}
              >
                <Smartphone size={20} color={filters.onlineOnly ? COLORS.rosePrimary : COLORS.textSecondary} />
                <Text style={[styles.gridToggleText, filters.onlineOnly && styles.gridToggleTextActive]}>Online Now</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.gridToggle, filters.hasCredits && styles.gridToggleActive]}
                onPress={() => setFilter('hasCredits', !filters.hasCredits)}
              >
                <UserCheck size={20} color={filters.hasCredits ? COLORS.rosePrimary : COLORS.textSecondary} />
                <Text style={[styles.gridToggleText, filters.hasCredits && styles.gridToggleTextActive]}>Has Credits</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyBtn} onPress={closeSheet}>
            <Text style={styles.applyBtnText}>Show {resultCount} People</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheet>
    );
  }
);

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: COLORS.bgDark,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 40,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  resetText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.rosePrimary,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    paddingRight: 16,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'flex-end',
    padding: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  switchActive: {
    backgroundColor: COLORS.rosePrimary,
    borderColor: COLORS.rosePrimary,
    alignItems: 'flex-start',
  },
  ratingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  ratingPillActive: {
    backgroundColor: COLORS.rosePrimary,
    borderColor: COLORS.rosePrimary,
  },
  ratingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  ratingTextActive: {
    color: '#fff',
  },
  gridToggles: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  gridToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  gridToggleActive: {
    borderColor: COLORS.rosePrimary,
    backgroundColor: 'rgba(255, 26, 92, 0.1)',
  },
  gridToggleText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  gridToggleTextActive: {
    color: COLORS.rosePrimary,
  },
  applyBtn: {
    backgroundColor: COLORS.rosePrimary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
