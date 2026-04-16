import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Notification, NotificationResponse } from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  where,
  query,
  limit,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  writeBatch,
} from '@react-native-firebase/firestore';
import { upsertUserProfile } from './firestoreService';
import type { AppNotification, AppNotificationData } from '../types/user';

/**
 * notificationService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Service for managing push notifications using Expo Notifications and Firebase FCM.
 * Handles permission requests, token management, and local notification display.
 */

const db = () => getFirestore();

type ChatRouteParams = {
  id: string;
  targetUid: string;
  name?: string;
  photoURL?: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions and get FCM token
 * Returns the push token if granted, null otherwise
 */
export const requestNotificationPermissions = async (
  userUid: string
): Promise<string | null> => {
  try {
    // 1. Ensure code only runs on real device
    if (!Device.isDevice) {
      console.warn('[Notifications] Must use physical device for Push Notifications');
      return null;
    }

    // 2. Request permissions — wrapped separately so aps-environment issues
    //    don't crash the app (requires Push Notifications capability in Xcode)
    let finalStatus: string = 'undetermined';
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
    } catch (permError: any) {
      const msg = permError?.message || String(permError);
      if (msg.includes('aps-environment')) {
        // Missing Xcode entitlement — harmless for dev, fix by adding Push
        // Notifications capability in Xcode → Signing & Capabilities
        console.warn(
          '[Notifications] Push Notifications entitlement missing in Xcode.\n' +
          'Fix: Xcode → SkillSwap target → Signing & Capabilities → + Capability → Push Notifications.\n' +
          'App will work normally; only push notifications are disabled until fixed.'
        );
      } else {
        console.warn('[Notifications] Permission request failed:', msg);
      }
      return null;
    }

    console.log('[Notifications] Permission status:', finalStatus);
    if (finalStatus !== 'granted') return null;

    // 3. Get the Expo push token (projectId required for physical devices)
    let token: string | null = null;
    try {
      const result = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-expo-project-id', // replace with value from app.json > extra.eas.projectId
      });
      token = result.data;
      console.log('[Notifications] Push token:', token);
    } catch (tokenError: any) {
      console.warn('[Notifications] Could not get push token:', tokenError?.message);
      return null;
    }

    // 4. Store token in Firestore
    if (token && userUid) {
      await upsertUserProfile(userUid, {
        pushToken: token,
        lastActive: serverTimestamp() as any,
      });
    }

    // 5. Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#ff1a5c',
      });
    }

    return token;
  } catch (error) {
    console.warn('[Notifications] requestNotificationPermissions error (non-fatal):', error);
    return null;
  }
};

/**
 * Update FCM / Expo push token for a user
 */
export const updateFcmToken = async (
  userUid: string,
  token: string
): Promise<void> => {
  await upsertUserProfile(userUid, {
    pushToken: token,
    lastActive: serverTimestamp() as any,
  });
};

/**
 * Show a local notification when app is in foreground
 */
export const showLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<void> => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // Show immediately
  });
};

const normalizeChatRouteParams = (
  data?: AppNotificationData | Record<string, any>
): ChatRouteParams | null => {
  if (!data?.matchId) {
    return null;
  }

  const targetUid = data.targetUid || data.senderId;

  if (!targetUid) {
    return null;
  }

  return {
    id: data.matchId,
    targetUid,
    name: data.targetName || data.senderName || '',
    photoURL: data.targetPhotoURL || data.senderPhotoURL || '',
  };
};

const openRequestsTab = () => {
  router.push({
    pathname: '/(tabs)/matches',
    params: { tab: 'requests' },
  });
};

export const openNotificationDestination = (
  notification?: Pick<AppNotification, 'type' | 'data'> | AppNotificationData | Record<string, any>
): boolean => {
  const type =
    notification && 'type' in notification ? notification.type : notification?.type;
  const data =
    notification && 'data' in notification ? notification.data : notification;

  if (type === 'swap_request') {
    openRequestsTab();
    return true;
  }

  const chatParams = normalizeChatRouteParams(data);

  if (!chatParams) {
    return false;
  }

  router.push({
    pathname: '/chat/[id]',
    params: chatParams,
  });

  return true;
};

/**
 * Set up notification listeners
 * Call this once when the app initializes
 */
export const setupNotificationListeners = (): (() => void) => {
  // Listen for notifications received while app is in foreground
  const subscription = Notifications.addNotificationReceivedListener(
    (notification: Notification) => {
      console.log('Notification received:', notification);
      // Handle foreground notification
      // The notification handler above will automatically show it
    }
  );

  // Listen for notification responses (user tapped notification)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response: NotificationResponse) => {
      const data = response.notification.request.content.data as Record<string, any>;
      console.log('Notification tapped:', data);
      if (data?.type === 'swap_request') {
        openRequestsTab();
        return;
      }
      openNotificationDestination(data);
    }
  );

  // Return cleanup function
  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
};

/**
 * Clear all badge notifications
 */
export const clearBadgeCount = async (): Promise<void> => {
  await Notifications.setBadgeCountAsync(0);
};

/**
 * Get current badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  return await Notifications.getBadgeCountAsync();
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

// ─── In-App Notifications (Firestore Top-Level Collection) ───────────────────

const notificationsCol = () => collection(db(), 'notifications');

/**
 * Real-time listener for user's in-app notifications
 */
export const listenToNotifications = (
  uid: string,
  callback: (notifications: AppNotification[]) => void
): (() => void) => {
  console.log('[Notifications] Starting listener for uid:', uid);
  
  const q = query(
    notificationsCol(),
    where('userId', '==', uid),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(
    q,
    (snap) => {
      console.log('[Notifications] Snapshot received, docs count:', snap?.docs?.length || 0);
      if (!snap) return callback([]);
      const notifs = snap.docs.map((docSnap: any) => {
        const data = docSnap.data() as Omit<AppNotification, 'id'>;
        return {
          ...data,
          id: docSnap.id,
        } as AppNotification;
      });
      console.log('[Notifications] Parsed notifications:', notifs.length);
      callback(notifs);
    },
    (error) => {
      console.error('[Notifications] Listener error:', error);
    }
  );
};

/**
 * Mark a single notification as read
 */
export const markNotificationAsRead = async (uid: string, notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db(), 'notifications', notificationId);
    const snap = await getDoc(notifRef);
    if (!snap.exists()) return; // Doc already deleted or doesn't exist

    await updateDoc(notifRef, { read: true });
  } catch (err) {
    console.warn('[NotificationService] Error marking notification read:', err);
  }
};

export const markNotificationsForMatchAsRead = async (
  uid: string,
  matchId: string,
): Promise<void> => {
  try {
    const q = query(
      notificationsCol(),
      where('userId', '==', uid),
      limit(100),
    );
    const snap = await getDocs(q);

    const docsForMatch = snap.docs.filter((docSnap: any) => {
      const data = docSnap.data() as AppNotification;
      return data.type === 'new_message' && !data.read && data.data?.matchId === matchId;
    });

    if (docsForMatch.length === 0) return;

    const batch = writeBatch(db());
    docsForMatch.forEach((docSnap: any) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.warn('[NotificationService] Error marking match notifications read:', err);
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async (uid: string): Promise<void> => {
  try {
    const q = query(
      notificationsCol(),
      where('userId', '==', uid),
      limit(100),
    );
    const snap = await getDocs(q);

    const unreadDocs = snap.docs.filter((docSnap: any) => {
      const data = docSnap.data() as AppNotification;
      return !data.read;
    });

    if (unreadDocs.length === 0) return;

    const batch = writeBatch(db());
    unreadDocs.forEach((docSnap: any) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error marking all read:', err);
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (uid: string, notificationId: string): Promise<void> => {
  try {
    const notifRef = doc(db(), 'notifications', notificationId);
    const snap = await getDoc(notifRef);
    if (!snap.exists()) return;

    await deleteDoc(notifRef);
  } catch (err) {
    console.warn('[NotificationService] Error deleting notification:', err);
  }
};

export const deleteAllNotifications = async (uid: string): Promise<void> => {
  try {
    const q = query(
      notificationsCol(),
      where('userId', '==', uid),
      limit(100)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db());
    snap.docs.forEach((docSnap: any) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('[NotificationService] Error deleting all notifications:', err);
  }
};

/**
 * Send an in-app notification (writes to target user's notifications subcollection)
 */
export const sendInAppNotification = async (
  targetUid: string,
  notification: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'read'>
): Promise<void> => {
  try {
    await addDoc(notificationsCol(), {
      ...notification,
      userId: targetUid,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Error sending in-app notification:', err);
  }
};

/**
 * Send a remote push notification via Expo Push API
 */
export const sendPushNotification = async (
  targetUid: string,
  title: string,
  body: string,
  data?: AppNotificationData
): Promise<void> => {
  try {
    // 1. Fetch user's push token from Firestore
    const userRef = doc(db(), 'users', targetUid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const pushToken = userData?.pushToken;

    if (!pushToken || !pushToken.startsWith('ExponentPushToken[')) {
      console.log(`No valid expo push token found for user ${targetUid}`);
      return;
    }

    // 2. Dispatch HTTP post to Expo API
    const message = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
};
