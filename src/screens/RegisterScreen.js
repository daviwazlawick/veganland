import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LANGUAGES, t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import Brand from '../brand';
import { BrandName, BrandLogo } from '../components/ui';
import { apiResendConfirmationByEmail } from '../services/apiService';

const DISCLAIMER_VERSION = '1.0';

const DISCLAIMER_BLOCKS = [
  { icon: '🚫', key: 'block1' },
  { icon: '⛔', key: 'block2' },
  { icon: '🤖', key: 'block3' },
  { icon: 'ℹ️', key: 'block4' },
];

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { language, setLanguage } = useApp();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const languageIndex = LANGUAGES.findIndex(item => item.code === language);
  const currentLanguage = LANGUAGES[languageIndex] || LANGUAGES[0];
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length] || LANGUAGES[0];

  const legalBase = `https://${Brand.domain}/legal`;

  function handleNext() {
    if (!email.trim() || !password) { Alert.alert('', t(language, 'auth.fill_all')); return; }
    if (password.length < 6) { Alert.alert('', t(language, 'auth.password_min')); return; }
    if (password !== confirm) { Alert.alert('', t(language, 'auth.passwords_mismatch')); return; }
    if (!termsAccepted) { Alert.alert('', t(language, 'auth.terms_required')); return; }
    setStep(2);
  }

  async function handleRegister() {
    if (!disclaimerAccepted) { Alert.alert('', t(language, 'auth.disclaimer_required')); return; }
    setLoading(true);
    try {
      await register(email.trim(), password, DISCLAIMER_VERSION);
    } catch (e) {
      if (e.code === 'EMAIL_CONFIRMATION_REQUIRED') {
        setConfirmationEmail(e.email);
      } else {
        Alert.alert('', e.message || t(language, 'auth.register_failed'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await apiResendConfirmationByEmail(confirmationEmail);
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } catch {
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } finally {
      setResending(false);
    }
  }

  if (confirmationEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { justifyContent: 'center', gap: 28 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={[styles.logoCircle, { backgroundColor: Colors.primaryBg }]}>
              <Text style={{ fontSize: 48 }}>📧</Text>
            </View>
            <Text style={styles.checkTitle}>{t(language, 'auth.check_email_title')}</Text>
            <Text style={styles.checkSubtitle}>
              {t(language, 'auth.check_email_body', { email: confirmationEmail })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.btn, resending && styles.btnDisabled]}
            onPress={handleResend}
            activeOpacity={0.9}
            disabled={resending}
          >
            <Text style={styles.btnText}>
              {resendDone ? t(language, 'auth.resend_done') : resending ? '...' : t(language, 'auth.resend_confirmation')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.footerLink}>{t(language, 'auth.back_to_login')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: Disclaimer ──────────────────────────────────────────────────
  if (step === 2) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { justifyContent: 'flex-start' }]}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Text style={styles.backBtnText}>← {t(language, 'auth.back')}</Text>
          </TouchableOpacity>

          <View style={styles.disclaimerTopWrap}>
            <View style={styles.disclaimerIconCircle}>
              <Text style={styles.disclaimerTopIcon}>⚠️</Text>
            </View>
            <Text style={styles.disclaimerPageTitle}>{t(language, 'disclaimer.title')}</Text>
            <Text style={styles.disclaimerPageSubtitle}>{t(language, 'disclaimer.subtitle')}</Text>
          </View>

          <View style={styles.disclaimerBlocks}>
            {DISCLAIMER_BLOCKS.map(({ icon, key }) => (
              <View key={key} style={styles.disclaimerBlock}>
                <Text style={styles.disclaimerBlockIcon}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.disclaimerBlockTitle}>{t(language, `disclaimer.${key}_title`)}</Text>
                  <Text style={styles.disclaimerBlockBody}>{t(language, `disclaimer.${key}_body`)}</Text>
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setDisclaimerAccepted(v => !v)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkboxLarge, disclaimerAccepted && styles.checkboxLargeChecked]}>
              {disclaimerAccepted && <Text style={styles.checkmarkLarge}>✓</Text>}
            </View>
            <Text style={styles.checkRowLabel}>{t(language, 'disclaimer.checkbox')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, (!disclaimerAccepted || loading) && styles.btnDisabled]}
            onPress={handleRegister}
            activeOpacity={0.9}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? '...' : t(language, 'disclaimer.accept_register')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 1: Form ────────────────────────────────────────────────────────
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
            <BrandLogo size={94} />
            <BrandName
              style={styles.appName}
              prefixColor={Colors.navy}
              suffixColor={Colors.primary}
            />
            <Text style={styles.subtitle}>{t(language, 'auth.register_subtitle')}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t(language, 'auth.register_title')}</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
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
                onChangeText={setPassword}
                placeholder={t(language, 'auth.min_password_placeholder')}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{t(language, 'auth.confirm_password')}</Text>
              <TextInput
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                placeholder={t(language, 'auth.confirm_password_placeholder')}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setTermsAccepted(v => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termsText}>
                <Text>{t(language, 'auth.terms_agree_prefix')}</Text>
                <Text style={styles.termsLink} onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/terms`)}>
                  {t(language, 'auth.terms_link')}
                </Text>
                <Text>{t(language, 'auth.terms_agree_middle')}</Text>
                <Text style={styles.termsLink} onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/privacy`)}>
                  {t(language, 'auth.privacy_link')}
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, (!termsAccepted || loading) && styles.btnDisabled]}
              onPress={handleNext}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText}>{t(language, 'auth.next_step')} →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t(language, 'auth.already_have_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>{t(language, 'auth.sign_in')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, gap: 24, justifyContent: 'center' },
  langBtn: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.64)',
    borderRadius: 999, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  langText: { color: Colors.textLight, fontSize: 13, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  appName: {
    fontSize: 38, fontWeight: '800',
    fontFamily: BrandFonts.heading || 'serif',
    letterSpacing: -1,
  },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  checkTitle: {
    fontSize: 28, fontWeight: '800', color: Colors.text, textAlign: 'center',
    fontFamily: BrandFonts.heading || 'serif',
  },
  checkSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, fontWeight: '500' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 28, padding: 26,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.85)',
    gap: 16,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  cardTitle: {
    fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center',
    fontFamily: BrandFonts.headingMed || 'serif',
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: Colors.text, fontWeight: '600',
  },
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
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: Colors.white, fontSize: 17, fontWeight: '900',
    fontFamily: BrandFonts.heading || undefined,
  },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxChecked: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  checkmark: { color: Colors.white, fontSize: 13, fontWeight: '900', lineHeight: 16 },
  termsText: { flex: 1, fontSize: 13, color: Colors.textMuted, lineHeight: 20, fontWeight: '500' },
  termsLink: { color: Colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
  // Step 2 — disclaimer
  backBtn: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2, marginBottom: 4 },
  backBtnText: { fontSize: 14, color: Colors.primary, fontWeight: '700' },
  disclaimerTopWrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  disclaimerIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#FFF3CD',
    alignItems: 'center', justifyContent: 'center',
  },
  disclaimerTopIcon: { fontSize: 32 },
  disclaimerPageTitle: {
    fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center',
    fontFamily: BrandFonts.heading || undefined,
  },
  disclaimerPageSubtitle: {
    fontSize: 13, color: Colors.textMuted, textAlign: 'center', fontWeight: '500',
  },
  disclaimerBlocks: { gap: 10 },
  disclaimerBlock: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  disclaimerBlockIcon: { fontSize: 20, marginTop: 1 },
  disclaimerBlockTitle: {
    fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 4,
  },
  disclaimerBlockBody: {
    fontSize: 13, color: Colors.textLight, lineHeight: 19,
  },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF8E7',
    borderRadius: 16, padding: 16,
    borderWidth: 1.5, borderColor: '#F5A623',
  },
  checkboxLarge: {
    width: 26, height: 26, borderRadius: 7,
    borderWidth: 2, borderColor: '#F5A623',
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1, flexShrink: 0,
  },
  checkboxLargeChecked: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  checkmarkLarge: { color: '#fff', fontSize: 15, fontWeight: '900' },
  checkRowLabel: {
    flex: 1, fontSize: 13, color: '#5C3D00',
    lineHeight: 20, fontWeight: '600',
  },
  logoCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
  },
});
