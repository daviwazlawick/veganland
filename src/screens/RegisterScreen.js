import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { LANGUAGES, t } from '../i18n';
import { Colors } from '../constants/colors';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { language, setLanguage } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const languageIndex = LANGUAGES.findIndex(item => item.code === language);
  const currentLanguage = LANGUAGES[languageIndex] || LANGUAGES[0];
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length] || LANGUAGES[0];

  async function handleRegister() {
    if (!email.trim() || !password) {
      Alert.alert('', t(language, 'auth.fill_all'));
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
      Alert.alert('', e.message || t(language, 'auth.register_failed'));
    } finally {
      setLoading(false);
    }
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
            <Text style={styles.langText}>{currentLanguage.flag} {currentLanguage.code.toUpperCase()}</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🐾</Text>
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
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? '⏳' : '🐾'} {t(language, 'auth.create_account')}
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
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  langText: { color: Colors.textLight, fontSize: 13, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.accent + '40',
  },
  logoEmoji: { fontSize: 42 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 13, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 14,
  },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.3 },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  btn: {
    backgroundColor: Colors.accent,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: Colors.accentDark,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  footerLink: { fontSize: 14, color: Colors.primary, fontWeight: '800' },
});
