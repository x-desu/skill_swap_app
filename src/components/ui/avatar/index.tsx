import React from 'react';
import { View, Image, Text, ViewProps, ImageProps, TextProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const avatarStyle = tva({
    base: 'rounded-full justify-center items-center relative bg-primary-600',
    variants: {
        size: {
            xs: 'w-6 h-6',
            sm: 'w-8 h-8',
            md: 'w-10 h-10',
            lg: 'w-12 h-12',
            xl: 'w-16 h-16',
            '2xl': 'w-24 h-24',
        },
    },
});

const avatarFallbackTextStyle = tva({
    base: 'text-typography-0 font-semibold overflow-hidden text-transform:uppercase web:select-none text-white',
    variants: {
        size: {
            xs: 'text-2xs',
            sm: 'text-xs',
            md: 'text-base',
            lg: 'text-xl',
            xl: 'text-3xl',
            '2xl': 'text-5xl',
        },
    },
});

const avatarImageStyle = tva({
    base: 'h-full w-full rounded-full absolute',
});

const Avatar = React.forwardRef<React.ElementRef<typeof View>, ViewProps & { className?: string; size?: string }>(
    ({ className, size = 'md', ...props }, ref) => {
        return <View ref={ref} className={avatarStyle({ size, class: className } as any)} {...props} />;
    }
);

const AvatarFallbackText = React.forwardRef<React.ElementRef<typeof Text>, TextProps & { className?: string; size?: string }>(
    ({ className, size = 'md', ...props }, ref) => {
        return <Text ref={ref} className={avatarFallbackTextStyle({ size, class: className } as any)} {...props} />;
    }
);

const AvatarImage = React.forwardRef<React.ElementRef<typeof Image>, ImageProps & { className?: string }>(
    ({ className, ...props }, ref) => {
        return <Image ref={ref} className={avatarImageStyle({ class: className } as any)} {...props} />;
    }
);

Avatar.displayName = 'Avatar';
AvatarFallbackText.displayName = 'AvatarFallbackText';
AvatarImage.displayName = 'AvatarImage';

export { Avatar, AvatarFallbackText, AvatarImage };
