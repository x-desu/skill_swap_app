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
import { signInWithEmail, signInWithGoogle, signInWithApple, clearError } from '../../src/store/authSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../../src/store';

export default function SignIn() {
  const dispatch = useAuthDispatch();
  const { isLoading, error, isAuthenticated, isProfileComplete } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Redirect after sign-in — fires after screen is mounted (navigator already ready)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(isProfileComplete ? '/(tabs)' : '/(auth)/profile-setup');
    }
  }, [isAuthenticated, isProfileComplete]);

  const handleEmailSignIn = async () => {
    if (!email || !password) return;
    dispatch(clearError());
    setActiveBtn('email');
    await dispatch(signInWithEmail({ email, password }));
    setActiveBtn(null);
  };

  const handleGoogle = async () => {
    dispatch(clearError());
    setActiveBtn('google');
    await dispatch(signInWithGoogle());
    setActiveBtn(null);
  };

  const handleApple = async () => {
    dispatch(clearError());
    setActiveBtn('apple');
    await dispatch(signInWithApple());
    setActiveBtn(null);
  };

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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to your SkillSwap account</Text>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Social buttons */}
        <View style={styles.socialRow}>
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogle}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading && activeBtn === 'google' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.socialBtnText}>
                <Text style={{ color: '#4285F4', fontWeight: '700' }}>G</Text>
                {'  '}Google
              </Text>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn]}
              onPress={handleApple}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading && activeBtn === 'apple' ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={[styles.socialBtnText, { color: '#000' }]}>
                   Apple
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email form */}
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
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Your password"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoComplete="password"
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.showHide}>
                <Text style={styles.showHideText}>{showPass ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleEmailSignIn}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading && activeBtn === 'email' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomLink}
          onPress={() => router.replace('/(auth)/sign-up')}
        >
          <Text style={styles.bottomLinkText}>
            No account?{' '}
            <Text style={styles.linkBold}>Create one</Text>
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
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  appleBtn: { backgroundColor: '#ffffff' },
  socialBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  form: { gap: 18, marginBottom: 28 },
  fieldWrapper: { gap: 6 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 },
  forgotText: { color: '#ff1a5c', fontSize: 13, fontWeight: '600' },
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
