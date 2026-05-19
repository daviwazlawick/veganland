import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { apiForgotPassword } from '../services/apiService';
import { PremiumIcon } from '../components/ui';

export default function ForgotPasswordScreen({ navigation }) {
  const { language } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('', t(language, 'auth.enter_email'));
      return;
    }
    setLoading(true);
    try {
      await apiForgotPassword(email.trim());
      setSent(true);
    } catch {
      // Always show success to not reveal if email exists
      setSent(true);
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
          <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← {t(language, 'auth.back')}</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <PremiumIcon name="profile" size={46} />
            </View>
            <Text style={styles.title}>
              {t(language, 'auth.forgot_password')}
            </Text>
            <Text style={styles.subtitle}>
              {t(language, 'auth.forgot_password_subtitle')}
            </Text>
          </View>

          {sent ? (
            <View style={styles.card}>
              <PremiumIcon name="safe" size={48} />
              <Text style={styles.successTitle}>
                {t(language, 'auth.email_sent')}
              </Text>
              <Text style={styles.successText}>
                {t(language, 'auth.forgot_password_success')}
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
                <Text style={styles.btnText}>
                  {t(language, 'auth.back_to_login')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
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
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.9}
                disabled={loading}
              >
                <Text style={styles.btnText}>
                  {loading ? '...' : t(language, 'auth.send_link')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, padding: 24, gap: 24 },
  back: { paddingVertical: 4 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '700' },
  hero: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary + '40',
  },
  title: { fontSize: 30, fontWeight: '700', color: Colors.text, textAlign: 'center', fontFamily: 'serif' },
  subtitle: { fontSize: 14, color: Colors.textMuted, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 16,
    alignItems: 'stretch',
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
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: Colors.primaryDark,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  successTitle: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  successText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
