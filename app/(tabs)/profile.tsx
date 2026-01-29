import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Settings, Edit2, Moon, Sun, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../src/context/ThemeContext';
import ProfileGlowBackground from '../../src/components/ProfileGlowBackground';
import { getProfileBaseColor } from '../../src/utils/colorUtils';

export default function ProfileScreen() {
    const { currentUser } = useStore();
    const insets = useSafeAreaInsets();
    const { colors, themeMode, setThemeMode, isDark } = useTheme();

    const baseColor = getProfileBaseColor(currentUser);
    const seedKey = `tab:profile:${currentUser.id}`;

    const followers = currentUser.followersCount ?? 0;
    const following = currentUser.followingCount ?? 0;
    const sessions = currentUser.completedSessions ?? 0;
    const creditsEarned = currentUser.creditsEarned ?? 0;
    const creditsSpent = currentUser.creditsSpent ?? 0;

    return (
        <ProfileGlowBackground baseColor={baseColor} seedKey={seedKey}>
            <ScrollView style={[styles.container, { paddingBottom: 90, backgroundColor: 'transparent' }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>My Profile</Text>
                    <TouchableOpacity>
                        <Settings color={colors.text} size={24} />
                    </TouchableOpacity>
                </View>

            <View style={styles.profileHeader}>
                <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
                <Text style={[styles.name, { color: colors.text }]}>{currentUser.name}</Text>

                <View style={styles.locationContainer}>
                    <MapPin color={isDark ? '#ccc' : '#666'} size={14} />
                    <Text style={[styles.location, { color: isDark ? '#ccc' : '#666' }]}>{currentUser.location}</Text>
                </View>

                <TouchableOpacity style={[styles.editButton, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                    <Edit2 color={colors.text} size={16} />
                    <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Profile</Text>
                </TouchableOpacity>

                <View style={[styles.statsRow, { borderColor: colors.border }]}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.text }]}>{followers}</Text>
                        <Text style={styles.statLabel}>Followers</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.text }]}>{following}</Text>
                        <Text style={styles.statLabel}>Following</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: colors.text }]}>{sessions}</Text>
                        <Text style={styles.statLabel}>Sessions</Text>
                    </View>
                </View>

                <View style={styles.statsRowSecondary}>
                    <View style={styles.statItemSecondary}>
                        <Text style={styles.statSecondaryLabel}>Credits earned</Text>
                        <Text style={[styles.statSecondaryValue, { color: colors.text }]}>{creditsEarned.toFixed(1)}</Text>
                    </View>
                    <View style={styles.statItemSecondary}>
                        <Text style={styles.statSecondaryLabel}>Credits spent</Text>
                        <Text style={[styles.statSecondaryValue, { color: colors.text }]}>{creditsSpent.toFixed(1)}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
                <View style={[styles.themeSelector, { backgroundColor: isDark ? '#1E1E1E' : '#f0f0f0', borderColor: colors.border }]}>
                    <TouchableOpacity
                        style={[styles.themeOption, themeMode === 'light' && styles.themeActive]}
                        onPress={() => setThemeMode('light')}
                    >
                        <Sun color={themeMode === 'light' ? '#000' : '#999'} size={20} />
                        <Text style={[styles.themeText, { color: themeMode === 'light' ? '#000' : '#999' }]}>Light</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.themeOption, themeMode === 'dark' && styles.themeActive]}
                        onPress={() => setThemeMode('dark')}
                    >
                        <Moon color={themeMode === 'dark' ? '#000' : '#999'} size={20} />
                        <Text style={[styles.themeText, { color: themeMode === 'dark' ? '#000' : '#999' }]}>Dark</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.themeOption, themeMode === 'system' && styles.themeActive]}
                        onPress={() => setThemeMode('system')}
                    >
                        <Smartphone color={themeMode === 'system' ? '#000' : '#999'} size={20} />
                        <Text style={[styles.themeText, { color: themeMode === 'system' ? '#000' : '#999' }]}>System</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About Me</Text>
                <Text style={[styles.bio, { color: isDark ? '#ccc' : '#555' }]}>{currentUser.bio}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills I Offer</Text>
                <View style={styles.skillsContainer}>
                    {currentUser.skillsOffered.map(skill => (
                        <View key={skill.id} style={[styles.skillChip, { backgroundColor: isDark ? '#333' : '#333' }]}>
                            <Text style={styles.skillText}>{skill.title}</Text>
                            <Text style={styles.skillCost}>{skill.cost} cr/hr</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.skillChip, styles.addSkill, { borderColor: colors.border, backgroundColor: 'transparent' }]}>
                        <Text style={[styles.addSkillText, { color: colors.text }]}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills I Need</Text>
                <View style={styles.skillsContainer}>
                    {currentUser.skillsNeeded.map((skill, index) => (
                        <View key={index} style={[styles.skillChip, styles.neededChip, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
                            <Text style={[styles.skillText, styles.neededText, { color: colors.text }]}>{skill}</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.skillChip, styles.addSkill, { borderColor: colors.border, backgroundColor: 'transparent' }]}>
                        <Text style={[styles.addSkillText, { color: colors.text }]}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            </ScrollView>
        </ProfileGlowBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, // Dynamic bg
    content: { paddingBottom: 40, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        // color handled inline
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        marginBottom: 15,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        // color handled inline
        marginBottom: 5,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    location: {
        color: '#666',
        marginLeft: 5,
        fontSize: 16,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        // bg handled inline
    },
    editButtonText: {
        marginLeft: 8,
        fontWeight: '600',
        // color handled inline
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
    },
    statsRowSecondary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 10,
    },
    statItemSecondary: {
        flex: 1,
    },
    statSecondaryLabel: {
        fontSize: 11,
        color: '#888',
        marginBottom: 2,
    },
    statSecondaryValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        // color handled inline
        marginBottom: 10,
    },
    themeSelector: {
        flexDirection: 'row',
        borderRadius: 15,
        padding: 4,
        borderWidth: 1,
        // bg/border handled inline
    },
    themeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    themeActive: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    themeText: {
        marginLeft: 6,
        fontWeight: '600',
        fontSize: 14,
    },
    bio: {
        fontSize: 16,
        // color handled inline
        lineHeight: 24,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillChip: {
        // bg handled inline
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 20,
        marginRight: 10,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    skillText: {
        color: '#fff',
        fontWeight: '600',
        marginRight: 8,
    },
    skillCost: {
        color: '#FFD700',
        fontWeight: 'bold',
        fontSize: 12,
    },
    neededChip: {
        // bg handled inline
    },
    neededText: {
        // color handled inline
        marginRight: 0,
    },
    addSkill: {
        borderWidth: 1,
        borderStyle: 'dashed',
        // borderColor handled inline
        // removed bg here
    },
    addSkillText: {
        fontWeight: '600',
        // color handled inline
    }
});
