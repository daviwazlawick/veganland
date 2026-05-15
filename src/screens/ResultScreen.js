import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

const STATUS_CONFIG = {
  SAFE: {
    icon: '✅',
    color: Colors.safe,
    bgColor: Colors.safeLight,
    borderColor: Colors.safe,
    titleKey: 'result.safe',
    subtitleKey: 'result.safe_subtitle',
  },
  CAUTION: {
    icon: '⚠️',
    color: Colors.caution,
    bgColor: Colors.cautionLight,
    borderColor: Colors.caution,
    titleKey: 'result.caution',
    subtitleKey: 'result.caution_subtitle',
  },
  NOT_SAFE: {
    icon: '❌',
    color: Colors.danger,
    bgColor: Colors.dangerLight,
    borderColor: Colors.danger,
    titleKey: 'result.not_safe',
    subtitleKey: 'result.not_safe_subtitle',
  },
};

export default function ResultScreen({ navigation, route }) {
  const { language } = useApp();
  const { result } = route.params;
  const config = STATUS_CONFIG[result.status] || STATUS_CONFIG.CAUTION;
  const sourceKey = result.ingredients_source || result.productInfo?.source;

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
        {result.imageUri && (
          <Image
            source={{ uri: result.imageUri }}
            style={styles.productImage}
            resizeMode="cover"
          />
        )}

        <View style={[styles.statusCard, { backgroundColor: config.bgColor, borderColor: config.borderColor }]}>
          <Text style={styles.statusIcon}>{config.icon}</Text>
          <Text style={[styles.statusBadge, { color: config.color }]}>
            {t(language, config.titleKey)}
          </Text>
          <Text style={[styles.statusSubtitle, { color: config.color }]}>
            {t(language, config.subtitleKey)}
          </Text>
        </View>

        <View style={styles.section}>
          {(result.product_name || result.productInfo?.product_name || sourceKey) && (
            <View style={styles.metaRow}>
              {(result.product_name || result.productInfo?.product_name) && (
                <Text style={styles.metaText} numberOfLines={2}>
                  {result.product_name || result.productInfo?.product_name}
                </Text>
              )}
              {sourceKey && (
                <Text style={styles.sourceBadge}>
                  {t(language, `result.source_${sourceKey}`)}
                </Text>
              )}
            </View>
          )}
          <Text style={styles.sectionTitle}>
            {result.title}
          </Text>
          <Text style={styles.explanation}>
            {result.cannot_read
              ? t(language, 'result.cannot_read')
              : result.explanation}
          </Text>
        </View>

        {result.concerns && result.concerns.length > 0 && (
          <View style={styles.concernsSection}>
            <Text style={styles.concernsTitle}>{t(language, 'result.concerns')}</Text>
            <View style={styles.concernsList}>
              {result.concerns.map((item, i) => (
                <View key={i} style={styles.concernItem}>
                  <Text style={styles.concernBullet}>⚠️</Text>
                  <Text style={styles.concernText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {(!result.concerns || result.concerns.length === 0) && result.status === 'SAFE' && (
          <View style={styles.noConcernsBox}>
            <Text style={styles.noConcernsIcon}>🎉</Text>
            <Text style={styles.noConcernsText}>{t(language, 'result.no_concerns')}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.scanAgainButton}
          onPress={() => navigation.navigate('Scan')}
        >
          <Text style={styles.scanAgainText}>📸 {t(language, 'result.scan_again')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 24, color: Colors.primary },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  content: { paddingBottom: 100 },
  productImage: {
    width: '100%',
    height: 220,
    backgroundColor: Colors.border,
  },
  statusCard: {
    margin: 16,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
  },
  statusIcon: { fontSize: 56, marginBottom: 12 },
  statusBadge: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 6,
  },
  statusSubtitle: { fontSize: 15, fontWeight: '500' },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  metaText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '600',
  },
  sourceBadge: {
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  explanation: {
    fontSize: 15,
    color: Colors.textLight,
    lineHeight: 24,
  },
  concernsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  concernsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  concernsList: { gap: 8 },
  concernItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 12,
    padding: 14,
  },
  concernBullet: { fontSize: 16 },
  concernText: { flex: 1, fontSize: 14, color: Colors.danger, fontWeight: '600' },
  noConcernsBox: {
    marginHorizontal: 16,
    alignItems: 'center',
    backgroundColor: Colors.safeLight,
    borderRadius: 16,
    padding: 20,
  },
  noConcernsIcon: { fontSize: 32, marginBottom: 8 },
  noConcernsText: { fontSize: 15, color: Colors.safe, fontWeight: '600', textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  scanAgainButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  scanAgainText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
});
