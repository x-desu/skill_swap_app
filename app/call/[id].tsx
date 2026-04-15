import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import {
  CallingState,
  FloatingParticipantView,
  HangupCallButton,
  ParticipantView,
  StreamCall,
  StreamVideo,
  ToggleAudioPublishingButton,
  ToggleCameraFaceButton,
  ToggleVideoPublishingButton,
  type Call,
  type StreamVideoClient,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-native-sdk';

import type { RootState } from '../../src/store';
import type { VideoCallDocument, VideoCallParticipant } from '../../src/types/user';
import UserAvatar from '../../src/components/UserAvatar';
import {
  acceptVideoCallInvite,
  declineVideoCallInvite,
  endVideoCall,
  isVideoCallTerminalStatus,
  listenToVideoCall,
} from '../../src/services/videoCallService';
import {
  disconnectStreamVideoClient,
  ensureStreamVideoClient,
} from '../../src/services/streamVideoService';

// ─── Publish options ──────────────────────────────────────────────────────────
// Passed to call.join() to force H.264 HW encoder, 720p target, 3-layer
// simulcast for adaptive bitrate, and wideband Opus audio at 48 kbps.
const VIDEO_PUBLISH_OPTIONS = {
  videoPublishOptions: {
    preferredCodec: 'h264' as const,
    targetResolution: { width: 1280, height: 720, frameRate: 30 },
    simulcastLayers: [
      { maxBitrate: 150_000, scaleResolutionDownBy: 4 },  // 180p fallback
      { maxBitrate: 500_000, scaleResolutionDownBy: 2 },  // 360p mid
      { maxBitrate: 1_200_000, scaleResolutionDownBy: 1 }, // 720p high
    ],
  },
  audioPublishOptions: {
    bitrateBps: 48_000, // Wideband Opus — up from default ~20 kbps
    dtx: true,          // Silence detection — saves bandwidth
    stereo: false,      // Mono voice — saves ~50% vs stereo
  },
};

type CallStatusCopy = { title: string; subtitle: string };

// ─── Active call surface ──────────────────────────────────────────────────────
// Uses Stream SDK's ParticipantView (full-screen remote) + FloatingParticipantView
// (draggable self PiP) + individual control buttons for full HQ control.
function ActiveStreamCallSurface({ onHangup }: { onHangup: () => void }) {
  const { useCallCallingState, useRemoteParticipants, useLocalParticipant } =
    useCallStateHooks();
  const callingState = useCallCallingState();
  const remoteParticipants = useRemoteParticipants();
  const localParticipant = useLocalParticipant();
  const call = useCall();

  if (
    callingState === CallingState.JOINING ||
    callingState === CallingState.RECONNECTING ||
    callingState === CallingState.MIGRATING
  ) {
    return (
      <View style={styles.mediaLoading}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.mediaLoadingTitle}>
          {callingState === CallingState.RECONNECTING
            ? 'Reconnecting…'
            : 'Joining call…'}
        </Text>
        <Text style={styles.mediaLoadingText}>Connecting audio and video.</Text>
      </View>
    );
  }

  const remoteParticipant = remoteParticipants[0];

  return (
    <View style={styles.callSurface}>
        {/* ── Full-screen remote participant video ── */}
        {remoteParticipant ? (
          <ParticipantView
            participant={remoteParticipant}
            style={styles.remoteVideo}
            videoZOrder={0}
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <ActivityIndicator color="rgba(255,255,255,0.5)" />
            <Text style={styles.waitingText}>Waiting for the other person…</Text>
          </View>
        )}

        {/* ── Draggable self-view PiP ── */}
        {localParticipant && (
          <FloatingParticipantView
            participant={localParticipant}
            style={styles.selfView}
          />
        )}

        {/* ── Controls bar ── */}
        <View style={styles.controlsBar}>
          {/* Mute / unmute mic */}
          <ToggleAudioPublishingButton />

          {/* Camera on / off */}
          <ToggleVideoPublishingButton />

          {/* Flip camera (front ↔ back) */}
          <ToggleCameraFaceButton />

          {/* End call */}
          <HangupCallButton
            onHangupCallHandler={() => {
              if (call) {
                call.leave({ reject: false }).catch(() => {});
              }
              onHangup();
            }}
          />
        </View>
      </View>
    );
}

function getTerminalCopy(status?: VideoCallDocument['status']): CallStatusCopy {
  switch (status) {
    case 'declined':
      return { title: 'Call declined', subtitle: 'They chose not to join this video call.' };
    case 'cancelled':
      return { title: 'Call cancelled', subtitle: 'The invite was cancelled before the call started.' };
    case 'missed':
      return { title: 'Missed call', subtitle: 'The video call invite timed out.' };
    case 'ended':
      return { title: 'Call ended', subtitle: 'The video session has finished.' };
    default:
      return { title: 'Call unavailable', subtitle: 'This video call is no longer active.' };
  }
}

export default function CallScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);

  const callId = typeof params.id === 'string' ? params.id : '';
  const currentUid = authUser?.uid;
  const currentDisplayName =
    profile?.displayName || authUser?.displayName || authUser?.email || 'SkillSwap User';
  const currentPhoto = profile?.photoURL || authUser?.photoURL || undefined;

  const [callRecord, setCallRecord] = useState<VideoCallDocument | null>(null);
  const [isLoadingCall, setIsLoadingCall] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isJoiningMedia, setIsJoiningMedia] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const [streamClient, setStreamClient] = useState<StreamVideoClient | null>(null);
  const [streamCall, setStreamCall] = useState<Call | null>(null);

  const latestCallRef = useRef<VideoCallDocument | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const joinedStreamCallIdRef = useRef<string | null>(null);
  const hasRequestedEndRef = useRef(false);

  useEffect(() => { latestCallRef.current = callRecord; }, [callRecord]);
  useEffect(() => { activeCallRef.current = streamCall; }, [streamCall]);

  // ── Firestore listener for call record ──
  useEffect(() => {
    if (!callId) { setIsLoadingCall(false); return; }
    setIsLoadingCall(true);
    return listenToVideoCall(callId, (nextCall) => {
      setCallRecord(nextCall);
      setIsLoadingCall(false);
    });
  }, [callId]);

  // ── Clean up Stream call when Firestore record goes terminal ──
  useEffect(() => {
    if (!callRecord || !isVideoCallTerminalStatus(callRecord.status)) return;
    const activeCall = activeCallRef.current;
    if (activeCall) {
      activeCall.leave({ reject: false }).catch((error) => {
        console.warn('[CallScreen] Failed to leave Stream call after terminal status:', error);
      });
      activeCallRef.current = null;
    }
    joinedStreamCallIdRef.current = null;
    setStreamCall(null);
    setStreamClient(null);
    void disconnectStreamVideoClient();
  }, [callRecord]);

  // ── Join Stream SDK call when Firestore record = 'accepted' ──
  useEffect(() => {
    if (!callRecord || callRecord.status !== 'accepted' || !currentUid) return;
    if (joinedStreamCallIdRef.current === callRecord.streamCallId) return;

    let cancelled = false;

    const joinCall = async () => {
      try {
        setJoinError(null);
        setIsJoiningMedia(true);

        const client = await ensureStreamVideoClient({
          id: currentUid,
          name: currentDisplayName,
          image: currentPhoto,
        });

        if (cancelled) return;

        const nextCall = client.call(callRecord.streamCallType, callRecord.streamCallId);
        activeCallRef.current = nextCall;
        joinedStreamCallIdRef.current = callRecord.streamCallId;

        // ── High-quality join ──
        // publishOptions force H.264 HW encoder, 720p/30fps, 3-layer simulcast,
        // and 48 kbps Opus audio. Without these Stream uses defaults (~300 kbps VP8).
        await nextCall.join({
          create: false,
          ring: false,
          notify: false,
          audio: true,
          video: true,
          ...(VIDEO_PUBLISH_OPTIONS as any),
        });

        if (cancelled) {
          await nextCall.leave({ reject: false }).catch(() => {});
          return;
        }

        setStreamClient(client);
        setStreamCall(nextCall);
      } catch (error: any) {
        console.error('[CallScreen] Failed to join Stream call:', error);
        joinedStreamCallIdRef.current = null;
        activeCallRef.current = null;
        setJoinError(error?.message || 'Unable to connect to the video call right now.');
      } finally {
        if (!cancelled) setIsJoiningMedia(false);
      }
    };

    void joinCall();
    return () => { cancelled = true; };
  }, [
    callRecord?.status,
    callRecord?.streamCallId,
    callRecord?.streamCallType,
    currentDisplayName,
    currentPhoto,
    currentUid,
    joinAttempt,
  ]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      const pendingCall = latestCallRef.current;
      const activeCall = activeCallRef.current;

      if (activeCall) activeCall.leave({ reject: false }).catch(() => {});

      if (pendingCall && !isVideoCallTerminalStatus(pendingCall.status) && !hasRequestedEndRef.current) {
        void endVideoCall(pendingCall.id).catch((error) => {
          console.warn('[CallScreen] Failed to end call during cleanup:', error);
        });
      }

      void disconnectStreamVideoClient();
    };
  }, []);

  const otherParticipant = useMemo<VideoCallParticipant | null>(() => {
    if (!callRecord || !currentUid) return callRecord?.caller || null;
    return currentUid === callRecord.callerUid ? callRecord.callee : callRecord.caller;
  }, [callRecord, currentUid]);

  const isCaller = currentUid === callRecord?.callerUid;

  const navigateToChat = () => {
    if (!callRecord || !otherParticipant) { router.back(); return; }
    router.replace({
      pathname: '/chat/[id]',
      params: {
        id: callRecord.matchId,
        targetUid: otherParticipant.uid,
        name: otherParticipant.displayName,
        photoURL: otherParticipant.photoURL || '',
      },
    });
  };

  const handleAccept = async () => {
    if (!callRecord || isActionLoading) return;
    try {
      setIsActionLoading(true);
      await acceptVideoCallInvite(callRecord.id);
    } catch (error: any) {
      console.error('[CallScreen] Accept failed:', error);
      Alert.alert('Unable to answer', error?.message || 'Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!callRecord || isActionLoading) return;
    try {
      hasRequestedEndRef.current = true;
      setIsActionLoading(true);
      await declineVideoCallInvite(callRecord.id);
      navigateToChat();
    } catch (error: any) {
      hasRequestedEndRef.current = false;
      console.error('[CallScreen] Decline failed:', error);
      Alert.alert('Unable to decline', error?.message || 'Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleHangup = async () => {
    if (!callRecord || isActionLoading) return;
    try {
      hasRequestedEndRef.current = true;
      setIsActionLoading(true);
      await endVideoCall(callRecord.id);
      navigateToChat();
    } catch (error: any) {
      hasRequestedEndRef.current = false;
      console.error('[CallScreen] Hangup failed:', error);
      Alert.alert('Unable to end call', error?.message || 'Please try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const retryJoin = () => {
    joinedStreamCallIdRef.current = null;
    activeCallRef.current = null;
    setStreamCall(null);
    setStreamClient(null);
    setJoinError(null);
    setJoinAttempt((v) => v + 1);
  };

  if (!currentUid) return null;

  if (isLoadingCall) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingTitle}>Loading call…</Text>
      </View>
    );
  }

  if (!callRecord || !otherParticipant) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingTitle}>Call not found</Text>
        <Pressable onPress={() => router.back()} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (isVideoCallTerminalStatus(callRecord.status)) {
    const copy = getTerminalCopy(callRecord.status);
    return (
      <View style={[styles.stateScreen, { paddingTop: insets.top + 24 }]}>
        <View style={styles.heroOrb} />
        <View style={styles.statusCard}>
          <UserAvatar
            uid={otherParticipant.uid}
            displayName={otherParticipant.displayName}
            photoURL={otherParticipant.photoURL}
            size={78}
          />
          <Text style={styles.statusTitle}>{copy.title}</Text>
          <Text style={styles.statusSubtitle}>{copy.subtitle}</Text>
          <Pressable onPress={navigateToChat} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to chat</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (callRecord.status === 'ringing') {
    return (
      <View style={[styles.stateScreen, { paddingTop: insets.top + 24 }]}>
        <View style={styles.heroOrb} />
        <View style={styles.statusCard}>
          <View style={styles.iconBadge}>
            <Video color="#fff" size={22} />
          </View>
          <UserAvatar
            uid={otherParticipant.uid}
            displayName={otherParticipant.displayName}
            photoURL={otherParticipant.photoURL}
            size={86}
          />
          <Text style={styles.statusEyebrow}>
            {isCaller ? 'Outgoing video call' : 'Incoming video call'}
          </Text>
          <Text style={styles.statusTitle}>{otherParticipant.displayName}</Text>
          <Text style={styles.statusSubtitle}>
            {isCaller
              ? 'Waiting for them to answer from chat.'
              : 'Answer now to jump into the call.'}
          </Text>

          <View style={styles.buttonRow}>
            {!isCaller && (
              <Pressable
                disabled={isActionLoading}
                onPress={handleAccept}
                style={[styles.roundAction, styles.acceptRound]}
              >
                {isActionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Phone color="#fff" size={22} />
                )}
              </Pressable>
            )}

            <Pressable
              disabled={isActionLoading}
              onPress={handleDecline}
              style={[styles.roundAction, styles.declineRound]}
            >
              {isActionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <PhoneOff color="#fff" size={22} />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (joinError) {
    return (
      <View style={[styles.stateScreen, { paddingTop: insets.top + 24 }]}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Couldn't join the call</Text>
          <Text style={styles.statusSubtitle}>{joinError}</Text>
          <View style={styles.errorActions}>
            <Pressable onPress={retryJoin} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Retry</Text>
            </Pressable>
            <Pressable onPress={handleHangup} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>End call</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (!streamClient || !streamCall || isJoiningMedia) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.loadingTitle}>Connecting call…</Text>
        <Text style={styles.loadingText}>Starting HD video with {otherParticipant.displayName}.</Text>
      </View>
    );
  }

  return (
    <View style={styles.callScreen}>
      <StreamVideo client={streamClient}>
        <StreamCall call={streamCall}>
          <ActiveStreamCallSurface onHangup={() => void handleHangup()} />
        </StreamCall>
      </StreamVideo>
    </View>
  );
}

const styles = StyleSheet.create({
  callScreen: {
    flex: 1,
    backgroundColor: '#050102',
  },

  // ── Active call surface ──
  callSurface: {
    flex: 1,
    backgroundColor: '#050102',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  waitingText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    textAlign: 'center',
  },
  selfView: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // ── Controls bar ──
  controlsBar: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
  },

  // ── Loading / state screens ──
  loadingScreen: {
    flex: 1,
    backgroundColor: '#050102',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  loadingTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 18,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  mediaLoading: {
    flex: 1,
    backgroundColor: '#050102',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mediaLoadingTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  mediaLoadingText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
    marginTop: 8,
  },
  stateScreen: {
    flex: 1,
    backgroundColor: '#050102',
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  heroOrb: {
    position: 'absolute',
    top: 100,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,26,92,0.12)',
  },
  statusCard: {
    width: '100%',
    marginTop: 70,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 28,
    backgroundColor: '#130407',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ff1a5c',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  statusEyebrow: {
    color: 'rgba(255,255,255,0.56)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 18,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  statusSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 28,
  },
  roundAction: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptRound: { backgroundColor: '#16a34a' },
  declineRound: { backgroundColor: '#b91c1c' },
  primaryButton: {
    minWidth: 160,
    borderRadius: 18,
    backgroundColor: '#ff1a5c',
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: {
    minWidth: 140,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  secondaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  errorActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
});
