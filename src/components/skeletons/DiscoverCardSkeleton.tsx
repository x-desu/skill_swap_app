import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerBox } from './SkeletonBase';

const { width, height } = Dimensions.get('window');
const CARD_STACK_HEIGHT = height * 0.62;

interface Props {
  show: boolean;
}

export default function DiscoverCardSkeleton({ show }: Props) {
  if (!show) return null;
  return (
    <View style={styles.container}>
      {/* ── Main card ── */}
      <View style={styles.cardWrapper}>
        <ShimmerBox width={width - 32} height={CARD_STACK_HEIGHT} radius={24} />

        {/* Footer info overlaid at bottom */}
        <View style={styles.cardFooter}>
          <ShimmerBox width={160} height={22} radius={8} />
          <View style={styles.tagRow}>
            <ShimmerBox width={90} height={28} radius={14} />
            <ShimmerBox width={80} height={28} radius={14} />
          </View>
        </View>
      </View>

      {/* ── Action buttons ── */}
      <View style={styles.actionsRow}>
        <ShimmerBox width={64} height={64} radius={32} />
        <ShimmerBox width={64} height={64} radius={32} />
        <ShimmerBox width={64} height={64} radius={32} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cardWrapper: {
    width: width - 32,
    height: CARD_STACK_HEIGHT,
    justifyContent: 'flex-end',
  },
  cardFooter: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    gap: 10,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
