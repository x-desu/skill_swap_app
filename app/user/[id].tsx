import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, ArrowLeft } from 'lucide-react-native';
import { getUserProfile } from '../../src/services/firestoreService';
import type { UserDocument } from '../../src/types/user';
import UserAvatar from '../../src/components/UserAvatar';
import UserProfileSkeleton from '../../src/components/skeletons/UserProfileSkeleton';

const COLORS = {
  rosePrimary: '#ff1a5c',
  bgDark: '#1a0505',
  bgBase: '#0d0202',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  cardBg: 'rgba(255, 255, 255, 0.03)',
};

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<UserDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      if (typeof id === 'string') {
        try {
          const profile = await getUserProfile(id);
          setUser(profile);
        } catch (error) {
          console.error("Failed to load user profile:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchUser();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <UserProfileSkeleton show />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButtonCenter} onPress={() => router.back()}>
          <ArrowLeft color={COLORS.textPrimary} size={24} />
          <Text style={{ color: COLORS.textPrimary, marginLeft: 8 }}>User not found. Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const followers = user.mutualMatches ?? 0;
  const following = user.swipeRightCount ?? 0;
  const sessions = user.completedSwaps ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <ArrowLeft color={COLORS.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <UserAvatar
            uid={user.uid}
            photoURL={user.photoURL}
            displayName={user.displayName}
            size={120}
          />
          <Text style={styles.name}>{user.displayName}</Text>

          <View style={styles.locationContainer}>
            <MapPin color={COLORS.rosePrimary} size={14} />
            <Text style={styles.location}>
              {user.location?.city ? `${user.location.city}, ${user.location.country}` : 'Global'}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followers}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{following}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{sessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.bioCard}>
            <Text style={styles.bio}>{user.bio || 'No bio provided yet.'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Offered</Text>
          <View style={styles.skillsContainer}>
            {user.teachSkills?.length ? user.teachSkills.map((skill: string, idx: number) => (
              <View key={`teach-${idx}`} style={styles.skillChipPrimary}>
                <Text style={styles.skillTextPrimary}>{skill}</Text>
              </View>
            )) : <Text style={styles.bio}>None listed</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills Needed</Text>
          <View style={styles.skillsContainer}>
            {user.wantSkills?.length ? user.wantSkills.map((skill: string, index: number) => (
              <View key={`want-${index}`} style={styles.skillChipSecondary}>
                <Text style={styles.skillTextSecondary}>{skill}</Text>
              </View>
            )) : <Text style={styles.bio}>None listed</Text>}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bgBase 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  iconButton: {
    padding: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  backButtonCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  content: { 
    paddingBottom: 120, 
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 35,
  },
  name: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 15,
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  location: {
    color: COLORS.textSecondary,
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    backgroundColor: COLORS.cardBg,
    paddingVertical: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.borderLight,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  bioCard: {
    backgroundColor: COLORS.cardBg,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  bio: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillChipPrimary: {
    backgroundColor: 'rgba(255, 26, 92, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 26, 92, 0.4)',
  },
  skillTextPrimary: {
    color: COLORS.rosePrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  skillChipSecondary: {
    backgroundColor: COLORS.cardBg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  skillTextSecondary: {
    color: COLORS.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
});
