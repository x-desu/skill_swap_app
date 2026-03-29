import React from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageSquare } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { getProfileBaseColor } from '../../src/utils/colorUtils';

export default function MatchesScreen() {
    const { matches, users, currentUser } = useStore();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();

    const baseColor = getProfileBaseColor(currentUser);
    const seedKey = `tab:matches:${currentUser.id}`;

    const getOtherUser = (match: any) => {
        const otherId = match.users.find((id: string) => id !== currentUser.id);
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
                onPress={() => router.push({
                    pathname: '/chat/[id]',
                    params: { id: item.id }
                })}
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
        <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: 90 }]}>
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
        </ProfileGlowBackground>
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
