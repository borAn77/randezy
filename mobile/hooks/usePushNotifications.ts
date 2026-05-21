import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { api, setAuthToken } from '../lib/api';

// Show notification banners while app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Randevular',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync();
  return token;
}

async function registerTokenWithBackend(token: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { console.log('[push] no session'); return; }

  console.log('[push] registering token:', token.slice(0, 30) + '...');
  setAuthToken(session.access_token);
  try {
    await api.put('/businesses/me/push-token', { token });
    console.log('[push] token saved to backend ✓');
  } catch (e: any) {
    console.log('[push] save failed:', e?.response?.status, e?.message);
  }
}

export function usePushNotifications() {
  useEffect(() => {
    getExpoPushToken().then(token => {
      if (token) registerTokenWithBackend(token);
    });
  }, []);
}
