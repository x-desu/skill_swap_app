import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar } from 'react-native-gifted-chat';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

import type { RootState } from '../../src/store';
import { sendMessage, listenToMessages } from '../../src/services/chatService';
import type { MessageDocument } from '../../src/types/user';
import UserAvatar from '../../src/components/UserAvatar';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgDark: '#1a0505',
  bgBase: '#0d0202',
  bubbleRight: '#ff1a5c',
  bubbleLeft: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
};

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const authUser = useSelector((state: RootState) => state.auth.user);

  const matchId = params.id as string;
  const targetUid = params.targetUid as string;
  // If coming from Match Celebration, we have name & photo. Otherwise just UID.
  const targetName = (params.name as string) || `Match (${targetUid?.slice(0, 4)}...)`;
  const targetPhoto = (params.photoURL as string) || '';

  const [messages, setMessages] = useState<MessageDocument[]>([]);

  // ── Real-time Listener ──
  // Mounts the Firestore read listener exactly when this screen opens.
  // Automatically unsubscribes when this screen closes.
  useEffect(() => {
    if (!matchId) return;
    
    const unsubscribe = listenToMessages(matchId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [matchId]);

  const onSend = useCallback(
    async (newMessages: MessageDocument[] = []) => {
      if (!matchId || !authUser) return;

      const messageToSave = newMessages[0];
      if (!messageToSave) return;

      // Optimistic update
      setMessages((previousMessages) =>
        GiftedChat.append(previousMessages, newMessages) as MessageDocument[]
      );

      // Write to Firestore
      try {
        await sendMessage(matchId, {
          ...messageToSave,
          user: {
            _id: authUser.uid,
            name: authUser.displayName || 'Me',
            avatar: authUser.photoURL || undefined,
          },
        });
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [matchId, authUser]
  );

  // ── UI Customization ──

  const renderBubble = (props: any) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: COLORS.bubbleRight,
          },
          left: {
            backgroundColor: COLORS.bubbleLeft,
          },
        }}
        textStyle={{
          right: { color: COLORS.textPrimary },
          left: { color: COLORS.textPrimary },
        }}
        timeTextStyle={{
          right: { color: 'rgba(255,255,255,0.5)' },
          left: { color: 'rgba(255,255,255,0.4)' },
        }}
      />
    );
  };

  const renderInputToolbar = (props: any) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: COLORS.bgDark,
          borderTopColor: COLORS.borderLight,
          borderTopWidth: 1,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 8),
        }}
        primaryStyle={{ alignItems: 'center' }}
      />
    );
  };

  const renderSend = (props: any) => {
    return (
      <Send {...props} containerStyle={styles.sendContainer}>
        <Text style={styles.sendText}>Send</Text>
      </Send>
    );
  };

  // Custom Header
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <ChevronLeft color={COLORS.textPrimary} size={28} />
      </TouchableOpacity>
      <View style={styles.headerInfo}>
        <UserAvatar
          uid={targetUid}
          displayName={targetName}
          photoURL={targetPhoto}
          size={36}
        />
        <Text style={styles.headerName}>{targetName}</Text>
      </View>
    </View>
  );

  if (!authUser) return null;

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages as any} // Cast needed due to strict IMessage typing vs Timestamp
          onSend={(newMessages) => onSend(newMessages as MessageDocument[])}
          user={{
            _id: authUser.uid,
            name: authUser.displayName || 'Me',
            avatar: authUser.photoURL || undefined,
          }}
          renderBubble={renderBubble}
          renderInputToolbar={renderInputToolbar}
          renderSend={renderSend}
          renderAvatarOnTop
          showAvatarForEveryMessage={false}
          bottomOffset={insets.bottom > 0 ? insets.bottom : 0}
          textInputProps={{
            style: styles.textInput,
            placeholderTextColor: COLORS.textSecondary,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  header: {
    backgroundColor: COLORS.bgDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  sendContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  sendText: {
    color: COLORS.rosePrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    marginHorizontal: 12,
    fontSize: 15,
  },
});
