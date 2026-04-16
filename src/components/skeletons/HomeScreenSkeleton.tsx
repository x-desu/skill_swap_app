import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerBox } from './SkeletonBase';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;
const CARD_HEIGHT = height * 0.48;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

interface Props {
  show: boolean;
}

export default function HomeScreenSkeleton({ show }: Props) {
  if (!show) return null;
  return (
    <View style={styles.container}>
      {/* ── Section header ── */}
      <View style={styles.sectionHeader}>
        <ShimmerBox width={150} height={18} radius={6} />
        <ShimmerBox width={50} height={14} radius={6} />
      </View>

      {/* ── Two person cards ── */}
      <View style={styles.cardRow}>
        {[0, 1].map((i) => (
          <View key={i} style={[i === 0 && { marginLeft: SIDE_PADDING }]}>
            <ShimmerBox width={CARD_WIDTH} height={CARD_HEIGHT} radius={24} />
          </View>
        ))}
      </View>

      {/* ── Featured Skills header ── */}
      <View style={[styles.sectionHeader, { marginTop: 32 }]}>
        <ShimmerBox width={130} height={18} radius={6} />
        <ShimmerBox width={50} height={14} radius={6} />
      </View>

      {/* ── Skill chip pills ── */}
      <View style={styles.chipsRow}>
        {[80, 70, 100, 68, 90].map((w, i) => (
          <ShimmerBox key={i} width={w} height={34} radius={17} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
    overflow: 'hidden',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
  },
});
