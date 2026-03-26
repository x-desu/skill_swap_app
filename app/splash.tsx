import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    Animated,
    Dimensions,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { runAppInit } from '../src/services/appInit';
import { useStore } from '../src/store/useStore';

const { width } = Dimensions.get('window');
const BAR_MAX = width * 0.5;

export default function SplashScreen() {
    const { setInitialized } = useStore();
    const [statusLabel, setStatusLabel] = useState('');

    const opacity    = useRef(new Animated.Value(0)).current;
    const scale      = useRef(new Animated.Value(0.85)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;
    const barOpacity  = useRef(new Animated.Value(0)).current;
    const barWidth    = useRef(new Animated.Value(0)).current;

    const animateBarTo = (pct: number) => {
        Animated.timing(barWidth, {
            toValue: BAR_MAX * (pct / 100),
            duration: 280,
            useNativeDriver: false,
        }).start();
    };

    useEffect(() => {
        StatusBar.setBarStyle('light-content');

        // 1 — icon fades + scales in
        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.spring(scale,   { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
        ]).start(() => {

            // 2 — name + bar appear
            Animated.parallel([
                Animated.timing(textOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
                Animated.timing(barOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
            ]).start(() => {

                // 3 — run real init pipeline
                runAppInit((progress: number, label: string) => {
                    setStatusLabel(label);
                    animateBarTo(progress);

                    if (progress >= 100) {
                        setTimeout(() => {
                            setInitialized(true);
                            router.replace('/(tabs)');
                        }, 300);
                    }
                }).catch(() => {
                    setInitialized(true);
                    router.replace('/(tabs)');
                });
            });
        });
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Icon */}
            <Animated.View style={[styles.iconWrapper, { opacity, transform: [{ scale }] }]}>
                <Image
                    source={require('../assets/skillswap-icon.png')}
                    style={styles.icon}
                    resizeMode="contain"
                />
            </Animated.View>

            {/* App name */}
            <Animated.Text style={[styles.name, { opacity: textOpacity }]}>
                Skill<Text style={styles.nameAccent}>Swap</Text>
            </Animated.Text>

            {/* Loading bar */}
            <Animated.View style={[styles.barWrapper, { opacity: barOpacity }]}>
                <View style={styles.barTrack}>
                    <Animated.View style={[styles.barFill, { width: barWidth }]} />
                </View>
                <Text style={styles.label}>{statusLabel}</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },

    iconWrapper: {
        marginBottom: 4,
    },
    icon: {
        width: 120,
        height: 120,
    },

    name: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.5,
    },
    nameAccent: {
        color: '#ff1a5c',
    },

    barWrapper: {
        alignItems: 'center',
        gap: 10,
        marginTop: 32,
    },
    barTrack: {
        width: BAR_MAX,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 1,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: '#ff1a5c',
        borderRadius: 1,
    },
    label: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 11,
        letterSpacing: 0.5,
    },
});
