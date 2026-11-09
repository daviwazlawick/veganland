import React, { useState, useEffect, useMemo } from 'react';
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
import { font } from '../theme/type';
import { useReferral } from '../context/ReferralContext';
import { useNutrition } from '../context/NutritionContext';
import { useAuth } from '../context/AuthContext';
import { apiGetRecentPlates } from '../services/apiService';
import { HIDE_REFERRAL } from '../constants/features';
import { effectiveStatus, STATUS_CONFIG } from '../utils/scanStatus';
import { computeBodyAnalysis, buildMeasures, scoreLevel } from '../utils/bodyScore';

const WATER_PRESETS = [
  { ml: 150,  cups: '¾' },
  { ml: 250,  cups: '1' },
  { ml: 350,  cups: '1½' },
  { ml: 500,  cups: '2' },
  { ml: 750,  cups: '3' },
];

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
  const { goals, todayTotals, logConsumption, todayBurned, bodyProfile, bodyMeasurements, measurementsHistory } = useNutrition();
  const { token } = useAuth();
  const insets = useSafeAreaInsets();
  const [loggingWater, setLoggingWater] = useState(false);
  const [showWaterModal, setShowWaterModal] = useState(false);
  const [customWaterMl, setCustomWaterMl] = useState('');
  const [recentPlates, setRecentPlates] = useState([]);
  const [badgeTooltip, setBadgeTooltip] = useState(false);

  useEffect(() => {
    if (!token || isNovaQI) return;
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

  const diet = profile ? DIETS.find(d => d.id === profile.dietId) : null;
  const allergyNames = (profile?.allergyIds || [])
    .map(id => ALLERGIES.find(a => a.id === id))
    .filter(Boolean)
    .map(a => a.label[language] || a.label.en);

  const historyRows = scanHistory.slice(0, isNovaQI ? 3 : 5).map((scan) => ({
    scan,
    cfg: STATUS_CONFIG[effectiveStatus(scan, profile)],
  }));
  const hasGoals = goals?.calories_kcal > 0;

  // Mesma conta do EditPersonal: sem perímetro, % de gordura ou foto não há score.
  const bodyScore = useMemo(() => {
    if (!isNovaQI) return null;
    const bm = bodyMeasurements || [];
    const analysis = computeBodyAnalysis({
      bodyMeasurements: bm,
      measures: buildMeasures((measurementsHistory || [])[0] || null, bm[0] || null),
      height: bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '',
      weight: bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '',
      birthDate: bodyProfile?.birth_date ? bodyProfile.birth_date.slice(0, 10) : '',
      sex: bodyProfile?.sex || null,
      bodyProfile,
    });
    return analysis?.score ?? null;
  }, [isNovaQI, bodyMeasurements, measurementsHistory, bodyProfile]);
  const scoreInfo = bodyScore != null ? scoreLevel(bodyScore) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {isNovaQI ? (
        <View style={styles.topBar}>
          <View style={styles.topBrand}>
            <NovaQILogo size={28} />
            <Text style={styles.topBrandText}>
              Nova<Text style={{ color: Colors.primary }}>QI</Text>
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setBadgeTooltip(true)}
            activeOpacity={0.7}
            style={styles.topStats}
            accessibilityRole="button"
          >
            <View style={styles.topStat}>
              <Ionicons name="flame-outline" size={16} color={Colors.accentDark} />
              <Text style={styles.topStatNum}>{streak || 0}</Text>
              <Text style={styles.topStatLabel}>{t(language, 'home.streak_label')}</Text>
            </View>
            <View style={styles.topStat}>
              <Ionicons name="scan-outline" size={15} color={Colors.textMuted} />
              <Text style={styles.topStatNum}>{monthlyScanCount || scanHistory.length}</Text>
              <Text style={styles.topStatLabel}>{t(language, 'home.scans_label')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      ) : (
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
            <Text style={styles.scanCountNum}>{monthlyScanCount || scanHistory.length}</Text>
            <Text style={styles.scanCountLabel}>{t(language, 'home.scans_label')}</Text>
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {isNovaQI && (
          <TouchableOpacity
            style={[styles.scoreCard, scoreInfo == null && styles.scoreCardCta]}
            onPress={() => navigation.navigate('EditPersonal')}
            activeOpacity={0.8}
            accessibilityRole="button"
          >
            {scoreInfo ? (
              <>
                <View style={styles.scoreTop}>
                  <Text style={styles.scoreLabel}>{t(language, 'body_analysis.score')}</Text>
                  <View style={[styles.scorePill, { backgroundColor: scoreInfo.color + '22' }]}>
                    <Text style={[styles.scorePillText, { color: scoreInfo.color }]}>
                      {t(language, `body_analysis_screen.${scoreInfo.key}`)}
                    </Text>
                  </View>
                </View>
                <View style={styles.scoreNumRow}>
                  <Text style={[styles.scoreNum, { color: scoreInfo.color }]}>{bodyScore}</Text>
                  <Text style={styles.scoreDen}>/100</Text>
                </View>
                <View style={styles.scoreBarTrack}>
                  <View style={[styles.scoreBarFill, { width: `${Math.min(100, bodyScore)}%`, backgroundColor: scoreInfo.color }]} />
                </View>
              </>
            ) : (
              <View style={styles.scoreCtaRow}>
                <View style={styles.scoreCtaIcon}>
                  <Ionicons name="analytics-outline" size={22} color={Colors.primaryDark} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreCtaTitle}>{t(language, 'home.score_cta_title')}</Text>
                  <Text style={styles.scoreCtaSub}>{t(language, 'home.score_cta_sub')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            )}
          </TouchableOpacity>
        )}

        {isNovaQI && (
          <View style={styles.intro}>
            {diet && (
              <TouchableOpacity
                onPress={() => navigation.navigate('ProfileSetup')}
                activeOpacity={0.7}
                style={styles.introProfile}
                accessibilityRole="button"
              >
                <Text style={styles.introDiet}>{diet.label[language] || diet.label.en}</Text>
                {allergyNames.length > 0 && (
                  <Text style={styles.introAllergies} numberOfLines={1}>
                    {t(language, 'profile.allergies')}: {allergyNames.join(', ')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {isNovaQI ? (
          <>
            <TouchableOpacity
              style={styles.scanBlock}
              onPress={() => navigation.navigate('Scan')}
              activeOpacity={0.88}
              accessibilityRole="button"
            >
              <Ionicons name="barcode-outline" size={40} color={Colors.white} />
              <View>
                <Text style={styles.scanBlockTitle}>{t(language, 'nutrition.plate_scan_btn')}</Text>
                <Text style={styles.scanBlockSub}>{t(language, 'nutrition.plate_scan_sub')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.plateRow}
              onPress={() => navigation.navigate('PlateAnalysis')}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <View style={styles.plateIcon}>
                <Ionicons name="camera-outline" size={22} color={Colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plateTitle}>{t(language, 'nutrition.plate_photo_btn')}</Text>
                <Text style={styles.plateSub}>{t(language, 'nutrition.plate_photo_sub')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            {/* O dia num lugar só: o resumo (sempre visível, com ou sem metas) e as
                três formas de registrar logo embaixo. Tocar no resumo abre o Diário. */}
            <View style={styles.today}>
              <TouchableOpacity
                style={styles.todayTop}
                onPress={() => navigation.navigate('Diary')}
                activeOpacity={0.75}
                accessibilityRole="button"
              >
                <View style={styles.todayHead}>
                  <Text style={styles.todayTitle}>{t(language, 'nutrition.home_widget_title')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </View>
                {hasGoals ? (
                  <View style={homeNutritionStyles.ringRow}>
                    <CalorieRing
                      pct={(todayTotals.calories_kcal || 0) / goals.calories_kcal}
                      centerText={String(Math.round(todayTotals.calories_kcal || 0))}
                    />
                    <View style={homeNutritionStyles.ringSide}>
                      <Text style={styles.todayNum}>
                        {Math.round(Math.max(goals.calories_kcal - (todayTotals.calories_kcal || 0) + (todayBurned || 0), 0))}
                        <Text style={styles.todayUnit}> kcal</Text>
                      </Text>
                      <Text style={styles.todayLabel}>
                        {t(language, 'nutrition.remaining')}
                        {todayBurned > 0 ? `, +${Math.round(todayBurned)} ${t(language, 'exercise.calories_burned')}` : ''}
                      </Text>
                      <View style={homeNutritionStyles.proteinBarTrack}>
                        <View style={[homeNutritionStyles.proteinBarFill, {
                          backgroundColor: Colors.primary,
                          width: `${(goals.protein_g > 0 ? Math.min(1, (todayTotals.protein_g || 0) / goals.protein_g) : 0) * 100}%`,
                        }]} />
                      </View>
                      <Text style={styles.todayLabel}>
                        {Math.round(todayTotals.protein_g || 0)}/{Math.round(goals.protein_g || 0)} g {t(language, 'nutrition.protein')}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.todayNoGoals}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.todayNum}>
                        {Math.round(todayTotals.calories_kcal || 0)}
                        <Text style={styles.todayUnit}> kcal</Text>
                      </Text>
                      <Text style={styles.todayLabel}>{t(language, 'home.today_eaten')}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('BodyProfile')}
                      style={styles.todayGoalsBtn}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.todayGoalsText}>{t(language, 'home.today_set_goals')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>

            <View style={styles.quickStrip}>
              <TouchableOpacity
                style={styles.quickItem}
                onPress={() => navigation.navigate('Diary', { openAddFood: true })}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="restaurant-outline" size={20} color={Colors.primaryDark} />
                <Text style={styles.quickLabel} numberOfLines={2}>{t(language, 'nutrition.add_food')}</Text>
              </TouchableOpacity>
              <View style={styles.quickRule} />
              <TouchableOpacity
                style={styles.quickItem}
                onPress={() => navigation.navigate('ExerciseLog')}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="fitness-outline" size={20} color="#C2410C" />
                <Text style={styles.quickLabel} numberOfLines={2}>{t(language, 'exercise.log_exercise')}</Text>
              </TouchableOpacity>
              <View style={styles.quickRule} />
              <TouchableOpacity
                style={styles.quickItem}
                onPress={() => setShowWaterModal(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="water-outline" size={20} color="#0E7490" />
                <Text style={styles.quickLabel} numberOfLines={2}>
                  {Math.round(todayTotals.water_ml || 0) > 0
                    ? `${Math.round(todayTotals.water_ml || 0)} ml`
                    : t(language, 'nutrition.water')}
                </Text>
              </TouchableOpacity>
            </View>
            </View>
          </>
        ) : (
          <>
            {showReferralHero && (
              <TouchableOpacity
                style={homeReferralStyles.hero}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('Referral')}
              >
                <View style={homeReferralStyles.heroLeft}>
                  <Ionicons name="gift-outline" size={32} color={Colors.primary} style={homeReferralStyles.heroEmoji} />
                  <View style={{ flex: 1 }}>
                    <Text style={homeReferralStyles.heroTitle}>{t(language, 'referral.home_hero_title')}</Text>
                    <Text style={homeReferralStyles.heroCta}>{t(language, 'referral.home_hero_cta')} ›</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            {/* VeganLand: original layout */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.scanBtnHalf} onPress={() => navigation.navigate('Scan')} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={30} color="#FFF" />
                <Text style={styles.actionTitle}>{t(language, 'nutrition.plate_scan_btn')}</Text>
                <Text style={styles.actionSub}>{t(language, 'nutrition.plate_scan_sub')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.scanBtnHalf, styles.plateBtn]} onPress={() => navigation.navigate('PlateAnalysis')} activeOpacity={0.85}>
                <Ionicons name="restaurant-outline" size={32} color="#FFF" />
                <Text style={styles.actionTitle}>{t(language, 'nutrition.plate_photo_btn')}</Text>
                <Text style={styles.actionSub}>{t(language, 'nutrition.plate_photo_sub')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.quickRow}>
              <TouchableOpacity style={styles.addFoodQuickBtn} onPress={() => navigation.navigate('Diary', { openAddFood: true })} activeOpacity={0.85}>
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

        {!isNovaQI && hasGoals && (
          <TouchableOpacity
            style={[homeNutritionStyles.widget, isNovaQI && homeNutritionStyles.widgetNovaqi]}
            onPress={() => navigation.navigate('Diary')}
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
                  {todayBurned > 0 && (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('Diary')}
                      style={homeNutritionStyles.burnedPill}
                      activeOpacity={0.8}
                    >
                      <Text style={homeNutritionStyles.burnedPillTxt}>
                        <Ionicons name="flame-outline" size={13} color="#C2410C" /> {Math.round(todayBurned)} kcal
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

        {!isNovaQI && historyRows.length > 0 && (
          <View style={styles.historySection}>
            <View style={styles.historyHead}>
              <Text style={styles.historyHeading}>{t(language, 'home.recent_scans')}</Text>
              {isNovaQI && scanHistory.length > historyRows.length && (
                <TouchableOpacity onPress={() => navigation.navigate('History')} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.seeAll}>{t(language, 'home.see_all')} ({scanHistory.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.list}>
              {historyRows.map(({ scan, cfg }, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.listRow, i > 0 && styles.listRowRule]}
                  onPress={() => navigation.navigate('Result', { result: scan })}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <View style={[styles.verdictMark, { backgroundColor: cfg.strip }]} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{scan.title || scan.product_name}</Text>
                    <Text style={styles.historyMeta}>
                      <Text style={[styles.historyStatus, { color: cfg.color }]}>{t(language, cfg.labelKey)}</Text>
                      {scan.date ? `   ${new Date(scan.date).toLocaleDateString(localeFor(language))}` : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {!isNovaQI && recentPlates.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyHeading}>{t(language, 'nutrition.recent_plates')}</Text>
            <View style={styles.list}>
              {recentPlates.slice(0, 5).map((entry, i) => (
                <View key={i} style={[styles.listRow, i > 0 && styles.listRowRule]}>
                  <Ionicons name="restaurant-outline" size={18} color={Colors.primaryDark} />
                  <View style={styles.historyContent}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{entry.product_name}</Text>
                    <Text style={styles.historyMeta}>
                      {[
                        entry.calories_kcal ? `${Math.round(entry.calories_kcal)} kcal` : null,
                        entry.protein_g ? `${Math.round(entry.protein_g)} g prot` : null,
                        new Date(entry.consumed_at).toLocaleDateString(localeFor(language)),
                      ].filter(Boolean).join('   ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isNovaQI && scanHistory.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{t(language, 'home.empty_title')}</Text>
            <Text style={styles.emptyText}>{t(language, 'home.no_scans')}</Text>
          </View>
        )}

        {isNovaQI && showReferralHero && (
          <TouchableOpacity
            style={styles.referralRow}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Referral')}
            accessibilityRole="button"
          >
            <Ionicons name="gift-outline" size={20} color={Colors.accentDark} />
            <Text style={styles.referralText} numberOfLines={2}>{t(language, 'referral.home_hero_title')}</Text>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
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
              <Ionicons name="bar-chart-outline" size={22} color={Colors.primary} style={styles.tooltipEmoji} />
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
  scroll: { paddingHorizontal: 20, paddingTop: 8, gap: 14, paddingBottom: 40 },
  actionRow: { flexDirection: 'row', gap: 12 },

  // NovaQI — barra do topo: marca à esquerda, sequência e scans à direita, sem placa escura.
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
  },
  topBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topBrandText: { fontSize: 20, color: Colors.text, letterSpacing: -0.4, ...font('heading') },
  topStats: { flexDirection: 'row', gap: 14, paddingVertical: 6, paddingLeft: 8 },
  topStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topStatNum: { fontSize: 15, color: Colors.text, ...font('heading') },
  topStatLabel: { fontSize: 13, color: Colors.textMuted, ...font('body') },

  // NovaQI — pergunta grande + o perfil que está sendo usado pra ler os rótulos.
  scoreCard: { backgroundColor: Colors.card, borderRadius: 18, padding: 16, marginTop: 14, gap: 10 },
  scoreCardCta: { backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primary },
  scoreTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreLabel: { fontSize: 14, color: Colors.textLight, ...font('bodyBold') },
  scorePill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scorePillText: { fontSize: 12, ...font('heading') },
  scoreNumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  scoreNum: { fontSize: 52, lineHeight: 56, ...font('display') },
  scoreDen: { fontSize: 18, color: Colors.textMuted, paddingBottom: 8, ...font('bodyBold') },
  scoreBarTrack: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreCtaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoreCtaIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  scoreCtaTitle: { fontSize: 16, color: Colors.text, ...font('heading') },
  scoreCtaSub: { fontSize: 13, color: Colors.textLight, marginTop: 2, ...font('body') },
  intro: { paddingTop: 14, paddingBottom: 6, gap: 10 },
  introTitle: { fontSize: 34, lineHeight: 36, color: Colors.text, letterSpacing: -1, ...font('display') },
  introProfile: { alignSelf: 'flex-start', gap: 2 },
  introDiet: { fontSize: 15, color: Colors.primaryDark, ...font('bold') },
  introAllergies: { fontSize: 14, color: Colors.textLight, ...font('body') },

  // NovaQI — scan é a ação principal: um bloco só, largo, escuro.
  scanBlock: {
    backgroundColor: Colors.forest || Colors.navy,
    borderRadius: 22, padding: 22, minHeight: 140,
    justifyContent: 'space-between',
  },
  scanBlockTitle: { fontSize: 30, lineHeight: 32, color: Colors.white, letterSpacing: -0.6, ...font('display') },
  scanBlockSub: { fontSize: 15, color: 'rgba(255,255,255,0.72)', marginTop: 4, ...font('body') },

  plateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.card, borderRadius: 18,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  plateIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  plateTitle: { fontSize: 17, color: Colors.text, ...font('heading') },
  plateSub: { fontSize: 13, color: Colors.textLight, marginTop: 1, ...font('body') },

  today: { backgroundColor: Colors.card, borderRadius: 18, overflow: 'hidden' },
  todayTop: { padding: 16, gap: 12 },
  todayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todayTitle: { fontSize: 18, color: Colors.text, ...font('heading') },
  todayNum: { fontSize: 26, color: Colors.text, letterSpacing: -0.5, ...font('display') },
  todayUnit: { fontSize: 14, color: Colors.textMuted, letterSpacing: 0, ...font('bodyBold') },
  todayLabel: { fontSize: 13, color: Colors.textLight, ...font('bodyMed') },
  todayNoGoals: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayGoalsBtn: {
    borderWidth: 1.5, borderColor: Colors.primaryDark, borderRadius: 12,
    paddingHorizontal: 14, height: 42, justifyContent: 'center',
  },
  todayGoalsText: { fontSize: 14, color: Colors.primaryDark, ...font('bold') },
  quickStrip: {
    flexDirection: 'row', alignItems: 'stretch',
    borderTopWidth: 1, borderTopColor: Colors.rule || Colors.border,
  },
  historyHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  seeAll: { fontSize: 15, color: Colors.primaryDark, ...font('bold') },
  quickItem: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 6 },
  quickRule: { width: 1, marginVertical: 14, backgroundColor: Colors.rule || Colors.border },
  quickLabel: { fontSize: 13, color: Colors.text, textAlign: 'center', ...font('bodyBold') },

  referralRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 18, borderWidth: 1, borderColor: Colors.border,
  },
  referralText: { flex: 1, fontSize: 14, color: Colors.text, ...font('bodyBold') },

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
  historySection: { gap: 10, marginTop: 14 },
  historyHeading: { fontSize: 20, color: Colors.text, letterSpacing: -0.3, ...font('heading') },
  // Lista em folha única: o fio entre linhas separa registros, não enfeita.
  list: { backgroundColor: Colors.card, borderRadius: 18, overflow: 'hidden' },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  listRowRule: { borderTopWidth: 1, borderTopColor: Colors.rule || Colors.border },
  verdictMark: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  historyContent: { flex: 1 },
  historyTitle: { fontSize: 16, color: Colors.text, ...font('bold') },
  historyMeta: { fontSize: 13, color: Colors.textMuted, marginTop: 3, ...font('body') },
  historyStatus: { ...font('bold') },
  emptyState: { paddingVertical: 20, gap: 4 },
  emptyTitle: { fontSize: 17, color: Colors.text, ...font('heading') },
  emptyText: { fontSize: 14, color: Colors.textLight, ...font('body') },
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
    marginHorizontal: 0, marginBottom: 0, marginTop: 14,
    borderRadius: 18, borderWidth: 0, padding: 16,
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
