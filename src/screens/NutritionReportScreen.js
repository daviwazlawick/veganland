import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';

const isNovaQI = Brand.id === 'novaqi';

const PERIODS = ['today', 'week', 'month'];

function dateRange(period) {
  const to = new Date().toISOString().slice(0, 10);
  if (period === 'today') return { from: to, to };
  const d = new Date();
  if (period === 'week') { d.setDate(d.getDate() - 6); }
  else if (period === 'month') { d.setDate(d.getDate() - 29); }
  return { from: d.toISOString().slice(0, 10), to };
}

const DISPLAY = [
  { key: 'calories_kcal', unit: 'kcal', color: '#FFCB3B', label: 'nutrition.calories' },
  { key: 'protein_g',     unit: 'g',    color: '#3B82F6', label: 'nutrition.protein' },
  { key: 'fat_g',         unit: 'g',    color: '#F97316', label: 'nutrition.fat' },
  { key: 'carbs_g',       unit: 'g',    color: '#8B5CF6', label: 'nutrition.carbs' },
  { key: 'fiber_g',       unit: 'g',    color: '#10B981', label: 'nutrition.fiber' },
  { key: 'water_ml',      unit: 'ml',   color: '#06B6D4', label: 'nutrition.water' },
];

export default function NutritionReportScreen({ navigation }) {
  const { language } = useApp();
  const { getReport, goals } = useNutrition();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState('week');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async (p) => {
    setLoading(true);
    const { from, to } = dateRange(p);
    const res = await getReport(from, to);
    setRows(res?.rows || []);
    setLoading(false);
    setLoaded(true);
  }, [getReport]);

  React.useEffect(() => { load(period); }, [period]);

  // Aggregate all rows into totals and compute per-day averages
  const days = [...new Set(rows.map(r => r.day))];
  const numDays = Math.max(days.length, 1);
  const totals = rows.reduce((acc, r) => {
    DISPLAY.forEach(f => { acc[f.key] = (acc[f.key] || 0) + (Number(r[f.key]) || 0); });
    return acc;
  }, {});

  // Build daily chart data for calories
  const dailyMap = {};
  rows.forEach(r => {
    if (!dailyMap[r.day]) dailyMap[r.day] = 0;
    dailyMap[r.day] += Number(r.calories_kcal) || 0;
  });
  const chartData = days.map(d => ({ day: d.slice(5), val: Math.round(dailyMap[d] || 0) }));
  const maxVal = Math.max(...chartData.map(d => d.val), goals?.calories_kcal || 1, 1);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.report_title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>

        <View style={s.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[s.periodBtn, isNovaQI && s.periodBtnPaper, period === p && s.periodBtnActive]}>
              <Text style={[s.periodText, period === p && s.periodTextActive]}>{t(language, `nutrition.period_${p}`)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading && <ActivityIndicator color={Colors.navy} style={{ marginTop: 40 }} />}

        {!loading && loaded && rows.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>{t(language, 'nutrition.no_report_data')}</Text>
          </View>
        )}

        {!loading && rows.length > 0 && (
          <>
            {chartData.length > 1 && (
              <View style={s.card}>
                <Text style={s.sectionTitle}>{t(language, 'nutrition.calories')} / {t(language, 'nutrition.avg_daily')}</Text>
                <View style={s.chartArea}>
                  {chartData.map((d, i) => (
                    <View key={i} style={s.barCol}>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { height: `${(d.val / maxVal) * 100}%` }]} />
                        {goals?.calories_kcal && (
                          <View style={[s.goalLine, { bottom: `${(goals.calories_kcal / maxVal) * 100}%` }]} />
                        )}
                      </View>
                      <Text style={s.barLabel}>{d.day}</Text>
                    </View>
                  ))}
                </View>
                {goals?.calories_kcal && (
                  <Text style={s.chartNote}>— goal: {Math.round(goals.calories_kcal)} kcal</Text>
                )}
              </View>
            )}

            <View style={s.card}>
              <Text style={s.sectionTitle}>{period === 'today' ? t(language, 'nutrition.total') : t(language, 'nutrition.avg_daily')}</Text>
              {DISPLAY.map(f => {
                const total = totals[f.key] || 0;
                const avg = Math.round((total / numDays) * 10) / 10;
                const display = period === 'today' ? Math.round(total * 10) / 10 : avg;
                const goal = goals?.[f.key];
                const pct = goal > 0 ? Math.min(1, display / goal) : 0;
                return (
                  <View key={f.key} style={s.statRow}>
                    <View style={s.statDot} />
                    <Text style={s.statLabel}>{t(language, f.label)}</Text>
                    <Text style={s.statValue}>{display} <Text style={s.statUnit}>{f.unit}</Text></Text>
                    {goal > 0 && (
                      <View style={s.miniBar}>
                        <View style={[s.miniFill, { width: `${pct * 100}%`, backgroundColor: f.color }]} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={s.card}>
              <Text style={s.sectionTitle}>Log ({rows.length} entries)</Text>
              {days.map(day => (
                <View key={day} style={s.dayRow}>
                  <Text style={s.dayLabel}>{day}</Text>
                  <Text style={s.dayKcal}>{Math.round(dailyMap[day] || 0)} kcal</Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 14 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  periodBtnPaper: { backgroundColor: Colors.backgroundSecondary, borderColor: Colors.backgroundSecondary },
  periodBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  periodText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  periodTextActive: { color: '#fff' },
  emptyCard: { backgroundColor: Colors.card, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: '#F1F5F9', borderRadius: 4, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: '#FFCB3B', borderRadius: 4, position: 'absolute', bottom: 0 },
  goalLine: { position: 'absolute', left: 0, right: 0, height: 1.5, backgroundColor: '#EF4444' },
  barLabel: { fontSize: 9, color: '#94a3b8', textAlign: 'center' },
  chartNote: { fontSize: 11, color: '#EF4444', textAlign: 'right', marginTop: -4 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  statLabel: { flex: 1, fontSize: 13, color: '#475569', fontWeight: '600' },
  statValue: { fontSize: 14, fontWeight: '800', color: Colors.navy, fontFamily: BrandFonts.mono || undefined },
  statUnit: { fontSize: 11, fontWeight: '400', color: '#94a3b8' },
  miniBar: { width: 50, height: 5, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  miniFill: { height: 5, borderRadius: 3 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayLabel: { fontSize: 13, color: '#475569', fontFamily: BrandFonts.mono || undefined },
  dayKcal: { fontSize: 13, fontWeight: '700', color: Colors.navy, fontFamily: BrandFonts.mono || undefined },
});
