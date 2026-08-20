import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { LANGUAGES, localeFor, t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import Brand from '../brand';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { apiGetMe, apiAdminHandoff } from '../services/apiService';
import { useReferral } from '../context/ReferralContext';
import { useNutrition } from '../context/NutritionContext';
import { HIDE_REFERRAL } from '../constants/features';
import { PremiumIcon, BrandName } from '../components/ui';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

function SectionLabel({ label }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function Row({ icon, label, value, onPress, danger, chevron = true }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      {icon ? <Text style={s.rowIcon}>{icon}</Text> : null}
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
      {onPress && chevron ? <Text style={[s.rowChev, danger && s.rowChevDanger]}>›</Text> : null}
    </TouchableOpacity>
  );
}

const isNovaQI = Brand.id === 'novaqi';

const ACTIVITY_ICONS = { sedentary: '🪑', light: '🚶', moderate: '🏃', active: '💪', very_active: '🔥' };

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile, monthlyScanCount, scanHistory, streak } = useApp();
  const { user, token, logout } = useAuth();
  const { stats: referralStats } = useReferral();
  const { goals, bodyProfile, bodyMeasurements } = useNutrition();
  const [usage, setUsage] = useState(null);
  const [userType, setUserType] = useState('starter');
  const insets = useSafeAreaInsets();

  useFocusEffect(useCallback(() => {
    if (!token) return;
    apiGetMe(token).then(data => {
      setUsage(data.usage);
      if (data.user?.user_type) setUserType(data.user.user_type);
    }).catch(() => {});
  }, [token]));

  const diet = profile ? DIETS.find(d => d.id === profile.dietId) : null;
  const allergies = profile
    ? (profile.allergyIds || []).map(id => ALLERGIES.find(a => a.id === id)).filter(Boolean)
    : [];

  const legalBase = `https://${Brand.domain}/legal`;

  const planLabel = {
    free: t(language, 'profile.plan_free'),
    starter: t(language, 'profile.plan_starter'),
    premium: t(language, 'profile.plan_premium'),
    admin: t(language, 'profile.plan_admin'),
  }[userType] || userType;

  const planColor = { free: '#94a3b8', starter: '#1A5F8F', premium: '#92400E', admin: '#1E1B4B' }[userType] || '#94a3b8';
  const planBg   = { free: '#F1F5F9', starter: '#E8F4FF', premium: '#FFF1E2', admin: '#EEF0FF' }[userType] || '#F1F5F9';

  const bmrInfo = useMemo(() => {
    if (!bodyProfile) return null;
    const { sex, birth_date, height_cm, weight_kg, activity_level } = bodyProfile;
    if (!weight_kg || !height_cm || !birth_date) return null;
    const age = Math.max(10, Math.floor((Date.now() - new Date(birth_date)) / (365.25 * 24 * 3600 * 1000)));
    const w = Number(weight_kg), h = Number(height_cm);
    const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161));
    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = Math.round(bmr * (mult[activity_level] || 1.375));
    return { bmr, tdee };
  }, [bodyProfile]);

  const age = bodyProfile?.birth_date
    ? Math.floor((Date.now() - new Date(bodyProfile.birth_date)) / (365.25 * 24 * 3600 * 1000))
    : null;

  const hasBodyProfile = bodyProfile && (bodyProfile.weight_kg || bodyProfile.height_cm);
  const hasGoals = goals?.calories_kcal;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={[s.header, isNovaQI && s.headerNovaqi]}>
        <Text style={s.headerTitle}>{t(language, 'profile.title')}</Text>
        {isNovaQI && (
          <View style={s.headerStatsRow}>
            <View style={s.headerStat}>
              <Text style={s.headerStatNumAmber}>{streak || 0}</Text>
              <Text style={s.headerStatLabel}>{t(language, 'home.streak_label')}</Text>
            </View>
            <View style={s.headerStatDivider} />
            <View style={s.headerStat}>
              <Text style={s.headerStatNum}>{monthlyScanCount || scanHistory.length}</Text>
              <Text style={s.headerStatLabel}>{t(language, 'home.scans_label')}</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 110 }]}>

        {/* ── Personal hero ── */}
        <PersonalHero profile={profile} user={user} language={language} navigation={navigation} />

        {/* ── Body stats ── */}
        <SectionLabel label={t(language, 'nutrition.body_title')} />
        <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => navigation.navigate('EditPersonal')}>
          {hasBodyProfile ? (
            <View style={s.bodyGrid}>
              {age != null && (
                <View style={s.bodyCell}>
                  <Text style={s.bodyCellValue}>{age}</Text>
                  <Text style={s.bodyCellLabel}>{t(language, 'nutrition.body_age') || 'anos'}</Text>
                </View>
              )}
              {bodyProfile.height_cm && (
                <View style={s.bodyCell}>
                  <Text style={s.bodyCellValue}>{bodyProfile.height_cm}</Text>
                  <Text style={s.bodyCellLabel}>cm</Text>
                </View>
              )}
              {bodyProfile.weight_kg && (
                <View style={s.bodyCell}>
                  <Text style={s.bodyCellValue}>{bodyProfile.weight_kg}</Text>
                  <Text style={s.bodyCellLabel}>kg</Text>
                </View>
              )}
              {bodyProfile.activity_level && (
                <View style={s.bodyCell}>
                  <Text style={s.bodyCellValue}>{ACTIVITY_ICONS[bodyProfile.activity_level] || '🏃'}</Text>
                  <Text style={s.bodyCellLabel}>{t(language, `nutrition.activity_${bodyProfile.activity_level}`)}</Text>
                </View>
              )}
              {bodyProfile.goal && (
                <View style={s.bodyCell}>
                  <Text style={s.bodyCellValue}>{bodyProfile.goal === 'lose' ? '📉' : bodyProfile.goal === 'gain' ? '📈' : '⚖️'}</Text>
                  <Text style={s.bodyCellLabel}>{t(language, `nutrition.goal_${bodyProfile.goal}`)}</Text>
                </View>
              )}
              <View style={s.bodyCellEdit}>
                <Ionicons name="pencil" size={13} color={Colors.primary} />
              </View>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>{t(language, 'nutrition.setup_prompt_body')}</Text>
              <Text style={s.emptyStateCta}>{t(language, 'nutrition.setup_prompt_cta')} ›</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── BMR / TDEE ── */}
        {bmrInfo && (
          <>
            <SectionLabel label={t(language, 'nutrition.bmr_title')} />
            <TouchableOpacity style={s.bmrCard} activeOpacity={0.88} onPress={() => navigation.navigate('EditPersonal')}>
              <View style={s.bmrRow}>
                <View style={s.bmrItem}>
                  <Text style={s.bmrValue}>{bmrInfo.bmr}</Text>
                  <Text style={s.bmrLabel}>{t(language, 'nutrition.bmr_label')}</Text>
                  <Text style={s.bmrUnit}>kcal/dia</Text>
                </View>
                <View style={s.bmrDivider} />
                <View style={s.bmrItem}>
                  <Text style={s.bmrValue}>{bmrInfo.tdee}</Text>
                  <Text style={s.bmrLabel}>{t(language, 'nutrition.tdee_label')}</Text>
                  <Text style={s.bmrUnit}>kcal/dia</Text>
                </View>
              </View>
              <Text style={s.bmrSub}>{t(language, 'nutrition.bmr_subtitle')}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Nutrition goals ── */}
        <SectionLabel label={t(language, 'nutrition.goals_title')} />
        <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => navigation.navigate('EditPersonal')}>
          {hasGoals ? (
            <View style={s.goalsGrid}>
              {[
                { key: 'calories_kcal', label: t(language, 'nutrition.calories'), unit: 'kcal', color: Colors.primary },
                { key: 'protein_g',     label: t(language, 'nutrition.protein'),  unit: 'g',    color: '#3B82F6' },
                { key: 'carbs_g',       label: t(language, 'nutrition.carbs'),    unit: 'g',    color: '#8B5CF6' },
                { key: 'fat_g',         label: t(language, 'nutrition.fat'),      unit: 'g',    color: '#F97316' },
              ].map(f => (
                <View key={f.key} style={s.goalCell}>
                  <Text style={[s.goalCellValue, { color: f.color }]}>{Math.round(goals[f.key] || 0)}</Text>
                  <Text style={s.goalCellUnit}>{f.unit}</Text>
                  <Text style={s.goalCellLabel}>{f.label}</Text>
                </View>
              ))}
              <View style={s.bodyCellEdit}>
                <Ionicons name="pencil" size={13} color={Colors.primary} />
              </View>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyStateText}>{t(language, 'nutrition.setup_prompt_body')}</Text>
              <Text style={s.emptyStateCta}>{t(language, 'nutrition.setup_prompt_cta')} ›</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Body Analysis (NovaQI only) ── */}
        {isNovaQI && (
          <>
            <SectionLabel label={t(language, 'body_analysis.section_title')} />
            {bodyMeasurements.length > 0 ? (
              <BodyAnalysisCard data={bodyMeasurements[0]} language={language} navigation={navigation} />
            ) : (
              <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => navigation.navigate('BodyAnalysis')}>
                <View style={s.emptyState}>
                  <Text style={s.emptyStateText}>{t(language, 'body_analysis.no_analysis')}</Text>
                  <Text style={s.emptyStateCta}>{t(language, 'body_analysis.run_analysis')} ›</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* ── Referral ── */}
        {!HIDE_REFERRAL && (
          <TouchableOpacity style={s.referralCard} activeOpacity={0.9} onPress={() => navigation.navigate('Referral')}>
            <Text style={s.referralEmoji}>🎁</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.referralTitle}>{t(language, 'referral.profile_card_title')}</Text>
              <Text style={s.referralSub}>
                {t(language, 'referral.profile_card_sub', {
                  credit: referralStats?.credit_count || 0,
                  total: referralStats?.referrals_needed || 3,
                })}
              </Text>
            </View>
            <Text style={s.referralChev}>›</Text>
          </TouchableOpacity>
        )}

        {/* ── Diet & Allergies ── */}
        <SectionLabel label={t(language, 'profile.diet')} />
        <View style={s.card}>
          <TouchableOpacity style={s.dietRow} activeOpacity={0.8} onPress={() => navigation.navigate('ProfileSetup')}>
            <View style={s.dietIconWrap}>
              <PremiumIcon name={diet?.icon || 'vegan'} size={38} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dietName}>{diet?.label[language] || diet?.label?.en || t(language, 'profile.no_profile')}</Text>
              {diet && <Text style={s.dietDesc} numberOfLines={1}>{diet.description[language] || diet.description.en}</Text>}
            </View>
            <Text style={s.rowChev}>›</Text>
          </TouchableOpacity>

          {allergies.length > 0 && (
            <View style={s.allergySection}>
              <Text style={s.allergyHeader}>{t(language, 'profile.allergies')}</Text>
              <View style={s.allergyWrap}>
                {allergies.map(a => (
                  <View key={a.id} style={s.allergyChip}>
                    <PremiumIcon name={a.icon} size={14} />
                    <Text style={s.allergyChipText}>{a.label[language] || a.label.en}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {allergies.length === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} style={s.noAllergyRow}>
              <Text style={s.noAllergyText}>+ {t(language, 'profile.allergies')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Plan & Usage ── */}
        {user && usage != null && (
          <>
            <SectionLabel label={t(language, 'profile.scans_this_month')} />
            <View style={s.card}>
              <View style={s.planRow}>
                <Text style={s.planUsageText}>
                  {usage.limit === null
                    ? t(language, 'profile.plan_unlimited')
                    : `${usage.count} / ${usage.limit}`}
                </Text>
                <View style={[s.planBadge, { backgroundColor: planBg }]}>
                  <Text style={[s.planBadgeText, { color: planColor }]}>{planLabel}</Text>
                </View>
              </View>
              {usage.limit !== null && (
                <View style={s.usageBar}>
                  <View style={[s.usageFill, { width: `${Math.min(100, (usage.count / usage.limit) * 100)}%` }]} />
                </View>
              )}
              {usage.resets_at && (
                <Text style={s.usageReset}>
                  {t(language, 'profile.renews_on', {
                    date: new Date(usage.resets_at).toLocaleDateString(localeFor(language)),
                  })}
                </Text>
              )}
              {(userType === 'free' || userType === 'starter') && (
                <TouchableOpacity style={s.upgradeBtn} onPress={() => navigation.navigate('Paywall', { currentPlan: userType })} activeOpacity={0.85}>
                  <Text style={s.upgradeBtnText}>{t(language, 'plans.change')}</Text>
                </TouchableOpacity>
              )}
              {(userType === 'starter' || userType === 'premium') && Platform.OS !== 'web' && (
                <Row label={t(language, 'profile.manage_subscription')} onPress={() => Linking.openURL(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions')} />
              )}
            </View>
          </>
        )}

        {/* ── Language ── */}
        <SectionLabel label={t(language, 'profile.language')} />
        <View style={s.card}>
          <View style={s.langGrid}>
            {LANGUAGES.map(item => (
              <TouchableOpacity
                key={item.code}
                style={[s.langItem, language === item.code && s.langItemActive]}
                onPress={() => setLanguage(item.code)}
                activeOpacity={0.8}
              >
                <Text style={s.langFlag}>{item.flag}</Text>
                <Text style={[s.langName, language === item.code && s.langNameActive]}>{item.name}</Text>
                {language === item.code && <Text style={s.langCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Account ── */}
        {user && (
          <>
            <SectionLabel label={t(language, 'profile.account')} />
            <View style={s.card}>
              <View style={s.accountEmailRow}>
                <Ionicons name="person-circle-outline" size={22} color={Colors.textMuted} />
                <Text style={s.accountEmail} numberOfLines={1}>{user.email}</Text>
              </View>
              {userType === 'admin' && (
                <Row icon="🛡️" label="Admin Panel" onPress={async () => {
                  try {
                    const url = await apiAdminHandoff(token);
                    await WebBrowser.openBrowserAsync(url);
                  } catch {
                    await WebBrowser.openBrowserAsync(`${API_URL}/admin?token=${token}`);
                  }
                }} />
              )}
              {isNovaQI && (
                <Row icon="📐" label="Análise corporal" onPress={() => navigation.navigate('BodyAnalysis')} />
              )}
              <Row label={t(language, 'profile.terms')} onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/terms`)} />
              <Row label={t(language, 'profile.privacy')} onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/privacy`)} />
              <Row label={t(language, 'profile.imprint')} onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/imprint`)} />
            </View>
          </>
        )}

        {/* ── Danger zone ── */}
        {user && (
          <View style={s.card}>
            <Row label={t(language, 'profile.sign_out')} onPress={logout} danger />
            <Row label={t(language, 'profile.delete_account')} onPress={() => navigation.navigate('DeleteAccount')} danger />
          </View>
        )}

        {/* ── About ── */}
        <View style={s.aboutCard}>
          <BrandName style={s.aboutTitle} prefixColor={Colors.white} suffixColor={Colors.primary} />
          <Text style={s.aboutText}>{t(language, 'profile.about_text')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const BA_CIRCUM_KEYS = ['chest_cm','neck_cm','bicep_cm','forearm_cm','waist_cm','hip_cm','thigh_cm','calf_cm'];
const BA_COMP_KEYS   = ['body_fat_pct','lean_mass_kg','fat_mass_kg','body_water_pct','ree_kcal'];
const BA_INDEX_KEYS  = ['bmi','lean_mass_index','fat_mass_index','waist_to_height','waist_to_hip','conicity_index'];
const BA_UNITS = { body_fat_pct: '%', lean_mass_kg: 'kg', fat_mass_kg: 'kg', body_water_pct: '%', ree_kcal: 'kcal', bmi: '', lean_mass_index: '', fat_mass_index: '', waist_to_height: '', waist_to_hip: '', conicity_index: '' };

function BodyAnalysisCard({ data, language, navigation }) {
  const dateStr = data.recorded_at
    ? new Date(data.recorded_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
    : null;

  function BaRow({ label, value, unit = 'cm' }) {
    if (value == null) return null;
    return (
      <View style={s.baRow}>
        <Text style={s.baRowLabel}>{label}</Text>
        <Text style={s.baRowValue}>{typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}{unit ? ` ${unit}` : ''}</Text>
      </View>
    );
  }

  function BaSubTitle({ label }) {
    return <Text style={s.baSubTitle}>{label}</Text>;
  }

  return (
    <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => navigation.navigate('BodyAnalysis')}>
      <View style={s.baHeader}>
        {data.score != null && (
          <View style={s.baScoreBadge}>
            <Text style={s.baScoreNum}>{data.score}</Text>
            <Text style={s.baScoreLabel}>{t(language, 'body_analysis.score')}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          {dateStr && <Text style={s.baDate}>{t(language, 'body_analysis.last_analysis')}: {dateStr}</Text>}
        </View>
        <Text style={s.rowChev}>›</Text>
      </View>

      <BaSubTitle label="Perímetros" />
      <View style={s.baGrid}>
        {BA_CIRCUM_KEYS.map(k => data[k] != null && (
          <View key={k} style={s.baCell}>
            <Text style={s.baCellVal}>{Number(data[k]).toFixed(1)}</Text>
            <Text style={s.baCellUnit}>cm</Text>
            <Text style={s.baCellLbl}>{t(language, `body_analysis.${k}`)}</Text>
          </View>
        ))}
      </View>

      {(data.body_fat_pct != null || data.lean_mass_kg != null) && (
        <>
          <BaSubTitle label="Composição" />
          {BA_COMP_KEYS.map(k => data[k] != null && (
            <BaRow key={k} label={t(language, `body_analysis.${k}`)} value={data[k]} unit={BA_UNITS[k]} />
          ))}
        </>
      )}

      <BaSubTitle label="Índices" />
      {BA_INDEX_KEYS.map(k => data[k] != null && (
        <BaRow key={k} label={t(language, `body_analysis.${k}`)} value={data[k]} unit={BA_UNITS[k]} />
      ))}
    </TouchableOpacity>
  );
}

function PersonalHero({ profile, user, language, navigation }) {
  const name = profile?.name;
  const bio = profile?.bio;
  const photoUri = profile?.photoUri;
  const initials = name
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : null;

  return (
    <TouchableOpacity style={s.heroCard} activeOpacity={0.88} onPress={() => navigation.navigate('EditPersonal')}>
      <View style={s.heroAvatarWrap}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={s.heroAvatar} />
        ) : (
          <View style={s.heroAvatarPlaceholder}>
            {initials
              ? <Text style={s.heroInitials}>{initials}</Text>
              : <Ionicons name="person" size={28} color="rgba(255,255,255,0.7)" />}
          </View>
        )}
      </View>
      <View style={s.heroInfo}>
        {name
          ? <Text style={s.heroName} numberOfLines={1}>{name}</Text>
          : <Text style={s.heroNameEmpty}>{t(language, 'personal.name_placeholder')}</Text>}
        {user?.email && <Text style={s.heroEmail} numberOfLines={1}>{user.email}</Text>}
        {bio ? <Text style={s.heroBio} numberOfLines={2}>{bio}</Text> : null}
      </View>
      <View style={s.heroEditBadge}>
        <Ionicons name="pencil" size={13} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.headerBg },
  headerNovaqi: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingBottom: 20 },
  headerTitle: { fontSize: 34, fontWeight: '800', color: Colors.headerText, fontFamily: BrandFonts.heading || undefined },
  headerStatsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 20 },
  headerStat: { alignItems: 'flex-start' },
  headerStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  headerStatNum: { fontSize: 20, fontWeight: '800', color: Colors.white, fontFamily: BrandFonts.mono || undefined },
  headerStatNumAmber: { fontSize: 20, fontWeight: '800', color: Colors.accent, fontFamily: BrandFonts.mono || undefined },
  headerStatLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 0 },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: 1,
    marginTop: 20, marginBottom: 8, marginLeft: 4,
  },

  card: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    overflow: 'hidden', marginBottom: 2,
  },

  // Personal Hero
  heroCard: {
    backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#E5E7EB',
    padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  heroAvatarWrap: {},
  heroAvatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.primaryLight },
  heroAvatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  heroInitials: { fontSize: 22, fontWeight: '800', color: '#fff', fontFamily: BrandFonts.heading || undefined },
  heroInfo: { flex: 1 },
  heroName: { fontSize: 18, fontWeight: '800', color: Colors.text },
  heroNameEmpty: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },
  heroEmail: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  heroBio: { fontSize: 12, color: Colors.textLight, marginTop: 3 },
  heroEditBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },

  // Body stats
  bodyGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12, alignItems: 'flex-start',
  },
  bodyCell: { alignItems: 'center', minWidth: 56 },
  bodyCellValue: { fontSize: 18, fontWeight: '900', color: Colors.navy || Colors.text },
  bodyCellLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: 2, textAlign: 'center' },
  bodyCellEdit: {
    marginLeft: 'auto', width: 26, height: 26, borderRadius: 13,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center',
  },

  // BMR card
  bmrCard: {
    backgroundColor: Colors.forest || Colors.navy,
    borderRadius: 18, padding: 18, gap: 10,
  },
  bmrRow: { flexDirection: 'row', alignItems: 'center' },
  bmrItem: { flex: 1, alignItems: 'center', gap: 2 },
  bmrDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.12)' },
  bmrValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  bmrLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  bmrUnit: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  bmrSub: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center' },

  // Goals grid
  goalsGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12, alignItems: 'flex-start',
  },
  goalCell: { alignItems: 'center', minWidth: 64 },
  goalCellValue: { fontSize: 18, fontWeight: '900' },
  goalCellUnit: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  goalCellLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', marginTop: 1, textAlign: 'center' },

  // Empty state
  emptyState: { padding: 20, gap: 4 },
  emptyStateText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  emptyStateCta: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 4 },

  // Referral
  referralCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.cautionLight, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.caution, marginTop: 20,
  },
  referralEmoji: { fontSize: 24 },
  referralTitle: { fontSize: 14, fontWeight: '800', color: Colors.cautionDark },
  referralSub: { fontSize: 12, color: Colors.caution, marginTop: 1 },
  referralChev: { fontSize: 22, color: Colors.caution, fontWeight: '700' },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  rowIcon: { fontSize: 16, marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  rowLabelDanger: { color: '#EF4444' },
  rowValue: { fontSize: 13, color: Colors.textMuted, maxWidth: 140 },
  rowChev: { fontSize: 20, color: '#CBD5E1', fontWeight: '700', marginLeft: 4 },
  rowChevDanger: { color: '#FCA5A5' },

  // Diet
  dietRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  dietIconWrap: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  dietName: { fontSize: 15, fontWeight: '800', color: Colors.text },
  dietDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  allergySection: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12,
  },
  allergyHeader: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  allergyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryBg, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  allergyChipText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  noAllergyRow: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  noAllergyText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Plan
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  planUsageText: { fontSize: 20, fontWeight: '900', color: Colors.text },
  planBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  planBadgeText: { fontSize: 12, fontWeight: '800' },
  usageBar: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden', marginHorizontal: 16, marginBottom: 8 },
  usageFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },
  usageReset: { fontSize: 11, color: '#94a3b8', paddingHorizontal: 16, paddingBottom: 10 },
  upgradeBtn: {
    backgroundColor: Colors.navy || '#0B1E3F',
    marginHorizontal: 16, marginBottom: 14, marginTop: 4,
    padding: 13, borderRadius: 12, alignItems: 'center',
  },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  // Language
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 6 },
  langItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '47%', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E5E7EB',
  },
  langItemActive: { backgroundColor: Colors.primaryBg, borderColor: Colors.primary },
  langFlag: { fontSize: 16 },
  langName: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  langNameActive: { color: Colors.primaryDark, fontWeight: '700' },
  langCheck: { fontSize: 12, color: Colors.primary, fontWeight: '900' },

  // Account
  accountEmailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  accountEmail: { flex: 1, fontSize: 14, color: Colors.textMuted, fontWeight: '500' },

  // Body Analysis Card
  baHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  baScoreBadge: { width: 52, height: 52, borderRadius: 14, backgroundColor: Colors.primaryBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.primaryLight },
  baScoreNum: { fontSize: 20, fontWeight: '900', color: Colors.primary },
  baScoreLabel: { fontSize: 8, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.3 },
  baDate: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  baSubTitle: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
  baGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, paddingBottom: 6, gap: 6 },
  baCell: { alignItems: 'center', minWidth: 72, paddingHorizontal: 6, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  baCellVal: { fontSize: 16, fontWeight: '900', color: Colors.navy || Colors.text },
  baCellUnit: { fontSize: 9, color: '#94a3b8', fontWeight: '600', marginTop: -2 },
  baCellLbl: { fontSize: 9, color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: 3, textAlign: 'center' },
  baRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  baRowLabel: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  baRowValue: { fontSize: 13, fontWeight: '700', color: Colors.text },

  // About
  aboutCard: {
    marginTop: 20, marginBottom: 4,
    backgroundColor: Colors.aboutCardBg || Colors.navy,
    borderRadius: 18, padding: 22, alignItems: 'center', gap: 6,
    borderBottomWidth: 4, borderBottomColor: Colors.aboutCardBorder || Colors.primary,
  },
  aboutTitle: { fontSize: 20, fontWeight: '900', fontFamily: BrandFonts.heading || undefined },
  aboutText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 18 },
});
