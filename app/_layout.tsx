import { useEffect, useRef, useState } from 'react';
import { LogBox, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
import * as Updates from 'expo-updates';
import '../global.css';



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
              dispatch(setProfile(doc));
              
              // Handle mapping from Firestore string status to Redux types
              let completeState: boolean | 'pending' | 'rejected' = false;
              if (doc.isProfileComplete === true) {
                completeState = true;
              } else if (doc.isProfileComplete === 'pending_validation') {
                completeState = 'pending';
              } else if (doc.isProfileComplete === false && doc.validationError) {
                completeState = 'rejected';
              }
              
              dispatch(setProfileComplete(completeState));
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
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="chat"
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
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="user/[id]"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="notifications"
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="paywall"
        options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="customer-center"
        options={{ headerShown: false, animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="skills-directory"
        options={{ headerShown: false, animation: 'slide_from_bottom' }}
      />
    </Stack>
  );
}


// ── OTA Update Banner ─────────────────────────────────────────────────────────
function UpdateBanner() {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'ready'>('idle');
  const slideAnim = useRef(new Animated.Value(-80)).current;

  const show = () => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
  };
  const hide = () => {
    Animated.timing(slideAnim, { toValue: -80, duration: 300, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (Updates.isEmbeddedLaunch) return; // skip in dev/Expo Go
    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        setStatus('downloading');
        show();
        await Updates.fetchUpdateAsync();
        setStatus('ready');
      } catch {
        hide();
      }
    })();
  }, []);

  if (status === 'idle') return null;

  return (
    <Animated.View style={[bannerStyles.wrap, { transform: [{ translateY: slideAnim }] }]}>
      {status === 'downloading' ? (
        <View style={bannerStyles.row}>
          <View style={bannerStyles.dot} />
          <Text style={bannerStyles.text}>Downloading update…</Text>
        </View>
      ) : (
        <TouchableOpacity style={bannerStyles.row} onPress={() => Updates.reloadAsync()}>
          <Text style={bannerStyles.emoji}>✦</Text>
          <Text style={bannerStyles.text}>Update ready — </Text>
          <Text style={bannerStyles.action}>Tap to restart</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999,
    backgroundColor: '#ff1a5c',
    paddingTop: 48, paddingBottom: 12, paddingHorizontal: 20,
    shadowColor: '#ff1a5c', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#fff', opacity: 0.9,
  },
  emoji: { color: '#fff', fontSize: 14, fontWeight: '900' },
  text: { color: '#fff', fontSize: 14, fontWeight: '600' },
  action: { color: '#fff', fontSize: 14, fontWeight: '900', textDecorationLine: 'underline' },
});

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
                <UpdateBanner />
              </DataProvider>
            </BottomSheetModalProvider>
          </ThemeProvider>
        </GluestackUIProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
