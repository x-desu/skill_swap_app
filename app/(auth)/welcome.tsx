import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthDispatch } from '../../src/hooks/useAuth';
import { signInWithGoogle, signInWithApple, clearError } from '../../src/store/authSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../../src/store';

export default function Welcome() {
  const dispatch = useAuthDispatch();
  const { isLoading, error, isAuthenticated, isProfileComplete } = useSelector((s: RootState) => s.auth);
  const [activeBtn, setActiveBtn] = useState<string | null>(null);

  // Redirect after sign-in (fires after Stack is mounted, so navigator is ready)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(isProfileComplete ? '/(tabs)' : '/(auth)/profile-setup');
    }
  }, [isAuthenticated, isProfileComplete]);

  const handleGoogle = async () => {
    setActiveBtn('google');
    dispatch(clearError());
    await dispatch(signInWithGoogle());
    setActiveBtn(null);
  };

  const handleApple = async () => {
    setActiveBtn('apple');
    dispatch(clearError());
    await dispatch(signInWithApple());
    setActiveBtn(null);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0d0202', '#1a0505', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.iconWrapper}>
            <Image
              source={require('../../assets/skillswap-icon.png')}
              style={styles.icon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.appName}>SkillSwap</Text>
          <Text style={styles.tagline}>Trade skills. Grow together.</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonArea}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Google */}
          <TouchableOpacity
            style={styles.socialBtn}
            onPress={handleGoogle}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading && activeBtn === 'google' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple — iOS only */}
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
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={[styles.socialBtnText, { color: '#000' }]}>
                    Continue with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email sign up */}
          <TouchableOpacity
            style={styles.emailBtn}
            onPress={() => router.push('/(auth)/sign-up')}
            activeOpacity={0.8}
          >
            <Text style={styles.emailBtnText}>Sign up with Email</Text>
          </TouchableOpacity>

          {/* Sign in link */}
          <TouchableOpacity
            style={styles.signInLink}
            onPress={() => router.push('/(auth)/sign-in')}
          >
            <Text style={styles.signInLinkText}>
              Already have an account?{' '}
              <Text style={styles.signInLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 80,
    paddingBottom: 40,
  },
  logoArea: { alignItems: 'center', marginBottom: 48 },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,26,92,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,26,92,0.3)',
  },
  icon: { width: 64, height: 64 },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
  },
  buttonArea: { gap: 12 },
  errorBox: {
    backgroundColor: 'rgba(255,26,92,0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,26,92,0.4)',
  },
  errorText: { color: '#ff1a5c', fontSize: 13, textAlign: 'center' },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    height: 54,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 10,
  },
  googleG: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  socialBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  appleBtn: { backgroundColor: '#ffffff' },
  appleIcon: { fontSize: 18, color: '#000' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },
  emailBtn: {
    backgroundColor: '#ff1a5c',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  signInLink: { alignItems: 'center', paddingVertical: 8 },
  signInLinkText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  signInLinkBold: { color: '#ff1a5c', fontWeight: '600' },
  terms: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 24,
  },
});
