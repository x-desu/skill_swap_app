import React from 'react';
import { View, ViewProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const hstackStyle = tva({
    base: 'flex-row gap-0',
    variants: {
        space: {
            xs: 'gap-1',
            sm: 'gap-2',
            md: 'gap-3',
            lg: 'gap-4',
            xl: 'gap-5',
            '2xl': 'gap-6',
            '3xl': 'gap-7',
            '4xl': 'gap-8',
        },
        reversed: {
            true: 'flex-row-reverse',
        },
    },
});

export const HStack = React.forwardRef<
    React.ElementRef<typeof View>,
    ViewProps & { className?: string; space?: string; reversed?: boolean }
>(({ className, space, reversed, ...props }, ref) => {
    return (
        <View
            className={hstackStyle({ space, reversed, class: className } as any)}
            {...props}
            ref={ref}
        />
    );
});

HStack.displayName = 'HStack';
