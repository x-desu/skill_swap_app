import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Provider, useDispatch } from 'react-redux';
import { store } from '../src/store';
import { setUser, setProfileComplete, setAppLoading } from '../src/store/authSlice';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GluestackUIProvider } from '../src/components/ui/gluestack-ui-provider';
import { ThemeProvider } from '../src/context/ThemeContext';
import { listenToUserProfile, upsertUserProfile } from '../src/services/firestoreService';
import { clearProfile, setProfile } from '../src/store/profileSlice';
import DataProvider from '../src/components/DataProvider';
import '../global.css';

GoogleSignin.configure({
  webClientId:
    '491963117666-lba7fa7u1ueilv6bfttfph43bmvl01qe.apps.googleusercontent.com',
});

function AppNavigator() {
  const dispatch = useDispatch();

  // Sync Firebase auth state → Redux AND → Firestore
  // On every login, upsertUserProfile creates the doc if missing (first login)
  // or is a no-op merge (subsequent logins)
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;

    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Hold routing until Firestore is checked
        dispatch(setAppLoading(true));
        
        // 1. Update Redux with Firebase Auth fields
        dispatch(
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            isAnonymous: firebaseUser.isAnonymous,
          }),
        );
        // 2. Create/merge Firestore user document (idempotent)
        // Wrapped in try/catch — silently skips if Firestore rules aren't published yet
        try {
          console.log('[SkillSwap Auth] Upserting user profile...');
          await upsertUserProfile(firebaseUser.uid, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName ?? '',
            photoURL: firebaseUser.photoURL,
            hasPhoto: !!firebaseUser.photoURL,
          });
          
          console.log('[SkillSwap Auth] Attaching real-time profile listener...');
          if (profileUnsubscribe) profileUnsubscribe();
          
          profileUnsubscribe = listenToUserProfile(firebaseUser.uid, (doc) => {
            if (doc) {
              dispatch(setProfile(doc));
              dispatch(setProfileComplete(doc.isProfileComplete ?? false));
            }
          });
        } catch (e: any) {
          if (e?.code === 'firestore/permission-denied') {
            console.warn('[SkillSwap] Firestore rules not published yet — user doc not synced');
          } else {
            console.error('[SkillSwap] upsertUserProfile error:', e);
          }
        } finally {
          console.log('[SkillSwap Auth] Releasing loading lock');
          dispatch(setAppLoading(false));
        }
      } else {
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = null;
        }
        dispatch(setUser(null));
        dispatch(clearProfile());
        dispatch(setProfileComplete(false));
        dispatch(setAppLoading(false));
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, [dispatch]);

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="(auth)" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="match-celebration"
        options={{ presentation: 'modal', headerShown: false }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{ headerShown: true, title: 'Chat', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <GluestackUIProvider mode="dark">
        <ThemeProvider>
          <DataProvider>
            <AppNavigator />
          </DataProvider>
        </ThemeProvider>
      </GluestackUIProvider>
    </Provider>
  );
}
