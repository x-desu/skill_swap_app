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
  writeBatch
} from '@react-native-firebase/firestore';
import { upsertUserProfile } from './firestoreService';
import type { AppNotification } from '../types/user';

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

// Global behavior is set in app/_layout.tsx

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

    // 2. Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    console.log('Notification permission status:', finalStatus);

    if (finalStatus !== 'granted') {
      return null;
    }

    // 3. Get the push token
    // Using getExpoPushTokenAsync().data as requested
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("PUSH TOKEN:", token);

    // 4. Store token in user profile
    if (token && userUid) {
      await upsertUserProfile(userUid, {
        pushToken: token,
        lastActive: serverTimestamp() as any,
      });
    }

    // Configure Android channel
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
    console.error('Error requesting notification permissions:', error);
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
  data?: AppNotification['data'] | Record<string, any>
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

export const openNotificationDestination = (
  data?: AppNotification['data'] | Record<string, any>
): boolean => {
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
      const notifs = snap.docs.map((docSnap: any) => ({
        ...(docSnap.data() as AppNotification),
        id: docSnap.id,
      }));
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
    if (!snap.exists) return; // Doc already deleted or doesn't exist

    await updateDoc(notifRef, { read: true });
  } catch (err) {
    console.warn('[NotificationService] Error marking notification read:', err);
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
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    
    if (snap.empty) return;

    const batch = writeBatch(db());
    snap.docs.forEach((docSnap: any) => {
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
    if (!snap.exists) return;

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
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>
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
  data?: Record<string, string>
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
