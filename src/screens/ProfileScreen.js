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
import { HIDE_REFERRAL, HIDE_PHOTO_BODY_ANALYSIS } from '../constants/features';
import { PremiumIcon, BrandName } from '../components/ui';
import { font } from '../theme/type';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');

function SectionLabel({ label }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function Row({ icon, label, value, onPress, danger, chevron = true }) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1} disabled={!onPress}>
      {icon ? <Ionicons name={icon} size={20} color={Colors.textMuted} style={s.rowIcon} /> : null}
      <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      {value ? <Text style={s.rowValue} numberOfLines={1}>{value}</Text> : null}
      {onPress && chevron ? <Ionicons name="chevron-forward" size={18} color={danger ? Colors.danger : Colors.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const isNovaQI = Brand.id === 'novaqi';

const ACTIVITY_ICONS = { sedentary: 'bed-outline', light: 'walk-outline', moderate: 'walk-outline', active: 'body-outline', very_active: 'flame-outline' };

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile, monthlyScanCount, scanHistory, streak } = useApp();
  const { user, token, logout } = useAuth();
  const { stats: referralStats } = useReferral();
  const { goals, bodyProfile } = useNutrition();
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>

        <View style={s.header}>
          <Text style={s.headerTitle}>{t(language, 'profile.title')}</Text>
          {isNovaQI && (
            <View style={s.headerStatsRow}>
              <Text style={s.headerStat}>
                <Text style={s.headerStatNum}>{streak || 0}</Text> {t(language, 'home.streak_label')}
              </Text>
              <Text style={s.headerStat}>
                <Text style={s.headerStatNum}>{monthlyScanCount || scanHistory.length}</Text> {t(language, 'home.scans_label')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Personal hero ── */}
        <PersonalHero profile={profile} user={user} language={language} navigation={navigation} />

        {/* ── Diet & Allergies (é o que o app usa pra ler cada rótulo, por isso vem primeiro) ── */}
        <SectionLabel label={t(language, 'profile.diet')} />
        <View style={s.card}>
          <TouchableOpacity style={s.dietRow} activeOpacity={0.8} onPress={() => navigation.navigate('ProfileSetup')}>
            <View style={s.dietIconWrap}>
              <PremiumIcon name={diet?.icon || 'vegan'} size={34} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.dietName}>{diet?.label[language] || diet?.label?.en || t(language, 'profile.no_profile')}</Text>
              {diet && <Text style={s.dietDesc} numberOfLines={1}>{diet.description[language] || diet.description.en}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>

          {allergies.length > 0 && (
            <View style={s.allergySection}>
              <Text style={s.allergyHeader}>{t(language, 'profile.allergies')}</Text>
              <Text style={s.allergyList}>{allergies.map(a => a.label[language] || a.label.en).join(', ')}</Text>
            </View>
          )}
          {allergies.length === 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')} style={s.noAllergyRow}>
              <Text style={s.noAllergyText}>+ {t(language, 'profile.allergies')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Sem dado físico nem meta: um convite só, em vez de dois cartões iguais. */}
        {!hasBodyProfile && !hasGoals ? (
          <>
            <SectionLabel label={t(language, 'nutrition.body_title')} />
            <TouchableOpacity style={s.card} activeOpacity={0.88} onPress={() => navigation.navigate('EditPersonal')}>
              <View style={s.emptyState}>
                <Text style={s.emptyStateText}>{t(language, 'nutrition.setup_prompt_body')}</Text>
                <Text style={s.emptyStateCta}>{t(language, 'nutrition.setup_prompt_cta')}</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : (
        <>
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
                  <Ionicons name={ACTIVITY_ICONS[bodyProfile.activity_level] || 'walk-outline'} size={18} color={Colors.navy || Colors.text} />
                  <Text style={s.bodyCellLabel}>{t(language, `nutrition.activity_${bodyProfile.activity_level}`)}</Text>
                </View>
              )}
              {bodyProfile.goal && (
                <View style={s.bodyCell}>
                  <Ionicons
                    name={bodyProfile.goal === 'lose' ? 'trending-down-outline' : bodyProfile.goal === 'gain' ? 'trending-up-outline' : 'remove-outline'}
                    size={18}
                    color={Colors.navy || Colors.text}
                  />
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
              <Text style={s.emptyStateCta}>{t(language, 'nutrition.setup_prompt_cta')}</Text>
            </View>
          )}
        </TouchableOpacity>
        </>
        )}

        {/* Análise corporal por foto: antes era uma linha perdida em Conta, ao lado dos Termos. */}
        {isNovaQI && !HIDE_PHOTO_BODY_ANALYSIS && (
          <View style={[s.card, { marginTop: 10 }]}>
            <Row
              icon="body-outline"
              label={t(language, 'body_analysis_screen.header_title')}
              onPress={() => navigation.navigate('BodyAnalysis')}
            />
          </View>
        )}

        {/* ── Referral ── */}
        {!HIDE_REFERRAL && (
          <TouchableOpacity style={s.referralCard} activeOpacity={0.8} onPress={() => navigation.navigate('Referral')}>
            <Ionicons name="gift-outline" size={20} color={Colors.accentDark || Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={s.referralTitle}>{t(language, 'referral.profile_card_title')}</Text>
              <Text style={s.referralSub}>
                {t(language, 'referral.profile_card_sub', {
                  credit: referralStats?.credit_count || 0,
                  total: referralStats?.referrals_needed || 3,
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

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
                {language === item.code && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
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
                <Row icon="shield-outline" label="Admin Panel" onPress={async () => {
                  try {
                    const url = await apiAdminHandoff(token);
                    await WebBrowser.openBrowserAsync(url);
                  } catch {
                    await WebBrowser.openBrowserAsync(`${API_URL}/admin?token=${token}`);
                  }
                }} />
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
          <BrandName style={s.aboutTitle} prefixColor={Colors.text} suffixColor={Colors.primary} />
          <Text style={s.aboutText}>{t(language, 'profile.about_text')}</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
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
  // Redesenho 2026-11: título no chão (sem placa escura), seções com título em
  // caixa normal, folhas brancas sem borda.
  header: { paddingTop: 12, paddingBottom: 18, paddingHorizontal: 4 },
  headerTitle: { fontSize: 34, lineHeight: 38, color: Colors.text, letterSpacing: -1, ...font('display') },
  headerStatsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, gap: 18 },
  headerStat: { fontSize: 15, color: Colors.textMuted, ...font('body') },
  headerStatNum: { color: Colors.text, ...font('heading') },
  scroll: { paddingHorizontal: 16, paddingTop: 0, gap: 0 },

  sectionLabel: {
    fontSize: 18, color: Colors.text, letterSpacing: -0.2,
    marginTop: 28, marginBottom: 10, marginLeft: 4,
    ...font('heading'),
  },

  card: {
    backgroundColor: Colors.card, borderRadius: 18,
    overflow: 'hidden', marginBottom: 2,
  },

  // Personal Hero
  heroCard: {
    backgroundColor: Colors.card, borderRadius: 18,
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
  heroName: { fontSize: 20, color: Colors.text, ...font('heading') },
  heroNameEmpty: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },
  heroEmail: { fontSize: 14, color: Colors.textLight, marginTop: 2, ...font('body') },
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
  emptyState: { padding: 18, gap: 6 },
  emptyStateText: { fontSize: 15, color: Colors.textLight, lineHeight: 21, ...font('body') },
  emptyStateCta: { fontSize: 15, color: Colors.primaryDark, ...font('bold') },

  // Referral: linha discreta, não alerta.
  referralCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: Colors.border, marginTop: 28,
  },
  referralTitle: { fontSize: 15, color: Colors.text, ...font('bodyBold') },
  referralSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2, ...font('body') },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderTopWidth: 1, borderTopColor: Colors.rule || '#F1F5F9',
  },
  rowIcon: { fontSize: 16, marginRight: 10 },
  rowLabel: { flex: 1, fontSize: 15, color: Colors.text, ...font('bodyMed') },
  rowLabelDanger: { color: Colors.danger },
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
  dietName: { fontSize: 18, color: Colors.text, ...font('heading') },
  dietDesc: { fontSize: 14, color: Colors.textLight, marginTop: 2, ...font('body') },
  allergySection: {
    paddingHorizontal: 16, paddingBottom: 16,
    borderTopWidth: 1, borderTopColor: Colors.rule || '#F1F5F9', paddingTop: 14,
  },
  allergyHeader: { fontSize: 14, color: Colors.textMuted, marginBottom: 4, ...font('bodyBold') },
  allergyList: { fontSize: 16, lineHeight: 23, color: Colors.text, ...font('bodyMed') },
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
    borderTopWidth: 1, borderTopColor: Colors.rule || '#F1F5F9',
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

  // About
  aboutCard: { marginTop: 32, marginBottom: 4, alignItems: 'center', gap: 4 },
  aboutTitle: { fontSize: 18, ...font('heading') },
  aboutText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, ...font('body') },
});
