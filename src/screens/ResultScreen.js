import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Linking, Modal, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useReferral } from '../context/ReferralContext';
import { useNutrition } from '../context/NutritionContext';
import Brand, { BrandFonts } from '../brand';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { PremiumIcon } from '../components/ui';
import { ALLERGIES } from '../constants/allergies';
import { apiSubmitFeedback, apiSubmitAppSurvey } from '../services/apiService';
import { HIDE_REFERRAL } from '../constants/features';
import { applyHalalRules, HALAL_STATUS, DEFAULT_HALAL_STRICTNESS } from '../constants/halalRules';
import { applyKosherRules, KOSHER_STATUS } from '../constants/kosherRules';
import { EXERCISES, minutesToBurn, getExerciseName, DEFAULT_BURN_EXERCISES } from '../constants/exercises';
import AppSurveyModal from '../components/ui/AppSurveyModal';

const isNovaQI = Brand.id === 'novaqi';

const STATUS_CONFIG = {
  SAFE: {
    icon: 'safe',
    color: Colors.safeDark,
    bannerBg: Colors.safe,
    cardBg: Colors.safeLight,
    cardBorder: Colors.primary + '40',
    titleKey: 'result.safe',
    subtitleKey: 'result.safe_subtitle',
  },
  CAUTION: {
    icon: 'caution',
    color: Colors.cautionDark,
    bannerBg: Colors.caution,
    cardBg: Colors.cautionLight,
    cardBorder: Colors.caution + '40',
    titleKey: 'result.caution',
    subtitleKey: 'result.caution_subtitle',
  },
  NOT_SAFE: {
    icon: 'danger',
    color: Colors.dangerDark,
    bannerBg: Colors.danger,
    cardBg: Colors.dangerLight,
    cardBorder: Colors.danger + '40',
    titleKey: 'result.not_safe',
    subtitleKey: 'result.not_safe_subtitle',
  },
};

const KNOWN_SOURCES = new Set(['image', 'cache', 'database', 'open_food_facts', 'unknown', 'missing']);

const NUTRISCORE_COLORS = {
  A: '#038141', B: '#85BB2F', C: '#FECB02', D: '#EE8100', E: '#E63E11',
};
const NOVA_COLORS = { 1: '#2E7D32', 2: '#FBC02D', 3: '#F57C00', 4: '#C62828' };

function parseIngredients(text) {
  if (!text) return [];
  return text.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

function titleCase(s) {
  return String(s || '').replace(/\b\w/g, c => c.toUpperCase());
}

const HALAL_TO_STATUS = {
  [HALAL_STATUS.HALAL]: 'SAFE',
  [HALAL_STATUS.MASHBOOH]: 'CAUTION',
  [HALAL_STATUS.NOT_HALAL]: 'NOT_SAFE',
};
const HALAL_TITLE_KEYS = {
  [HALAL_STATUS.HALAL]: 'halal.verdict.halal',
  [HALAL_STATUS.MASHBOOH]: 'halal.verdict.mashbooh',
  [HALAL_STATUS.NOT_HALAL]: 'halal.verdict.not_halal',
};
const HALAL_SUB_KEYS = {
  [HALAL_STATUS.HALAL]: 'halal.subtitle.halal',
  [HALAL_STATUS.MASHBOOH]: 'halal.subtitle.mashbooh',
  [HALAL_STATUS.NOT_HALAL]: 'halal.subtitle.not_halal',
};

const KOSHER_TO_STATUS = {
  [KOSHER_STATUS.KOSHER]: 'SAFE',
  [KOSHER_STATUS.SUPERVISION]: 'CAUTION',
  [KOSHER_STATUS.NOT_KOSHER]: 'NOT_SAFE',
};
const KOSHER_TITLE_KEYS = {
  [KOSHER_STATUS.KOSHER]: 'kosher.verdict.kosher',
  [KOSHER_STATUS.SUPERVISION]: 'kosher.verdict.supervision',
  [KOSHER_STATUS.NOT_KOSHER]: 'kosher.verdict.not_kosher',
};
const KOSHER_SUB_KEYS = {
  [KOSHER_STATUS.KOSHER]: 'kosher.subtitle.kosher',
  [KOSHER_STATUS.SUPERVISION]: 'kosher.subtitle.supervision',
  [KOSHER_STATUS.NOT_KOSHER]: 'kosher.subtitle.not_kosher',
};

export default function ResultScreen({ navigation, route }) {
  const { language, scanHistory, profile, appSurveyDone, markAppSurveyDone } = useApp();
  const { token } = useAuth();
  const { stats: referralStats } = useReferral();
  const { logConsumption, bodyProfile } = useNutrition();
  const insets = useSafeAreaInsets();
  const isOnboarding = route?.params?.onboarding === true;
  const showReferralBanner = !HIDE_REFERRAL
    && !isOnboarding
    && (referralStats?.credit_count || 0) < (referralStats?.referrals_needed || 3)
    && scanHistory.length > 0 && scanHistory.length % 5 === 0;
  const { result } = route.params;
  const scanId = result?.scan_id || null;
  const [feedbackState, setFeedbackState] = useState('idle'); // idle | commenting | sending | done
  const [feedbackRating, setFeedbackRating] = useState(null); // 'up' | 'down' — which flow is active
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackError, setFeedbackError] = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);
  const [consumeModal, setConsumeModal] = useState(false);
  const [consumeGrams, setConsumeGrams] = useState('100');
  const [consumeMeal, setConsumeMeal] = useState('lunch');
  const [consumeLogging, setConsumeLogging] = useState(false);
  const [consumeLogged, setConsumeLogged] = useState(false);
  const [burnExIds, setBurnExIds] = useState(DEFAULT_BURN_EXERCISES);

  async function handleLogConsume() {
    const grams = parseFloat(consumeGrams) || 100;
    const factor = grams / 100;
    const n = nutrition || {};
    setConsumeLogging(true);
    await logConsumption({
      product_name: result?.title || result?.productInfo?.offMeta?.product_name || '',
      barcode: result?.barcode || null,
      source: 'scan',
      grams,
      meal_type: consumeMeal,
      calories_kcal: n.energy_kcal ? Math.round(n.energy_kcal * factor * 10) / 10 : null,
      protein_g:     n.proteins    ? Math.round(n.proteins    * factor * 10) / 10 : null,
      fat_g:         n.fat         ? Math.round(n.fat         * factor * 10) / 10 : null,
      carbs_g:       n.carbohydrates ? Math.round(n.carbohydrates * factor * 10) / 10 : null,
      fiber_g:       n.fiber       ? Math.round(n.fiber       * factor * 10) / 10 : null,
      sugar_g:       n.sugars      ? Math.round(n.sugars      * factor * 10) / 10 : null,
      salt_g:        n.salt        ? Math.round(n.salt        * factor * 100) / 100 : null,
    });
    setConsumeLogging(false);
    setConsumeLogged(true);
    setConsumeModal(false);
    setTimeout(() => setConsumeLogged(false), 3000);
  }
  const [showAppSurvey, setShowAppSurvey] = useState(false);

  useEffect(() => {
    if (appSurveyDone || scanHistory.length < 2) return;
    const timer = setTimeout(() => setShowAppSurvey(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isNovaQI) return;
    AsyncStorage.getItem('@exercise_favorites').then(v => {
      if (!v) return;
      try {
        const favs = JSON.parse(v);
        if (Array.isArray(favs) && favs.length > 0) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          setBurnExIds(shuffled.slice(0, 3));
        }
      } catch (_) {}
    });
  }, []);
  const sourceKey = result.ingredients_source || result.productInfo?.source;
  const productName = result.product_name || result.productInfo?.product_name;
  const ingredientsText = result.productInfo?.ingredients_text || result.ingredients_text;
  const concerns = result.concerns || [];
  const offMeta = result.productInfo?.offMeta || null;
  const nutrition = offMeta?.nutrition_100g || null;
  const nutritionRows = nutrition ? [
    { key: 'nutrition_kcal',    value: nutrition.energy_kcal,   unit: ' kcal' },
    { key: 'nutrition_proteins', value: nutrition.proteins,      unit: ' g' },
    { key: 'nutrition_carbs',    value: nutrition.carbohydrates, unit: ' g' },
    { key: 'nutrition_sugars',   value: nutrition.sugars,        unit: ' g' },
    { key: 'nutrition_fat',      value: nutrition.fat,           unit: ' g' },
    { key: 'nutrition_sat_fat',  value: nutrition.saturated_fat, unit: ' g' },
    { key: 'nutrition_fiber',    value: nutrition.fiber,         unit: ' g' },
    { key: 'nutrition_salt',     value: nutrition.salt,          unit: ' g' },
  ].filter(r => r.value != null) : [];
  const nutriscoreLetter = offMeta?.nutriscore_grade && NUTRISCORE_COLORS[offMeta.nutriscore_grade]
    ? offMeta.nutriscore_grade : null;
  const novaGroup = offMeta?.nova_group && NOVA_COLORS[offMeta.nova_group]
    ? offMeta.nova_group : null;

  const ALLERGEN_ID_MAP = { nuts: 'tree_nuts', wheat: 'gluten' };
  const identifiedAllergens = (result.identified_allergens || [])
    .map(id => ALLERGEN_ID_MAP[id] || id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .map(id => ALLERGIES.find(a => a.id === id))
    .filter(Boolean);

  const ingredients = Array.isArray(result.normalized_ingredients) && result.normalized_ingredients.length > 0
    ? result.normalized_ingredients
    : parseIngredients(ingredientsText);

  // Client-side diet engines (halal, kosher): the server has no rules for
  // these diets — it always returns a generic SAFE/CAUTION. Re-derive the
  // verdict + flagged ingredients locally from the neutral analysis.
  // Exception: if the product carries a matching OFF certification label,
  // trust the certification and skip the engine — a certified halal/kosher
  // product with "gelatin (unspecified)" has already been verified by a body.
  const offLabels = (offMeta?.labels || []).map(l => String(l).toLowerCase());
  const isHalal = profile?.dietId === 'halal';
  const isKosher = profile?.dietId === 'kosher';
  const halalCertified = isHalal && offLabels.includes('halal');
  const kosherCertified = isKosher && (offLabels.includes('kosher') || offLabels.includes('orthodox union kosher'));
  const halalStrictness = profile?.halalStrictness || DEFAULT_HALAL_STRICTNESS;
  const halalResult = isHalal && !halalCertified ? applyHalalRules(ingredients, halalStrictness) : null;
  const kosherResult = isKosher && !kosherCertified ? applyKosherRules(ingredients) : null;
  const halalFlagMap = new Map();
  if (halalResult) {
    for (const f of halalResult.flagged) halalFlagMap.set(f.ingredient, f);
  }
  const kosherFlagMap = new Map();
  if (kosherResult) {
    for (const f of kosherResult.flagged) kosherFlagMap.set(f.ingredient, f);
  }
  const FOOD_PRODUCT_TYPES = new Set(['fresh_produce', 'processed_food']);
  const SUPPLEMENT_CATEGORY_TERMS = ['supplement', 'vitamin', 'mineral', 'multivitamin', 'probiotic', 'protein powder'];
  const isSupplementByCategory = (offMeta?.categories || []).some(c =>
    SUPPLEMENT_CATEGORY_TERMS.some(k => String(c).toLowerCase().includes(k))
  );
  const isFood = !isSupplementByCategory && (!result.product_type || FOOD_PRODUCT_TYPES.has(result.product_type));

  const effectiveStatus = halalResult
    ? HALAL_TO_STATUS[halalResult.status]
    : kosherResult
      ? KOSHER_TO_STATUS[kosherResult.status]
      : result.status;
  const cfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.CAUTION;
  const bannerTitleText = halalResult
    ? t(language, HALAL_TITLE_KEYS[halalResult.status])
    : kosherResult
      ? t(language, KOSHER_TITLE_KEYS[kosherResult.status])
      : t(language, cfg.titleKey);
  const bannerSubText = halalResult
    ? t(language, HALAL_SUB_KEYS[halalResult.status])
    : kosherResult
      ? t(language, KOSHER_SUB_KEYS[kosherResult.status])
      : t(language, cfg.subtitleKey);
  const halalConcernList = halalResult
    ? halalResult.flagged.map(f => `${f.ingredient} — ${t(language, f.reasonKey)}`)
    : null;
  const kosherConcernList = kosherResult
    ? [
        ...kosherResult.flagged.map(f => `${f.ingredient} — ${t(language, f.reasonKey)}`),
        ...(kosherResult.meatDairyMix ? [t(language, 'kosher.reason.meat_dairy_mix')] : []),
      ]
    : null;
  const displayConcerns = halalConcernList || kosherConcernList || (result.concerns || []);

  // OFF traces_tags (structured) take priority over AI-extracted traces
  const offTraces = Array.isArray(offMeta?.traces) && offMeta.traces.length > 0
    ? offMeta.traces.map(titleCase)
    : null;
  const aiTraces = Array.isArray(result.traces) && result.traces.length > 0 ? result.traces : null;
  const traces = offTraces || aiTraces;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        {isOnboarding ? (
          <View style={{ width: 44 }} />
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {isOnboarding ? t(language, 'onboarding.scan_title') : t(language, 'result.full_analysis')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.banner}>
          {offMeta?.image_url ? (
            <>
              <Image
                source={{ uri: offMeta.image_url }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
              <View style={[StyleSheet.absoluteFillObject, styles.bannerDarkOverlay]} />
            </>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: cfg.bannerBg }]} />
          )}
          <View style={styles.lightLine} />
          <View style={[styles.bannerIconCircle, { backgroundColor: cfg.bannerBg }]}>
            <PremiumIcon name={cfg.icon} size={64} color={Colors.white} />
          </View>
          <Text style={styles.bannerTitle}>{bannerTitleText}</Text>
          <Text style={styles.bannerSub}>{bannerSubText}</Text>
          <View style={styles.statusBadge}>
            <PremiumIcon name={cfg.icon} size={22} />
          </View>
        </View>

        {result.imageUri && (
          <View style={[styles.productImageWrap, isNovaQI && styles.productImageWrapNovaqi]}>
            <Image source={{ uri: result.imageUri }} style={styles.productImage} resizeMode="cover" />
            {isNovaQI && (
              <>
                <View style={styles.productImageScrim} />
                <View style={[styles.productImageBadge, { backgroundColor: cfg.bannerBg }]}>
                  <PremiumIcon name={cfg.icon} size={18} color={Colors.white} />
                </View>
                <Text style={styles.productImageScrimText}>{bannerTitleText}</Text>
              </>
            )}
          </View>
        )}

        <View style={[styles.analysisCard, { borderColor: cfg.cardBorder, backgroundColor: cfg.cardBg }]}>
          {(productName || sourceKey) && (
            <View style={styles.metaRow}>
              {productName && (
                <View style={styles.productNameWrap}>
                  <PremiumIcon name="scan" size={16} muted />
                  <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
                </View>
              )}
              {sourceKey && KNOWN_SOURCES.has(sourceKey) && (
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceBadgeText}>
                    {t(language, `result.source_${sourceKey}`)}
                  </Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.analysisTitle}>{result.title}</Text>
          <Text style={styles.explanation}>
            {result.cannot_read ? t(language, 'result.cannot_read') : result.explanation}
          </Text>

          {(nutriscoreLetter || novaGroup || nutritionRows.length > 0 || offMeta?.categories?.length || offMeta?.labels?.length) && (
            <View style={styles.offFacts}>
              {(nutriscoreLetter || novaGroup) && (
                <View style={styles.gradesRow}>
                  {nutriscoreLetter && (
                    <TouchableOpacity
                      onPress={() => setActiveInfo('nutriscore')}
                      activeOpacity={0.85}
                      style={[styles.gradeBadge, { backgroundColor: NUTRISCORE_COLORS[nutriscoreLetter] }]}
                    >
                      <Text style={styles.gradeBadgeLabel}>{t(language, 'result.nutriscore')}</Text>
                      <Text style={styles.gradeBadgeValue}>{nutriscoreLetter}</Text>
                      <Text style={styles.gradeBadgeInfo}>ⓘ</Text>
                    </TouchableOpacity>
                  )}
                  {novaGroup && (
                    <TouchableOpacity
                      onPress={() => setActiveInfo('nova')}
                      activeOpacity={0.85}
                      style={[styles.gradeBadge, { backgroundColor: NOVA_COLORS[novaGroup] }]}
                    >
                      <Text style={styles.gradeBadgeLabel}>{t(language, 'result.nova')}</Text>
                      <Text style={styles.gradeBadgeValue}>{novaGroup}</Text>
                      <Text style={styles.gradeBadgeInfo}>ⓘ</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {nutritionRows.length > 0 && (
                <View style={styles.nutritionBox}>
                  <Text style={styles.nutritionTitle}>{t(language, 'result.nutrition_title')}</Text>
                  <View style={styles.nutritionGrid}>
                    {nutritionRows.map(row => (
                      <View key={row.key} style={styles.nutritionCell}>
                        <Text style={styles.nutritionLabel}>{t(language, `result.${row.key}`)}</Text>
                        <Text style={styles.nutritionValue}>{row.value}{row.unit}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {isNovaQI && nutrition?.energy_kcal > 0 && (() => {
                const weight = bodyProfile?.weight_kg || 70;
                const kcalPer100 = nutrition.energy_kcal;
                const burnExercises = burnExIds
                  .map(id => EXERCISES.find(e => e.id === id))
                  .filter(Boolean);
                if (!burnExercises.length) return null;
                return (
                  <View style={styles.burnBox}>
                    <Text style={styles.burnTitle}>{t(language, 'exercise.burn_equivalent')} 100g</Text>
                    <View style={styles.burnRow}>
                      {burnExercises.map(ex => (
                        <View key={ex.id} style={styles.burnItem}>
                          <Text style={styles.burnItemIcon}>{ex.icon}</Text>
                          <Text style={styles.burnMins}>{minutesToBurn(kcalPer100, ex.met, weight)}'</Text>
                          <Text style={styles.burnExName} numberOfLines={2}>{getExerciseName(ex, language)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {offMeta?.categories?.length > 0 && (
                <View style={styles.metaChipSection}>
                  <Text style={styles.metaChipLabel}>{t(language, 'result.categories')}</Text>
                  <View style={styles.metaChipWrap}>
                    {offMeta.categories.map((c, i) => (
                      <View key={i} style={styles.metaChip}>
                        <Text style={styles.metaChipText}>{titleCase(c)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {offMeta?.labels?.length > 0 && (
                <View style={styles.metaChipSection}>
                  <Text style={styles.metaChipLabel}>{t(language, 'result.labels')}</Text>
                  <View style={styles.metaChipWrap}>
                    {offMeta.labels.map((l, i) => (
                      <View key={i} style={styles.labelChip}>
                        <Text style={styles.labelChipText}>{titleCase(l)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.ingredientsCard}>
          <Text style={styles.ingredientsTitle}>{t(language, 'result.ingredients')}</Text>
          {ingredients.length > 0 ? (
            <View style={styles.ingredientsWrap}>
              {ingredients.map((item, i) => {
                const halalFlag = halalFlagMap.get(item);
                const kosherFlag = kosherFlagMap.get(item);
                const flagged = halalResult
                  ? !!halalFlag
                  : kosherResult
                    ? !!kosherFlag
                    : (() => {
                        const lower = item.toLowerCase();
                        return concerns.some(c => {
                          const cl = c.toLowerCase();
                          return lower.includes(cl) || cl.includes(lower);
                        });
                      })();
                return (
                  <View key={i} style={[styles.ingredientChip, flagged && styles.ingredientChipFlagged]}>
                    <Text style={[styles.ingredientText, flagged && styles.ingredientTextFlagged]}>{item}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.ingredientsEmpty}>{t(language, 'result.ingredients_unavailable')}</Text>
          )}
        </View>

        <View style={styles.allergensCard}>
          <Text style={styles.allergensTitle}>{t(language, 'result.allergens_found')}</Text>
          {identifiedAllergens.length > 0 ? (
            <View style={styles.allergensWrap}>
              {identifiedAllergens.map((allergen, i) => (
                <View key={i} style={styles.allergenChip}>
                  <Text style={styles.allergenText}>{allergen.label[language] || allergen.label.en}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.allergensNone}>{t(language, 'result.allergens_none')}</Text>
          )}
        </View>

        {traces && (
          <View style={styles.tracesCard}>
            <View style={styles.tracesHeader}>
              <Text style={styles.tracesIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tracesTitle}>{t(language, 'result.traces_title')}</Text>
                <Text style={styles.tracesSubtitle}>{t(language, 'result.traces_subtitle')}</Text>
              </View>
            </View>
            <View style={styles.tracesWrap}>
              {traces.map((item, i) => (
                <View key={i} style={styles.traceChip}>
                  <Text style={styles.traceText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {displayConcerns.length > 0 && (
          <View style={styles.concernsCard}>
            <View style={styles.concernsHeader}>
              <PremiumIcon name="caution" size={24} />
              <Text style={styles.concernsTitle}>{t(language, 'result.concerns')}</Text>
            </View>
            {displayConcerns.map((item, i) => (
              <View key={i} style={styles.concernItem}>
                <View style={styles.concernBullet} />
                <Text style={styles.concernText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {displayConcerns.length === 0 && effectiveStatus === 'SAFE' && (
          <View style={styles.noConcernsCard}>
            <PremiumIcon name="safe" size={52} />
            <Text style={styles.noConcernsTitle}>
            {t(language, 'result.no_issues')}
            </Text>
            <Text style={styles.noConcernsText}>{t(language, 'result.no_concerns')}</Text>
          </View>
        )}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerIcon}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.disclaimerText}>{t(language, 'result.ai_disclaimer')}</Text>
            {isHalal && (
              <Text style={styles.halalCertLine}>{t(language, 'halal.cert_line')}</Text>
            )}
            {isKosher && (
              <Text style={styles.halalCertLine}>{t(language, 'kosher.cert_line')}</Text>
            )}
            <TouchableOpacity onPress={() => Linking.openURL('https://www.anthropic.com')} activeOpacity={0.7}>
              <Text style={styles.disclaimerSource}>{t(language, 'result.ai_source')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showReferralBanner && (
          <TouchableOpacity
            onPress={() => navigation.navigate('Referral')}
            style={resultReferralStyles.banner}
            activeOpacity={0.9}
          >
            <Text style={resultReferralStyles.bannerText}>{t(language, 'referral.result_banner')}</Text>
          </TouchableOpacity>
        )}

        {/* Feedback card — visible for every tier now. Onboarding users still
            get routed to Paywall after a rating; paid users just see a "thanks"
            state so the card collapses. Skip button lets anyone move on
            without leaving feedback (Paywall for onboarding, nothing for paid
            users — they can just tap "Scan another" below). */}
        {feedbackState !== 'done' && (
          <View style={fbStyles.card}>
            <Text style={fbStyles.headline}>{t(language, 'onboarding.feedback_headline')}</Text>
            <Text style={fbStyles.sub}>{t(language, 'onboarding.feedback_sub')}</Text>
            <View style={fbStyles.row}>
              <TouchableOpacity
                style={[fbStyles.thumb, fbStyles.thumbUp]}
                activeOpacity={0.85}
                disabled={feedbackState === 'sending'}
                onPress={async () => {
                  setFeedbackError(null);
                  setFeedbackRating('up');
                  setFeedbackState('sending');
                  try {
                    if (scanId) await apiSubmitFeedback(token, { scanId, rating: 'up' });
                    setFeedbackState('done');
                    if (isOnboarding) {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Paywall', params: { currentPlan: 'free' } }],
                      });
                    }
                  } catch (e) {
                    setFeedbackError(e.message || t(language, 'onboarding.feedback_error'));
                    setFeedbackState('idle');
                    setFeedbackRating(null);
                  }
                }}
              >
                <Text style={fbStyles.thumbEmoji}>👍</Text>
                <Text style={fbStyles.thumbLabel}>{t(language, 'onboarding.feedback_up')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[fbStyles.thumb, fbStyles.thumbDown]}
                activeOpacity={0.85}
                disabled={feedbackState === 'sending'}
                onPress={() => {
                  setFeedbackError(null);
                  setFeedbackRating('down');
                  setFeedbackState('commenting');
                }}
              >
                <Text style={fbStyles.thumbEmoji}>👎</Text>
                <Text style={fbStyles.thumbLabel}>{t(language, 'onboarding.feedback_down')}</Text>
              </TouchableOpacity>
            </View>
            {feedbackState === 'sending' && (
              <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primaryDark} />
            )}
            {feedbackError && (
              <Text style={fbStyles.error}>{feedbackError}</Text>
            )}
            <TouchableOpacity
              style={fbStyles.skip}
              activeOpacity={0.7}
              disabled={feedbackState === 'sending'}
              onPress={() => {
                setFeedbackState('done');
                if (isOnboarding) {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Paywall', params: { currentPlan: 'free' } }],
                  });
                }
              }}
            >
              <Text style={fbStyles.skipTxt}>
                {t(language, 'onboarding.feedback_skip') || 'Saltar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom spacer so scroll content doesn't hide behind the sticky
            footer + Android nav bar / gesture area / iOS home indicator. */}
        <View style={{ height: 110 + insets.bottom }} />
      </ScrollView>

      <Modal
        visible={!!activeInfo}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveInfo(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setActiveInfo(null)}
        >
          <TouchableOpacity style={styles.modalCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeInfo === 'nutriscore'
                  ? t(language, 'result.nutriscore_info_title')
                  : t(language, 'result.nova_info_title')}
              </Text>
              <TouchableOpacity
                onPress={() => setActiveInfo(null)}
                style={styles.modalCloseX}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalCloseXText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalBody}>
              {activeInfo === 'nutriscore'
                ? t(language, 'result.nutriscore_info_body')
                : t(language, 'result.nova_info_body')}
            </Text>
            <Text style={styles.modalScaleLabel}>
              {activeInfo === 'nutriscore'
                ? t(language, 'result.nutriscore_scale_label')
                : t(language, 'result.nova_scale_label')}
            </Text>
            <View style={styles.modalScale}>
              {activeInfo === 'nutriscore'
                ? ['A', 'B', 'C', 'D', 'E'].map(letter => (
                    <View key={letter} style={[styles.scaleChip, { backgroundColor: NUTRISCORE_COLORS[letter] }]}>
                      <Text style={styles.scaleChipText}>{letter}</Text>
                    </View>
                  ))
                : [1, 2, 3, 4].map(n => (
                    <View key={n} style={[styles.scaleChip, { backgroundColor: NOVA_COLORS[n] }]}>
                      <Text style={styles.scaleChipText}>{n}</Text>
                    </View>
                  ))}
            </View>
            <TouchableOpacity onPress={() => setActiveInfo(null)} style={styles.modalCloseBtn} activeOpacity={0.85}>
              <Text style={styles.modalCloseBtnText}>{t(language, 'result.info_close')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {!isOnboarding && (
        <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.consumeRow}>
            {isFood && (
              <TouchableOpacity
                style={[styles.consumeBtn, isNovaQI && styles.consumeBtnNovaqi]}
                onPress={() => setConsumeModal(true)}
                activeOpacity={0.85}
              >
                <Text
                  style={styles.consumeBtnText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >{consumeLogged ? t(language, 'nutrition.logged_ok') : t(language, 'nutrition.will_consume')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.scanAgainBtn, isNovaQI && styles.scanAgainBtnOutline, !isFood && { flex: 1 }]}
              onPress={() => navigation.navigate('Scan')}
              activeOpacity={0.9}
            >
              <Text
                style={[styles.scanAgainText, isNovaQI && styles.scanAgainTextOutline]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >{t(language, 'result.scan_again')}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.wrongProductBtn}
            onPress={() => navigation.navigate('ReportProduct', {
              productName: result.title || result.product_name || '',
              barcode: result.barcode || '',
            })}
            activeOpacity={0.7}
          >
            <Text style={styles.wrongProductText}>{t(language, 'result.wrong_product')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={consumeModal} transparent animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableWithoutFeedback onPress={() => setConsumeModal(false)}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={[styles.consumeModalCard, { paddingBottom: 20 + insets.bottom }]}>
            <Text style={styles.consumeModalTitle}>{t(language, 'nutrition.consume_modal_title')}</Text>
            <Text style={styles.consumeProductName} numberOfLines={1}>{result?.title || ''}</Text>
            <Text style={styles.consumeFieldLabel}>{t(language, 'nutrition.meal_label')}</Text>
            <View style={styles.mealRow}>
              {['breakfast','lunch','dinner','snack'].map(m => (
                <TouchableOpacity key={m} onPress={() => setConsumeMeal(m)} style={[styles.mealBtn, consumeMeal === m && styles.mealBtnActive]}>
                  <Text style={[styles.mealBtnText, consumeMeal === m && styles.mealBtnTextActive]}>{t(language, `nutrition.${m}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.consumeFieldLabel}>{t(language, 'nutrition.portion_label')}</Text>
            <View style={styles.portionRow}>
              <TextInput
                style={styles.portionInput}
                value={consumeGrams}
                onChangeText={setConsumeGrams}
                keyboardType="decimal-pad"
                placeholder={t(language, 'nutrition.portion_placeholder')}
                placeholderTextColor="#94a3b8"
              />
              <Text style={styles.portionUnit}>g</Text>
            </View>
            {nutrition?.energy_kcal && (
              <Text style={styles.consumePreview}>
                ≈ {Math.round(nutrition.energy_kcal * (parseFloat(consumeGrams) || 100) / 100)} kcal
                {nutrition.proteins ? `  ·  ${Math.round(nutrition.proteins * (parseFloat(consumeGrams) || 100) / 100)}g prot` : ''}
              </Text>
            )}
            <TouchableOpacity onPress={handleLogConsume} disabled={consumeLogging} style={[styles.consumeLogBtn, consumeLogging && { opacity: 0.6 }]}>
              <Text style={styles.consumeLogBtnText}>{consumeLogging ? '…' : t(language, 'nutrition.log_btn')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={feedbackRating === 'down' && (feedbackState === 'commenting' || feedbackState === 'sending')}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (feedbackState === 'commenting') {
            setFeedbackState('idle');
            setFeedbackRating(null);
          }
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={fbStyles.modalBackdrop}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={[fbStyles.modalCard, { paddingBottom: 24 + insets.bottom }]}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ flexGrow: 0 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={fbStyles.modalTitle}>{t(language, 'onboarding.feedback_down_title')}</Text>
              <Text style={fbStyles.modalSub}>{t(language, 'onboarding.feedback_down_sub')}</Text>
              <TextInput
                value={feedbackComment}
                onChangeText={setFeedbackComment}
                placeholder={t(language, 'onboarding.feedback_down_placeholder')}
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={2000}
                style={fbStyles.input}
                editable={feedbackState === 'commenting'}
                returnKeyType="default"
                blurOnSubmit={false}
              />
              {feedbackError && <Text style={fbStyles.error}>{feedbackError}</Text>}
              <TouchableOpacity
                style={[fbStyles.sendBtn, feedbackState === 'sending' && { opacity: 0.6 }]}
                disabled={feedbackState === 'sending'}
                activeOpacity={0.85}
                onPress={async () => {
                  Keyboard.dismiss();
                  setFeedbackError(null);
                  setFeedbackState('sending');
                  try {
                    if (scanId) {
                      await apiSubmitFeedback(token, {
                        scanId,
                        rating: 'down',
                        comment: feedbackComment.trim() || undefined,
                      });
                    }
                    setFeedbackState('done');
                    // Only route onboarding users to the Paywall after a
                    // rating — paid users stay on Result so they can keep
                    // browsing scan history / hit "Scan another".
                    if (isOnboarding) {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Paywall', params: { currentPlan: 'free' } }],
                      });
                    }
                  } catch (e) {
                    setFeedbackError(e.message || t(language, 'onboarding.feedback_error'));
                    setFeedbackState('commenting');
                  }
                }}
              >
                {feedbackState === 'sending'
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={fbStyles.sendBtnText}>
                      {feedbackComment.trim()
                        ? t(language, 'onboarding.feedback_send')
                        : t(language, 'onboarding.feedback_skip_send')}
                    </Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppSurveyModal
        visible={showAppSurvey}
        language={language}
        token={token}
        onSubmit={async (message) => {
          await apiSubmitAppSurvey(token, { message, language });
          await markAppSurveyDone();
        }}
        onSkip={async () => {
          setShowAppSurvey(false);
          await markAppSurveyDone();
        }}
        onDone={() => setShowAppSurvey(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { zIndex: 10, elevation: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 26, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  content: { paddingBottom: 20 },
  banner: {
    alignItems: 'center',
    margin: 16,
    borderRadius: 32,
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 24,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  bannerDarkOverlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  lightLine: {
    width: '68%',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.38)',
    marginBottom: 6,
  },
  bannerIconCircle: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.85)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bannerTitle: {
    fontSize: 38, fontWeight: '700', color: Colors.white,
    fontFamily: BrandFonts.heading || undefined, letterSpacing: 0,
    textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  bannerSub: {
    fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: '600', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  statusBadge: {
    position: 'absolute', bottom: -16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  productImage: {
    width: '100%', height: 200,
    backgroundColor: Colors.border,
  },
  productImageWrap: { marginTop: 20 },
  productImageWrapNovaqi: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: Colors.navy, shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  productImageScrim: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 64,
    backgroundColor: 'rgba(6,17,12,0.55)',
  },
  productImageBadge: {
    position: 'absolute', bottom: 12, right: 12,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  productImageScrimText: {
    position: 'absolute', left: 14, bottom: 18,
    color: Colors.white, fontSize: 15, fontWeight: '800',
    fontFamily: BrandFonts.heading || undefined,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  analysisCard: {
    margin: 16,
    marginTop: 28,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  productNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName: { flex: 1, fontSize: 13, color: Colors.textLight, fontWeight: '700' },
  sourceBadge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textLight },
  analysisTitle: { fontSize: 19, fontWeight: '900', color: Colors.text },
  explanation: { fontSize: 15, color: Colors.textLight, lineHeight: 24, fontWeight: '500' },
  offFacts: {
    marginTop: 6, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)',
    gap: 14,
  },
  gradesRow: { flexDirection: 'row', gap: 10 },
  gradeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 12,
  },
  gradeBadgeLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.92)', letterSpacing: 0.4 },
  gradeBadgeValue: { fontSize: 18, fontWeight: '900', color: Colors.white },
  gradeBadgeInfo: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginLeft: 2 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 420,
    backgroundColor: Colors.background,
    borderRadius: 24, padding: 22,
    gap: 14,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '900', color: Colors.text },
  modalCloseX: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center', justifyContent: 'center',
  },
  modalCloseXText: { fontSize: 22, fontWeight: '800', color: Colors.textLight, lineHeight: 24, marginTop: -2 },
  modalBody: { fontSize: 14, color: Colors.text, lineHeight: 21, fontWeight: '500' },
  modalScaleLabel: { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: 4 },
  modalScale: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  scaleChip: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  scaleChipText: { fontSize: 18, fontWeight: '900', color: Colors.white },
  modalCloseBtn: {
    marginTop: 6,
    backgroundColor: Colors.primaryDark,
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: { fontSize: 15, fontWeight: '900', color: Colors.white, letterSpacing: 0.3 },
  nutritionBox: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 14, padding: 12,
    gap: 8,
  },
  nutritionTitle: { fontSize: 12, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.2 },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  nutritionCell: {
    width: '50%',
    paddingVertical: 4,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingRight: 8,
  },
  nutritionLabel: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  nutritionValue: { fontSize: 13, color: Colors.text, fontWeight: '800', fontFamily: BrandFonts.mono || undefined },
  burnBox: {
    backgroundColor: '#0E1B14',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  burnTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8 },
  burnRow: { flexDirection: 'row', gap: 8 },
  burnItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 10, gap: 3 },
  burnItemIcon: { fontSize: 20 },
  burnMins: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: BrandFonts.mono || undefined },
  burnExName: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },
  metaChipSection: { gap: 6 },
  metaChipLabel: { fontSize: 11, fontWeight: '800', color: Colors.textLight, letterSpacing: 0.3, textTransform: 'uppercase' },
  metaChipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
  },
  metaChipText: { fontSize: 12, color: Colors.textLight, fontWeight: '700' },
  labelChip: {
    backgroundColor: Colors.safeLight,
    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: Colors.safe + '40',
  },
  labelChipText: { fontSize: 12, color: Colors.safeDark, fontWeight: '800' },
  ingredientsCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
    gap: 14,
  },
  ingredientsTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  ingredientsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientChip: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  ingredientChipFlagged: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger + '60',
  },
  ingredientText: { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  ingredientTextFlagged: { color: Colors.dangerDark, fontWeight: '800' },
  ingredientsEmpty: { fontSize: 14, color: Colors.textLight, fontStyle: 'italic' },
  allergensCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.cautionLight,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.caution + '40',
    gap: 14,
  },
  allergensTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  allergensWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenChip: {
    backgroundColor: Colors.cautionLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.caution + '60',
  },
  allergenText: { fontSize: 13, color: Colors.cautionDark, fontWeight: '800' },
  allergensNone: { fontSize: 14, color: Colors.textLight, fontStyle: 'italic' },
  tracesCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.cautionLight,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.caution + '60',
    gap: 14,
  },
  tracesHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tracesIcon: { fontSize: 20, lineHeight: 24 },
  tracesTitle: { fontSize: 15, fontWeight: '900', color: Colors.cautionDark },
  tracesSubtitle: { fontSize: 13, color: Colors.caution, fontWeight: '500', marginTop: 2 },
  tracesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traceChip: {
    backgroundColor: Colors.cautionLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.caution + '80',
  },
  traceText: { fontSize: 13, color: Colors.cautionDark, fontWeight: '700' },
  concernsCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.dangerLight,
    gap: 10,
  },
  concernsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  concernsTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  concernItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14, padding: 12,
  },
  concernBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, marginTop: 6 },
  concernText: { flex: 1, fontSize: 14, color: Colors.dangerDark, fontWeight: '700', lineHeight: 20 },
  noConcernsCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.safeLight,
    borderRadius: 28, padding: 26,
    alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.primary + '30',
  },
  noConcernsTitle: { fontSize: 17, fontWeight: '900', color: Colors.safeDark },
  noConcernsText: { fontSize: 14, color: Colors.safeDark, fontWeight: '600', textAlign: 'center' },
  disclaimerBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    marginTop: 20, marginHorizontal: 4,
    backgroundColor: Colors.cautionLight,
    borderWidth: 1, borderColor: Colors.caution + '60',
    borderRadius: 12, padding: 14,
  },
  disclaimerIcon: { fontSize: 16, lineHeight: 20 },
  disclaimerText: { fontSize: 12, color: Colors.cautionDark, lineHeight: 18, fontWeight: '500', marginBottom: 4 },
  halalCertLine: { fontSize: 12, color: Colors.cautionDark, lineHeight: 18, fontWeight: '700', marginBottom: 6 },
  disclaimerSource: { fontSize: 11, color: Colors.cautionDark, textDecorationLine: 'underline', fontWeight: '600', opacity: 0.7 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: Colors.footerScrim || 'rgba(250,248,244,0.94)',
    borderTopWidth: 0,
  },
  scanAgainBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  scanAgainBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: Colors.text,
    shadowOpacity: 0,
  },
  scanAgainText: { color: Colors.white, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  scanAgainTextOutline: { color: Colors.text },
  wrongProductBtn: { alignItems: 'center', paddingTop: 14 },
  wrongProductText: { color: Colors.textLight, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  consumeRow: { flexDirection: 'row', gap: 10 },
  consumeBtn: { flex: 1, backgroundColor: Colors.safe, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  consumeBtnNovaqi: { backgroundColor: Colors.primary },
  consumeBtnText: { color: Colors.white, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  consumeModalCard: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: 36, gap: 10 },
  consumeModalTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy, textAlign: 'center', marginBottom: 2 },
  consumeProductName: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 6 },
  consumeFieldLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6 },
  mealRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  mealBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  mealBtnActive: { backgroundColor: Colors.navy || '#0B1E3F', borderColor: Colors.navy || '#0B1E3F' },
  mealBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  mealBtnTextActive: { color: '#fff' },
  portionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  portionInput: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 20, fontWeight: '700', textAlign: 'center', color: Colors.navy || '#0B1E3F' },
  portionUnit: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  consumePreview: { fontSize: 13, color: '#10B981', fontWeight: '700', textAlign: 'center' },
  consumeLogBtn: { backgroundColor: '#10B981', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  consumeLogBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});

const resultReferralStyles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF8E1', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#FFCB3B', marginTop: 8,
  },
  bannerText: { fontSize: 13, fontWeight: '700', color: Colors.navy || '#0B1E3F', textAlign: 'center' },
});

const fbStyles = StyleSheet.create({
  card: {
    marginTop: 20,
    backgroundColor: Colors.primaryBg,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headline: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primaryDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  thumb: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
  },
  thumbUp: {
    backgroundColor: Colors.safeLight,
    borderColor: Colors.primary,
  },
  thumbDown: {
    backgroundColor: Colors.cautionLight,
    borderColor: Colors.caution,
  },
  thumbEmoji: { fontSize: 34 },
  thumbLabel: { fontSize: 14, fontWeight: '800', color: Colors.text },
  skip:      { marginTop: 14, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
  skipTxt:   { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textDecorationLine: 'underline' },
  error: {
    marginTop: 12,
    fontSize: 12,
    color: Colors.danger,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.text,
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    color: Colors.text,
    textAlignVertical: 'top',
    backgroundColor: Colors.background,
  },
  sendBtn: {
    marginTop: 14,
    backgroundColor: Colors.primaryDark,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sendBtnText: { color: Colors.white, fontSize: 16, fontWeight: '900' },
});
