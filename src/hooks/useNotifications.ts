import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './useAuth';
import { AppNotification } from '../types/user';
import {
  listenToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  setBadgeCount,
} from '../services/notificationService';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = listenToNotifications(user.uid, (fetchedNotifications) => {
      setNotifications(fetchedNotifications);
      setIsLoading(false);

      // Automatically update the OS badge count
      const unread = fetchedNotifications.filter(n => !n.read).length;
      setBadgeCount(unread);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.uid) return;
    await markNotificationAsRead(user.uid, notificationId);
  };

  const markAllAsRead = async () => {
    if (!user?.uid) return;
    await markAllNotificationsAsRead(user.uid);
  };

  const removeNotification = async (notificationId: string) => {
    if (!user?.uid) return;
    await deleteNotification(user.uid, notificationId);
  };

  const clearAllNotifications = async () => {
    if (!user?.uid) return;
    await deleteAllNotifications(user.uid);
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  };
};
