import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Phone, PhoneOff, Video } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { getAuth } from '@react-native-firebase/auth';

import type { RootState } from '../store';
import type { VideoCallDocument } from '../types/user';
import {
  acceptVideoCallInvite,
  declineVideoCallInvite,
  listenToIncomingVideoCalls,
} from '../services/videoCallService';
import UserAvatar from './UserAvatar';

export default function IncomingCallBanner() {
  const authUser = useSelector((state: RootState) => state.auth.user);
  const isAuthLoading = useSelector((state: RootState) => state.auth.isLoading);
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [incomingCall, setIncomingCall] = useState<VideoCallDocument | null>(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    const firebaseUid = getAuth().currentUser?.uid;

    if (isAuthLoading || !authUser?.uid || firebaseUid !== authUser.uid) {
      setIncomingCall(null);
      return;
    }

    return listenToIncomingVideoCalls(authUser.uid, (calls) => {
      setIncomingCall(calls[0] ?? null);
    });
  }, [authUser?.uid, isAuthLoading]);

  const caller = useMemo(() => incomingCall?.caller, [incomingCall]);

  const openCallScreen = (callId: string) => {
    router.push({
      pathname: '/call/[id]',
      params: { id: callId },
    });
  };

  const handleAccept = async () => {
    if (!incomingCall || isActing) {
      return;
    }

    try {
      setIsActing(true);
      await acceptVideoCallInvite(incomingCall.id);
      openCallScreen(incomingCall.id);
    } catch (error: any) {
      console.error('[IncomingCallBanner] Accept failed:', error);
      Alert.alert('Unable to answer', error?.message || 'Please try again.');
    } finally {
      setIsActing(false);
    }
  };

  const handleDecline = async () => {
    if (!incomingCall || isActing) {
      return;
    }

    try {
      setIsActing(true);
      await declineVideoCallInvite(incomingCall.id);
    } catch (error: any) {
      console.error('[IncomingCallBanner] Decline failed:', error);
      Alert.alert('Unable to decline', error?.message || 'Please try again.');
    } finally {
      setIsActing(false);
    }
  };

  if (!incomingCall || !caller || pathname.startsWith('/call/')) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <View style={[styles.banner, { marginTop: insets.top + 10 }]}>
        <View style={styles.left}>
          <View style={styles.avatarWrap}>
            <UserAvatar
              uid={caller.uid}
              displayName={caller.displayName}
              photoURL={caller.photoURL}
              size={44}
            />
            <View style={styles.videoBadge}>
              <Video color="#fff" size={12} />
            </View>
          </View>

          <View style={styles.copy}>
            <Text style={styles.title}>Incoming video call</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {caller.displayName}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={isActing}
            onPress={handleDecline}
            style={[styles.iconButton, styles.declineButton, isActing && styles.disabled]}
          >
            {isActing ? <ActivityIndicator color="#fff" /> : <PhoneOff color="#fff" size={18} />}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={isActing}
            onPress={handleAccept}
            style={[styles.iconButton, styles.acceptButton, isActing && styles.disabled]}
          >
            {isActing ? <ActivityIndicator color="#fff" /> : <Phone color="#fff" size={18} />}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    zIndex: 50,
  },
  banner: {
    width: '92%',
    borderRadius: 22,
    backgroundColor: '#1a0508',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: 12,
  },
  videoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff1a5c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1a0508',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#7f1d1d',
  },
  acceptButton: {
    backgroundColor: '#15803d',
  },
  disabled: {
    opacity: 0.75,
  },
});
