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
      <ShimmerBox width={48} height={48} radius={24} />
      <View style={styles.content}>
        <View style={styles.rowHeader}>
          <ShimmerBox width={180} height={15} radius={6} />
          <ShimmerBox width={50} height={11} radius={5} />
        </View>
        <View style={{ marginTop: 8 }}>
          <ShimmerBox width={240} height={13} radius={5} />
        </View>
        <View style={{ marginTop: 6 }}>
          <ShimmerBox width={160} height={11} radius={5} />
        </View>
      </View>
    </View>
  );
}

export default function NotificationsSkeleton({ show }: Props) {
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginLeft: 78,
  },
});
