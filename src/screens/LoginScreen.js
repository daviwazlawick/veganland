import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Colors } from '../constants/colors';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { language } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pt = language === 'pt';

  async function handleLogin() {
    setErrorMessage('');
    if (!email.trim() || !password) {
      Alert.alert('', pt ? 'Preencha email e senha' : 'Enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      const message = e.status === 401
        ? (pt ? 'Email ou senha incorretos.' : 'Incorrect email or password.')
        : (e.message || (pt ? 'Erro ao entrar' : 'Login failed'));
      setErrorMessage(message);
      Alert.alert('', message);
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
          <View style={styles.hero}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🌱</Text>
            </View>
            <Text style={styles.appName}>VeganLand</Text>
            <Text style={styles.tagline}>
              {pt ? 'Sua vida vegana, mais fácil' : 'Your vegan life, simpler'}
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {pt ? 'Entrar na sua conta' : 'Sign in to your account'}
            </Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder={pt ? 'seu@email.com' : 'your@email.com'}
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>{pt ? 'Senha' : 'Password'}</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errorMessage) setErrorMessage('');
                }}
                placeholder={pt ? 'Sua senha' : 'Your password'}
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />
            </View>

            {!!errorMessage && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.9}
              disabled={loading}
            >
              <Text style={styles.btnText}>
                {loading ? '⏳' : '🌿'} {pt ? 'Entrar' : 'Sign in'}
              </Text>
            </TouchableOpacity>

          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {pt ? 'Não tem conta? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.footerLink}>
                {pt ? 'Criar conta' : 'Create account'}
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
  hero: { alignItems: 'center', gap: 10, paddingVertical: 16 },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary + '40',
  },
  logoEmoji: { fontSize: 48 },
  appName: { fontSize: 36, fontWeight: '900', color: Colors.primary },
  tagline: { fontSize: 14, color: Colors.textMuted, fontWeight: '500', textAlign: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: '900', color: Colors.text, textAlign: 'center', marginBottom: 4 },
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
  errorBox: {
    backgroundColor: Colors.dangerLight || '#FEE2E2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.danger + '55',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: { color: Colors.dangerDark || Colors.danger, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: Colors.primaryDark,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  footerLink: { fontSize: 14, color: Colors.accent, fontWeight: '800' },
});
