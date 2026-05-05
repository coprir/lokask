// apps/mobile/app/index.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth';
import * as SecureStore from 'expo-secure-store';

const COLORS = { bg: '#0F172A', accent: '#6C63FF' };

export default function Index() {
  const { user, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) return;

    const redirect = async () => {
      const hasSeenOnboarding = await SecureStore.getItemAsync('onboarding_complete');

      if (!user) {
        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
        } else {
          router.replace('/(auth)/login');
        }
      } else {
        router.replace('/(tabs)');
      }
    };

    redirect();
  }, [user, initialized]);

  return (
    <View style={{
      flex: 1,
      backgroundColor: COLORS.bg,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <ActivityIndicator size="large" color={COLORS.accent} />
    </View>
  );
}
