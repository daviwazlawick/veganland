import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, Modal, KeyboardAvoidingView, Keyboard, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { useAuth } from '../context/AuthContext';
import { apiSearchFood, apiGetProductInfo, apiGetExerciseHistory, apiGetLogRange } from '../services/apiService';
import { Ionicons } from '@expo/vector-icons';
import { t, localeFor } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { EXERCISES, CATEGORY_CONFIG, getExerciseName } from '../constants/exercises';

function formatTime(iso, language) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(localeFor(language), { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatEntryTime(iso, language) {
  const d = new Date(iso);
  return d.toLocaleString(localeFor(language), {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDay(dateStr, language) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric', month: 'short' });
}

const PERIODS = ['today', 'week', 'month', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const SOURCE_ICON = { scan: 'camera-outline', plate_photo: 'restaurant-outline', manual: 'pencil-outline' };

function dateRange(period, custom) {
  const to = new Date().toISOString().slice(0, 10);
  if (period === 'today') return { from: to, to };
  if (period === 'custom') {
    const from = ISO_DATE.test(custom?.from) ? custom.from : to;
    const toC  = ISO_DATE.test(custom?.to)   ? custom.to   : to;
    return from > toC ? { from: toC, to: from } : { from, to: toC };
  }
  const d = new Date();
  d.setDate(d.getDate() - (period === 'week' ? 6 : 29));
  return { from: d.toISOString().slice(0, 10), to };
}

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

const EMPTY_ENTRY = {
  name: '', grams: '', calories: '', protein: '', fat: '', carbs: '',
  sugar: '', fiber: '', salt: '', meal: 'lunch',
};

const FOREST_BARS = [
  { key: 'protein_g', color: '#2FC472' },
  { key: 'carbs_g', color: '#F4B53F' },
  { key: 'fat_g', color: '#64748B' },
];
const FOREST_BARS_EXTRA = [
  { key: 'fiber_g',  color: '#10B981' },
  { key: 'sugar_g',  color: '#EC4899' },
  { key: 'salt_g',   color: '#6B7280' },
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

function ForestSummaryCard({ todayTotals, goals, language, expanded, onToggleExpand, todayBurned }) {
  const consumed = todayTotals.calories_kcal || 0;
  const burned = todayBurned || 0;
  const goal = goals?.calories_kcal || 0;
  const net = Math.max(goal - consumed + burned, 0);
  return (
    <View style={forest.card}>
      <View style={forest.row}>
        <View style={forest.col}>
          <Text style={forest.bigNum}>{Math.round(consumed)}</Text>
          <Text style={forest.colLabel}>{t(language, 'nutrition.calories')}</Text>
        </View>
        <View style={forest.divider} />
        {burned > 0 ? (
          <>
            <View style={forest.col}>
              <Text style={[forest.bigNum, { color: '#FF8C42' }]}>{Math.round(burned)}</Text>
              <Text style={forest.colLabel}>{t(language, 'nutrition.burned') || 'burned'}</Text>
            </View>
            <View style={forest.divider} />
            <View style={forest.col}>
              <Text style={[forest.bigNum, forest.bigNumGreen]}>{Math.round(net)}</Text>
              <Text style={forest.colLabel}>{t(language, 'nutrition.net') || 'net'}</Text>
            </View>
          </>
        ) : (
          <>
            <View style={forest.col}>
              <Text style={[forest.bigNum, forest.bigNumGreen]}>{Math.round(net)}</Text>
              <Text style={forest.colLabel}>{t(language, 'nutrition.remaining')}</Text>
            </View>
            <View style={forest.divider} />
            <View style={forest.col}>
              <Text style={forest.bigNum}>{Math.round(goal)}</Text>
              <Text style={forest.colLabel}>{t(language, 'nutrition.daily_goal')}</Text>
            </View>
          </>
        )}
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
        {expanded && FOREST_BARS_EXTRA.map(f => (
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
      <TouchableOpacity onPress={onToggleExpand} style={s.expandBtn}>
        <Text style={s.expandBtnText}>{expanded ? '▲ Less' : '▼ More'}</Text>
      </TouchableOpacity>
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

function ReportView({ loading, loaded, rows, entries, exerciseHistory, goals, language }) {
  const nutritionByDate = rows.reduce((acc, r) => {
    const day = r.day || r.local_date;
    if (!acc[day]) acc[day] = { kcal: 0, protein: 0, fat: 0, carbs: 0, water: 0 };
    acc[day].kcal    += Number(r.calories_kcal) || 0;
    acc[day].protein += Number(r.protein_g) || 0;
    acc[day].fat     += Number(r.fat_g) || 0;
    acc[day].carbs   += Number(r.carbs_g) || 0;
    acc[day].water   += Number(r.water_ml) || 0;
    return acc;
  }, {});

  const exerciseByDate = exerciseHistory.reduce((acc, e) => {
    const day = e.local_date;
    (acc[day] = acc[day] || []).push(e);
    return acc;
  }, {});

  const allDates = [...new Set([
    ...Object.keys(nutritionByDate),
    ...Object.keys(exerciseByDate),
  ])].sort().reverse();

  const totalKcal = Object.values(nutritionByDate).reduce((sum, d) => sum + d.kcal, 0);
  const totalBurnedPeriod = exerciseHistory.reduce((sum, e) => sum + Number(e.calories_burned || 0), 0);
  const totalWater = Object.values(nutritionByDate).reduce((sum, d) => sum + d.water, 0);

  const chartDays = Object.keys(nutritionByDate).sort();
  const maxVal = Math.max(...chartDays.map(d => nutritionByDate[d].kcal), goals?.calories_kcal || 1, 1);

  if (loading) return <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />;
  if (loaded && allDates.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Text style={s.emptyText}>{t(language, 'nutrition.no_report_data')}</Text>
      </View>
    );
  }
  if (!loaded) return null;

  return (
    <>
      <View style={s.summaryCard}>
        <View style={s.sumRow}>
          <View style={s.sumCol}>
            <Text style={s.sumNum}>{Math.round(totalKcal)}</Text>
            <Text style={s.sumLabel}>kcal {t(language, 'nutrition.calories')}</Text>
          </View>
          {totalBurnedPeriod > 0 && (
            <>
              <View style={s.sumDivider} />
              <View style={s.sumCol}>
                <Text style={[s.sumNum, { color: '#E8450A' }]}>{Math.round(totalBurnedPeriod)}</Text>
                <Text style={s.sumLabel}>kcal {t(language, 'nutrition.burned')}</Text>
              </View>
            </>
          )}
          <View style={s.sumDivider} />
          <View style={s.sumCol}>
            <Text style={[s.sumNum, { color: '#06B6D4' }]}>{Math.round(totalWater / 100) / 10}L</Text>
            <Text style={s.sumLabel}>{t(language, 'nutrition.water')}</Text>
          </View>
        </View>
      </View>

      {chartDays.length > 1 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>{t(language, 'nutrition.calories')} / dia</Text>
          <View style={s.chartArea}>
            {chartDays.map(d => {
              const kcal = nutritionByDate[d]?.kcal || 0;
              return (
                <View key={d} style={s.barCol}>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { height: `${(kcal / maxVal) * 100}%` }]} />
                    {goals?.calories_kcal && (
                      <View style={[s.goalLine, { bottom: `${(goals.calories_kcal / maxVal) * 100}%` }]} />
                    )}
                  </View>
                  <Text style={s.barLabel}>{d.slice(5)}</Text>
                </View>
              );
            })}
          </View>
          {goals?.calories_kcal && (
            <Text style={s.chartNote}>— meta: {Math.round(goals.calories_kcal)} kcal</Text>
          )}
        </View>
      )}

      {allDates.map(date => {
        const nut = nutritionByDate[date];
        const exEntries = exerciseByDate[date] || [];
        const dayBurned = exEntries.reduce((sum, e) => sum + Number(e.calories_burned || 0), 0);
        return (
          <View key={date} style={s.daySection}>
            <Text style={s.dayHeader}>{formatDay(date, language)}</Text>
            <View style={s.dayStatsRow}>
              {nut && nut.kcal > 0 && (
                <View style={s.dayStat}>
                  <Ionicons name="restaurant-outline" size={13} color={Colors.navy} style={s.dayStatIcon} />
                  <Text style={s.dayStatTxt}>{Math.round(nut.kcal)} kcal</Text>
                </View>
              )}
              {dayBurned > 0 && (
                <View style={s.dayStat}>
                  <Ionicons name="flame-outline" size={13} color="#E8450A" style={s.dayStatIcon} />
                  <Text style={[s.dayStatTxt, { color: '#E8450A' }]}>{Math.round(dayBurned)} kcal</Text>
                </View>
              )}
              {nut && nut.water > 0 && (
                <View style={s.dayStat}>
                  <Ionicons name="water-outline" size={13} color="#06B6D4" style={s.dayStatIcon} />
                  <Text style={[s.dayStatTxt, { color: '#06B6D4' }]}>{Math.round(nut.water)} ml</Text>
                </View>
              )}
            </View>
            {nut && (nut.protein > 0 || nut.carbs > 0 || nut.fat > 0) && (
              <View style={s.dayMacroRow}>
                {[
                  { label: 'P', val: nut.protein, color: '#3B82F6' },
                  { label: 'C', val: nut.carbs,   color: '#8B5CF6' },
                  { label: 'G', val: nut.fat,     color: '#F97316' },
                ].map(m => (
                  <Text key={m.label} style={[s.dayMacro, { color: m.color }]}>
                    {m.label} {Math.round(m.val)}g
                  </Text>
                ))}
              </View>
            )}
            {exEntries.length > 0 && (
              <View style={s.dayExRow}>
                {exEntries.map(e => {
                  const ex = EXERCISES.find(x => x.id === e.exercise_id);
                  const cfg = ex ? CATEGORY_CONFIG[ex.category] : null;
                  return (
                    <View key={e.id} style={[s.dayExChip, { backgroundColor: cfg?.bg || '#F5F5F5', borderColor: cfg?.color || '#DDD' }]}>
                      <Text style={s.dayExChipTxt}><Ionicons name={ex?.icon || 'walk-outline'} size={11} color={cfg?.color || '#666'} /> {e.exercise_name} {Math.round(e.duration_min)}′</Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      {entries.length > 0 && (
        <View style={s.entriesCard}>
          <Text style={s.cardTitle}>
            {t(language, 'nutrition.entries_title') || 'Registros'}
            {' '}<Text style={s.entriesCount}>({entries.length})</Text>
          </Text>
          {entries.map(e => {
            const macros = [];
            if (Number(e.calories_kcal) > 0) macros.push(`${Math.round(e.calories_kcal)} kcal`);
            if (Number(e.protein_g) > 0)    macros.push(`P ${Math.round(e.protein_g)}g`);
            if (Number(e.carbs_g) > 0)      macros.push(`C ${Math.round(e.carbs_g)}g`);
            if (Number(e.fat_g) > 0)        macros.push(`G ${Math.round(e.fat_g)}g`);
            const water = Number(e.water_ml) || 0;
            const title = e.product_name
              || (water > 0 ? `${water} ml ${t(language, 'nutrition.water') || 'água'}` : '—');
            return (
              <View key={e.id} style={s.reportEntryRow}>
                <Ionicons name={SOURCE_ICON[e.source] || 'ellipse-outline'} size={14} color="#94a3b8" style={s.reportEntryIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={s.reportEntryTitle} numberOfLines={2}>{title}</Text>
                  <Text style={s.reportEntryMeta}>
                    {formatEntryTime(e.consumed_at, language)}
                    {e.meal_type ? ` · ${e.meal_type}` : ''}
                    {e.grams ? ` · ${Math.round(e.grams)}g` : ''}
                  </Text>
                  {macros.length > 0 && (
                    <Text style={s.reportEntryMacros}>{macros.join('  ·  ')}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

export default function NutritionDashboardScreen({ navigation, route }) {
  const { language } = useApp();
  const { token } = useAuth();
  const { goals, todayLog, todayTotals, deleteConsumption, logConsumption, updateConsumption, refresh, addWeight, weightHistory, todayBurned, todayExercise, deleteExercise, getReport } = useNutrition();
  const insets = useSafeAreaInsets();
  const [weightModal, setWeightModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [savingWeight, setSavingWeight] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loggingWater, setLoggingWater] = useState(false);

  // Report tab state — inline replacement for the separate NutritionReportScreen.
  const [period, setPeriod] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [reportRows, setReportRows] = useState([]);
  const [reportEntries, setReportEntries] = useState([]);
  const [reportExerciseHistory, setReportExerciseHistory] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportLoaded, setReportLoaded] = useState(false);

  const loadReport = useCallback(async (p, custom) => {
    setReportLoading(true);
    const { from, to } = dateRange(p, custom);
    const [res, exHistory, rawEntries] = await Promise.all([
      getReport(from, to).catch(() => ({ rows: [] })),
      apiGetExerciseHistory(token, from, to).catch(() => []),
      apiGetLogRange(token, from, to).catch(() => []),
    ]);
    setReportRows(Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : []);
    setReportExerciseHistory(Array.isArray(exHistory) ? exHistory : []);
    setReportEntries(Array.isArray(rawEntries) ? rawEntries : []);
    setReportLoading(false);
    setReportLoaded(true);
  }, [getReport, token]);

  useEffect(() => {
    if (period === 'today') return;
    if (period === 'custom') {
      if (ISO_DATE.test(customFrom) && ISO_DATE.test(customTo)) {
        loadReport(period, { from: customFrom, to: customTo });
      }
    } else {
      loadReport(period, null);
    }
  }, [period, customFrom, customTo, loadReport]);
  const [addModal, setAddModal] = useState(false);
  const [addEntry, setAddEntry] = useState(EMPTY_ENTRY);
  const [editingId, setEditingId] = useState(null);
  const [perGram, setPerGram] = useState(null);
  const [savingEntry, setSavingEntry] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [gramsError, setGramsError] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => {
    refresh();
    if (route?.params?.openAddFood) {
      setAddEntry(EMPTY_ENTRY);
      setSuggestions([]);
      setSearching(false);
      setGramsError(false);
      setEditingId(null);
      setPerGram(null);
      setAddModal(true);
      navigation.setParams({ openAddFood: false });
    }
  }, [refresh, route?.params?.openAddFood]));

  const byMeal = MEALS.reduce((acc, m) => { acc[m] = todayLog.filter(e => e.meal_type === m); return acc; }, {});
  const waterEntries = todayLog
    .filter(e => e.product_name === 'Water' && (Number(e.water_ml) || 0) > 0)
    .sort((a, b) => new Date(b.consumed_at) - new Date(a.consumed_at));
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

  function showError(message) {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('', message);
    }
  }

  function handleDelete(id, name) {
    const doDelete = async () => {
      try {
        await deleteConsumption(id);
      } catch (e) {
        showError(e.message || t(language, 'nutrition.delete_failed'));
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Delete "${name}"?`)) doDelete();
    } else {
      Alert.alert(t(language, 'nutrition.delete_entry'), name, [
        { text: 'Cancel', style: 'cancel' },
        { text: t(language, 'nutrition.delete_entry'), style: 'destructive', onPress: doDelete },
      ]);
    }
  }

  function openAddModal() {
    setAddEntry(EMPTY_ENTRY);
    setEditingId(null);
    setPerGram(null);
    setSuggestions([]);
    setSearching(false);
    setGramsError(false);
    setAddModal(true);
  }

  function openEditModal(entry) {
    const g = parseFloat(entry.grams) || 0;
    setAddEntry({
      name:         String(entry.product_name || ''),
      grams:        entry.grams         != null ? String(entry.grams)         : '',
      calories:     entry.calories_kcal != null ? String(entry.calories_kcal) : '',
      protein:      entry.protein_g     != null ? String(entry.protein_g)     : '',
      fat:          entry.fat_g         != null ? String(entry.fat_g)         : '',
      carbs:        entry.carbs_g       != null ? String(entry.carbs_g)       : '',
      sugar:        entry.sugar_g       != null ? String(entry.sugar_g)       : '',
      fiber:        entry.fiber_g       != null ? String(entry.fiber_g)       : '',
      salt:         entry.salt_g        != null ? String(entry.salt_g)        : '',
      meal:         entry.meal_type || 'lunch',
    });
    setPerGram(g > 0 ? {
      calories: (parseFloat(entry.calories_kcal) || 0) / g,
      protein:  (parseFloat(entry.protein_g)     || 0) / g,
      fat:      (parseFloat(entry.fat_g)         || 0) / g,
      carbs:    (parseFloat(entry.carbs_g)       || 0) / g,
      sugar:    (parseFloat(entry.sugar_g)       || 0) / g,
      fiber:    (parseFloat(entry.fiber_g)       || 0) / g,
      salt:     (parseFloat(entry.salt_g)        || 0) / g,
    } : null);
    setEditingId(entry.id);
    setSuggestions([]);
    setSearching(false);
    setGramsError(false);
    setAddModal(true);
  }

  function handleNameChange(text) {
    setAddEntry(p => ({ ...p, name: text }));
    clearTimeout(searchTimer.current);
    if (text.trim().length < 2) { setSuggestions([]); setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await apiSearchFood(token, text.trim(), language);
        setSuggestions(results || []);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 350);
  }

  // Rescales every macro field proportionally to the new gram amount,
  // using the per-gram ratios captured when a suggestion was picked or an
  // existing entry was opened for editing. Manually-typed macro values
  // (not driven by a grams change) are left as the user entered them.
  function handleGramsChange(text) {
    setGramsError(false);
    const newG = parseFloat(text.replace(',', '.'));
    if (perGram && !isNaN(newG) && newG > 0) {
      setAddEntry(p => ({
        ...p,
        grams:    text,
        calories: String(Math.round(perGram.calories * newG * 10) / 10),
        protein:  String(Math.round(perGram.protein  * newG * 10) / 10),
        fat:      String(Math.round(perGram.fat       * newG * 10) / 10),
        carbs:    String(Math.round(perGram.carbs     * newG * 10) / 10),
        sugar:    String(Math.round(perGram.sugar     * newG * 10) / 10),
        fiber:    String(Math.round(perGram.fiber     * newG * 10) / 10),
        salt:     String(Math.round(perGram.salt      * newG * 100) / 100),
      }));
    } else {
      setAddEntry(p => ({ ...p, grams: text }));
    }
  }

  async function pickSuggestion(item) {
    // If item has a barcode (from OFF live search), navigate to full product result screen
    if (item.code && isNovaQI) {
      setAddModal(false);
      setFetchingProduct(true);
      setSuggestions([]);
      const info = await apiGetProductInfo(token, item.code);
      setFetchingProduct(false);
      if (info) {
        const allergenTags = (info.allergens_tags || [])
          .map(tag => String(tag).replace(/^[a-z]{2}:/, ''))
          .filter(Boolean);
        const scan = {
          status: 'SAFE',
          title: info.product_name || item.product_name,
          explanation: '',
          barcode: item.code,
          product_name: info.product_name || item.product_name,
          ingredients_source: 'database',
          productInfo: {
            product_name: info.product_name || item.product_name,
            brand: info.brand,
            barcode: item.code,
            source: 'database',
            ingredients_text: info.ingredients_text || null,
            offMeta: info.offMeta || null,
          },
          normalized_ingredients: info.ingredients_text
            ? info.ingredients_text.split(/,\s*/).map(s => s.trim()).filter(Boolean)
            : [],
          identified_allergens: allergenTags,
          concerns: [],
        };
        navigation.navigate('Result', { result: scan });
        return;
      }
      // If lookup failed, fall through to form fill
      setAddModal(true);
    }
    // For items without barcode (history, AI enriched) → fill the form as before
    const g = parseFloat(item.grams) || 100;
    setAddEntry(p => ({
      ...p,
      name:     item.product_name,
      grams:    String(Math.round(g)),
      calories: item.calories_kcal ? String(Math.round(item.calories_kcal)) : '',
      protein:  item.protein_g     ? String(Math.round(item.protein_g))     : '',
      fat:      item.fat_g         ? String(Math.round(item.fat_g))         : '',
      carbs:    item.carbs_g       ? String(Math.round(item.carbs_g))       : '',
      sugar:    item.sugar_g       ? String(Math.round(item.sugar_g))       : '',
      fiber:    item.fiber_g       ? String(Math.round(item.fiber_g))       : '',
      salt:     item.salt_g        ? String(Math.round(item.salt_g * 100) / 100) : '',
    }));
    setPerGram(g > 0 ? {
      calories: (parseFloat(item.calories_kcal) || 0) / g,
      protein:  (parseFloat(item.protein_g)     || 0) / g,
      fat:      (parseFloat(item.fat_g)         || 0) / g,
      carbs:    (parseFloat(item.carbs_g)       || 0) / g,
      sugar:    (parseFloat(item.sugar_g)       || 0) / g,
      fiber:    (parseFloat(item.fiber_g)       || 0) / g,
      salt:     (parseFloat(item.salt_g)        || 0) / g,
    } : null);
    setSuggestions([]);
    setSearching(false);
    setGramsError(false);
  }

  async function handleSaveEntry() {
    const name = addEntry.name.trim();
    if (!name) return;
    const gramsVal = parseFloat(String(addEntry.grams).replace(',', '.'));
    if (!addEntry.grams.trim() || isNaN(gramsVal) || gramsVal <= 0) {
      setGramsError(true);
      return;
    }
    setGramsError(false);
    setSavingEntry(true);
    const payload = {
      product_name: name,
      source: 'manual',
      grams: gramsVal,
      meal_type: addEntry.meal || null,
      calories_kcal: addEntry.calories ? parseFloat(addEntry.calories) : null,
      protein_g: addEntry.protein ? parseFloat(addEntry.protein) : null,
      fat_g: addEntry.fat ? parseFloat(addEntry.fat) : null,
      carbs_g: addEntry.carbs ? parseFloat(addEntry.carbs) : null,
      sugar_g: addEntry.sugar ? parseFloat(addEntry.sugar) : null,
      fiber_g: addEntry.fiber ? parseFloat(addEntry.fiber) : null,
      salt_g: addEntry.salt ? parseFloat(addEntry.salt) : null,
    };
    try {
      if (editingId) {
        await updateConsumption(editingId, payload);
      } else {
        await logConsumption(payload);
      }
      setAddModal(false);
    } catch (e) {
      showError(e.message || t(language, 'nutrition.save_failed'));
    }
    setSavingEntry(false);
  }

  const displayFields = expanded ? ALL_FIELDS : MACRO_FIELDS;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {period === 'today'
            ? t(language, 'nutrition.dashboard_title')
            : t(language, 'nutrition.report_title')}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Period tabs — hoje | semana | mês | custom */}
      <View style={s.periodRow}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => setPeriod(p)}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
          >
            <Text
              style={[s.periodText, period === p && s.periodTextActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {p === 'custom'
                ? (t(language, 'exercise.period_custom') || 'Personalizado')
                : t(language, `exercise.period_${p}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {period === 'custom' && (
        <View style={s.customRow}>
          <View style={s.customField}>
            <Text style={s.customLabel}>{t(language, 'exercise.period_custom_from') || 'De'}</Text>
            <TextInput
              style={s.customInput}
              value={customFrom}
              onChangeText={setCustomFrom}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoCapitalize="none"
            />
          </View>
          <View style={s.customField}>
            <Text style={s.customLabel}>{t(language, 'exercise.period_custom_to') || 'Até'}</Text>
            <TextInput
              style={s.customInput}
              value={customTo}
              onChangeText={setCustomTo}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              autoCapitalize="none"
            />
          </View>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>

        {period !== 'today' ? (
          <ReportView
            loading={reportLoading}
            loaded={reportLoaded}
            rows={reportRows}
            entries={reportEntries}
            exerciseHistory={reportExerciseHistory}
            goals={goals}
            language={language}
          />
        ) : (
        <>

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
                expanded={expanded}
                onToggleExpand={() => setExpanded(!expanded)}
                todayBurned={todayBurned}
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

            {/* Exercise section (NovaQI only, inline) */}
            {isNovaQI && (
              <View style={s.sectionCard}>
                <View style={s.sectionHeader}>
                  <View style={s.sectionTitleRow}>
                    <View style={s.sectionIconBubble}>
                      <Ionicons name="fitness-outline" size={16} color="#E8450A" />
                    </View>
                    <Text style={s.sectionTitle}>{t(language, 'exercise.title')}</Text>
                  </View>
                  {todayBurned > 0 && (
                    <Text style={s.burnBadge}><Ionicons name="flame-outline" size={13} color="#E8450A" /> {Math.round(todayBurned)} kcal</Text>
                  )}
                </View>
                {todayExercise.length === 0 ? (
                  <Text style={s.sectionEmpty}>{t(language, 'exercise.no_exercises_today')}</Text>
                ) : (
                  todayExercise.map(entry => {
                    const ex = EXERCISES.find(e => e.id === entry.exercise_id);
                    const cfg = ex ? CATEGORY_CONFIG[ex.category] : null;
                    return (
                      <View key={entry.id} style={[s.exEntryRow, { borderLeftColor: cfg?.color || Colors.primary }]}>
                        <View style={[s.exEntryIcon, { backgroundColor: cfg?.bg || '#F0F0F0' }]}>
                          <Ionicons name={ex?.icon || 'walk-outline'} size={14} color={cfg?.color || Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.exEntryName}>{entry.exercise_name}</Text>
                          <Text style={s.exEntryMeta}>
                            {Math.round(entry.duration_min)} min
                            {'  ·  '}
                            <Text style={{ color: '#E8450A' }}><Ionicons name="flame-outline" size={12} color="#E8450A" /> {Math.round(entry.calories_burned)} kcal</Text>
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => deleteExercise(entry.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close" size={16} color="#CCC" />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
                <TouchableOpacity style={s.addExerciseLink} onPress={() => navigation.navigate('ExerciseLog')} activeOpacity={0.7}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={s.addExerciseLinkTxt}>{t(language, 'exercise.log_exercise')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Water */}
            <View style={s.waterCard}>
              <View style={s.waterTop}>
                <Text style={s.waterLabel}><Ionicons name="water-outline" size={14} color="#06B6D4" /> {t(language, 'nutrition.water')}</Text>
                <Text style={s.waterValue}>{Math.round(todayTotals.water_ml || 0)} <Text style={s.waterUnit}>ml</Text></Text>
              </View>
              <View style={s.waterBtns}>
                {[150, 250, 330, 500].map(ml => (
                  <TouchableOpacity key={ml} style={s.waterBtn} onPress={() => logWater(ml)} disabled={loggingWater} activeOpacity={0.75}>
                    <Text style={s.waterBtnText}>+{ml}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {waterEntries.length > 0 && (
                <View style={s.waterEntries}>
                  {waterEntries.map(e => (
                    <View key={e.id} style={s.waterEntryRow}>
                      <Text style={s.waterEntryTime}>{formatTime(e.consumed_at, language)}</Text>
                      <Text style={s.waterEntryMl}>{e.water_ml} ml</Text>
                      <TouchableOpacity onPress={() => handleDelete(e.id, `${e.water_ml} ml`)} style={s.waterDeleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close" size={14} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Weight */}
            <View style={s.weightRow}>
              <View style={s.weightCard}>
                <Text style={s.weightLabel}>{t(language, 'nutrition.weight_title')}</Text>
                <Text style={s.weightValue}>{latestWeight ? `${latestWeight.weight_kg} kg` : '—'}</Text>
              </View>
              <TouchableOpacity style={s.weightAddBtn} onPress={() => setWeightModal(true)}>
                <Text style={s.weightAddText}>+ kg</Text>
              </TouchableOpacity>
            </View>

            {/* Food log by meal */}
            {MEALS.map(meal => byMeal[meal].length > 0 && (
              <View key={meal} style={s.mealSection}>
                <Text style={s.mealTitle}>{t(language, `nutrition.${meal}`)}</Text>
                {byMeal[meal].map(e => (
                  <TouchableOpacity key={e.id} style={s.entryRow} onPress={() => openEditModal(e)} activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.entryName}>{e.product_name || '—'}</Text>
                      <Text style={s.entryMacros}>
                        {e.calories_kcal ? `${Math.round(e.calories_kcal)} kcal` : ''}
                        {e.protein_g ? `  ·  ${Math.round(e.protein_g)}g prot` : ''}
                        {e.grams ? `  ·  ${e.grams}g` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(e.id, e.product_name || '')} style={s.deleteBtn}>
                      <Ionicons name="close" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  </TouchableOpacity>
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

            <TouchableOpacity style={s.goalsBtn} onPress={() => navigation.navigate('NutritionGoals')}>
              <Text style={s.goalsBtnText}><Ionicons name="settings-outline" size={13} color={Colors.navy} /> {t(language, 'nutrition.goals_title')}</Text>
            </TouchableOpacity>
        </>
        )}

      </ScrollView>

      {/* Weight modal */}
      <Modal visible={weightModal} transparent animationType="slide">
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[s.modalCard, { paddingBottom: 24 + insets.bottom }]}>
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
      <Modal visible={addModal} transparent animationType="slide" onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => { Keyboard.dismiss(); setAddModal(false); }} />
          <View style={[s.modalCard, { paddingBottom: 24 + insets.bottom }]}>
            <Text style={s.modalTitle}>{t(language, editingId ? 'nutrition.edit_food' : 'nutrition.add_food')}</Text>

            <TextInput
              style={s.fieldInput}
              value={addEntry.name}
              onChangeText={handleNameChange}
              placeholder={t(language, 'nutrition.food_name_placeholder')}
              placeholderTextColor="#94a3b8"
              autoFocus
            />

            {/* Suggestions list — scrollable, positioned directly below search field */}
            {(searching || suggestions.length > 0) && (
              <ScrollView
                style={s.suggestBox}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {searching && (
                  <View style={s.suggestLoading}>
                    <Text style={s.suggestLoadingText}><Ionicons name="search-outline" size={13} color="#94a3b8" /> {t(language, 'nutrition.searching') || 'Searching…'}</Text>
                  </View>
                )}
                {suggestions.map((item, i) => (
                  <TouchableOpacity key={i} style={s.suggestRow} onPress={() => pickSuggestion(item)} activeOpacity={0.7}>
                    <View style={s.suggestRowTop}>
                      <Text style={s.suggestName} numberOfLines={1}>{item.product_name}</Text>
                      {(item.source === 'ai' || item.source === 'ai_enriched') && <Text style={s.suggestAiBadge}>AI</Text>}
                    </View>
                    <Text style={s.suggestMacros}>
                      {item.calories_kcal ? `${Math.round(item.calories_kcal)} kcal` : ''}
                      {item.protein_g ? `  ·  ${Math.round(item.protein_g)}g prot` : ''}
                      {item.grams ? `  ·  ${Math.round(item.grams)}g` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              <View style={{ gap: 12 }}>
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
                    <Text style={[s.numLabel, gramsError && s.numLabelError]}>Grams *</Text>
                    <TextInput
                      style={[s.numInput, gramsError && s.numInputError]}
                      value={addEntry.grams}
                      onChangeText={handleGramsChange}
                      placeholder="—"
                      placeholderTextColor="#94a3b8"
                      keyboardType="decimal-pad"
                    />
                    {gramsError && <Text style={s.numFieldError}>{t(language, 'nutrition.grams_required') || 'Required'}</Text>}
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

                <View style={s.numRow}>
                  <View style={s.numField}>
                    <Text style={s.numLabel}>{t(language, 'nutrition.sugar')} g</Text>
                    <TextInput style={s.numInput} value={addEntry.sugar} onChangeText={v => setAddEntry(p => ({ ...p, sugar: v }))}
                      placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={s.numField}>
                    <Text style={s.numLabel}>{t(language, 'nutrition.fiber')} g</Text>
                    <TextInput style={s.numInput} value={addEntry.fiber} onChangeText={v => setAddEntry(p => ({ ...p, fiber: v }))}
                      placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={s.numField}>
                    <Text style={s.numLabel}>{t(language, 'nutrition.salt')} g</Text>
                    <TextInput style={s.numInput} value={addEntry.salt} onChangeText={v => setAddEntry(p => ({ ...p, salt: v }))}
                      placeholder="—" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                </View>

                <TouchableOpacity onPress={handleSaveEntry} disabled={savingEntry || !addEntry.name.trim()}
                  style={[s.saveBtn, (savingEntry || !addEntry.name.trim()) && { opacity: 0.5 }]}>
                  <Text style={s.saveBtnText}>{savingEntry ? '…' : t(language, 'nutrition.save')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { Keyboard.dismiss(); setAddModal(false); }} style={s.cancelBtn}>
                  <Text style={s.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {fetchingProduct && (
        <View style={s.fetchOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
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
  waterEntries: { marginTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8, gap: 4 },
  waterEntryRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  waterEntryTime: { fontSize: 12, color: '#94a3b8', width: 56 },
  waterEntryMl: { fontSize: 13, fontWeight: '600', color: '#0891B2', flex: 1 },
  waterDeleteBtn: { padding: 4 },
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
  fetchOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  goalsBtn: { alignItems: 'center', paddingVertical: 8 },
  goalsBtnText: { fontSize: 13, color: Colors.navy, textDecorationLine: 'underline' },
  exerciseBtn: {
    backgroundColor: '#0E1B14',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  // Period tabs
  periodTabsWrap: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E5E7EB',
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary || '#F1F5F9',
    alignItems: 'center',
  },
  periodTabActive: { backgroundColor: Colors.navy },
  periodTabTxt: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  periodTabTxtActive: { color: '#FFF' },
  periodLoading: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: 22 },

  // Exercise section in today view
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBubble: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFF0EB',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  sectionEmpty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },
  burnBadge: {
    fontSize: 12, fontWeight: '700', color: '#E8450A',
    backgroundColor: '#FFF0EB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  exEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
    paddingLeft: 10,
    paddingVertical: 4,
  },
  exEntryIcon: {
    width: 34, height: 34, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  exEntryName: { fontSize: 13, fontWeight: '700', color: Colors.text },
  exEntryMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  addExerciseLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  addExerciseLinkTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Period week/month
  periodSummaryCard: {
    backgroundColor: Colors.navy,
    borderRadius: 20, padding: 18,
  },
  periodSumRow: { flexDirection: 'row', alignItems: 'center' },
  periodSumCol: { flex: 1, alignItems: 'center', gap: 4 },
  periodSumDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)' },
  periodSumNum: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: BrandFonts.mono || undefined },
  periodSumLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },
  daySection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: { fontSize: 13, fontWeight: '800', color: Colors.navy, textTransform: 'capitalize' },
  dayStatsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  dayStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayStatIcon: { fontSize: 13 },
  dayStatTxt: { fontSize: 13, fontWeight: '700', color: Colors.text },
  dayMacroRow: { flexDirection: 'row', gap: 12 },
  dayMacro: { fontSize: 11, fontWeight: '700' },
  dayExRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayExChip: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1,
  },
  dayExChipTxt: { fontSize: 11, fontWeight: '600', color: Colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, maxHeight: '90%' },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy, textAlign: 'center', marginBottom: 4 },
  weightInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weightInput: { flex: 1, borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 22, fontWeight: '700', textAlign: 'center', color: Colors.navy },
  weightUnit: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  fieldInput: { borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 16, color: Colors.navy },
  suggestBox: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, backgroundColor: '#FAFBFF', maxHeight: 220 },
  suggestLoading: { paddingHorizontal: 14, paddingVertical: 12 },
  suggestLoadingText: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic' },
  suggestRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', minHeight: 52, justifyContent: 'center' },
  suggestRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  suggestName: { fontSize: 14, fontWeight: '600', color: Colors.navy, flex: 1 },
  suggestAiBadge: { fontSize: 10, fontWeight: '800', color: '#7C3AED', backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, overflow: 'hidden' },
  suggestMacros: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  numLabelError: { color: '#EF4444' },
  numInputError: { borderColor: '#EF4444', borderWidth: 2 },
  numFieldError: { fontSize: 10, color: '#EF4444', marginTop: 2 },
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

  // Period tabs (Today | Week | Month | Custom)
  periodRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border || '#E5E7EB',
  },
  periodBtn: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary || '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  periodBtnActive: { backgroundColor: Colors.navy },
  periodText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, textAlign: 'center' },
  periodTextActive: { color: '#fff' },
  customRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.background,
    borderBottomWidth: 1, borderBottomColor: Colors.border || '#E5E7EB',
  },
  customField: { flex: 1 },
  customLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  customInput: { borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 8, padding: 8, fontSize: 13, fontWeight: '600', color: Colors.navy, backgroundColor: '#fff' },

  // ReportView-only styles
  summaryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sumRow: { flexDirection: 'row', alignItems: 'center' },
  sumCol: { flex: 1, alignItems: 'center' },
  sumDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },
  sumNum: { fontSize: 22, fontWeight: '800', color: Colors.navy },
  sumLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.navy, marginBottom: 12 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 4, paddingTop: 8 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden', position: 'relative' },
  barFill: { backgroundColor: Colors.primary, width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#EF4444' },
  barLabel: { fontSize: 9, color: Colors.textMuted, fontWeight: '600' },
  chartNote: { fontSize: 11, color: '#EF4444', marginTop: 8, textAlign: 'center' },
  daySection: { backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  dayHeader: { fontSize: 13, fontWeight: '800', color: Colors.navy, textTransform: 'capitalize' },
  dayStatsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  dayStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dayStatIcon: { marginRight: 2 },
  dayStatTxt: { fontSize: 12, fontWeight: '700', color: Colors.navy },
  dayMacroRow: { flexDirection: 'row', gap: 10 },
  dayMacro: { fontSize: 11, fontWeight: '700' },
  dayExRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 },
  dayExChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  dayExChipTxt: { fontSize: 11, fontWeight: '600', color: Colors.navy },
  entriesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  entriesCount: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  reportEntryRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  reportEntryIcon: { marginTop: 2 },
  reportEntryTitle: { fontSize: 13, fontWeight: '600', color: Colors.navy },
  reportEntryMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  reportEntryMacros: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
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
