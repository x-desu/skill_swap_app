import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions,
  ScrollView, TextInput, Animated, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, Grid3X3, Search as SearchIcon, MapPin, Check,
  Gift, ArrowLeftRight, Star, Users,
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import type { RootState } from '../../src/store';
import { useDiscoveryFeed } from '../../src/hooks/useDiscoveryFeed';
import { useNotifications } from '../../src/hooks/useNotifications';
import { likeUser } from '../../src/services/matchingService';
import UserAvatar from '../../src/components/UserAvatar';
import type { UserDocument } from '../../src/types/user';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = width * 0.78;
const CARD_HEIGHT = height * 0.48;
const CARD_GAP = 16;
const SNAP_WIDTH = CARD_WIDTH + CARD_GAP;
const SIDE_PADDING = (width - CARD_WIDTH) / 2;

// Color Theme
const COLORS = {
  rosePrimary: '#ff1a5c',
  roseLight: '#ff4d7a',
  rose50: 'rgba(255, 26, 92, 0.5)',
  rose30: 'rgba(255, 26, 92, 0.3)',
  rose20: 'rgba(255, 26, 92, 0.2)',
  bgDeep: '#2d0a0a',
  bgDark: '#1a0505',
  bgBase: '#0d0202',
  glass: 'rgba(45, 10, 10, 0.5)',
  glass60: 'rgba(45, 10, 10, 0.6)',
  borderLight: 'rgba(255, 255, 255, 0.1)',
  borderHover: 'rgba(255, 255, 255, 0.2)',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  success: '#34d399',
  successBg: 'rgba(16, 185, 129, 0.2)',
  warning: '#fbbf24',
  warningBg: 'rgba(245, 158, 11, 0.2)',
};

// Category filter pills
const categories = ['All', 'Tech', 'Music', 'Art', 'Language', 'Sports'];

const CATEGORY_SKILL_MAP: Record<string, string[]> = {
  Tech: ['react', 'python', 'coding', 'ai', 'javascript', 'swift', 'flutter', 'design', 'excel'],
  Music: ['guitar', 'piano', 'singing', 'dj', 'music'],
  Art: ['drawing', 'painting', 'photography', 'video'],
  Language: ['spanish', 'french', 'hindi', 'mandarin', 'english', 'writing'],
  Sports: ['yoga', 'dance', 'football', 'cricket', 'swimming'],
};

// ── Animated Card ──
interface AnimatedCardProps {
  person: UserDocument;
  index: number;
  scrollX: Animated.Value;
  onProposeSwap: () => void;
}

function AnimatedCard({ person, index, scrollX, onProposeSwap }: AnimatedCardProps) {
  const inputRange = [
    (index - 1) * SNAP_WIDTH,
    index * SNAP_WIDTH,
    (index + 1) * SNAP_WIDTH,
  ];

  const rotate = scrollX.interpolate({ inputRange, outputRange: ['5deg', '0deg', '-5deg'], extrapolate: 'clamp' });
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
  const opacity = scrollX.interpolate({ inputRange, outputRange: [0.75, 1, 0.75], extrapolate: 'clamp' });
  const translateY = scrollX.interpolate({ inputRange, outputRange: [8, 0, 8], extrapolate: 'clamp' });

  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ rotate }, { scale }, { translateY }], opacity }]}>
      <View style={styles.personCard}>
        {/* Full-size avatar fills the card */}
        <UserAvatar
          photoURL={person.photoURL}
          displayName={person.displayName}
          uid={person.uid}
          size={CARD_WIDTH}
          style={styles.cardImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          style={styles.cardGradient}
        />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardName}>{person.displayName}</Text>
              <View style={styles.locationRow}>
                <MapPin color={COLORS.rosePrimary} size={14} />
                <Text style={styles.cardDistance}>{'Nearby'}</Text>
              </View>
            </View>
            <View style={styles.ratingCircle}>
              <Text style={styles.ratingNum}>
                {person.rating > 0 ? person.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          <View style={styles.skillsContainer}>
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Teaches</Text>
              <View style={styles.teachTag}>
                <Check color="#fff" size={14} />
                <Text style={styles.teachText}>{person.teachSkills?.[0] ?? '—'}</Text>
              </View>
            </View>
            <View style={styles.skillRow}>
              <Text style={styles.skillLabel}>Wants</Text>
              <View style={styles.learnTag}>
                <Text style={styles.learnText}>{person.wantSkills?.[0] ?? '—'}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.proposeBtn} onPress={onProposeSwap} activeOpacity={0.85}>
            <Text style={styles.proposeBtnText}>Propose Swap ✨</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

// ── Skeleton Card ──
function SkeletonCard({ index, scrollX }: { index: number; scrollX: Animated.Value }) {
  const inputRange = [(index - 1) * SNAP_WIDTH, index * SNAP_WIDTH, (index + 1) * SNAP_WIDTH];
  const scale = scrollX.interpolate({ inputRange, outputRange: [0.92, 1, 0.92], extrapolate: 'clamp' });
  return (
    <Animated.View style={[styles.cardContainer, { transform: [{ scale }] }]}>
      <View style={[styles.personCard, { backgroundColor: 'rgba(255,255,255,0.06)' }]} />
    </Animated.View>
  );
}

// ── HomeScreen ──
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const scrollX = useRef(new Animated.Value(0)).current;

  // Real data from Redux/Firestore
  const authUser = useSelector((s: RootState) => s.auth.user);
  const { users: fetchedUsers, loading, removeUserFromFeed, recordSwipe } = useDiscoveryFeed(authUser?.uid || null);
  const { unreadCount, notifications } = useNotifications();
  
  // Debug logging
  console.log('[Home] unreadCount:', unreadCount, 'notifications:', notifications.length);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: true },
  );

  // Client-side category filter
  const filteredUsers = selectedCategory === 'All'
    ? fetchedUsers
    : fetchedUsers.filter((u) =>
        u.teachSkills?.some((s) =>
          CATEGORY_SKILL_MAP[selectedCategory]?.some((k) =>
            s.toLowerCase().includes(k),
          ),
        ),
      );

  const handleProposeSwap = async (toUser: UserDocument) => {
    if (!authUser) return;
    try {
      // Create a "like" in the backend. If mutual, returns a MatchDocument.
      // Optimistic UI: Remove them from the local feed instantly.
      removeUserFromFeed(toUser.uid);
      recordSwipe(toUser.uid);

      const match = await likeUser(authUser.uid, toUser.uid);

      if (match) {
        // Mutual match!
        router.push({
          pathname: '/match-celebration',
          params: { matchId: match.id, targetUid: toUser.uid, targetName: toUser.displayName, targetPhoto: toUser.photoURL || '' },
        });
      } else {
        Alert.alert('🎉 Swap Proposed!', `Your request was sent to ${toUser.displayName}.`);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not send request. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bgBase }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerLeft}>
            <UserAvatar
              photoURL={authUser?.photoURL}
              displayName={authUser?.displayName}
              uid={authUser?.uid}
              size={42}
            />
            <View style={styles.headerText}>
              <Text style={styles.appName}>SkillSwap</Text>
              <Text style={styles.tagline}>Discovery</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => router.push('/notifications')}
            >
              <Bell color={COLORS.textSecondary} size={20} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}><Grid3X3 color={COLORS.textSecondary} size={20} /></TouchableOpacity>
          </View>
        </View>

        {/* ── Search ── */}
        <View style={styles.searchRow}>
          <BlurView intensity={20} tint="dark" style={styles.searchBar}>
            <SearchIcon color={COLORS.textMuted} size={16} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search skills or people..."
              placeholderTextColor={COLORS.textMuted}
            />
          </BlurView>
          <TouchableOpacity style={styles.nearbyBtn}>
            <MapPin color={COLORS.textSecondary} size={14} />
            <Text style={styles.nearbyText}>Nearby</Text>
          </TouchableOpacity>
        </View>

        {/* ── Categories ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryPill, selectedCategory === cat && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Quick Actions ── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard}>
            <Gift color={COLORS.rosePrimary} size={20} />
            <Text style={styles.actionText}>Offer Skill</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <ArrowLeftRight color={COLORS.rosePrimary} size={20} />
            <Text style={styles.actionText}>My Swaps</Text>
          </TouchableOpacity>
        </View>

        {/* ── People Near You ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>People Near You</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>

        {/* Cards */}
        {loading ? (
          // Loading skeletons
          <Animated.ScrollView
            horizontal
            scrollEnabled={false}
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: CARD_GAP }}
          >
            {[0, 1].map((i) => (
              <SkeletonCard key={i} index={i} scrollX={scrollX} />
            ))}
          </Animated.ScrollView>
        ) : filteredUsers.length === 0 ? (
          <View style={[styles.emptyState, { width: width - 40, height: CARD_HEIGHT * 0.8 }]}>
            <View style={styles.emptyIconContainer}>
              <Users color={COLORS.rosePrimary} size={32} />
            </View>
            <Text style={styles.emptyText}>No people here yet</Text>
            <Text style={styles.emptySubtext}>
              {selectedCategory === 'All'
                ? "You've proposed swaps to everyone nearby!"
                : `No ${selectedCategory} matches found. Try "All".`}
            </Text>
          </View>
        ) : (
          <Animated.ScrollView
            horizontal
            snapToInterval={SNAP_WIDTH}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SIDE_PADDING, gap: CARD_GAP }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {filteredUsers.map((person, index) => (
              <AnimatedCard
                key={person.uid}
                person={person}
                index={index}
                scrollX={scrollX}
                onProposeSwap={() => handleProposeSwap(person)}
              />
            ))}
          </Animated.ScrollView>
        )}

        {/* ── Featured Skills ── */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Text style={styles.sectionTitle}>Featured Skills</Text>
          <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
          {['UI Design', 'Python', 'Guitar', 'Spanish', 'Photography', 'Yoga'].map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Star color={COLORS.rosePrimary} size={14} />
              <Text style={styles.skillChipText}>{skill}</Text>
            </View>
          ))}
        </ScrollView>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: {},
  appName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tagline: { color: COLORS.rosePrimary, fontSize: 11, fontWeight: '600' },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.rosePrimary,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.bgBase,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Search
  searchRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 16 },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  nearbyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  nearbyText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },

  // Categories
  categoriesRow: { paddingHorizontal: 20, gap: 8, marginBottom: 20 },
  categoryPill: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  categoryPillActive: { backgroundColor: COLORS.rosePrimary, borderColor: COLORS.rosePrimary },
  categoryText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },

  // Quick Actions
  actionsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  actionCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,26,92,0.1)', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.rose20,
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  seeAll: { color: COLORS.rosePrimary, fontSize: 13, fontWeight: '600' },

  // Card
  cardContainer: { width: CARD_WIDTH },
  personCard: { width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 24, overflow: 'hidden', backgroundColor: COLORS.bgDeep },
  cardImage: { width: CARD_WIDTH, height: CARD_HEIGHT, position: 'absolute', top: 0, left: 0, borderRadius: 24 },
  cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.6 },
  cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  cardDistance: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  ratingCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.rose20, borderWidth: 1, borderColor: COLORS.rose50,
    justifyContent: 'center', alignItems: 'center',
  },
  ratingNum: { color: COLORS.rosePrimary, fontSize: 12, fontWeight: '800' },

  skillsContainer: { gap: 8, marginBottom: 14 },
  skillRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  skillLabel: { color: COLORS.textMuted, fontSize: 12, width: 50 },
  teachTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  teachText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  learnTag: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  learnText: { color: COLORS.textSecondary, fontSize: 13 },

  proposeBtn: {
    backgroundColor: COLORS.rosePrimary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  proposeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Empty state
  emptyState: { 
    alignItems: 'center', 
    justifyContent: 'center', 
    alignSelf: 'center', // center in ScrollView
    marginVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 26, 92, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 26, 92, 0.3)',
    borderStyle: 'dashed',
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 26, 92, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  // Featured Skills
  featuredRow: { paddingHorizontal: 20, gap: 10 },
  skillChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.rose20, borderWidth: 1, borderColor: COLORS.rose30,
  },
  skillChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
