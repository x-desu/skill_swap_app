import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Platform,
  Keyboard,
} from 'react-native';
import { Send, Image as ImageIcon, Smile, Keyboard as KeyboardIcon } from 'lucide-react-native';

import EmojiPicker, { type EmojiType } from 'rn-emoji-keyboard';

interface ChatInputProps {
  onSend: (text: string) => void;
  onType?: () => void;
  onImagePress?: () => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onType,
  onImagePress,
  placeholder = 'Type a message...',
}) => {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleChangeText = (val: string) => {
    setText(val);
    if (onType) onType();
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleEmojiPick = (emoji: EmojiType) => {
    setText((prev) => prev + emoji.emoji);
  };

  const toggleEmoji = () => {
    if (emojiOpen) {
      setEmojiOpen(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
      setTimeout(() => setEmojiOpen(true), 200);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={toggleEmoji} style={styles.iconButton}>
          {emojiOpen ? (
            <KeyboardIcon color="#ff1a5c" size={24} />
          ) : (
            <Smile color="rgba(255, 255, 255, 0.5)" size={24} />
          )}
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          value={text}
          onChangeText={handleChangeText}
          onFocus={() => setEmojiOpen(false)}
          multiline
        />

        <TouchableOpacity onPress={onImagePress} style={styles.iconButton}>
          <ImageIcon color="rgba(255, 255, 255, 0.5)" size={24} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSend}
          disabled={!text.trim()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
            ]}
          >
            <Send color="#fff" size={18} />
          </View>
        </TouchableOpacity>
      </View>

      <EmojiPicker
        onEmojiSelected={handleEmojiPick}
        open={emojiOpen}
        onClose={() => setEmojiOpen(false)}
        theme={{
          backdrop: '#0d020290',
          knob: '#ff1a5c',
          container: '#1a0a0a',
          header: '#ff1a5c',
          skinTonesContainer: '#1a0a0a',
          category: {
            icon: 'rgba(255, 255, 255, 0.5)',
            iconActive: '#ff1a5c',
            container: '#1a0a0a',
            containerActive: 'rgba(255, 26, 92, 0.15)',
          },
          search: {
            text: '#ffffff',
            placeholder: 'rgba(255,255,255,0.4)',
            icon: '#ff1a5c',
            background: 'rgba(255,255,255,0.08)',
          },
        }}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0d0202',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 2,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    maxHeight: 120,
  },
  iconButton: {
    padding: 8,
  },
  sendButton: {
    backgroundColor: '#ff1a5c',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(255, 26, 92, 0.3)',
  },
});
