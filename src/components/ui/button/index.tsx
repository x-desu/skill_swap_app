import React from 'react';
import { Pressable, Text, PressableProps, TextProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const buttonStyle = tva({
    base: 'flex-row items-center justify-center rounded-sm',
    variants: {
        action: {
            primary: 'bg-primary-500 hover:bg-primary-600',
            secondary: 'bg-secondary-500 hover:bg-secondary-600',
            positive: 'bg-success-500 hover:bg-success-600',
            negative: 'bg-error-500 hover:bg-error-600',
            default: 'bg-transparent hover:bg-background-50',
        },
        variant: {
            solid: '',
            outline: 'border border-primary-500 bg-transparent hover:bg-background-50',
            link: 'bg-transparent',
        },
        size: {
            xs: 'h-8 px-2',
            sm: 'h-9 px-3',
            md: 'h-10 px-4',
            lg: 'h-11 px-5',
            xl: 'h-12 px-6',
        },
    },
});

const buttonTextStyle = tva({
    base: 'text-typography-0 font-semibold',
    variants: {
        size: {
            xs: 'text-xs',
            sm: 'text-sm',
            md: 'text-base',
            lg: 'text-lg',
            xl: 'text-xl',
        },
    },
});

const Button = React.forwardRef<
    React.ElementRef<typeof Pressable>,
    PressableProps & { className?: string; action?: string; variant?: string; size?: string }
>(({ className, action = 'primary', variant = 'solid', size = 'md', ...props }, ref) => {
    return (
        <Pressable
            ref={ref}
            className={buttonStyle({ action, variant, size, class: className } as any)}
            {...props}
        />
    );
});

const ButtonText = React.forwardRef<
    React.ElementRef<typeof Text>,
    TextProps & { className?: string; size?: string }
>(({ className, size, ...props }, ref) => {
    return (
        <Text
            ref={ref}
            className={buttonTextStyle({ size, class: className } as any)}
            {...props}
        />
    );
});

Button.displayName = 'Button';
ButtonText.displayName = 'ButtonText';

export { Button, ButtonText };
