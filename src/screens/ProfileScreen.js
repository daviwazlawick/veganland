import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

export default function ProfileScreen({ navigation }) {
  const { language, setLanguage, profile } = useApp();

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
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t(language, 'profile.diet')}</Text>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => navigation.navigate('ProfileSetup')}
            >
              <Text style={styles.editBtnText}>{t(language, 'profile.edit')}</Text>
            </TouchableOpacity>
          </View>
          {diet ? (
            <View style={styles.dietRow}>
              <Text style={styles.dietIcon}>{diet.icon}</Text>
              <View>
                <Text style={styles.dietName}>{diet.label[language]}</Text>
                <Text style={styles.dietDesc}>{diet.description[language]}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noData}>{language === 'pt' ? 'Nenhum perfil configurado' : 'No profile configured'}</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t(language, 'profile.allergies')}</Text>
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
          <Text style={styles.cardTitle}>{t(language, 'profile.language')}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langOption, language === 'pt' && styles.langOptionActive]}
              onPress={() => setLanguage('pt')}
            >
              <Text style={styles.langFlag}>🇧🇷</Text>
              <Text style={[styles.langLabel, language === 'pt' && styles.langLabelActive]}>Português</Text>
              {language === 'pt' && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langOption, language === 'en' && styles.langOptionActive]}
              onPress={() => setLanguage('en')}
            >
              <Text style={styles.langFlag}>🇺🇸</Text>
              <Text style={[styles.langLabel, language === 'en' && styles.langLabelActive]}>English</Text>
              {language === 'en' && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>🌱 VeganLand</Text>
          <Text style={styles.aboutText}>
            {language === 'pt'
              ? 'Analise produtos alimentícios com IA e saiba se são seguros para seu perfil. Powered by Claude (Anthropic).'
              : 'Analyze food products with AI and know if they\'re safe for your profile. Powered by Claude (Anthropic).'}
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
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  editBtn: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  dietRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dietIcon: { fontSize: 32 },
  dietName: { fontSize: 17, fontWeight: '700', color: Colors.text },
  dietDesc: { fontSize: 13, color: Colors.textLight },
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
  allergyLabel: { fontSize: 13, color: Colors.danger, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: 10 },
  langOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  langOptionActive: { borderColor: Colors.primary, backgroundColor: '#F0FAF2' },
  langFlag: { fontSize: 20 },
  langLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textLight },
  langLabelActive: { color: Colors.primary },
  langCheck: { color: Colors.primary, fontWeight: '700' },
  aboutCard: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  aboutTitle: { fontSize: 20, fontWeight: '800', color: Colors.white, marginBottom: 8 },
  aboutText: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 20 },
});
