import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../src/hooks/useAuth';

const { width } = Dimensions.get('window');

// Color Theme
const COLORS = {
    rosePrimary: '#ff1a5c',
    rose20: 'rgba(255, 26, 92, 0.2)',
    bgNav: 'rgba(26, 5, 5, 0.85)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
};

// Animated Tab Icon Component
function AnimatedTabIcon({
    IconComponent,
    isFocused,
    onPress
}: {
    IconComponent: any;
    isFocused: boolean;
    onPress: () => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: isFocused ? 1.1 : 1,
            friction: 5,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }, [isFocused, scaleAnim]);

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
            <Animated.View
                style={[
                    styles.iconContainer,
                    isFocused && styles.iconContainerActive,
                    { transform: [{ scale: scaleAnim }] }
                ]}
            >
                <IconComponent
                    size={22}
                    color={isFocused ? COLORS.rosePrimary : COLORS.textMuted}
                    fill={isFocused ? COLORS.rose20 : 'transparent'}
                />
            </Animated.View>
        </TouchableOpacity>
    );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
    const tabs = [
        { name: 'index', label: 'Home', icon: Home },
        { name: 'discover', label: 'Search', icon: Search },
        { name: 'matches', label: 'Swaps', icon: Heart },
        { name: 'profile', label: 'Profile', icon: User },
    ];

    // Animate the pill in on mount
    const slideAnim = useRef(new Animated.Value(80)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.tabBarWrapper,
                {
                    transform: [{ translateY: slideAnim }],
                    opacity: fadeAnim,
                }
            ]}
        >
            {/* Glassmorphic pill container */}
            <View style={styles.tabBarContainer}>
                <BlurView intensity={32} tint="dark" style={styles.blurView}>
                    <View style={styles.tabBarInner}>
                        {tabs.map((tab) => {
                            const routeIndex = state.routes.findIndex((r: any) => r.name === tab.name);
                            const isFocused = state.index === routeIndex;
                            const IconComponent = tab.icon;

                            const onPress = () => {
                                if (routeIndex >= 0) {
                                    navigation.navigate(state.routes[routeIndex].name);
                                }
                            };

                            return (
                                <AnimatedTabIcon
                                    key={tab.name}
                                    IconComponent={IconComponent}
                                    isFocused={isFocused}
                                    onPress={onPress}
                                />
                            );
                        })}
                    </View>
                </BlurView>
            </View>
        </Animated.View>
    );
}

export default function TabLayout() {
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (!isAuthenticated) {
            router.replace('/(auth)/welcome');
        }
    }, [isAuthenticated]);

    return (
        <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(props) => <CustomTabBar {...props} />}
        >
            <Tabs.Screen name="index" options={{ title: 'Home' }} />
            <Tabs.Screen name="discover" options={{ title: 'Search' }} />
            <Tabs.Screen name="matches" options={{ title: 'Swaps' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            {/* Hide other tabs */}
            <Tabs.Screen name="wallet" options={{ href: null }} />
            <Tabs.Screen name="home" options={{ href: null }} />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBarWrapper: {
        position: 'absolute',
        bottom: 30,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    tabBarContainer: {
        borderRadius: 40,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.borderSubtle,
    },
    blurView: {
        backgroundColor: COLORS.bgNav,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    tabBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    iconContainerActive: {
        backgroundColor: COLORS.rose20,
    },
});
