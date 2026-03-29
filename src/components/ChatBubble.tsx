import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import { Check, CheckCheck } from 'lucide-react-native';
import { MessageDocument } from '../types/user';

/** Safely convert createdAt (Firestore Timestamp | number | Date) → formatted time string */
const formatTime = (createdAt: any): string => {
  try {
    let date: Date;
    if (createdAt?.toDate) {
      // Firestore Timestamp
      date = createdAt.toDate();
    } else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      return '';
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};
interface ChatBubbleProps {
  message: MessageDocument;
  isMyMessage: boolean;
  onLongPress?: () => void;
}

const COLORS = {
  rosePrimary: '#ff1a5c',
  bubbleRight: '#ff1a5c',
  bubbleLeft: 'rgba(255, 255, 255, 0.1)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.6)',
  readReceipt: '#34d399',
  deliveredReceipt: 'rgba(255, 255, 255, 0.4)',
};

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, isMyMessage, onLongPress }) => {
  const renderReadReceipt = () => {
    if (!isMyMessage) return null;

    return (
      <View style={styles.receiptContainer}>
        {message.status === 'read' ? (
          <CheckCheck size={14} color={COLORS.readReceipt} />
        ) : (
          <Check size={14} color="rgba(255, 255, 255, 0.4)" />
        )}
      </View>
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(300)}
      layout={Layout.springify()}
      style={[
        styles.container,
        isMyMessage ? styles.myMessageContainer : styles.otherMessageContainer,
      ]}
    >
      <Pressable onLongPress={onLongPress}>
        <View
          style={[
            styles.bubble,
            isMyMessage ? styles.myBubble : styles.otherBubble,
          ]}
        >
          <Text style={styles.messageText}>{message.text}</Text>
          <View style={styles.footer}>
            <Text style={styles.timeText}>
              {formatTime(message.createdAt)}
            </Text>
            {renderReadReceipt()}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    paddingHorizontal: 16,
    maxWidth: '85%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: COLORS.bubbleRight,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: COLORS.bubbleLeft,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  receiptContainer: {
    marginLeft: 2,
  },
});
