/**
 * profile-setup.tsx
 * - Image crop fix: uses new MediaType API + presentationStyle fullScreen
 * - Categorized skill autocomplete: live dropdown as user types
 * - Zero new dependencies
 */
import { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Camera, X, Plus, ChevronRight, MapPin } from 'lucide-react-native';
import { useAuthDispatch } from '../../src/hooks/useAuth';
import { setProfileComplete } from '../../src/store/authSlice';
import { uploadProfilePhoto } from '../../src/services/storageService';
import { upsertUserProfile } from '../../src/services/firestoreService';

// ─── Skill Taxonomy ───────────────────────────────────────────────────────────

const SKILL_TAXONOMY: Record<string, string[]> = {
  '💻 Tech': [
    'Python', 'JavaScript', 'TypeScript', 'React', 'React Native', 'Node.js',
    'Swift', 'Kotlin', 'Flutter', 'Java', 'C++', 'Rust', 'Go', 'SQL',
    'MongoDB', 'Firebase', 'AWS', 'Docker', 'Git', 'Machine Learning',
    'Data Science', 'UI/UX Design', 'Figma', 'Cybersecurity', 'DevOps',
    'Blockchain', 'Web3', 'Excel / Sheets', 'PowerPoint', 'Notion',
  ],
  '🎨 Creative': [
    'Photography', 'Video Editing', 'Drawing', 'Illustration', 'Painting',
    'Graphic Design', 'Logo Design', 'Animation', '3D Modeling', 'Blender',
    'Adobe Photoshop', 'Adobe Illustrator', 'Lightroom', 'Canva',
    'Comic Art', 'Calligraphy', 'Pottery', 'Textile Design', 'Fashion Design',
  ],
  '🎵 Music': [
    'Guitar', 'Piano', 'Violin', 'Drums', 'Bass Guitar', 'Ukulele',
    'Singing', 'Songwriting', 'Music Production', 'DJ', 'Beatmaking',
    'Music Theory', 'Flute', 'Saxophone', 'Tabla', 'Sitar',
  ],
  '💬 Languages': [
    'English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese',
    'Korean', 'Arabic', 'Hindi', 'Portuguese', 'Italian', 'Russian',
    'Turkish', 'Dutch', 'Swedish', 'Sign Language',
  ],
  '💪 Fitness': [
    'Yoga', 'Meditation', 'Gym Training', 'Calisthenics', 'CrossFit',
    'Running', 'Swimming', 'Cycling', 'Pilates', 'Martial Arts', 'Boxing',
    'Dance', 'Zumba', 'Nutrition & Diet', 'Rock Climbing',
  ],
  '🍳 Cooking': [
    'Cooking', 'Baking', 'Pastry & Desserts', 'Indian Cuisine', 'Italian Cuisine',
    'Japanese Cuisine', 'Vegan Cooking', 'BBQ & Grilling', 'Cocktail Making',
    'Coffee Brewing', 'Meal Prep', 'Fermentation',
  ],
  '📈 Business': [
    'Marketing', 'Digital Marketing', 'SEO', 'Social Media', 'Content Writing',
    'Copywriting', 'Entrepreneurship', 'Finance', 'Investing', 'Accounting',
    'Product Management', 'Sales', 'Public Speaking', 'Leadership',
    'Project Management', 'Business Strategy',
  ],
  '🎓 Academic': [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'History',
    'Economics', 'Psychology', 'Philosophy', 'Literature', 'Writing',
    'Research', 'Statistics', 'Architecture',
  ],
  '🛠️ Practical': [
    'Carpentry', 'Plumbing', 'Electrical Work', 'Gardening', 'Home Repair',
    'Sewing', 'Knitting', 'Car Maintenance', '3D Printing', 'Electronics',
  ],
};

// Flat list with category labels for search
const ALL_SKILLS: Array<{ skill: string; category: string }> = Object.entries(
  SKILL_TAXONOMY,
).flatMap(([category, skills]) => skills.map((skill) => ({ skill, category })));

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#ff1a5c';
const BG_DARK = '#0d0202';

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillChip({
  label,
  onRemove,
  color = '#ff1a5c',
}: {
  label: string;
  onRemove: () => void;
  color?: string;
}) {
  const scale = useRef(new Animated.Value(0.7)).current;
  Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();

  const handleRemove = () => {
    Animated.spring(scale, { toValue: 0, useNativeDriver: true, tension: 300, friction: 8 }).start(onRemove);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Text style={styles.chipText}>{label}</Text>
        <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={13} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function SuggestionChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.suggestionChip}
      onPress={onPress}
      activeOpacity={0.6}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Plus size={11} color="rgba(255,255,255,0.5)" strokeWidth={2.5} />
      <Text style={styles.suggestionChipText}>{label}</Text>
    </TouchableOpacity>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.fieldHint}>{hint}</Text>
    </View>
  );
}

// ─── Skill Input with Autocomplete ───────────────────────────────────────────

function SkillInputWithAutocomplete({
  value,
  onChangeText,
  placeholder,
  selectedSkills,
  onAdd,
  accentColor,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  selectedSkills: string[];
  onAdd: (skill: string) => void;
  accentColor: string;
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return ALL_SKILLS
      .filter(
        ({ skill }) =>
          skill.toLowerCase().includes(q) &&
          !selectedSkills.some((s) => s.toLowerCase() === skill.toLowerCase()),
      )
      .slice(0, 6);
  }, [value, selectedSkills]);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={{ position: 'relative', zIndex: 10 }}>
      <View style={styles.inputRow}>
        <View style={{ flex: 1 }}>
          <TextInput
            style={[styles.input, focused && styles.inputFocused, focused && { borderColor: accentColor + 'AA' }]}
            placeholder={placeholder}
            placeholderTextColor="rgba(255,255,255,0.22)"
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onSubmitEditing={() => {
              if (value.trim()) onAdd(value.trim());
            }}
            returnKeyType="done"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>
        <TouchableOpacity
          style={[styles.addBtn, !value.trim() && styles.addBtnDisabled, { backgroundColor: accentColor }]}
          onPress={() => { if (value.trim()) onAdd(value.trim()); }}
          activeOpacity={0.7}
        >
          <Plus size={18} color="#fff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <View style={styles.dropdown}>
          {suggestions.map(({ skill, category }) => (
            <TouchableOpacity
              key={skill}
              style={styles.dropdownRow}
              onPress={() => {
                onAdd(skill);
                onChangeText('');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownRowInner}>
                <Text style={styles.dropdownSkill}>{skill}</Text>
                <Text style={styles.dropdownCategory}>{category}</Text>
              </View>
              <Plus size={14} color={accentColor} strokeWidth={2.5} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileSetup() {
  const dispatch = useAuthDispatch();
  const firebaseUser = getAuth().currentUser;

  const [displayName, setDisplayName] = useState(firebaseUser?.displayName ?? '');
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsNeeded, setSkillsNeeded] = useState<string[]>([]);
  const [offerInput, setOfferInput] = useState('');
  const [needInput, setNeedInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(firebaseUser?.photoURL ?? null);
  const [location, setLocation] = useState<{ city: string; country: string } | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  // ── Skill helpers ──────────────────────────────────────────────────────────

  const addSkill = useCallback(
    (
      list: string[],
      setList: (v: string[]) => void,
      val: string,
      setInput: (v: string) => void,
    ) => {
      const trimmed = val.trim();
      if (!trimmed) return;
      if (list.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
        setInput('');
        return;
      }
      setList([...list, trimmed]);
      setInput('');
    },
    [],
  );

  const removeSkill = useCallback(
    (list: string[], setList: (v: string[]) => void, skill: string) => {
      setList(list.filter((s) => s !== skill));
    },
    [],
  );

  // ── Photo helpers ──────────────────────────────────────────────────────────

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // Use new string array API (MediaTypeOptions is deprecated in v17)
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      // FULL_SCREEN forces iOS native crop UI to appear correctly
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const showPhotoOptions = () => {
    Alert.alert('Profile Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickPhoto },
      { text: 'Remove Photo', style: 'destructive', onPress: () => setPhotoUri(null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ── Location ───────────────────────────────────────────────────────────────

  const fetchLocation = async () => {
    setIsLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location access is required to auto-fill your area.');
        return;
      }
      const locationData = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync({
        latitude: locationData.coords.latitude,
        longitude: locationData.coords.longitude,
      });
      if (geocode.length > 0) {
        const place = geocode[0];
        setLocation({
          city: place.city || place.subregion || place.region || 'Unknown',
          country: place.country || 'Unknown',
        });
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleFinish = async () => {
    if (!displayName.trim() || !firebaseUser) return;
    setIsLoading(true);
    try {
      let finalPhotoURL: string | null = null;
      if (photoUri?.startsWith('http')) {
        finalPhotoURL = photoUri;
      } else if (photoUri) {
        finalPhotoURL = await uploadProfilePhoto(firebaseUser.uid, photoUri);
      }

      await updateProfile(firebaseUser, {
        displayName: displayName.trim(),
        ...(finalPhotoURL ? { photoURL: finalPhotoURL } : {}),
      });

      await upsertUserProfile(firebaseUser.uid, {
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
        email: firebaseUser.email,
        bio: '',
        location: location || { city: '', country: '' },
        teachSkills: skillsOffered,
        wantSkills: skillsNeeded,
        rating: 0,
        reviewCount: 0,
        completedSwaps: 0,
        credits: 10,
        isProfileComplete: true,
        hasPhoto: !!finalPhotoURL,
      });

      dispatch(setProfileComplete(true));
      router.replace('/(tabs)');
    } catch (e) {
      console.error('Profile setup error:', e);
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  // Default suggestion chips (shown when input is empty) — exclude already selected
  const teachSuggestions = ['Python', 'Design', 'React', 'Photography', 'Music', 'Marketing', 'Guitar', 'Cooking']
    .filter((s) => !skillsOffered.some((o) => o.toLowerCase() === s.toLowerCase()))
    .slice(0, 6);

  const learnSuggestions = ['Guitar', 'UI/UX', 'JavaScript', 'Public Speaking', 'French', 'Fitness', 'Piano', 'Yoga']
    .filter((s) => !skillsNeeded.some((n) => n.toLowerCase() === s.toLowerCase()))
    .slice(0, 6);

  const canSubmit = displayName.trim().length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <LinearGradient
        colors={[BG_DARK, '#1a0505', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* ── Header ── */}
        <Text style={styles.title}>Set up your profile</Text>
        <Text style={styles.subtitle}>
          Tell the community who you are — this shapes who you'll meet ✨
        </Text>

        {/* ── Photo Section ── */}
        <View style={styles.photoSection}>
          <TouchableOpacity onPress={showPhotoOptions} style={styles.avatarRing} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Camera color="rgba(255,255,255,0.4)" size={28} />
                <Text style={styles.avatarHint}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.photoCaption}>
            {photoUri ? '✓ Looking great! Tap to change.' : 'A photo builds 3× more trust'}
          </Text>
        </View>

        {/* ── Name ── */}
        <View style={styles.section}>
          <SectionHeader title="Your Name" hint="What should people call you?" />
          <TextInput
            style={styles.input}
            placeholder="e.g. Alex Rivera"
            placeholderTextColor="rgba(255,255,255,0.22)"
            value={displayName}
            onChangeText={setDisplayName}
            returnKeyType="next"
            autoCorrect={false}
            autoCapitalize="words"
          />
        </View>

        {/* ── Location ── */}
        <View style={styles.section}>
          <SectionHeader title="Location 📍" hint="Where are you based?" />
          <TouchableOpacity
            style={styles.locationBtn}
            onPress={fetchLocation}
            disabled={isLocationLoading}
            activeOpacity={0.7}
          >
            {isLocationLoading ? (
              <ActivityIndicator color="#ff1a5c" size="small" />
            ) : location ? (
              <Text style={styles.locationTextFilled}>
                {location.city}, {location.country}
              </Text>
            ) : (
              <Text style={styles.locationTextEmpty}>Tap to auto-fill location</Text>
            )}
            <MapPin size={18} color="rgba(255,26,92,0.8)" />
          </TouchableOpacity>
        </View>

        {/* ── Skills I Teach ── */}
        <View style={[styles.section, { zIndex: 20 }]}>
          <SectionHeader
            title="Skills you can teach 🎓"
            hint="Type to search categories, or tap a suggestion"
          />

          <SkillInputWithAutocomplete
            value={offerInput}
            onChangeText={setOfferInput}
            placeholder="e.g. Python, Guitar, Cooking…"
            selectedSkills={skillsOffered}
            onAdd={(skill) => addSkill(skillsOffered, setSkillsOffered, skill, setOfferInput)}
            accentColor="#ff1a5c"
          />

          {skillsOffered.length > 0 && (
            <View style={styles.chipCloud}>
              {skillsOffered.map((s) => (
                <SkillChip
                  key={s}
                  label={s}
                  color="#ff1a5c"
                  onRemove={() => removeSkill(skillsOffered, setSkillsOffered, s)}
                />
              ))}
            </View>
          )}

          {offerInput.trim().length < 2 && teachSuggestions.length > 0 && (
            <View style={styles.chipCloud}>
              {teachSuggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  label={s}
                  onPress={() => {
                    setSkillsOffered((prev) =>
                      prev.some((p) => p.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s],
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Skills I Want ── */}
        <View style={[styles.section, { zIndex: 10 }]}>
          <SectionHeader
            title="Skills you want to learn 🎯"
            hint="What do you want to get better at?"
          />

          <SkillInputWithAutocomplete
            value={needInput}
            onChangeText={setNeedInput}
            placeholder="e.g. Spanish, Photoshop…"
            selectedSkills={skillsNeeded}
            onAdd={(skill) => addSkill(skillsNeeded, setSkillsNeeded, skill, setNeedInput)}
            accentColor={ACCENT}
          />

          {skillsNeeded.length > 0 && (
            <View style={styles.chipCloud}>
              {skillsNeeded.map((s) => (
                <SkillChip
                  key={s}
                  label={s}
                  color={ACCENT}
                  onRemove={() => removeSkill(skillsNeeded, setSkillsNeeded, s)}
                />
              ))}
            </View>
          )}

          {needInput.trim().length < 2 && learnSuggestions.length > 0 && (
            <View style={styles.chipCloud}>
              {learnSuggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  label={s}
                  onPress={() => {
                    setSkillsNeeded((prev) =>
                      prev.some((p) => p.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s],
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Bottom Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.submitBtn, !canSubmit && styles.submitDisabled]}
            onPress={handleFinish}
            disabled={isLoading || !canSubmit}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.submitInner}>
                <Text style={styles.submitText}>Get Started</Text>
                <ChevronRight size={20} color="#fff" strokeWidth={2.5} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => dispatch(setProfileComplete(true))}
            activeOpacity={0.6}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 40,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 36,
    lineHeight: 20,
  },

  photoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,26,92,0.5)',
    shadowColor: '#ff1a5c',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  avatarHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  photoCaption: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },

  section: { marginBottom: 28 },
  sectionHeaderWrap: { marginBottom: 10 },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  fieldHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.32)',
    lineHeight: 17,
  },

  locationBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  locationTextEmpty: { color: 'rgba(255,255,255,0.4)', fontSize: 15 },
  locationTextFilled: { color: '#fff', fontSize: 15, fontWeight: '500' },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputFocused: {
    borderColor: 'rgba(255,26,92,0.7)',
    backgroundColor: 'rgba(255,26,92,0.06)',
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#ff1a5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.35 },

  // Autocomplete dropdown
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 58, // leave room for add button
    backgroundColor: '#1e0a0d',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,26,92,0.25)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 999,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  dropdownRowInner: { flex: 1, marginRight: 8 },
  dropdownSkill: { color: '#fff', fontSize: 14, fontWeight: '600' },
  dropdownCategory: { color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 2 },

  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  suggestionChipText: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 13,
    fontWeight: '500',
  },

  actions: { marginTop: 8 },
  submitBtn: {
    backgroundColor: '#ff1a5c',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#ff1a5c',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  submitDisabled: { opacity: 0.35, shadowOpacity: 0 },
  submitInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 },
  skipBtn: { alignItems: 'center', paddingVertical: 10 },
  skipText: { color: 'rgba(255,255,255,0.28)', fontSize: 14 },
});
