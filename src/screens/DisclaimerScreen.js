import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { apiAcceptDisclaimer } from '../services/apiService';

const DISCLAIMER_VERSION = '1.0';

const BLOCKS = [
  { icon: '🚫', key: 'block1' },
  { icon: '⚠️', key: 'block2' },
  { icon: '🤖', key: 'block3' },
  { icon: 'ℹ️', key: 'block4' },
];

export default function DisclaimerScreen() {
  const { language, acceptDisclaimer } = useApp();
  const { token } = useAuth();
  const [checked, setChecked] = useState(false);

  async function handleAccept() {
    await acceptDisclaimer();
    if (token) {
      apiAcceptDisclaimer(token, DISCLAIMER_VERSION).catch(() => {});
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.topIcon}>⚠️</Text>
        </View>

        <Text style={styles.title}>{t(language, 'disclaimer.title')}</Text>
        <Text style={styles.subtitle}>{t(language, 'disclaimer.subtitle')}</Text>

        <View style={styles.blocks}>
          {BLOCKS.map(({ icon, key }) => (
            <View key={key} style={styles.block}>
              <Text style={styles.blockIcon}>{icon}</Text>
              <View style={styles.blockText}>
                <Text style={styles.blockTitle}>{t(language, `disclaimer.${key}_title`)}</Text>
                <Text style={styles.blockBody}>{t(language, `disclaimer.${key}_body`)}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.checkRow}
          onPress={() => setChecked(v => !v)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
            {checked && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.checkLabel}>{t(language, 'disclaimer.checkbox')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, !checked && styles.acceptBtnDisabled]}
          onPress={checked ? handleAccept : undefined}
          activeOpacity={checked ? 0.85 : 1}
        >
          <Text style={styles.acceptBtnText}>{t(language, 'disclaimer.accept')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    padding: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cautionLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  topIcon: { fontSize: 36 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    fontFamily: BrandFonts.heading || undefined,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '500',
  },
  blocks: { width: '100%', gap: 12, marginBottom: 28 },
  block: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  blockIcon: { fontSize: 22, marginTop: 1 },
  blockText: { flex: 1 },
  blockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  blockBody: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 19,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    width: '100%',
    marginBottom: 24,
    padding: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '800' },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
    fontWeight: '500',
  },
  acceptBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: Colors.primaryDark,
  },
  acceptBtnDisabled: {
    opacity: 0.4,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    fontFamily: BrandFonts.heading || undefined,
  },
});
