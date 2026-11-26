// Aba Dieta: o cardápio do dia gerado pela IA, com o quanto já foi comido.
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiGetDayLog } from '../services/apiService';
import { font } from '../theme/type';
import { s2 } from './strings';
import { usePlan, nextMeal, mealTypeFor } from './usePlan';
import { v2LogMeal, localDate } from './api';
import { useTween } from './anim';

const C = { bg: '#F1F3EF', card: '#FFFFFF', ink: '#17221B', muted: '#5F6E66', green: '#16A75A', deep: '#0B7A3F', forest: '#0E1B14', amber: '#E8991C', amberBg: '#FCEFD2', rule: '#E3E8E2' };

export default function DietPlanScreen({ navigation }) {
  const { language } = useApp();
  const { token, demoMode } = useAuth();
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const { loading, plan } = usePlan();
  const [log, setLog] = useState([]);
  const [done, setDone] = useState([]);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(null);
  const today = localDate();
  const key = `@novaqi_v2_meals_${today}`;

  useFocusEffect(useCallback(() => {
    if (!token) return;
    apiGetDayLog(token, today).then(r => setLog(Array.isArray(r) ? r : [])).catch(() => {});
    AsyncStorage.getItem(key).then(r => setDone(r ? JSON.parse(r) : [])).catch(() => {});
  }, [token]));

  const t = plan?.targets;
  const diet = plan?.diet;
  const eaten = log.reduce((acc, e) => ({
    kcal: acc.kcal + Number(e.calories_kcal || 0), p: acc.p + Number(e.protein_g || 0),
    c: acc.c + Number(e.carbs_g || 0), f: acc.f + Number(e.fat_g || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0 });
  const nm = nextMeal(diet);
  const openKey = open ?? nm?.key;

  async function ate(meal) {
    setBusy(meal.key);
    try {
      await v2LogMeal(token, meal, today, mealTypeFor(meal), { demoMode });
      const nd = [...done, meal.key];
      setDone(nd);
      AsyncStorage.setItem(key, JSON.stringify(nd)).catch(() => {});
      if (!demoMode) {
        const r = await apiGetDayLog(token, today);
        setLog(Array.isArray(r) ? r : []);
      }
    } catch {} finally { setBusy(null); }
  }

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator color={C.green} /></View>;
  if (!diet) {
    return (
      <View style={[s.root, s.center, { padding: 32 }]}>
        <Text style={s.emptyTitle}>{T.diet.empty}</Text>
        <Pressable style={s.cta} onPress={() => navigation.navigate('OnboardingV2', { edit: true })}><Text style={s.ctaText}>{T.diet.makePlan}</Text></Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 40, paddingHorizontal: 18, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
      <View style={s.topRow}>
        <Text style={s.h1}>{T.diet.title}</Text>
        <Pressable onPress={() => navigation.navigate('Diary')} style={s.pill} accessibilityRole="button">
          <Ionicons name="book-outline" size={16} color={C.ink} />
          <Text style={s.pillText}>{T.diet.diary}</Text>
        </Pressable>
      </View>

      <View style={s.hero}>
        <Ring value={eaten.kcal} max={t.calories_kcal} />
        <View style={{ flex: 1, marginLeft: 18 }}>
          <Text style={s.heroLeft}>{Math.max(0, Math.round(t.calories_kcal - eaten.kcal))}</Text>
          <Text style={s.heroLeftLabel}>kcal {T.diet.left}</Text>
          <Bar label="P" v={eaten.p} max={t.protein_g} color={C.green} />
          <Bar label="C" v={eaten.c} max={t.carbs_g} color={C.amber} />
          <Bar label="G" v={eaten.f} max={t.fat_g} color="#6E8B7B" />
        </View>
      </View>

      {diet.summary ? <Text style={s.summary}>{diet.summary}</Text> : null}

      {diet.meals.map(m => {
        const isOpen = openKey === m.key;
        const isDone = done.includes(m.key);
        return (
          <View key={m.key} style={[s.meal, isDone && { backgroundColor: '#EAF6EE' }]}>
            <Pressable onPress={() => setOpen(isOpen ? '' : m.key)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }}>
              <View style={s.mealHead}>
                <Text style={s.mealTime}>{m.time}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.mealName}>{m.name}</Text>
                  <Text style={s.mealMeta}>{m.kcal} kcal   P {m.protein_g}   C {m.carbs_g}   G {m.fat_g}</Text>
                </View>
                {isDone ? <Ionicons name="checkmark-circle" size={24} color={C.green} />
                  : <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />}
              </View>
            </Pressable>
            {isOpen && (
              <View style={{ marginTop: 12 }}>
                {(m.items || []).map((it, i) => (
                  <View key={i} style={s.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.itemFood}>{it.food}</Text>
                      <Text style={s.itemQty}>{it.qty}</Text>
                    </View>
                    <Text style={s.itemKcal}>{it.kcal} kcal</Text>
                  </View>
                ))}
                {m.swap ? (
                  <View style={s.swap}><Text style={s.swapLabel}>{T.diet.swap}</Text><Text style={s.swapText}>{m.swap}</Text></View>
                ) : null}
                {!isDone && (
                  <Pressable onPress={() => ate(m)} disabled={busy === m.key} style={({ pressed }) => [s.ate, { transform: [{ scale: pressed ? 0.97 : 1 }] }]} accessibilityRole="button">
                    {busy === m.key ? <ActivityIndicator color="#fff" /> : <Text style={s.ateText}>{T.diet.ate}</Text>}
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      {diet.rest_day_note ? (
        <View style={s.note}><Text style={s.noteTitle}>{T.diet.rest}</Text><Text style={s.noteText}>{diet.rest_day_note}</Text></View>
      ) : null}
      {diet.tips?.length ? (
        <View style={s.note}>
          <Text style={s.noteTitle}>{T.diet.tips}</Text>
          {diet.tips.map((tip, i) => <Text key={i} style={[s.noteText, { marginTop: i ? 8 : 4 }]}>{tip}</Text>)}
        </View>
      ) : null}

      <Pressable onPress={() => navigation.navigate('OnboardingV2', { edit: true })} style={s.remake} accessibilityRole="button">
        <Ionicons name="refresh" size={16} color={C.muted} />
        <Text style={s.remakeText}>{T.diet.remake}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Ring({ value, max }) {
  const k = useTween(Math.min(1, max ? value / max : 0), 900);
  const r = 46, c = 2 * Math.PI * r;
  return (
    <View style={{ width: 116, height: 116, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={116} height={116} style={{ position: 'absolute' }}>
        <Circle cx={58} cy={58} r={r} stroke={C.rule} strokeWidth={10} fill="none" />
        <Circle cx={58} cy={58} r={r} stroke={C.green} strokeWidth={10} fill="none" strokeLinecap="round"
          strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 58 58)" />
      </Svg>
      <Text style={s.ringNum}>{Math.round(value)}</Text>
      <Text style={s.ringOf}>de {max}</Text>
    </View>
  );
}

function Bar({ label, v, max, color }) {
  const k = useTween(Math.min(1, max ? v / max : 0), 800);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
      <Text style={s.barLabel}>{label}</Text>
      <View style={s.barTrack}><View style={[s.barFill, { width: `${k * 100}%`, backgroundColor: color }]} /></View>
      <Text style={s.barNum}>{Math.round(v)}/{max} g</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  h1: { fontSize: 30, color: C.ink, ...font('display'), letterSpacing: -0.5 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.card, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999 },
  pillText: { fontSize: 14, color: C.ink, ...font('bodyBold') },
  hero: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 24, padding: 18 },
  heroLeft: { fontSize: 40, color: C.ink, ...font('display'), letterSpacing: -1 },
  heroLeftLabel: { fontSize: 13, color: C.muted, marginTop: -2, ...font('bodyBold') },
  ringNum: { fontSize: 22, color: C.ink, ...font('display') },
  ringOf: { fontSize: 12, color: C.muted, ...font('bodyBold') },
  barLabel: { width: 16, fontSize: 12, color: C.muted, ...font('bold') },
  barTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: C.rule, overflow: 'hidden', marginHorizontal: 6 },
  barFill: { height: 7, borderRadius: 4 },
  barNum: { fontSize: 12, color: C.muted, minWidth: 64, textAlign: 'right', ...font('bodyBold') },
  summary: { fontSize: 15, lineHeight: 22, color: C.ink, opacity: 0.8, marginVertical: 18, ...font('body') },
  meal: { backgroundColor: C.card, borderRadius: 20, padding: 16, marginBottom: 10 },
  mealHead: { flexDirection: 'row', alignItems: 'center' },
  mealTime: { fontSize: 15, color: C.deep, width: 58, ...font('display') },
  mealName: { fontSize: 18, color: C.ink, ...font('bold') },
  mealMeta: { fontSize: 13, color: C.muted, marginTop: 2, ...font('bodyBold') },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.rule },
  itemFood: { fontSize: 15.5, color: C.ink, ...font('bodyBold') },
  itemQty: { fontSize: 13.5, color: C.muted, marginTop: 1, ...font('body') },
  itemKcal: { fontSize: 13, color: C.muted, ...font('bodyBold') },
  swap: { backgroundColor: C.amberBg, borderRadius: 14, padding: 12, marginTop: 8 },
  swapLabel: { fontSize: 12, color: '#9A5A06', ...font('bold') },
  swapText: { fontSize: 14, color: '#3A2604', marginTop: 2, lineHeight: 19, ...font('body') },
  ate: { backgroundColor: C.forest, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  ateText: { color: '#fff', fontSize: 16, ...font('bold') },
  note: { backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 10 },
  noteTitle: { fontSize: 13, color: C.deep, ...font('bold') },
  noteText: { fontSize: 15, color: C.ink, lineHeight: 21, ...font('body') },
  remake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22, padding: 10 },
  remakeText: { fontSize: 14, color: C.muted, ...font('bodyBold') },
  emptyTitle: { fontSize: 22, color: C.ink, textAlign: 'center', ...font('heading') },
  cta: { backgroundColor: C.forest, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 28, marginTop: 18 },
  ctaText: { color: '#fff', fontSize: 16, ...font('bold') },
});
