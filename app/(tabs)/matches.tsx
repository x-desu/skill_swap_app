import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { ArrowLeftRight, MessageSquare, Trash2 } from 'lucide-react-native';
import UserAvatar from '../../src/components/UserAvatar';
import {
  type SwapMessageRow,
  type SwapRequestRow,
  type SwapsSegment,
  useSwapsData,
} from '../../src/hooks/useSwapsData';
import { acceptRequest, declineRequest, deleteChatThread } from '../../src/services/chatService';
import { removeRoomMessages } from '../../src/store/chatSlice';
import MatchesListSkeleton from '../../src/components/skeletons/MatchesListSkeleton';

const COLORS = {
  rosePrimary: '#ff1a5c',
  roseSurface: '#7b1f38',
  bgDeep: '#150304',
  bgCard: '#1e0a0d',
  borderLight: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.72)',
  textMuted: 'rgba(255, 255, 255, 0.45)',
  badge: '#ff4d7a',
  requestIncoming: 'rgba(52, 211, 153, 0.16)',
  requestOutgoing: 'rgba(255, 26, 92, 0.16)',
};

const formatRowTime = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatStatus = (status: string) => {
  if (!status) return 'Pending';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

type SwapListRow = SwapMessageRow | SwapRequestRow;

function SegmentedControl({
  value,
  onChange,
}: {
  value: SwapsSegment;
  onChange: (segment: SwapsSegment) => void;
}) {
  const options: Array<{ key: SwapsSegment; label: string; icon: React.ReactNode }> = [
    {
      key: 'requests',
      label: 'Requests',
      icon: <ArrowLeftRight color={value === 'requests' ? '#fff' : COLORS.textSecondary} size={18} />,
    },
    {
      key: 'messages',
      label: 'Messages',
      icon: <MessageSquare color={value === 'messages' ? '#fff' : COLORS.textSecondary} size={18} />,
    },
  ];

  return (
    <View style={styles.segmentedOuter}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.segmentButton, active && styles.segmentButtonActive]}
            activeOpacity={0.85}
            onPress={() => onChange(option.key)}
          >
            <View style={styles.segmentContent}>
              {option.icon}
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MessageRow({
  item,
  onPress,
  onDelete,
  isDeleting,
}: {
  item: SwapMessageRow;
  onPress: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={styles.rowTapArea}
        activeOpacity={0.82}
        onPress={onPress}
        disabled={isDeleting}
      >
        <View style={styles.avatarWrap}>
          <UserAvatar
            uid={item.targetUid}
            displayName={item.title}
            photoURL={item.photoURL}
            size={58}
          />
          {item.unreadCount > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {item.unreadCount > 9 ? '9+' : item.unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.rowTime}>{formatRowTime(item.timestamp)}</Text>
          </View>
          <Text style={styles.rowPreview} numberOfLines={1}>
            {item.preview}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Delete chat with ${item.title}`}
        activeOpacity={0.8}
        disabled={isDeleting}
        onPress={onDelete}
        style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={COLORS.rosePrimary} />
        ) : (
          <Trash2 color={COLORS.textMuted} size={18} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function RequestRow({
  item,
  isActing,
  onAccept,
  onDecline,
}: {
  item: SwapRequestRow;
  isActing: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const directionLabel = item.direction === 'incoming' ? 'Incoming' : 'Sent';
  const pillLabel = `${directionLabel} · ${formatStatus(item.status)}`;

  return (
    <View style={styles.row}>
      <View style={styles.rowTapArea}>
        <View style={styles.avatarWrap}>
          <UserAvatar
            uid={item.targetUid}
            displayName={item.title}
            photoURL={item.photoURL}
            size={58}
          />
        </View>

        <View style={styles.rowContent}>
          <View style={styles.rowHeader}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.rowTime}>{formatRowTime(item.timestamp)}</Text>
          </View>

          <View style={styles.requestMetaRow}>
            <View
              style={[
                styles.requestPill,
                item.direction === 'incoming' ? styles.requestPillIncoming : styles.requestPillOutgoing,
              ]}
            >
              <Text style={styles.requestPillText}>{pillLabel}</Text>
            </View>
            <Text style={styles.requestSummary} numberOfLines={1}>
              {item.summary}
            </Text>
          </View>

          <Text style={styles.rowPreview} numberOfLines={1}>
            {item.message}
          </Text>

          {item.canAccept || item.canDecline ? (
            <View style={styles.requestActions}>
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isActing}
                onPress={onDecline}
                style={[styles.requestActionButton, styles.requestDeclineButton, isActing && styles.requestActionDisabled]}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.requestActionText}>Decline</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={isActing}
                onPress={onAccept}
                style={[styles.requestActionButton, styles.requestAcceptButton, isActing && styles.requestActionDisabled]}
              >
                {isActing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.requestActionText}>Accept</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isLoading, messageRows, requestRows } = useSwapsData();
  const [activeSegment, setActiveSegment] = useState<SwapsSegment>('messages');
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [requestActionId, setRequestActionId] = useState<string | null>(null);

  useEffect(() => {
    if (params.tab === 'requests') {
      setActiveSegment('requests');
      return;
    }
    if (params.tab === 'messages') {
      setActiveSegment('messages');
    }
  }, [params.tab]);

  const activeData = useMemo<SwapListRow[]>(
    () => (activeSegment === 'messages' ? messageRows : requestRows),
    [activeSegment, messageRows, requestRows],
  );

  const confirmDeleteChat = useCallback(
    async (item: SwapMessageRow) => {
      try {
        setDeletingMatchId(item.matchId);
        await deleteChatThread(item.matchId);
        dispatch(removeRoomMessages(item.matchId));
      } catch (error: any) {
        console.error('[Matches] Failed to delete chat:', error);
        Alert.alert(
          'Unable to delete chat',
          error?.message || 'Please try again in a moment.',
        );
      } finally {
        setDeletingMatchId((currentMatchId) =>
          currentMatchId === item.matchId ? null : currentMatchId,
        );
      }
    },
    [dispatch],
  );

  const handleDeletePress = useCallback(
    (item: SwapMessageRow) => {
      if (deletingMatchId) {
        return;
      }

      Alert.alert(
        'Delete chat?',
        `This will permanently remove your conversation with ${item.title} for both participants.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Chat',
            style: 'destructive',
            onPress: () => {
              void confirmDeleteChat(item);
            },
          },
        ],
      );
    },
    [confirmDeleteChat, deletingMatchId],
  );

  const handleAcceptRequest = useCallback(
    async (item: SwapRequestRow) => {
      try {
        setRequestActionId(item.id);
        await acceptRequest({ source: item.source, sourceId: item.sourceId });
        Alert.alert('Request accepted', `${item.title} is now available in Messages.`);
      } catch (error: any) {
        console.error('[Matches] Failed to accept request:', error);
        Alert.alert(
          'Unable to accept request',
          error?.message || 'Please try again in a moment.',
        );
      } finally {
        setRequestActionId((currentId) => (currentId === item.id ? null : currentId));
      }
    },
    [],
  );

  const handleDeclineRequest = useCallback(
    async (item: SwapRequestRow) => {
      try {
        setRequestActionId(item.id);
        await declineRequest({ source: item.source, sourceId: item.sourceId });
      } catch (error: any) {
        console.error('[Matches] Failed to decline request:', error);
        Alert.alert(
          'Unable to decline request',
          error?.message || 'Please try again in a moment.',
        );
      } finally {
        setRequestActionId((currentId) => (currentId === item.id ? null : currentId));
      }
    },
    [],
  );

  const emptyCopy =
    activeSegment === 'messages'
      ? 'No messages yet. Match with someone to start chatting.'
      : 'No swap requests right now. New requests will appear here.';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Swaps</Text>
      <SegmentedControl value={activeSegment} onChange={setActiveSegment} />

      {isLoading ? (
        <MatchesListSkeleton show={isLoading} />
      ) : (
        <FlatList<SwapListRow>
          data={activeData}
          key={activeSegment}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            activeSegment === 'messages' && 'matchId' in item ? (
              <MessageRow
                item={item}
                isDeleting={deletingMatchId === item.matchId}
                onPress={() =>
                  router.push({
                    pathname: '/chat/[id]',
                    params: {
                      id: item.matchId,
                      targetUid: item.targetUid,
                      name: item.title,
                      photoURL: item.photoURL || '',
                    },
                  })
                }
                onDelete={() => handleDeletePress(item)}
              />
            ) : 'direction' in item ? (
              <RequestRow
                item={item}
                isActing={requestActionId === item.id}
                onAccept={() => {
                  void handleAcceptRequest(item);
                }}
                onDecline={() => {
                  void handleDeclineRequest(item);
                }}
              />
            ) : null
          }
          contentContainerStyle={[
            styles.listContent,
            activeData.length === 0 && styles.emptyListContent,
          ]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{emptyCopy}</Text>}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 18,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 18,
  },
  segmentedOuter: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 6,
    marginBottom: 18,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: COLORS.roseSurface,
  },
  segmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 120,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.badge,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: COLORS.bgDeep,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  rowContent: {
    flex: 1,
    marginLeft: 14,
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    backgroundColor: COLORS.bgCard,
  },
  deleteButtonDisabled: {
    opacity: 0.8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowTitle: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 12,
  },
  rowTime: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  rowPreview: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 4,
  },
  requestMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    flexWrap: 'wrap',
    gap: 8,
  },
  requestPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  requestPillIncoming: {
    backgroundColor: COLORS.requestIncoming,
  },
  requestPillOutgoing: {
    backgroundColor: COLORS.requestOutgoing,
  },
  requestPillText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  requestSummary: {
    flex: 1,
    color: COLORS.rosePrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  requestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  requestActionButton: {
    minWidth: 96,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  requestAcceptButton: {
    backgroundColor: '#15803d',
  },
  requestDeclineButton: {
    backgroundColor: '#7f1d1d',
  },
  requestActionDisabled: {
    opacity: 0.8,
  },
  requestActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 72,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
