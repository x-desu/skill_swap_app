import { useState, useCallback } from 'react';
import { sendMessage } from '../services/chatService';
import { sendPushNotification } from '../services/notificationService';
import { MessageDocument } from '../types/user';

/**
 * useSendMessage
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook wrapper around the sendMessage mutation operation to handle loading/error states.
 * Optimistic: Immediately triggers UI updates via callback while sending in background.
 * Note: sendMessage in chatService already creates the in-app notification.
 */
export const useSendMessage = (
  matchId: string, 
  recipientUid?: string,
  onOptimisticUpdate?: (message: MessageDocument) => void
) => {
  const [loading, setLoading] = useState(false);

  const send = useCallback(
    async (text: string, userId: string, userName: string, avatarUrl?: string) => {
      if (!text.trim() || !userId) return;

      const messagePayload: MessageDocument = {
        _id: Math.random().toString(36).substring(7), // Temp ID
        text: text.trim(),
        createdAt: Date.now(),
        user: {
          _id: userId,
          name: userName,
          avatar: avatarUrl,
        },
        status: 'sent', // Will be overridden as 'sending' in UI if needed
        pending: true,
      };

      // Trigger optimistic update in UI
      if (onOptimisticUpdate) {
        onOptimisticUpdate(messagePayload);
      }

      setLoading(true);
      try {
        // sendMessage creates both the message AND the in-app notification
        await sendMessage(matchId, messagePayload, recipientUid || '');
        
        // Only send push notification metadata in the normalized target* shape.
        if (recipientUid) {
          await sendPushNotification(recipientUid, userName, text.trim(), { 
            type: 'new_message', 
            matchId,
            targetUid: userId,
            targetName: userName,
            targetPhotoURL: avatarUrl || '',
            senderId: userId,
            senderName: userName,
            senderPhotoURL: avatarUrl || '',
          });
        }

      } catch (error) {
        console.error('Failed to send message:', error);
        // Error handling could involve flagging the message as 'failed' here
      } finally {
        setLoading(false);
      }
    },
    [matchId, recipientUid, onOptimisticUpdate]
  );

  return { send, loading };
};
