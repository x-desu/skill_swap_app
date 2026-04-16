/**
 * SkeletonBase.tsx
 *
 * Self-contained shimmer skeleton using react-native-reanimated (already installed).
 * No dependency on `moti` — works immediately without any new package install.
 *
 * Usage:
 *   <ShimmerBox width={200} height={20} radius={6} />
 *   <ShimmerBox width={50} height={50} radius={25} />   // circle
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** App-matched dark shimmer palette */
export const SKELETON_COLORS = {
  BASE:      '#1e1220' as const,
  HIGHLIGHT: '#2e1a28' as const,
};

interface ShimmerBoxProps {
  width: number | `${number}%`;
  height: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * A single shimmer rectangle. Composes into any skeleton layout.
 */
export function ShimmerBox({ width, height, radius = 6, style }: ShimmerBoxProps) {
  const translateX = useSharedValue(-SCREEN_WIDTH);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(SCREEN_WIDTH, {
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,   // infinite
      false, // no reverse — sweep always left → right
    );
  }, [translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const resolvedWidth = typeof width === 'number' ? width : undefined;
  const resolvedFlexBasis = typeof width === 'string' ? width : undefined;

  return (
    <View
      style={[
        {
          width: resolvedWidth,
          flexBasis: resolvedFlexBasis,
          height,
          borderRadius: radius,
          backgroundColor: SKELETON_COLORS.BASE,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255,255,255,0.06)',
            'rgba(255,255,255,0.10)',
            'rgba(255,255,255,0.06)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
