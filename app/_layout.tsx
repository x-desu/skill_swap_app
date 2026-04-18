import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { Provider, useDispatch } from 'react-redux';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from '../src/store';
import { setUser, setProfileComplete, setAppLoading } from '../src/store/authSlice';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GluestackUIProvider } from '../src/components/ui/gluestack-ui-provider';
import { ThemeProvider } from '../src/context/ThemeContext';
import { listenToUserProfile, upsertUserProfile } from '../src/services/firestoreService';
import { clearProfile, setProfile } from '../src/store/profileSlice';
import { clearDiscovery } from '../src/store/discoverySlice';
import {
  clearBadgeCount,
  requestNotificationPermissions,
  setupNotificationListeners,
} from '../src/services/notificationService';
import DataProvider from '../src/components/DataProvider';
import IncomingCallBanner from '../src/components/IncomingCallBanner';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import '../global.css';



LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
]);

LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered.',
]);

GoogleSignin.configure({
  webClientId:
    '491963117666-g7ub97qg93e3k83u105bg4iiqcd5fp2q.apps.googleusercontent.com',
});

function AppNavigator() {
  const dispatch = useDispatch();

  // Sync Firebase auth state → Redux AND → Firestore
  // On every login, upsertUserProfile creates the doc if missing (first login)
  // or is a no-op merge (subsequent logins)
  useEffect(() => {
    let profileUnsubscribe: (() => void) | null = null;
    let notificationUnsubscribe: (() => void) | null = null;
    const authInstance = getAuth();

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (notificationUnsubscribe) {
        notificationUnsubscribe();
        notificationUnsubscribe = null;
      }

      if (firebaseUser) {
        // Hold routing until Firestore is checked
        dispatch(clearDiscovery()); // clear stale feed before fresh fetch
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

        notificationUnsubscribe = setupNotificationListeners();
        void requestNotificationPermissions(firebaseUser.uid);
        // 2. Create/merge Firestore user document (idempotent)
        try {
          // Only pass non-null fields to avoid overwriting existing data
          const bootstrapData: any = { email: firebaseUser.email };
          if (firebaseUser.displayName) bootstrapData.displayName = firebaseUser.displayName;
          if (firebaseUser.photoURL) {
            bootstrapData.photoURL = firebaseUser.photoURL;
            bootstrapData.hasPhoto = true;
          }

          console.log('[SkillSwap Auth] Upserting user profile...');
          await upsertUserProfile(firebaseUser.uid, bootstrapData);
          
          console.log('[SkillSwap Auth] Attaching real-time profile listener...');
          if (profileUnsubscribe) profileUnsubscribe();
          
          let hasReleased = false;

          profileUnsubscribe = listenToUserProfile(firebaseUser.uid, (doc) => {
            if (doc) {
              // ── Auto-heal: fix existing users whose isProfileComplete got stuck at false ──
              // This happened because the old upsertUserProfile update-branch had a field
              // whitelist that never wrote isProfileComplete=true to Firestore.
              // If the profile looks complete (has name + skills), repair it silently.
              const looksComplete =
                !doc.isProfileComplete &&
                !!doc.displayName?.trim() &&
                (doc.teachSkills?.length ?? 0) > 0 &&
                (doc.wantSkills?.length ?? 0) > 0;

              if (looksComplete) {
                console.log('[SkillSwap Auth] Auto-healing isProfileComplete flag...');
                upsertUserProfile(firebaseUser.uid, { isProfileComplete: true }).catch(console.error);
              }

              dispatch(setProfile(doc));
              // If we detected it looks complete, treat as complete immediately so
              // the user isn't briefly redirected to profile-setup while the write fires.
              dispatch(setProfileComplete(looksComplete ? true : (doc.isProfileComplete ?? false)));
            }
            
            // Release the loading gate exactly once on the first snapshot
            if (!hasReleased) {
               hasReleased = true;
               dispatch(setAppLoading(false));
            }
          });

          // Safeguard: Release the loading lock after 3s if Firestore listener is taking too long
          setTimeout(() => {
            if (!hasReleased) {
              console.warn('[SkillSwap Auth] Release timeout triggered — proceeding with possibly stale state');
              hasReleased = true;
              dispatch(setAppLoading(false));
            }
          }, 3000);

        } catch (e: any) {
          if (e?.code === 'firestore/permission-denied') {
            console.warn('[SkillSwap] Firestore rules not published yet — user doc not synced');
          } else {
            console.error('[SkillSwap] upsertUserProfile error:', e);
          }
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
        void clearBadgeCount();
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
      if (notificationUnsubscribe) notificationUnsubscribe();
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
        options={{ headerShown: false, title: 'Chat', animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="call/[id]"
        options={{
          headerShown: false,
          title: 'Call',
          animation: 'slide_from_right',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack>
  );
}

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <GluestackUIProvider mode="dark">
          <ThemeProvider>
            <BottomSheetModalProvider>
              <DataProvider>
                <AppNavigator />
                <IncomingCallBanner />
              </DataProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
