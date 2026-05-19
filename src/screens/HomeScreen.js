import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { PremiumIcon } from '../components/ui';

const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: 'safe', labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: 'caution', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: 'danger', labelKey: 'result.not_safe' },
};

const EMPTY_MARKS = ['vegan', 'scan', 'ai', 'home', 'profile'];

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
          <Text style={styles.headerTitle}>VeganLand</Text>
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
              <PremiumIcon name={diet?.icon || 'vegan'} size={46} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileDietName}>{diet?.label[language] || diet?.label.en || t(language, 'home.setup_profile')}</Text>
              <Text style={styles.profileDietDesc}>{diet?.description[language] || diet?.description.en || ''}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSetup')}>
              <PremiumIcon name="settings" size={22} />
            </TouchableOpacity>
          </View>

          {allergies.length > 0 && (
            <View style={styles.allergiesRow}>
              {allergies.map(a => (
                <View key={a.id} style={styles.allergyChip}>
                  <PremiumIcon name={a.icon} size={18} />
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

        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
          <View style={styles.scanBtnCameraCircle}>
            <PremiumIcon name="scan" size={41} color={Colors.white} />
          </View>
          <View style={styles.scanBtnText}>
            <Text style={styles.scanBtnTitle}>{t(language, 'home.scan_button')}</Text>
            <Text style={styles.scanBtnSub}>{t(language, 'home.scan_subtitle')}</Text>
          </View>
          <View style={styles.scanBtnArrow}>
            <Text style={styles.scanBtnArrowText}>›</Text>
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
                <TouchableOpacity
                  key={i}
                  style={[styles.historyItem, { borderLeftColor: cfg.strip }]}
                  onPress={() => navigation.navigate('Result', { result: scan })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.historyIconWrap, { backgroundColor: cfg.bg }]}>
                    <PremiumIcon name={cfg.icon} size={28} />
                  </View>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyStatus, { color: cfg.color }]}>
                      {t(language, cfg.labelKey)}
                    </Text>
                    <Text style={styles.historyTitle} numberOfLines={1}>{scan.title}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(scan.date).toLocaleDateString(localeFor(language))}
                    </Text>
                  </View>
                  <Text style={[styles.historyArrow, { color: cfg.color }]}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {scanHistory.length === 0 && (
          <View style={styles.emptyState}>
            <View style={styles.emptyEmojiGrid}>
              {EMPTY_MARKS.map(e => (
                <View key={e} style={styles.emptyEmojiWrap}>
                  <PremiumIcon name={e} size={28} muted />
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
    paddingVertical: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  headerTitle: { fontSize: 34, fontWeight: '700', color: Colors.primaryDark, fontFamily: 'serif' },
  headerSub: { fontSize: 14, fontWeight: '500', color: Colors.textMuted, marginTop: 3 },
  scanCountBadge: {
    backgroundColor: Colors.darkSurface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  scanCountNum: { fontSize: 22, fontWeight: '800', color: Colors.white },
  scanCountLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.72)', marginTop: -2 },
  scroll: { padding: 20, gap: 18, paddingBottom: 130 },
  profileCard: {
    backgroundColor: Colors.glass,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    gap: 16,
    shadowColor: Colors.darkSurface,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 30,
    elevation: 8,
  },
  profileCardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  dietCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  profileInfo: { flex: 1 },
  profileDietName: { fontSize: 19, fontWeight: '800', color: Colors.text },
  profileDietDesc: { fontSize: 13, color: Colors.textLight, fontWeight: '500', marginTop: 3 },
  editBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  allergiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.58)',
    borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  allergyChipText: { fontSize: 12, color: Colors.textLight, fontWeight: '700' },
  noAllergies: { fontSize: 13, color: Colors.safeDark, fontWeight: '600' },
  scanBtn: {
    backgroundColor: Colors.darkSurface,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 21,
    gap: 18,
    borderBottomWidth: 5,
    borderBottomColor: Colors.primary,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary + '60',
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  scanBtnCameraCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.primaryLight + '50',
  },
  scanBtnText: { flex: 1 },
  scanBtnTitle: { fontSize: 23, fontWeight: '900', color: Colors.white, marginBottom: 4 },
  scanBtnSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 18 },
  scanBtnArrow: {
    width: 41, height: 41, borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  scanBtnArrowText: { color: Colors.white, fontSize: 28, fontWeight: '900', lineHeight: 36 },
  historySection: { gap: 10 },
  historyHeading: { fontSize: 22, fontWeight: '700', color: Colors.text, fontFamily: 'serif' },
  historyItem: {
    backgroundColor: Colors.glass,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    borderLeftWidth: 3,
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
  historyArrow: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 16 },
  emptyEmojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', width: 220 },
  emptyEmojiWrap: {
    width: 52, height: 52, borderRadius: 18,
    backgroundColor: Colors.glass,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: Colors.text, fontFamily: 'serif' },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20, fontWeight: '500' },
});
