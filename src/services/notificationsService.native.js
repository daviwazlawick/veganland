import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Returns the Expo push token (ExponentPushToken[...]) or null if the user
// declined or the device can't receive pushes (simulator/sideload).
export async function registerForPushAsync() {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    } catch {}
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const ask = await Notifications.requestPermissionsAsync();
    status = ask.status;
  }
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId) return null;

  try {
    const r = await Notifications.getExpoPushTokenAsync({ projectId });
    return r.data || null;
  } catch {
    return null;
  }
}

export function addNotificationResponseListener(handler) {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

// The live listener above only fires for taps that happen while the JS
// runtime is already up. A tap that cold-launches the app (the most common
// case for a re-engagement push — the app was fully closed) never reaches
// it; this separately returns "the response that most recently caused the
// app to open", which the caller checks once on mount.
export async function getLastNotificationResponseAsync() {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch {
    return null;
  }
}

export function setNotificationHandler() {
  // Handler already configured at module load above; this export exists so
  // both web and native share the same surface.
}
