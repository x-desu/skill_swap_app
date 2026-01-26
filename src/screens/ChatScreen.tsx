import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { Send } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export default function ChatScreen() {
    const route = useRoute<any>();
    const { matchId, user } = route.params; // The other user
    const { messages, sendMessage, currentUser } = useStore();
    const [text, setText] = useState('');
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    const chatMessages = messages.filter(m => m.matchId === matchId);

    const handleSend = () => {
        if (text.trim().length === 0) return;
        sendMessage(matchId, text);
        setText('');
    };

    const renderMessage = ({ item }: { item: any }) => {
        const isMe = item.senderId === currentUser.id;
        return (
            <View style={[styles.bubbleWrapper, isMe ? styles.myBubbleWrapper : styles.theirBubbleWrapper]}>
                <View style={[
                    styles.bubble,
                    isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: colors.cardBackground, borderColor: colors.border }]
                ]}>
                    <Text style={[
                        styles.messageText,
                        isMe ? styles.myMessageText : { color: colors.text }
                    ]}>
                        {item.text}
                    </Text>
                </View>
                <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <FlatList
                data={chatMessages}
                keyExtractor={item => item.id}
                renderItem={renderMessage}
                contentContainerStyle={styles.list}
                inverted={false}
            />

            <View style={[styles.inputContainer, { backgroundColor: colors.headerBackground, borderTopColor: colors.border }]}>
                <TextInput
                    style={[styles.input, { backgroundColor: colorScheme === 'dark' ? '#333' : '#f9f9f9', color: colors.text }]}
                    value={text}
                    onChangeText={setText}
                    placeholder="Type a message..."
                    placeholderTextColor="#999"
                />
                <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
                    <Send color="#fff" size={20} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, // Dynamic bg
    list: { padding: 20 },
    bubbleWrapper: {
        marginBottom: 15,
        maxWidth: '80%',
    },
    myBubbleWrapper: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    theirBubbleWrapper: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    bubble: {
        padding: 12,
        borderRadius: 20,
        minWidth: 60,
    },
    myBubble: {
        backgroundColor: '#FF5A5F',
        borderBottomRightRadius: 4,
    },
    theirBubble: {
        // dynamic bg handled inline
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        // dynamic border color handled inline
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    myMessageText: {
        color: '#fff',
    },
    // theirMessageText handled inline
    timestamp: {
        fontSize: 10,
        color: '#999',
        marginTop: 4,
        marginHorizontal: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 10,
        // bg handled inline
        alignItems: 'center',
        borderTopWidth: 1,
        // border color handled inline
    },
    input: {
        flex: 1,
        // bg handled inline
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        fontSize: 16,
        marginRight: 10,
        // color handled inline
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF5A5F',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
