import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Platform, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile } = useApp();
  const { user, token, logout } = useAuth();
  const { stats: referralStats } = useReferral();
  const { goals, todayTotals, bodyProfile } = useNutrition();
  const [usage, setUsage] = useState(null);
  const [userType, setUserType] = useState('starter');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!token) return;
    apiGetMe(token).then(data => {
      setUsage(data.usage);
      if (data.user?.user_type) setUserType(data.user.user_type);
    }).catch(() => {});
  }, [token]);

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

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>{t(language, 'profile.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 110 }]}>

        {/* ── Personal ── */}
        <PersonalHero profile={profile} user={user} language={language} navigation={navigation} />

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

        {/* ── Diet & Health ── */}
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

        {/* ── Nutrition ── */}
        <SectionLabel label={t(language, 'nutrition.tab')} />
        <TouchableOpacity
          style={s.card}
          activeOpacity={0.9}
          onPress={() => navigation.navigate(goals?.calories_kcal ? 'NutritionDashboard' : 'EditPersonal')}
        >
          {goals?.calories_kcal ? (
            <>
              <View style={s.nutritionTopRow}>
                <View>
                  <Text style={s.nutritionKcal}>{Math.round(todayTotals.calories_kcal || 0)} <Text style={s.nutritionKcalUnit}>kcal {t(language, 'nutrition.period_today')}</Text></Text>
                  <Text style={s.nutritionGoal}>/ {Math.round(goals.calories_kcal)} kcal {t(language, 'nutrition.goals_title')}</Text>
                </View>
                <Text style={s.rowChev}>›</Text>
              </View>
              <View style={s.macroGrid}>
                {[
                  { key: 'protein_g', label: t(language, 'nutrition.protein'), color: '#3B82F6', unit: 'g' },
                  { key: 'carbs_g',   label: t(language, 'nutrition.carbs'),   color: '#8B5CF6', unit: 'g' },
                  { key: 'fat_g',     label: t(language, 'nutrition.fat'),     color: '#F97316', unit: 'g' },
                ].map(f => {
                  const val = Math.round(todayTotals[f.key] || 0);
                  const goal = Math.round(goals[f.key] || 0);
                  const pct = goal > 0 ? Math.min(1, val / goal) : 0;
                  return (
                    <View key={f.key} style={s.macroCol}>
                      <Text style={s.macroVal}>{val}<Text style={s.macroUnit}>{f.unit}</Text></Text>
                      <View style={s.macroTrack}>
                        <View style={[s.macroFill, { width: `${pct * 100}%`, backgroundColor: f.color }]} />
                      </View>
                      <Text style={s.macroLabel}>{f.label}</Text>
                    </View>
                  );
                })}
              </View>
              <Row icon="⚙️" label={t(language, 'nutrition.goals_title')} onPress={() => navigation.navigate('NutritionGoals')} chevron />
            </>
          ) : (
            <View style={s.nutritionSetup}>
              <Text style={s.nutritionSetupTitle}>{t(language, 'nutrition.setup_prompt_title')}</Text>
              <Text style={s.nutritionSetupBody}>{t(language, 'nutrition.setup_prompt_body')}</Text>
              <View style={s.nutritionSetupCta}>
                <Text style={s.nutritionSetupCtaText}>{t(language, 'nutrition.setup_prompt_cta')} ›</Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#F0F2F7' },
  header: { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: Colors.headerBg },
  headerTitle: { fontSize: 34, fontWeight: '800', color: Colors.headerText, fontFamily: BrandFonts.heading || undefined },
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

  // Referral
  referralCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFBEB', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#FDE68A', marginTop: 12,
  },
  referralEmoji: { fontSize: 24 },
  referralTitle: { fontSize: 14, fontWeight: '800', color: '#92400E' },
  referralSub: { fontSize: 12, color: '#B45309', marginTop: 1 },
  referralChev: { fontSize: 22, color: '#B45309', fontWeight: '700' },

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
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  allergyHeader: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  allergyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  allergyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primaryBg,
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.primaryLight,
  },
  allergyChipText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  noAllergyRow: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  noAllergyText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  // Nutrition
  nutritionTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  nutritionKcal: { fontSize: 22, fontWeight: '900', color: Colors.navy || '#0B1E3F' },
  nutritionKcalUnit: { fontSize: 13, fontWeight: '500', color: '#64748b' },
  nutritionGoal: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  macroGrid: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  macroCol: { flex: 1, alignItems: 'center', gap: 4 },
  macroVal: { fontSize: 15, fontWeight: '800', color: Colors.navy || '#0B1E3F' },
  macroUnit: { fontSize: 11, fontWeight: '500', color: '#94a3b8' },
  macroTrack: { width: '100%', height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  macroFill: { height: 5, borderRadius: 3 },
  macroLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  nutritionSetup: { padding: 20, gap: 6 },
  nutritionSetupTitle: { fontSize: 15, fontWeight: '800', color: Colors.navy || '#0B1E3F' },
  nutritionSetupBody: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  nutritionSetupCta: { marginTop: 6 },
  nutritionSetupCtaText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

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
  aboutCard: {
    marginTop: 20, marginBottom: 4,
    backgroundColor: Colors.aboutCardBg || Colors.navy,
    borderRadius: 18, padding: 22, alignItems: 'center', gap: 6,
    borderBottomWidth: 4, borderBottomColor: Colors.aboutCardBorder || Colors.primary,
  },
  aboutTitle: { fontSize: 20, fontWeight: '900', fontFamily: BrandFonts.heading || undefined },
  aboutText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 18 },
});
