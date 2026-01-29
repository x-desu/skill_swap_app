import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Image, TouchableOpacity, Dimensions,
    ScrollView, TextInput, Animated, NativeSyntheticEvent, NativeScrollEvent
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Bell, Grid3X3, Search as SearchIcon, MapPin, Check,
    Gift, ArrowLeftRight, Star
} from 'lucide-react-native';
import { useStore } from '../../src/store/useStore';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;
const CARD_HEIGHT = height * 0.48;
const CARD_GAP = 16;
const SNAP_WIDTH = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

// Color Theme
const COLORS = {
    // Primary Rose
    rosePrimary: '#ff1a5c',
    roseLight: '#ff4d7a',
    rose50: 'rgba(255, 26, 92, 0.5)',
    rose30: 'rgba(255, 26, 92, 0.3)',
    rose20: 'rgba(255, 26, 92, 0.2)',
    // Backgrounds
    bgDeep: '#2d0a0a',
    bgDark: '#1a0505',
    bgBase: '#0d0202',
    // Glass
    glass: 'rgba(45, 10, 10, 0.5)',
    glass60: 'rgba(45, 10, 10, 0.6)',
    // Borders
    borderLight: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    // Text
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.7)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    // Status
    success: '#34d399',
    successBg: 'rgba(16, 185, 129, 0.2)',
    warning: '#fbbf24',
    warningBg: 'rgba(245, 158, 11, 0.2)',
};

// Categories for filter pills
const categories = ['All', 'Tech', 'Music', 'Art', 'Language', 'Sports'];

// Mock data for nearby people
const nearbyPeople = [
    {
        id: '1',
        name: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
        distance: '0.8 mi',
        rating: 4.9,
        teach: 'UI Design',
        learn: 'Python',
    },
    {
        id: '2',
        name: 'Marcus Johnson',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800',
        distance: '1.2 mi',
        rating: 4.7,
        teach: 'Guitar',
        learn: 'Photography',
    },
    {
        id: '3',
        name: 'Emily Wong',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=800',
        distance: '2.1 mi',
        rating: 5.0,
        teach: 'French',
        learn: 'Cooking',
    },
    {
        id: '4',
        name: 'David Kim',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
        distance: '1.5 mi',
        rating: 4.8,
        teach: 'Coding',
        learn: 'Dance',
    },
];

// Animated Card Component with 3D rotation
interface AnimatedCardProps {
    person: typeof nearbyPeople[0];
    index: number;
    scrollX: Animated.Value;
}

function AnimatedCard({ person, index, scrollX }: AnimatedCardProps) {
    const inputRange = [
        (index - 1) * SNAP_WIDTH,
        index * SNAP_WIDTH,
        (index + 1) * SNAP_WIDTH,
    ];

    const rotate = scrollX.interpolate({
        inputRange,
        outputRange: ['5deg', '0deg', '-5deg'],
        extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
        inputRange,
        outputRange: [0.92, 1, 0.92],
        extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
        inputRange,
        outputRange: [0.75, 1, 0.75],
        extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
        inputRange,
        outputRange: [8, 0, 8],
        extrapolate: 'clamp',
    });

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    transform: [
                        { rotate },
                        { scale },
                        { translateY },
                    ],
                    opacity,
                }
            ]}
        >
            <View style={styles.personCard}>
                <Image source={{ uri: person.avatar }} style={styles.cardImage} />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
                    style={styles.cardGradient}
                />
                <View style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.cardName}>{person.name}</Text>
                            <View style={styles.locationRow}>
                                <MapPin color={COLORS.rosePrimary} size={14} />
                                <Text style={styles.cardDistance}>{person.distance}</Text>
                            </View>
                        </View>
                        <View style={styles.ratingCircle}>
                            <Text style={styles.ratingNum}>{person.rating}</Text>
                        </View>
                    </View>

                    <View style={styles.skillsContainer}>
                        <View style={styles.skillRow}>
                            <Text style={styles.skillLabel}>Teaches</Text>
                            <View style={styles.teachTag}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.teachText}>{person.teach}</Text>
                            </View>
                        </View>
                        <View style={styles.skillRow}>
                            <Text style={styles.skillLabel}>Wants</Text>
                            <View style={styles.learnTag}>
                                <Text style={styles.learnText}>{person.learn}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.proposeBtn}>
                        <Text style={styles.proposeBtnText}>Propose Swap</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const scrollX = useRef(new Animated.Value(0)).current;
    const { currentUser } = useStore();

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        { useNativeDriver: true }
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Main App Background Gradient */}
            <LinearGradient
                colors={[COLORS.bgDeep, COLORS.bgDark, COLORS.bgBase]}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={{ uri: currentUser?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200' }}
                                style={styles.headerAvatar}
                            />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.appTitle}>SkillSwap</Text>
                            <Text style={styles.appSubtitle}>Exchange & Grow</Text>
                        </View>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Bell color={COLORS.textMuted} size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Grid3X3 color={COLORS.textMuted} size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <BlurView intensity={20} tint="dark" style={styles.searchBarBlur}>
                        <View style={styles.searchBar}>
                            <SearchIcon color={COLORS.textMuted} size={18} />
                            <TextInput
                                placeholder="Search skills or people..."
                                placeholderTextColor={COLORS.textMuted}
                                style={styles.searchInput}
                            />
                        </View>
                    </BlurView>
                    <TouchableOpacity style={styles.nearbyPill}>
                        <MapPin color="#fff" size={14} />
                        <Text style={styles.nearbyText}>Nearby</Text>
                    </TouchableOpacity>
                </View>

                {/* Category Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            onPress={() => setSelectedCategory(cat)}
                            style={[
                                styles.categoryPill,
                                selectedCategory === cat && styles.categoryPillActive
                            ]}
                        >
                            {selectedCategory === cat ? (
                                <LinearGradient
                                    colors={[COLORS.rosePrimary, COLORS.roseLight]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.categoryPillGradient}
                                >
                                    <Text style={styles.categoryTextActive}>{cat}</Text>
                                </LinearGradient>
                            ) : (
                                <Text style={styles.categoryText}>{cat}</Text>
                            )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Quick Action Buttons */}
                <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <View style={styles.actionBtnIcon}>
                            <Gift color={COLORS.rosePrimary} size={20} />
                        </View>
                        <Text style={styles.actionBtnText}>Offer Skill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn}>
                        <View style={styles.actionBtnIcon}>
                            <ArrowLeftRight color={COLORS.rosePrimary} size={20} />
                        </View>
                        <Text style={styles.actionBtnText}>My Swaps</Text>
                    </TouchableOpacity>
                </View>

                {/* People Near You Section */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>People Near You</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {/* 3D Carousel */}
                <Animated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={SNAP_WIDTH}
                    snapToAlignment="start"
                    decelerationRate="fast"
                    contentContainerStyle={styles.carouselContent}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                >
                    {nearbyPeople.map((person, index) => (
                        <AnimatedCard
                            key={person.id}
                            person={person}
                            index={index}
                            scrollX={scrollX}
                        />
                    ))}
                </Animated.ScrollView>

                {/* Featured Skills Section */}
                <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                    <Text style={styles.sectionTitle}>Featured Skills</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredContainer}
                >
                    {['UI Design', 'Guitar', 'Photography', 'Cooking'].map((skill) => (
                        <TouchableOpacity key={skill} style={styles.featuredPill}>
                            <Star color={COLORS.rosePrimary} size={14} fill={COLORS.rosePrimary} />
                            <Text style={styles.featuredText}>{skill}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bgBase,
    },
    scrollView: {
        flex: 1,
    },
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarRing: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: COLORS.rose50,
        padding: 2,
    },
    headerAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    headerText: {},
    appTitle: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '800',
    },
    appSubtitle: {
        color: COLORS.rosePrimary,
        fontSize: 12,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.glass,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        marginBottom: 16,
    },
    searchBarBlur: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        paddingHorizontal: 14,
        gap: 10,
    },
    searchInput: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
        paddingVertical: 12,
    },
    nearbyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 14,
        borderRadius: 12,
        gap: 6,
    },
    nearbyText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: '600',
    },
    // Categories
    categoriesContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    categoryPill: {
        marginRight: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    categoryPillActive: {
        shadowColor: COLORS.rosePrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    categoryPillGradient: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderHover,
    },
    categoryText: {
        color: COLORS.textMuted,
        fontSize: 14,
        fontWeight: '500',
        paddingHorizontal: 18,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    categoryTextActive: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Action Buttons
    actionButtonsRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginBottom: 24,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.glass,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    actionBtnIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: COLORS.rose20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: '700',
    },
    seeAll: {
        color: COLORS.rosePrimary,
        fontSize: 14,
    },
    // Carousel
    carouselContent: {
        paddingLeft: SIDE_PADDING,
        paddingRight: SIDE_PADDING,
    },
    cardContainer: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT + 20,
        marginRight: CARD_GAP,
    },
    // Person Card
    personCard: {
        width: '100%',
        height: CARD_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: COLORS.glass60,
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '55%',
    },
    cardContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    cardName: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: '700',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    cardDistance: {
        color: COLORS.textSecondary,
        fontSize: 13,
    },
    ratingCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingNum: {
        color: COLORS.rosePrimary,
        fontSize: 15,
        fontWeight: '700',
    },
    skillsContainer: {
        gap: 8,
    },
    skillRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    skillLabel: {
        color: COLORS.textMuted,
        fontSize: 13,
        width: 60,
    },
    // Teach Badge
    teachTag: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.rose20,
        borderWidth: 1,
        borderColor: COLORS.rose30,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    teachText: {
        color: COLORS.textPrimary,
        fontSize: 14,
        fontWeight: '600',
    },
    // Learn Badge
    learnTag: {
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: COLORS.borderLight,
    },
    learnText: {
        color: COLORS.textMuted,
        fontSize: 14,
    },
    // Propose Swap Button
    proposeBtn: {
        marginTop: 14,
        backgroundColor: COLORS.rosePrimary,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    proposeBtnText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        fontWeight: '700',
    },
    // Featured
    featuredContainer: {
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    featuredPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.rose20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
        marginRight: 10,
        borderWidth: 1,
        borderColor: COLORS.rose30,
    },
    featuredText: {
        color: COLORS.rosePrimary,
        fontSize: 14,
        fontWeight: '500',
    },
});
