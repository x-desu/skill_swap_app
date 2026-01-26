import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Skill } from '../types';
import { MapPin, Clock } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.9;
const CARD_HEIGHT = 500;

interface SwipeCardProps {
    user: User;
}

export default function SwipeCard({ user }: SwipeCardProps) {
    const primarySkill = user.skillsOffered[0];

    return (
        <View style={styles.card}>
            <Image source={{ uri: user.avatar }} style={styles.image} resizeMode="cover" />

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.gradient}
            >
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.name}>{user.name}</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{primarySkill.category}</Text>
                        </View>
                    </View>

                    <Text style={styles.bio} numberOfLines={2}>{user.bio}</Text>

                    <View style={styles.row}>
                        <MapPin color="#fff" size={16} />
                        <Text style={styles.infoText}> {user.location}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.skillRow}>
                        <View>
                            <Text style={styles.label}>OFFERS</Text>
                            <Text style={styles.skillTitle}>{primarySkill.title}</Text>
                        </View>
                        <View style={styles.costContainer}>
                            <Clock color="#FFD700" size={16} />
                            <Text style={styles.costText}>{primarySkill.cost} credit/hr</Text>
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        overflow: 'hidden',
        position: 'absolute', // Stacked cards
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
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    name: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
    },
    badge: {
        backgroundColor: '#FF5A5F',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    bio: {
        fontSize: 16,
        color: '#eee',
        marginBottom: 12,
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
        marginLeft: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginVertical: 12,
    },
    skillRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: '#aaa',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    skillTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    costContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    costText: {
        color: '#FFD700',
        fontWeight: 'bold',
        marginLeft: 6,
    },
});
