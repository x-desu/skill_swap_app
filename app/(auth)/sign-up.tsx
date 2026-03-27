import { useState, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthDispatch } from '../../src/hooks/useAuth';
import { signUpWithEmail, clearError } from '../../src/store/authSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../../src/store';

export default function SignUp() {
  const dispatch = useAuthDispatch();
  const { isLoading, error, isAuthenticated, isProfileComplete } = useSelector((s: RootState) => s.auth);

  // Redirect after successful sign-up
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.replace(isProfileComplete ? '/(tabs)' : '/(auth)/profile-setup');
    }
  }, [isAuthenticated, isProfileComplete, isLoading]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [validationError, setValidationError] = useState('');

  const validate = () => {
    if (!email.includes('@')) return 'Enter a valid email address';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirm) return 'Passwords do not match';
    return null;
  };

  const handleSignUp = async () => {
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError('');
    dispatch(clearError());
    await dispatch(signUpWithEmail({ email, password }));
    // onAuthStateChanged will fire → index.tsx redirects to profile-setup
  };

  const displayError = validationError || error;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#0d0202', '#1a0505', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join SkillSwap and start trading skills</Text>

        {/* Error */}
        {displayError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        ) : null}

        {/* Fields */}
        <View style={styles.form}>
          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="At least 8 characters"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={styles.showHide}
                onPress={() => setShowPass(!showPass)}
              >
                <Text style={styles.showHideText}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor="rgba(255,255,255,0.25)"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showPass}
              autoComplete="new-password"
            />
          </View>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSignUp}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Sign in link */}
        <TouchableOpacity
          style={styles.bottomLink}
          onPress={() => router.replace('/(auth)/sign-in')}
        >
          <Text style={styles.bottomLinkText}>
            Already have an account? <Text style={styles.linkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flexGrow: 1, padding: 28, paddingTop: 60 },
  backBtn: { marginBottom: 32 },
  backText: { color: '#ff1a5c', fontSize: 15, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 28 },
  errorBox: {
    backgroundColor: 'rgba(255,26,92,0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,26,92,0.4)',
    marginBottom: 16,
  },
  errorText: { color: '#ff1a5c', fontSize: 13 },
  form: { gap: 18, marginBottom: 28 },
  fieldWrapper: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  passRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  showHide: { paddingHorizontal: 4 },
  showHideText: { color: '#ff1a5c', fontSize: 13, fontWeight: '600' },
  submitBtn: {
    backgroundColor: '#ff1a5c',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  bottomLink: { alignItems: 'center' },
  bottomLinkText: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  linkBold: { color: '#ff1a5c', fontWeight: '600' },
});
