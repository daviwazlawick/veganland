import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useReferral } from '../context/ReferralContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

export default function PendingReferralPrompt() {
  const { language } = useApp();
  const { token } = useAuth();
  const { pendingCode, redeem, dismissPendingCode } = useReferral();
  const [busy, setBusy] = useState(false);

  // Only offer to apply the code once the user is signed in. Before that
  // the code stays in AsyncStorage so RegisterScreen can pre-fill it.
  if (!pendingCode || !token) return null;

  async function applyCode() {
    setBusy(true);
    const r = await redeem(pendingCode);
    setBusy(false);
    if (r.ok) {
      Alert.alert(t(language, 'referral.applied_title'), t(language, 'referral.applied_body'));
    } else {
      const key = `referral.error_${r.error || 'generic'}`;
      Alert.alert(t(language, 'referral.error_title'), t(language, key));
      await dismissPendingCode();
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissPendingCode}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🎁</Text>
          <Text style={styles.title}>{t(language, 'referral.pending_modal_title')}</Text>
          <View style={styles.codeBox}><Text style={styles.codeText}>{pendingCode}</Text></View>
          <Text style={styles.body}>{t(language, 'referral.pending_modal_body', { code: pendingCode })}</Text>
          <TouchableOpacity onPress={applyCode} disabled={busy} style={[styles.btn, styles.btnPrimary, busy && { opacity: 0.6 }]}>
            <Text style={styles.btnPrimaryText}>{busy ? '…' : t(language, 'referral.pending_modal_apply')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={dismissPendingCode} style={styles.btn}>
            <Text style={styles.btnText}>{t(language, 'referral.pending_modal_dismiss')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 26, alignItems: 'center', maxWidth: 360, width: '100%' },
  emoji: { fontSize: 48, marginBottom: 6 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.navy || '#0B1E3F', textAlign: 'center', marginBottom: 12 },
  codeBox: { backgroundColor: '#F4F6FA', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.navy || '#0B1E3F' },
  codeText: { fontSize: 28, fontWeight: '800', letterSpacing: 6, color: Colors.navy || '#0B1E3F', fontFamily: 'Courier' },
  body: { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: { paddingVertical: 13, paddingHorizontal: 24, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 8 },
  btnPrimary: { backgroundColor: Colors.navy || '#0B1E3F' },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  btnText: { color: Colors.headerMuted, fontWeight: '600' },
});
