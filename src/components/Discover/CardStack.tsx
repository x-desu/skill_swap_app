import React, { memo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import SwipeCard from '../SwipeCard';
import { UserDocument } from '../../types/user';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = Math.min(540, width * 1.38);
const SWIPE_THRESHOLD = width * 0.3;

interface CardStackProps {
  currentProfile: UserDocument | null;
  nextProfile: UserDocument | null;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

// ── DraggableCard ─────────────────────────────────────────────────────────────
function DraggableCard({
  user,
  onSwipeRight,
  onSwipeLeft,
}: {
  user: UserDocument;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}) {
  // Use refs so panResponder always calls the latest handlers without rebuilding
  const onSwipeRightRef = useRef(onSwipeRight);
  const onSwipeLeftRef = useRef(onSwipeLeft);
  onSwipeRightRef.current = onSwipeRight;
  onSwipeLeftRef.current = onSwipeLeft;

  const pan = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  // panResponder is created once — refs ensure latest callbacks are always used
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Animated.event with useNativeDriver drives the card transform on the UI thread
      onPanResponderMove: (evt, gestureState) => {
        // Update card position
        pan.x.setValue(gestureState.dx);
        pan.y.setValue(gestureState.dy);
        // Defer overlay updates to next frame — keeps touch handling non-blocking
        requestAnimationFrame(() => {
          if (gestureState.dx > 0) {
            likeOpacity.setValue(Math.min(gestureState.dx / (width / 4), 1));
            nopeOpacity.setValue(0);
          } else {
            nopeOpacity.setValue(Math.min(-gestureState.dx / (width / 4), 1));
            likeOpacity.setValue(0);
          }
        });
      },
      onPanResponderRelease: (_e, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          Animated.spring(pan, {
            toValue: { x: width + 200, y: gestureState.dy },
            useNativeDriver: false,
            friction: 5,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            likeOpacity.setValue(0);
            onSwipeRightRef.current();
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.spring(pan, {
            toValue: { x: -width - 200, y: gestureState.dy },
            useNativeDriver: false,
            friction: 5,
          }).start(() => {
            pan.setValue({ x: 0, y: 0 });
            nopeOpacity.setValue(0);
            onSwipeLeftRef.current();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            friction: 5,
            tension: 40,
          }).start();
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        }
      },
    })
  ).current;

  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-12deg', '0deg', '12deg'],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* LIKE label */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlayLabel, styles.likeLabel, { opacity: likeOpacity }]}
      >
        <Text style={styles.likeText}>LIKE</Text>
      </Animated.View>

      {/* NOPE label */}
      <Animated.View
        pointerEvents="none"
        style={[styles.overlayLabel, styles.nopeLabel, { opacity: nopeOpacity }]}
      >
        <Text style={styles.nopeText}>NOPE</Text>
      </Animated.View>

      <SwipeCard user={user} />
    </Animated.View>
  );
}

const MemoizedDraggableCard = memo(DraggableCard);

// ── CardStack ─────────────────────────────────────────────────────────────────
function CardStack({ currentProfile, nextProfile, onSwipeRight, onSwipeLeft }: CardStackProps) {
  if (!currentProfile) return null;

  return (
    <View style={styles.cardsContainer}>
      {/* Background / next card — rendered behind, static */}
      {nextProfile && (
        <View style={styles.backgroundCardWrapper}>
          <SwipeCard user={nextProfile} />
        </View>
      )}

      <MemoizedDraggableCard
        key={currentProfile.uid}
        user={currentProfile}
        onSwipeRight={onSwipeRight}
        onSwipeLeft={onSwipeLeft}
      />
    </View>
  );
}

export { CardStack };
export default memo(CardStack);

const styles = StyleSheet.create({
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundCardWrapper: {
    position: 'absolute',
    width: width * 0.9,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    transform: [{ scale: 0.95 }, { translateY: 10 }],
    opacity: 0.75,
  },
  cardWrapper: {
    position: 'absolute',
    width: width * 0.9,
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  overlayLabel: {
    position: 'absolute',
    top: 50,
    zIndex: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeLabel: {
    left: 24,
    borderColor: '#4CD964',
    transform: [{ rotate: '-20deg' }],
  },
  nopeLabel: {
    right: 24,
    borderColor: '#FF5A5F',
    transform: [{ rotate: '20deg' }],
  },
  likeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#4CD964',
    letterSpacing: 2,
  },
  nopeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF5A5F',
    letterSpacing: 2,
  },
});
