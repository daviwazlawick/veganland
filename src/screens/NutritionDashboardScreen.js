import React, { useCallback, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { useAuth } from '../context/AuthContext';
import { apiSearchFood } from '../services/apiService';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';

const isNovaQI = Brand.id === 'novaqi';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const MACRO_FIELDS = [
  { key: 'calories_kcal', unit: 'kcal', color: '#FFCB3B' },
  { key: 'protein_g',     unit: 'g',    color: '#3B82F6' },
  { key: 'fat_g',         unit: 'g',    color: '#F97316' },
  { key: 'carbs_g',       unit: 'g',    color: '#8B5CF6' },
];
const ALL_FIELDS = [...MACRO_FIELDS,
  { key: 'fiber_g',  unit: 'g',  color: '#10B981' },
  { key: 'sugar_g',  unit: 'g',  color: '#EC4899' },
  { key: 'salt_g',   unit: 'g',  color: '#6B7280' },
  { key: 'water_ml', unit: 'ml', color: '#06B6D4' },
];

const EMPTY_ENTRY = { name: '', grams: '', calories: '', protein: '', fat: '', carbs: '', meal: 'lunch' };

const FOREST_BARS = [
  { key: 'protein_g', color: '#2FC472' },
  { key: 'carbs_g', color: '#F4B53F' },
  { key: 'fat_g', color: '#64748B' },
];

function ForestBar({ fieldKey, color, consumed, goal, language }) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const labelKey = fieldKey.replace('_kcal', '').replace('_g', '').replace('_ml', '');
  return (
    <View style={forest.barWrap}>
      <Text style={forest.barEyebrow}>
        {t(language, `nutrition.${labelKey}`)} · {Math.round(consumed || 0)}/{Math.round(goal || 0)}
      </Text>
      <View style={forest.barTrack}>
        <View style={[forest.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ForestSummaryCard({ todayTotals, goals, language }) {
  const consumed = todayTotals.calories_kcal || 0;
  const goal = goals?.calories_kcal || 0;
  const remaining = Math.max(goal - consumed, 0);
  return (
    <View style={forest.card}>
      <View style={forest.row}>
        <View style={forest.col}>
          <Text style={forest.bigNum}>{Math.round(consumed)}</Text>
          <Text style={forest.colLabel}>{t(language, 'nutrition.calories')}</Text>
        </View>
        <View style={forest.divider} />
        <View style={forest.col}>
          <Text style={[forest.bigNum, forest.bigNumGreen]}>{Math.round(remaining)}</Text>
          <Text style={forest.colLabel}>{t(language, 'nutrition.remaining')}</Text>
        </View>
        <View style={forest.divider} />
        <View style={forest.col}>
          <Text style={forest.bigNum}>{Math.round(goal)}</Text>
          <Text style={forest.colLabel}>{t(language, 'nutrition.daily_goal')}</Text>
        </View>
      </View>
      <View style={forest.bars}>
        {FOREST_BARS.map(f => (
          <ForestBar
            key={f.key}
            fieldKey={f.key}
            color={f.color}
            consumed={todayTotals[f.key] || 0}
            goal={goals?.[f.key] || 0}
            language={language}
          />
        ))}
      </View>
    </View>
  );
}

function MacroBar({ labelKey, consumed, goal, unit, color, language }) {
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0;
  const over = goal > 0 && consumed > goal;
  return (
    <View style={bar.wrap}>
      <View style={bar.row}>
        <Text style={bar.label}>{t(language, `nutrition.${labelKey}`)}</Text>
        <Text style={[bar.value, over && bar.over]}>{Math.round(consumed)}<Text style={bar.unit}> {unit}</Text></Text>
        {goal > 0 && <Text style={bar.goal}> / {Math.round(goal)}</Text>}
      </View>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${pct * 100}%`, backgroundColor: over ? '#EF4444' : color }]} />
      </View>
    </View>
  );
}

export default function NutritionDashboardScreen({ navigation, route }) {
  const { language } = useApp();
  const { token } = useAuth();
  const { goals, todayLog, todayTotals, deleteConsumption, logConsumption, refresh, addWeight, weightHistory } = useNutrition();
  const insets = useSafeAreaInsets();
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loggingWater, setLoggingWater] = useState(false);
  const [addModal, setAddModal] = useState(false);
  const [addEntry, setAddEntry] = useState(EMPTY_ENTRY);
  const [savingEntry, setSavingEntry] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => {
    refresh();
    if (route?.params?.openAddFood) {
      setAddEntry(EMPTY_ENTRY);
      setSuggestions([]);
      setAddModal(true);
      navigation.setParams({ openAddFood: false });
    }
  }, [refresh, route?.params?.openAddFood]));

  const byMeal = MEALS.reduce((acc, m) => { acc[m] = todayLog.filter(e => e.meal_type === m); return acc; }, {});
  const noGoals = !goals || !goals.calories_kcal;
  const latestWeight = weightHistory[0];

  async function handleSaveWeight() {
    const kg = parseFloat(weightInput.replace(',', '.'));
    if (!kg || kg < 20 || kg > 500) return;
    setSavingWeight(true);
    await addWeight(kg);
    setSavingWeight(false);
    setWeightInput('');
    setWeightModal(false);
  }

  async function logWater(ml) {
    if (loggingWater) return;
    setLoggingWater(true);
    try {
      await logConsumption({ product_name: 'Water', source: 'manual', water_ml: ml, meal_type: null });
    } catch {}
    setLoggingWater(false);
  }

  function handleDelete(id, name) {
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${name}"?`)) deleteConsumption(id);
    } else {
      Alert.alert(t(language, 'nutrition.delete_entry'), name, [
        { text: 'Cancel', style: 'cancel' },
        { text: t(language, 'nutrition.delete_entry'), style: 'destructive', onPress: () => deleteConsumption(id) },
      ]);
    }
  }

  function openAddModal() {
    setAddEntry(EMPTY_ENTRY);
    setSuggestions([]);
    setAddModal(true);
  }

  function handleNameChange(text) {
    setAddEntry(p => ({ ...p, name: text }));
    clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSuggestions([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await apiSearchFood(token, text.trim());
        setSuggestions(results || []);
      } catch { setSuggestions([]); }
    }, 350);
  }

  function pickSuggestion(item) {
    setAddEntry({
      name:     item.product_name,
      grams:    item.grams     ? String(Math.round(item.grams))         : '',
      calories: item.calories_kcal ? String(Math.round(item.calories_kcal)) : '',
      protein:  item.protein_g ? String(Math.round(item.protein_g))     : '',
      fat:      item.fat_g     ? String(Math.round(item.fat_g))         : '',
      carbs:    item.carbs_g   ? String(Math.round(item.carbs_g))       : '',
      meal:     addEntry.meal,
    });
    setSuggestions([]);
  }

  async function handleSaveEntry() {
    const name = addEntry.name.trim();
    if (!name) return;
    setSavingEntry(true);
    try {
      await logConsumption({
        product_name: name,
        source: 'manual',
        grams: addEntry.grams ? parseFloat(addEntry.grams) : null,
        meal_type: addEntry.meal || null,
        calories_kcal: addEntry.calories ? parseFloat(addEntry.calories) : null,
        protein_g: addEntry.protein ? parseFloat(addEntry.protein) : null,
        fat_g: addEntry.fat ? parseFloat(addEntry.fat) : null,
        carbs_g: addEntry.carbs ? parseFloat(addEntry.carbs) : null,
      });
      setAddModal(false);
    } catch {}
    setSavingEntry(false);
  }

  const displayFields = expanded ? ALL_FIELDS : MACRO_FIELDS;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.dashboard_title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NutritionReport')} style={s.reportBtn}>
          <Text style={s.reportBtnText}>📊</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>

        {noGoals ? (
          <TouchableOpacity style={s.setupCard} onPress={() => navigation.navigate('BodyProfile')}>
            <Text style={s.setupTitle}>{t(language, 'nutrition.setup_prompt_title')}</Text>
            <Text style={s.setupBody}>{t(language, 'nutrition.setup_prompt_body')}</Text>
            <Text style={s.setupCta}>{t(language, 'nutrition.setup_prompt_cta')} →</Text>
          </TouchableOpacity>
        ) : isNovaQI ? (
          <ForestSummaryCard
            todayTotals={todayTotals}
            goals={goals}
            language={language}
          />
        ) : (
          <View style={s.card}>
            {displayFields.map(f => (
              <MacroBar key={f.key} labelKey={f.key.replace('_kcal', '').replace('_g', '').replace('_ml', '')}
                consumed={todayTotals[f.key]} goal={goals?.[f.key] || 0} unit={f.unit} color={f.color} language={language} />
            ))}
            <TouchableOpacity onPress={() => setExpanded(!expanded)} style={s.expandBtn}>
              <Text style={s.expandBtnText}>{expanded ? '▲ Less' : '▼ More'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.weightRow}>
          <View style={s.weightCard}>
            <Text style={s.weightLabel}>{t(language, 'nutrition.weight_title')}</Text>
            <Text style={s.weightValue}>{latestWeight ? `${latestWeight.weight_kg} kg` : '—'}</Text>
          </View>
          <TouchableOpacity style={s.weightAddBtn} onPress={() => setWeightModal(true)}>
            <Text style={s.weightAddText}>+ kg</Text>
          </TouchableOpacity>
        </View>

        <View style={s.waterCard}>
          <View style={s.waterTop}>
            <Text style={s.waterLabel}>💧 {t(language, 'nutrition.water')}</Text>
            <Text style={s.waterValue}>{Math.round(todayTotals.water_ml || 0)} <Text style={s.waterUnit}>ml</Text></Text>
          </View>
          <View style={s.waterBtns}>
            {[150, 250, 330, 500].map(ml => (
              <TouchableOpacity key={ml} style={s.waterBtn} onPress={() => logWater(ml)} disabled={loggingWater} activeOpacity={0.75}>
                <Text style={s.waterBtnText}>+{ml}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {MEALS.map(meal => byMeal[meal].length > 0 && (
          <View key={meal} style={s.mealSection}>
            <Text style={s.mealTitle}>{t(language, `nutrition.${meal}`)}</Text>
            {byMeal[meal].map(e => (
              <View key={e.id} style={s.entryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.entryName}>{e.product_name || '—'}</Text>
                  <Text style={s.entryMacros}>
                    {e.calories_kcal ? `${Math.round(e.calories_kcal)} kcal` : ''}
                    {e.protein_g ? `  ·  ${Math.round(e.protein_g)}g prot` : ''}
                    {e.grams ? `  ·  ${e.grams}g` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(e.id, e.product_name || '')} style={s.deleteBtn}>
                  <Text style={s.deleteText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}

        {todayLog.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>{t(language, 'nutrition.no_entries')}</Text>
            <Text style={s.emptySub}>{t(language, 'nutrition.log_cta')}</Text>
          </View>
        )}

        <TouchableOpacity style={s.addFoodBtn} onPress={openAddModal}>
          <Text style={s.addFoodBtnText}>+ {t(language, 'nutrition.add_food')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.goalsBtn} onPress={() => navigation.navigate('BodyProfile')}>
          <Text style={s.goalsBtnText}>⚙️ {t(language, 'nutrition.goals_title')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t(language, 'nutrition.weight_today')}</Text>
            <View style={s.weightInputRow}>
              <TextInput
                style={s.weightInput}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder={t(language, 'nutrition.weight_placeholder')}
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={s.weightUnit}>{t(language, 'nutrition.weight_unit')}</Text>
            </View>
            <TouchableOpacity onPress={handleSaveWeight} disabled={savingWeight} style={[s.saveBtn, savingWeight && { opacity: 0.6 }]}>
              <Text style={s.saveBtnText}>{savingWeight ? '…' : t(language, 'nutrition.weight_log_btn')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setWeightModal(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add food modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>{t(language, 'nutrition.add_food')}</Text>

            <TextInput
              style={s.fieldInput}
              value={addEntry.name}
              onChangeText={handleNameChange}
              placeholder={t(language, 'nutrition.food_name_placeholder')}
              placeholderTextColor="#94a3b8"
              autoFocus
            />
            {suggestions.length > 0 && (
              <View style={s.suggestBox}>
                {suggestions.map((item, i) => (
                  <TouchableOpacity key={i} style={s.suggestRow} onPress={() => pickSuggestion(item)}>
                    <Text style={s.suggestName} numberOfLines={1}>{item.product_name}</Text>
                    <Text style={s.suggestMacros}>
                      {item.calories_kcal ? `${Math.round(item.calories_kcal)} kcal` : ''}
                      {item.protein_g ? `  ·  ${Math.round(item.protein_g)}g prot` : ''}
                      {item.grams ? `  ·  ${Math.round(item.grams)}g` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={s.mealPicker}>
              {MEALS.map(m => (
                <TouchableOpacity key={m} style={[s.mealChip, addEntry.meal === m && s.mealChipActive]}
                  onPress={() => setAddEntry(p => ({ ...p, meal: m }))}>
                  <Text style={[s.mealChipText, addEntry.meal === m && s.mealChipTextActive]}>
                    {t(language, `nutrition.${m}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.numRow}>
              <View style={s.numField}>
                <Text style={s.numLabel}>Grams</Text>
                <TextInput style={s.numInput} value={addEntry.grams} onChangeText={v => setAddEntry(p => ({ ...p, grams: v }))}
                  placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
              <View style={s.numField}>
                <Text style={s.numLabel}>kcal</Text>
                <TextInput style={s.numInput} value={addEntry.calories} onChangeText={v => setAddEntry(p => ({ ...p, calories: v }))}
                  placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
            </View>

            <View style={s.numRow}>
              <View style={s.numField}>
                <Text style={s.numLabel}>Protein g</Text>
                <TextInput style={s.numInput} value={addEntry.protein} onChangeText={v => setAddEntry(p => ({ ...p, protein: v }))}
                  placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
              <View style={s.numField}>
                <Text style={s.numLabel}>Fat g</Text>
                <TextInput style={s.numInput} value={addEntry.fat} onChangeText={v => setAddEntry(p => ({ ...p, fat: v }))}
                  placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
              <View style={s.numField}>
                <Text style={s.numLabel}>Carbs g</Text>
                <TextInput style={s.numInput} value={addEntry.carbs} onChangeText={v => setAddEntry(p => ({ ...p, carbs: v }))}
                  placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
              </View>
            </View>

            <TouchableOpacity onPress={handleSaveEntry} disabled={savingEntry || !addEntry.name.trim()}
              style={[s.saveBtn, (savingEntry || !addEntry.name.trim()) && { opacity: 0.5 }]}>
              <Text style={s.saveBtnText}>{savingEntry ? '…' : t(language, 'nutrition.save')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddModal(false)} style={s.cancelBtn}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  reportBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  reportBtnText: { fontSize: 22 },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  setupCard: { backgroundColor: Colors.navy, borderRadius: 20, padding: 22 },
  setupTitle: { fontSize: 17, fontWeight: '800', color: '#fff', marginBottom: 6 },
  setupBody: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 14, lineHeight: 18 },
  setupCta: { fontSize: 14, fontWeight: '700', color: '#FFCB3B' },
  expandBtn: { alignItems: 'center', paddingTop: 4 },
  expandBtnText: { fontSize: 12, color: '#94a3b8' },
  weightRow: { flexDirection: 'row', gap: 12 },
  weightCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  weightLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  weightValue: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  weightAddBtn: { backgroundColor: Colors.navy, borderRadius: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  weightAddText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  waterCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  waterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  waterLabel: { fontSize: 14, fontWeight: '700', color: Colors.navy },
  waterValue: { fontSize: 20, fontWeight: '800', color: '#06B6D4' },
  waterUnit: { fontSize: 13, fontWeight: '400', color: '#94a3b8' },
  waterBtns: { flexDirection: 'row', gap: 8 },
  waterBtn: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#BFDBFE' },
  waterBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  mealSection: { gap: 6 },
  mealTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 },
  entryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  entryName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  entryMacros: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  deleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontSize: 16, color: '#94a3b8' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  addFoodBtn: { backgroundColor: Colors.navy, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  addFoodBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  goalsBtn: { alignItems: 'center', paddingVertical: 8 },
  goalsBtnText: { fontSize: 13, color: Colors.navy, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy, textAlign: 'center', marginBottom: 4 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightInput: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 22, fontWeight: '700', textAlign: 'center', color: Colors.navy },
  weightUnit: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  fieldInput: { borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 16, color: Colors.navy },
  suggestBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#fff', overflow: 'hidden', marginTop: -4 },
  suggestRow: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  suggestMacros: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  mealPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mealChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#F8FAFC' },
  mealChipActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  mealChipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  mealChipTextActive: { color: '#fff' },
  numRow: { flexDirection: 'row', gap: 8 },
  numField: { flex: 1, gap: 4 },
  numLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  numInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, fontSize: 15, fontWeight: '600', textAlign: 'center', color: Colors.navy },
  saveBtn: { backgroundColor: Colors.navy, padding: 14, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#94a3b8', fontSize: 14 },
});

const bar = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline' },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },
  value: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  over: { color: '#EF4444' },
  unit: { fontSize: 11, fontWeight: '400', color: '#94a3b8' },
  goal: { fontSize: 12, color: '#94a3b8' },
  track: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

const forest = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy,
    borderRadius: 26,
    padding: 20,
    gap: 18,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.18)' },
  bigNum: {
    fontSize: 22, fontWeight: '800', color: Colors.white,
    fontFamily: BrandFonts.mono || undefined,
  },
  bigNumGreen: { color: '#2FC472' },
  colLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  bars: { gap: 12 },
  barWrap: { gap: 6 },
  barEyebrow: {
    fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '700',
    fontFamily: BrandFonts.mono || undefined,
  },
  barTrack: { height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
});
