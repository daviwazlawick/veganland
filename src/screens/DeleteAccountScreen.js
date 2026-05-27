import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { apiDeleteAccount } from '../services/apiService';

export default function DeleteAccountScreen({ navigation }) {
  const { language } = useApp();
  const { user, token, logout } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    if (!confirmed) return;
    setError(null);
    setLoading(true);
    try {
      await apiDeleteAccount(token);
      await logout();
    } catch {
      setError(t(language, 'delete_account.error'));
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'delete_account.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>{t(language, 'delete_account.warning')}</Text>
        </View>

        <View style={styles.emailCard}>
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{user?.email}</Text>
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setConfirmed(v => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, confirmed && styles.checkboxChecked]}>
            {confirmed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>{t(language, 'delete_account.confirm_label')}</Text>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.deleteBtn, !confirmed && styles.deleteBtnDisabled]}
          onPress={handleDelete}
          activeOpacity={confirmed ? 0.85 : 1}
          disabled={!confirmed || loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.deleteBtnText}>{t(language, 'delete_account.confirm_btn')}</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Text style={styles.cancelBtnText}>{t(language, 'delete_account.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  content: { padding: 20, gap: 16, paddingBottom: 160 },
  warningCard: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: Colors.danger + '40',
    alignItems: 'center', gap: 12,
  },
  warningIcon: { fontSize: 36 },
  warningText: {
    fontSize: 14, color: Colors.dangerDark, textAlign: 'center',
    lineHeight: 22, fontWeight: '600',
  },
  emailCard: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: Colors.border, gap: 4,
  },
  emailLabel: {
    fontSize: 11, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  emailValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  checkRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    padding: 4,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  checkmark: { color: Colors.white, fontSize: 14, fontWeight: '900' },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.text, lineHeight: 22, fontWeight: '500' },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: 'center', fontWeight: '600' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32, gap: 10,
    backgroundColor: 'rgba(250,248,244,0.96)',
  },
  deleteBtn: {
    backgroundColor: Colors.danger,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.danger, shadowOpacity: 0.3,
    shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  deleteBtnDisabled: { backgroundColor: Colors.border, shadowOpacity: 0 },
  deleteBtnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  cancelBtn: {
    borderRadius: 18, paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textMuted, fontSize: 16, fontWeight: '700' },
});
