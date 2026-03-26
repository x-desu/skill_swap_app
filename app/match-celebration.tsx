import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import type { RootState } from '../src/store';
import UserAvatar from '../src/components/UserAvatar';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgDark: '#1a0505',
};

export default function MatchCelebrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const authUser = useSelector((state: RootState) => state.auth.user);

  const matchId = params.matchId as string;
  const targetUid = params.targetUid as string;
  const targetName = params.targetName as string;
  const targetPhoto = params.targetPhoto as string;

  const handleSayHello = () => {
    // Dismiss modal and navigate to chat room
    router.replace({
      pathname: '/chat/[id]',
      params: { id: matchId, name: targetName, photoURL: targetPhoto },
    });
  };

  const handleKeepSwiping = () => {
    router.back(); // Dismiss modal
  };

  return (
    <LinearGradient colors={['#ff1a5c', '#1a0505']} style={styles.container}>
      <Text style={styles.title}>It's a Match!</Text>
      <Text style={styles.subtitle}>You and {targetName} liked each other.</Text>

      <View style={styles.avatarsContainer}>
        <View style={styles.avatarWrapper}>
          <UserAvatar
            uid={authUser?.uid || ''}
            displayName={authUser?.displayName || 'Me'}
            photoURL={authUser?.photoURL || ''}
            size={100}
            style={styles.avatar}
          />
        </View>
        <View style={[styles.avatarWrapper, styles.targetAvatarWrapper]}>
          <UserAvatar
            uid={targetUid}
            displayName={targetName}
            photoURL={targetPhoto}
            size={100}
            style={styles.avatar}
          />
        </View>
      </View>

      <TouchableOpacity style={styles.helloButton} onPress={handleSayHello}>
        <Text style={styles.helloButtonText}>Say Hello 👋</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.swipeButton} onPress={handleKeepSwiping}>
        <Text style={styles.swipeButtonText}>Keep Swiping</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 60,
    textAlign: 'center',
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  avatarWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
    zIndex: 2,
  },
  targetAvatarWrapper: {
    marginLeft: -20,
    zIndex: 1,
  },
  avatar: {
    borderRadius: 50,
  },
  helloButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  helloButtonText: {
    color: COLORS.rosePrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  swipeButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  swipeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
