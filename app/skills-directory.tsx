import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Star } from 'lucide-react-native';

const COLORS = {
  rosePrimary: '#ff1a5c',
  rose20: 'rgba(255, 26, 92, 0.2)',
  bgBase: '#0d0202',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
};

const DIRECTORY = [
  {
    category: 'Technology & Programming',
    skills: ['React Native', 'Python', 'JavaScript', 'SQL', 'UI/UX Design', 'Figma', 'AWS', 'Machine Learning', 'Data Science'],
  },
  {
    category: 'Music & Audio',
    skills: ['Acoustic Guitar', 'Piano', 'Vocals', 'Music Production', 'DJing', 'Ableton Live', 'Songwriting'],
  },
  {
    category: 'Languages',
    skills: ['Spanish', 'French', 'Mandarin', 'Japanese', 'German', 'Sign Language', 'English (ESL)'],
  },
  {
    category: 'Art & Creative',
    skills: ['Photography', 'Digital Illustration', 'Video Editing', 'Animation', 'Watercolor', 'Calligraphy'],
  },
  {
    category: 'Sports & Fitness',
    skills: ['Yoga', 'Personal Training', 'Tennis', 'Surfing', 'Rock Climbing', 'Dance', 'Martial Arts'],
  },
  {
    category: 'Business & Career',
    skills: ['Public Speaking', 'Marketing', 'SEO', 'Resume Writing', 'Negotiation', 'Product Management'],
  }
];

export default function SkillsDirectoryScreen() {
  const insets = useSafeAreaInsets();

  const handleSkillPress = (skill: string) => {
    // Navigating back using push to the discover tab acts across the generic bottom tab system
    router.push({ pathname: '/(tabs)/discover', params: { searchQuery: skill } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Skills Directory</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <Star color={COLORS.rosePrimary} size={32} style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Discover Your Next Skill</Text>
          <Text style={styles.heroSubtitle}>Find experts offering exactly what you want to learn, or find people looking for what you teach.</Text>
        </View>

        {DIRECTORY.map((section, idx) => (
          <View key={idx} style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{section.category}</Text>
            <View style={styles.chipsContainer}>
              {section.skills.map((skill) => (
                <TouchableOpacity 
                  key={skill} 
                  style={styles.chip}
                  onPress={() => handleSkillPress(skill)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.chipText}>{skill}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgBase,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  heroIcon: {
    marginBottom: 16,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  chipText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 60,
  }
});
