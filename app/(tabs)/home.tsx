import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TextInput, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Search, MapPin, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';
import { useStore } from '../../src/store/useStore';
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { generateMonochromeGradient, getProfileBaseColor } from '../../src/utils/colorUtils';

const STORIES_MAX = 6;

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { currentUser, users, followingIds, followUser, unfollowUser, completeSession } = useStore();
    const [searchQuery, setSearchQuery] = useState('');

    const baseColor = getProfileBaseColor(currentUser);
    const seedKey = `tab:home:${currentUser.id}`;
    const headerGradient = generateMonochromeGradient(baseColor, `${seedKey}:header`, 2);

    const stories = [
        {
            id: 'you',
            name: 'You',
            avatar: currentUser.avatar,
            label: 'You',
            isYou: true,
            chip: 'Add story',
        },
        ...users.slice(0, STORIES_MAX).map((user) => ({
            id: user.id,
            name: user.name.split(' ')[0],
            avatar: user.avatar,
            label: user.skillsOffered[0]?.category ?? 'Neighbor',
            chip: user.skillsOffered[0]?.title,
            isYou: false,
        })),
    ];

    const filteredUsers = searchQuery.trim().length === 0
        ? []
        : users.filter((user) =>
            user.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
        );

    const exploreSkills = [
        { id: 'dance', name: 'Dance', count: '234+', colors: ['#FF9A9E', '#FAD0C4'] as const },
        { id: 'painting', name: 'Painting', count: '189+', colors: ['#A18CD1', '#FBC2EB'] as const },
        { id: 'photo', name: 'Photography', count: '156+', colors: ['#84FAB0', '#8FD3F4'] as const },
        { id: 'coding', name: 'Coding', count: '289+', colors: ['#F5576C', '#F093FB'] as const },
        { id: 'cooking', name: 'Cooking', count: '187+', colors: ['#F6D365', '#FDA085'] as const },
        { id: 'fitness', name: 'Fitness', count: '146+', colors: ['#5EFCE8', '#736EFE'] as const },
        { id: 'writing', name: 'Writing', count: '178+', colors: ['#FBD3E9', '#BB377D'] as const },
        { id: 'singing', name: 'Singing', count: '201+', colors: ['#FDC830', '#F37335'] as const },
    ];

    const trending = [
        {
            id: 't1',
            title: 'Evening Guitar Circle',
            subtitle: '12 new sessions near you',
            accent: '#FF5A5F',
            credits: 1,
        },
        {
            id: 't2',
            title: 'Weekend Coding Sprint',
            subtitle: 'Remote + local options',
            accent: '#736EFE',
            credits: 2,
        },
        {
            id: 't3',
            title: 'Neighborhood Cooking Jam',
            subtitle: 'Share recipes in person',
            accent: '#F6D365',
            credits: 1.5,
        },
    ];

    return (
        <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
            <ScrollView
                style={[styles.container, { backgroundColor: 'transparent' }]}
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: 110 }]}
                showsVerticalScrollIndicator={false}
            >
            <LinearGradient
                colors={headerGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.headerCard}
            >
                <View style={styles.headerRow}>
                    <View>
                        <Text style={styles.appName}>SkillSwap</Text>
                        <Text style={styles.appTagline}>Exchange & Grow</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell color="#fff" size={18} />
                        </TouchableOpacity>
                        <Image source={{ uri: currentUser.avatar }} style={styles.headerAvatar} />
                    </View>
                </View>
                <Text style={styles.headerSubtitle}>Discover neighbors to learn with, teach, and follow.</Text>
            </LinearGradient>

            <View style={styles.section}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.storiesRow}
                >
                    {stories.map((story) => {
                        const isFollowing = !story.isYou && followingIds.includes(story.id);

                        return (
                        <View key={story.id} style={styles.storyItem}>
                            <LinearGradient
                                colors={story.isYou ? ['#FFD700', '#FF5A5F'] : ['#FF5A5F', '#FFB199']}
                                style={styles.storyRing}
                            >
                                <View style={styles.storyInnerWrapper}>
                                    <Image source={{ uri: story.avatar }} style={styles.storyAvatar} />
                                    {story.isYou && (
                                        <View style={styles.storyPlus}>
                                            <Text style={styles.storyPlusText}>+</Text>
                                        </View>
                                    )}
                                </View>
                            </LinearGradient>
                            <Text numberOfLines={1} style={[styles.storyName, { color: colors.text }]}>
                                {story.name}
                            </Text>
                            {story.chip && (
                                <Text numberOfLines={1} style={styles.storyChip}>
                                    {story.chip}
                                </Text>
                            )}
                            {!story.isYou && (
                                <TouchableOpacity
                                    style={[
                                        styles.followButton,
                                        {
                                            backgroundColor: isFollowing ? colors.cardBackground : '#FF5A5F',
                                            borderColor: isFollowing ? colors.border : 'transparent',
                                        },
                                    ]}
                                    onPress={() =>
                                        isFollowing ? unfollowUser(story.id) : followUser(story.id)
                                    }
                                >
                                    <Text
                                        style={[
                                            styles.followButtonText,
                                            { color: isFollowing ? colors.text : '#fff' },
                                        ]}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    );})}
                </ScrollView>
            </View>

            <View style={styles.section}>
                <View
                    style={[
                        styles.searchBar,
                        {
                            backgroundColor: isDark ? '#1E1E1E' : '#f5f5f5',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Search color={colors.tabIconDefault} size={18} />
                    <TextInput
                        placeholder="Search by username"
                        placeholderTextColor={isDark ? '#999' : '#888'}
                        style={[styles.searchInput, { color: colors.text }]}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
                <View style={styles.chipRow}>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        ]}
                        onPress={() => router.push('/(tabs)/discover')}
                    >
                        <MapPin color="#FF5A5F" size={16} />
                        <Text style={[styles.chipText, { color: colors.text }]}>Discover nearby</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.chip,
                            { backgroundColor: colors.cardBackground, borderColor: colors.border },
                        ]}
                    >
                        <UserPlus color="#4CD964" size={16} />
                        <Text style={[styles.chipText, { color: colors.text }]}>Suggested follows</Text>
                    </TouchableOpacity>
                </View>
                {searchQuery.trim().length > 0 && (
                    <View style={styles.searchResults}>
                        {filteredUsers.length === 0 ? (
                            <Text style={[styles.searchEmptyText, { color: colors.text }]}>No users found</Text>
                        ) : (
                            filteredUsers.map((user) => {
                                const isFollowing = followingIds.includes(user.id);
                                const primarySkill = user.skillsOffered[0];

                                return (
                                    <View key={user.id} style={styles.searchResultRow}>
                                        <View>
                                            <Text style={[styles.searchResultName, { color: colors.text }]}>
                                                {user.name}
                                            </Text>
                                            <Text style={styles.searchResultMeta}>
                                                {primarySkill ? primarySkill.title : 'Neighbor'}
                                            </Text>
                                        </View>
                                        <View style={styles.searchActions}>
                                            <TouchableOpacity
                                                style={[
                                                    styles.searchFollowButton,
                                                    {
                                                        backgroundColor: isFollowing ? colors.cardBackground : '#FF5A5F',
                                                        borderColor: isFollowing ? colors.border : 'transparent',
                                                    },
                                                ]}
                                                onPress={() =>
                                                    isFollowing ? unfollowUser(user.id) : followUser(user.id)
                                                }
                                            >
                                                <Text
                                                    style={[
                                                        styles.searchFollowButtonText,
                                                        { color: isFollowing ? colors.text : '#fff' },
                                                    ]}
                                                >
                                                    {isFollowing ? 'Following' : 'Follow'}
                                                </Text>
                                            </TouchableOpacity>
                                            {primarySkill && (
                                                <TouchableOpacity
                                                    style={styles.searchRequestButton}
                                                    onPress={() =>
                                                        completeSession(primarySkill.title, primarySkill.cost)
                                                    }
                                                >
                                                    <Text style={styles.searchRequestButtonText}>Request</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Explore Skills</Text>
                    <Text style={styles.sectionSubtitle}>Discover your next passion</Text>
                </View>
                <View style={styles.skillsGrid}>
                    {exploreSkills.map((skill) => (
                        <TouchableOpacity key={skill.id} style={styles.skillItem}>
                            <LinearGradient colors={skill.colors} style={styles.skillCircleOuter}>
                                <View
                                    style={[
                                        styles.skillCircleInner,
                                        { backgroundColor: colors.background },
                                    ]}
                                >
                                    <Text style={styles.skillCount}>{skill.count}</Text>
                                </View>
                            </LinearGradient>
                            <Text style={[styles.skillLabel, { color: colors.text }]}>{skill.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.trendingTitle, { color: colors.text }]}>Trending Now</Text>
                <Text style={styles.sectionSubtitle}>Hot skills this week</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.trendingRow}
                >
                    {trending.map((item) => (
                        <View
                            key={item.id}
                            style={[
                                styles.trendingCard,
                                { backgroundColor: item.accent },
                            ]}
                        >
                            <Text style={styles.trendingName}>
                                {item.title}
                            </Text>
                            <Text style={styles.trendingMeta}>{item.subtitle}</Text>
                            <TouchableOpacity
                                style={styles.trendingButton}
                                onPress={() => completeSession(item.title, item.credits)}
                            >
                                <Text style={styles.trendingButtonText}>Request Session</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </ScrollView>
            </View>
            </ScrollView>
        </ProfileGlowBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 20,
    },
    headerCard: {
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingVertical: 18,
        marginBottom: 20,
        flexDirection: 'column',
        gap: 8,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    appName: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
    },
    appTagline: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    storiesRow: {
        paddingRight: 4,
    },
    storyItem: {
        width: 80,
        marginRight: 12,
        alignItems: 'center',
    },
    storyRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    storyInnerWrapper: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyAvatar: {
        width: 60,
        height: 60,
    },
    storyPlus: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FF5A5F',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    storyPlusText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    storyName: {
        fontSize: 12,
        fontWeight: '600',
    },
    storyChip: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
        textAlign: 'center',
    },
    followButton: {
        marginTop: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    followButtonText: {
        fontSize: 11,
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
    },
    chipRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        gap: 6,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    searchResults: {
        marginTop: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#eee',
        paddingVertical: 6,
    },
    searchResultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    searchResultName: {
        fontSize: 14,
        fontWeight: '600',
    },
    searchResultMeta: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    searchActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchFollowButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
    },
    searchFollowButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    searchRequestButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#333',
    },
    searchRequestButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    searchEmptyText: {
        fontSize: 12,
        color: '#888',
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    sectionHeader: {
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
    skillsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    skillItem: {
        width: '22%',
        alignItems: 'center',
        marginBottom: 18,
    },
    skillCircleOuter: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 6,
    },
    skillCircleInner: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skillCount: {
        color: '#333',
        fontSize: 13,
        fontWeight: '700',
    },
    skillLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    trendingTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    trendingRow: {
        marginTop: 12,
        paddingRight: 8,
    },
    trendingCard: {
        width: 220,
        borderRadius: 20,
        padding: 14,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    trendingAccent: {
        height: 80,
        borderRadius: 16,
        marginBottom: 10,
    },
    trendingName: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 4,
    },
    trendingMeta: {
        fontSize: 12,
        color: '#888',
        marginBottom: 10,
    },
    trendingButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: '#FF5A5F',
    },
    trendingButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
});
