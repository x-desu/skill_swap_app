import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShimmerBox } from './SkeletonBase';

const ROW_COUNT = 5;

interface Props {
  show: boolean;
}

function SkeletonRow() {
  return (
    <View style={styles.row}>
      <ShimmerBox width={58} height={58} radius={29} />
      <View style={styles.content}>
        <View style={styles.rowHeader}>
          <ShimmerBox width={140} height={16} radius={6} />
          <ShimmerBox width={44} height={12} radius={6} />
        </View>
        <View style={{ marginTop: 8 }}>
          <ShimmerBox width={220} height={13} radius={5} />
        </View>
      </View>
      <ShimmerBox width={40} height={40} radius={20} />
    </View>
  );
}

export default function MatchesListSkeleton({ show }: Props) {
  if (!show) return null;
  return (
    <View style={styles.container}>
      {Array.from({ length: ROW_COUNT }).map((_, i) => (
        <View key={i}>
          <SkeletonRow />
          {i < ROW_COUNT - 1 && <View style={styles.separator} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  content: {
    flex: 1,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 72,
  },
});
