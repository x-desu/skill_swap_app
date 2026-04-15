import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GiftedChat, Bubble, Send, InputToolbar, Day, IMessage } from 'react-native-gifted-chat';
import { useDispatch, useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ChevronLeft, 
  Send as SendIcon, 
  Phone, 
  Video, 
  Smile, 
  Image as ImageIcon,
  MoreVertical,
  X
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import type { RootState } from '../../src/store';
import { setRoomMessages, removeMessage } from '../../src/store/chatSlice';
import { sendMessage, listenToMessages, sendImageMessage, deleteMessageForEveryone } from '../../src/services/chatService';
import { markNotificationsForMatchAsRead } from '../../src/services/notificationService';
import type { MessageDocument } from '../../src/types/user';
import UserAvatar from '../../src/components/UserAvatar';
import { useUserPresence, formatLastActive } from '../../src/hooks/useUserPresence';
import { createVideoCallInvite } from '../../src/services/videoCallService';
import { uploadChatImage } from '../../src/services/storageService';
import { DAILY_FREE_LIMITS, ACTION_CREDIT_COSTS } from '../../src/constants/ActionLimits';
import { spendCreditsOnServer } from '../../src/services/creditsService';
import { checkAndResetDailyLimits, incrementDailyLimit } from '../../src/services/firestoreService';

const COLORS = {
  rosePrimary: '#ff1a5c',
  roseLight: '#ff4d80',
  bgDark: '#130303',
  bgBase: '#0a0202',
  bgCard: '#1c0808',
  bubbleRight: '#ff1a5c',
  bubbleRightAlt: '#d4144e',
  bubbleLeft: '#1e1e1e',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.55)',
  borderLight: 'rgba(255,255,255,0.08)',
  inputBg: '#1a0a0a',
  online: '#22c55e',
};

// ── Memoised selector — avoids "returned a different reference" warning ──
// The fallback [] is defined once outside, so referential equality is preserved
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
  '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
  '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸',
  '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
  '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
  '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
  '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄',
  '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵',
  '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '👍', '👎', '👏', '🙌', '👐', '🤝', '✌️', '🤞', '🤟', '🤘',
  '👌', '🤌', '🤏', '✋', '🖐️', '👋', '💪', '🙏', '✨', '🔥',
];
const EMPTY_MESSAGES: MessageDocument[] = [];
function selectRoomMessages(roomId: string) {
  return (state: RootState) => state.chat.rooms[roomId] ?? EMPTY_MESSAGES;
}

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const dispatch = useDispatch();
  const authUser = useSelector((state: RootState) => state.auth.user);
  const profile = useSelector((state: RootState) => state.profile.profile);
  
  const dailyMessageCount = profile?.dailyMessages || 0;
  const currentCredits = profile?.credits || 0;

  const matchId = params.id as string;
  const targetUid = params.targetUid as string;

  const targetName =
    (params.name as string) ||
    (params.targetName as string) ||
    (params.senderName as string) ||
    'SkillSwap User';
  const targetPhoto =
    (params.photoURL as string) ||
    (params.targetPhoto as string) ||
    (params.targetPhotoURL as string) ||
    (params.senderPhotoURL as string) ||
    '';

  // Stable selector reference – no new [] created on every render
  const roomSelector = useMemo(() => selectRoomMessages(matchId), [matchId]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isStartingVideoCall, setIsStartingVideoCall] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const giftedChatRef = useRef<any>(null);
  const storedMessages = useSelector(roomSelector);
  const [messages, setMessages] = useState<MessageDocument[]>(storedMessages);
  const chatUser = useMemo(
    () => ({
      _id: authUser?.uid ?? 'unknown-user',
      name: authUser?.displayName ?? 'Me',
      avatar: authUser?.photoURL ?? undefined,
    }),
    [authUser?.displayName, authUser?.photoURL, authUser?.uid]
  );

  // ── Real-time Listener ──
  useEffect(() => {
    if (!matchId) return;
    const unsubscribe = listenToMessages(matchId, (newMessages) => {
      setMessages(newMessages);
      dispatch(setRoomMessages({ roomId: matchId, messages: newMessages }));
    });
    return () => unsubscribe();
  }, [matchId, dispatch]);

  useEffect(() => {
    if (!authUser?.uid || !matchId) return;
    void markNotificationsForMatchAsRead(authUser.uid, matchId);
  }, [authUser?.uid, matchId]);

  useEffect(() => {
    if (authUser?.uid) {
      checkAndResetDailyLimits(authUser.uid).catch(console.error);
    }
  }, [authUser?.uid]);

  const onSend = useCallback(
    async (newMessages: IMessage[] = []) => {
      if (!matchId || !authUser) return;
      const messageToSave = newMessages[0];
      if (!messageToSave) return;

      // Optimistic UI update
      setMessages((prev) =>
        GiftedChat.append(prev as any, newMessages as any) as MessageDocument[]
      );
      setInputText('');

      try {
        await sendMessage(matchId, {
          ...(messageToSave as any),
          user: chatUser,
        });
        incrementDailyLimit(authUser.uid, 'dailyMessages').catch(console.error);
      } catch (err) {
        console.error('Failed to send message:', err);
      }
    },
    [matchId, authUser, chatUser]
  );

  const handlePickImage = async () => {
    // Check limits
    if (dailyMessageCount >= DAILY_FREE_LIMITS.MESSAGES) {
      if (currentCredits < ACTION_CREDIT_COSTS.EXTRA_MESSAGE) {
        Alert.alert('Out of Credits', 'You need credits to send more messages today.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Credits', onPress: () => router.push('/paywall') }
        ]);
        return;
      }

      const confirm = await new Promise((resolve) => {
        Alert.alert('Spend Credit', `Spend ${ACTION_CREDIT_COSTS.EXTRA_MESSAGE} credit to send a message?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send', onPress: () => resolve(true) }
        ]);
      });
      if (!confirm) return;

      try {
        await spendCreditsOnServer(ACTION_CREDIT_COSTS.EXTRA_MESSAGE, 'extra_message');
      } catch (e) {
        Alert.alert('Error', 'Failed to deduct credits.');
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        const optimisticImageId = Math.random().toString(36).substring(7);
        
        // Send image message
        const imageMessage: any = {
          _id: optimisticImageId,
          createdAt: new Date(),
          user: chatUser,
          image: imageUri,
          pending: true,
        };

        setMessages((prev) => GiftedChat.append(prev as any, [imageMessage]) as MessageDocument[]);

        try {
          const imageUrl = await uploadChatImage(matchId, chatUser._id, imageUri);
          await sendImageMessage(matchId, imageUrl, chatUser);
          incrementDailyLimit(authUser.uid, 'dailyMessages').catch(console.error);
          setMessages((prev) =>
            prev.filter((message) => message._id !== optimisticImageId)
          );
        } catch (err) {
          setMessages((prev) =>
            prev.filter((message) => message._id !== optimisticImageId)
          );
          console.error('Failed to send image:', err);
          Alert.alert('Error', 'Failed to send image');
        }
      }
    } catch (err) {
      console.error('Image picker error:', err);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleCallPress = () => {
    Alert.alert('Voice Call', `Calling ${targetName} is coming soon!`);
  };

  const handleVideoPress = () => {
    if (!matchId || !targetUid) {
      Alert.alert('Video Call', 'This chat is missing the match details needed to start a call.');
      return;
    }

    if (isStartingVideoCall) {
      return;
    }

    const startVideoCall = async () => {
      try {
        setIsStartingVideoCall(true);
        const result = await createVideoCallInvite({
          matchId,
          calleeUid: targetUid,
        });

        router.push({
          pathname: '/call/[id]',
          params: { id: result.callId },
        });
      } catch (error: any) {
        console.error('[Chat] Failed to start video call:', error);
        Alert.alert(
          'Unable to start call',
          error?.message || `Couldn’t start a video call with ${targetName}.`,
        );
      } finally {
        setIsStartingVideoCall(false);
      }
    };

    void startVideoCall();
  };

  const handleMorePress = () => {
    Alert.alert(
      targetName,
      'Choose an action',
      [
        { text: 'View Profile', onPress: () => console.log('View profile') },
        { text: 'Mute Notifications', onPress: () => Alert.alert('Muted', 'Notifications muted') },
        { text: 'Block User', style: 'destructive', onPress: () => Alert.alert('Blocked', `${targetName} has been blocked`) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // ── Render Helpers ──

  const renderBubble = (props: any) => {
    const currentMessage = props?.currentMessage;
    if (!currentMessage?.user?._id) {
      return null;
    }

    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: styles.bubbleRight,
          left: styles.bubbleLeft,
        }}
        textStyle={{
          right: styles.bubbleTextRight,
          left: styles.bubbleTextLeft,
        }}
        timeTextStyle={{
          right: styles.timeTextRight,
          left: styles.timeTextLeft,
        }}
        containerToPreviousStyle={{ right: { borderTopRightRadius: 18 }, left: { borderTopLeftRadius: 18 } }}
        onLongPress={handleLongPressMessage}
      />
    );
  };

  const renderMessageImage = (props: any) => {
    const currentMessage = props?.currentMessage;
    const imageUri = currentMessage?.image;

    // Nothing to show
    if (!imageUri || typeof imageUri !== 'string' || !imageUri.trim()) {
      return null;
    }

    // Pending optimistic upload — show shimmer placeholder
    if (currentMessage?.pending) {
      return (
        <View style={styles.messageImagePending}>
          <ActivityIndicator color="rgba(255,255,255,0.6)" size="small" />
        </View>
      );
    }

    const msgId = currentMessage?._id as string;
    // Default to false — only show spinner while the image is actively loading
    const isLoading = imageLoadingStates[msgId] ?? false;

    return (
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.messageImageWrap}
        onLongPress={() => handleLongPressMessage(null, currentMessage)}
        delayLongPress={400}
      >
        {isLoading && (
          <View style={styles.messageImageLoader}>
            <ActivityIndicator color="rgba(255,255,255,0.5)" size="small" />
          </View>
        )}
        <Image
          source={{ uri: imageUri }}
          style={[styles.messageImage, isLoading && { opacity: 0 }]}
          resizeMode="cover"
          onLoadStart={() =>
            setImageLoadingStates((prev) => ({ ...prev, [msgId]: true }))
          }
          onLoadEnd={() =>
            setImageLoadingStates((prev) => ({ ...prev, [msgId]: false }))
          }
          onError={() =>
            setImageLoadingStates((prev) => ({ ...prev, [msgId]: false }))
          }
        />
      </TouchableOpacity>
    );
  };

  // ── Manual send handler (bypasses GiftedChat send flow) ──
  const handleManualSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !authUser) return;

    // Check limits
    if (dailyMessageCount >= DAILY_FREE_LIMITS.MESSAGES) {
      if (currentCredits < ACTION_CREDIT_COSTS.EXTRA_MESSAGE) {
        Alert.alert('Out of Credits', 'You need credits to send more messages today.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Credits', onPress: () => router.push('/paywall') }
        ]);
        return;
      }

      const confirm = await new Promise((resolve) => {
        Alert.alert('Spend Credit', `Spend ${ACTION_CREDIT_COSTS.EXTRA_MESSAGE} credit to send a message?`, [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Send', onPress: () => resolve(true) }
        ]);
      });
      if (!confirm) return;

      try {
        await spendCreditsOnServer(ACTION_CREDIT_COSTS.EXTRA_MESSAGE, 'extra_message');
      } catch (e) {
        Alert.alert('Error', 'Failed to deduct credits.');
        return;
      }
    }

    const msg: IMessage = {
      _id: Math.random().toString(36).slice(2),
      text,
      createdAt: new Date(),
      user: chatUser,
    };
    onSend([msg]);
  }, [inputText, authUser, chatUser, onSend, dailyMessageCount, currentCredits]);

  const renderDay = (props: any) => (
    <Day
      {...props}
      textStyle={styles.dayText}
      wrapperStyle={styles.dayWrapper}
    />
  );

  // ── Long-press message delete ──
  const handleLongPressMessage = useCallback(
    (_context: any, message: any) => {
      const msg = message as MessageDocument;
      if (!msg?._id) return;

      const isOwn = msg.user?._id === authUser?.uid;

      const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
        {
          text: 'Delete for Me',
          style: 'destructive',
          onPress: () => {
            dispatch(removeMessage({ roomId: matchId, messageId: msg._id as string }));
          },
        },
      ];

      if (isOwn) {
        options.unshift({
          text: 'Delete for Everyone',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Delete for Everyone?',
              'This message will be permanently removed for both you and the other person.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    // Optimistic local removal
                    dispatch(removeMessage({ roomId: matchId, messageId: msg._id as string }));
                    try {
                      await deleteMessageForEveryone(matchId, msg._id as string, msg.image);
                    } catch (err) {
                      console.error('[Chat] Failed to delete message:', err);
                      Alert.alert('Error', 'Could not delete the message. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        });
      }

      options.push({ text: 'Cancel', style: 'cancel' });

      Alert.alert('Message Options', undefined as any, options as any);
    },
    [authUser?.uid, dispatch, matchId]
  );

  // Real-time presence
  const { isOnline, lastActive } = useUserPresence(targetUid);

  // ── Header ──
  const renderHeader = () => (
    <View style={[styles.header, { paddingTop: Math.max(insets.top, 14) }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
        <ChevronLeft color={COLORS.textPrimary} size={26} strokeWidth={2.5} />
      </TouchableOpacity>

      <View style={styles.headerCenter}>
        <View style={styles.avatarWrap}>
          <UserAvatar
            uid={targetUid}
            displayName={targetName}
            photoURL={targetPhoto}
            size={38}
          />
          {isOnline && <View style={styles.onlineDot} />}
        </View>
        <View>
          <Text style={styles.headerName}>{targetName}</Text>
          <Text style={[styles.onlineText, !isOnline && styles.offlineText]}>
            {isOnline ? 'Active now' : formatLastActive(lastActive)}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <TouchableOpacity onPress={handleCallPress} style={styles.headerActionBtn}>
          <Phone color="#fff" size={20} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleVideoPress}
          style={[styles.headerActionBtn, isStartingVideoCall && styles.headerActionBtnDisabled]}
          disabled={isStartingVideoCall}
        >
          <Video color={isStartingVideoCall ? 'rgba(255,255,255,0.45)' : '#fff'} size={22} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMorePress} style={styles.headerActionBtn}>
          <MoreVertical color="#fff" size={22} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!authUser) return null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {renderHeader()}

      {/* Message list — GiftedChat with its toolbar disabled */}
      <View style={styles.chatContainer}>
        <GiftedChat
          messages={messages as any}
          onSend={(msgs) => onSend(msgs as IMessage[])}
          user={chatUser}
          renderBubble={renderBubble}
          renderMessageImage={renderMessageImage}
          renderDay={renderDay}
          renderAvatar={null}
          renderInputToolbar={() => <View />}
          messagesContainerStyle={styles.messagesContainer}
          onLongPress={handleLongPressMessage}
          {...({
            scrollToBottom: true,
            scrollToBottomStyle: styles.scrollToBottom,
            scrollToBottomComponent: () => (
              <View style={styles.scrollToBottomInner}>
                <Text style={{ color: '#fff', fontSize: 16 }}>↓</Text>
              </View>
            ),
          } as any)}
        />
      </View>

      {/* ── Emoji picker ── */}
      {showEmojiPicker && (
        <View style={styles.emojiPicker}>
          <View style={styles.emojiPickerHeader}>
            <Text style={styles.emojiPickerTitle}>😊 Emojis</Text>
            <TouchableOpacity onPress={() => setShowEmojiPicker(false)} style={styles.emojiClose}>
              <X color="#fff" size={18} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={EMOJIS}
            numColumns={8}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleEmojiSelect(item)} style={styles.emojiItem}>
                <Text style={styles.emojiText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* ── Custom input bar (fully ours — no GiftedChat involvement) ── */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Left actions */}
        <TouchableOpacity
          onPress={() => setShowEmojiPicker((v) => !v)}
          style={[styles.inputIconBtn, showEmojiPicker && styles.inputIconBtnActive]}
          activeOpacity={0.7}
        >
          <Smile color={showEmojiPicker ? COLORS.rosePrimary : 'rgba(255,255,255,0.7)'} size={22} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePickImage} style={styles.inputIconBtn} activeOpacity={0.7}>
          <ImageIcon color="rgba(255,255,255,0.7)" size={22} />
        </TouchableOpacity>

        {/* Text input */}
        <TextInput
          style={styles.customTextInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message..."
          placeholderTextColor={COLORS.textSecondary}
          multiline
          maxLength={2000}
          returnKeyType="default"
          blurOnSubmit={false}
        />

        {/* Send button — always visible */}
        <TouchableOpacity
          onPress={handleManualSend}
          style={[
            styles.sendBtn,
            !inputText.trim() && styles.sendBtnDisabled,
          ]}
          activeOpacity={0.8}
          disabled={!inputText.trim()}
        >
          <SendIcon color="#fff" size={18} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },

  // ── Header ──
  header: {
    backgroundColor: COLORS.bgDark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  backButton: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 12,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  headerActionBtnDisabled: {
    opacity: 0.7,
  },
  avatarWrap: {
    position: 'relative',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: COLORS.online,
    borderWidth: 2,
    borderColor: COLORS.bgDark,
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  offlineText: {
    color: '#888',
  },
  onlineText: {
    color: COLORS.online,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },

  // ── Input Actions ──
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 12,
  },
  inputButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Input button active state ──
  inputButtonActive: {
    backgroundColor: 'rgba(255,26,92,0.2)',
  },

  // ── Emoji Picker ──
  // Fixed height so it never takes over the whole screen.
  // Rendered at the screen level (outside GiftedChat) so it doesn't
  // break GiftedChat's internal layout measurement.
  emojiPicker: {
    height: 260,
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  emojiPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  emojiPickerTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emojiClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiItem: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
    maxWidth: 44,
  },
  emojiText: {
    fontSize: 26,
  },

  // ── Chat Area ──
  chatContainer: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  messagesContainer: {
    backgroundColor: COLORS.bgBase,
    paddingBottom: 4,
  },

  // ── Bubbles ──
  bubbleRight: {
    backgroundColor: COLORS.bubbleRight,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
    paddingVertical: 2,
    shadowColor: COLORS.rosePrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bubbleLeft: {
    backgroundColor: COLORS.bubbleLeft,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    marginBottom: 2,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  bubbleTextRight: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextLeft: {
    color: '#f0f0f0',
    fontSize: 15,
    lineHeight: 20,
  },
  messageImageWrap: {
    margin: 3,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  messageImageLoader: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  messageImage: {
    width: 220,
    height: 165,
    borderRadius: 13,
  },
  messageImagePending: {
    width: 220,
    height: 165,
    borderRadius: 13,
    margin: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeTextRight: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
  },
  timeTextLeft: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
  },

  // ── Day separator ──
  dayWrapper: {
    marginTop: 16,
    marginBottom: 8,
  },
  dayText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Custom input bar ──
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 10,
    paddingHorizontal: 10,
    gap: 6,
  },
  inputIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputIconBtnActive: {
    backgroundColor: 'rgba(255,26,92,0.15)',
  },
  customTextInput: {
    flex: 1,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.rosePrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.rosePrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 6,
  },
  sendBtnDisabled: {
    backgroundColor: 'rgba(255,26,92,0.35)',
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── Scroll to bottom ──
  scrollToBottom: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    right: 16,
    bottom: 16,
    width: 40,
    height: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scrollToBottomInner: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
