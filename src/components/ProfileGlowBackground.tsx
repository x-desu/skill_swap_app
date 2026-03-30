import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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

// Memoized — only recomputes when baseColor or seedKey actually changes.
// No BlurView — was causing GPU compositing lag on every tab switch.
function ProfileGlowBackground({ baseColor, seedKey, children }: Props) {
  const gradientColors = useMemo(
    () => generateDarkMonochromeGradient(baseColor, seedKey, 5),
    [baseColor, seedKey]
  );

  const direction = useMemo(() => getSeededGradientDirection(seedKey), [seedKey]);

  const accentColor = useMemo(() => {
    const rand = seededRandom(`glow:${seedKey}`);
    const a1 = 0.35 + rand() * 0.10;
    const vignette = 0.50 + rand() * 0.10;
    return { a1, vignette };
  }, [seedKey]);

  return (
    <View style={styles.root}>
      {/* Base gradient */}
      <LinearGradient
        colors={gradientColors}
        start={direction.start}
        end={direction.end}
        style={StyleSheet.absoluteFill}
      />

      {/* Single accent glow — replaced 4 overlapping gradients with 1 */}
      <LinearGradient
        pointerEvents="none"
        colors={[hexToRgba(baseColor, accentColor.a1), 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Vignette scrim */}
      <LinearGradient
        pointerEvents="none"
        colors={['transparent', `rgba(0,0,0,${accentColor.vignette})`]}
        start={{ x: 0.5, y: 0.2 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Dark scrim for readability — replaces BlurView completely */}
      <View pointerEvents="none" style={styles.scrim} />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

// memo prevents rerender if parent re-renders but baseColor/seedKey haven't changed
export default memo(ProfileGlowBackground);

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1 },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.20)',
  },
});
