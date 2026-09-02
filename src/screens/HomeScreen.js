import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { PremiumIcon, BrandName, NovaQILogo } from '../components/ui';
import Svg, { Circle } from 'react-native-svg';
import { useReferral } from '../context/ReferralContext';
import { useNutrition } from '../context/NutritionContext';
import { useAuth } from '../context/AuthContext';
import { apiGetRecentPlates } from '../services/apiService';
import { HIDE_REFERRAL } from '../constants/features';
import { applyHalalRules, HALAL_STATUS, DEFAULT_HALAL_STRICTNESS } from '../constants/halalRules';
import { applyKosherRules, KOSHER_STATUS } from '../constants/kosherRules';

const WATER_PRESETS = [
  { ml: 150,  cups: '¾' },
  { ml: 250,  cups: '1' },
  { ml: 350,  cups: '1½' },
  { ml: 500,  cups: '2' },
  { ml: 750,  cups: '3' },
];

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
const isNovaQI = Brand.id === 'novaqi';

function CalorieRing({ pct, size = 76, centerText }) {
  const clamped = Math.min(1, Math.max(0, pct || 0));
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = circumference * (1 - clamped);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Colors.backgroundSecondary} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={Colors.primary} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ fontFamily: BrandFonts.mono || undefined, fontWeight: '800', fontSize: 15, color: Colors.text }}>{centerText}</Text>
      <Text style={{ fontSize: 9, color: Colors.textMuted }}>kcal</Text>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const { language, profile, scanHistory, monthlyScanCount, streak } = useApp();
  const { stats: referralStats } = useReferral();
  const { goals, todayTotals, logConsumption, todayBurned } = useNutrition();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingWater, setLoggingWater] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState('');
  const [recentPlates, setRecentPlates] = useState([]);
  const [badgeTooltip, setBadgeTooltip] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiGetRecentPlates(token).then(setRecentPlates).catch(() => {});
  }, [token]);

  async function quickLogWater(ml) {
    if (loggingWater) return;
    setShowWaterModal(false);
    setCustomWaterMl('');
    setLoggingWater(true);
    try { await logConsumption({ product_name: 'Water', source: 'manual', water_ml: ml, meal_type: null }); } catch {}
    setLoggingWater(false);
  }
  const showReferralHero = !HIDE_REFERRAL
    && (referralStats?.credit_count || 0) < (referralStats?.referrals_needed || 3);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, isNovaQI && styles.headerNovaqi]}>
        <View>
          {isNovaQI ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <NovaQILogo size={36} />
              <Text style={{ fontFamily: BrandFonts.bold || undefined, fontWeight: '800', fontSize: 22, color: '#FFFFFF', letterSpacing: -0.5 }}>
                Nova<Text style={{ color: '#2FC472' }}>QI</Text>
              </Text>
            </View>
          ) : (
            <BrandName
              style={styles.headerTitle}
              prefixColor={Colors.headerText}
              suffixColor={Colors.primary}
            />
          )}
          <Text style={styles.headerSub}>{t(language, 'home.header_question')}</Text>
        </View>
        {isNovaQI ? (
          <TouchableOpacity onPress={() => setBadgeTooltip(true)} activeOpacity={0.75}>
            <View style={styles.splitBadge}>
              <View style={styles.splitBadgeCol}>
                <Text style={styles.splitBadgeNum}><Ionicons name="flame-outline" size={14} color={Colors.primary} />{streak || 0}</Text>
                <Text style={styles.splitBadgeLabel}>{t(language, 'home.streak_label')}</Text>
              </View>
              <View style={styles.splitBadgeDivider} />
              <View style={styles.splitBadgeCol}>
                <Text style={styles.splitBadgeNum}>{monthlyScanCount || scanHistory.length}</Text>
                <Text style={styles.splitBadgeLabel}>{t(language, 'home.scans_label')}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.scanCountBadge}>
            <Text style={styles.scanCountNum}>{monthlyScanCount || scanHistory.length}</Text>
            <Text style={styles.scanCountLabel}>{t(language, 'home.scans_label')}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {goals?.calories_kcal > 0 && (
          <TouchableOpacity
            style={[homeNutritionStyles.widget, isNovaQI && homeNutritionStyles.widgetNovaqi]}
            onPress={() => navigation.navigate('NutritionDashboard')}
            activeOpacity={0.88}
          >
            <View style={homeNutritionStyles.row}>
              <Text style={homeNutritionStyles.title}>{t(language, 'nutrition.home_widget_title')}</Text>
              <Text style={homeNutritionStyles.cta}>{t(language, 'nutrition.home_widget_cta')} ›</Text>
            </View>
            {isNovaQI ? (
              <View style={homeNutritionStyles.ringRow}>
                <CalorieRing
                  pct={goals.calories_kcal > 0 ? (todayTotals.calories_kcal || 0) / goals.calories_kcal : 0}
                  centerText={String(Math.round(todayTotals.calories_kcal || 0))}
                />
                <View style={homeNutritionStyles.ringSide}>
                  <Text style={homeNutritionStyles.remainingNum}>
                    {Math.round(Math.max((goals.calories_kcal || 0) - (todayTotals.calories_kcal || 0) + (todayBurned || 0), 0))}
                    <Text style={homeNutritionStyles.remainingUnit}> kcal</Text>
                  </Text>
                  <Text style={homeNutritionStyles.remainingLabel}>
                    {todayBurned > 0 ? (t(language, 'nutrition.net') || 'net') : t(language, 'nutrition.remaining')}
                  </Text>
                  {todayBurned > 0 && isNovaQI && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('NutritionDashboard')}
                      style={homeNutritionStyles.burnedPill}
                      activeOpacity={0.8}
                    >
                      <Text style={homeNutritionStyles.burnedPillTxt}>
                        <Ionicons name="flame-outline" size={13} color="#E8450A" /> {Math.round(todayBurned)} kcal
                      </Text>
                    </TouchableOpacity>
                  )}
                  <View style={homeNutritionStyles.proteinBarTrack}>
                    <View style={[homeNutritionStyles.proteinBarFill, {
                      width: `${(goals.protein_g > 0 ? Math.min(1, (todayTotals.protein_g || 0) / goals.protein_g) : 0) * 100}%`,
                    }]} />
                  </View>
                  <Text style={homeNutritionStyles.proteinLabel}>
                    {Math.round(todayTotals.protein_g || 0)}/{Math.round(goals.protein_g || 0)}g {t(language, 'nutrition.protein')}
                  </Text>
                </View>
              </View>
            ) : (
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
                      <Text style={homeNutritionStyles.barLabel}>{Math.round(todayTotals[f.key] || 0)} <Text style={{ color: Colors.textMuted }}>{f.label}</Text></Text>
                    </View>
                  );
                })}
              </View>
            )}
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

        {isNovaQI ? (
          <>
            {/* NovaQI: 2 main buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.mainBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
                <View style={styles.mainIconBubble}>
                  <Ionicons name="barcode-outline" size={30} color="#FFF" />
                </View>
                <Text style={styles.mainBtnTitle}>{t(language, 'nutrition.plate_scan_btn')}</Text>
                <Text style={styles.mainBtnSub}>{t(language, 'nutrition.plate_scan_sub')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.mainBtn, styles.mainBtnDark]} onPress={() => navigation.navigate('PlateAnalysis')} activeOpacity={0.85}>
                <View style={[styles.mainIconBubble, styles.mainIconBubbleDark]}>
                  <Ionicons name="camera-outline" size={30} color="#FFF" />
                </View>
                <Text style={styles.mainBtnTitle}>{t(language, 'nutrition.plate_photo_btn')}</Text>
                <Text style={styles.mainBtnSub}>{t(language, 'nutrition.plate_photo_sub')}</Text>
              </TouchableOpacity>
            </View>

            {/* NovaQI: 3 quick action buttons */}
            <View style={styles.quickGrid}>
              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('NutritionDashboard', { openAddFood: true })}
                activeOpacity={0.82}
              >
                <View style={[styles.quickIconBubble, { backgroundColor: Colors.primaryLight }]}>
                  <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.quickCardLabel}>{t(language, 'nutrition.add_food')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => navigation.navigate('ExerciseLog')}
                activeOpacity={0.82}
              >
                <View style={[styles.quickIconBubble, { backgroundColor: '#FFF0EB' }]}>
                  <Ionicons name="fitness-outline" size={20} color="#E8450A" />
                </View>
                <Text style={styles.quickCardLabel}>{t(language, 'exercise.log_exercise')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickCard}
                onPress={() => setShowWaterModal(true)}
                activeOpacity={0.82}
              >
                <View style={[styles.quickIconBubble, { backgroundColor: '#E0F7FB' }]}>
                  <Ionicons name="water-outline" size={20} color="#0891B2" />
                </View>
                <Text style={[styles.quickCardLabel, { color: '#0891B2' }]}>
                  {Math.round(todayTotals.water_ml || 0) > 0
                    ? `${Math.round(todayTotals.water_ml || 0)} ml`
                    : t(language, 'nutrition.water')}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* VeganLand: original layout */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.scanBtnHalf} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={30} color="#FFF" />
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
              <TouchableOpacity style={styles.addFoodQuickBtn} onPress={() => navigation.navigate('NutritionDashboard', { openAddFood: true })} activeOpacity={0.85}>
                <View style={styles.addFoodIconWrap}>
                  <Text style={styles.addFoodIconGlyph}>+</Text>
                </View>
                <Text style={styles.addFoodQuickTitle}>{t(language, 'nutrition.add_food')}</Text>
              </TouchableOpacity>
              <View style={styles.waterQuickCard}>
                <View style={styles.waterCardTop}>
                  <Text style={styles.waterCardLabel}>{t(language, 'nutrition.water')}</Text>
                  <Text style={styles.waterTodayText}>{Math.round(todayTotals.water_ml || 0)} <Text style={styles.waterUnit}>ml</Text></Text>
                </View>
                <View style={styles.waterQuickBtns}>
                  {[250, 500].map(ml => (
                    <TouchableOpacity key={ml} style={styles.waterMlBtn} onPress={() => quickLogWater(ml)} disabled={loggingWater} activeOpacity={0.75}>
                      <Text style={styles.waterMlText}>+{ml}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </>
        )}

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
              <View key={i} style={[styles.historyItem, { borderLeftColor: Colors.safe }]}>
                <View style={[styles.historyIconWrap, { backgroundColor: Colors.safeLight }]}>
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

      {/* Water picker modal */}
      <Modal visible={showWaterModal} transparent animationType="slide" onRequestClose={() => setShowWaterModal(false)}>
        <Pressable style={waterStyles.backdrop} onPress={() => setShowWaterModal(false)}>
          <View style={[waterStyles.sheet, { paddingBottom: 20 + insets.bottom }]} onStartShouldSetResponder={() => true}>
            <View style={waterStyles.handle} />
            <View style={waterStyles.titleRow}>
              <Ionicons name="water" size={20} color="#0891B2" />
              <Text style={waterStyles.title}>{t(language, 'nutrition.water')}</Text>
              {Math.round(todayTotals.water_ml || 0) > 0 && (
                <Text style={waterStyles.todayBadge}>{Math.round(todayTotals.water_ml)} ml hoje</Text>
              )}
            </View>
            <View style={waterStyles.presetGrid}>
              {WATER_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.ml}
                  style={waterStyles.presetChip}
                  onPress={() => quickLogWater(p.ml)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="water" size={18} color="#0891B2" style={{ opacity: 0.7 + p.ml / 2500 }} />
                  <Text style={waterStyles.presetMl}>{p.ml} ml</Text>
                  <Text style={waterStyles.presetCups}>{p.cups} {p.cups === '1' ? 'copo' : 'copos'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={waterStyles.customRow}>
              <TextInput
                style={waterStyles.customInput}
                value={customWaterMl}
                onChangeText={setCustomWaterMl}
                placeholder="Outro (ml)"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={5}
              />
              <TouchableOpacity
                style={[waterStyles.customBtn, !customWaterMl && waterStyles.customBtnDisabled]}
                onPress={() => {
                  const ml = parseInt(customWaterMl, 10);
                  if (ml > 0 && ml <= 5000) quickLogWater(ml);
                }}
                disabled={!customWaterMl}
                activeOpacity={0.8}
              >
                <Text style={waterStyles.customBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={badgeTooltip} transparent animationType="fade" onRequestClose={() => setBadgeTooltip(false)}>
        <Pressable style={styles.tooltipBackdrop} onPress={() => setBadgeTooltip(false)}>
          <View style={styles.tooltipCard} onStartShouldSetResponder={() => true}>
            <View style={styles.tooltipArrow} />
            {isNovaQI && (
              <>
                <View style={styles.tooltipRow}>
                  <Ionicons name="flame-outline" size={22} color={Colors.primary} style={styles.tooltipEmoji} />
                  <View style={styles.tooltipTexts}>
                    <Text style={styles.tooltipNum}>{streak || 0}</Text>
                    <Text style={styles.tooltipDesc}>{t(language, 'home.badge_streak_desc')}</Text>
                  </View>
                </View>
                <View style={styles.tooltipSep} />
              </>
            )}
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipEmoji}>📊</Text>
              <View style={styles.tooltipTexts}>
                <Text style={styles.tooltipNum}>{monthlyScanCount || scanHistory.length}</Text>
                <Text style={styles.tooltipDesc}>{t(language, 'home.badge_scans_desc')}</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>

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
  headerNovaqi: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
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
  splitBadge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  splitBadgeCol: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  splitBadgeDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginVertical: 6,
  },
  splitBadgeNum: { fontSize: 18, fontWeight: '800', color: Colors.white },
  splitBadgeLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.72)', marginTop: -1 },
  scroll: { padding: 20, gap: 18, paddingBottom: 130 },
  actionRow: { flexDirection: 'row', gap: 12 },

  // NovaQI main buttons (top 2)
  mainBtn: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 22, paddingVertical: 20, paddingHorizontal: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.32, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
  },
  mainBtnDark: {
    backgroundColor: Colors.navy,
    shadowColor: Colors.navy,
    shadowOpacity: 0.38,
  },
  mainIconBubble: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  mainIconBubbleDark: {
    backgroundColor: 'rgba(22,167,90,0.20)',
  },
  mainBtnTitle: {
    fontSize: 14, fontWeight: '800', color: '#FFF', textAlign: 'center',
    fontFamily: BrandFonts.heading || undefined,
  },
  mainBtnSub: { fontSize: 11, color: 'rgba(255,255,255,0.58)', textAlign: 'center' },

  // NovaQI 3 quick cards (bottom row)
  quickGrid: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.card,
    borderRadius: 18, paddingVertical: 14,
    shadowColor: Colors.navy, shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  quickIconBubble: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  quickCardLabel: {
    fontSize: 11, fontWeight: '700', color: Colors.text,
    textAlign: 'center', paddingHorizontal: 4,
  },

  // VeganLand legacy button styles (kept unchanged)
  scanBtnHalf: {
    flex: 1, alignItems: 'center', gap: 8,
    backgroundColor: Colors.navy,
    borderRadius: 24, padding: 20,
    borderBottomWidth: 4, borderBottomColor: Colors.primaryDark,
    shadowColor: Colors.primary, shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  plateBtn: {
    backgroundColor: '#14532D',
    borderBottomColor: '#166534',
    shadowColor: Colors.safe,
  },
  actionIcon: { fontSize: 32 },
  actionTitle: { fontSize: 15, fontWeight: '800', color: Colors.white, textAlign: 'center', fontFamily: BrandFonts.heading || undefined },
  actionSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },
  quickRow: { flexDirection: 'row', gap: 12 },
  addFoodQuickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20, paddingVertical: 16, paddingHorizontal: 16,
    shadowColor: Colors.primary, shadowOpacity: 0.28, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  addFoodIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  addFoodIconGlyph: { fontSize: 22, color: '#FFF', fontWeight: '300', lineHeight: 26 },
  addFoodQuickTitle: { fontSize: 14, fontWeight: '800', color: '#FFF', fontFamily: BrandFonts.heading || undefined },
  waterQuickCard: {
    flex: 1.4,
    backgroundColor: Colors.card,
    borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16,
    gap: 10,
    shadowColor: Colors.navy, shadowOpacity: 0.07, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  waterCardTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  waterCardLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  waterTodayText: { fontSize: 18, fontWeight: '800', color: '#0891B2' },
  waterUnit: { fontSize: 12, fontWeight: '500', color: Colors.textMuted },
  waterQuickBtns: { flexDirection: 'row', gap: 8 },
  waterMlBtn: {
    flex: 1, backgroundColor: '#E0F7FB', borderRadius: 10,
    paddingVertical: 8, alignItems: 'center',
  },
  waterMlText: { fontSize: 13, fontWeight: '800', color: '#0891B2' },
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
  tooltipBackdrop: { flex: 1 },
  tooltipCard: {
    position: 'absolute',
    top: 86,
    right: 16,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    minWidth: 220,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  tooltipArrow: {
    position: 'absolute',
    top: -7,
    right: 22,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.card,
  },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tooltipEmoji: { fontSize: 26 },
  tooltipTexts: { flex: 1 },
  tooltipNum: { fontSize: 22, fontWeight: '800', color: Colors.text },
  tooltipDesc: { fontSize: 12, fontWeight: '500', color: Colors.textMuted, marginTop: 1 },
  tooltipSep: { height: 1, backgroundColor: Colors.backgroundSecondary, marginVertical: 12 },
});

const homeReferralStyles = StyleSheet.create({
  hero: {
    backgroundColor: Colors.cautionLight,
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: Colors.caution,
    marginBottom: 16,
  },
  heroLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroEmoji: { fontSize: 32 },
  heroTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy, lineHeight: 20 },
  heroCta: { fontSize: 13, color: Colors.navy, fontWeight: '700', marginTop: 4 },
});

const waterStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 18,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  title: {
    fontSize: 17, fontWeight: '800', color: '#0E1B14', flex: 1,
  },
  todayBadge: {
    fontSize: 12, fontWeight: '700',
    color: '#0891B2',
    backgroundColor: '#E0F7FB',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    width: '30%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FAFB',
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
  },
  presetMl: {
    fontSize: 15, fontWeight: '800', color: '#0891B2',
  },
  presetCups: {
    fontSize: 11, fontWeight: '600', color: '#64B5C8',
  },
  customRow: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
  },
  customInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 13,
    fontSize: 16, fontWeight: '600', color: '#0E1B14',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  customBtn: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: '#0891B2',
    alignItems: 'center', justifyContent: 'center',
  },
  customBtnDisabled: { backgroundColor: '#BAE6FD' },
  customBtnTxt: { fontSize: 26, fontWeight: '300', color: '#FFF', lineHeight: 30 },
});

const homeNutritionStyles = StyleSheet.create({
  widget: { backgroundColor: Colors.card, borderRadius: 16, padding: 14, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  widgetNovaqi: {
    marginTop: -32, borderRadius: 20,
    shadowColor: Colors.navy, shadowOpacity: 0.08, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: Colors.navy },
  cta: { fontSize: 12, color: Colors.navy, fontWeight: '600' },
  bars: { gap: 6 },
  barWrap: { gap: 3 },
  barTrack: { height: 5, backgroundColor: Colors.backgroundSecondary, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  barLabel: { fontSize: 11, fontWeight: '700', color: Colors.navy },
  ringRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ringSide: { flex: 1, gap: 4 },
  remainingNum: { fontSize: 20, fontWeight: '800', color: Colors.navy, fontFamily: BrandFonts.mono || undefined },
  remainingUnit: { fontSize: 12, fontWeight: '600', color: Colors.textMuted },
  remainingLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginBottom: 4 },
  proteinBarTrack: { height: 6, backgroundColor: Colors.backgroundSecondary, borderRadius: 3, overflow: 'hidden' },
  proteinBarFill: { height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  proteinLabel: { fontSize: 11, fontWeight: '600', color: Colors.textMuted, marginTop: 4 },
  burnedPill: {
    backgroundColor: '#FFF0EB',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  burnedPillTxt: { fontSize: 11, fontWeight: '700', color: '#E8450A' },
});
