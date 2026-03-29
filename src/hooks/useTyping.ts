import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  updateTypingStatus, 
  subscribeToTypingStatus 
} from '../services/chatService';

const TYPING_TIMEOUT = 3000; // 3 seconds of inactivity clears typing status

/**
 * useTyping
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for managing typing indicators in a chat.
 * Handles debounced typing updates and listens to other user's typing status.
 */
export const useTyping = (
  matchId: string,
  currentUid: string,
  otherUid: string
) => {
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingUpdateRef = useRef<number>(0);

  // Subscribe to other user's typing status
  useEffect(() => {
    if (!matchId || !otherUid) {
      setOtherUserTyping(false);
      return;
    }

    const unsubscribe = subscribeToTypingStatus(matchId, (typingStatus) => {
      const isOtherTyping = typingStatus[otherUid] || false;
      setOtherUserTyping(isOtherTyping);
    });

    return () => unsubscribe();
  }, [matchId, otherUid]);

  // Send typing status update with debouncing
  const setTyping = useCallback((typing: boolean) => {
    if (!matchId || !currentUid) return;

    const now = Date.now();
    
    // Don't send updates more frequently than every 500ms
    if (now - lastTypingUpdateRef.current < 500 && typing === isTyping) {
      return;
    }

    lastTypingUpdateRef.current = now;
    setIsTyping(typing);

    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // Send typing status
    updateTypingStatus(matchId, currentUid, typing).catch(console.error);

    // Auto-clear typing status after timeout
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateTypingStatus(matchId, currentUid, false).catch(console.error);
      }, TYPING_TIMEOUT);
    }
  }, [matchId, currentUid, isTyping]);

  // Handle text input changes
  const onTextInput = useCallback(() => {
    if (!isTyping) {
      setTyping(true);
    } else {
      // Reset the timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        updateTypingStatus(matchId, currentUid, false).catch(console.error);
      }, TYPING_TIMEOUT);
    }
  }, [isTyping, setTyping, matchId, currentUid]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Clear typing status when leaving chat
      if (matchId && currentUid && isTyping) {
        updateTypingStatus(matchId, currentUid, false).catch(console.error);
      }
    };
  }, [matchId, currentUid, isTyping]);

  return {
    isTyping,
    otherUserTyping,
    setTyping,
    onTextInput,
  };
};
