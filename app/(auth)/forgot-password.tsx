import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthDispatch } from '../../src/hooks/useAuth';
import { sendPasswordReset, clearError } from '../../src/store/authSlice';
import { useSelector } from 'react-redux';
import type { RootState } from '../../src/store';

export default function ForgotPassword() {
  const dispatch = useAuthDispatch();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.includes('@')) return;
    dispatch(clearError());
    const result = await dispatch(sendPasswordReset(email));
    if (sendPasswordReset.fulfilled.match(result)) {
      setSent(true);
    }
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
      <View style={styles.inner}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successMsg}>
              We've sent a password reset link to {email}
            </Text>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() => router.replace('/(auth)/sign-in')}
            >
              <Text style={styles.submitText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Reset password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send a reset link
            </Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

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
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleReset}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  inner: { flex: 1, padding: 28, paddingTop: 60 },
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
  fieldWrapper: { gap: 6, marginBottom: 28 },
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
  submitBtn: {
    backgroundColor: '#ff1a5c',
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  successBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,26,92,0.15)',
    textAlign: 'center',
    lineHeight: 72,
    fontSize: 32,
    color: '#ff1a5c',
    overflow: 'hidden',
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  successMsg: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 22 },
});
