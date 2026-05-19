import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: '💚', labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: '⚡', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: '🚫', labelKey: 'result.not_safe' },
};

const EMPTY_FOODS = ['🥦', '🥕', '🍎', '🫑', '🫐', '🥑', '🌽', '🍇'];

export default function HomeScreen({ navigation }) {
  const { language, profile, scanHistory } = useApp();

  const diet = profile ? DIETS.find(d => d.id === profile.dietId) : null;
  const allergies = profile
    ? (profile.allergyIds || []).map(id => ALLERGIES.find(a => a.id === id)).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>VeganLand 🌱</Text>
          <Text style={styles.headerSub}>
            {t(language, 'home.header_question')}
          </Text>
        </View>
        <View style={styles.scanCountBadge}>
          <Text style={styles.scanCountNum}>{scanHistory.length}</Text>
          <Text style={styles.scanCountLabel}>{t(language, 'home.scans_label')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <View style={styles.profileCard}>
          <View style={styles.profileCardTop}>
            <View style={styles.dietCircle}>
              <Text style={styles.dietCircleEmoji}>{diet?.icon || '🌿'}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileDietName}>{diet?.label[language] || diet?.label.en || t(language, 'home.setup_profile')}</Text>
              <Text style={styles.profileDietDesc}>{diet?.description[language] || diet?.description.en || ''}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSetup')}>
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
          </View>

          {allergies.length > 0 && (
            <View style={styles.allergiesRow}>
              {allergies.map(a => (
                <View key={a.id} style={styles.allergyChip}>
                  <Text style={styles.allergyChipIcon}>{a.icon}</Text>
                  <Text style={styles.allergyChipText}>{a.label[language] || a.label.en}</Text>
                </View>
              ))}
            </View>
          )}

          {allergies.length === 0 && diet && (
            <Text style={styles.noAllergies}>
              {t(language, 'home.no_allergies_configured')}
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.9}>
          <View style={styles.scanBtnEmojis}>
            {['🥦', '🥕', '🍎', '🫑', '🫐'].map(e => (
              <Text key={e} style={styles.scanBtnEmoji}>{e}</Text>
            ))}
          </View>
          <View style={styles.scanBtnRow}>
            <View style={styles.scanBtnCameraCircle}>
              <Text style={styles.scanBtnCameraIcon}>📷</Text>
            </View>
            <View style={styles.scanBtnText}>
              <Text style={styles.scanBtnTitle}>{t(language, 'home.scan_button')}</Text>
              <Text style={styles.scanBtnSub}>{t(language, 'home.scan_subtitle')}</Text>
            </View>
            <View style={styles.scanBtnArrow}>
              <Text style={styles.scanBtnArrowText}>›</Text>
            </View>
          </View>
        </TouchableOpacity>

        {scanHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>
              {t(language, 'home.recent_scans')} {scanHistory.length > 0 ? `(${Math.min(scanHistory.length, 5)})` : ''}
            </Text>
            {scanHistory.slice(0, 5).map((scan, i) => {
              const cfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.CAUTION;
              return (
                <View key={i} style={[styles.historyItem, { borderLeftColor: cfg.strip }]}>
                  <View style={[styles.historyIconWrap, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.historyIcon}>{cfg.icon}</Text>
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyStatus, { color: cfg.color }]}>
                      {t(language, cfg.labelKey)}
                    </Text>
                    <Text style={styles.historyTitle} numberOfLines={1}>{scan.title}</Text>
                    <Text style={styles.historyDate}>
                      📅 {new Date(scan.date).toLocaleDateString(localeFor(language))}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {scanHistory.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyEmojiGrid}>
              {EMPTY_FOODS.map(e => (
                <View key={e} style={styles.emptyEmojiWrap}>
                  <Text style={styles.emptyEmoji}>{e}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.emptyTitle}>
              {t(language, 'home.empty_title')}
            </Text>
            <Text style={styles.emptyText}>{t(language, 'home.no_scans')}</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: Colors.card,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: Colors.primary },
  headerSub: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginTop: 1 },
  scanCountBadge: {
    backgroundColor: Colors.accentLight,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accent + '30',
  },
  scanCountNum: { fontSize: 20, fontWeight: '900', color: Colors.accent },
  scanCountLabel: { fontSize: 10, fontWeight: '700', color: Colors.accent, marginTop: -2 },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  profileCard: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 14,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  profileCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dietCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary + '30',
  },
  dietCircleEmoji: { fontSize: 32 },
  profileInfo: { flex: 1 },
  profileDietName: { fontSize: 17, fontWeight: '900', color: Colors.text },
  profileDietDesc: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginTop: 2 },
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  editBtnText: { fontSize: 18 },
  allergiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: Colors.danger + '30',
  },
  allergyChipIcon: { fontSize: 15 },
  allergyChipText: { fontSize: 12, color: Colors.dangerDark, fontWeight: '700' },
  noAllergies: { fontSize: 13, color: Colors.safeDark, fontWeight: '600' },
  scanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 22,
    overflow: 'hidden',
    borderBottomWidth: 5,
    borderBottomColor: Colors.primaryDark,
  },
  scanBtnEmojis: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: Colors.primaryDark + '30',
  },
  scanBtnEmoji: { fontSize: 22 },
  scanBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    paddingTop: 14,
    gap: 14,
  },
  scanBtnCameraCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanBtnCameraIcon: { fontSize: 26 },
  scanBtnText: { flex: 1 },
  scanBtnTitle: { fontSize: 20, fontWeight: '900', color: Colors.white, marginBottom: 3 },
  scanBtnSub: { fontSize: 12, color: 'rgba(255,255,255,0.82)', fontWeight: '500' },
  scanBtnArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanBtnArrowText: { color: Colors.white, fontSize: 26, fontWeight: '900', lineHeight: 32 },
  historySection: { gap: 10 },
  historyHeading: { fontSize: 17, fontWeight: '900', color: Colors.text },
  historyItem: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    borderLeftWidth: 4,
  },
  historyIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  historyIcon: { fontSize: 22 },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  historyTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginVertical: 2 },
  historyDate: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  emptyEmojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: 220 },
  emptyEmojiWrap: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: Colors.card,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emptyEmoji: { fontSize: 26 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
