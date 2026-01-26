import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { useStore } from '../store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Settings, Edit2 } from 'lucide-react-native';
import { Colors } from '../constants/Colors';

export default function ProfileScreen() {
    const { currentUser } = useStore();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme ?? 'light'];

    return (
        <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
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
                    <MapPin color="#666" size={14} />
                    <Text style={styles.location}>{currentUser.location}</Text>
                </View>

                <TouchableOpacity style={[styles.editButton, { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
                    <Edit2 color={colors.text} size={16} />
                    <Text style={[styles.editButtonText, { color: colors.text }]}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>About Me</Text>
                <Text style={[styles.bio, { color: colorScheme === 'dark' ? '#ccc' : '#555' }]}>{currentUser.bio}</Text>
            </View>

            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Skills I Offer</Text>
                <View style={styles.skillsContainer}>
                    {currentUser.skillsOffered.map(skill => (
                        <View key={skill.id} style={[styles.skillChip, { backgroundColor: colorScheme === 'dark' ? '#333' : '#333' }]}>
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
                        <View key={index} style={[styles.skillChip, styles.neededChip, { backgroundColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}>
                            <Text style={[styles.skillText, styles.neededText, { color: colors.text }]}>{skill}</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.skillChip, styles.addSkill, { borderColor: colors.border, backgroundColor: 'transparent' }]}>
                        <Text style={[styles.addSkillText, { color: colors.text }]}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScrollView>
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
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        // color handled inline
        marginBottom: 10,
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
