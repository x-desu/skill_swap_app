import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  generateDarkMonochromeGradient,
  getSeededGradientDirection,
  hexToRgba,
  seededRandom,
} from '../utils/colorUtils';

type Props = {
  baseColor: string;
  seedKey: string;
  children: React.ReactNode;
};

const { width, height } = Dimensions.get('window');

export default function ProfileGlowBackground({ baseColor, seedKey, children }: Props) {
  const gradientColors = useMemo(
    () => generateDarkMonochromeGradient(baseColor, seedKey, 5),
    [baseColor, seedKey]
  );

  const direction = useMemo(() => getSeededGradientDirection(seedKey), [seedKey]);

  const glow = useMemo(() => {
    const rand = seededRandom(`glow:${seedKey}`);
    const a1 = 0.42 + rand() * 0.10;
    const a2 = 0.22 + rand() * 0.08;
    const a3 = 0.16 + rand() * 0.06;
    const a4 = 0.12 + rand() * 0.05;
    const vignette = 0.55 + rand() * 0.10;

    return {
      a1,
      a2,
      a3,
      a4,
      vignette,
      flip: rand() > 0.5,
    };
  }, [seedKey]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradientColors}
        start={direction.start}
        end={direction.end}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(baseColor, glow.a1), 'transparent']}
        start={glow.flip ? { x: 1, y: 0 } : { x: 0, y: 0 }}
        end={glow.flip ? { x: 0, y: 1 } : { x: 1, y: 1 }}
        style={[styles.edgeGlow, styles.topLeft]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(baseColor, glow.a2), 'transparent']}
        start={glow.flip ? { x: 0, y: 1 } : { x: 1, y: 1 }}
        end={glow.flip ? { x: 1, y: 0 } : { x: 0, y: 0 }}
        style={[styles.edgeGlow, styles.bottomRight]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(baseColor, glow.a3), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.9 }}
        style={[styles.edgeGlow, styles.topRight]}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(baseColor, glow.a4), 'transparent']}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0.1 }}
        style={[styles.edgeGlow, styles.bottomLeft]}
      />

      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `rgba(0,0,0,${glow.vignette})`]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <BlurView
        pointerEvents="none"
        intensity={36}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  edgeGlow: {
    position: 'absolute',
  },
  topLeft: {
    left: -width * 0.25,
    top: -height * 0.2,
    width: width * 1.1,
    height: height * 0.8,
    borderRadius: 999,
    transform: [{ rotate: '-10deg' }],
  },
  bottomRight: {
    right: -width * 0.3,
    bottom: -height * 0.25,
    width: width * 1.2,
    height: height * 0.9,
    borderRadius: 999,
    transform: [{ rotate: '12deg' }],
  },
  topRight: {
    right: -width * 0.15,
    top: -height * 0.18,
    width: width * 0.9,
    height: height * 0.55,
    borderRadius: 999,
    transform: [{ rotate: '18deg' }],
  },
  bottomLeft: {
    left: -width * 0.2,
    bottom: -height * 0.22,
    width: width * 0.95,
    height: height * 0.6,
    borderRadius: 999,
    transform: [{ rotate: '-18deg' }],
  },
});
