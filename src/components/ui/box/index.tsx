import React from 'react';
import { View, ViewProps } from 'react-native';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { withStyleContext, useStyleContext } from '@gluestack-ui/nativewind-utils/withStyleContext';
import { cssInterop } from "nativewind";

const boxStyle = tva({
    base: 'flex-col flex relative z-0 box-border border-0 list-none min-w-0 min-h-0 bg-transparent items-stretch m-0 p-0 text-decoration-none',
});

const Box = React.forwardRef<React.ElementRef<typeof View>, ViewProps & { className?: string }>(
    ({ className, ...props }, ref) => {
        return <View ref={ref} className={boxStyle({ class: className })} {...props} />;
    }
);

Box.displayName = 'Box';
export { Box };
