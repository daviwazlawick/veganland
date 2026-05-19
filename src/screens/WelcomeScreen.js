import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { LANGUAGES, t } from '../i18n';
import { Colors } from '../constants/colors';
import { PremiumIcon } from '../components/ui';

export default function WelcomeScreen({ navigation }) {
  const { language, setLanguage } = useApp();
  const languageIndex = LANGUAGES.findIndex(item => item.code === language);
  const currentLanguage = LANGUAGES[languageIndex] || LANGUAGES[0];
  const nextLanguage = LANGUAGES[(languageIndex + 1) % LANGUAGES.length] || LANGUAGES[0];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />


      <SafeAreaView edges={['top']} style={styles.hero}>
        <TouchableOpacity style={styles.langBtn} onPress={() => setLanguage(nextLanguage.code)}>
          <Text style={styles.langText}>{currentLanguage.flag}</Text>
        </TouchableOpacity>

        <View style={[styles.botanicalOrb, styles.orbA]} />
        <View style={[styles.botanicalOrb, styles.orbB]} />

        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <PremiumIcon name="vegan" size={58} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.appName}>{t(language, 'welcome.title')}</Text>
        <Text style={styles.tagline}>{t(language, 'welcome.tagline')}</Text>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.sheet}>
        <Text style={styles.sheetTitle}>{t(language, 'welcome.subtitle')}</Text>

        <View style={styles.features}>
          <Feature
            icon="scan" bg={Colors.primaryBg} label={t(language, 'welcome.feature_photo_label')}
            detail={t(language, 'welcome.feature_photo_detail')}
          />
          <Feature
            icon="ai" bg={Colors.accentLight} label={t(language, 'welcome.feature_ai_label')}
            detail={t(language, 'welcome.feature_ai_detail')}
          />
          <Feature
            icon="safe" bg="#E8F5E9" label={t(language, 'welcome.feature_result_label')}
            detail={t(language, 'welcome.feature_result_detail')}
          />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Register')} activeOpacity={0.9}>
            <Text style={styles.primaryBtnText}>{t(language, 'welcome.start')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>{t(language, 'welcome.already_have_account')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Feature({ icon, bg, label, detail }) {
  return (
    <View style={styles.featureRow}>
      <View style={[styles.featureIconBox, { backgroundColor: bg }]}>
        <PremiumIcon name={icon} size={30} />
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureLabel}>{label}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.darkSurface },
  hero: {
    flex: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  langBtn: {
    position: 'absolute', top: 12, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  langText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  botanicalOrb: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  orbA: { width: 180, height: 180, top: 80, left: -70 },
  orbB: { width: 140, height: 140, bottom: 50, right: -48 },
  logoWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  logoCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
  },
  appName: { fontSize: 46, fontWeight: '700', color: Colors.white, fontFamily: 'serif', letterSpacing: 0 },
  tagline: { fontSize: 15, color: 'rgba(255,255,255,0.82)', textAlign: 'center' },
  sheet: {
    flex: 6,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 8,
    gap: 18,
  },
  sheetTitle: { fontSize: 15, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },
  features: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIconBox: {
    width: 52, height: 52, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureLabel: { fontSize: 15, fontWeight: '800', color: Colors.text },
  featureDetail: { fontSize: 12, color: Colors.textLight, fontWeight: '500', marginTop: 1 },
  buttons: { gap: 12, marginTop: 4 },
  primaryBtn: {
    backgroundColor: Colors.primary, borderRadius: 18,
    paddingVertical: 18, alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: Colors.primaryDark,
  },
  primaryBtnText: { color: Colors.white, fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
  ghostBtn: { paddingVertical: 14, alignItems: 'center' },
  ghostBtnText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
});
