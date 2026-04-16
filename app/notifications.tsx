import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Bell, Trash2, ArrowLeft, MessageSquare, Handshake, Info, ShieldAlert } from 'lucide-react-native';
import { useNotifications } from '../src/hooks/useNotifications';
import { AppNotification } from '../src/types/user';
import { openNotificationDestination } from '../src/services/notificationService';
import NotificationsSkeleton from '../src/components/skeletons/NotificationsSkeleton';

// Color Theme matching home.tsx
const COLORS = {
  rosePrimary: '#ff1a5c',
  roseLight: '#ff4d7a',
  bgDeep: '#2d0a0a',
  bgDark: '#1a0505',
  bgBase: '#0d0202',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderSubtle: 'rgba(255, 255, 255, 0.05)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

const formatNotificationTime = (createdAt: AppNotification['createdAt']) => {
  if (!createdAt) return 'Just now';
  if (typeof createdAt === 'number') {
    return new Date(createdAt).toLocaleString();
  }
  if (createdAt instanceof Date) {
    return createdAt.toLocaleString();
  }
  if (typeof createdAt === 'object' && typeof createdAt.toMillis === 'function') {
    return new Date(createdAt.toMillis()).toLocaleString();
  }
  return 'Just now';
};

type NotificationRowProps = {
  item: AppNotification;
  onPress: (notification: AppNotification) => void;
  onDelete: (notificationId: string) => Promise<void>;
  onOpenRow: (id: string, close: () => void) => void;
  onCloseRow: (id: string) => void;
};

function NotificationRow({
  item,
  onPress,
  onDelete,
  onOpenRow,
  onCloseRow,
}: NotificationRowProps) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const renderRightActions = () => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.deleteAction}
      onPress={async () => {
        swipeableRef.current?.close();
        await onDelete(item.id);
      }}
    >
      <Trash2 color={COLORS.textPrimary} size={20} />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderIcon = () => {
    let IconComponent = Info;
    let color = COLORS.textMuted;

    if (item.type === 'new_message') {
      IconComponent = MessageSquare;
      color = item.read ? COLORS.textMuted : '#3b82f6';
    } else if (item.type === 'new_match' || item.type === 'swap_accepted') {
      IconComponent = Handshake;
      color = item.read ? COLORS.textMuted : COLORS.rosePrimary;
    } else if (item.type === 'system') {
      IconComponent = ShieldAlert;
      color = item.read ? COLORS.textMuted : '#fbbf24';
    }

    return (
      <View style={[styles.iconWrapper, { backgroundColor: item.read ? COLORS.borderSubtle : `${color}20` }]}>
        <IconComponent color={item.read ? COLORS.textMuted : color} size={22} />
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      friction={2}
      overshootRight={false}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={(direction) => {
        if (direction === 'right') {
          onOpenRow(item.id, () => swipeableRef.current?.close());
        }
      }}
      onSwipeableClose={() => onCloseRow(item.id)}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => onPress(item)}
      >
        <View style={styles.cardLeft}>
          {renderIcon()}
          <View style={styles.content}>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
            <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.timeText}>{formatNotificationTime(item.createdAt)}</Text>
          </View>
        </View>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    </Swipeable>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { notifications, isLoading, markAsRead, removeNotification, clearAllNotifications } = useNotifications();
  const openRowRef = useRef<{ id: string; close: () => void } | null>(null);

  const handlePress = async (notification: AppNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    const opened = openNotificationDestination(notification);
    if (opened) {
      return;
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => (
    <NotificationRow
      item={item}
      onPress={handlePress}
      onDelete={removeNotification}
      onOpenRow={(id, close) => {
        if (openRowRef.current && openRowRef.current.id !== id) {
          openRowRef.current.close();
        }
        openRowRef.current = { id, close };
      }}
      onCloseRow={(id) => {
        if (openRowRef.current?.id === id) {
          openRowRef.current = null;
        }
      }}
    />
  );

  const handleClearAll = () => {
    if (notifications.length === 0) {
      return;
    }

    Alert.alert(
      'Clear all notifications?',
      'This will remove all notifications from the list.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            openRowRef.current?.close();
            openRowRef.current = null;
            await clearAllNotifications();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity
          style={[styles.clearAllBtn, notifications.length === 0 && styles.clearAllBtnDisabled]}
          onPress={handleClearAll}
          disabled={notifications.length === 0}
        >
          <Text style={styles.clearAllText}>Clear all</Text>
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      {isLoading ? (
        <NotificationsSkeleton show={isLoading} />
      ) : notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Bell color={COLORS.textMuted} size={40} />
          </View>
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptySubtitle}>You don't have any new notifications right now.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  clearAllBtn: {
    paddingVertical: 8,
    paddingLeft: 12,
    marginRight: -8,
  },
  clearAllBtnDisabled: {
    opacity: 0.45,
  },
  clearAllText: {
    color: COLORS.rosePrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgBase,
  },
  deleteAction: {
    width: 96,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
  },
  deleteText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  unreadCard: {
    backgroundColor: 'rgba(255, 26, 92, 0.05)', // Subtle rose tint
  },
  cardLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 14,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  unreadTitle: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  body: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  timeText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.rosePrimary,
    marginTop: 6,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
