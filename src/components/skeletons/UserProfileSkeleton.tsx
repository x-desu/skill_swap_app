import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerBox } from './SkeletonBase';

const { width } = Dimensions.get('window');

interface Props {
  show: boolean;
}

export default function UserProfileSkeleton({ show }: Props) {
  if (!show) return null;
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <ShimmerBox width={120} height={120} radius={60} />
      </View>

      {/* Name */}
      <View style={styles.centeredRow}>
        <ShimmerBox width={160} height={22} radius={8} />
      </View>

      {/* Location */}
      <View style={[styles.centeredRow, { marginTop: 10 }]}>
        <ShimmerBox width={100} height={14} radius={6} />
      </View>

      {/* Bio */}
      <View style={styles.bioBlock}>
        <ShimmerBox width={width - 80} height={13} radius={5} />
        <View style={{ marginTop: 7 }}>
          <ShimmerBox width={width - 120} height={13} radius={5} />
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.statBlock}>
            <ShimmerBox width={40} height={22} radius={6} />
            <View style={{ marginTop: 8 }}>
              <ShimmerBox width={60} height={11} radius={5} />
            </View>
          </View>
        ))}
      </View>

      {/* Teaches chips */}
      <View style={styles.sectionHeader}>
        <ShimmerBox width={90} height={16} radius={6} />
      </View>
      <View style={styles.chipsRow}>
        {[80, 100, 70].map((w, i) => (
          <ShimmerBox key={i} width={w} height={30} radius={15} />
        ))}
      </View>

      {/* Wants chips */}
      <View style={[styles.sectionHeader, { marginTop: 20 }]}>
        <ShimmerBox width={130} height={16} radius={6} />
      </View>
      <View style={styles.chipsRow}>
        {[90, 75, 110].map((w, i) => (
          <ShimmerBox key={i} width={w} height={30} radius={15} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 16,
  },
  centeredRow: {
    alignItems: 'center',
  },
  bioBlock: {
    marginTop: 20,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: 28,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statBlock: {
    alignItems: 'center',
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
