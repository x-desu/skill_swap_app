import React from 'react';
import { View } from 'react-native';

export function GluestackUIProvider({
    mode = 'light',
    children,
}: {
    mode?: 'light' | 'dark';
    children: React.ReactNode;
}) {
    return <View style={{ flex: 1 }}>{children}</View>;
}
