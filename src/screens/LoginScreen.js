import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LANGUAGES, t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { BrandName, BrandLogo } from '../components/ui';
import { apiResendConfirmationByEmail } from '../services/apiService';
import SocialAuthButtons from '../components/SocialAuthButtons';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { language, setLanguage } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const languageIndex = LANGUAGES.findIndex(item => item.code === language);
  const currentLanguage = LANGUAGES[languageIndex] || LANGUAGES[0];
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length] || LANGUAGES[0];

  async function handleLogin() {
    setErrorMessage('');
    setNeedsConfirmation(false);
    if (!email.trim() || !password) {
      setErrorMessage(t(language, 'auth.missing_login'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      if (e.status === 403 && e.data?.error === 'email_not_confirmed') {
        setNeedsConfirmation(true);
      } else {
        const message = e.status === 401
          ? t(language, 'auth.invalid_credentials')
          : (e.message || t(language, 'auth.login_failed'));
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await apiResendConfirmationByEmail(email.trim());
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } catch {
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.langBtn} onPress={() => setLanguage(nextLanguage.code)}>
            <Text style={styles.langText}>{currentLanguage.flag}</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <BrandLogo size={72} />
            <BrandName
              style={styles.appName}
              prefixColor={Colors.navy}
              suffixColor={Colors.primary}
            />
            <Text style={styles.tagline}>{t(language, 'auth.tagline')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'auth.login_title')}</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => { setEmail(value); if (errorMessage) setErrorMessage(''); }}
                placeholder={t(language, 'auth.email_placeholder')}
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t(language, 'auth.password')}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(value) => { setPassword(value); if (errorMessage) setErrorMessage(''); }}
                placeholder={t(language, 'auth.password_placeholder')}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            {needsConfirmation && (
              <View style={styles.confirmationBox}>
                <Text style={styles.confirmationText}>{t(language, 'auth.email_not_confirmed')}</Text>
                <TouchableOpacity onPress={handleResend} disabled={resending} style={styles.resendBtn}>
                  <Text style={styles.resendText}>
                    {resendDone ? t(language, 'auth.resend_done') : resending ? '...' : t(language, 'auth.resend_confirmation')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.btnText}>{loading ? '...' : t(language, 'auth.sign_in')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotText}>{t(language, 'auth.forgot_password')}</Text>
            </TouchableOpacity>

            <SocialAuthButtons
              onError={(msg) => setErrorMessage(msg)}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t(language, 'auth.no_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>{t(language, 'auth.create_account')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 4, justifyContent: 'flex-start' },
  langBtn: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 5,
  },
  langText: { color: Colors.textLight, fontSize: 13, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 6, paddingTop: 0, paddingBottom: 4, marginBottom: 18 },
  appName: {
    fontSize: 36, fontWeight: '800',
    fontFamily: BrandFonts.heading || undefined,
    letterSpacing: -1,
  },
  tagline: { fontSize: 15, color: Colors.textLight, fontWeight: '500', textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 26,
    borderWidth: 1, borderColor: Colors.border,
    gap: 18,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 4,
    fontFamily: BrandFonts.headingMed || undefined,
  },
  field: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.5, textTransform: 'uppercase' },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text, fontWeight: '600',
  },
  errorBox: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 12, borderWidth: 1, borderColor: Colors.danger + '55',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  errorText: { color: Colors.dangerDark, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 16, paddingVertical: 18, alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: Colors.primaryDark,
    shadowColor: Colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: {
    color: Colors.white, fontSize: 17, fontWeight: '900',
    fontFamily: BrandFonts.heading || undefined,
  },
  confirmationBox: {
    backgroundColor: '#FEF9C3',
    borderRadius: 12, borderWidth: 1, borderColor: '#FDE047',
    paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, alignItems: 'center',
  },
  confirmationText: { color: '#854D0E', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  resendBtn: { paddingVertical: 4 },
  resendText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  forgotBtn: { alignItems: 'center', paddingVertical: 4 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 16 },
  footerText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
});
