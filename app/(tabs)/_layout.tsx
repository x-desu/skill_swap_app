import React, { useRef, useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Image } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Home, Search, Heart, User } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useAuth } from '../../src/hooks/useAuth';
import { useNotifications } from '../../src/hooks/useNotifications';
import type { RootState } from '../../src/store';

const { width } = Dimensions.get('window');

// Color Theme
const COLORS = {
    rosePrimary: '#ff1a5c',
    rose20: 'rgba(255, 26, 92, 0.2)',
    bgNav: 'rgba(26, 5, 5, 0.85)',
    borderSubtle: 'rgba(255, 255, 255, 0.08)',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    badgeRed: '#ff3b30',
};

// Animated Tab Icon Component with Badge Support
function AnimatedTabIcon({
    IconComponent,
    isFocused,
    onPress,
    badgeCount,
}: {
    IconComponent: any;
    isFocused: boolean;
    onPress: () => void;
    badgeCount?: number;
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
                {badgeCount && badgeCount > 0 ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                        </Text>
                    </View>
                ) : null}
            </Animated.View>
        </TouchableOpacity>
    );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
    const { unreadCount } = useNotifications();
    const firestoreProfile = useSelector((s: RootState) => s.profile.profile);
    const authUser = useSelector((s: RootState) => s.auth.user);
    const avatarPhoto = firestoreProfile?.photoURL ?? authUser?.photoURL ?? null;

    const tabs = [
        { name: 'index', label: 'Home', icon: Home, badge: 0 },
        { name: 'discover', label: 'Discovery', icon: Search, badge: 0 },
        { name: 'matches', label: 'Swaps', icon: Heart, badge: unreadCount },
        { name: 'profile', label: 'Profile', icon: User, badge: 0 },
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
            <View style={styles.tabBarContainer}>
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

                        // ── Profile tab: real avatar or fallback icon ──
                        if (tab.name === 'profile') {
                            return (
                                <TouchableOpacity
                                    key={tab.name}
                                    onPress={onPress}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.iconContainer,
                                        isFocused && styles.iconContainerActive,
                                    ]}
                                >
                                    {avatarPhoto ? (
                                        <Image
                                            source={{ uri: avatarPhoto }}
                                            style={[
                                                styles.avatarImg,
                                                isFocused && styles.avatarImgActive,
                                            ]}
                                        />
                                    ) : (
                                        <IconComponent
                                            size={22}
                                            color={isFocused ? COLORS.rosePrimary : COLORS.textMuted}
                                            fill={isFocused ? COLORS.rose20 : 'transparent'}
                                        />
                                    )}
                                </TouchableOpacity>
                            );
                        }

                        return (
                            <AnimatedTabIcon
                                key={tab.name}
                                IconComponent={IconComponent}
                                isFocused={isFocused}
                                onPress={onPress}
                                badgeCount={tab.badge}
                            />
                        );
                    })}
                </View>
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
            <Tabs.Screen name="discover" options={{ title: 'Discovery' }} />
            <Tabs.Screen name="matches" options={{ title: 'Swaps' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
            {/* Hide other tabs */}
            <Tabs.Screen name="wallet" options={{ href: null }} />
            <Tabs.Screen name="messages" options={{ href: null }} />
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
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        backgroundColor: COLORS.badgeRed,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: COLORS.bgNav,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    avatarImg: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarImgActive: {
        borderColor: COLORS.rosePrimary,
        borderWidth: 2,
    },
});
