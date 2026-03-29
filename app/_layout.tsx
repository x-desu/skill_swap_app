import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { Provider, useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from '../src/store';
import { setUser, setProfileComplete, setAppLoading } from '../src/store/authSlice';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GluestackUIProvider } from '../src/components/ui/gluestack-ui-provider';
import { ThemeProvider } from '../src/context/ThemeContext';
import { upsertUserProfile } from '../src/services/firestoreService';
import { initRevenueCat, revenueCatLogIn, revenueCatLogOut } from '../src/services/revenueCatService';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions, setupNotificationListeners } from '../src/services/notificationService';
import '../global.css';
import { setJSExceptionHandler } from 'react-native-exception-handler';
import Toast from 'react-native-toast-message';
import AppErrorBoundary from '../src/components/AppErrorBoundary';

setJSExceptionHandler((error, isFatal) => {
  console.log("GLOBAL ERROR:", error);
}, true);

// ─── Configure Global Notification Behavior ──────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
    const unsubscribe = onAuthStateChanged(getAuth(), async (firebaseUser) => {
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
        void initRevenueCat().then(() => revenueCatLogIn(firebaseUser.uid));
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
          
          dispatch(setProfileComplete(true));

          // 3. Setup Push Notifications (Steps 1 & 2)
          // We don't await this to avoid blocking the app mount
          requestNotificationPermissions(firebaseUser.uid);

          // 4. Setup Foreground & Tap Listeners (Steps 5 & 6)
          const cleanup = setupNotificationListeners();
          return cleanup;
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
        void revenueCatLogOut();
        dispatch(setUser(null));
        dispatch(setProfileComplete(false));
        dispatch(setAppLoading(false));
      }
    });

    return () => {
      unsubscribe();
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
        name="chat"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: 'modal' }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="customer-center"
        options={{ headerShown: false, presentation: 'modal', animation: 'slide_from_right' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <Provider store={store}>
        <GluestackUIProvider mode="dark">
          <ThemeProvider>
            <AppErrorBoundary>
              <AppNavigator />
            </AppErrorBoundary>
          </ThemeProvider>
        </GluestackUIProvider>
      </Provider>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
