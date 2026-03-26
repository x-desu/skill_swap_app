import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  photoURL?: string | null;
  displayName?: string | null;
  uid?: string;
  size?: number;
  style?: object;
}

const COLORS = ['#ff1a5c', '#6c63ff', '#00b4d8', '#f77f00', '#2ec4b6', '#a29bfe'];

/**
 * Smart avatar component:
 * 1. Shows real photo if photoURL exists
 * 2. Falls back to initials in a colored circle
 * 3. Last resort: DiceBear generated avatar from UID seed
 */
export default function UserAvatar({ photoURL, displayName, uid, size = 60, style }: Props) {
  const baseStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[styles.img, baseStyle, style]}
      />
    );
  }

  if (displayName) {
    const initials = displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    const color = COLORS[displayName.charCodeAt(0) % COLORS.length];
    return (
      <View style={[baseStyle, { backgroundColor: color, justifyContent: 'center', alignItems: 'center' }, style]}>
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    );
  }

  // Last resort — DiceBear generated avatar
  const seed = uid ?? 'default';
  const url = `https://api.dicebear.com/9.x/thumbs/png?seed=${seed}&backgroundColor=ff1a5c`;
  return (
    <Image
      source={{ uri: url }}
      style={[styles.img, baseStyle, style]}
    />
  );
}

const styles = StyleSheet.create({
  img: { resizeMode: 'cover' },
  initials: { color: '#fff', fontWeight: '700' },
});
