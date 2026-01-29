import React from 'react';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Home, Compass, MessageSquare, Wallet, User as UserIcon } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';

export default function TabLayout() {
    const { colors, isDark } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    height: 85,
                    paddingBottom: 25,
                    position: 'absolute',
                    elevation: 0, // for Android
                },
                tabBarBackground: () => (
                    <BlurView
                        intensity={80}
                        style={{ flex: 1 }}
                        tint={isDark ? 'dark' : 'light'}
                    />
                ),
                tabBarActiveTintColor: colors.tabIconSelected,
                tabBarInactiveTintColor: colors.tabIconDefault,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="discover"
                options={{
                    title: 'Discover',
                    tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="matches"
                options={{
                    title: 'Matches',
                    tabBarIcon: ({ color, size }) => <MessageSquare color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="wallet"
                options={{
                    title: 'Wallet',
                    tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}
