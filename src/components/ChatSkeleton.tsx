import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';

const SkeletonPulse: React.FC<{ style?: any }> = ({ style }) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 8, opacity: pulseAnim },
        style,
      ]}
    />
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4, 5].map((item) => (
        <View
          key={item}
          style={[
            styles.row,
            item % 2 === 0 ? styles.rowReversed : styles.rowNormal,
          ]}
        >
          {item % 2 !== 0 && (
            <SkeletonPulse style={styles.avatar} />
          )}
          <View style={styles.bubbleContainer}>
            <SkeletonPulse
              style={[styles.bubble, { height: item % 3 === 0 ? 80 : 40 }]}
            />
            <SkeletonPulse style={styles.time} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
    backgroundColor: '#0d0202',
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  rowNormal: {
    justifyContent: 'flex-start',
  },
  rowReversed: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  bubbleContainer: {
    maxWidth: '70%',
    gap: 6,
  },
  bubble: {
    width: 200,
    borderRadius: 16,
  },
  time: {
    width: 40,
    height: 8,
    borderRadius: 4,
  },
});
