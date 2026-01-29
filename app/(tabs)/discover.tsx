import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Animated, PanResponder } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Heart } from 'lucide-react-native';
import SwipeCard from '../../src/components/SwipeCard';
import { useStore } from '../../src/store/useStore';
import { useTheme } from '../../src/context/ThemeContext';
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { getProfileBaseColor } from '../../src/utils/colorUtils';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

export default function DiscoverScreen() {
    const insets = useSafeAreaInsets();
    const { users, swipeRight, swipeLeft, currentUser } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const { colors, isDark } = useTheme();

    if (currentIndex >= users.length) {
        const baseColor = getProfileBaseColor(currentUser);
        const seedKey = `tab:discover:${currentUser.id}`;
        return (
            <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
                <View style={[styles.container, styles.center]}>
                    <Text style={[styles.noMoreText, { color: colors.text }]}>No more neighbors nearby!</Text>
                    <Text style={[styles.subText, { color: isDark ? '#aaa' : '#ccc' }]}>Check back later for new skills.</Text>
                </View>
            </ProfileGlowBackground>
        );
    }

    const currentProfile = users[currentIndex];
    const baseColor = getProfileBaseColor(currentProfile);
    const seedKey = `tab:discover:${currentProfile.id}`;

    const nextProfile = users[currentIndex + 1];

    const handleSwipeRight = () => {
        swipeRight(currentProfile.id);
        setCurrentIndex(prev => prev + 1);
    };

    const handleSwipeLeft = () => {
        swipeLeft(currentProfile.id);
        setCurrentIndex(prev => prev + 1);
    };

    return (
        <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
            <View style={[styles.content, { paddingTop: insets.top, paddingBottom: 90 }] }>
                <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.15)', borderBottomColor: 'rgba(255,255,255,0.12)' }] }>
                    <Text style={styles.headerTitle}>Discover</Text>
                </View>

                <View style={styles.cardsContainer}>
                    {nextProfile && (
                        <View style={[styles.cardWrapper, { zIndex: 0, transform: [{ scale: 0.95 }] }] }>
                            <SwipeCard user={nextProfile} />
                        </View>
                    )}

                    <DraggableCard
                        key={currentProfile.id}
                        user={currentProfile}
                        onSwipeRight={handleSwipeRight}
                        onSwipeLeft={handleSwipeLeft}
                    />
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity style={[styles.button, styles.passButton, { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.18)' }] } onPress={handleSwipeLeft}>
                        <X color="#fff" size={30} />
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.likeButton, { backgroundColor: 'rgba(0,0,0,0.25)', borderColor: 'rgba(255,255,255,0.18)' }] } onPress={handleSwipeRight}>
                        <Heart color="#fff" size={30} fill="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </ProfileGlowBackground>
    );
}

interface DraggableCardProps {
    user: any;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
}

function DraggableCard({ user, onSwipeRight, onSwipeLeft }: DraggableCardProps) {
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (e, gestureState) => {
                if (gestureState.dx > SWIPE_THRESHOLD) {
                    Animated.spring(pan, {
                        toValue: { x: width + 100, y: gestureState.dy },
                        useNativeDriver: false
                    }).start(onSwipeRight);
                } else if (gestureState.dx < -SWIPE_THRESHOLD) {
                    Animated.spring(pan, {
                        toValue: { x: -width - 100, y: gestureState.dy },
                        useNativeDriver: false
                    }).start(onSwipeLeft);
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    const rotate = pan.x.interpolate({
        inputRange: [-width / 2, 0, width / 2],
        outputRange: ['-10deg', '0deg', '10deg'],
        extrapolate: 'clamp'
    });

    const likeOpacity = pan.x.interpolate({
        inputRange: [0, width / 4],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    const nopeOpacity = pan.x.interpolate({
        inputRange: [-width / 4, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp'
    });

    const animatedStyle = {
        transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: rotate }
        ]
    };

    return (
        <Animated.View
            style={[styles.cardWrapper, animatedStyle, { zIndex: 1 }] }
            {...panResponder.panHandlers}
        >
            <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }] }>
                <Text style={styles.overlayText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }] }>
                <Text style={styles.overlayText}>NOPE</Text>
            </Animated.View>

            <SwipeCard user={user} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1 },
    center: { justifyContent: 'center', alignItems: 'center' },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff'
    },
    cardsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardWrapper: {
        position: 'absolute',
        width: width * 0.9,
        height: 500,
        alignItems: 'center',
        justifyContent: 'center'
    },
    footer: {
        height: 100,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center'
    },
    button: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 3
    },
    passButton: {
        borderWidth: 1
    },
    likeButton: {
        borderWidth: 1
    },
    noMoreText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subText: {
        fontSize: 16
    },
    overlay: {
        position: 'absolute',
        top: 40,
        zIndex: 100,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 4
    },
    likeOverlay: {
        left: 40,
        borderColor: '#4CD964',
        transform: [{ rotate: '-30deg' }]
    },
    nopeOverlay: {
        right: 40,
        borderColor: '#FF5A5F',
        transform: [{ rotate: '30deg' }]
    },
    overlayText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff'
    }
});
