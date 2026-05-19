import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';
import { apiForgotPassword } from '../services/apiService';

export default function ForgotPasswordScreen({ navigation }) {
  const { language } = useApp();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const pt = language === 'pt';

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('', pt ? 'Digite seu email' : 'Enter your email');
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
            <Text style={styles.backText}>← {pt ? 'Voltar' : 'Back'}</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🔑</Text>
            </View>
            <Text style={styles.title}>
              {pt ? 'Esqueceu a senha?' : 'Forgot password?'}
            </Text>
            <Text style={styles.subtitle}>
              {pt
                ? 'Enviaremos um link para você redefinir sua senha.'
                : 'We\'ll send you a link to reset your password.'}
            </Text>
          </View>

          {sent ? (
            <View style={styles.card}>
              <Text style={styles.successEmoji}>✉️</Text>
              <Text style={styles.successTitle}>
                {pt ? 'Email enviado!' : 'Email sent!'}
              </Text>
              <Text style={styles.successText}>
                {pt
                  ? 'Se esse email estiver cadastrado, você receberá as instruções em breve. Verifique também a pasta de spam.'
                  : 'If this email is registered, you\'ll receive instructions shortly. Check your spam folder too.'}
              </Text>
              <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
                <Text style={styles.btnText}>
                  🌿 {pt ? 'Voltar ao login' : 'Back to login'}
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
                  placeholder={pt ? 'seu@email.com' : 'your@email.com'}
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
                  {loading ? '⏳' : '🔑'} {pt ? 'Enviar link' : 'Send link'}
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
  logoEmoji: { fontSize: 38 },
  title: { fontSize: 26, fontWeight: '900', color: Colors.text, textAlign: 'center' },
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
  successEmoji: { fontSize: 48, textAlign: 'center' },
  successTitle: { fontSize: 22, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  successText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
