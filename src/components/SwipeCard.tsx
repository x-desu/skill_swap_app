import React, { memo, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star } from 'lucide-react-native';
import { UserDocument } from '../types/user';
import { generateGradient, getProfileBaseColor } from '../utils/colorUtils';

const { width } = Dimensions.get('window');

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
        <View style={[styles.card, { width: cardWidth, height: cardHeight }]}>
            <Image source={{ uri: avatarUri }} style={styles.image} resizeMode="cover" />

            <LinearGradient
                colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.95)']}
                style={styles.gradient}
                start={{ x: 0.2, y: 0.15 }}
                end={{ x: 0.7, y: 1 }}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{user.displayName}</Text>
                        <LinearGradient 
                            colors={gradientColors}
                            style={styles.badge}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.badgeText}>{ratingLabel}</Text>
                            <Star color="#fff" size={12} fill="#fff" />
                        </LinearGradient>
                    </View>

                    <Text style={styles.bio} numberOfLines={3}>
                        {user.bio || 'Ready to trade skills and start something new.'}
                    </Text>

                    <View style={styles.row}>
                        <MapPin color="#fff" size={16} />
                        <Text style={styles.infoText}>{locationLabel}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.skillBlock}>
                        <Text style={styles.label}>OFFERS</Text>
                        <Text style={styles.skillTitle}>{teaches[0] || 'Open to teach'}</Text>
                        {teaches[1] ? <Text style={styles.skillMeta}>+ {teaches[1]}</Text> : null}
                    </View>

                    <View style={styles.skillBlockSecondary}>
                        <Text style={styles.label}>LOOKING FOR</Text>
                        <View style={styles.wantPill}>
                            <Text style={styles.wantText}>{wants[0] || 'Open to learn'}</Text>
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
        borderRadius: 20,
        backgroundColor: '#120304',
        overflow: 'hidden',
        position: 'absolute',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
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
        height: '50%',
        justifyContent: 'flex-end',
        padding: 20,
    },
    content: {
        paddingBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    name: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        flex: 1,
        marginRight: 12,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginLeft: 8,
        minWidth: 72,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
    },
    bio: {
        fontSize: 16,
        color: '#eee',
        marginBottom: 14,
        lineHeight: 22,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    infoText: {
        color: '#ddd',
        fontSize: 14,
        marginLeft: 6,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 12,
    },
    skillBlock: {
        marginBottom: 14,
    },
    label: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
        letterSpacing: 1,
    },
    skillTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    skillMeta: {
        color: '#bbb',
        fontSize: 13,
        marginTop: 6,
    },
    skillBlockSecondary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    wantPill: {
        backgroundColor: 'rgba(255,255,255,0.12)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        maxWidth: '72%',
    },
    wantText: {
        color: '#fff',
        fontWeight: '700',
    },
});
