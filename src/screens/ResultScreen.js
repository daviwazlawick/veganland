import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

const STATUS_CONFIG = {
  SAFE: {
    icon: '💚',
    bannerIcon: '🥳',
    color: Colors.safeDark,
    bannerBg: Colors.safe,
    cardBg: Colors.safeLight,
    cardBorder: Colors.primary + '40',
    titleKey: 'result.safe',
    subtitleKey: 'result.safe_subtitle',
    celebration: ['🎉', '🌿', '✨', '🥦', '✨', '🌿', '🎉'],
  },
  CAUTION: {
    icon: '⚡',
    bannerIcon: '🤔',
    color: Colors.cautionDark,
    bannerBg: Colors.caution,
    cardBg: Colors.cautionLight,
    cardBorder: Colors.caution + '40',
    titleKey: 'result.caution',
    subtitleKey: 'result.caution_subtitle',
    celebration: ['⚡', '🔍', '⚡'],
  },
  NOT_SAFE: {
    icon: '🚫',
    bannerIcon: '😟',
    color: Colors.dangerDark,
    bannerBg: Colors.danger,
    cardBg: Colors.dangerLight,
    cardBorder: Colors.danger + '40',
    titleKey: 'result.not_safe',
    subtitleKey: 'result.not_safe_subtitle',
    celebration: ['🚫', '⚠️', '🚫'],
  },
};

export default function ResultScreen({ navigation, route }) {
  const { language } = useApp();
  const { result } = route.params;
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.CAUTION;
  const sourceKey = result.ingredients_source || result.productInfo?.source;
  const productName = result.product_name || result.productInfo?.product_name;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'result.full_analysis')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.banner, { backgroundColor: cfg.bannerBg }]}>
          <View style={styles.celebrationRow}>
            {cfg.celebration.map((e, i) => (
              <Text key={i} style={styles.celebrationEmoji}>{e}</Text>
            ))}
          </View>
          <View style={styles.bannerIconCircle}>
            <Text style={styles.bannerBigIcon}>{cfg.bannerIcon}</Text>
          </View>
          <Text style={styles.bannerTitle}>{t(language, cfg.titleKey)}</Text>
          <Text style={styles.bannerSub}>{t(language, cfg.subtitleKey)}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeIcon}>{cfg.icon}</Text>
          </View>
        </View>

        {result.imageUri && (
          <Image source={{ uri: result.imageUri }} style={styles.productImage} resizeMode="cover" />
        )}

        <View style={[styles.analysisCard, { borderColor: cfg.cardBorder, backgroundColor: cfg.cardBg }]}>
          {(productName || sourceKey) && (
            <View style={styles.metaRow}>
              {productName && (
                <View style={styles.productNameWrap}>
                  <Text style={styles.productNameIcon}>🏷️</Text>
                  <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
                </View>
              )}
              {sourceKey && (
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
        </View>

        {result.concerns && result.concerns.length > 0 && (
          <View style={styles.concernsCard}>
            <View style={styles.concernsHeader}>
              <Text style={styles.concernsIcon}>⚠️</Text>
              <Text style={styles.concernsTitle}>{t(language, 'result.concerns')}</Text>
            </View>
            {result.concerns.map((item, i) => (
              <View key={i} style={styles.concernItem}>
                <Text style={styles.concernBullet}>🔴</Text>
                <Text style={styles.concernText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {(!result.concerns || result.concerns.length === 0) && result.status === 'SAFE' && (
          <View style={styles.noConcernsCard}>
            <Text style={styles.noConcernsEmojis}>🌿 💚 🥦</Text>
            <Text style={styles.noConcernsTitle}>
              {language === 'pt' ? 'Nenhum problema encontrado!' : 'No issues found!'}
            </Text>
            <Text style={styles.noConcernsText}>{t(language, 'result.no_concerns')}</Text>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.9}>
          <Text style={styles.scanAgainText}>📷  {t(language, 'result.scan_again')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 2, borderBottomColor: Colors.border,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 26, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  content: { paddingBottom: 20 },
  banner: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 24,
    gap: 10,
    position: 'relative',
  },
  celebrationRow: {
    flexDirection: 'row', gap: 6, marginBottom: 4,
  },
  celebrationEmoji: { fontSize: 18 },
  bannerIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  bannerBigIcon: { fontSize: 48 },
  bannerTitle: { fontSize: 32, fontWeight: '900', color: Colors.white, letterSpacing: 0.5 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: '600', textAlign: 'center' },
  statusBadge: {
    position: 'absolute', bottom: -16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  statusBadgeIcon: { fontSize: 18 },
  productImage: {
    width: '100%', height: 200,
    backgroundColor: Colors.border,
    marginTop: 20,
  },
  analysisCard: {
    margin: 16,
    marginTop: 28,
    borderRadius: 22,
    padding: 20,
    borderWidth: 2,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  productNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  productNameIcon: { fontSize: 14 },
  productName: { flex: 1, fontSize: 13, color: Colors.textLight, fontWeight: '700' },
  sourceBadge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textLight },
  analysisTitle: { fontSize: 19, fontWeight: '900', color: Colors.text },
  explanation: { fontSize: 15, color: Colors.textLight, lineHeight: 24, fontWeight: '500' },
  concernsCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 22, padding: 18,
    borderWidth: 2, borderColor: Colors.dangerLight,
    gap: 10,
  },
  concernsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  concernsIcon: { fontSize: 20 },
  concernsTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  concernItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14, padding: 12,
  },
  concernBullet: { fontSize: 14 },
  concernText: { flex: 1, fontSize: 14, color: Colors.dangerDark, fontWeight: '700', lineHeight: 20 },
  noConcernsCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.safeLight,
    borderRadius: 22, padding: 24,
    alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.primary + '30',
  },
  noConcernsEmojis: { fontSize: 28 },
  noConcernsTitle: { fontSize: 17, fontWeight: '900', color: Colors.safeDark },
  noConcernsText: { fontSize: 14, color: Colors.safeDark, fontWeight: '600', textAlign: 'center' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: Colors.card,
    borderTopWidth: 2, borderTopColor: Colors.border,
  },
  scanAgainBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    borderBottomWidth: 4, borderBottomColor: Colors.primaryDark,
  },
  scanAgainText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
});
