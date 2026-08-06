import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { PremiumIcon, BrandName } from '../components/ui';
import { useReferral } from '../context/ReferralContext';
import { useNutrition } from '../context/NutritionContext';
import { useAuth } from '../context/AuthContext';
import { apiGetRecentPlates } from '../services/apiService';
import { HIDE_REFERRAL } from '../constants/features';
import { applyHalalRules, HALAL_STATUS, DEFAULT_HALAL_STRICTNESS } from '../constants/halalRules';
import { applyKosherRules, KOSHER_STATUS } from '../constants/kosherRules';

const HALAL_TO_STATUS = {
  [HALAL_STATUS.HALAL]: 'SAFE',
  [HALAL_STATUS.MASHBOOH]: 'CAUTION',
  [HALAL_STATUS.NOT_HALAL]: 'NOT_SAFE',
};

const KOSHER_TO_STATUS = {
  [KOSHER_STATUS.KOSHER]: 'SAFE',
  [KOSHER_STATUS.SUPERVISION]: 'CAUTION',
  [KOSHER_STATUS.NOT_KOSHER]: 'NOT_SAFE',
};

const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: 'safe',    labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: 'caution', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: 'danger',  labelKey: 'result.not_safe' },
};

const EMPTY_MARKS = ['vegan', 'scan', 'ai', 'home', 'profile'];

export default function HomeScreen({ navigation }) {
  const { language, profile, scanHistory } = useApp();
  const { stats: referralStats } = useReferral();
  const { goals, todayTotals, logConsumption } = useNutrition();
  const { token } = useAuth();
  const [loggingWater, setLoggingWater] = useState(false);
  const [recentPlates, setRecentPlates] = useState([]);

  useEffect(() => {
    if (!token) return;
    apiGetRecentPlates(token).then(setRecentPlates).catch(() => {});
  }, [token]);

  async function quickLogWater(ml) {
    if (loggingWater) return;
    setLoggingWater(true);
    try { await logConsumption({ product_name: 'Water', source: 'manual', water_ml: ml, meal_type: null }); } catch {}
    setLoggingWater(false);
  }
  const showReferralHero = !HIDE_REFERRAL
    && (referralStats?.credit_count || 0) < (referralStats?.referrals_needed || 3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <BrandName
            style={styles.headerTitle}
            prefixColor={Colors.headerText}
            suffixColor={Colors.primary}
          />
          <Text style={styles.headerSub}>{t(language, 'home.header_question')}</Text>
        </View>
        <View style={styles.scanCountBadge}>
          <Text style={styles.scanCountNum}>{scanHistory.length}</Text>
          <Text style={styles.scanCountLabel}>{t(language, 'home.scans_label')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {goals?.calories_kcal > 0 && (
          <TouchableOpacity style={homeNutritionStyles.widget} onPress={() => navigation.navigate('NutritionDashboard')} activeOpacity={0.88}>
            <View style={homeNutritionStyles.row}>
              <Text style={homeNutritionStyles.title}>{t(language, 'nutrition.home_widget_title')}</Text>
              <Text style={homeNutritionStyles.cta}>{t(language, 'nutrition.home_widget_cta')} ›</Text>
            </View>
            <View style={homeNutritionStyles.bars}>
              {[
                { key: 'calories_kcal', color: '#FFCB3B', label: 'kcal' },
                { key: 'protein_g',     color: '#3B82F6', label: 'prot' },
                { key: 'carbs_g',       color: '#8B5CF6', label: 'carbs' },
                { key: 'fat_g',         color: '#F97316', label: 'fat' },
              ].map(f => {
                const pct = goals[f.key] > 0 ? Math.min(1, (todayTotals[f.key] || 0) / goals[f.key]) : 0;
                return (
                  <View key={f.key} style={homeNutritionStyles.barWrap}>
                    <View style={homeNutritionStyles.barTrack}>
                      <View style={[homeNutritionStyles.barFill, { width: `${pct * 100}%`, backgroundColor: f.color }]} />
                    </View>
                    <Text style={homeNutritionStyles.barLabel}>{Math.round(todayTotals[f.key] || 0)} <Text style={{ color: '#94a3b8' }}>{f.label}</Text></Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        )}

        {showReferralHero && (
          <TouchableOpacity
            style={homeReferralStyles.hero}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Referral')}
          >
            <View style={homeReferralStyles.heroLeft}>
              <Text style={homeReferralStyles.heroEmoji}>🎁</Text>
              <View style={{ flex: 1 }}>
                <Text style={homeReferralStyles.heroTitle}>{t(language, 'referral.home_hero_title')}</Text>
                <Text style={homeReferralStyles.heroCta}>{t(language, 'referral.home_hero_cta')} ›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.scanBtnHalf} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionTitle}>{t(language, 'nutrition.plate_scan_btn')}</Text>
            <Text style={styles.actionSub}>{t(language, 'nutrition.plate_scan_sub')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.scanBtnHalf, styles.plateBtn]} onPress={() => navigation.navigate('PlateAnalysis')} activeOpacity={0.85}>
            <Text style={styles.actionIcon}>🍽️</Text>
            <Text style={styles.actionTitle}>{t(language, 'nutrition.plate_photo_btn')}</Text>
            <Text style={styles.actionSub}>{t(language, 'nutrition.plate_photo_sub')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity style={[styles.quickBtn, styles.addFoodBtn]} onPress={() => navigation.navigate('NutritionDashboard', { openAddFood: true })} activeOpacity={0.85}>
            <Text style={styles.quickIcon}>✏️</Text>
            <Text style={styles.quickTitle}>{t(language, 'nutrition.add_food')}</Text>
          </TouchableOpacity>
          <View style={[styles.quickBtn, styles.waterQuickBtn]}>
            <Text style={styles.quickIcon}>💧</Text>
            <Text style={styles.quickTitle}>{t(language, 'nutrition.water')}</Text>
            <Text style={styles.waterTodayText}>{Math.round(todayTotals.water_ml || 0)} ml</Text>
            <View style={styles.waterQuickBtns}>
              {[250, 500].map(ml => (
                <TouchableOpacity key={ml} style={styles.waterMlBtn} onPress={() => quickLogWater(ml)} disabled={loggingWater} activeOpacity={0.75}>
                  <Text style={styles.waterMlText}>+{ml}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {scanHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>
              {t(language, 'home.recent_scans')} {scanHistory.length > 0 ? `(${Math.min(scanHistory.length, 5)})` : ''}
            </Text>
            {scanHistory.slice(0, 5).map((scan, i) => {
              const ings = scan.normalized_ingredients;
              const scanLabels = (scan.productInfo?.offMeta?.labels || []).map(l => String(l).toLowerCase());
              let effectiveStatus = scan.status;
              if (ings?.length) {
                if (profile?.dietId === 'halal' && !scanLabels.includes('halal')) {
                  effectiveStatus = HALAL_TO_STATUS[applyHalalRules(ings, profile?.halalStrictness || DEFAULT_HALAL_STRICTNESS).status] || scan.status;
                } else if (profile?.dietId === 'kosher' && !scanLabels.includes('kosher') && !scanLabels.includes('orthodox union kosher')) {
                  effectiveStatus = KOSHER_TO_STATUS[applyKosherRules(ings).status] || scan.status;
                }
              }
              const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.CAUTION;
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

        {recentPlates.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>🍽️ {t(language, 'nutrition.recent_plates')}</Text>
            {recentPlates.slice(0, 5).map((entry, i) => (
              <View key={i} style={[styles.historyItem, { borderLeftColor: '#22C55E' }]}>
                <View style={[styles.historyIconWrap, { backgroundColor: '#F0FDF4' }]}>
                  <Text style={{ fontSize: 22 }}>🍽️</Text>
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{entry.product_name}</Text>
                  <Text style={styles.historyDate}>
                    {entry.calories_kcal ? `${Math.round(entry.calories_kcal)} kcal` : ''}
                    {entry.protein_g ? `  ·  ${Math.round(entry.protein_g)}g prot` : ''}
                    {'  ·  '}{new Date(entry.consumed_at).toLocaleDateString(localeFor(language))}
                  </Text>
                </View>
              </View>
            ))}
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
            <Text style={styles.emptyTitle}>{t(language, 'home.empty_title')}</Text>
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
    backgroundColor: Colors.headerBg,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: BrandFonts.heading || undefined,
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 14, fontWeight: '500', color: Colors.headerMuted, marginTop: 3 },
  scanCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  scanCountNum: { fontSize: 22, fontWeight: '800', color: Colors.white },
  scanCountLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.72)', marginTop: -2 },
  scroll: { padding: 20, gap: 18, paddingBottom: 130 },
  actionRow: { flexDirection: 'row', gap: 12 },
  scanBtnHalf: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: Colors.navy,
    borderRadius: 20, padding: 18,
    borderBottomWidth: 4, borderBottomColor: Colors.primaryDark,
    shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  plateBtn: {
    backgroundColor: '#14532D',
    borderBottomColor: '#166534',
    shadowColor: '#22C55E',
  },
  actionIcon: { fontSize: 32 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, textAlign: 'center', fontFamily: BrandFonts.heading || undefined },
  actionSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 12 },
  quickBtn: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: '#E5E7EB',
    shadowColor: Colors.navy, shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  addFoodBtn: {},
  waterQuickBtn: {},
  quickIcon: { fontSize: 24 },
  quickTitle: { fontSize: 13, fontWeight: '800', color: Colors.navy || '#0B1E3F', textAlign: 'center', fontFamily: BrandFonts.heading || undefined },
  waterTodayText: { fontSize: 16, fontWeight: '800', color: '#06B6D4' },
  waterQuickBtns: { flexDirection: 'row', gap: 6, marginTop: 2 },
  waterMlBtn: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  waterMlText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  historySection: { gap: 10 },
  historyHeading: {
    fontSize: 17, fontWeight: '700', color: Colors.text,
    fontFamily: BrandFonts.headingMed || undefined,
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 14,
    borderLeftWidth: 4,
    shadowColor: Colors.navy,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  historyIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 2 },
  historyDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  historyArrow: { fontSize: 22, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  emptyEmojiGrid: { flexDirection: 'row', gap: 10 },
  emptyEmojiWrap: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});

const homeReferralStyles = StyleSheet.create({
  hero: {
    backgroundColor: '#FFF8E1',
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#FFCB3B',
    marginBottom: 16,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy || '#0B1E3F', lineHeight: 20 },
  heroCta: { fontSize: 13, color: Colors.navy || '#0B1E3F', fontWeight: '700', marginTop: 4 },
});

const homeNutritionStyles = StyleSheet.create({
  widget: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: Colors.navy || '#0B1E3F' },
  cta: { fontSize: 12, color: Colors.navy || '#0B1E3F', fontWeight: '600' },
  bars: { gap: 6 },
  barWrap: { gap: 3 },
  barTrack: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  barLabel: { fontSize: 11, fontWeight: '700', color: Colors.navy || '#0B1E3F' },
});
