import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Text,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSelector } from 'react-redux';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';

import type { RootState } from '../../src/store';
import { useChat } from '../../src/hooks/useChat';
import { useSendMessage } from '../../src/hooks/useSendMessage';
import { useTyping } from '../../src/hooks/useTyping';
import { markMatchAsRead } from '../../src/services/chatService';
import { getUserProfile } from '../../src/services/firestoreService';
import { getMatchById } from '../../src/services/matchingService';
import type { MessageDocument } from '../../src/types/user';

import { ChatHeader } from '../../src/components/ChatHeader';
import { ChatBubble } from '../../src/components/ChatBubble';
import { ChatInput } from '../../src/components/ChatInput';
import { ChatSkeleton } from '../../src/components/ChatSkeleton';

export default function ChatRoomScreen() {
  const params = useLocalSearchParams();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const flatListRef = useRef<FlatList<MessageDocument>>(null);

  const matchId = params.id as string;
  const routeTargetUid = params.targetUid as string | undefined;
  const routeTargetName = (params.name as string) || '';
  const routeTargetPhoto = (params.photoURL as string) || '';
  const [resolvedTargetUid, setResolvedTargetUid] = useState<string>(routeTargetUid || '');
  const [resolvedTargetName, setResolvedTargetName] = useState<string>(routeTargetName);
  const [resolvedTargetPhoto, setResolvedTargetPhoto] = useState<string>(routeTargetPhoto);

  const {
    messages,
    loading,
    addOptimisticMessage,
  } = useChat(matchId, authUser?.uid);

  const { send } = useSendMessage(matchId, resolvedTargetUid, addOptimisticMessage);
  const { onTextInput, otherUserTyping } = useTyping(matchId, authUser?.uid || '', resolvedTargetUid);

  const headerName = useMemo(() => resolvedTargetName || routeTargetName || 'Match', [resolvedTargetName, routeTargetName]);
  const headerPhoto = useMemo(() => resolvedTargetPhoto || routeTargetPhoto || '', [resolvedTargetPhoto, routeTargetPhoto]);

  useEffect(() => {
    if (messages.length > 0) {
      // Inverted list: newest is at index 0. Scroll to start.
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    // Basic validation to prevent firestore-not-found errors if matchId is invalid
    if (matchId && matchId !== 'undefined' && matchId !== 'null' && authUser?.uid) {
      markMatchAsRead(matchId, authUser.uid).catch(err => {
        console.warn('[ChatRoom] Failed to mark match as read:', err.message);
      });
    }
  }, [matchId, authUser?.uid]);

  useEffect(() => {
    let cancelled = false;

    const resolveTargetProfile = async () => {
      if (!matchId || !authUser?.uid) {
        return;
      }

      let targetUid = routeTargetUid || '';

      if (!targetUid) {
        try {
          const match = await getMatchById(matchId);
          targetUid = match?.users?.find((uid) => uid !== authUser.uid) || '';
        } catch (error) {
          console.warn('[ChatRoom] Failed to resolve match participants:', error);
        }
      }

      if (!targetUid || cancelled) {
        return;
      }

      setResolvedTargetUid(targetUid);

      try {
        const profile = await getUserProfile(targetUid);

        if (cancelled) {
          return;
        }

        setResolvedTargetName(profile?.displayName || routeTargetName || 'Match');
        setResolvedTargetPhoto(profile?.photoURL || routeTargetPhoto || '');
      } catch (error) {
        if (!cancelled) {
          console.warn('[ChatRoom] Failed to fetch target profile:', error);
          setResolvedTargetName((current) => current || routeTargetName || 'Match');
          setResolvedTargetPhoto((current) => current || routeTargetPhoto || '');
        }
      }
    };

    resolveTargetProfile();

    return () => {
      cancelled = true;
    };
  }, [authUser?.uid, matchId, routeTargetName, routeTargetPhoto, routeTargetUid]);

  const handleSend = useCallback(
    (text: string) => {
      if (!authUser) return;
      send(
        text,
        authUser.uid,
        authUser.displayName || 'Me',
        authUser.photoURL || undefined
      );
    },
    [authUser, send]
  );

  const handleImagePress = useCallback(async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission Needed', 'Please allow access to your photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        Alert.alert('📷 Image Selected', 'Image sharing coming soon!');
      }
    } catch {
      Alert.alert('Error', 'Failed to open image picker.');
    }
  }, []);

  const handleViewProfile = useCallback(() => {
    Alert.alert(headerName, 'Profile view coming soon!');
  }, [headerName]);

  const renderItem = ({ item }: { item: MessageDocument }) => (
    <ChatBubble
      message={item}
      isMyMessage={item.user._id === authUser?.uid}
    />
  );

  if (!authUser) return null;

  return (
    <View style={styles.root}>
      <ChatHeader
        name={headerName}
        avatar={headerPhoto}
        isOnline={false}
        onViewProfile={handleViewProfile}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading && messages.length === 0 ? (
          <ChatSkeleton />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item._id}
            inverted
            contentContainerStyle={styles.listContent}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            style={styles.flex}
          />
        )}

        {otherUserTyping && (
          <Animated.View entering={FadeIn} style={styles.typingIndicator}>
            <Text style={styles.typingText}>{headerName} is typing...</Text>
          </Animated.View>
        )}

        <ChatInput
          onSend={handleSend}
          onType={onTextInput}
          onImagePress={handleImagePress}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0d0202',
  },
  flex: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  typingText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
