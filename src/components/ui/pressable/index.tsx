import React from 'react';
import { Pressable as RNPressable, PressableProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { withStyleContext } from '@gluestack-ui/nativewind-utils/withStyleContext';

const pressableStyle = tva({
    base: 'data-[focus-visible=true]:outline-none data-[focus-visible=true]:ring-indicator-info data-[focus-visible=true]:ring-2 data-[disabled=true]:opacity-40',
});

const Pressable = React.forwardRef<
    React.ElementRef<typeof RNPressable>,
    PressableProps & { className?: string }
>(({ className, ...props }, ref) => {
    return (
        <RNPressable
            ref={ref}
            className={pressableStyle({ class: className })}
            {...props}
        />
    );
});

Pressable.displayName = 'Pressable';
export { Pressable };
