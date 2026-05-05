// apps/mobile/app/onboarding.tsx
import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, Animated,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const COLORS = {
  bg: '#0F172A', accent: '#6C63FF', text: '#F8FAFC', subtext: '#94A3B8',
};

const SLIDES = [
  {
    emoji: '🌍',
    title: 'Skills become income',
    subtitle: 'Connect your talent with people who need it — right here in Cyprus.',
    gradient: ['#6C63FF', '#4F46E5'],
  },
  {
    emoji: '📅',
    title: 'Book in seconds',
    subtitle: 'Find, chat, schedule, and pay — everything in one simple app.',
    gradient: ['#06B6D4', '#0891B2'],
  },
  {
    emoji: '💰',
    title: 'Get paid directly',
    subtitle: 'Zero platform fees. Every euro you earn goes straight to you.',
    gradient: ['#10B981', '#059669'],
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (activeIndex < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIndex + 1 });
    } else {
      handleDone();
    }
  };

  const handleDone = async () => {
    await SecureStore.setItemAsync('onboarding_complete', 'true');
    router.replace('/(auth)/login');
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
        renderItem={({ item }) => (
          <LinearGradient
            colors={[...item.gradient, COLORS.bg] as any}
            style={styles.slide}
            locations={[0, 0.5, 1]}
          >
            <View style={styles.slideContent}>
              <Text style={styles.emoji}>{item.emoji}</Text>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          </LinearGradient>
        )}
        keyExtractor={(_, i) => i.toString()}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, activeIndex === i && styles.dotActive]} />
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDone}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  slide: { width, flex: 1 },
  slideContent: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40,
  },
  emoji: { fontSize: 80, marginBottom: 32 },
  title: {
    fontSize: 34, fontWeight: '900', color: COLORS.text,
    textAlign: 'center', lineHeight: 42, marginBottom: 16,
  },
  subtitle: {
    fontSize: 18, color: 'rgba(255,255,255,0.7)',
    textAlign: 'center', lineHeight: 28,
  },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: COLORS.accent, width: 24 },
  actions: { paddingHorizontal: 24, gap: 12, paddingBottom: 8 },
  nextBtn: {
    backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center',
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  skipText: { fontSize: 15, color: COLORS.subtext, textAlign: 'center', paddingVertical: 8 },
});


// ─────────────────────────────────────────────────────────────
// apps/mobile/app/(auth)/login.tsx

export function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <View style={[authStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView contentContainerStyle={authStyles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={authStyles.logoSection}>
          <View style={authStyles.logoIcon}>
            <Text style={authStyles.logoIconText}>⚡</Text>
          </View>
          <Text style={authStyles.logoText}>LOKASK</Text>
          <Text style={authStyles.tagline}>Skills · Services · Cyprus</Text>
        </View>

        <Text style={authStyles.heading}>Welcome back</Text>

        {error ? (
          <View style={authStyles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#EF4444" />
            <Text style={authStyles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={authStyles.form}>
          <View style={authStyles.inputGroup}>
            <Text style={authStyles.inputLabel}>Email</Text>
            <View style={authStyles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#94A3B8" />
              <TextInput
                style={authStyles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#475569"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={authStyles.inputGroup}>
            <Text style={authStyles.inputLabel}>Password</Text>
            <View style={authStyles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" />
              <TextInput
                style={authStyles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18} color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[authStyles.primaryBtn, loading && { opacity: 0.6 }]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={authStyles.primaryBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={authStyles.divider}>
            <View style={authStyles.dividerLine} />
            <Text style={authStyles.dividerText}>or</Text>
            <View style={authStyles.dividerLine} />
          </View>

          <TouchableOpacity style={authStyles.socialBtn} onPress={signInWithGoogle}>
            <Text style={authStyles.googleG}>G</Text>
            <Text style={authStyles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

        <View style={authStyles.footer}>
          <Text style={authStyles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
            <Text style={authStyles.footerLink}>Sign up free</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Re-export with name for expo-router
import { useState, useRef as useRefImport } from 'react';
import {
  ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';

export default LoginScreen;

const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },
  logoSection: { alignItems: 'center', paddingVertical: 40 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: `${COLORS.accent}20`, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: `${COLORS.accent}50`, marginBottom: 12,
  },
  logoIconText: { fontSize: 36 },
  logoText: { fontSize: 28, fontWeight: '900', color: COLORS.text, letterSpacing: 3 },
  tagline: { fontSize: 13, color: COLORS.subtext, marginTop: 4 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text, marginBottom: 20 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EF444420', borderRadius: 10, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#EF444440',
  },
  errorText: { fontSize: 14, color: '#EF4444', flex: 1 },
  form: { gap: 16 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  input: { flex: 1, color: COLORS.text, fontSize: 15 },
  primaryBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#334155' },
  dividerText: { fontSize: 14, color: COLORS.subtext },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#1E293B', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#334155',
  },
  googleG: { fontSize: 18, fontWeight: '800', color: '#EA4335' },
  socialBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: COLORS.subtext },
  footerLink: { fontSize: 14, fontWeight: '700', color: COLORS.accent },
});
