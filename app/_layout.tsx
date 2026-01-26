import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../src/constants/Colors';

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

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
