import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { registerForPushAsync, addNotificationResponseListener } from '../services/notificationsService';
import { apiRegisterPush, apiReportPushClick, apiReportNotificationTap } from '../services/apiService';

// Registers the device for push once disclaimer is accepted and user is logged in.
// Also wires the tap handler so a notification with `data.route` deep-links inside the app.
export default function usePushNotifications(navigationRef) {
  const { token } = useAuth();
  const { language, disclaimerAccepted } = useApp();
  const registered = useRef(false);

  useEffect(() => {
    if (!token || !disclaimerAccepted || registered.current) return;
    let cancelled = false;
    (async () => {
      const pushToken = await registerForPushAsync();
      if (!pushToken || cancelled) return;
      const ok = await apiRegisterPush(token, {
        token: pushToken,
        platform: Platform.OS,
        locale: language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (ok) registered.current = true;
    })();
    return () => { cancelled = true; };
  }, [token, disclaimerAccepted, language]);

  useEffect(() => {
    const sub = addNotificationResponseListener(response => {
      const data = response?.notification?.request?.content?.data || {};
      const route = data.route;
      const params = data.params;
      const broadcastId = data.broadcast_id;
      const slot = data.slot;
      if (broadcastId && token) {
        apiReportPushClick(token, broadcastId).catch(() => {});
      } else if (slot && token) {
        apiReportNotificationTap(token, slot).catch(() => {});
      }
      if (route && navigationRef?.current?.isReady?.()) {
        try { navigationRef.current.navigate(route, params || undefined); } catch {}
      }
    });
    return () => sub.remove();
  }, [navigationRef, token]);
}
