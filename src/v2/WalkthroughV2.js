// Hands-on walkthrough for new (null-tier) users. 8 steps, linear, resumable.
// Replaces the previous passive TourSlides. Each step logs a funnel event so
// we can measure where users drop between signup and the paywall.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { logFunnelEvent } from '../services/funnelService';
import { font } from '../theme/type';
import { s3 } from './strings.walkthrough';

const C = {
  bg: '#0E1B14',
  card: '#1A2A22',
  cardSoft: '#243932',
  ink: '#FFFFFF',
  muted: '#C9D4CD',
  mutedDark: '#7A8B82',
  green: '#2FC472',
  deep: '#16A75A',
  amber: '#F4B53F',
  amberSoft: 'rgba(244,181,63,0.18)',
  track: 'rgba(255,255,255,0.08)',
  rule: 'rgba(255,255,255,0.08)',
  blue: '#5AA9FF',
  purple: '#B38CFF',
  orange: '#FF9E5A',
};

const STORE_KEY = 'novaqi.wt.step';
const TOTAL_STEPS = 8;

export default function WalkthroughV2({ navigation, route }) {
  const { language } = useApp();
  const { token, user, completeDemo } = useAuth();
  const { goals, todayTotals } = useNutrition();
  const T = s3(language);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(null);
  const loggedMount = useRef(new Set());

  // Resume: load persisted step on mount. Don't flash step 1 if user is mid-flow.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORE_KEY).then(raw => {
      if (!alive) return;
      const parsed = Math.max(1, Math.min(TOTAL_STEPS, parseInt(raw, 10) || 1));
      setStep(parsed);
    });
    return () => { alive = false; };
  }, []);

  // Fire step_shown once per step entry.
  useEffect(() => {
    if (step == null) return;
    AsyncStorage.setItem(STORE_KEY, String(step)).catch(() => {});
    if (!loggedMount.current.has(step)) {
      loggedMount.current.add(step);
      logFunnelEvent('walkthrough_step_shown', { step }, token);
    }
  }, [step, token]);

  // Abandon log on unmount if not finished.
  useEffect(() => {
    return () => {
      if (step != null && step < TOTAL_STEPS) {
        logFunnelEvent('walkthrough_abandoned', { step }, token);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume from Scan / PlateAnalysis via navigation params.
  useFocusEffect(useCallback(() => {
    const completed = route?.params?.completedStep;
    if (completed && step != null && completed >= step) {
      logFunnelEvent('walkthrough_step_completed', { step: completed }, token);
      setStep(Math.min(TOTAL_STEPS, completed + 1));
      navigation.setParams({ completedStep: undefined });
    }
  }, [route?.params?.completedStep, step, navigation, token]));

  function advance() {
    logFunnelEvent('walkthrough_step_completed', { step }, token);
    setStep(prev => Math.min(TOTAL_STEPS, (prev || 1) + 1));
  }

  async function finish() {
    try { await AsyncStorage.removeItem(STORE_KEY); } catch {}
    logFunnelEvent('walkthrough_step_completed', { step: 8 }, token);
    await completeDemo?.();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Paywall', params: { source: 'walkthrough_done', currentPlan: user?.user_type || 'free' } }],
    });
  }

  if (step == null) {
    return (
      <View style={[st.root, { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={C.green} size="large" />
      </View>
    );
  }

  return (
    <View style={[st.root, { backgroundColor: C.bg, paddingTop: insets.top + 8 }]}>
      <Dots step={step} />
      <ScrollView contentContainerStyle={[st.scroll, { paddingBottom: 160 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {step === 1 && <Step1 T={T} goals={goals} />}
        {step === 2 && <Step2 T={T} />}
        {step === 3 && <Step3 T={T} />}
        {step === 4 && <Step4 T={T} goals={goals} totals={todayTotals} />}
        {step === 5 && <Step5 T={T} />}
        {step === 6 && <Step6 T={T} />}
        {step === 7 && <Step7 T={T} />}
        {step === 8 && <Step8 T={T} />}
      </ScrollView>

      <View style={[st.footer, { paddingBottom: insets.bottom + 18 }]}>
        <StepCta
          step={step}
          T={T}
          onContinue={advance}
          onFinish={finish}
          onScan={() => {
            logFunnelEvent('walkthrough_scan_launched', {}, token);
            navigation.navigate('Scan', { fromWalkthroughStep: 2 });
          }}
          onPlate={() => {
            logFunnelEvent('walkthrough_plate_launched', {}, token);
            navigation.navigate('PlateAnalysis', { fromWalkthroughStep: 3 });
          }}
          onPlateSample={() => {
            logFunnelEvent('walkthrough_plate_sample_used', {}, token);
            navigation.navigate('PlateAnalysis', { fromWalkthroughStep: 3, useSample: true });
          }}
        />
      </View>
    </View>
  );
}

function Dots({ step }) {
  return (
    <View style={st.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[st.dot, i < step && st.dotActive, i === step - 1 && st.dotCurrent]} />
      ))}
    </View>
  );
}

function Header({ title, body }) {
  return (
    <>
      <Text style={st.title}>{title}</Text>
      <Text style={st.body}>{body}</Text>
    </>
  );
}

function Step1({ T, goals }) {
  const kcal = Math.round(goals?.calories_kcal || 0);
  const p = Math.round(goals?.protein_g || 0);
  const c = Math.round(goals?.carbs_g || 0);
  const f = Math.round(goals?.fat_g || 0);
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Header title={T.s1.title} body={T.s1.body} />
      <View style={st.bigKcal}>
        <Text style={st.bigKcalNum}>{kcal || '—'}</Text>
        <Text style={st.bigKcalLabel}>{T.macros.kcal} / {T.macros.kcal === 'kcal' ? 'day' : ''}</Text>
      </View>
      <View style={st.macroGrid}>
        <MacroCell color={C.blue} value={p} unit="g" label={T.macros.protein} />
        <MacroCell color={C.purple} value={c} unit="g" label={T.macros.carbs} />
        <MacroCell color={C.orange} value={f} unit="g" label={T.macros.fat} />
      </View>
    </View>
  );
}

function MacroCell({ color, value, unit, label }) {
  return (
    <View style={st.macroCell}>
      <Text style={[st.macroVal, { color }]}>{value || '—'}<Text style={st.macroUnit}>{unit}</Text></Text>
      <Text style={st.macroLabel}>{label}</Text>
    </View>
  );
}

function Step2({ T }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Header title={T.s2.title} body={T.s2.body} />
      <View style={st.iconHero}>
        <Ionicons name="barcode-outline" size={86} color={C.green} />
      </View>
    </View>
  );
}

function Step3({ T }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Header title={T.s3.title} body={T.s3.body} />
      <View style={st.iconHero}>
        <Ionicons name="camera-outline" size={86} color={C.amber} />
      </View>
    </View>
  );
}

function Step4({ T, goals, totals }) {
  const gKcal = goals?.calories_kcal || 0;
  const gP = goals?.protein_g || 0;
  const gC = goals?.carbs_g || 0;
  const gF = goals?.fat_g || 0;
  const tKcal = totals?.calories_kcal || 0;
  const tP = totals?.protein_g || 0;
  const tC = totals?.carbs_g || 0;
  const tF = totals?.fat_g || 0;
  return (
    <View style={{ width: '100%' }}>
      <Header title={T.s4.title} body={T.s4.body} />
      <View style={st.dashCard}>
        <Bar label={T.macros.kcal} color={C.green} value={tKcal} goal={gKcal} unit="kcal" />
        <Bar label={T.macros.protein} color={C.blue} value={tP} goal={gP} unit="g" />
        <Bar label={T.macros.carbs} color={C.purple} value={tC} goal={gC} unit="g" />
        <Bar label={T.macros.fat} color={C.orange} value={tF} goal={gF} unit="g" />
      </View>
    </View>
  );
}

function Bar({ label, color, value, goal, unit }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <View style={st.barRow}>
      <View style={st.barHead}>
        <Text style={st.barLabel}>{label}</Text>
        <Text style={st.barNums}>{Math.round(value)}<Text style={st.barGoal}> / {Math.round(goal) || '—'} {unit}</Text></Text>
      </View>
      <View style={st.barTrack}>
        <View style={[st.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Step5({ T }) {
  const sets = [
    { ex: 'Barbell Squat', s: 4, r: '8-10' },
    { ex: 'Romanian Deadlift', s: 3, r: '10-12' },
    { ex: 'Walking Lunge', s: 3, r: '12/leg' },
  ];
  return (
    <View style={{ width: '100%' }}>
      <Header title={T.s5.title} body={T.s5.body} />
      <View style={st.planCard}>
        {sets.map((it, i) => (
          <View key={i} style={[st.planRow, i < sets.length - 1 && st.planRowBorder]}>
            <View style={st.planDot}>
              <Ionicons name="barbell-outline" size={18} color={C.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.planName}>{it.ex}</Text>
              <Text style={st.planSub}>{it.s} {T.mock.sets} · {it.r} {T.mock.reps}</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={C.mutedDark} />
          </View>
        ))}
        <Text style={st.lockedCaption}>{T.s5.locked}</Text>
      </View>
    </View>
  );
}

function Step6({ T }) {
  const meals = [
    { m: T.mock.breakfast, name: 'Oats, berries, whey', kcal: 480, p: 32 },
    { m: T.mock.lunch,     name: 'Chicken, rice, greens', kcal: 620, p: 48 },
    { m: T.mock.snack,     name: 'Greek yogurt, almonds', kcal: 280, p: 18 },
    { m: T.mock.dinner,    name: 'Salmon, quinoa, veg',   kcal: 580, p: 42 },
  ];
  return (
    <View style={{ width: '100%' }}>
      <Header title={T.s6.title} body={T.s6.body} />
      <View style={st.planCard}>
        {meals.map((it, i) => (
          <View key={i} style={[st.planRow, i < meals.length - 1 && st.planRowBorder]}>
            <View style={[st.planDot, { backgroundColor: 'rgba(244,181,63,0.18)' }]}>
              <Ionicons name="restaurant-outline" size={18} color={C.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.planName}>{it.m}</Text>
              <Text style={st.planSub}>{it.name} · {it.kcal} kcal · {it.p}g</Text>
            </View>
            <Ionicons name="lock-closed" size={16} color={C.mutedDark} />
          </View>
        ))}
        <Text style={st.lockedCaption}>{T.s6.locked}</Text>
      </View>
    </View>
  );
}

function Step7({ T }) {
  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <Header title={T.s7.title} body={T.s7.body} />
      <View style={st.phoneMock}>
        <View style={st.phoneScreen}>
          <View style={st.phoneHeader}>
            <Text style={st.phoneTitle}>Profile</Text>
          </View>
          <View style={st.phoneRow}>
            <Ionicons name="person-circle-outline" size={28} color={C.muted} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={[st.phoneLine, { width: '60%' }]} />
              <View style={[st.phoneLine, { width: '40%', marginTop: 4 }]} />
            </View>
          </View>
          <View style={[st.phoneCard, st.phoneCardHighlight]}>
            <Ionicons name="trending-up-outline" size={22} color={C.amber} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={[st.phoneLine, { width: '70%', backgroundColor: C.amber }]} />
              <View style={[st.phoneLine, { width: '50%', marginTop: 4 }]} />
            </View>
          </View>
          <View style={st.phoneTabBar}>
            {[0, 1, 2, 3, 4].map(i => (
              <View key={i} style={[st.phoneTab, i === 4 && st.phoneTabActive]} />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

function Step8({ T }) {
  return (
    <View style={{ width: '100%', alignItems: 'center', paddingTop: 40 }}>
      <View style={st.readyBadge}>
        <Ionicons name="checkmark" size={38} color={C.green} />
      </View>
      <Text style={st.readyTitle}>{T.s8.title}</Text>
      <Text style={st.readyBody}>{T.s8.body}</Text>
      <View style={st.readyReassureCard}>
        <Ionicons name="shield-checkmark" size={26} color={C.green} />
        <Text style={st.readyReassureStrong}>{T.s8.reassure}</Text>
      </View>
    </View>
  );
}

function StepCta({ step, T, onContinue, onFinish, onScan, onPlate, onPlateSample }) {
  if (step === 2) {
    return <Btn label={T.s2.cta} onPress={onScan} />;
  }
  if (step === 3) {
    return (
      <>
        <Btn label={T.s3.cta} onPress={onPlate} />
        <Pressable onPress={onPlateSample} style={st.linkBtn}>
          <Text style={st.linkText}>{T.s3.sample_cta}</Text>
        </Pressable>
      </>
    );
  }
  if (step === 7) return <Btn label={T.s7.cta} onPress={onContinue} />;
  if (step === 8) return <Btn label={T.s8.cta} onPress={onFinish} />;
  const labels = { 1: T.s1.cta, 4: T.s4.cta, 5: T.s5.cta, 6: T.s6.cta };
  return <Btn label={labels[step] || 'Continue'} onPress={onContinue} />;
}

function Btn({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.btn, pressed && { opacity: 0.85 }]}>
      <Text style={st.btnText}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 22, paddingTop: 12, alignItems: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 8 },
  dot: { width: 20, height: 4, borderRadius: 2, backgroundColor: C.track },
  dotActive: { backgroundColor: C.deep },
  dotCurrent: { backgroundColor: C.green },
  title: { ...font('h1'), fontSize: 26, color: C.ink, textAlign: 'center', marginTop: 24, marginBottom: 10, lineHeight: 32 },
  body: { ...font('body'), fontSize: 15, color: C.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 6 },
  bigKcal: { alignItems: 'center', marginBottom: 20, marginTop: 4 },
  bigKcalNum: { ...font('h1'), fontSize: 64, color: C.green, lineHeight: 70 },
  bigKcalLabel: { ...font('body'), fontSize: 12, color: C.mutedDark, textTransform: 'uppercase', letterSpacing: 1 },
  macroGrid: { flexDirection: 'row', gap: 10, width: '100%', paddingHorizontal: 4 },
  macroCell: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, alignItems: 'center' },
  macroVal: { ...font('h1'), fontSize: 22 },
  macroUnit: { fontSize: 13, color: C.muted },
  macroLabel: { ...font('body'), fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center' },
  iconHero: { width: 140, height: 140, borderRadius: 70, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  dashCard: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginTop: 4 },
  barRow: { marginBottom: 14 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  barLabel: { ...font('bodyBold'), fontSize: 13, color: C.ink },
  barNums: { ...font('body'), fontSize: 13, color: C.muted },
  barGoal: { color: C.mutedDark },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: C.track, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  planCard: { backgroundColor: C.card, borderRadius: 16, padding: 6, marginTop: 4 },
  planRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, gap: 12 },
  planRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  planDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(47,196,114,0.15)', alignItems: 'center', justifyContent: 'center' },
  planName: { ...font('bodyBold'), fontSize: 14, color: C.ink },
  planSub: { ...font('body'), fontSize: 12, color: C.muted, marginTop: 2 },
  lockedCaption: { ...font('body'), fontSize: 11, color: C.amber, textAlign: 'center', padding: 10 },
  phoneMock: { width: 260, height: 400, borderRadius: 32, backgroundColor: '#000', padding: 10, marginTop: 10 },
  phoneScreen: { flex: 1, backgroundColor: C.card, borderRadius: 24, padding: 14, justifyContent: 'space-between' },
  phoneHeader: { paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.rule },
  phoneTitle: { ...font('bodyBold'), color: C.ink, fontSize: 14 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  phoneLine: { height: 6, borderRadius: 3, backgroundColor: C.track },
  phoneCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 12, padding: 12, marginTop: 10 },
  phoneCardHighlight: { borderWidth: 2, borderColor: C.amber, shadowColor: C.amber, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  phoneTabBar: { flexDirection: 'row', gap: 6, justifyContent: 'space-around', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.rule },
  phoneTab: { width: 34, height: 6, borderRadius: 3, backgroundColor: C.track },
  phoneTabActive: { backgroundColor: C.amber },
  readyBadge: { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(47,196,114,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 2, borderColor: C.green },
  readyTitle: { ...font('h1'), fontSize: 30, color: C.ink, textAlign: 'center', marginBottom: 14 },
  readyBody: { ...font('body'), fontSize: 16, color: C.muted, textAlign: 'center', lineHeight: 24, marginBottom: 18, paddingHorizontal: 8 },
  readyReassureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(47,196,114,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(47,196,114,0.4)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
    marginHorizontal: 4,
  },
  readyReassureStrong: {
    ...font('body'),
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingTop: 12, backgroundColor: 'rgba(14,27,20,0.96)' },
  btn: { backgroundColor: C.green, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { ...font('bodyBold'), color: '#06110C', fontSize: 16 },
  linkBtn: { paddingVertical: 12, alignItems: 'center' },
  linkText: { ...font('body'), color: C.muted, fontSize: 13, textDecorationLine: 'underline' },
});
