import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { registerForPushAsync, addNotificationResponseListener, getLastNotificationResponseAsync } from '../services/notificationsService';
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

  // Two separate dedupe sets: navigation must only ever fire once per tap
  // (re-running the effect on every token change shouldn't yank the user
  // back to the deep-linked screen); the analytics report must NOT be
  // marked done until it actually had a token to send with — on the very
  // first mount `token` is often still null (AsyncStorage hasn't hydrated
  // yet), and this effect re-runs once it does, so a report that couldn't
  // fire yet has to be retried on that later run rather than dropped.
  const navigatedIds = useRef(new Set());
  const reportedIds = useRef(new Set());

  useEffect(() => {
    function handleResponse(response, { waitForNav = false } = {}) {
      const id = response?.notification?.request?.identifier;
      const data = response?.notification?.request?.content?.data || {};
      const route = data.route;
      const params = data.params;
      const broadcastId = data.broadcast_id;
      const slot = data.slot;

      if (!id || !reportedIds.current.has(id)) {
        if (broadcastId && token) {
          apiReportPushClick(token, broadcastId).catch(() => {});
          if (id) reportedIds.current.add(id);
        } else if (slot && token) {
          apiReportNotificationTap(token, slot).catch(() => {});
          if (id) reportedIds.current.add(id);
        } else if (id && !broadcastId && !slot) {
          reportedIds.current.add(id); // nothing to report, don't retry forever
        }
      }

      if (!route || (id && navigatedIds.current.has(id))) return;
      const nav = () => {
        if (id) navigatedIds.current.add(id);
        try { navigationRef.current.navigate(route, params || undefined); } catch {}
      };
      if (navigationRef?.current?.isReady?.()) {
        nav();
      } else if (waitForNav) {
        // Cold start: the nav container may not be mounted yet. Poll briefly
        // instead of dropping the deep link.
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (navigationRef?.current?.isReady?.()) {
            clearInterval(interval);
            nav();
          } else if (attempts > 20) {
            clearInterval(interval);
          }
        }, 250);
      }
    }

    // Cold start: the app was fully closed and this tap is what launched it.
    // The live listener below never sees this one.
    getLastNotificationResponseAsync().then(response => {
      if (response) handleResponse(response, { waitForNav: true });
    });

    const sub = addNotificationResponseListener(response => handleResponse(response));
    return () => sub.remove();
  }, [navigationRef, token]);
}
