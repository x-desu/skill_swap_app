import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type {
  AppNotification,
  MatchDocument,
  SwapRequest,
  UserDocument,
} from '../types/user';
import { getUserProfile } from '../services/firestoreService';
import { useMySwaps } from './useMySwaps';
import { useNotifications } from './useNotifications';

export type SwapsSegment = 'requests' | 'messages';

export interface SwapMessageRow {
  id: string;
  matchId: string;
  targetUid: string;
  title: string;
  photoURL: string | null;
  preview: string;
  timestamp: number;
  unreadCount: number;
}

export interface SwapRequestRow {
  id: string;
  direction: 'incoming' | 'outgoing';
  targetUid: string;
  title: string;
  photoURL: string | null;
  message: string;
  summary: string;
  status: string;
  timestamp: number;
}

const toMillis = (value: unknown): number => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { toMillis?: () => number; toDate?: () => Date };
    if (typeof maybeTimestamp.toMillis === 'function') {
      return maybeTimestamp.toMillis();
    }
    if (typeof maybeTimestamp.toDate === 'function') {
      return maybeTimestamp.toDate().getTime();
    }
  }
  return 0;
};

const buildRequestRow = (
  swap: SwapRequest,
  direction: 'incoming' | 'outgoing',
  profile: UserDocument | null | undefined,
): SwapRequestRow => {
  const isIncoming = direction === 'incoming';
  const targetUid = isIncoming ? swap.fromUid : swap.toUid;
  const displayName =
    (isIncoming ? swap.fromName : swap.toName) ||
    profile?.displayName ||
    'SkillSwap User';
  const photoURL =
    (isIncoming ? swap.fromPhotoURL : swap.toPhotoURL) ??
    profile?.photoURL ??
    null;

  return {
    id: swap.id || `${direction}-${targetUid}-${toMillis(swap.createdAt)}`,
    direction,
    targetUid,
    title: displayName,
    photoURL,
    message: swap.message || 'No message added.',
    summary: `${swap.offeredSkill} for ${swap.wantedSkill}`,
    status: swap.status,
    timestamp: toMillis(swap.updatedAt) || toMillis(swap.createdAt),
  };
};

export function useSwapsData() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const matches = useSelector((state: RootState) => state.matches.list);
  const hasLoadedOnce = useSelector((state: RootState) => state.matches.hasLoadedOnce);
  const { incoming, outgoing, isLoading: swapsLoading } = useMySwaps();
  const { notifications, unreadCount } = useNotifications();
  const [profiles, setProfiles] = useState<Record<string, UserDocument | null>>({});
  const [profilesLoading, setProfilesLoading] = useState(false);

  useEffect(() => {
    if (!authUser?.uid) {
      setProfiles({});
      setProfilesLoading(false);
      return;
    }

    const neededUids = new Set<string>();

    matches.forEach((match) => {
      const otherUid = match.users.find((uid) => uid !== authUser.uid);
      if (otherUid) neededUids.add(otherUid);
    });

    incoming.forEach((swap) => neededUids.add(swap.fromUid));
    outgoing.forEach((swap) => neededUids.add(swap.toUid));

    const missingUids = [...neededUids].filter((uid) => !(uid in profiles));
    if (missingUids.length === 0) return;

    let cancelled = false;
    setProfilesLoading(true);

    Promise.all(
      missingUids.map(async (uid) => {
        try {
          const profile = await getUserProfile(uid);
          return [uid, profile] as const;
        } catch (error) {
          console.warn('[useSwapsData] Failed to resolve user profile:', uid, error);
          return [uid, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;

      setProfiles((prev) => {
        const next = { ...prev };
        entries.forEach(([uid, profile]) => {
          next[uid] = profile;
        });
        return next;
      });
      setProfilesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.uid, matches, incoming, outgoing]);

  const latestNotificationByMatchId = useMemo(() => {
    return notifications.reduce<Record<string, AppNotification>>((acc, notification) => {
      const matchId = notification.data?.matchId;
      if (!matchId || acc[matchId]) {
        return acc;
      }
      acc[matchId] = notification;
      return acc;
    }, {});
  }, [notifications]);

  const unreadByMatchId = useMemo(() => {
    return notifications.reduce<Record<string, number>>((acc, notification) => {
      if (notification.type !== 'new_message' || notification.read) {
        return acc;
      }

      const matchId = notification.data?.matchId;
      if (!matchId) {
        return acc;
      }

      acc[matchId] = (acc[matchId] || 0) + 1;
      return acc;
    }, {});
  }, [notifications]);

  const messageRows = useMemo<SwapMessageRow[]>(() => {
    if (!authUser?.uid) return [];

    return [...matches]
      .map((match: MatchDocument) => {
        const targetUid = match.users.find((uid) => uid !== authUser.uid) || '';
        const profile = profiles[targetUid];
        const context = latestNotificationByMatchId[match.id]?.data;

        return {
          id: match.id,
          matchId: match.id,
          targetUid,
          title: profile?.displayName || context?.targetName || 'SkillSwap User',
          photoURL: profile?.photoURL ?? context?.targetPhotoURL ?? null,
          preview: match.lastMessage || 'New match! Say hello.',
          timestamp: toMillis(match.lastMessageTime) || toMillis(match.matchedAt),
          unreadCount: unreadByMatchId[match.id] || 0,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [authUser?.uid, latestNotificationByMatchId, matches, profiles, unreadByMatchId]);

  const requestRows = useMemo<SwapRequestRow[]>(() => {
    const combined = [
      ...incoming.map((swap) => buildRequestRow(swap, 'incoming', profiles[swap.fromUid])),
      ...outgoing.map((swap) => buildRequestRow(swap, 'outgoing', profiles[swap.toUid])),
    ];

    return combined.sort((a, b) => b.timestamp - a.timestamp);
  }, [incoming, outgoing, profiles]);

  // Only show the global spinner until the matches listener has resolved at least once.
  // swapsLoading (swap requests) is allowed to load independently — don't block Messages on it.
  const isLoading = !authUser || !hasLoadedOnce;

  return {
    isLoading,
    unreadCount,
    messageRows,
    requestRows,
  };
}
