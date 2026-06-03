import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
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
import { apiGetMe } from '../services/apiService';

const API_URL = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/$/, '');
import { PremiumIcon, BrandName } from '../components/ui';

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile } = useApp();
  const { user, token, logout } = useAuth();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t(language, 'profile.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}>

        <PersonalHero profile={profile} user={user} language={language} navigation={navigation} />

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardLabel}>{t(language, 'profile.diet')}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('ProfileSetup')}>
              <Text style={styles.editBtnText}>{t(language, 'profile.edit')}</Text>
            </TouchableOpacity>
          </View>
          {diet ? (
            <View style={styles.dietRow}>
              <View style={styles.dietIconWrap}>
                <PremiumIcon name={diet.icon} size={42} />
              </View>
              <View>
                <Text style={styles.dietName}>{diet.label[language] || diet.label.en}</Text>
                <Text style={styles.dietDesc}>{diet.description[language] || diet.description.en}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>{t(language, 'profile.no_profile')}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t(language, 'profile.allergies')}</Text>
          {allergies.length > 0 ? (
            <View style={styles.allergiesWrap}>
              {allergies.map(a => (
                <View key={a.id} style={styles.allergyBadge}>
                  <PremiumIcon name={a.icon} size={18} />
                  <Text style={styles.allergyLabel}>{a.label[language] || a.label.en}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noData}>{t(language, 'profile.no_allergies')}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t(language, 'profile.language')}</Text>
          <View style={styles.langRow}>
            {LANGUAGES.map(item => (
              <TouchableOpacity
                key={item.code}
                style={[styles.langOption, language === item.code && styles.langOptionActive]}
                onPress={() => setLanguage(item.code)}
                activeOpacity={0.85}
              >
                <Text style={styles.langFlag}>{item.flag}</Text>
                <Text style={[styles.langLabel, language === item.code && styles.langLabelActive]}>
                  {item.name}
                </Text>
                {language === item.code && (
                  <View style={styles.langCheck}>
                    <Text style={styles.langCheckText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {user && (
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.accountIconWrap}>
                <PremiumIcon name="profile" size={34} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>{t(language, 'profile.account')}</Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
              <Text style={styles.logoutText}>{t(language, 'profile.sign_out')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {user && usage != null && (
          <View style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <View style={styles.usageTitleRow}>
                <Text style={styles.usageLabel}>{t(language, 'profile.scans_this_month')}</Text>
                <View style={[
                  styles.planBadge,
                  userType === 'starter' && styles.planBadgeStarter,
                  userType === 'premium' && styles.planBadgePremium,
                  userType === 'admin' && styles.planBadgeAdmin,
                ]}>
                  <Text style={[
                    styles.planBadgeText,
                    userType === 'starter' && styles.planBadgeTextStarter,
                    userType === 'premium' && styles.planBadgeTextPremium,
                    userType === 'admin' && styles.planBadgeTextAdmin,
                  ]}>
                    {userType === 'free'
                      ? t(language, 'profile.plan_free')
                      : userType === 'starter'
                        ? t(language, 'profile.plan_starter')
                        : userType === 'premium'
                          ? t(language, 'profile.plan_premium')
                          : t(language, 'profile.plan_admin')}
                  </Text>
                </View>
              </View>
              {usage.limit === null ? (
                <Text style={styles.usageCount}>{t(language, 'profile.plan_unlimited')}</Text>
              ) : (
                <Text style={styles.usageCount}>
                  {usage.count}<Text style={styles.usageLimit}>/{usage.limit}</Text>
                </Text>
              )}
            </View>
            {usage.limit !== null && (
              <View style={styles.usageBarBg}>
                <View style={[styles.usageBarFill, { width: `${Math.min(100, (usage.count / usage.limit) * 100)}%` }]} />
              </View>
            )}
            {usage.resets_at && (
              <Text style={styles.usageReset}>
                {t(language, 'profile.renews_on', {
                  date: new Date(usage.resets_at).toLocaleDateString(localeFor(language)),
                })}
              </Text>
            )}
            {(userType === 'free' || userType === 'starter') && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate('Paywall', { currentPlan: userType })}
                activeOpacity={0.85}
              >
                <Text style={styles.upgradeBtnText}>{t(language, 'plans.change')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {userType === 'admin' && (
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/admin?token=${token}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={16} color="#1E1B4B" />
            <Text style={styles.adminBtnText}>Admin Panel</Text>
          </TouchableOpacity>
        )}

        <View style={styles.aboutCard}>
          <PremiumIcon name="scan" size={54} color={Colors.primary} />
          <BrandName
            style={styles.aboutTitle}
            prefixColor={Colors.white}
            suffixColor={Colors.primary}
          />
          <Text style={styles.aboutText}>{t(language, 'profile.about_text')}</Text>
        </View>

        <View style={styles.legalFooter}>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/terms`)}>
            <Text style={styles.legalLink}>{t(language, 'profile.terms')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/privacy`)}>
            <Text style={styles.legalLink}>{t(language, 'profile.privacy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalDot}>·</Text>
          <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${legalBase}/imprint`)}>
            <Text style={styles.legalLink}>{t(language, 'profile.imprint')}</Text>
          </TouchableOpacity>
        </View>

        {user && (
          <TouchableOpacity style={styles.deleteAccountBtn} onPress={() => navigation.navigate('DeleteAccount')} activeOpacity={0.7}>
            <Text style={styles.deleteAccountText}>{t(language, 'profile.delete_account')}</Text>
          </TouchableOpacity>
        )}
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
    <View style={heroStyles.card}>
      <View style={heroStyles.row}>
        <View style={heroStyles.avatarWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={heroStyles.avatarImage} />
          ) : (
            <View style={heroStyles.avatarPlaceholder}>
              {initials ? (
                <Text style={heroStyles.initials}>{initials}</Text>
              ) : (
                <Ionicons name="person" size={32} color="rgba(255,255,255,0.7)" />
              )}
            </View>
          )}
        </View>
        <View style={heroStyles.info}>
          {name ? (
            <Text style={heroStyles.name} numberOfLines={1}>{name}</Text>
          ) : (
            <Text style={heroStyles.namePlaceholder}>{t(language, 'personal.name_placeholder')}</Text>
          )}
          {user?.email && (
            <Text style={heroStyles.email} numberOfLines={1}>{user.email}</Text>
          )}
          {bio ? <Text style={heroStyles.bio} numberOfLines={2}>{bio}</Text> : null}
        </View>
      </View>
      <TouchableOpacity style={heroStyles.editBtn} onPress={() => navigation.navigate('EditPersonal')} activeOpacity={0.85}>
        <Ionicons name="pencil" size={14} color={Colors.primary} />
        <Text style={heroStyles.editBtnText}>{t(language, 'personal.edit')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryBg,
    borderRadius: 28, padding: 18,
    borderWidth: 1, borderColor: Colors.primaryLight,
    gap: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarWrap: { flexShrink: 0 },
  avatarImage: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: Colors.primary + '60',
  },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.navy,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.primaryLight,
  },
  initials: {
    fontSize: 26, fontWeight: '800', color: Colors.white,
    fontFamily: BrandFonts.heading || 'serif',
  },
  info: { flex: 1, gap: 3 },
  name: {
    fontSize: 20, fontWeight: '800', color: Colors.text,
    fontFamily: BrandFonts.headingMed || undefined,
  },
  namePlaceholder: { fontSize: 15, color: Colors.textMuted, fontStyle: 'italic' },
  email: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  bio: { fontSize: 13, color: Colors.textLight, fontWeight: '500', marginTop: 2 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.headerBg,
  },
  headerTitle: {
    fontSize: 34, fontWeight: '700', color: Colors.headerText,
    fontFamily: BrandFonts.heading || 'serif',
  },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
    gap: 14,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: {
    fontSize: 13, fontWeight: '800', color: Colors.textMuted,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  editBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: Colors.primaryDark, fontWeight: '700' },
  dietRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dietIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  dietName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  dietDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  noData: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  allergiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6,
  },
  allergyLabel: { fontSize: 13, color: Colors.primaryDark, fontWeight: '700' },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langOption: {
    width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  langOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryBg },
  langFlag: { fontSize: 13, fontWeight: '800', color: Colors.textLight },
  langLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textLight },
  langLabelActive: { color: Colors.primaryDark },
  langCheck: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  langCheckText: { color: Colors.white, fontSize: 12, fontWeight: '900' },
  accountCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
    gap: 14,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  accountIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  accountInfo: { flex: 1 },
  accountLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountEmail: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 2 },
  logoutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.danger + '30',
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: Colors.dangerDark },
  usageCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
    gap: 10,
  },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  usageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planBadge: { backgroundColor: '#FFF3D6', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  planBadgeStarter: { backgroundColor: '#E8F4FF' },
  planBadgePremium: { backgroundColor: '#FFFBEB' },
  planBadgeAdmin: { backgroundColor: '#EEF0FF' },
  planBadgeText: { fontSize: 11, fontWeight: '800', color: '#B87600' },
  planBadgeTextStarter: { color: '#1A5F8F' },
  planBadgeTextPremium: { color: '#92400E' },
  planBadgeTextAdmin: { color: '#1E1B4B' },
  usageLabel: { fontSize: 13, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  usageCount: { fontSize: 20, fontWeight: '900', color: Colors.text },
  usageLimit: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  usageBarBg: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  usageBarFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  usageReset: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  upgradeBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  upgradeBtnText: { fontSize: 15, fontWeight: '800', color: Colors.white },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#EEF0FF',
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#C7C5E8',
  },
  adminBtnText: { fontSize: 15, fontWeight: '800', color: '#1E1B4B' },
  aboutCard: {
    backgroundColor: Colors.aboutCardBg,
    borderRadius: 20, padding: 24,
    alignItems: 'center', gap: 8,
    borderBottomWidth: 4, borderBottomColor: Colors.aboutCardBorder,
  },
  aboutTitle: {
    fontSize: 22, fontWeight: '900',
    fontFamily: BrandFonts.heading || 'serif',
  },
  aboutText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20, fontWeight: '500' },
  legalFooter: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    gap: 8, paddingVertical: 8,
  },
  legalLink: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textDecorationLine: 'underline' },
  legalDot: { fontSize: 12, color: Colors.border },
  deleteAccountBtn: { alignItems: 'center', paddingVertical: 8 },
  deleteAccountText: { fontSize: 13, color: Colors.danger, fontWeight: '600', textDecorationLine: 'underline' },
});
