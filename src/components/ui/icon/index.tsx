import React from 'react';
import { tva } from '@gluestack-ui/nativewind-utils/tva';
import { SvgProps } from 'react-native-svg';

const iconStyle = tva({
    base: 'text-typography-500 fill-none',
    variants: {
        size: {
            '2xs': 'h-3 w-3',
            xs: 'h-3.5 w-3.5',
            sm: 'h-4 w-4',
            md: 'h-[18px] w-[18px]',
            lg: 'h-5 w-5',
            xl: 'h-6 w-6',
        },
    },
});

const Icon = React.forwardRef<
    React.ElementRef<any>,
    SvgProps & {
        className?: string;
        size?: string;
        as?: any;
        color?: string;
    }
>(({ size = 'md', className, as: AsComp, ...props }, ref) => {
    if (AsComp) {
        return <AsComp ref={ref} className={iconStyle({ size, class: className } as any)} {...props} />;
    }
    return null;
});

Icon.displayName = 'Icon';
export { Icon };
