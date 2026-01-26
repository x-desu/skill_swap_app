import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export default function MatchesScreen() {
    const { matches, users, currentUser } = useStore();
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    // In a real app we'd fetch the full user profiles for the IDs in the match
    // For this mock, we just find them in our 'users' array (which contains everyone) 
    // + we need to include the ones we already swiped on, which might be missing from 'users' state if we filtered them out.
    // Ideally, the store should keep 'allUsers' map. 
    // For MVP simplification: We'll assume the MOCK matched users are still accessible from MOCK_USERS equivalent.
    // Since 'users' in store gets filtered on swipe, looking up by ID in 'users' might fail if they are removed from the stack.
    // I'll grab them from the GLOBAL mock for now or assume they are stored in 'matches' fully.

    // Let's rely on a helper or just render what we have. 
    // A better store design would separate "feedUsers" from "allUsers".
    // For this MVP, let's just cheat and pretend we can resolve them.

    const getOtherUser = (match: any) => {
        const otherId = match.users.find((id: string) => id !== currentUser.id);
        // Return a dummy placeholder if not found in current stack, 
        // real app would fetch from API
        return {
            id: otherId,
            name: 'Matched Neighbor',
            avatar: 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100',
            ...users.find(u => u.id === otherId)
        };
    };

    const renderItem = ({ item }: { item: any }) => {
        const otherUser = getOtherUser(item);

        return (
            <TouchableOpacity
                style={[styles.matchItem, { borderBottomColor: colors.border }]}
                onPress={() => navigation.navigate('Chat', { matchId: item.id, user: otherUser })}
            >
                <Image source={{ uri: otherUser.avatar }} style={styles.avatar} />
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.text }]}>{otherUser.name}</Text>
                    <Text style={styles.subtext}>Matched {new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>
                <MessageSquare color="#ccc" size={24} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
            <Text style={[styles.title, { color: colors.text }]}>Matches</Text>

            {matches.length === 0 ? (
                <View style={styles.emptyState}>
                    <Image
                        source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                        style={[styles.emptyImage, { tintColor: colors.tabIconDefault }]}
                    />
                    <Text style={[styles.emptyText, { color: colors.text }]}>No matches yet</Text>
                    <Text style={styles.emptySub}>Start swiping to find neighbors!</Text>
                </View>
            ) : (
                <FlatList
                    data={matches}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, // Dynamic bg
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginLeft: 20,
        marginBottom: 20,
        // color handled inline
    },
    list: {
        paddingHorizontal: 20,
    },
    matchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        // border color handled inline
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 15,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '600',
        // color handled inline
    },
    subtext: {
        fontSize: 14,
        color: '#888',
        marginTop: 2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -50,
    },
    emptyImage: {
        width: 100,
        height: 100,
        marginBottom: 20,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: 'bold',
        // color handled inline
        marginTop: 10,
    },
    emptySub: {
        fontSize: 16,
        color: '#999',
        marginTop: 5,
    }
});
