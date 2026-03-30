import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star } from 'lucide-react-native';
import { UserDocument } from '../types/user';
import { generateGradient, getProfileBaseColor } from '../utils/colorUtils';

const { width } = Dimensions.get('window');

const COLORS = {
    rosePrimary: '#ff1a5c',
    bgBase: '#0d0202',
};

interface SwipeCardProps {
    user: UserDocument;
}

function SwipeCard({ user }: SwipeCardProps) {
    const cardWidth = width * 0.9;
    const cardHeight = Math.min(540, width * 1.38);
    
    // Memoize expensive calculations
    const accent = useMemo(() => getProfileBaseColor({
        id: user.uid,
        avatar: user.photoURL ?? undefined,
    }), [user.uid, user.photoURL]);
    
    const gradientColors = useMemo(() => generateGradient(accent, 3), [accent]);
    
    const avatarUri = useMemo(() =>
        user.photoURL || `https://api.dicebear.com/9.x/thumbs/png?seed=${user.uid}&backgroundColor=ff1a5c`,
        [user.photoURL, user.uid]
    );
    
    const locationLabel = useMemo(() => 
        [user.location?.city, user.location?.country].filter(Boolean).join(', ') || 'Nearby',
        [user.location?.city, user.location?.country]
    );
    
    const teaches = user.teachSkills?.filter(Boolean) ?? [];
    const wants = user.wantSkills?.filter(Boolean) ?? [];
    const ratingLabel = user.rating > 0 ? user.rating.toFixed(1) : 'New';

    return (
        <View style={[styles.card, { width: cardWidth, height: cardHeight, borderColor: `${accent}33` }]}>
            <Image source={{ uri: avatarUri }} style={styles.image} resizeMode="cover" />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                style={styles.gradient}
                locations={[0, 0.4, 0.7, 1]}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name} numberOfLines={1}>{user.displayName}</Text>
                        <LinearGradient 
                            colors={gradientColors}
                            style={styles.badge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Star color="#fff" size={12} fill="#fff" />
                            <Text style={styles.badgeText}>{ratingLabel}</Text>
                        </LinearGradient>
                    </View>

                    <Text style={styles.bio} numberOfLines={2}>
                        {user.bio || 'Ready to trade skills and start something new.'}
                    </Text>

                    <View style={styles.row}>
                        <MapPin color={COLORS.rosePrimary} size={14} />
                        <Text style={styles.infoText}>{locationLabel}</Text>
                    </View>

                    <View style={[styles.divider, { backgroundColor: `${accent}44` }]} />

                    <View style={styles.skillsSection}>
                        <View style={styles.skillBlock}>
                            <Text style={[styles.label, { color: COLORS.rosePrimary }]}>TEACHING</Text>
                            <Text style={styles.skillTitle} numberOfLines={1}>
                                {teaches[0] || 'Open to teach'}
                            </Text>
                        </View>

                        <View style={styles.skillBlock}>
                            <Text style={styles.label}>LEARNING</Text>
                            <View style={styles.wantPill}>
                                <Text style={styles.wantText} numberOfLines={1}>
                                    {wants[0] || 'Open to learn'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

export default memo(SwipeCard);

const styles = StyleSheet.create({
    card: {
        borderRadius: 24,
        backgroundColor: COLORS.bgBase,
        overflow: 'hidden',
        position: 'absolute',
        borderWidth: 1.5,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    gradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70%',
        justifyContent: 'flex-end',
        padding: 24,
    },
    content: {
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        flex: 1,
        letterSpacing: -0.5,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 13,
    },
    bio: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginBottom: 16,
        lineHeight: 20,
        fontWeight: '500',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        marginLeft: 6,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 16,
        opacity: 0.6,
    },
    skillsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    skillBlock: {
        flex: 1,
    },
    label: {
        fontSize: 11,
        fontWeight: '900',
        marginBottom: 6,
        letterSpacing: 1.2,
        opacity: 0.9,
    },
    skillTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
    },
    wantPill: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    wantText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
