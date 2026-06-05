import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { PremiumIcon } from '../components/ui';
import { ALLERGIES } from '../constants/allergies';

const STATUS_CONFIG = {
  SAFE: {
    icon: 'safe',
    color: Colors.safeDark,
    bannerBg: Colors.safe,
    cardBg: Colors.safeLight,
    cardBorder: Colors.primary + '40',
    titleKey: 'result.safe',
    subtitleKey: 'result.safe_subtitle',
  },
  CAUTION: {
    icon: 'caution',
    color: Colors.cautionDark,
    bannerBg: Colors.caution,
    cardBg: Colors.cautionLight,
    cardBorder: Colors.caution + '40',
    titleKey: 'result.caution',
    subtitleKey: 'result.caution_subtitle',
  },
  NOT_SAFE: {
    icon: 'danger',
    color: Colors.dangerDark,
    bannerBg: Colors.danger,
    cardBg: Colors.dangerLight,
    cardBorder: Colors.danger + '40',
    titleKey: 'result.not_safe',
    subtitleKey: 'result.not_safe_subtitle',
  },
};

const KNOWN_SOURCES = new Set(['image', 'cache', 'database', 'open_food_facts', 'unknown', 'missing']);

function parseIngredients(text) {
  if (!text) return [];
  return text.split(/,\s*/).map(s => s.trim()).filter(Boolean);
}

export default function ResultScreen({ navigation, route }) {
  const { language } = useApp();
  const { result } = route.params;
  const cfg = STATUS_CONFIG[result.status] || STATUS_CONFIG.CAUTION;
  const sourceKey = result.ingredients_source || result.productInfo?.source;
  const productName = result.product_name || result.productInfo?.product_name;
  const ingredientsText = result.productInfo?.ingredients_text || result.ingredients_text;
  const concerns = result.concerns || [];

  const ALLERGEN_ID_MAP = { nuts: 'tree_nuts', wheat: 'gluten' };
  const identifiedAllergens = (result.identified_allergens || [])
    .map(id => ALLERGEN_ID_MAP[id] || id)
    .filter((id, idx, arr) => arr.indexOf(id) === idx)
    .map(id => ALLERGIES.find(a => a.id === id))
    .filter(Boolean);

  const ingredients = Array.isArray(result.normalized_ingredients) && result.normalized_ingredients.length > 0
    ? result.normalized_ingredients
    : parseIngredients(ingredientsText);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'result.full_analysis')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={[styles.banner, { backgroundColor: cfg.bannerBg }]}>
          <View style={styles.lightLine} />
          <View style={styles.bannerIconCircle}>
            <PremiumIcon name={cfg.icon} size={64} color={Colors.white} />
          </View>
          <Text style={styles.bannerTitle}>{t(language, cfg.titleKey)}</Text>
          <Text style={styles.bannerSub}>{t(language, cfg.subtitleKey)}</Text>
          <View style={styles.statusBadge}>
            <PremiumIcon name={cfg.icon} size={22} />
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
                  <PremiumIcon name="scan" size={16} muted />
                  <Text style={styles.productName} numberOfLines={1}>{productName}</Text>
                </View>
              )}
              {sourceKey && KNOWN_SOURCES.has(sourceKey) && (
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

        <View style={styles.ingredientsCard}>
          <Text style={styles.ingredientsTitle}>{t(language, 'result.ingredients')}</Text>
          {ingredients.length > 0 ? (
            <View style={styles.ingredientsWrap}>
              {ingredients.map((item, i) => {
                const lower = item.toLowerCase();
                const flagged = concerns.some(c => {
                  const cl = c.toLowerCase();
                  return lower.includes(cl) || cl.includes(lower);
                });
                return (
                  <View key={i} style={[styles.ingredientChip, flagged && styles.ingredientChipFlagged]}>
                    <Text style={[styles.ingredientText, flagged && styles.ingredientTextFlagged]}>{item}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.ingredientsEmpty}>{t(language, 'result.ingredients_unavailable')}</Text>
          )}
        </View>

        <View style={styles.allergensCard}>
          <Text style={styles.allergensTitle}>{t(language, 'result.allergens_found')}</Text>
          {identifiedAllergens.length > 0 ? (
            <View style={styles.allergensWrap}>
              {identifiedAllergens.map((allergen, i) => (
                <View key={i} style={styles.allergenChip}>
                  <Text style={styles.allergenText}>{allergen.label[language] || allergen.label.en}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.allergensNone}>{t(language, 'result.allergens_none')}</Text>
          )}
        </View>

        {result.concerns && result.concerns.length > 0 && (
          <View style={styles.concernsCard}>
            <View style={styles.concernsHeader}>
              <PremiumIcon name="caution" size={24} />
              <Text style={styles.concernsTitle}>{t(language, 'result.concerns')}</Text>
            </View>
            {result.concerns.map((item, i) => (
              <View key={i} style={styles.concernItem}>
                <View style={styles.concernBullet} />
                <Text style={styles.concernText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {(!result.concerns || result.concerns.length === 0) && result.status === 'SAFE' && (
          <View style={styles.noConcernsCard}>
            <PremiumIcon name="safe" size={52} />
            <Text style={styles.noConcernsTitle}>
            {t(language, 'result.no_issues')}
            </Text>
            <Text style={styles.noConcernsText}>{t(language, 'result.no_concerns')}</Text>
          </View>
        )}

        <Text style={styles.aiDisclaimer}>{t(language, 'result.ai_disclaimer')}</Text>

        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.scanAgainBtn} onPress={() => navigation.navigate('Scan')} activeOpacity={0.9}>
          <Text style={styles.scanAgainText}>{t(language, 'result.scan_again')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.wrongProductBtn}
          onPress={() => navigation.navigate('Scan', { photoMode: true, wrongProductBarcode: result.barcode || null })}
          activeOpacity={0.7}
        >
          <Text style={styles.wrongProductText}>{t(language, 'result.wrong_product')}</Text>
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
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 26, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  content: { paddingBottom: 20 },
  banner: {
    alignItems: 'center',
    margin: 16,
    borderRadius: 32,
    paddingTop: 30,
    paddingBottom: 34,
    paddingHorizontal: 24,
    gap: 10,
    position: 'relative',
  },
  lightLine: {
    width: '68%',
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.38)',
    marginBottom: 6,
  },
  bannerIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)',
  },
  bannerTitle: { fontSize: 38, fontWeight: '700', color: Colors.white, fontFamily: 'serif', letterSpacing: 0 },
  bannerSub: { fontSize: 14, color: 'rgba(255,255,255,0.88)', fontWeight: '600', textAlign: 'center' },
  statusBadge: {
    position: 'absolute', bottom: -16,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 4,
  },
  productImage: {
    width: '100%', height: 200,
    backgroundColor: Colors.border,
    marginTop: 20,
  },
  analysisCard: {
    margin: 16,
    marginTop: 28,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  productNameWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  productName: { flex: 1, fontSize: 13, color: Colors.textLight, fontWeight: '700' },
  sourceBadge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.textLight },
  analysisTitle: { fontSize: 19, fontWeight: '900', color: Colors.text },
  explanation: { fontSize: 15, color: Colors.textLight, lineHeight: 24, fontWeight: '500' },
  ingredientsCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.border,
    gap: 14,
  },
  ingredientsTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  ingredientsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ingredientChip: {
    backgroundColor: Colors.backgroundSecondary,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: Colors.border,
  },
  ingredientChipFlagged: {
    backgroundColor: Colors.dangerLight,
    borderColor: Colors.danger + '60',
  },
  ingredientText: { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  ingredientTextFlagged: { color: Colors.dangerDark, fontWeight: '800' },
  ingredientsEmpty: { fontSize: 14, color: Colors.textLight, fontStyle: 'italic' },
  allergensCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#FFF8ED',
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: '#F59E0B40',
    gap: 14,
  },
  allergensTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  allergensWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  allergenChip: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#F59E0B60',
  },
  allergenText: { fontSize: 13, color: '#92400E', fontWeight: '800' },
  allergensNone: { fontSize: 14, color: Colors.textLight, fontStyle: 'italic' },
  concernsCard: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card,
    borderRadius: 28, padding: 20,
    borderWidth: 1, borderColor: Colors.dangerLight,
    gap: 10,
  },
  concernsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  concernsTitle: { fontSize: 16, fontWeight: '900', color: Colors.text },
  concernItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14, padding: 12,
  },
  concernBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger, marginTop: 6 },
  concernText: { flex: 1, fontSize: 14, color: Colors.dangerDark, fontWeight: '700', lineHeight: 20 },
  noConcernsCard: {
    marginHorizontal: 16,
    backgroundColor: Colors.safeLight,
    borderRadius: 28, padding: 26,
    alignItems: 'center', gap: 8,
    borderWidth: 2, borderColor: Colors.primary + '30',
  },
  noConcernsTitle: { fontSize: 17, fontWeight: '900', color: Colors.safeDark },
  noConcernsText: { fontSize: 14, color: Colors.safeDark, fontWeight: '600', textAlign: 'center' },
  aiDisclaimer: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 20, paddingHorizontal: 24, lineHeight: 16 },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: 'rgba(250,248,244,0.94)',
    borderTopWidth: 0,
  },
  scanAgainBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  scanAgainText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
  wrongProductBtn: { alignItems: 'center', paddingTop: 14 },
  wrongProductText: { color: Colors.textLight, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
});
