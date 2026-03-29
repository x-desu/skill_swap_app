import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Moon, Sun, Smartphone, LogOut, Trash2, Edit2 } from 'lucide-react-native';
import { useTheme } from '../src/context/ThemeContext';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../src/store';
import { signOut } from '../src/store/authSlice';

export default function SettingsScreen() {
    const insets = useSafeAreaInsets();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();
    const dispatch = useDispatch<AppDispatch>();

    const handleSignOut = () => {
        Alert.alert('Sign Out', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Sign Out', 
                style: 'destructive', 
                onPress: async () => {
                    await dispatch(signOut());
                    // onAuthStateChanged will handle routing to /(auth)/welcome
                } 
            },
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'This action is permanent and cannot be undone. All your messages, matches, and profile data will be permanently erased.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Permanently', style: 'destructive', onPress: () => {
                    // TODO: Implement Cloud Function or client-side deletion workflow
                    Alert.alert('Not Implemented', 'Account deletion requires re-authentication. Coming soon!');
                }}
            ]
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#f8f9fa', paddingTop: insets.top }]}>
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ChevronLeft color={colors.text} size={28} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* Theme Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
                    <View style={[styles.themeSelector, { backgroundColor: isDark ? '#1E1E1E' : '#e9ecef', borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[
                                styles.themeOption, 
                                themeMode === 'light' && [styles.themeActive, { backgroundColor: '#fff' }]
                            ]}
                            onPress={() => setThemeMode('light')}
                        >
                            <Sun color={themeMode === 'light' ? '#000' : '#888'} size={20} />
                            <Text style={[styles.themeText, { color: themeMode === 'light' ? '#000' : '#888' }]}>Light</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.themeOption, 
                                themeMode === 'dark' && [styles.themeActive, { backgroundColor: '#333' }]
                            ]}
                            onPress={() => setThemeMode('dark')}
                        >
                            <Moon color={themeMode === 'dark' ? '#fff' : '#888'} size={20} />
                            <Text style={[styles.themeText, { color: themeMode === 'dark' ? '#fff' : '#888' }]}>Dark</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.themeOption, 
                                themeMode === 'system' && [styles.themeActive, { backgroundColor: isDark ? '#333' : '#fff' }]
                            ]}
                            onPress={() => setThemeMode('system')}
                        >
                            <Smartphone color={themeMode === 'system' ? (isDark ? '#fff' : '#000') : '#888'} size={20} />
                            <Text style={[styles.themeText, { color: themeMode === 'system' ? (isDark ? '#fff' : '#000') : '#888' }]}>System</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Account Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
                    
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#1E1E1E' : '#fff', borderColor: colors.border }]} onPress={() => router.push('/edit-profile')}>
                        <Edit2 color={colors.text} size={20} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Edit Profile</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#1E1E1E' : '#fff', borderColor: colors.border }]} onPress={handleSignOut}>
                        <LogOut color={colors.text} size={20} />
                        <Text style={[styles.actionText, { color: colors.text }]}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: isDark ? '#2a0a0a' : '#fff5f5', borderColor: 'rgba(255,26,92,0.3)' }]} onPress={handleDeleteAccount}>
                        <Trash2 color="#ff1a5c" size={20} />
                        <Text style={[styles.actionText, { color: '#ff1a5c' }]}>Delete Account</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    themeSelector: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        borderWidth: 1,
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
    },
    themeActive: {
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    themeText: {
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 15,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    actionText: {
        marginLeft: 14,
        fontSize: 16,
        fontWeight: '600',
    },
});
