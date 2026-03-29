import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeftRight, MessageSquare } from 'lucide-react-native';
import UserAvatar from '../../src/components/UserAvatar';
import {
  type SwapMessageRow,
  type SwapRequestRow,
  type SwapsSegment,
  useSwapsData,
} from '../../src/hooks/useSwapsData';

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
}: {
  item: SwapMessageRow;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.82} onPress={onPress}>
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
  );
}

function RequestRow({ item }: { item: SwapRequestRow }) {
  const directionLabel = item.direction === 'incoming' ? 'Incoming' : 'Sent';
  const pillLabel = `${directionLabel} · ${formatStatus(item.status)}`;

  return (
    <View style={styles.row}>
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
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { isLoading, messageRows, requestRows } = useSwapsData();
  const [activeSegment, setActiveSegment] = useState<SwapsSegment>('messages');

  useEffect(() => {
    if (params.tab === 'requests') {
      setActiveSegment('requests');
      return;
    }
    if (params.tab === 'messages') {
      setActiveSegment('messages');
    }
  }, [params.tab]);

  const activeData = useMemo(
    () => (activeSegment === 'messages' ? messageRows : requestRows),
    [activeSegment, messageRows, requestRows],
  );

  const emptyCopy =
    activeSegment === 'messages'
      ? 'No messages yet. Match with someone to start chatting.'
      : 'No swap requests right now. New requests will appear here.';

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.rosePrimary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Swaps</Text>
      <SegmentedControl value={activeSegment} onChange={setActiveSegment} />

      <FlatList
        data={activeData}
        key={activeSegment}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          activeSegment === 'messages' ? (
            <MessageRow
              item={item as SwapMessageRow}
              onPress={() =>
                router.push({
                  pathname: '/chat/[id]',
                  params: {
                    id: (item as SwapMessageRow).matchId,
                    targetUid: (item as SwapMessageRow).targetUid,
                    name: (item as SwapMessageRow).title,
                    photoURL: (item as SwapMessageRow).photoURL || '',
                  },
                })
              }
            />
          ) : (
            <RequestRow item={item as SwapRequestRow} />
          )
        }
        contentContainerStyle={[
          styles.listContent,
          activeData.length === 0 && styles.emptyListContent,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={<Text style={styles.emptyText}>{emptyCopy}</Text>}
        showsVerticalScrollIndicator={false}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
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
  },
  requestPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
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
