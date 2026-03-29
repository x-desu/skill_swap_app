/**
 * edit-profile.tsx
 * Full-featured edit profile screen accessible from the Profile tab.
 * - Back button in header
 * - Change profile photo (with iOS crop)
 * - Edit display name, bio, location
 * - Add/remove teach & want skills (with autocomplete)
 * - Saves to both Firebase Auth & Firestore
 * - Dispatches setUser + setProfile to keep Redux in sync immediately
 */
import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAuth, updateProfile } from '@react-native-firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, Camera, X, Plus } from 'lucide-react-native';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../src/store';
import { setUser } from '../src/store/authSlice';
import { setProfile } from '../src/store/profileSlice';
import { uploadProfilePhoto } from '../src/services/storageService';
import { upsertUserProfile } from '../src/services/firestoreService';
import type { UserDocument } from '../src/types/user';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const COLORS = {
  bg: '#0d0202',
  card: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.12)',
  rose: '#ff1a5c',
  roseDim: 'rgba(255,26,92,0.15)',
  text: '#ffffff',
  textSec: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.35)',
  inputBg: 'rgba(255,255,255,0.07)',
  pill: 'rgba(255,26,92,0.18)',
};

// ─── Skill Taxonomy (same as profile-setup for consistency) ───────────────────

const SKILL_TAXONOMY: Record<string, string[]> = {
  'Tech': ['JavaScript', 'TypeScript', 'Python', 'React', 'React Native', 'Node.js', 'Swift', 'Kotlin', 'Flutter', 'Go', 'Rust', 'Java', 'C++', 'SQL', 'MongoDB', 'AWS', 'Docker', 'Machine Learning', 'Data Science', 'UI/UX Design', 'Figma', 'Cybersecurity'],
  'Creative': ['Graphic Design', 'Illustration', 'Photography', 'Video Editing', 'Motion Graphics', 'Branding', 'Drawing', 'Painting', 'Calligraphy', 'Animation', '3D Modelling', 'Sketching'],
  'Music': ['Guitar', 'Piano', 'Drums', 'Violin', 'Bass', 'Singing', 'Music Production', 'DJ', 'Songwriting', 'Flute', 'Ukulele', 'Music Theory'],
  'Language': ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Hindi', 'Arabic', 'Portuguese', 'Italian', 'Korean', 'Russian'],
  'Business': ['Marketing', 'Sales', 'Finance', 'Accounting', 'Business Strategy', 'Entrepreneurship', 'Leadership', 'Public Speaking', 'Negotiation', 'Excel', 'Product Management', 'SEO'],
  'Fitness': ['Yoga', 'Fitness', 'Nutrition', 'Meditation', 'Pilates', 'Boxing', 'Running', 'Cycling', 'Swimming', 'Weightlifting', 'CrossFit', 'Dance'],
  'Cooking': ['Cooking', 'Baking', 'Pastry', 'Barista', 'Cocktails', 'Meal Prep', 'Vegan Cooking', 'BBQ', 'Indian Cuisine', 'Italian Cuisine'],
  'Education': ['Tutoring', 'Math', 'Physics', 'Chemistry', 'Biology', 'History', 'Literature', 'Economics', 'Psychology', 'Philosophy'],
  'Other': ['Gardening', 'Carpentry', 'Knitting', 'Chess', 'Magic', 'Stand-up Comedy', 'Parenting', 'Investing', 'Life Coaching', 'Writing'],
};

const ALL_SKILLS = Object.values(SKILL_TAXONOMY).flat();

// ─── Skill Input Component ────────────────────────────────────────────────────

function SkillInput({
  placeholder,
  selectedSkills,
  onAdd,
  onRemove,
}: {
  placeholder: string;
  selectedSkills: string[];
  onAdd: (skill: string) => void;
  onRemove: (skill: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ALL_SKILLS
      .filter(s => s.toLowerCase().includes(q) && !selectedSkills.includes(s))
      .slice(0, 6);
  }, [query, selectedSkills]);

  const handlePick = (skill: string) => {
    onAdd(skill);
    setQuery('');
  };

  const handleAddCustom = () => {
    const trimmed = query.trim();
    if (!trimmed || selectedSkills.includes(trimmed)) { setQuery(''); return; }
    onAdd(trimmed);
    setQuery('');
  };

  return (
    <View>
      {/* Selected pills */}
      {selectedSkills.length > 0 && (
        <View style={styles.pillRow}>
          {selectedSkills.map(s => (
            <TouchableOpacity key={s} style={styles.pill} onPress={() => onRemove(s)}>
              <Text style={styles.pillText}>{s}</Text>
              <X color={COLORS.rose} size={12} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input */}
      <View style={styles.skillInputRow}>
        <TextInput
          style={styles.skillInput}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleAddCustom}
        />
        {query.trim() !== '' && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAddCustom}>
            <Plus color="#fff" size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* Autocomplete dropdown */}
      {focused && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map(s => (
            <TouchableOpacity key={s} style={styles.dropdownItem} onPress={() => handlePick(s)}>
              <Text style={styles.dropdownText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const authUser = useSelector((s: RootState) => s.auth.user);
  const profile = useSelector((s: RootState) => s.profile.profile);

  // Local state — pre-filled from Redux
  const [displayName, setDisplayName] = useState(profile?.displayName ?? authUser?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.location?.city ?? '');
  const [country, setCountry] = useState(profile?.location?.country ?? '');
  const [teachSkills, setTeachSkills] = useState<string[]>(profile?.teachSkills ?? []);
  const [wantSkills, setWantSkills] = useState<string[]>(profile?.wantSkills ?? []);
  const [photoUri, setPhotoUri] = useState<string | null>(
    profile?.photoURL ?? authUser?.photoURL ?? null
  );
  const [isSaving, setIsSaving] = useState(false);

  const firebaseUser = getAuth().currentUser;

  // ── Photo Picker ─────────────────────────────────────────────────────────

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Allow photo library access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!displayName.trim() || !firebaseUser) return;
    setIsSaving(true);
    try {
      let finalPhotoURL: string | null = photoUri;

      // Only upload if the user picked a NEW local file (not an https URL)
      if (photoUri && !photoUri.startsWith('http')) {
        finalPhotoURL = await uploadProfilePhoto(firebaseUser.uid, photoUri);
      }

      // Update Firebase Auth displayName + photo
      await updateProfile(firebaseUser, {
        displayName: displayName.trim(),
        ...(finalPhotoURL ? { photoURL: finalPhotoURL } : {}),
      });

      // Build the updated profile document
      const updatedFields: Partial<UserDocument> = {
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: { city: city.trim(), country: country.trim() },
        teachSkills,
        wantSkills,
        hasPhoto: !!finalPhotoURL,
        ...(finalPhotoURL !== undefined ? { photoURL: finalPhotoURL } : {}),
      };

      // Save to Firestore
      await upsertUserProfile(firebaseUser.uid, updatedFields as any);

      // Sync Redux auth slice immediately (onAuthStateChanged won't re-fire)
      dispatch(setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName.trim(),
        photoURL: finalPhotoURL,
        isAnonymous: firebaseUser.isAnonymous,
      }));

      // Sync Redux profile slice immediately
      if (profile) {
        dispatch(setProfile({
          ...profile,
          ...updatedFields,
          photoURL: finalPhotoURL,
        } as UserDocument));
      }

      Alert.alert('✅ Saved', 'Your profile has been updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error('[EditProfile] Save error:', e);
      Alert.alert('Error', 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft color={COLORS.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickPhoto}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Camera color={COLORS.rose} size={32} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Camera color="#fff" size={14} />
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoHint}>Tap to change photo</Text>
        </View>

        {/* ── Display Name ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={COLORS.textMuted}
            maxLength={40}
          />
        </View>

        {/* ── Bio ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people a little about you..."
            placeholderTextColor={COLORS.textMuted}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.charCount}>{bio.length}/200</Text>
        </View>

        {/* ── Location ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              value={city}
              onChangeText={setCity}
              placeholder="City"
              placeholderTextColor={COLORS.textMuted}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={country}
              onChangeText={setCountry}
              placeholder="Country"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        {/* ── Skills I Teach ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Skills I Can Teach</Text>
          <Text style={styles.sublabel}>What can you offer to others?</Text>
          <SkillInput
            placeholder="e.g. Python, Guitar, Photography..."
            selectedSkills={teachSkills}
            onAdd={s => setTeachSkills(prev => [...prev, s])}
            onRemove={s => setTeachSkills(prev => prev.filter(x => x !== s))}
          />
        </View>

        {/* ── Skills I Want ── */}
        <View style={styles.field}>
          <Text style={styles.label}>Skills I Want to Learn</Text>
          <Text style={styles.sublabel}>What do you want to get from swaps?</Text>
          <SkillInput
            placeholder="e.g. Design, Cooking, Finance..."
            selectedSkills={wantSkills}
            onAdd={s => setWantSkills(prev => [...prev, s])}
            onRemove={s => setWantSkills(prev => prev.filter(x => x !== s))}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.rose,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 68,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  content: {
    padding: 20,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2.5,
    borderColor: COLORS.rose,
  },
  avatarPlaceholder: {
    backgroundColor: COLORS.roseDim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.rose,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  changePhotoHint: {
    marginTop: 10,
    color: COLORS.rose,
    fontSize: 13,
    fontWeight: '600',
  },
  // Fields
  field: {
    marginBottom: 22,
  },
  label: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  sublabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
  locationRow: {
    flexDirection: 'row',
  },
  // Skills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.pill,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.rose,
  },
  pillText: {
    color: COLORS.rose,
    fontSize: 13,
    fontWeight: '600',
  },
  skillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.rose,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: '#1a0505',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownText: {
    color: COLORS.text,
    fontSize: 14,
  },
});
