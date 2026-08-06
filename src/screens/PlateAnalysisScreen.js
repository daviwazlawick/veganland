import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { PremiumIcon } from '../components/ui';
import { apiAnalyzePlate } from '../services/apiService';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: 'safe',    labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: 'caution', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: 'danger',  labelKey: 'result.not_safe' },
};

export default function PlateAnalysisScreen({ navigation }) {
  const { language, profile } = useApp();
  const { token } = useAuth();
  const { logConsumption } = useNutrition();
  const insets = useSafeAreaInsets();

  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [meal, setMeal] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  async function pickImage(fromCamera) {
    try {
      let res;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('', t(language, 'scan.camera_permission')); return; }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      }
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setImage(asset.uri);
      setResult(null);
      setLogged(false);
      await analyzeImage(asset.base64);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível aceder à câmara.');
    }
  }

  function pickImageWeb(useCamera) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.capture = 'environment';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        setImage(dataUrl);
        setResult(null);
        setLogged(false);
        const base64 = dataUrl.split(',')[1];
        await analyzeImage(base64);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function analyzeImage(base64) {
    setAnalyzing(true);
    try {
      const data = await apiAnalyzePlate(token, base64, language, profile);
      setResult(data);
      if (!data.items || data.items.length === 0) {
        Alert.alert('', t(language, 'nutrition.plate_no_food'));
      }
    } catch {
      Alert.alert('Erro', 'Análise falhou. Tenta com outra foto.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleLog() {
    if (!result?.items?.length) return;
    setLogging(true);
    try {
      for (const item of result.items) {
        await logConsumption({
          product_name: item.name,
          source: 'plate_photo',
          grams: item.grams,
          meal_type: meal,
          calories_kcal: item.calories_kcal || null,
          protein_g:     item.protein_g     || null,
          fat_g:         item.fat_g         || null,
          carbs_g:       item.carbs_g       || null,
          fiber_g:       item.fiber_g       || null,
        });
      }
      setLogged(true);
      setTimeout(() => navigation.navigate('NutritionDashboard'), 1200);
    } catch {
      Alert.alert('Erro', 'Não foi possível registar. Tenta novamente.');
    } finally {
      setLogging(false);
    }
  }

  const verdict = result?.diet_verdict;
  const cfg = verdict?.status ? (STATUS_CONFIG[verdict.status] || STATUS_CONFIG.CAUTION) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.plate_title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>

        {!image ? (
          <View style={s.pickCard}>
            <Text style={s.pickEmoji}>🍽️</Text>
            <Text style={s.pickTitle}>{t(language, 'nutrition.plate_title')}</Text>
            <Text style={s.pickSub}>{t(language, 'nutrition.plate_subtitle')}</Text>
            <View style={s.pickBtns}>
              {Platform.OS === 'web' ? (
                <>
                  <TouchableOpacity style={s.pickBtn} onPress={() => pickImageWeb(true)}>
                    <Text style={s.pickBtnIcon}>📷</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_take_photo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickBtn, s.pickBtnSecondary]} onPress={() => pickImageWeb(false)}>
                    <Text style={s.pickBtnIcon}>🖼️</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_pick_library')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(true)}>
                    <Text style={s.pickBtnIcon}>📷</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_take_photo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickBtn, s.pickBtnSecondary]} onPress={() => pickImage(false)}>
                    <Text style={s.pickBtnIcon}>🖼️</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_pick_library')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={s.imageCard}>
              <Image source={{ uri: image }} style={s.previewImage} resizeMode="cover" />
              <TouchableOpacity style={s.retakeBtn} onPress={() => { setImage(null); setResult(null); }}>
                <Text style={s.retakeBtnText}>↩ {t(language, 'nutrition.plate_retake')}</Text>
              </TouchableOpacity>
            </View>

            {analyzing && (
              <View style={s.analyzingCard}>
                <ActivityIndicator color={Colors.navy || '#0B1E3F'} size="large" />
                <Text style={s.analyzingText}>{t(language, 'nutrition.plate_analyzing')}</Text>
              </View>
            )}

            {!analyzing && result?.items?.length > 0 && (
              <>
                {/* ── Diet Verdict Banner ── */}
                {cfg && (
                  <View style={[s.verdictCard, { backgroundColor: cfg.bg, borderColor: cfg.strip }]}>
                    <View style={[s.verdictIconWrap, { backgroundColor: cfg.strip + '30' }]}>
                      <PremiumIcon name={cfg.icon} size={36} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.verdictStatus, { color: cfg.color }]}>{t(language, cfg.labelKey)}</Text>
                      {verdict.explanation ? (
                        <Text style={[s.verdictExplanation, { color: cfg.color }]}>{verdict.explanation}</Text>
                      ) : null}
                      {verdict.concerns?.length > 0 && (
                        <View style={s.verdictConcerns}>
                          {verdict.concerns.map((c, i) => (
                            <Text key={i} style={[s.verdictConcernItem, { color: cfg.color }]}>• {c}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* ── Items ── */}
                <View style={s.card}>
                  <Text style={s.sectionTitle}>{t(language, 'nutrition.plate_items_found')} ({result.items.length})</Text>
                  {result.items.map((item, i) => {
                    const itemCfg = item.item_status ? (STATUS_CONFIG[item.item_status] || null) : null;
                    return (
                      <View key={i} style={[s.itemRow, itemCfg && { borderLeftWidth: 3, borderLeftColor: itemCfg.strip, paddingLeft: 10 }]}>
                        <View style={{ flex: 1 }}>
                          <View style={s.itemNameRow}>
                            <Text style={s.itemName}>{item.name}</Text>
                            {itemCfg && item.item_status !== 'SAFE' && (
                              <View style={[s.itemStatusDot, { backgroundColor: itemCfg.strip }]} />
                            )}
                          </View>
                          <Text style={s.itemMacros}>
                            {Math.round(item.grams || 0)}g
                            {item.calories_kcal ? `  ·  ${Math.round(item.calories_kcal)} kcal` : ''}
                            {item.protein_g ? `  ·  ${Math.round(item.protein_g)}g prot` : ''}
                          </Text>
                          {item.item_concern ? (
                            <Text style={[s.itemConcern, { color: itemCfg?.color || '#94a3b8' }]}>{item.item_concern}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalValue}>{Math.round(result.total?.calories_kcal || 0)} kcal</Text>
                  </View>
                </View>

                {/* ── Meal selector & Log ── */}
                <View style={s.card}>
                  <Text style={s.sectionTitle}>{t(language, 'nutrition.meal_label')}</Text>
                  <View style={s.mealRow}>
                    {MEALS.map(m => (
                      <TouchableOpacity key={m} onPress={() => setMeal(m)} style={[s.mealBtn, meal === m && s.mealBtnActive]}>
                        <Text style={[s.mealBtnText, meal === m && s.mealBtnTextActive]}>{t(language, `nutrition.${m}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.logBtn, (logging || logged) && { opacity: 0.7 }]}
                  onPress={handleLog}
                  disabled={logging || logged}
                >
                  <Text style={s.logBtnText}>
                    {logged ? `✓ ${t(language, 'nutrition.plate_logged')}` : logging ? '…' : t(language, 'nutrition.plate_log_btn')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 14 },
  pickCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pickEmoji: { fontSize: 52 },
  pickTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy || '#0B1E3F', textAlign: 'center' },
  pickSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  pickBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  pickBtn: { flex: 1, backgroundColor: Colors.navy || '#0B1E3F', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  pickBtnSecondary: { backgroundColor: '#F1F5F9' },
  pickBtnIcon: { fontSize: 24 },
  pickBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' },
  imageCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  previewImage: { width: '100%', height: 240 },
  retakeBtn: { padding: 12, alignItems: 'center' },
  retakeBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  analyzingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  analyzingText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  verdictCard: {
    borderRadius: 18, padding: 16,
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    borderWidth: 2,
  },
  verdictIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  verdictStatus: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  verdictExplanation: { fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18, opacity: 0.85 },
  verdictConcerns: { marginTop: 6, gap: 2 },
  verdictConcernItem: { fontSize: 12, fontWeight: '600', lineHeight: 17 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.navy || '#0B1E3F' },
  itemStatusDot: { width: 8, height: 8, borderRadius: 4 },
  itemMacros: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemConcern: { fontSize: 11, fontWeight: '600', marginTop: 3, fontStyle: 'italic' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  totalValue: { fontSize: 14, fontWeight: '800', color: Colors.navy || '#0B1E3F' },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
  mealBtnActive: { backgroundColor: Colors.navy || '#0B1E3F', borderColor: Colors.navy || '#0B1E3F' },
  mealBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  mealBtnTextActive: { color: '#fff' },
  logBtn: { backgroundColor: '#22C55E', padding: 16, borderRadius: 14, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
