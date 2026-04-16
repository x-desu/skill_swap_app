import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ShimmerBox } from './SkeletonBase';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 40;

interface Props {
  show: boolean;
}

export default function WalletSkeleton({ show }: Props) {
  if (!show) return null;
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <ShimmerBox width={100} height={28} radius={8} />
          <View style={{ marginTop: 8 }}>
            <ShimmerBox width={220} height={14} radius={5} />
          </View>
        </View>
        <ShimmerBox width={44} height={44} radius={22} />
      </View>

      {/* Balance card */}
      <View style={{ marginBottom: 20 }}>
        <ShimmerBox width={CARD_WIDTH} height={155} radius={20} />
      </View>

      {/* Buy Credits button */}
      <View style={{ marginBottom: 30 }}>
        <ShimmerBox width={CARD_WIDTH} height={56} radius={15} />
      </View>

      {/* Section title */}
      <View style={{ marginBottom: 16 }}>
        <ShimmerBox width={90} height={20} radius={7} />
      </View>

      {/* 3 action rows */}
      {[0, 1, 2].map((i) => (
        <View key={i} style={styles.actionRow}>
          <ShimmerBox width={42} height={42} radius={21} />
          <View style={styles.actionText}>
            <ShimmerBox width={150} height={16} radius={6} />
            <View style={{ marginTop: 6 }}>
              <ShimmerBox width={220} height={12} radius={5} />
            </View>
          </View>
          <ShimmerBox width={20} height={20} radius={5} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerText: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  actionText: {
    flex: 1,
  },
});
