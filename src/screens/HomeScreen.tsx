import React, { useState } from 'react';
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    TextInput,
    StyleSheet,
    Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Bell,
    Grid3X3,
    Search,
    MapPin,
    Plus,
    ArrowLeftRight,
    Code,
    Music,
    Palette,
    Check
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Mock data for people near you
const nearbyPeople = [
    {
        id: '1',
        name: 'Sarah Chen',
        avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
        distance: '0.8 mi',
        rating: 4.9,
        teach: 'UI Design',
        learn: 'Python',
    },
    {
        id: '2',
        name: 'Marcus Johnson',
        avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
        distance: '1.2 mi',
        rating: 4.7,
        teach: 'Guitar',
        learn: 'Photography',
    },
    {
        id: '3',
        name: 'Emily Wong',
        avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
        distance: '2.1 mi',
        rating: 5.0,
        teach: 'French',
        learn: 'Cooking',
    },
];

const categories = [
    { id: 'all', label: 'All', icon: Grid3X3 },
    { id: 'tech', label: 'Tech', icon: Code },
    { id: 'music', label: 'Music', icon: Music },
    { id: 'art', label: 'Art', icon: Palette },
];

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const [selectedCategory, setSelectedCategory] = useState('all');

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Gradient Background */}
            <LinearGradient
                colors={['#1a0a10', '#0d0508', '#000']}
                style={StyleSheet.absoluteFillObject}
            />

            <ScrollView
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={styles.avatarRing}>
                            <Image
                                source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
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
                            <Bell color="#888" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconButton}>
                            <Grid3X3 color="#888" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBar}>
                        <Search color="#666" size={18} style={{ marginRight: 10 }} />
                        <TextInput
                            placeholder="Search skills to learn or..."
                            placeholderTextColor="#666"
                            style={styles.searchInput}
                        />
                        <TouchableOpacity style={styles.nearbyPill}>
                            <MapPin color="#FF5A5F" size={14} />
                            <Text style={styles.nearbyText}>Nearby</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category Pills */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScroll}
                >
                    {categories.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        const IconComponent = cat.icon;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryPill,
                                    isSelected && styles.categoryPillActive
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <IconComponent
                                    size={16}
                                    color={isSelected ? '#fff' : '#888'}
                                />
                                <Text style={[
                                    styles.categoryText,
                                    isSelected && styles.categoryTextActive
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButton}>
                        <Plus color="#FF5A5F" size={18} />
                        <Text style={styles.actionText}>Offer Skill</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                        <ArrowLeftRight color="#FF5A5F" size={18} />
                        <Text style={styles.actionText}>My Swaps</Text>
                    </TouchableOpacity>
                </View>

                {/* People Near You */}
                <Text style={styles.sectionTitle}>People Near You</Text>

                {/* User Cards */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.cardsScroll}
                >
                    {nearbyPeople.map((person) => (
                        <View key={person.id} style={styles.userCard}>
                            {/* Glassmorphic background */}
                            <BlurView intensity={20} tint="dark" style={styles.cardBlur}>
                                <View style={styles.cardContent}>
                                    {/* Header Row */}
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardAvatarRing}>
                                            <Image
                                                source={{ uri: person.avatar }}
                                                style={styles.cardAvatar}
                                            />
                                        </View>
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.cardName}>{person.name}</Text>
                                            <View style={styles.cardMeta}>
                                                <MapPin color="#888" size={12} />
                                                <Text style={styles.cardDistance}>{person.distance}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.ratingBadge}>
                                            <Text style={styles.ratingText}>{person.rating}</Text>
                                        </View>
                                    </View>

                                    {/* Teach Section */}
                                    <View style={styles.skillRow}>
                                        <Text style={styles.skillLabel}>Teach</Text>
                                        <View style={styles.teachTag}>
                                            <Check color="#fff" size={14} />
                                            <Text style={styles.teachText}>{person.teach}</Text>
                                        </View>
                                    </View>

                                    {/* Learn Section */}
                                    <View style={styles.skillRow}>
                                        <Text style={styles.skillLabel}>Learn</Text>
                                        <View style={styles.learnTag}>
                                            <Text style={styles.learnText}>{person.learn}</Text>
                                        </View>
                                    </View>

                                    {/* Propose Swap Button */}
                                    <TouchableOpacity style={styles.proposeButton}>
                                        <Text style={styles.proposeText}>Propose Swap</Text>
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        </View>
                    ))}
                </ScrollView>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
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
    },
    avatarRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: '#8B1538',
        padding: 2,
    },
    headerAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    headerText: {
        marginLeft: 12,
    },
    appTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    appSubtitle: {
        color: '#FF5A5F',
        fontSize: 12,
        marginTop: 2,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 10,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginTop: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        paddingLeft: 16,
        paddingRight: 6,
        height: 50,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
    },
    nearbyPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        gap: 4,
    },
    nearbyText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    categoryScroll: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
    },
    categoryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        gap: 8,
        marginRight: 12,
    },
    categoryPillActive: {
        backgroundColor: '#FF5A5F',
        borderColor: '#FF5A5F',
    },
    categoryText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    categoryTextActive: {
        color: '#fff',
    },
    actionRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        gap: 8,
    },
    actionText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        paddingHorizontal: 20,
        marginTop: 28,
        marginBottom: 16,
    },
    cardsScroll: {
        paddingHorizontal: 20,
    },
    userCard: {
        width: width * 0.85,
        marginRight: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(139, 21, 56, 0.4)',
    },
    cardBlur: {
        overflow: 'hidden',
    },
    cardContent: {
        padding: 20,
        backgroundColor: 'rgba(30, 15, 20, 0.85)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardAvatarRing: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#8B1538',
        padding: 2,
    },
    cardAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: 26,
    },
    cardInfo: {
        flex: 1,
        marginLeft: 12,
    },
    cardName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    cardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        gap: 4,
    },
    cardDistance: {
        color: '#888',
        fontSize: 12,
    },
    ratingBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 90, 95, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ratingText: {
        color: '#FF5A5F',
        fontSize: 14,
        fontWeight: '600',
    },
    skillRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    skillLabel: {
        color: '#666',
        fontSize: 13,
        width: 50,
    },
    teachTag: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8B1538',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    teachText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
    },
    learnTag: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    learnText: {
        color: '#888',
        fontSize: 14,
    },
    proposeButton: {
        backgroundColor: '#FF5A5F',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
    },
    proposeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
