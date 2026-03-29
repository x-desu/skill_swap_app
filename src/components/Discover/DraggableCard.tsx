import React, { useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet, Text } from 'react-native';
import SwipeCard from '../SwipeCard';
import { UserDocument } from '../../types/user';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;
const CARD_HEIGHT = Math.min(540, width * 1.38);

interface DraggableCardProps {
    user: UserDocument;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
}

export function DraggableCard({ user, onSwipeRight, onSwipeLeft }: DraggableCardProps) {
    const pan = useRef(new Animated.ValueXY()).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false } // Note: opacity and color don't support native driver easily, keeping false
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
                        useNativeDriver: false,
                        friction: 5,
                        tension: 40
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
            style={[styles.cardWrapper, animatedStyle, { zIndex: 1 }]}
            {...panResponder.panHandlers}
        >
            <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
                <Text style={styles.overlayText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.nopeOverlay, { opacity: nopeOpacity }]}>
                <Text style={styles.overlayText}>NOPE</Text>
            </Animated.View>

            <SwipeCard user={user} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    cardWrapper: {
        position: 'absolute',
        width: width * 0.9,
        height: CARD_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    overlay: {
        position: 'absolute',
        top: 40,
        zIndex: 100,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 4,
    },
    likeOverlay: {
        left: 40,
        borderColor: '#4CD964',
        transform: [{ rotate: '-20deg' }]
    },
    nopeOverlay: {
        right: 40,
        borderColor: '#FF5A5F',
        transform: [{ rotate: '20deg' }]
    },
    overlayText: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2
    }
});
