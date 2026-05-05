// apps/mobile/app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useAuthStore, supabase } from '../store/auth';
import { I18nextProvider } from 'react-i18next';
import i18n from '../utils/i18n';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function RootLayout() {
  const { setSession, initialized } = useAuthStore();

  useEffect(() => {
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
      }
    );

    // Register for push notifications
    registerForPushNotifications();

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialized) {
      SplashScreen.hideAsync();
    }
  }, [initialized]);

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen
            name="service/[id]"
            options={{ headerShown: true, title: '' }}
          />
          <Stack.Screen
            name="booking/[id]"
            options={{ headerShown: true, title: 'Booking' }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{ headerShown: true }}
          />
          <Stack.Screen
            name="provider/[id]"
            options={{ headerShown: true, title: '' }}
          />
        </Stack>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Save FCM token to backend
    const { data: session } = await supabase.auth.getSession();
    if (session.session) {
      await supabase
        .from('users')
        .update({ fcm_token: token })
        .eq('id', session.session.user.id);
    }
  } catch (err) {
    console.warn('Push notification registration failed:', err);
  }
}
