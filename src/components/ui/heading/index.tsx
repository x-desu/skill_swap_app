import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const headingStyle = tva({
    base: 'text-typography-900 font-heading font-bold font-heading m-0 p-0',
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
        sub: {
            true: 'text-xs',
        },
        italic: {
            true: 'italic',
        },
        highlight: {
            true: 'bg-yellow-500',
        },
        size: {
            '5xl': 'text-6xl',
            '4xl': 'text-5xl',
            '3xl': 'text-4xl',
            '2xl': 'text-3xl',
            xl: 'text-2xl',
            lg: 'text-xl',
            md: 'text-lg',
            sm: 'text-base',
            xs: 'text-sm',
        },
    },
});

const Heading = React.forwardRef<
    React.ElementRef<typeof RNText>,
    TextProps & { className?: string; size?: string; bold?: boolean }
>(({ className, size = 'lg', bold, ...props }, ref) => {
    return (
        <RNText
            className={headingStyle({ size, bold, class: className } as any)}
            {...props}
            ref={ref}
        />
    );
});

Heading.displayName = 'Heading';
export { Heading };
