import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import type { RootState } from '../src/store';

// Entry screen — shows spinner while Firebase resolves the persisted session.
// isLoading starts TRUE (see authSlice.ts), so <Redirect> only renders after
// onAuthStateChanged fires and the Stack navigator is fully ready.
export default function Index() {
  const { isAuthenticated, isProfileComplete, isLoading } = useSelector(
    (state: RootState) => state.auth,
  );

  // While Firebase resolves the persisted session, show a spinner.
  // This also guarantees the Stack is fully mounted before any Redirect fires.
  if (isLoading) {
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

  return <Redirect href="/(tabs)" />;
}
