import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/constants/Colors';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function RootLayoutNav() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.headerBackground,
                },
                headerTintColor: colors.text,
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                contentStyle: {
                    backgroundColor: colors.background,
                },
            }}
        >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerShown: true }} />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutNav />
        </ThemeProvider>
    );
}
