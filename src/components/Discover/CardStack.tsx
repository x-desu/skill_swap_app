import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import SwipeCard from '../SwipeCard';
import { DraggableCard } from './DraggableCard';
import { UserDocument } from '../../types/user';

const { width } = Dimensions.get('window');

interface CardStackProps {
  currentProfile: UserDocument | null;
  nextProfile: UserDocument | null;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  canSwipe: boolean;
  onPaywallRequired: () => void;
}

export function CardStack({ currentProfile, nextProfile, onSwipeRight, onSwipeLeft, canSwipe, onPaywallRequired }: CardStackProps) {
  
  if (!currentProfile) {
    return null; // The parent UI should render the empty state.
  }

  const handleSwipeRight = () => {
    if (!canSwipe) {
      onPaywallRequired();
      return;
    }
    onSwipeRight();
  };

  const handleSwipeLeft = () => {
    if (!canSwipe) {
      onPaywallRequired();
      return;
    }
    onSwipeLeft();
  };

  return (
    <View style={styles.cardsContainer}>
      {/* Background/Next Card */}
      {nextProfile && (
        <View style={[styles.backgroundCardWrapper]}>
          <SwipeCard user={nextProfile as any} /> 
          {/* Note: SwipeCard expects 'User' type (legacy). Cast to any works, but ideally SwipeCard should be typed as UserDocument. */}
        </View>
      )}

      {/* Interactive/Current Card */}
      <DraggableCard
        key={currentProfile.uid}
        user={currentProfile as any}
        onSwipeRight={handleSwipeRight}
        onSwipeLeft={handleSwipeLeft}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  backgroundCardWrapper: {
    position: 'absolute',
    width: width * 0.9,
    height: 500,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    transform: [{ scale: 0.95 }, { translateY: 10 }],
    opacity: 0.8
  }
});
