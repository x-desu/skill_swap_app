import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import type { RootState } from '../src/store';
import { getUserProfile } from '../src/services/firestoreService';

// Entry screen — shows spinner while Firebase resolves the persisted session.
// isLoading starts TRUE (see authSlice.ts), so <Redirect> only renders after
// onAuthStateChanged fires and the Stack navigator is fully ready.
export default function Index() {
  const { isAuthenticated, isProfileComplete, isLoading, user } = useSelector(
    (state: RootState) => state.auth,
  );
  const [hasSeenPaywall, setHasSeenPaywall] = useState<boolean | null>(null);

  // Fetch hasSeenPaywall from Firestore
  useEffect(() => {
    if (!user?.uid) {
      setHasSeenPaywall(null);
      return;
    }
    getUserProfile(user.uid).then((profile) => {
      setHasSeenPaywall(profile?.hasSeenPaywall ?? false);
    }).catch(() => {
      setHasSeenPaywall(false);
    });
  }, [user?.uid]);

  // While Firebase resolves the persisted session, show a spinner.
  // This also guarantees the Stack is fully mounted before any Redirect fires.
  if (isLoading || hasSeenPaywall === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#000',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator color="#ff1a5c" size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/welcome" />;
  }

  if (!isProfileComplete) {
    return <Redirect href="/(auth)/profile-setup" />;
  }

  // Show paywall to existing users who haven't seen it yet
  if (!hasSeenPaywall) {
    return <Redirect href="/paywall" />;
  }

  return <Redirect href="/(tabs)" />;
}
