import React from 'react';
import { Animated, View, Platform } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const skeletonStyle = tva({
  base: 'bg-background-200 overflow-hidden',
  variants: {
    variant: {
      rounded: 'rounded-md',
      sharp: 'rounded-none',
      circular: 'rounded-full',
    },
    speed: {
      1: 'duration-75',
      2: 'duration-100',
      3: 'duration-150',
      4: 'duration-200',
    },
  },
});

const skeletonTextStyle = tva({
  base: 'bg-background-200 rounded-sm',
  variants: {
    gap: {
      1: 'gap-1',
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
    },
  },
});

const Skeleton = React.forwardRef<any, any>(
  ({ className, variant = 'rounded', isLoaded = false, speed = 2, children, ...props }, ref) => {
    const pulseAnim = React.useRef(new Animated.Value(0.5)).current;

    React.useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000 / speed,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000 / speed,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      if (!isLoaded) {
        animation.start();
      } else {
        animation.stop();
      }
      return () => animation.stop();
    }, [isLoaded, speed, pulseAnim]);

    if (isLoaded) return children;

    return (
      <Animated.View
        ref={ref}
        className={skeletonStyle({ variant, speed, class: className })}
        style={{ opacity: pulseAnim }}
        {...props}
      />
    );
  }
);

const SkeletonText = React.forwardRef<any, any>(
  ({ className, _lines = 3, isLoaded = false, speed = 2, gap = 2, children, ...props }, ref) => {
    if (isLoaded) return children;

    return (
      <View ref={ref} className={skeletonTextStyle({ gap, class: className })} {...props}>
        {Array.from({ length: _lines }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            speed={speed}
            className="h-2 w-full"
            style={{ width: i === _lines - 1 ? '70%' : '100%' }}
          />
        ))}
      </View>
    );
  }
);

Skeleton.displayName = 'Skeleton';
SkeletonText.displayName = 'SkeletonText';

export { Skeleton, SkeletonText };
