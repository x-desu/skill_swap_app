import { useEffect, useState, useCallback } from 'react';
import { subscribeToMessages, markMessageAsRead } from '../services/chatService';
import { MessageDocument } from '../types/user';

/**
 * useChat
 * ─────────────────────────────────────────────────────────────────────────────
 * React Hook that manages a real-time subscription to a specific match's messages.
 * Includes read receipt functionality - marks received messages as read.
 * Automatically unsubscribes when the component unmounts.
 */
export const useChat = (matchId: string, currentUid?: string) => {
  const [messages, setMessages] = useState<MessageDocument[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<MessageDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeToMessages(matchId, (newMessages) => {
      setMessages(newMessages);
      setLoading(false);
      
      // Clear optimistic messages that have been synchronized
      setOptimisticMessages(prev => 
        prev.filter(optMsg => !newMessages.some(syncMsg => syncMsg._id === optMsg._id))
      );
      
      // Mark other user's messages as read when they arrive
      if (currentUid && matchId && matchId !== 'undefined') {
        newMessages.forEach((msg) => {
          if (msg.user._id !== currentUid && 
              msg._id && 
              (!msg.readBy || !msg.readBy.includes(currentUid))) {
            markMessageAsRead(matchId, msg._id, currentUid).catch(err => {
              console.warn('[useChat] Failed to auto-mark message as read:', err.message);
            });
          }
        });
      }
    });

    return () => unsubscribe();
  }, [matchId, currentUid]);

  /**
   * Adds a message to the local optimistic state before it's saved to Firestore
   */
  const addOptimisticMessage = useCallback((message: MessageDocument) => {
    setOptimisticMessages(prev => [message, ...prev]);
  }, []);

  // Combine synced messages with optimistic ones
  const allMessages = [...optimisticMessages, ...messages];

  /**
   * Manually mark a specific message as read
   */
  const markAsRead = useCallback(async (messageId: string) => {
    if (!matchId || !currentUid) return;
    await markMessageAsRead(matchId, messageId, currentUid);
  }, [matchId, currentUid]);

  /**
   * Check if a message has been read by the other user
   */
  const isMessageRead = useCallback((message: MessageDocument, byUid: string): boolean => {
    return message.readBy?.includes(byUid) || false;
  }, []);

  /**
   * Check if a message has been delivered to the other user
   */
  const isMessageDelivered = useCallback((message: MessageDocument, toUid: string): boolean => {
    return message.deliveredTo?.includes(toUid) || false;
  }, []);

  return { 
    messages: allMessages, 
    loading,
    addOptimisticMessage,
    markAsRead,
    isMessageRead,
    isMessageDelivered,
  };
};
