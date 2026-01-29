import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const textStyle = tva({
    base: 'text-typography-700 font-body text-base',
    variants: {
        isTruncated: {
            true: 'web:truncate',
        },
        bold: {
            true: 'font-bold',
        },
        underline: {
            true: 'underline',
        },
        strikeThrough: {
            true: 'line-through',
        },
        size: {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
            xl: 'text-xl',
            '2xl': 'text-2xl',
            '3xl': 'text-3xl',
            '4xl': 'text-4xl',
            '5xl': 'text-5xl',
            '6xl': 'text-6xl',
        },
        sub: {
            true: 'text-xs',
        },
        italic: {
            true: 'italic',
        },
        highlight: {
            true: 'bg-yellow-500',
        },
    },
});

const Text = React.forwardRef<
    React.ElementRef<typeof RNText>,
    TextProps & { className?: string; size?: string; bold?: boolean }
>(({ className, size = 'md', bold, ...props }, ref) => {
    return (
        <RNText
            className={textStyle({ size, bold, class: className } as any)}
            {...props}
            ref={ref}
        />
    );
});

Text.displayName = 'Text';
export { Text };
