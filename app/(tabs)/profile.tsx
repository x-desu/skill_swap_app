import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../src/store/useStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Settings, Edit2 } from 'lucide-react-native';

export default function ProfileScreen() {
    const { currentUser } = useStore();
    const insets = useSafeAreaInsets();

    return (
        <ScrollView style={[styles.container]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 20 }]}>
            <View style={styles.header}>
                <Text style={styles.title}>My Profile</Text>
                <TouchableOpacity>
                    <Settings color="#333" size={24} />
                </TouchableOpacity>
            </View>

            <View style={styles.profileHeader}>
                <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
                <Text style={styles.name}>{currentUser.name}</Text>

                <View style={styles.locationContainer}>
                    <MapPin color="#666" size={14} />
                    <Text style={styles.location}>{currentUser.location}</Text>
                </View>

                <TouchableOpacity style={styles.editButton}>
                    <Edit2 color="#333" size={16} />
                    <Text style={styles.editButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Me</Text>
                <Text style={styles.bio}>{currentUser.bio}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills I Offer</Text>
                <View style={styles.skillsContainer}>
                    {currentUser.skillsOffered.map(skill => (
                        <View key={skill.id} style={styles.skillChip}>
                            <Text style={styles.skillText}>{skill.title}</Text>
                            <Text style={styles.skillCost}>{skill.cost} cr/hr</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.skillChip, styles.addSkill]}>
                        <Text style={styles.addSkillText}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills I Need</Text>
                <View style={styles.skillsContainer}>
                    {currentUser.skillsNeeded.map((skill, index) => (
                        <View key={index} style={[styles.skillChip, styles.neededChip]}>
                            <Text style={[styles.skillText, styles.neededText]}>{skill}</Text>
                        </View>
                    ))}
                    <TouchableOpacity style={[styles.skillChip, styles.addSkill]}>
                        <Text style={styles.addSkillText}>+ Add</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
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
        color: '#333'
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
        color: '#333',
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
        backgroundColor: '#f0f0f0',
    },
    editButtonText: {
        marginLeft: 8,
        fontWeight: '600',
        color: '#333',
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    bio: {
        fontSize: 16,
        color: '#555',
        lineHeight: 24,
    },
    skillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    skillChip: {
        backgroundColor: '#333',
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
        backgroundColor: '#f0f0f0',
    },
    neededText: {
        color: '#333',
        marginRight: 0,
    },
    addSkill: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed',
    },
    addSkillText: {
        color: '#666',
        fontWeight: '600',
    }
});
