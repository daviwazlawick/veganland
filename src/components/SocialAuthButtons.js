import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { isAppleAuthAvailable, isGoogleAuthAvailable, initSocialAuth } from '../services/socialAuthService';
import { HIDE_GOOGLE_SIGNIN } from '../constants/features';

// Guard so OTA bundles pushed to older runtimes (which don't have the module
// linked yet) don't crash on load — the buttons just don't render.
let AppleAuthentication = null;
try { AppleAuthentication = require('expo-apple-authentication'); } catch {}

// Native-only social sign-in row. Shows Continue-with-Apple on iOS and
// Continue-with-Google whenever the Google client ID is configured. Silent on
// user-cancel; surfaces backend/provider errors via onError so screens can
// render them the way they render email/password errors.
export default function SocialAuthButtons({ disclaimerVersion, referralCode, onError, onSuccess }) {
  const { signInWithProvider } = useAuth();
  const { language } = useApp();
  const [busy, setBusy] = useState(null); // 'apple' | 'google' | null
  const showApple = isAppleAuthAvailable();
  const showGoogle = !HIDE_GOOGLE_SIGNIN && isGoogleAuthAvailable();

  useEffect(() => { initSocialAuth().catch(() => {}); }, []);

  if (!showApple && !showGoogle) return null;

  async function run(provider) {
    if (busy) return;
    setBusy(provider);
    try {
      const user = await signInWithProvider(provider, { disclaimerVersion, referralCode });
      onSuccess?.(user);
    } catch (e) {
      if (e?.userCancelled) return; // silent
      const msg = e?.message === 'apple_email_missing_reauth_required'
        ? t(language, 'auth.social_apple_reauth')
        : (e?.message || t(language, 'auth.social_failed'));
      onError?.(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.dividerText}>{t(language, 'auth.or')}</Text>
        <View style={styles.line} />
      </View>

      {showApple && AppleAuthentication?.AppleAuthenticationButton && (
        Platform.OS === 'ios' ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={14}
            style={styles.appleBtn}
            onPress={() => run('apple')}
          />
        ) : null
      )}

      {showGoogle && (
        <TouchableOpacity
          style={[styles.googleBtn, busy === 'google' && styles.btnDisabled]}
          onPress={() => run('google')}
          activeOpacity={0.85}
          disabled={!!busy}
        >
          {busy === 'google'
            ? <ActivityIndicator color="#3c4043" />
            : <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>{t(language, 'auth.continue_with_google')}</Text>
              </>
          }
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  appleBtn: { height: 50, width: '100%' },
  googleBtn: {
    height: 50, borderRadius: 14, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#dadce0',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  btnDisabled: { opacity: 0.6 },
  googleIcon: {
    fontSize: 20, fontWeight: '900', color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
  },
  googleText: { fontSize: 15, fontWeight: '700', color: '#3c4043' },
});
