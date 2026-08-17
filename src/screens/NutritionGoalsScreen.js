import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';

const FIELDS = [
  { key: 'bmr',          unit: 'kcal', label: 'nutrition.bmr_label' },
  { key: 'tdee',         unit: 'kcal', label: 'nutrition.tdee_label' },
  { key: 'calories_kcal', unit: 'kcal', label: 'nutrition.calories' },
  { key: 'protein_g',     unit: 'g',    label: 'nutrition.protein' },
  { key: 'fat_g',         unit: 'g',    label: 'nutrition.fat' },
  { key: 'carbs_g',       unit: 'g',    label: 'nutrition.carbs' },
  { key: 'fiber_g',       unit: 'g',    label: 'nutrition.fiber' },
  { key: 'sugar_g',       unit: 'g',    label: 'nutrition.sugar' },
  { key: 'salt_g',        unit: 'g',    label: 'nutrition.salt' },
  { key: 'water_ml',      unit: 'ml',   label: 'nutrition.water' },
];

export default function NutritionGoalsScreen({ navigation, route }) {
  const { language } = useApp();
  const { goals, saveGoals, bodyProfile } = useNutrition();

  const bmrInfo = useMemo(() => {
    if (!bodyProfile) return null;
    const { sex, birth_date, height_cm, weight_kg, activity_level } = bodyProfile;
    if (!weight_kg || !height_cm || !birth_date) return null;
    const age = Math.max(10, Math.floor((Date.now() - new Date(birth_date)) / (365.25 * 24 * 3600 * 1000)));
    const w = Number(weight_kg), h = Number(height_cm);
    const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161));
    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = Math.round(bmr * (mult[activity_level] || 1.375));
    return { bmr, tdee };
  }, [bodyProfile]);
  const insets = useSafeAreaInsets();
  const suggested = route.params?.suggested;

  const base = suggested || goals || {};
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = {};
    FIELDS.forEach(f => {
      if (base[f.key] != null) {
        init[f.key] = String(Math.round(Number(base[f.key]) * 10) / 10);
      } else if (f.key === 'bmr' && bmrInfo) {
        init[f.key] = String(bmrInfo.bmr);
      } else if (f.key === 'tdee' && bmrInfo) {
        init[f.key] = String(bmrInfo.tdee);
      } else {
        init[f.key] = '';
      }
    });
    setValues(init);
  }, [goals, suggested, bmrInfo]);

  function set(key, val) {
    setValues(prev => ({ ...prev, [key]: val.replace(',', '.') }));
  }

  async function handleSave() {
    setSaving(true);
    const payload = {};
    FIELDS.forEach(f => { payload[f.key] = parseFloat(values[f.key]) || null; });
    await saveGoals(payload);
    setSaving(false);
    navigation.goBack();
  }

  function handleReset() {
    navigation.navigate('EditPersonal');
  }

  const isCustom = goals?.is_custom;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'nutrition.goals_title')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {isCustom ? t(language, 'nutrition.goals_custom') : t(language, 'nutrition.goals_auto')}
            </Text>
          </View>

          <View style={styles.card}>
            {FIELDS.map((f, i) => (
              <View key={f.key} style={[styles.fieldRow, i < FIELDS.length - 1 && styles.fieldBorder]}>
                <Text style={styles.fieldLabel}>{t(language, f.label)}</Text>
                <View style={styles.fieldInput}>
                  <TextInput
                    style={styles.input}
                    value={values[f.key] || ''}
                    onChangeText={v => set(f.key, v)}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor="#94a3b8"
                  />
                  <Text style={styles.unit}>{f.unit}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.note}>{t(language, 'nutrition.goals_note')}</Text>

          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            <Text style={styles.saveBtnText}>{saving ? '…' : t(language, 'nutrition.goals_save')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>{t(language, 'nutrition.goals_reset')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 14 },
  badge: { backgroundColor: Colors.backgroundSecondary, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  card: { backgroundColor: Colors.card, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  fieldLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.navy },
  fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { width: 80, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8, padding: 8, fontSize: 15, fontWeight: '700', textAlign: 'right', color: Colors.navy, fontFamily: BrandFonts.mono || undefined },
  unit: { fontSize: 12, color: '#94a3b8', width: 26 },
  note: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  saveBtn: { backgroundColor: Colors.navy, padding: 16, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  resetBtn: { alignItems: 'center', paddingVertical: 10 },
  resetBtnText: { color: Colors.navy, textDecorationLine: 'underline', fontSize: 13 },
  bmrCard: {
    backgroundColor: Colors.forest || Colors.navy,
    borderRadius: 16, padding: 18, gap: 12,
  },
  bmrCardTitle: { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: 0.4 },
  bmrCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 16, marginTop: -6 },
  bmrRow: { flexDirection: 'row', alignItems: 'center' },
  bmrItem: { flex: 1, alignItems: 'center', gap: 2 },
  bmrDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.1)' },
  bmrValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  bmrLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  bmrUnit: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
});
