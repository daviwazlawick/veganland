// Onboarding da V2: uma pergunta por vez, com o boneco reagindo a cada resposta.
// Cinco salas (Você, Treino, Comida, Medidas, Plano), cada uma com a sua cor; a
// troca de sala é a transição de cor do fundo. No fim, a IA monta dieta e treino.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, Animated, Platform, StyleSheet, useWindowDimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { font } from '../theme/type';
import Figure, { paramsFromAnswers, goalParams, figureGeometry, SILHOUETTES } from './Figure';
import { useTween, useLoop, useColorTween, useCountUp, reducedMotion } from './anim';
import { Choice, Chip, PrimaryButton, Ruler } from './ui';
import { s2 } from './strings';
import { v2SaveProfile, v2GeneratePlan } from './api';

const STORE_PREFIX = '@novaqi_v2_onboarding_';
const MEASURES = ['neck', 'chest', 'waist', 'hips', 'arm', 'thigh', 'calf'];
const MEASURE_DEFAULT = {
  male:   { neck: 38, chest: 100, waist: 88, hips: 100, arm: 33, thigh: 56, calf: 37 },
  female: { neck: 32, chest: 90, waist: 74, hips: 100, arm: 28, thigh: 56, calf: 35 },
};
const FOOD_ALLERGIES = ['peanuts', 'tree_nuts', 'dairy', 'eggs', 'gluten', 'soy', 'shellfish', 'fish', 'sesame', 'corn'];

const PAL = {
  voce:    { bg: '#F1F3EF', fg: '#17221B', surface: '#FFFFFF', accent: '#16A75A', fig: '#16A75A', limb: '#0B7A3F', hl: '#E8991C', btnBg: '#17221B', btnFg: '#FFFFFF', bar: '#16A75A' },
  treino:  { bg: '#0B7A3F', fg: '#FFFFFF', surface: '#13894C', accent: '#0E1B14', fig: '#DDF3E5', limb: '#9FD3B3', hl: '#FFC15A', btnBg: '#FFFFFF', btnFg: '#0B7A3F', bar: '#FFC15A' },
  comida:  { bg: '#FCEFD2', fg: '#3A2604', surface: '#FFF8E8', accent: '#9A5A06', fig: '#E8991C', limb: '#B86E0A', hl: '#C93A31', btnBg: '#3A2604', btnFg: '#FFFFFF', bar: '#9A5A06' },
  medidas: { bg: '#FFFFFF', fg: '#17221B', surface: '#F1F3EF', accent: '#16A75A', fig: '#16A75A', limb: '#0B7A3F', hl: '#E8991C', btnBg: '#17221B', btnFg: '#FFFFFF', bar: '#E8991C' },
  plano:   { bg: '#143524', fg: '#FFFFFF', surface: '#1C4630', accent: '#16A75A', fig: '#16A75A', limb: '#0E6B38', hl: '#FFC15A', btnBg: '#FFC15A', btnFg: '#143524', bar: '#FFC15A' },
};
const SECTIONS = ['voce', 'treino', 'comida', 'medidas', 'plano'];

const SECTION_OF = {
  name: 'voce', goal: 'voce', sex: 'voce', age: 'voce', height: 'voce', weight: 'voce', activity: 'voce',
  experience: 'treino', days: 'treino', session: 'treino', place: 'treino', focus: 'treino', injuries: 'treino',
  diet: 'comida', allergies: 'comida', meals: 'comida', cooking: 'comida',
  measureMode: 'medidas', silhouette: 'medidas', summary: 'plano',
};
const sectionOf = id => (id.startsWith('m_') ? 'medidas' : SECTION_OF[id]);

function buildSteps(a) {
  const s = ['name', 'goal', 'sex', 'age', 'height', 'weight', 'activity', 'experience', 'days', 'session', 'place', 'focus',
    'injuries', 'diet', 'allergies', 'meals', 'cooking', 'measureMode'];
  if (a.measure_mode === 'tape') s.push(...MEASURES.map(m => `m_${m}`));
  if (a.measure_mode === 'silhouette') s.push('silhouette');
  s.push('summary');
  return s;
}

const REQUIRED = { goal: 'goal', sex: 'sex', activity: 'activity', experience: 'experience', days: 'days_per_week', session: 'session_min', place: 'place', diet: 'diet_id', meals: 'meals_per_day', cooking: 'cooking', measureMode: 'measure_mode', silhouette: 'silhouette' };

export default function OnboardingV2Screen({ navigation, route }) {
  const { language, saveProfile, profile } = useApp();
  const { token, user } = useAuth();
  const { refresh: refreshNutrition } = useNutrition();
  const STORE = STORE_PREFIX + (user?.id || 'anon');
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const wide = W >= 860;
  const editMode = !!route?.params?.edit;

  const [a, setA] = useState({ name: profile?.name || '', focus: [], allergy_ids: profile?.allergyIds || [], measurements: {}, diet_id: profile?.dietId || null });
  const [stepIdx, setStepIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [phase, setPhase] = useState('form'); // form | gen | reveal | error
  const [targets, setTargets] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORE).then(raw => {
      if (raw) { try { const s = JSON.parse(raw); if (s.a) setA(prev => ({ ...prev, ...s.a })); if (s.stepIdx) setStepIdx(s.stepIdx); } catch {} }
    }).finally(() => setLoaded(true));
  }, []);
  useEffect(() => { if (loaded && phase === 'form') AsyncStorage.setItem(STORE, JSON.stringify({ a, stepIdx })).catch(() => {}); }, [a, stepIdx, loaded]);

  const steps = useMemo(() => buildSteps(a), [a.measure_mode]);
  const id = steps[Math.min(stepIdx, steps.length - 1)];
  const sec = phase === 'form' ? sectionOf(id) : 'plano';
  const pal = PAL[sec];
  const bg = useColorTween(pal.bg, 650);
  const fg = useColorTween(pal.fg, 650);
  const fig = useColorTween(pal.fig, 650);
  const limb = useColorTween(pal.limb, 650);
  const sexKey = a.sex === 'female' ? 'female' : 'male';

  const set = (k, v) => setA(prev => ({ ...prev, [k]: v }));
  const setM = (k, v) => setA(prev => ({ ...prev, measurements: { ...prev.measurements, [`${k}_cm`]: v } }));

  // Valores de partida dos números conforme o sexo.
  const age = a.age ?? 30;
  const height = a.height_cm ?? (a.sex === 'female' ? 163 : 176);
  const weight = a.weight_kg ?? (a.sex === 'female' ? 62 : 78);

  // ── transição entre passos ───────────────────────────────────────────────
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reducedMotion) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 340, useNativeDriver: Platform.OS !== 'web', easing: t => 1 - Math.pow(1 - t, 4) }).start();
  }, [id, phase]);
  const enterStyle = {
    opacity: anim,
    transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [28 * dir, 0] }) }],
  };

  const canNext = (() => {
    const k = REQUIRED[id];
    return !k || (a[k] != null && a[k] !== '');
  })();

  function go(delta) {
    setDir(delta);
    setStepIdx(i => Math.max(0, Math.min(steps.length - 1, i + delta)));
  }
  function next() {
    if (!canNext) return;
    if (id === 'age' && a.age == null) set('age', age);
    if (id === 'height' && a.height_cm == null) set('height_cm', height);
    if (id === 'weight' && a.weight_kg == null) set('weight_kg', weight);
    if (id.startsWith('m_')) {
      const m = id.slice(2);
      if (a.measurements[`${m}_cm`] == null) setM(m, MEASURE_DEFAULT[sexKey][m]);
    }
    go(1);
  }
  function pick(k, v) {
    set(k, v);
    setTimeout(() => { setDir(1); setStepIdx(i => Math.min(i + 1, buildSteps({ ...a, [k]: v }).length - 1)); }, reducedMotion ? 0 : 240);
  }

  // Enter avança no navegador.
  useEffect(() => {
    if (Platform.OS !== 'web' || phase !== 'form') return;
    const h = e => { if (e.key === 'Enter' && id !== 'summary') next(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  function cleanProfile() {
    const { measure_mode, ...rest } = a;
    return {
      ...rest, measure_mode,
      age: a.age ?? age, height_cm: a.height_cm ?? height, weight_kg: a.weight_kg ?? weight,
      measurements: measure_mode === 'tape' ? a.measurements : {},
      silhouette: measure_mode === 'silhouette' ? a.silhouette : null,
    };
  }

  // Resumo: salva o perfil e recebe as metas calculadas no servidor.
  useEffect(() => {
    if (id !== 'summary' || phase !== 'form') return;
    setTargets(null);
    v2SaveProfile(token, cleanProfile(), true).then(r => setTargets(r.targets)).catch(() => setTargets({ error: true }));
  }, [id]);

  async function generate() {
    setPhase('gen');
    try {
      const r = await v2GeneratePlan(token, language);
      setPlan(r.plan);
      setPhase('reveal');
    } catch (e) {
      if (e.status === 402) {
        setPhase('form');
        navigation.navigate('Paywall', { source: 'v2_plan', currentPlan: user?.user_type || 'free' });
        return;
      }
      setPhase('error');
    }
  }

  async function enterApp() {
    await AsyncStorage.removeItem(STORE).catch(() => {});
    // As metas do plano viraram as metas do Diário no servidor; recarregar.
    try { refreshNutrition?.(); } catch {}
    const dietId = a.diet_id || 'omnivore';
    if (editMode) {
      await saveProfile({ ...(profile || {}), dietId, allergyIds: a.allergy_ids || [], name: a.name || profile?.name || null }).catch(() => {});
      navigation.goBack();
      return;
    }
    await saveProfile({ dietId, allergyIds: a.allergy_ids || [], name: (a.name || '').trim() || null, halalStrictness: null }).catch(() => {});
    // A rota do onboarding existe nos dois grupos do navegador, então a troca de
    // perfil sozinha não tira a pessoa daqui: reset explícito pra Main.
    setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] }), 0);
  }

  // ── boneco ──────────────────────────────────────────────────────────────
  const baseParams = paramsFromAnswers({ ...a, age, height_cm: height, weight_kg: weight, silhouette: a.measure_mode === 'silhouette' ? a.silhouette : null });
  const params = useTween(baseParams, 650);
  const isMeasure = phase === 'form' && id.startsWith('m_');
  const mKey = isMeasure ? id.slice(2) : null;
  const tapePhase = useLoop(2600, isMeasure);
  const genPhase = useLoop(2200, phase === 'gen');

  const vb = (() => {
    if (!mKey) return [0, 0, 200, 400];
    const t = figureGeometry(baseParams).tapes[mKey];
    const w = 120, h = 240;
    return [Math.max(0, Math.min(200 - w, t.x - w / 2)), Math.max(0, Math.min(400 - h, t.y - h / 2)), w, h];
  })();
  const vbT = useTween(vb, 700);

  // No celular o boneco ocupa o espaço que a pergunta deixa livre.
  const roomy = ['name', 'sex', 'age', 'height', 'weight', 'focus', 'injuries', 'days', 'session', 'meals', 'summary'].includes(id);
  const figH = wide ? Math.min(H * 0.78, 640)
    : phase !== 'form' ? Math.min(320, H * 0.38)
    : isMeasure ? Math.min(360, H * 0.42)
    : roomy ? Math.min(330, H * 0.38)
    : id === 'goal' ? Math.min(250, H * 0.3)
    : Math.min(170, H * 0.22);
  const showGoalPair = phase === 'form' && id === 'goal' && a.goal;
  const goalP = useTween(showGoalPair ? goalParams(baseParams, a.goal) : baseParams, 700);
  const pairK = useTween(showGoalPair ? 1 : 0, 520);

  const mValue = mKey ? (a.measurements[`${mKey}_cm`] ?? MEASURE_DEFAULT[sexKey][mKey]) : null;

  const figurePanel = (
    <View style={{ height: figH, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
      <View style={{ alignItems: 'center' }}>
        <Figure
          id="main" params={params} width={figH / 2} height={figH} color={fig} limbColor={limb} accent={pal.hl}
          viewBox={vbT.map(n => n.toFixed(1)).join(' ')}
          highlight={phase === 'form' && id === 'focus' ? a.focus : []}
          tape={mKey} tapePhase={tapePhase}
          scan={phase === 'gen' ? genPhase : null}
        />
        {pairK > 0.02 && <Text style={[st.figLabel, { color: fg, opacity: pairK }]}>{T.goal.today}</Text>}
      </View>
      {pairK > 0.02 && (
        <View style={{ alignItems: 'center', width: (figH / 2 + 24) * pairK, opacity: pairK, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-forward" size={20} color={pal.hl} style={{ marginHorizontal: 2 }} />
            <Figure id="goal" params={goalP} width={figH / 2} height={figH} color={pal.hl} limbColor={pal.hl} accent={pal.hl} />
          </View>
          <Text style={[st.figLabel, { color: pal.hl, marginLeft: 22 }]}>{T.goal.target}</Text>
        </View>
      )}
    </View>
  );

  // ── conteúdo de cada passo ──────────────────────────────────────────────
  const choiceProps = { fg: pal.fg, accent: pal.accent === pal.bg ? pal.fg : pal.accent, surface: pal.surface };
  const rulerW = Math.min(wide ? 440 : W - 48, 440);

  function Question({ q, hint }) {
    return (
      <View style={{ marginBottom: 22 }}>
        <Text style={[st.q, { color: pal.fg, fontSize: wide ? 38 : 28, lineHeight: wide ? 44 : 33 }]} accessibilityRole="header">{q}</Text>
        {hint ? <Text style={[st.hint, { color: pal.fg }]}>{hint}</Text> : null}
      </View>
    );
  }

  function renderStep() {
    switch (id) {
      case 'name':
        return (<>
          <Question q={T.name.q} />
          <TextInput value={a.name} onChangeText={v => set('name', v)} placeholder={T.name.ph} autoFocus={Platform.OS === 'web'}
            autoComplete="given-name" textContentType="givenName" returnKeyType="next" onSubmitEditing={next}
            placeholderTextColor={pal.fg + '66'}
            style={[st.input, { color: pal.fg, borderColor: pal.fg + '33' }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
        </>);
      case 'goal':
        return (<>
          <Question q={T.goal.q} />
          {Object.entries(T.goal.opts).map(([k, [t, s]]) => (
            <Choice key={k} title={t} sub={s} selected={a.goal === k} onPress={() => set('goal', k)} {...choiceProps} />
          ))}
        </>);
      case 'sex':
        return (<>
          <Question q={T.sex.q} hint={T.sex.hint} />
          <Choice title={T.sex.male} selected={a.sex === 'male'} onPress={() => pick('sex', 'male')} {...choiceProps} />
          <Choice title={T.sex.female} selected={a.sex === 'female'} onPress={() => pick('sex', 'female')} {...choiceProps} />
        </>);
      case 'age':
        return (<><Question q={T.age.q} />
          <Ruler value={age} onChange={v => set('age', v)} min={14} max={90} unit={T.age.unit} fg={pal.fg} accent={pal.hl} width={rulerW} /></>);
      case 'height':
        return (<><Question q={T.height.q} />
          <Ruler value={height} onChange={v => set('height_cm', v)} min={130} max={220} unit="cm" fg={pal.fg} accent={pal.hl} width={rulerW} /></>);
      case 'weight':
        return (<><Question q={T.weight.q} hint={T.weight.hint} />
          <Ruler value={weight} onChange={v => set('weight_kg', v)} min={35} max={250} step={0.5} decimals={1} unit="kg" fg={pal.fg} accent={pal.hl} width={rulerW} /></>);
      case 'activity':
        return (<><Question q={T.activity.q} />
          {Object.entries(T.activity.opts).map(([k, [t, s]]) => <Choice key={k} title={t} sub={s} selected={a.activity === k} onPress={() => pick('activity', k)} {...choiceProps} />)}</>);
      case 'experience':
        return (<><Question q={T.experience.q} />
          {Object.entries(T.experience.opts).map(([k, [t, s]]) => <Choice key={k} title={t} sub={s} selected={a.experience === k} onPress={() => pick('experience', k)} {...choiceProps} />)}</>);
      case 'days':
        return (<><Question q={T.days.q} />
          <View style={st.wrap}>{[2, 3, 4, 5, 6].map(n => <Chip key={n} big label={String(n)} selected={a.days_per_week === n} onPress={() => pick('days_per_week', n)} {...choiceProps} />)}</View>
          <Text style={[st.hint, { color: pal.fg }]}>{T.days.unit}</Text></>);
      case 'session':
        return (<><Question q={T.session.q} />
          <View style={st.wrap}>{[30, 45, 60, 75, 90].map(n => <Chip key={n} big label={String(n)} selected={a.session_min === n} onPress={() => pick('session_min', n)} {...choiceProps} />)}</View>
          <Text style={[st.hint, { color: pal.fg }]}>{T.session.unit}</Text></>);
      case 'place':
        return (<><Question q={T.place.q} />
          {Object.entries(T.place.opts).map(([k, [t, s]]) => <Choice key={k} title={t} sub={s} selected={a.place === k} onPress={() => pick('place', k)} {...choiceProps} />)}</>);
      case 'focus':
        return (<><Question q={T.focus.q} hint={T.focus.hint} />
          <View style={st.wrap}>{Object.entries(T.focus.opts).map(([k, l]) => (
            <Chip key={k} label={l} selected={a.focus.includes(k)} {...choiceProps}
              onPress={() => set('focus', a.focus.includes(k) ? a.focus.filter(x => x !== k) : [...a.focus, k])} />
          ))}</View></>);
      case 'injuries':
        return (<><Question q={T.injuries.q} hint={T.injuries.hint} />
          <TextInput value={a.injuries || ''} onChangeText={v => set('injuries', v)} placeholder={T.injuries.ph} multiline
            placeholderTextColor={pal.fg + '88'}
            style={[st.input, st.inputMulti, { color: pal.fg, borderColor: pal.fg + '44' }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} /></>);
      case 'diet':
        return (<><Question q={T.dietQ.q} />
          {[...DIETS].sort((x, y) => (x.id === 'omnivore' ? -1 : y.id === 'omnivore' ? 1 : 0)).map(d => <Choice key={d.id} title={d.label[language] || d.label.en} sub={d.description[language] || d.description.en}
            selected={a.diet_id === d.id} onPress={() => pick('diet_id', d.id)} {...choiceProps} />)}</>);
      case 'allergies':
        return (<><Question q={T.allergies.q} hint={T.allergies.hint} />
          <View style={st.wrap}>{ALLERGIES.filter(x => FOOD_ALLERGIES.includes(x.id)).map(x => (
            <Chip key={x.id} label={x.label[language] || x.label.en} selected={a.allergy_ids.includes(x.id)} {...choiceProps}
              onPress={() => set('allergy_ids', a.allergy_ids.includes(x.id) ? a.allergy_ids.filter(y => y !== x.id) : [...a.allergy_ids, x.id])} />
          ))}</View>
          <TextInput value={a.dislikes || ''} onChangeText={v => set('dislikes', v)} placeholder={T.allergies.dislikes}
            placeholderTextColor={pal.fg + '88'}
            style={[st.input, { fontSize: 18, color: pal.fg, borderColor: pal.fg + '44', marginTop: 8 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} /></>);
      case 'meals':
        return (<><Question q={T.meals.q} />
          <View style={st.wrap}>{[1, 2, 3, 4, 5, 6].map(n => <Chip key={n} big label={String(n)} selected={a.meals_per_day === n} onPress={() => pick('meals_per_day', n)} {...choiceProps} />)}</View>
          <Text style={[st.hint, { color: pal.fg }]}>{T.meals.unit}</Text></>);
      case 'cooking':
        return (<><Question q={T.cooking.q} />
          {Object.entries(T.cooking.opts).map(([k, [t, s]]) => <Choice key={k} title={t} sub={s} selected={a.cooking === k} onPress={() => pick('cooking', k)} {...choiceProps} />)}</>);
      case 'measureMode':
        return (<><Question q={T.measureMode.q} hint={T.measureMode.hint} />
          <Choice title={T.measureMode.tape[0]} sub={T.measureMode.tape[1]} selected={a.measure_mode === 'tape'} onPress={() => pick('measure_mode', 'tape')} {...choiceProps} />
          <Choice title={T.measureMode.silhouette[0]} sub={T.measureMode.silhouette[1]} selected={a.measure_mode === 'silhouette'} onPress={() => pick('measure_mode', 'silhouette')} {...choiceProps} /></>);
      case 'silhouette':
        return (<><Question q={T.silhouette.q} hint={T.silhouette.hint} />
          <View style={st.silGrid}>
            {SILHOUETTES.map(s => {
              const sel = a.silhouette === s.id;
              return (
                <Pressable key={s.id} onPress={() => set('silhouette', s.id)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
                  style={({ pressed }) => [st.silCell, { backgroundColor: sel ? pal.accent : pal.surface, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <Figure id={`s-${s.id}`} params={{ ...s, sex: a.sex === 'female' ? 1 : 0 }} width={58} height={116}
                    color={sel ? '#FFFFFF' : pal.fig} limbColor={sel ? '#DDF3E5' : pal.limb} />
                  <Text style={[st.silLabel, { color: sel ? '#FFFFFF' : pal.fg }]}>{T.silhouette.opts[s.id]}</Text>
                </Pressable>
              );
            })}
          </View></>);
      case 'summary':
        return <Summary T={T} t={targets} fg={pal.fg} accent={pal.hl} surface={pal.surface} wide={wide} />;
      default:
        if (id.startsWith('m_')) {
          const m = id.slice(2);
          const i = MEASURES.indexOf(m) + 1;
          return (<>
            <Text style={[st.eyebrow, { color: pal.fg }]}>{T.measures.count(i, MEASURES.length)}</Text>
            <Question q={T.measures[m][0]} hint={T.measures[m][1]} />
            <Ruler value={mValue} onChange={v => setM(m, v)} min={15} max={200} step={0.5} decimals={1} unit="cm" fg={pal.fg} accent={pal.hl} width={rulerW} />
          </>);
        }
        return null;
    }
  }

  // ── telas de geração e revelação ────────────────────────────────────────
  if (phase === 'gen' || phase === 'error') {
    return (
      <View style={[st.root, { backgroundColor: bg, paddingTop: insets.top + 24 }]}>
        <View style={[st.genWrap, wide && { flexDirection: 'row', justifyContent: 'center' }]}>
          {figurePanel}
          <View style={{ maxWidth: 420, width: '100%', paddingHorizontal: 24, marginTop: 24 }}>
            {phase === 'gen' ? <GenSteps T={T} fg={pal.fg} accent={pal.hl} /> : (
              <View>
                <Text style={[st.q, { color: pal.fg, fontSize: 28 }]}>{T.gen.error}</Text>
                <PrimaryButton label={T.gen.retry} onPress={generate} bg={pal.btnBg} fg={pal.btnFg} style={{ marginTop: 24 }} />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }
  if (phase === 'reveal') {
    const locked = !['starter', 'premium', 'admin'].includes(user?.user_type);
    const openPaywall = () => navigation.navigate('Paywall', { source: 'v2_plan', currentPlan: user?.user_type || 'free' });
    return <Reveal T={T} plan={plan} name={a.name} pal={pal} bg={bg} insets={insets} wide={wide} onEnter={enterApp} onUnlock={openPaywall} locked={locked} figure={figurePanel} />;
  }

  // ── formulário ──────────────────────────────────────────────────────────
  const secIdx = SECTIONS.indexOf(sec);
  const inSec = steps.filter(s => sectionOf(s) === sec);
  const secProg = (inSec.indexOf(id) + 1) / inSec.length;
  const isChoiceStep = ['sex', 'activity', 'experience', 'days', 'session', 'place', 'diet', 'meals', 'cooking', 'measureMode'].includes(id);

  const header = (
    <View style={[st.header, { paddingTop: insets.top + 10 }]}>
      <Pressable onPress={() => (stepIdx > 0 ? go(-1) : navigation.canGoBack?.() && navigation.goBack())} hitSlop={12}
        accessibilityRole="button" accessibilityLabel={T.back} style={{ opacity: stepIdx > 0 || editMode ? 1 : 0 }}>
        <Ionicons name="chevron-back" size={26} color={fg} />
      </Pressable>
      <View style={st.bars}>
        {SECTIONS.map((s, i) => (
          <View key={s} style={[st.barTrack, { backgroundColor: fg + '22' }]}>
            <View style={[st.barFill, { backgroundColor: pal.bar, width: `${i < secIdx ? 100 : i === secIdx ? secProg * 100 : 0}%` }]} />
          </View>
        ))}
      </View>
      <Text style={[st.secLabel, { color: fg }]}>{T.sections[sec]}</Text>
    </View>
  );

  const footer = id === 'summary' ? (
    <PrimaryButton label={T.summary.cta} onPress={generate} disabled={!targets || targets.error} bg={pal.btnBg} fg={pal.btnFg} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {(id.startsWith('m_') || id === 'injuries' || id === 'focus' || id === 'allergies' || id === 'name') && (
        <Pressable onPress={() => go(1)} hitSlop={8} style={{ paddingHorizontal: 16, paddingVertical: 12 }} accessibilityRole="button">
          <Text style={[st.skip, { color: pal.fg }]}>{T.skip}</Text>
        </Pressable>
      )}
      {!isChoiceStep || a[REQUIRED[id]] != null ? (
        <PrimaryButton label={T.next} onPress={next} disabled={!canNext} bg={pal.btnBg} fg={pal.btnFg} style={{ flex: 1 }} />
      ) : <View style={{ height: 58 }} />}
    </View>
  );

  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      {header}
      {wide ? (
        <View style={st.wideRow}>
          <View style={st.wideFig}>{figurePanel}</View>
          <View style={st.wideForm}>
            <ScrollView contentContainerStyle={{ paddingVertical: 32, flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
              <Animated.View key={id} style={enterStyle}>{renderStep()}</Animated.View>
            </ScrollView>
            <View style={{ paddingBottom: 32 }}>{footer}</View>
          </View>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {figurePanel}
            <Animated.View key={id} style={[enterStyle, { marginTop: 8 }]}>{renderStep()}</Animated.View>
          </ScrollView>
          <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 16, paddingTop: 8 }}>{footer}</View>
        </>
      )}
    </View>
  );
}

function Summary({ T, t, fg, accent, surface, wide }) {
  const kcal = useCountUp(t?.calories_kcal || 0);
  if (!t) return <ActivityIndicator color={fg} style={{ marginTop: 40 }} />;
  if (t.error) return <Text style={[st.hint, { color: fg }]}>{T.gen.error}</Text>;
  const macro = (label, g) => (
    <View style={[st.macro, { backgroundColor: surface }]}>
      <Text style={[st.macroNum, { color: fg }]}>{g}<Text style={st.macroUnit}> g</Text></Text>
      <Text style={[st.macroLabel, { color: fg }]}>{label}</Text>
    </View>
  );
  return (
    <View>
      <Text style={[st.q, { color: fg, fontSize: wide ? 38 : 28 }]}>{T.summary.q}</Text>
      <Text style={[st.kcal, { color: accent, fontSize: wide ? 112 : 88, lineHeight: wide ? 116 : 92 }]}>{kcal}</Text>
      <Text style={[st.kcalLabel, { color: fg }]}>{T.summary.kcal}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
        {macro(T.summary.protein, t.protein_g)}{macro(T.summary.carbs, t.carbs_g)}{macro(T.summary.fat, t.fat_g)}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View style={[st.macro, { backgroundColor: surface }]}>
          <Text style={[st.macroNum, { color: fg }]}>{String(t.bmi).replace('.', ',')}</Text>
          <Text style={[st.macroLabel, { color: fg }]}>{T.summary.bmi}</Text>
        </View>
        {t.body_fat_pct ? (
          <View style={[st.macro, { backgroundColor: surface, flex: 2 }]}>
            <Text style={[st.macroNum, { color: fg }]}>{String(t.body_fat_pct).replace('.', ',')}<Text style={st.macroUnit}> %</Text></Text>
            <Text style={[st.macroLabel, { color: fg }]}>{T.summary.bf} {t.body_fat_source === 'measurements' ? T.summary.bfFromTape : T.summary.bfFromSil}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[st.hint, { color: fg, marginTop: 18 }]}>{T.summary.note}</Text>
    </View>
  );
}

// Lista que vai se marcando enquanto a IA trabalha. O último item só fecha quando a
// resposta chega (a tela troca pra revelação).
function GenSteps({ T, fg, accent }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setN(x => Math.min(x + 1, T.gen.steps.length - 1)), 7000);
    return () => clearInterval(iv);
  }, []);
  return (
    <View>
      <Text style={[st.q, { color: fg, fontSize: 30, marginBottom: 20 }]}>{T.gen.title}</Text>
      {T.gen.steps.map((label, i) => (
        <GenRow key={i} label={label} state={i < n ? 'done' : i === n ? 'now' : 'wait'} fg={fg} accent={accent} />
      ))}
    </View>
  );
}

function GenRow({ label, state, fg, accent }) {
  const k = useTween(state === 'wait' ? 0.3 : 1, 400);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, opacity: k }}>
      <View style={{ width: 26, alignItems: 'center' }}>
        {state === 'done' ? <Ionicons name="checkmark-circle" size={22} color={accent} />
          : state === 'now' ? <ActivityIndicator size="small" color={accent} />
          : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: fg, opacity: 0.4 }} />}
      </View>
      <Text style={[st.genLabel, { color: fg }]}>{label}</Text>
    </View>
  );
}

function Reveal({ T, plan, name, pal, bg, insets, wide, onEnter, figure, locked, onUnlock }) {
  const t = plan?.targets || {};
  const kcal = useCountUp(t.calories_kcal || 0, 1400);
  const w = plan?.workout || {};
  const d = plan?.diet || {};
  const [busy, setBusy] = useState(false);
  // Para user sem plano pago: mostra o anúncio "plano pronto" + macros reais, mas detalhes (treinos, refeições)
  // ficam desfocados por baixo de um overlay com CTA para o paywall.
  const details = (
    <>
      {d.summary ? <Text style={[st.revealText, { color: pal.fg }]}>{d.summary}</Text> : null}
      <View style={[st.revealCard, { backgroundColor: pal.surface }]}>
        <Text style={[st.revealCardLabel, { color: pal.hl }]}>{T.reveal.split}</Text>
        <Text style={[st.revealCardTitle, { color: pal.fg }]}>{w.split_name}</Text>
        <Text style={[st.revealCardSub, { color: pal.fg }]}>{T.reveal.days((w.days || []).length)}</Text>
        {(w.days || []).map(day => (
          <Text key={day.key} style={[st.revealDay, { color: pal.fg }]}>{day.key}  {day.title}  <Text style={{ opacity: 0.6 }}>{day.focus}</Text></Text>
        ))}
      </View>
      <View style={[st.revealCard, { backgroundColor: pal.surface }]}>
        <Text style={[st.revealCardLabel, { color: pal.hl }]}>{T.tabs.diet}</Text>
        <Text style={[st.revealCardSub, { color: pal.fg }]}>{T.reveal.meals((d.meals || []).length)}</Text>
        {(d.meals || []).map(m => (
          <Text key={m.key} style={[st.revealDay, { color: pal.fg }]}>{m.time}  {m.name}  <Text style={{ opacity: 0.6 }}>{m.kcal} kcal</Text></Text>
        ))}
      </View>
    </>
  );
  return (
    <View style={[st.root, { backgroundColor: bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 40, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 560 }}>
          <Text style={[st.q, { color: pal.fg, fontSize: wide ? 44 : 32 }]}>{T.reveal.title((name || '').trim())}</Text>
          <Text style={[st.kcal, { color: pal.hl, fontSize: wide ? 128 : 96, lineHeight: wide ? 132 : 100, marginTop: 12 }]}>{kcal}</Text>
          <Text style={[st.kcalLabel, { color: pal.fg }]}>{T.reveal.perDay}</Text>
          <Text style={[st.kcalLabel, { color: pal.fg, marginTop: 4 }]}>P {t.protein_g} g    C {t.carbs_g} g    G {t.fat_g} g</Text>
          {d.source === 'regras' || w.source === 'regras' ? <Text style={[st.revealText, { color: pal.hl, fontSize: 14 }]}>{T.reveal.rules}</Text> : null}

          {locked ? (
            <View style={{ position: 'relative', marginTop: 4 }}>
              <View pointerEvents="none" style={{ opacity: 0.35 }}>{details}</View>
              <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
                <View style={{ backgroundColor: pal.surface, borderRadius: 20, padding: 20, width: '100%', maxWidth: 340, alignItems: 'center' }}>
                  <Text style={{ color: pal.fg, fontSize: 18, textAlign: 'center', ...font('bold') }}>
                    {T.reveal.unlockTitle || 'Desbloqueia o teu plano completo'}
                  </Text>
                  <Text style={{ color: pal.fg, fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.75, ...font('body') }}>
                    {T.reveal.unlockSub || 'Vê cada refeição e cada treino, e começa hoje.'}
                  </Text>
                  <PrimaryButton
                    label={T.reveal.unlockCta || 'Ver plano'}
                    onPress={async () => { setBusy(true); try { await onUnlock(); } finally { setBusy(false); } }}
                    disabled={busy} bg={pal.btnBg} fg={pal.btnFg} style={{ marginTop: 16, width: '100%' }}
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              {details}
              <PrimaryButton label={T.reveal.cta} onPress={async () => { setBusy(true); try { await onEnter(); } finally { setBusy(false); } }}
                disabled={busy} bg={pal.btnBg} fg={pal.btnFg} style={{ marginTop: 28 }} />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 6 },
  bars: { flex: 1, flexDirection: 'row', gap: 6, marginHorizontal: 14 },
  barTrack: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  secLabel: { fontSize: 13, minWidth: 64, textAlign: 'right', ...font('bold') },
  wideRow: { flex: 1, flexDirection: 'row', maxWidth: 1200, width: '100%', alignSelf: 'center', paddingHorizontal: 40 },
  wideFig: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wideForm: { width: 480, marginLeft: 40 },
  q: { ...font('heading'), letterSpacing: -0.5 },
  hint: { fontSize: 15, lineHeight: 21, marginTop: 8, opacity: 0.72, ...font('body') },
  eyebrow: { fontSize: 14, marginBottom: 6, opacity: 0.6, ...font('bold') },
  input: { fontSize: 30, borderBottomWidth: 2, paddingVertical: 10, ...font('bold') },
  inputMulti: { fontSize: 18, minHeight: 90, textAlignVertical: 'top', borderWidth: 2, borderRadius: 16, padding: 14, ...font('body') },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  skip: { fontSize: 16, opacity: 0.7, ...font('bold') },
  figLabel: { fontSize: 13, marginTop: 4, ...font('bold') },
  silGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  silCell: { width: '31%', minWidth: 96, borderRadius: 18, paddingVertical: 12, alignItems: 'center' },
  silLabel: { fontSize: 13, marginTop: 6, textAlign: 'center', ...font('bold') },
  kcal: { ...font('display'), letterSpacing: -2, marginTop: 8 },
  kcalLabel: { fontSize: 16, opacity: 0.75, ...font('bold') },
  macro: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14 },
  macroNum: { fontSize: 26, ...font('display') },
  macroUnit: { fontSize: 14, ...font('bold') },
  macroLabel: { fontSize: 13, opacity: 0.7, marginTop: 2, ...font('bodyBold') },
  genWrap: { flex: 1, alignItems: 'center' },
  genLabel: { fontSize: 17, marginLeft: 10, ...font('bodyBold') },
  revealText: { fontSize: 16, lineHeight: 23, marginTop: 18, opacity: 0.85, ...font('body') },
  revealCard: { borderRadius: 20, padding: 18, marginTop: 16 },
  revealCardLabel: { fontSize: 13, ...font('bold') },
  revealCardTitle: { fontSize: 24, marginTop: 4, ...font('heading') },
  revealCardSub: { fontSize: 14, opacity: 0.7, marginTop: 2, marginBottom: 10, ...font('bodyBold') },
  revealDay: { fontSize: 15, marginTop: 6, ...font('bodyBold') },
});
