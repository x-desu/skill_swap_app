/**
 * profile-setup.tsx
 * Premium, fully refactored profile setup screen for SkillSwap.
 *
 * Extracted components: SkillChip, SuggestionChip, SectionHeader, StyledInput
 * Fixes:
 *  - Chip tap now always adds to skill list (was missing state update on suggestion tap)
 *  - Proper flexWrap with rowGap + columnGap for chip clouds
 *  - Focus border on text inputs
 *  - Keyboard push-up without breaking layout (KeyboardAvoidingView + ScrollView)
 *  - Scale animation on chip add, spring dismiss on remove
 *  - Consistent 8px spacing system throughout
 */
import { useState, useRef, useCallback } from 'react';
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

// ─── Constants ───────────────────────────────────────────────────────────────

const TEACH_SUGGESTIONS = [
  'Python', 'Design', 'React', 'Photography', 'Music',
  'Marketing', 'Excel', 'Video Editing', 'Drawing', 'Writing', 'Spanish', 'French',
];

const LEARN_SUGGESTIONS = [
  'Guitar', 'Cooking', 'UI/UX', 'JavaScript', 'Public Speaking',
  'French', 'Spanish', 'Fitness', 'Data Science', 'Photography', 'Drawing', 'Piano',
];

const ACCENT = '#ff1a5c';
const BG_DARK = '#0d0202';

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SkillChipProps {
  label: string;
  onRemove: () => void;
  color?: string; // accent color for border/bg
}

function SkillChip({ label, onRemove, color = '#ff1a5c' }: SkillChipProps) {
  const scale = useRef(new Animated.Value(0.7)).current;

  // Mount animation
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
    tension: 200,
    friction: 12,
  }).start();

  const handleRemove = () => {
    Animated.spring(scale, {
      toValue: 0,
      useNativeDriver: true,
      tension: 300,
      friction: 8,
    }).start(onRemove);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={[styles.chip, { backgroundColor: color + '22', borderColor: color + '66' }]}>
        <Text style={[styles.chipText, { color: '#fff' }]}>{label}</Text>
        <TouchableOpacity onPress={handleRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={13} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

interface SuggestionChipProps {
  label: string;
  onPress: () => void;
}

function SuggestionChip({ label, onPress }: SuggestionChipProps) {
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

interface SectionHeaderProps {
  title: string;
  hint: string;
}

function SectionHeader({ title, hint }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.label}>{title}</Text>
      <Text style={styles.fieldHint}>{hint}</Text>
    </View>
  );
}

interface StyledInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'next' | 'send';
  autoFocus?: boolean;
}

function StyledInput({
  value, onChangeText, placeholder, onSubmitEditing, returnKeyType = 'done', autoFocus,
}: StyledInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[styles.input, focused && styles.inputFocused]}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.22)"
      value={value}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      returnKeyType={returnKeyType}
      autoCorrect={false}
      autoCapitalize="words"
      autoFocus={autoFocus}
    />
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
      // Prevent duplicates (case-insensitive)
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
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

  // Filter suggestions: exclude already-selected, show up to 8
  const teachSuggestions = TEACH_SUGGESTIONS.filter(
    (s) => !skillsOffered.some((o) => o.toLowerCase() === s.toLowerCase()),
  ).slice(0, 8);

  const learnSuggestions = LEARN_SUGGESTIONS.filter(
    (s) => !skillsNeeded.some((n) => n.toLowerCase() === s.toLowerCase()),
  ).slice(0, 8);

  const canSubmit = displayName.trim().length > 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

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
          <StyledInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="e.g. Alex Rivera"
            returnKeyType="next"
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
        <View style={styles.section}>
          <SectionHeader
            title="Skills you can teach 🎓"
            hint="Type a skill and press Return — or tap a suggestion"
          />

          {/* Input row */}
          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <StyledInput
                value={offerInput}
                onChangeText={setOfferInput}
                placeholder="e.g. Python, Guitar..."
                onSubmitEditing={() =>
                  addSkill(skillsOffered, setSkillsOffered, offerInput, setOfferInput)
                }
              />
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !offerInput.trim() && styles.addBtnDisabled, { backgroundColor: '#ff1a5c' }]}
              onPress={() =>
                addSkill(skillsOffered, setSkillsOffered, offerInput, setOfferInput)
              }
              activeOpacity={0.7}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

          {/* Selected chips */}
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

          {/* Suggestion chips */}
          {teachSuggestions.length > 0 && (
            <View style={styles.chipCloud}>
              {teachSuggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  label={s}
                  onPress={() => {
                    setSkillsOffered((prev) =>
                      prev.some((p) => p.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s]
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Skills I Want ── */}
        <View style={styles.section}>
          <SectionHeader
            title="Skills you want to learn 🎯"
            hint="What do you want to get better at?"
          />

          <View style={styles.inputRow}>
            <View style={{ flex: 1 }}>
              <StyledInput
                value={needInput}
                onChangeText={setNeedInput}
                placeholder="e.g. Spanish, Photoshop..."
                onSubmitEditing={() =>
                  addSkill(skillsNeeded, setSkillsNeeded, needInput, setNeedInput)
                }
              />
            </View>
            <TouchableOpacity
              style={[styles.addBtn, !needInput.trim() && styles.addBtnDisabled, { backgroundColor: ACCENT }]}
              onPress={() =>
                addSkill(skillsNeeded, setSkillsNeeded, needInput, setNeedInput)
              }
              activeOpacity={0.7}
            >
              <Plus size={18} color="#fff" strokeWidth={2.5} />
            </TouchableOpacity>
          </View>

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

          {learnSuggestions.length > 0 && (
            <View style={styles.chipCloud}>
              {learnSuggestions.map((s) => (
                <SuggestionChip
                  key={s}
                  label={s}
                  onPress={() => {
                    setSkillsNeeded((prev) =>
                      prev.some((p) => p.toLowerCase() === s.toLowerCase()) ? prev : [...prev, s]
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

  // ── Header
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

  // ── Photo
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

  // ── Section
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

  // ── Input & Location
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
  locationTextEmpty: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
  locationTextFilled: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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

  // ── Chips
  chipCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    columnGap: 8,
    marginBottom: 10,
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
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
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

  // ── Actions
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
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.2,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipText: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 14,
  },
});
