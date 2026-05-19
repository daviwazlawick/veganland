import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { apiGetMe } from '../services/apiService';

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile } = useApp();
  const { user, token, logout } = useAuth();
  const [usage, setUsage] = useState(null);

  useEffect(() => {
    if (!token) return;
    apiGetMe(token).then(data => setUsage(data.usage)).catch(() => {});
  }, [token]);

  const diet = profile ? DIETS.find(d => d.id === profile.dietId) : null;
  const allergies = profile
    ? (profile.allergyIds || []).map(id => ALLERGIES.find(a => a.id === id)).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t(language, 'profile.title')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardLabelWrap}>
              <Text style={styles.cardLabel}>{t(language, 'profile.diet')}</Text>
            </View>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('ProfileSetup')}
            >
              <Text style={styles.editBtnText}>{t(language, 'profile.edit')}</Text>
            </TouchableOpacity>
          </View>

          {diet ? (
            <View style={styles.dietRow}>
              <View style={styles.dietIconWrap}>
                <Text style={styles.dietIcon}>{diet.icon}</Text>
              </View>
              <View>
                <Text style={styles.dietName}>{diet.label[language]}</Text>
                <Text style={styles.dietDesc}>{diet.description[language]}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>
              {language === 'pt' ? 'Nenhum perfil configurado' : 'No profile configured'}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t(language, 'profile.allergies')}</Text>
          {allergies.length > 0 ? (
            <View style={styles.allergiesWrap}>
              {allergies.map(a => (
                <View key={a.id} style={styles.allergyBadge}>
                  <Text style={styles.allergyIcon}>{a.icon}</Text>
                  <Text style={styles.allergyLabel}>{a.label[language]}</Text>
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
            <TouchableOpacity
              style={[styles.langOption, language === 'pt' && styles.langOptionActive]}
              onPress={() => setLanguage('pt')}
              activeOpacity={0.85}
            >
              <Text style={styles.langFlag}>🇧🇷</Text>
              <Text style={[styles.langLabel, language === 'pt' && styles.langLabelActive]}>
                Português
              </Text>
              {language === 'pt' && (
                <View style={styles.langCheck}>
                  <Text style={styles.langCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => setLanguage('en')}
              activeOpacity={0.85}
            >
              <Text style={styles.langFlag}>🇺🇸</Text>
              <Text style={[styles.langLabel, language === 'en' && styles.langLabelActive]}>
                English
              </Text>
              {language === 'en' && (
                <View style={styles.langCheck}>
                  <Text style={styles.langCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {user && (
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              <View style={styles.accountIconWrap}>
                <Text style={styles.accountIcon}>👤</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountLabel}>
                  {language === 'pt' ? 'Conta' : 'Account'}
                </Text>
                <Text style={styles.accountEmail}>{user.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
              <Text style={styles.logoutText}>
                {language === 'pt' ? '🚪 Sair da conta' : '🚪 Sign out'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {user && usage != null && (
          <View style={styles.usageCard}>
            <View style={styles.usageHeader}>
              <Text style={styles.usageLabel}>
                {language === 'pt' ? 'Scans este mês' : 'Scans this month'}
              </Text>
              <Text style={styles.usageCount}>
                {usage.count}
                <Text style={styles.usageLimit}>/{usage.limit}</Text>
              </Text>
            </View>
            <View style={styles.usageBarBg}>
              <View style={[styles.usageBarFill, { width: `${Math.min(100, (usage.count / usage.limit) * 100)}%` }]} />
            </View>
            {usage.resets_at && (
              <Text style={styles.usageReset}>
                {language === 'pt'
                  ? `Renova em ${new Date(usage.resets_at).toLocaleDateString('pt-BR')}`
                  : `Resets on ${new Date(usage.resets_at).toLocaleDateString('en-US')}`}
              </Text>
            )}
          </View>
        )}

        <View style={styles.aboutCard}>
          <Text style={styles.aboutEmoji}>🌱</Text>
          <Text style={styles.aboutTitle}>VeganLand</Text>
          <Text style={styles.aboutText}>
            {language === 'pt'
              ? 'Analise produtos com IA e saiba se são seguros para o seu perfil dietético.'
              : "Analyze products with AI and know if they're safe for your dietary profile."}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '900', color: Colors.primary },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabelWrap: {},
  cardLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editBtn: {
    backgroundColor: Colors.accentLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editBtnText: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  dietRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dietIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dietIcon: { fontSize: 28 },
  dietName: { fontSize: 17, fontWeight: '800', color: Colors.text },
  dietDesc: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  noData: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  allergiesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  allergyIcon: { fontSize: 15 },
  allergyLabel: { fontSize: 13, color: Colors.danger, fontWeight: '700' },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  langOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryBg,
  },
  langFlag: { fontSize: 22 },
  langLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textLight },
  langLabelActive: { color: Colors.primaryDark },
  langCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCheckText: { color: Colors.white, fontSize: 12, fontWeight: '900' },
  accountCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 14,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  accountIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: Colors.accentLight,
    alignItems: 'center', justifyContent: 'center',
  },
  accountIcon: { fontSize: 24 },
  accountInfo: { flex: 1 },
  accountLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountEmail: { fontSize: 15, fontWeight: '700', color: Colors.text, marginTop: 2 },
  logoutBtn: {
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.danger + '30',
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: Colors.dangerDark },
  aboutCard: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 4,
    borderBottomColor: Colors.accentDark,
  },
  aboutEmoji: { fontSize: 36 },
  aboutTitle: { fontSize: 22, fontWeight: '900', color: Colors.white },
  aboutText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  usageCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 2,
    borderColor: Colors.border,
    gap: 10,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usageLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  usageCount: { fontSize: 20, fontWeight: '900', color: Colors.text },
  usageLimit: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  usageBarBg: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  usageReset: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
});
