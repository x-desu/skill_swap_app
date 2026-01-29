import React from 'react';
import { View, TextInput, Pressable, ViewProps, TextInputProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';

const inputStyle = tva({
    base: 'border-background-300 flex-row overflow-hidden content-center data-[focus=true]:border-primary-700',
    variants: {
        size: {
            xl: 'h-12',
            lg: 'h-11',
            md: 'h-10',
            sm: 'h-9',
        },
        variant: {
            underlined: 'border-b border-0 rounded-none',
            outline: 'justify-center border rounded',
            rounded: 'justify-center border rounded-full',
        },
    },
});

const inputFieldStyle = tva({
    base: 'flex-1 typography-body-md py-auto px-3 placeholder:text-typography-500 h-full ios:leading-[0px] text-typography-900',
    variants: {
        size: {
            xl: 'text-xl',
            lg: 'text-lg',
            md: 'text-base',
            sm: 'text-sm',
        },
    },
});

const Input = React.forwardRef<React.ElementRef<typeof View>, ViewProps & { className?: string; size?: string; variant?: string }>(
    ({ className, size = 'md', variant = 'outline', ...props }, ref) => {
        return <View ref={ref} className={inputStyle({ size, variant, class: className } as any)} {...props} />;
    }
);

const InputField = React.forwardRef<React.ElementRef<typeof TextInput>, TextInputProps & { className?: string; size?: string }>(
    ({ className, size = 'md', ...props }, ref) => {
        return <TextInput ref={ref} className={inputFieldStyle({ size, class: className } as any)} placeholderTextColor="#999" {...props} />;
    }
);

Input.displayName = 'Input';
InputField.displayName = 'InputField';

export { Input, InputField };
