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
import { PremiumIcon } from '../components/ui';
import { apiResendConfirmationByEmail } from '../services/apiService';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { language, setLanguage } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const languageIndex = LANGUAGES.findIndex(item => item.code === language);
  const currentLanguage = LANGUAGES[languageIndex] || LANGUAGES[0];
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length] || LANGUAGES[0];

  async function handleRegister() {
    if (!email.trim() || !password) {
      Alert.alert('', t(language, 'auth.fill_all'));
      return;
    }
    if (!termsAccepted) {
      Alert.alert('', t(language, 'auth.terms_required'));
      return;
    }
    if (password.length < 6) {
      Alert.alert('', t(language, 'auth.password_min'));
      return;
    }
    if (password !== confirm) {
      Alert.alert('', t(language, 'auth.passwords_mismatch'));
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password);
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
    } catch (e) {
      // silent — always show success to not reveal account existence
      setResendDone(true);
      setTimeout(() => setResendDone(false), 3000);
    } finally {
      setResending(false);
    }
  }

  if (confirmationEmail) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={[styles.scroll, { justifyContent: 'center', gap: 28 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.logoCircle, { backgroundColor: Colors.primaryBg }]}>
              <Text style={{ fontSize: 48 }}>📧</Text>
            </View>
            <Text style={styles.title}>{t(language, 'auth.check_email_title')}</Text>
            <Text style={[styles.subtitle, { textAlign: 'center' }]}>
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.langBtn} onPress={() => setLanguage(nextLanguage.code)}>
            <Text style={styles.langText}>{currentLanguage.flag}</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <PremiumIcon name="profile" size={50} />
            </View>
            <Text style={styles.title}>
              {t(language, 'auth.register_title')}
            </Text>
            <Text style={styles.subtitle}>
              {t(language, 'auth.register_subtitle')}
            </Text>
          </View>

          <View style={styles.card}>
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
                <Text
                  style={styles.termsLink}
                  onPress={() => WebBrowser.openBrowserAsync('https://veganland.app/legal/terms')}
                >{t(language, 'auth.terms_link')}</Text>
                <Text>{t(language, 'auth.terms_agree_middle')}</Text>
                <Text
                  style={styles.termsLink}
                  onPress={() => WebBrowser.openBrowserAsync('https://veganland.app/legal/privacy')}
                >{t(language, 'auth.privacy_link')}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, (!termsAccepted || loading) && styles.btnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? '...' : t(language, 'auth.create_account')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {t(language, 'auth.already_have_account')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.footerLink}>
                {t(language, 'auth.sign_in')}
              </Text>
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  langText: { color: Colors.textLight, fontSize: 13, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  logoCircle: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  title: { fontSize: 32, fontWeight: '700', color: Colors.text, textAlign: 'center', fontFamily: 'serif' },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 21 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.85)',
    gap: 16,
    shadowColor: Colors.darkSurface,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 10,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
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
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
});
