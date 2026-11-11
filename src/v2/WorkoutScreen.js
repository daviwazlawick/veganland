// Aba Treino: a ficha gerada pela IA, com a carga de cada série marcada na hora,
// a referência da última vez e o cronômetro de descanso.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, ActivityIndicator, Platform, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { font } from '../theme/type';
import { s2 } from './strings';
import { usePlan, weekdayIndex, sessionForDay } from './usePlan';
import { v2SaveSet, v2WorkoutState, localDate } from './api';
import { useTween } from './anim';

const C = { bg: '#F1F3EF', card: '#FFFFFF', ink: '#17221B', muted: '#5F6E66', green: '#16A75A', deep: '#0B7A3F', forest: '#0E1B14', amber: '#E8991C', amberBg: '#FCEFD2', rule: '#E3E8E2', done: '#EAF6EE' };

const topReps = reps => { const m = String(reps || '').match(/(\d+)\s*$/); return m ? Number(m[1]) : null; };
const fmtKg = v => (v == null ? '' : String(Number(v)).replace('.', ','));

export default function WorkoutScreen() {
  const { language } = useApp();
  const { token } = useAuth();
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const { loading, plan } = usePlan();
  const workout = plan?.workout;
  const todayIdx = weekdayIndex();
  const todaySession = sessionForDay(workout, todayIdx);
  const [chosen, setChosen] = useState(null);
  const session = (chosen && workout?.days?.find(d => d.key === chosen)) || todaySession;
  const date = localDate();
  const [state, setState] = useState({ today: [], last: {}, best: {}, sessions: [] });
  const [timer, setTimer] = useState(null); // { until, total }

  const load = useCallback(() => {
    if (!token) return;
    v2WorkoutState(token, date).then(setState).catch(() => {});
  }, [token]);
  useFocusEffect(load);

  const logged = {};
  for (const r of state.today) logged[`${r.exercise_key}#${r.set_index}`] = r;

  async function toggleSet(ex, i, weight, reps) {
    const k = `${ex.key}#${i}`;
    const was = logged[k];
    const body = { local_date: date, day_key: session?.key, exercise_key: ex.key, exercise_name: ex.name, set_index: i };
    // Marca na tela antes da resposta: na academia ninguém espera spinner.
    setState(s => ({ ...s, today: was ? s.today.filter(r => !(r.exercise_key === ex.key && r.set_index === i)) : [...s.today, { ...body, weight_kg: weight, reps }] }));
    try {
      await v2SaveSet(token, was ? { ...body, remove: true } : { ...body, weight_kg: weight, reps });
      if (!was && ex.rest_s) setTimer({ until: Date.now() + ex.rest_s * 1000, total: ex.rest_s });
    } catch { load(); }
  }

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator color={C.green} /></View>;
  if (!workout) return <View style={[s.root, s.center]}><Text style={s.emptyTitle}>{T.workout.empty}</Text></View>;

  const sched = Array.isArray(workout.schedule) && workout.schedule.length === 7 ? workout.schedule : null;
  const doneDates = new Set(state.sessions.map(x => String(x.local_date).slice(0, 10)));
  const totalSets = session ? session.exercises.reduce((n, e) => n + Number(e.sets || 0), 0) : 0;
  const doneSets = session ? session.exercises.reduce((n, e) => n + Array.from({ length: Number(e.sets || 0) }, (_, i) => logged[`${e.key}#${i}`]).filter(Boolean).length, 0) : 0;

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: timer ? 140 : 40, paddingHorizontal: 18, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Text style={s.h1}>{T.workout.title}</Text>
        {workout.split_name ? <Text style={s.split}>{workout.split_name}</Text> : null}

        {/* Semana: o que cai em cada dia, hoje marcado. */}
        <View style={s.week}>
          {T.workout.weekdays.map((wd, i) => {
            const k = sched ? sched[i] : null;
            const rest = !k || /rest|descanso/i.test(k);
            const isToday = i === todayIdx;
            const d = new Date(); d.setDate(d.getDate() + (i - todayIdx));
            const trained = doneDates.has(localDate(d));
            return (
              <View key={i} style={[s.day, isToday && { backgroundColor: C.forest }]}>
                <Text style={[s.dayWd, isToday && { color: '#fff' }]}>{wd}</Text>
                <Text style={[s.dayKey, isToday && { color: '#fff' }, rest && { opacity: 0.35 }]}>{rest ? '–' : k}</Text>
                {trained ? <View style={[s.dayDot, { backgroundColor: isToday ? C.amber : C.green }]} /> : <View style={s.dayDotEmpty} />}
              </View>
            );
          })}
        </View>

        {/* Escolher outra sessão (adiantar ou repetir). */}
        <View style={s.sessRow}>
          {workout.days.map(d => {
            const sel = session?.key === d.key;
            return (
              <Pressable key={d.key} onPress={() => setChosen(d.key)} accessibilityRole="tab" accessibilityState={{ selected: sel }}
                style={({ pressed }) => [s.sess, sel && { backgroundColor: C.deep }, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                <Text style={[s.sessKey, sel && { color: '#fff' }]}>{d.key}</Text>
                <Text style={[s.sessTitle, sel && { color: '#fff' }]} numberOfLines={1}>{d.title}</Text>
              </Pressable>
            );
          })}
        </View>

        {!session ? (
          <View style={s.restCard}>
            <Text style={s.restTitle}>{T.workout.rest}</Text>
            <Text style={s.restText}>{T.workout.restHint}</Text>
          </View>
        ) : (
          <>
            <View style={s.sessHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.sessH}>{session.title}</Text>
                <Text style={s.sessFocus}>{session.focus}{session.duration_min ? `   ${session.duration_min} min` : ''}</Text>
              </View>
              <Progress done={doneSets} total={totalSets} />
            </View>
            {doneSets === totalSets && totalSets > 0 ? (
              <View style={[s.restCard, { backgroundColor: C.forest }]}><Text style={[s.restTitle, { color: '#fff' }]}>{T.workout.finished}</Text></View>
            ) : null}
            {session.warmup ? <Text style={s.warm}><Text style={s.warmLabel}>{T.workout.warmup}  </Text>{session.warmup}</Text> : null}
            {session.exercises.map(ex => (
              <Exercise key={ex.key} ex={ex} T={T} logged={logged} last={state.last[ex.key]} best={state.best[ex.key]} onToggle={toggleSet} />
            ))}
            {session.finisher ? <Text style={s.warm}><Text style={s.warmLabel}>{T.workout.finisher}  </Text>{session.finisher}</Text> : null}
          </>
        )}

        {workout.progression ? (
          <View style={s.note}><Text style={s.noteTitle}>{T.workout.progression}</Text><Text style={s.noteText}>{workout.progression}</Text></View>
        ) : null}
        <WeekChart sessions={state.sessions} T={T} />
      </ScrollView>
      {timer && <RestTimer timer={timer} T={T} onClose={() => setTimer(null)} bottom={insets.bottom} />}
    </View>
  );
}

function Exercise({ ex, T, logged, last, best, onToggle }) {
  const n = Number(ex.sets || 3);
  const lastSets = last?.sets || [];
  const top = topReps(ex.reps);
  const loggedSets = Array.from({ length: n }, (_, i) => logged[`${ex.key}#${i}`]);
  const allDone = loggedSets.every(Boolean);
  const beatAll = allDone && top && loggedSets.every(r => Number(r.reps) >= top);
  const lastTxt = lastSets.length ? lastSets.map(r => `${fmtKg(r.weight_kg)}×${r.reps ?? ''}`).join('  ') : null;
  return (
    <View style={[s.ex, allDone && { backgroundColor: C.done }]}>
      <Text style={s.exName}>{ex.name}</Text>
      <Text style={s.exMeta}>{ex.muscle}   {n} × {ex.reps}   {ex.rest_s ? `${ex.rest_s} s` : ''}</Text>
      {ex.cue ? <Text style={s.exCue}>{ex.cue}</Text> : null}
      {(lastTxt || best) ? (
        <Text style={s.exLast}>
          {lastTxt ? `${T.workout.last}: ${lastTxt}` : ''}{lastTxt && best ? '     ' : ''}{best ? `${T.workout.best}: ${fmtKg(best)} kg` : ''}
        </Text>
      ) : null}
      <View style={s.setHead}>
        <Text style={[s.setHeadT, { width: 28 }]}>#</Text>
        <Text style={[s.setHeadT, { flex: 1 }]}>{T.workout.kg}</Text>
        <Text style={[s.setHeadT, { flex: 1 }]}>{T.workout.reps}</Text>
        <View style={{ width: 48 }} />
      </View>
      {Array.from({ length: n }, (_, i) => (
        <SetRow key={i} i={i} ex={ex} done={loggedSets[i]} ref0={lastSets[i] || lastSets[lastSets.length - 1]} top={top} onToggle={onToggle} />
      ))}
      {beatAll ? (
        <View style={s.up}><Ionicons name="trending-up" size={16} color="#9A5A06" /><Text style={s.upText}>{T.workout.up}</Text></View>
      ) : null}
    </View>
  );
}

function SetRow({ i, ex, done, ref0, top, onToggle }) {
  const [w, setW] = useState(done ? fmtKg(done.weight_kg) : ref0?.weight_kg != null ? fmtKg(ref0.weight_kg) : '');
  const [r, setR] = useState(done ? String(done.reps ?? '') : top ? String(top) : '');
  useEffect(() => { if (done) { setW(fmtKg(done.weight_kg)); setR(String(done.reps ?? '')); } }, [!!done]);
  const k = useTween(done ? 1 : 0, 220);
  const num = v => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
  return (
    <View style={s.setRow}>
      <Text style={s.setIdx}>{i + 1}</Text>
      <TextInput value={w} onChangeText={setW} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" placeholderTextColor="#AEB8B1"
        editable={!done} accessibilityLabel={`kg série ${i + 1}`} selectTextOnFocus
        style={[s.setInput, done && s.setInputDone, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
      <TextInput value={r} onChangeText={setR} keyboardType="number-pad" inputMode="numeric" placeholder="0" placeholderTextColor="#AEB8B1"
        editable={!done} accessibilityLabel={`reps série ${i + 1}`} selectTextOnFocus
        style={[s.setInput, done && s.setInputDone, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
      <Pressable onPress={() => onToggle(ex, i, num(w), num(r))} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: !!done }}
        style={({ pressed }) => [s.check, { backgroundColor: done ? C.green : '#E4E8E2', transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
        <Ionicons name="checkmark" size={22} color={done ? '#fff' : '#9AA69F'} style={{ transform: [{ scale: 0.8 + k * 0.2 }] }} />
      </Pressable>
    </View>
  );
}

function Progress({ done, total }) {
  const k = useTween(total ? done / total : 0, 500);
  const r = 22, c = 2 * Math.PI * r;
  return (
    <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={56} height={56} style={{ position: 'absolute' }}>
        <Circle cx={28} cy={28} r={r} stroke={C.rule} strokeWidth={6} fill="none" />
        <Circle cx={28} cy={28} r={r} stroke={C.green} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 28 28)" />
      </Svg>
      <Text style={{ fontSize: 13, color: C.ink, ...font('bold') }}>{done}/{total}</Text>
    </View>
  );
}

function RestTimer({ timer, T, onClose, bottom }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(iv); }, []);
  const left = Math.max(0, Math.ceil((timer.until - now) / 1000));
  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      try { Vibration.vibrate(400); } catch {}
      setTimeout(onClose, 1200);
    }
  }, [left]);
  useEffect(() => { fired.current = false; }, [timer.until]);
  const k = 1 - left / timer.total;
  const mm = Math.floor(left / 60), ss = String(left % 60).padStart(2, '0');
  return (
    <View style={[s.timer, { bottom: bottom + 12 }]}>
      <View style={[s.timerFill, { width: `${k * 100}%` }]} />
      <Text style={s.timerLabel}>{T.workout.timer}</Text>
      <Text style={s.timerNum}>{mm}:{ss}</Text>
      <Pressable onPress={onClose} hitSlop={10} style={s.timerSkip} accessibilityRole="button"><Text style={s.timerSkipText}>{T.workout.skipTimer}</Text></Pressable>
    </View>
  );
}

// Treinos por semana nas últimas 4.
function WeekChart({ sessions, T }) {
  const today = new Date();
  const weeks = [0, 0, 0, 0];
  for (const x of sessions) {
    const d = new Date(String(x.local_date).slice(0, 10) + 'T12:00:00');
    const diff = Math.floor((today - d) / 86400000);
    const w = 3 - Math.floor(diff / 7);
    if (w >= 0 && w < 4) weeks[w]++;
  }
  const max = Math.max(3, ...weeks);
  return (
    <View style={s.note}>
      <Text style={s.noteTitle}>{T.workout.week}</Text>
      <Svg width="100%" height={70} viewBox="0 0 280 70" preserveAspectRatio="none">
        {weeks.map((n, i) => (
          <Rect key={i} x={i * 70 + 12} y={60 - (n / max) * 52} width={46} height={Math.max(2, (n / max) * 52)} rx={6} fill={i === 3 ? C.green : '#BFD8C8'} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row' }}>
        {weeks.map((n, i) => <Text key={i} style={s.weekN}>{T.workout.sessions(n)}</Text>)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  h1: { fontSize: 30, color: C.ink, ...font('display'), letterSpacing: -0.5 },
  split: { fontSize: 15, color: C.muted, marginTop: 2, ...font('bodyBold') },
  week: { flexDirection: 'row', gap: 6, marginTop: 16 },
  day: { flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 10, alignItems: 'center' },
  dayWd: { fontSize: 12, color: C.muted, ...font('bold') },
  dayKey: { fontSize: 20, color: C.ink, marginTop: 2, ...font('display') },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  dayDotEmpty: { width: 6, height: 6, marginTop: 4 },
  sessRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' },
  sess: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, maxWidth: '100%' },
  sessKey: { fontSize: 16, color: C.deep, marginRight: 8, ...font('display') },
  sessTitle: { fontSize: 14, color: C.ink, ...font('bodyBold') },
  sessHead: { flexDirection: 'row', alignItems: 'center', marginTop: 22, marginBottom: 6 },
  sessH: { fontSize: 26, color: C.ink, ...font('heading') },
  sessFocus: { fontSize: 14, color: C.muted, marginTop: 2, ...font('bodyBold') },
  warm: { fontSize: 14, color: C.ink, lineHeight: 20, marginVertical: 8, opacity: 0.85, ...font('body') },
  warmLabel: { color: C.deep, ...font('bold') },
  ex: { backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 10 },
  exName: { fontSize: 18, color: C.ink, ...font('bold') },
  exMeta: { fontSize: 13.5, color: C.muted, marginTop: 2, ...font('bodyBold') },
  exCue: { fontSize: 14, color: C.ink, opacity: 0.8, marginTop: 6, lineHeight: 19, ...font('body') },
  exLast: { fontSize: 13, color: '#9A5A06', marginTop: 8, ...font('bodyBold') },
  setHead: { flexDirection: 'row', marginTop: 12, marginBottom: 2 },
  setHeadT: { fontSize: 12, color: C.muted, textAlign: 'center', ...font('bold') },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  setIdx: { width: 28, textAlign: 'center', fontSize: 15, color: C.muted, ...font('bold') },
  // width 0 + minWidth 0: no web o <input> tem largura mínima própria e estoura a linha.
  setInput: { flex: 1, width: 0, minWidth: 0, height: 46, marginHorizontal: 4, borderRadius: 12, backgroundColor: '#F1F3EF', textAlign: 'center', fontSize: 18, color: C.ink, ...font('bold') },
  setInputDone: { backgroundColor: 'transparent' },
  check: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  up: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.amberBg, borderRadius: 12, padding: 10, marginTop: 10 },
  upText: { fontSize: 13.5, color: '#9A5A06', ...font('bold') },
  restCard: { backgroundColor: C.card, borderRadius: 20, padding: 18, marginTop: 18 },
  restTitle: { fontSize: 20, color: C.ink, ...font('heading') },
  restText: { fontSize: 15, color: C.muted, marginTop: 4, lineHeight: 21, ...font('body') },
  note: { backgroundColor: C.card, borderRadius: 20, padding: 16, marginTop: 14 },
  noteTitle: { fontSize: 13, color: C.deep, marginBottom: 6, ...font('bold') },
  noteText: { fontSize: 15, color: C.ink, lineHeight: 21, ...font('body') },
  weekN: { flex: 1, textAlign: 'center', fontSize: 12, color: C.muted, ...font('bodyBold') },
  timer: { position: 'absolute', left: 16, right: 16, height: 72, borderRadius: 20, backgroundColor: C.forest, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, maxWidth: 688, alignSelf: 'center' },
  timerFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#143524' },
  timerLabel: { color: '#DDF3E5', fontSize: 14, ...font('bold') },
  timerNum: { color: '#fff', fontSize: 34, marginLeft: 14, flex: 1, ...font('display') },
  timerSkip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)' },
  timerSkipText: { color: '#fff', fontSize: 14, ...font('bold') },
  emptyTitle: { fontSize: 20, color: C.ink, ...font('heading') },
});
