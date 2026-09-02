import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { t, localeFor } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { EXERCISES, CATEGORY_CONFIG } from '../constants/exercises';
import { apiGetExerciseHistory, apiGetLogRange } from '../services/apiService';

const isNovaQI = Brand.id === 'novaqi';

const PERIODS = ['today', 'week', 'month', 'custom'];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function dateRange(period, custom) {
  const to = new Date().toISOString().slice(0, 10);
  if (period === 'today') return { from: to, to };
  if (period === 'custom') {
    // Guard: fall back to last 7 days if the user hasn't typed valid ISO yet
    const from = ISO_DATE.test(custom.from) ? custom.from : to;
    const toC  = ISO_DATE.test(custom.to)   ? custom.to   : to;
    return from > toC ? { from: toC, to: from } : { from, to: toC };
  }
  const d = new Date();
  d.setDate(d.getDate() - (period === 'week' ? 6 : 29));
  return { from: d.toISOString().slice(0, 10), to };
}

function formatEntryTime(iso, language) {
  const d = new Date(iso);
  return d.toLocaleString(localeFor(language), {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

const SOURCE_ICON = { scan: 'camera-outline', plate_photo: 'restaurant-outline', manual: 'pencil-outline' };

function formatDay(dateStr, language) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(localeFor(language), { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function NutritionReportScreen({ navigation }) {
  const { language } = useApp();
  const { token } = useAuth();
  const { getReport, goals, todayExercise, todayBurned } = useNutrition();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('week');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [rows, setRows] = useState([]);
  const [entries, setEntries] = useState([]);
  const [exerciseHistory, setExerciseHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (p, custom) => {
    setLoading(true);
    const { from, to } = dateRange(p, custom);
    const [res, exHistory, rawEntries] = await Promise.all([
      getReport(from, to).catch(() => ({ rows: [] })),
      p !== 'today'
        ? apiGetExerciseHistory(token, from, to).catch(() => [])
        : Promise.resolve(todayExercise),
      apiGetLogRange(token, from, to).catch(() => []),
    ]);
    setRows(Array.isArray(res?.rows) ? res.rows : Array.isArray(res) ? res : []);
    setExerciseHistory(Array.isArray(exHistory) ? exHistory : []);
    setEntries(Array.isArray(rawEntries) ? rawEntries : []);
    setLoading(false);
    setLoaded(true);
  }, [getReport, token, todayExercise]);

  // Auto-refetch when period changes; for custom, only refetch when both
  // dates are valid ISO YYYY-MM-DD (avoids spamming the API every keystroke).
  React.useEffect(() => {
    if (period === 'custom') {
      if (ISO_DATE.test(customFrom) && ISO_DATE.test(customTo)) {
        load(period, { from: customFrom, to: customTo });
      }
    } else {
      load(period, null);
    }
  }, [period, customFrom, customTo]);

  // Build per-day maps
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

  const exerciseByDate = (period === 'today' ? todayExercise : exerciseHistory).reduce((acc, e) => {
    const day = e.local_date;
    (acc[day] = acc[day] || []).push(e);
    return acc;
  }, {});

  const allDates = [...new Set([
    ...Object.keys(nutritionByDate),
    ...Object.keys(exerciseByDate),
  ])].sort().reverse();

  // Period totals
  const totalKcal = Object.values(nutritionByDate).reduce((s, d) => s + d.kcal, 0);
  const totalBurnedPeriod = period === 'today'
    ? todayBurned
    : (exerciseHistory || []).reduce((s, e) => s + Number(e.calories_burned || 0), 0);
  const totalWater = Object.values(nutritionByDate).reduce((s, d) => s + d.water, 0);

  // Bar chart (calories per day)
  const chartDays = Object.keys(nutritionByDate).sort();
  const maxVal = Math.max(...chartDays.map(d => nutritionByDate[d].kcal), goals?.calories_kcal || 1, 1);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.headerText} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.report_title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Period tabs */}
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

        {loading && <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />}

        {!loading && loaded && allDates.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>{t(language, 'nutrition.no_report_data')}</Text>
          </View>
        )}

        {!loading && allDates.length > 0 && (
          <>
            {/* Period summary */}
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
                  <Text style={[s.sumNum, { color: '#06B6D4' }]}>
                    {Math.round(totalWater / 100) / 10}L
                  </Text>
                  <Text style={s.sumLabel}>{t(language, 'nutrition.water')}</Text>
                </View>
              </View>
            </View>

            {/* Calorie bar chart (week/month only) */}
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

            {/* Day-by-day sections */}
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
                        <Text style={s.dayStatIcon}>🍴</Text>
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
                        <Text style={s.dayStatIcon}>💧</Text>
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
                            <Text style={s.dayExChipTxt}>{ex?.icon || '🏃'} {e.exercise_name} {Math.round(e.duration_min)}′</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Chronological log — every consumption entry in the selected
                range, ordered by time. Complements the per-day aggregates
                above so users can see exactly what/when they logged. */}
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
                    <View key={e.id} style={s.entryRow}>
                      <Ionicons name={SOURCE_ICON[e.source] || 'ellipse-outline'} size={14} color="#94a3b8" style={s.entryIcon} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.entryTitle} numberOfLines={2}>{title}</Text>
                        <Text style={s.entryMeta}>
                          {formatEntryTime(e.consumed_at, language)}
                          {e.meal_type ? ` · ${e.meal_type}` : ''}
                          {e.grams ? ` · ${Math.round(e.grams)}g` : ''}
                        </Text>
                        {macros.length > 0 && (
                          <Text style={s.entryMacros}>{macros.join('  ·  ')}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.headerBg,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
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
  customLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.3 },
  customInput: {
    borderWidth: 1.5, borderColor: Colors.border || '#E5E7EB',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 14, color: Colors.text, backgroundColor: Colors.card,
  },
  content: { padding: 16, gap: 14 },
  emptyCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  // Summary card
  summaryCard: { backgroundColor: Colors.navy, borderRadius: 20, padding: 18 },
  sumRow: { flexDirection: 'row', alignItems: 'center' },
  sumCol: { flex: 1, alignItems: 'center', gap: 4 },
  sumDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.18)' },
  sumNum: { fontSize: 20, fontWeight: '800', color: '#FFF', fontFamily: BrandFonts.mono || undefined },
  sumLabel: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },

  // Calorie bar chart
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border || '#E5E7EB', gap: 10 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: '#FFCB3B', borderRadius: 4, position: 'absolute', bottom: 0 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: '#EF4444' },
  barLabel: { fontSize: 9, color: '#94a3b8', textAlign: 'center' },
  chartNote: { fontSize: 11, color: '#EF4444', textAlign: 'right', marginTop: -4 },

  // Day sections
  daySection: {
    backgroundColor: Colors.card,
    borderRadius: 16, padding: 14,
    gap: 8, borderWidth: 1, borderColor: Colors.border || '#E5E7EB',
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

  // Chronological entries list
  entriesCard: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border || '#E5E7EB', gap: 10,
  },
  entriesCount: { color: Colors.textMuted, fontWeight: '600', fontSize: 12 },
  entryRow: {
    flexDirection: 'row', gap: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: Colors.border || '#EEF2F7',
  },
  entryIcon: { fontSize: 20, width: 24, textAlign: 'center' },
  entryTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  entryMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  entryMacros: { fontSize: 12, fontWeight: '600', color: Colors.navy, marginTop: 4 },
});
