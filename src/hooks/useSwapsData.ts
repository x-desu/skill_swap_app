import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type {
  AppNotification,
  LikeDocument,
  MatchDocument,
  SwapRequest,
  UserDocument,
} from '../types/user';
import { getUserProfile } from '../services/firestoreService';
import { useLikes } from './useLikes';
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
  source: 'like' | 'swap_request';
  sourceId: string;
  fromUid: string;
  toUid: string;
  targetUid: string;
  title: string;
  photoURL: string | null;
  message: string;
  summary: string;
  status: string;
  timestamp: number;
  canAccept: boolean;
  canDecline: boolean;
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
    source: 'swap_request',
    sourceId: swap.id || `${direction}-${targetUid}-${toMillis(swap.createdAt)}`,
    fromUid: swap.fromUid,
    toUid: swap.toUid,
    targetUid,
    title: displayName,
    photoURL,
    message: swap.message || 'No message added.',
    summary: `${swap.offeredSkill} for ${swap.wantedSkill}`,
    status: swap.status,
    timestamp: toMillis(swap.updatedAt) || toMillis(swap.createdAt),
    canAccept: direction === 'incoming' && swap.status === 'pending',
    canDecline: direction === 'incoming' && swap.status === 'pending',
  };
};

const buildLikeRequestRow = (
  like: LikeDocument,
  direction: 'incoming' | 'outgoing',
  profile: UserDocument | null | undefined,
): SwapRequestRow => {
  const isIncoming = direction === 'incoming';
  const targetUid = isIncoming ? like.fromUid : like.toUid;
  const displayName = profile?.displayName || 'SkillSwap User';

  return {
    id: `like-${like.id || `${direction}-${targetUid}-${toMillis(like.createdAt)}`}`,
    direction,
    source: 'like',
    sourceId: like.id || `${direction}-${targetUid}-${toMillis(like.createdAt)}`,
    fromUid: like.fromUid,
    toUid: like.toUid,
    targetUid,
    title: displayName,
    photoURL: profile?.photoURL ?? null,
    message: isIncoming
      ? `${displayName} wants to swap skills with you.`
      : `Waiting for ${displayName} to respond to your swap request.`,
    summary: 'Skill swap request',
    status: 'pending',
    timestamp: toMillis(like.createdAt),
    canAccept: direction === 'incoming',
    canDecline: direction === 'incoming',
  };
};

const dedupeRequestRows = (rows: SwapRequestRow[]): SwapRequestRow[] => {
  const seen = new Set<string>();

  return [...rows]
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter((row) => {
      const key = `${row.direction}:${row.targetUid}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

export function useSwapsData() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const matches = useSelector((state: RootState) => state.matches.list);
  const hasLoadedOnce = useSelector((state: RootState) => state.matches.hasLoadedOnce);
  const { incoming, outgoing } = useMySwaps();
  const { pendingIncoming, pendingOutgoing } = useLikes(authUser?.uid);
  const { notifications, unreadCount } = useNotifications();
  const [profiles, setProfiles] = useState<Record<string, UserDocument | null>>({});

  const requiredProfileUids = useMemo(() => {
    if (!authUser?.uid) {
      return [];
    }

    const neededUids = new Set<string>();

    matches.forEach((match) => {
      const otherUid = match.users.find((uid) => uid !== authUser.uid);
      if (otherUid) neededUids.add(otherUid);
    });

    incoming.forEach((swap) => neededUids.add(swap.fromUid));
    outgoing.forEach((swap) => neededUids.add(swap.toUid));
    pendingIncoming.forEach((like) => neededUids.add(like.fromUid));
    pendingOutgoing.forEach((like) => neededUids.add(like.toUid));

    return [...neededUids].sort();
  }, [authUser?.uid, incoming, matches, outgoing, pendingIncoming, pendingOutgoing]);

  const requiredProfileKey = requiredProfileUids.join('|');

  useEffect(() => {
    if (!authUser?.uid) {
      setProfiles((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }

    const missingUids = requiredProfileUids.filter((uid) => !(uid in profiles));
    if (missingUids.length === 0) return;

    let cancelled = false;

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
        let changed = false;
        const next = { ...prev };
        entries.forEach(([uid, profile]) => {
          if (next[uid] === profile) {
            return;
          }
          next[uid] = profile;
          changed = true;
        });
        return changed ? next : prev;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [authUser?.uid, requiredProfileKey]);

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

  const matchedPairKeys = useMemo(() => {
    return new Set(
      matches.map((match) => [...match.users].sort().join(':')),
    );
  }, [matches]);

  const requestRows = useMemo<SwapRequestRow[]>(() => {
    const combined = [
      ...incoming
        .filter((swap) => swap.status === 'pending')
        .map((swap) => buildRequestRow(swap, 'incoming', profiles[swap.fromUid])),
      ...outgoing
        .filter((swap) => swap.status === 'pending')
        .map((swap) => buildRequestRow(swap, 'outgoing', profiles[swap.toUid])),
      ...pendingIncoming.map((like) => buildLikeRequestRow(like, 'incoming', profiles[like.fromUid])),
      ...pendingOutgoing.map((like) => buildLikeRequestRow(like, 'outgoing', profiles[like.toUid])),
    ];

    const pendingOnly = combined.filter(
      (row) => !matchedPairKeys.has([row.fromUid, row.toUid].sort().join(':')),
    );

    return dedupeRequestRows(pendingOnly);
  }, [incoming, outgoing, pendingIncoming, pendingOutgoing, profiles, matchedPairKeys]);

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
