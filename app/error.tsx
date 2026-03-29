import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function ErrorScreen({ error, retry }: { error: any, retry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>😬</Text>
      <Text style={styles.title}>Oops</Text>
      <Text style={styles.message}>{error?.message || "Navigation failed"}</Text>
      <Pressable style={styles.button} onPress={retry}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d0202',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    color: '#ffffff',
    marginBottom: 8,
    fontFamily: 'Inter',
    fontWeight: '700',
  },
  message: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    fontFamily: 'Inter',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#ff1a5c',
    borderRadius: 20,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
