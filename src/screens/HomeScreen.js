import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

const STATUS_CONFIG = {
  SAFE: { color: Colors.safe, bg: Colors.safeLight, icon: '✅', labelKey: 'result.safe' },
  CAUTION: { color: Colors.caution, bg: Colors.cautionLight, icon: '⚠️', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.danger, bg: Colors.dangerLight, icon: '❌', labelKey: 'result.not_safe' },
};

export default function HomeScreen({ navigation }) {
  const { language, profile, scanHistory } = useApp();

  const diet = profile ? DIETS.find(d => d.id === profile.dietId) : null;
  const allergies = profile
    ? (profile.allergyIds || []).map(id => ALLERGIES.find(a => a.id === id)).filter(Boolean)
    : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t(language, 'home.title')}</Text>
        <Text style={styles.headerEmoji}>🌱</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.profileCardHeader}>
            <Text style={styles.profileCardTitle}>{t(language, 'home.your_profile')}</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileSetup')}
              style={styles.editBtn}
            >
              <Text style={styles.editBtnText}>{t(language, 'home.change_profile')}</Text>
            </TouchableOpacity>
          </View>

          {diet && (
            <View style={styles.dietRow}>
              <Text style={styles.dietEmoji}>{diet.icon}</Text>
              <View>
                <Text style={styles.dietName}>{diet.label[language]}</Text>
                <Text style={styles.dietDesc}>{diet.description[language]}</Text>
              </View>
            </View>
          )}

          {allergies.length > 0 ? (
            <View style={styles.allergiesRow}>
              {allergies.map(a => (
                <View key={a.id} style={styles.allergyBadge}>
                  <Text style={styles.allergyBadgeIcon}>{a.icon}</Text>
                  <Text style={styles.allergyBadgeText}>{a.label[language]}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noAllergies}>{t(language, 'home.no_allergies')}</Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => navigation.navigate('Scan')}
          activeOpacity={0.85}
        >
          <View style={styles.scanButtonInner}>
            <Text style={styles.scanButtonIcon}>📸</Text>
            <Text style={styles.scanButtonText}>{t(language, 'home.scan_button')}</Text>
            <Text style={styles.scanButtonSubtitle}>{t(language, 'home.scan_subtitle')}</Text>
          </View>
          <Text style={styles.scanButtonArrow}>→</Text>
        </TouchableOpacity>

        {scanHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>{t(language, 'home.recent_scans')}</Text>
            {scanHistory.slice(0, 5).map((scan, index) => {
              const config = STATUS_CONFIG[scan.status] || STATUS_CONFIG.CAUTION;
              return (
                <View key={index} style={[styles.historyItem, { backgroundColor: config.bg }]}>
                  <Text style={styles.historyIcon}>{config.icon}</Text>
                  <View style={styles.historyContent}>
                    <Text style={[styles.historyStatus, { color: config.color }]}>
                      {t(language, config.labelKey)}
                    </Text>
                    <Text style={styles.historyTitle2} numberOfLines={1}>
                      {scan.title}
                    </Text>
                    <Text style={styles.historyDate}>
                      {new Date(scan.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {scanHistory.length === 0 && (
          <View style={styles.emptyHistory}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>{t(language, 'home.no_scans')}</Text>
          </View>
        )}
      </ScrollView>
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
    paddingVertical: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  headerEmoji: { fontSize: 28 },
  profileCard: {
    margin: 16,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  profileCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textLight },
  editBtn: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  dietRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  dietEmoji: { fontSize: 32 },
  dietName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  dietDesc: { fontSize: 13, color: Colors.textLight },
  allergiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  allergyBadgeIcon: { fontSize: 14 },
  allergyBadgeText: { fontSize: 12, color: Colors.danger, fontWeight: '600' },
  noAllergies: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  scanButton: {
    margin: 16,
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  scanButtonInner: { flex: 1 },
  scanButtonIcon: { fontSize: 36, marginBottom: 8 },
  scanButtonText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.white,
    marginBottom: 4,
  },
  scanButtonSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  scanButtonArrow: { fontSize: 28, color: 'rgba(255,255,255,0.8)' },
  historySection: { marginHorizontal: 16, marginBottom: 24 },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  historyIcon: { fontSize: 24 },
  historyContent: { flex: 1 },
  historyStatus: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  historyTitle2: { fontSize: 15, fontWeight: '600', color: Colors.text, marginVertical: 2 },
  historyDate: { fontSize: 12, color: Colors.textMuted },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
});
