import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { apiBodyAnalyze, apiSaveBodyMeasurements } from '../services/apiService';

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageFromBirthDate(dateStr) {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  if (isNaN(birth)) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? String(age) : '';
}

// ── Info content ──────────────────────────────────────────────────────────────
const INFO = {
  arm_cm:      { title: 'Perímetro do braço',       desc: 'Circunferência do braço médio, entre ombro e cotovelo.',                                                   ref: 'Homens: 28–38 cm\nMulheres: 25–33 cm',                                                                             why: 'Indicador de massa muscular dos membros superiores.' },
  forearm_cm:  { title: 'Perímetro do antebraço',   desc: 'Circunferência do antebraço entre cotovelo e pulso.',                                                       ref: 'Homens: 24–32 cm\nMulheres: 20–26 cm',                                                                             why: 'Reflete força de preensão e massa muscular periférica.' },
  waist_cm:    { title: 'Perímetro da cintura',      desc: 'Circunferência na zona mais estreita do tronco, acima do umbigo.',                                         ref: 'Risco elevado: >94 cm (♂) / >80 cm (♀)\nRisco muito elevado: >102 cm (♂) / >88 cm (♀)',                         why: 'Melhor indicador simples de gordura visceral — associado a risco cardiovascular e metabólico.' },
  hip_cm:      { title: 'Perímetro do quadril',      desc: 'Circunferência na zona mais larga das ancas/glúteos.',                                                     ref: 'Tipicamente 90–105 cm',                                                                                            why: 'Usado com a cintura para calcular RCQ. Quadril maior indica gordura subcutânea (menos nociva).' },
  thigh_cm:    { title: 'Perímetro da coxa',         desc: 'Circunferência da coxa no terço superior, abaixo da virilha.',                                             ref: 'Homens: 50–65 cm\nMulheres: 52–65 cm',                                                                             why: 'Coxa maior está associada a menor risco cardiovascular.' },
  calf_cm:     { title: 'Perímetro da panturrilha',  desc: 'Circunferência da zona mais larga da barriga da perna.',                                                   ref: 'Homens: 33–42 cm\nMulheres: 31–41 cm\n<31 cm em idosos = critério de sarcopenia',                               why: 'Proxy de massa muscular periférica e estado nutricional.' },
  bmi:         { title: 'IMC',                        desc: 'Peso (kg) ÷ altura² (m²).',                                                                               ref: 'Abaixo do peso: <18,5\nNormal: 18,5–24,9\nExcesso: 25–29,9\nObesidade: ≥30',                                   why: 'Triagem rápida. Não distingue músculo de gordura — use com IMM, IMG e % gordura.' },
  lean_mass_index: { title: 'Índice de Massa Magra (IMM)', desc: 'Massa magra (kg) ÷ altura² (m²).',                                                                  ref: 'Adequado: ≥14,6 kg/m² (♂) / ≥11,8 kg/m² (♀)',                                                                   why: 'Valores adequados associados a menor risco de diabetes e hipertensão.' },
  fat_mass_index:  { title: 'Índice de Massa Gorda (IMG)',  desc: 'Massa gorda (kg) ÷ altura² (m²).',                                                                  ref: 'Adequado: <6,0 kg/m² (♂) / <9,0 kg/m² (♀)',                                                                     why: 'Mais sensível que IMC para detectar excesso de gordura em pessoas de baixa estatura.' },
  waist_to_height: { title: 'Razão Cintura/Estatura (RCE)', desc: 'Cintura ÷ estatura. Independente do sexo.',                                                         ref: 'Baixo risco: <0,5\nRisco elevado: ≥0,5\n"Mantém a cintura abaixo de metade da estatura."',                      why: 'Preditor de risco cardiometabólico mais forte do que o IMC.' },
  waist_to_hip:    { title: 'Razão Cintura/Quadril (RCQ)',  desc: 'Cintura ÷ quadril. Distribuição de gordura central vs. periférica.',                               ref: 'Adequado: <0,85 (♀) / <0,90 (♂)',                                                                               why: 'Gordura abdominal ("maçã") aumenta risco de diabetes e doença cardíaca.' },
  conicity_index:  { title: 'Índice de Conicidade (IC)',    desc: 'Cintura ÷ (0,109 × √(peso/altura)). Quanto maior, mais acumulação central.',                       ref: 'Adequado: <1,18\nRisco elevado: ≥1,18',                                                                          why: 'Mais sensível que RCQ para detectar gordura visceral.' },
  body_fat:        { title: '% Gordura Corporal',           desc: 'Fórmula de Deurenberg (1991): 1,20×IMC + 0,23×idade − 10,8×sexo − 5,4. Erro ±4–6% vs. DEXA.',   ref: 'Homens: Essencial 2–5% · Atlético 6–13% · Normal 14–24% · Obeso >25%\nMulheres: Essencial 10–13% · Atlético 14–20% · Normal 21–31% · Obeso >32%', why: 'Separa massa magra de gordura — permite acompanhar recomposição corporal.' },
  body_water:      { title: 'Água Corporal',                desc: 'Estimada como 72,3% da massa magra (constante hídrica de mamíferos).',                              ref: 'Normal: 45–60% do peso (♀) / 50–65% (♂)',                                                                       why: 'Essencial para todas as funções metabólicas. Desidratação de 2% reduz performance.' },
  ree:             { title: 'Gasto Energético de Repouso',  desc: 'Equação de Cunningham (1980): 500 + 22 × massa magra (kg).',                                        ref: 'Tipicamente 1200–2000 kcal/dia',                                                                                 why: 'Base para calcular necessidade calórica total (multiplicar por fator de atividade).' },
  score:           { title: 'NovaQI Score',                 desc: 'Score 0–100 baseado em 6 indicadores: % gordura, IMM, IMG, RCE, RCQ e índice de conicidade.',      ref: '90–100: Excelente · 75–89: Bom · 60–74: Moderado · <60: Atenção',                                               why: 'Visão global da composição corporal. Útil para acompanhar evolução ao longo do tempo.' },
};

// ── Classification helpers ────────────────────────────────────────────────────
const CLS_LABEL = {
  low_risk: 'Baixo risco', elevated_risk: 'Risco elevado', adequate: 'Adequado',
  low: 'Baixo', underweight: 'Abaixo do peso', normal: 'Eutrofia',
  overweight: 'Excesso', obese: 'Obesidade',
};
const CLS_COLOR = {
  low_risk: '#22C55E', adequate: '#22C55E', normal: '#22C55E',
  elevated_risk: '#EF4444', obese: '#EF4444',
  overweight: '#F59E0B', underweight: '#F59E0B', low: '#F59E0B',
};

function clsL(c) { return CLS_LABEL[c] || '—'; }
function clsC(c) { return CLS_COLOR[c] || Colors.textMuted; }

// ── Gauge (semicircle) ────────────────────────────────────────────────────────
function Gauge({ pct, color, size = 110 }) {
  // Draw a semicircle gauge using nested Views + overflow:hidden
  const r = size / 2;
  const rotation = -180 + (pct / 100) * 180;
  return (
    <View style={{ width: size, height: r + 8, alignItems: 'center' }}>
      {/* Track */}
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: 10, borderColor: Colors.border, position: 'absolute', top: 0 }} />
      {/* Fill — clip top half */}
      <View style={{ width: size, height: r, overflow: 'hidden', position: 'absolute', top: 0 }}>
        <View style={{
          width: size, height: size, borderRadius: r,
          borderWidth: 10, borderColor: color,
          transform: [{ rotate: `${rotation}deg` }],
        }} />
      </View>
      {/* Center number */}
      <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color, fontFamily: BrandFonts.bold || undefined }}>{pct}%</Text>
      </View>
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, min, max, thresholds, color }) {
  // thresholds: [{at: 0.5, color: '#EF4444'}] — marks on the bar
  const clamped = Math.max(min, Math.min(max, value ?? min));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ── Score badge grid ──────────────────────────────────────────────────────────
function ScoreBadges({ cls, sex }) {
  const items = [
    { key: 'body_fat',        label: '% Gordura' },
    { key: 'lean_mass_index', label: 'IMM' },
    { key: 'fat_mass_index',  label: 'IMG' },
    { key: 'waist_to_height', label: 'RCE' },
    { key: 'waist_to_hip',    label: 'RCQ' },
    { key: 'conicity_index',  label: 'IC' },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {items.map(({ key, label }) => {
        const c = cls?.[key];
        const color = clsC(c);
        const isGood = c === 'low_risk' || c === 'adequate' || c === 'normal';
        return (
          <View key={key} style={[sbStyles.badge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
            <View style={[sbStyles.dot, { backgroundColor: color }]} />
            <Text style={[sbStyles.label, { color }]}>{label}</Text>
            <Text style={[sbStyles.sub, { color }]}>{clsL(c)}</Text>
          </View>
        );
      })}
    </View>
  );
}
const sbStyles = StyleSheet.create({
  badge:  { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, minWidth: 68 },
  dot:    { width: 7, height: 7, borderRadius: 4, marginBottom: 3 },
  label:  { fontSize: 10, fontWeight: '800' },
  sub:    { fontSize: 9, fontWeight: '600', opacity: 0.8 },
});

// ── Info modal ────────────────────────────────────────────────────────────────
function InfoModal({ info, onClose }) {
  if (!info) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalCard}>
          <Text style={s.modalTitle}>{info.title}</Text>
          <Text style={s.modalDesc}>{info.desc}</Text>
          <View style={s.modalSection}>
            <Text style={s.modalSectionLabel}>Valores de referência</Text>
            <Text style={s.modalRef}>{info.ref}</Text>
          </View>
          <View style={s.modalSection}>
            <Text style={s.modalSectionLabel}>Porquê importa</Text>
            <Text style={s.modalRef}>{info.why}</Text>
          </View>
          <TouchableOpacity style={s.modalClose} onPress={onClose}>
            <Text style={s.modalCloseText}>Fechar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BodyAnalysisScreen({ navigation }) {
  const { token } = useAuth();
  const { saveBodyProfile, bodyProfile } = useNutrition();

  const derivedAge = useMemo(() => ageFromBirthDate(bodyProfile?.birth_date), [bodyProfile?.birth_date]);

  const [frontUri,   setFrontUri]   = useState(null);
  const [sideUri,    setSideUri]    = useState(null);
  const [heightCm,   setHeightCm]   = useState(bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '');
  const [weightKg,   setWeightKg]   = useState(bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '');
  const [sex,        setSex]        = useState(bodyProfile?.sex || 'female');
  const [age,        setAge]        = useState(derivedAge);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);

  function showInfo(key) { setActiveInfo(INFO[key] || null); }

  async function pickPhoto(side) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permissão necessária', 'Preciso de acesso à galeria.'); return; }
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5 });
    if (!picked.canceled && picked.assets?.[0]) {
      if (side === 'front') setFrontUri(picked.assets[0].uri);
      else setSideUri(picked.assets[0].uri);
    }
  }

  async function uriToBase64(uri) {
    const blob = await (await fetch(uri)).blob();
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function runAnalysis() {
    if (!frontUri || !sideUri) { Alert.alert('Fotos em falta', 'Selecciona a foto frontal e a lateral.'); return; }
    if (!heightCm || !weightKg) { Alert.alert('Dados em falta', 'Preenche altura e peso.'); return; }
    setAnalyzing(true); setResult(null);
    try {
      const [frontB64, sideB64] = await Promise.all([uriToBase64(frontUri), uriToBase64(sideUri)]);
      setResult(await apiBodyAnalyze(token, {
        frontImage: frontB64, sideImage: sideB64,
        heightCm: parseFloat(heightCm), weightKg: parseFloat(weightKg),
        sex, age: age ? parseInt(age, 10) : 0,
      }));
    } catch (e) { Alert.alert('Erro na análise', e.message || 'Tenta novamente.'); }
    finally { setAnalyzing(false); }
  }

  async function saveResults() {
    if (!result) return;
    try { await apiSaveBodyMeasurements(token, { ...result.measurements, ...result.indices, confidence: result.meta?.confidence, warnings: result.meta?.warnings, scale_px_per_cm: result.meta?.scale_px_per_cm }); } catch {}
    Alert.alert('Actualizar perfil?', `Altura: ${heightCm} cm · Peso: ${weightKg} kg`, [
      { text: 'Não', style: 'cancel' },
      { text: 'Actualizar', onPress: async () => {
        try {
          await saveBodyProfile({ height_cm: parseFloat(heightCm), weight_kg: parseFloat(weightKg), sex, birth_date: bodyProfile?.birth_date || null, activity_level: bodyProfile?.activity_level || 'moderate', goal: bodyProfile?.goal || 'maintain' });
          Alert.alert('Perfil actualizado', 'Dados guardados com sucesso.');
        } catch { Alert.alert('Erro', 'Não foi possível guardar.'); }
      }},
    ]);
  }

  const m   = result?.measurements;
  const idx = result?.indices;
  const cls = result?.classification;
  const bc  = result?.body_composition;
  const sc  = result?.score;

  function bfMeta(pct) {
    if (!pct) return null;
    if (sex === 'male') {
      if (pct < 6)  return { label: 'Essencial', color: '#F59E0B', pctOfMax: pct / 35 * 100 };
      if (pct < 14) return { label: 'Atlético',  color: '#22C55E', pctOfMax: pct / 35 * 100 };
      if (pct < 25) return { label: 'Normal',    color: '#22C55E', pctOfMax: pct / 35 * 100 };
      return             { label: 'Obeso',       color: '#EF4444', pctOfMax: Math.min(pct / 35 * 100, 100) };
    }
    if (pct < 14) return { label: 'Essencial', color: '#F59E0B', pctOfMax: pct / 45 * 100 };
    if (pct < 21) return { label: 'Atlético',  color: '#22C55E', pctOfMax: pct / 45 * 100 };
    if (pct < 32) return { label: 'Normal',    color: '#22C55E', pctOfMax: pct / 45 * 100 };
    return             { label: 'Obeso',       color: '#EF4444', pctOfMax: Math.min(pct / 45 * 100, 100) };
  }

  function scoreColor(v) {
    if (!v) return Colors.textMuted;
    if (v >= 90) return '#22C55E'; if (v >= 75) return '#4ADE80';
    if (v >= 60) return '#F59E0B'; return '#EF4444';
  }
  function scoreLabel(v) {
    if (!v) return '—';
    if (v >= 90) return 'Excelente'; if (v >= 75) return 'Bom';
    if (v >= 60) return 'Moderado';  return 'Atenção';
  }

  const bf = bfMeta(bc?.body_fat_pct);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <InfoModal info={activeInfo} onClose={() => setActiveInfo(null)} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Análise corporal</Text>
        <Text style={s.badge}>ADMIN</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Photos */}
        <View style={s.photoRow}>
          {['front','side'].map(side => (
            <TouchableOpacity key={side} style={s.photoPicker} onPress={() => pickPhoto(side)} activeOpacity={0.8}>
              {(side === 'front' ? frontUri : sideUri)
                ? <Image source={{ uri: side === 'front' ? frontUri : sideUri }} style={s.photoPreview} resizeMode="cover" />
                : <Text style={s.photoPlaceholder}>+{'\n'}{side === 'front' ? 'Frente' : 'Lateral'}</Text>}
              <Text style={s.photoLabel}>{side === 'front' ? 'Frente' : 'Lateral'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Demographics */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Dados de calibração</Text>
          <View style={s.inputRow}>
            <Field label="Altura (cm)" value={heightCm} onChange={setHeightCm} kbType="decimal-pad" />
            <Field label="Peso (kg)"   value={weightKg} onChange={setWeightKg} kbType="decimal-pad" />
            <Field label="Idade"       value={age}      onChange={setAge}       kbType="number-pad" />
          </View>
          <View style={s.sexRow}>
            {['female','male'].map(sv => (
              <TouchableOpacity key={sv} style={[s.sexBtn, sex === sv && s.sexBtnOn]} onPress={() => setSex(sv)}>
                <Text style={[s.sexBtnTxt, sex === sv && s.sexBtnTxtOn]}>{sv === 'female' ? '♀ Feminino' : '♂ Masculino'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analyse */}
        <TouchableOpacity style={[s.analyzeBtn, (analyzing || !frontUri || !sideUri) && s.analyzeBtnOff]} onPress={runAnalysis} disabled={analyzing || !frontUri || !sideUri} activeOpacity={0.85}>
          {analyzing
            ? <><ActivityIndicator color="#fff" /><Text style={s.analyzeBtnTxt}> A analisar…</Text></>
            : <Text style={s.analyzeBtnTxt}>Analisar →</Text>}
        </TouchableOpacity>

        {result?.meta?.warnings?.length > 0 && (
          <View style={s.warnBox}><Text style={s.warnTxt}>⚠ {result.meta.warnings.join(' · ')}</Text></View>
        )}

        {result && <>

          {/* Overlays */}
          {result.overlays && (
            <View style={s.overlayRow}>
              {[['front','Frente'],['side','Lateral']].map(([k,l]) => result.overlays[k] ? (
                <View key={k} style={s.overlayWrap}>
                  <Image source={{ uri: `data:image/jpeg;base64,${result.overlays[k]}` }} style={s.overlayImg} resizeMode="contain" />
                  <Text style={s.overlayLabel}>{l}</Text>
                </View>
              ) : null)}
            </View>
          )}

          {/* ── SCORE ── */}
          {sc != null && (
            <View style={s.scoreCard}>
              <View style={s.scoreTop}>
                <View style={s.scoreNumWrap}>
                  <Text style={[s.scoreNum, { color: scoreColor(sc) }]}>{sc}</Text>
                  <Text style={s.scoreSlash}>/100</Text>
                </View>
                <View style={s.scoreInfo}>
                  <Text style={s.scoreTitle}>NovaQI Score</Text>
                  <View style={[s.scorePill, { backgroundColor: scoreColor(sc) + '22' }]}>
                    <Text style={[s.scorePillTxt, { color: scoreColor(sc) }]}>{scoreLabel(sc)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => showInfo('score')} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.infoBtnTxt}>?</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Score bar */}
              <View style={s.scoreBarTrack}>
                <View style={[s.scoreBarFill, { width: `${sc}%`, backgroundColor: scoreColor(sc) }]} />
              </View>
              {/* Badge grid */}
              <ScoreBadges cls={cls} sex={sex} />
            </View>
          )}

          {/* ── COMPOSIÇÃO CORPORAL ── */}
          {bc && (
            <View style={s.card}>
              <Row2 title="Composição corporal" onInfo={() => showInfo('body_fat')} sub="Deurenberg ±4–6%" />

              {/* Gauge + split */}
              <View style={s.bfMain}>
                <View style={s.gaugeWrap}>
                  <Gauge pct={bc.body_fat_pct} color={bf?.color || Colors.primary} size={120} />
                  {bf && (
                    <View style={[s.bfPill, { backgroundColor: bf.color + '20', borderColor: bf.color + '50' }]}>
                      <Text style={[s.bfPillTxt, { color: bf.color }]}>{bf.label}</Text>
                    </View>
                  )}
                  <Text style={s.bfGaugeLabel}>gordura corporal</Text>
                </View>
                <View style={s.bfCards}>
                  <MassCard label="Massa magra" kg={bc.lean_mass_kg} color="#22C55E" />
                  <MassCard label="Massa gorda" kg={bc.fat_mass_kg}  color={bf?.color || '#F59E0B'} />
                </View>
              </View>

              {/* Water + REE */}
              <View style={s.extraRow}>
                <TouchableOpacity style={s.extraItem} onPress={() => showInfo('body_water')}>
                  <Text style={s.extraVal}>{bc.body_water_l} L</Text>
                  <Text style={s.extraLabel}>Água corporal</Text>
                  <Text style={s.extraSub}>{bc.body_water_pct}%  ·  ?</Text>
                </TouchableOpacity>
                <View style={s.extraDiv} />
                <TouchableOpacity style={s.extraItem} onPress={() => showInfo('ree')}>
                  <Text style={s.extraVal}>{bc.ree_kcal} kcal</Text>
                  <Text style={s.extraLabel}>Repouso / dia</Text>
                  <Text style={s.extraSub}>Cunningham  ·  ?</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PERÍMETROS ── */}
          <View style={s.card}>
            <Row2 title="Perímetros" sub="Precisão ±2–4 cm (modelo elíptico)" />
            {[
              ['Braço',       m?.arm_cm,     'arm_cm',     8, 50],
              ['Antebraço',   m?.forearm_cm, 'forearm_cm', 8, 45],
              ['Cintura',     m?.waist_cm,   'waist_cm',   50, 130],
              ['Quadril',     m?.hip_cm,     'hip_cm',     60, 140],
              ['Coxa',        m?.thigh_cm,   'thigh_cm',   30, 90],
              ['Panturrilha', m?.calf_cm,    'calf_cm',    20, 60],
            ].map(([label, val, key, min, max]) => (
              <View key={key}>
                <MetricRow label={label} value={val != null ? `${val} cm` : '—'} onInfo={() => showInfo(key)} />
                {val != null && <ProgressBar value={val} min={min} max={max} color={Colors.primary} />}
              </View>
            ))}
          </View>

          {/* ── ÍNDICES ── */}
          <View style={s.card}>
            <Row2 title="Índices" />
            {[
              { label: 'IMC',                    val: idx?.bmi,             clsKey: 'bmi',             infoKey: 'bmi',             min: 15, max: 40, threshOk: [18.5, 25], higher: false },
              { label: 'IMM (kg/m²)',            val: idx?.lean_mass_index, clsKey: 'lean_mass_index', infoKey: 'lean_mass_index', min: 8,  max: 25, threshOk: [sex==='male'?14.6:11.8, 25], higher: true },
              { label: 'IMG (kg/m²)',            val: idx?.fat_mass_index,  clsKey: 'fat_mass_index',  infoKey: 'fat_mass_index',  min: 0,  max: 18, threshOk: [0, sex==='male'?6:9], higher: false },
              { label: 'Razão cin./estatura',    val: idx?.waist_to_height, clsKey: 'waist_to_height', infoKey: 'waist_to_height', min: 0.3, max: 0.8, threshOk: [0.3, 0.5], higher: false },
              { label: 'Razão cintura/quadril',  val: idx?.waist_to_hip,    clsKey: 'waist_to_hip',    infoKey: 'waist_to_hip',    min: 0.5, max: 1.2, threshOk: [0.5, sex==='male'?0.9:0.85], higher: false },
              { label: 'Índice de conicidade',   val: idx?.conicity_index,  clsKey: 'conicity_index',  infoKey: 'conicity_index',  min: 0.9, max: 1.5, threshOk: [0.9, 1.18], higher: false },
            ].map(({ label, val, clsKey, infoKey, min, max }) => {
              const c = cls?.[clsKey];
              const barColor = clsC(c);
              return (
                <View key={infoKey}>
                  <MetricRow
                    label={label}
                    value={val != null ? String(val) : '—'}
                    tag={clsL(c)}
                    tagColor={clsC(c)}
                    onInfo={() => showInfo(infoKey)}
                  />
                  {val != null && <ProgressBar value={val} min={min} max={max} color={barColor} />}
                </View>
              );
            })}
          </View>

          {/* ── TABELA DE REFERÊNCIAS ── */}
          <View style={s.card}>
            <Row2 title="Referências" />
            {[
              ['IMG',  idx?.fat_mass_index  != null ? `${idx.fat_mass_index} kg/m²`  : '—', sex==='male' ? '<6,0' : '<9,0', 'fat_mass_index'],
              ['IMM',  idx?.lean_mass_index != null ? `${idx.lean_mass_index} kg/m²` : '—', sex==='male' ? '>14,6' : '>11,8', 'lean_mass_index'],
              ['RCE',  idx?.waist_to_height != null ? String(idx.waist_to_height)    : '—', '<0,5',                           'waist_to_height'],
              ['RCQ',  idx?.waist_to_hip    != null ? String(idx.waist_to_hip)       : '—', sex==='male' ? '<0,90' : '<0,85', 'waist_to_hip'],
              ['IC',   idx?.conicity_index  != null ? String(idx.conicity_index)     : '—', '<1,18',                          'conicity_index'],
            ].map(([label, val, ref, key]) => (
              <View key={key} style={s.refRow}>
                <Text style={s.refLabel}>{label}</Text>
                <Text style={s.refRef}>ref. {ref}</Text>
                <Text style={[s.refVal, { color: clsC(cls?.[key]) }]}>{val}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={saveResults} activeOpacity={0.85}>
            <Text style={s.saveBtnTxt}>Guardar resultados</Text>
          </TouchableOpacity>
        </>}

        {/* Disclaimer */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerTitle}>Aviso legal</Text>
          <Text style={s.disclaimerTxt}>
            Os dados gerados por esta análise <Text style={s.disclaimerBold}>não têm poder diagnóstico</Text> e não substituem avaliação clínica. A interpretação final é responsabilidade do profissional de saúde.{'\n\n'}
            <Text style={s.disclaimerBold}>As fotos não são armazenadas pelo NovaQI.</Text> São eliminadas do servidor imediatamente após a análise. A gestão das imagens é responsabilidade exclusiva do utilizador.{'\n\n'}
            Poses, vestuário e qualidade da imagem podem influenciar os resultados. Precisão dos perímetros: ±2–4 cm. Erro % gordura: ±4–6% vs. DEXA.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Row2({ title, sub, onInfo }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={s.cardTitle}>{title}</Text>
        {onInfo && (
          <TouchableOpacity onPress={onInfo} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.infoBtnTxt}>?</Text>
          </TouchableOpacity>
        )}
      </View>
      {sub && <Text style={s.cardSub}>{sub}</Text>}
    </View>
  );
}

function MassCard({ label, kg, color }) {
  return (
    <View style={[s.massCard, { borderLeftColor: color }]}>
      <Text style={[s.massKg, { color }]}>{kg} kg</Text>
      <Text style={s.massLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value, tag, tagColor, onInfo }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {tag && <Text style={[s.clsTag, { color: tagColor }]}>{tag}</Text>}
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowVal}>{value}</Text>
        <TouchableOpacity onPress={onInfo} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.infoBtnTxt}>?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Field({ label, value, onChange, kbType }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldBox}>
        <TextInput style={s.fieldTxt} value={value} onChangeText={onChange} keyboardType={kbType} placeholder="—" placeholderTextColor={Colors.textMuted} />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText:   { fontSize: 22, color: Colors.primary, fontWeight: '800' },
  title:      { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  badge:      { fontSize: 10, fontWeight: '900', color: '#fff', backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  scroll:     { padding: 16, paddingBottom: 56, gap: 16 },

  photoRow:   { flexDirection: 'row', gap: 12 },
  photoPicker:{ flex: 1, aspectRatio: 0.75, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview:{ width: '100%', height: '100%' },
  photoPlaceholder: { fontSize: 28, color: Colors.textMuted, textAlign: 'center', lineHeight: 32 },
  photoLabel: { position: 'absolute', bottom: 6, fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  section:    { backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow:   { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  fieldBox:   { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  fieldTxt:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  sexRow:     { flexDirection: 'row', gap: 8 },
  sexBtn:     { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  sexBtnOn:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sexBtnTxt:  { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  sexBtnTxtOn:{ color: '#fff' },

  analyzeBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  analyzeBtnOff: { opacity: 0.45 },
  analyzeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', fontFamily: BrandFonts.bold || undefined },

  warnBox:    { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F59E0B' },
  warnTxt:    { fontSize: 12, color: '#92400E', fontWeight: '600' },

  overlayRow: { flexDirection: 'row', gap: 10 },
  overlayWrap:{ flex: 1, alignItems: 'center', gap: 4 },
  overlayImg: { width: '100%', aspectRatio: 0.75, borderRadius: 12 },
  overlayLabel:{ fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  // Score
  scoreCard:  { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border },
  scoreTop:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreNumWrap:{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreNum:   { fontSize: 56, fontWeight: '900', fontFamily: BrandFonts.bold || undefined, lineHeight: 60 },
  scoreSlash: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginBottom: 10 },
  scoreInfo:  { flex: 1, gap: 6 },
  scoreTitle: { fontSize: 15, fontWeight: '900', color: Colors.text },
  scorePill:  { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scorePillTxt:{ fontSize: 12, fontWeight: '800' },
  scoreBarTrack:{ height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },

  // Card
  card:       { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  cardSub:    { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // Body fat gauge layout
  bfMain:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gaugeWrap:  { alignItems: 'center', gap: 6 },
  bfPill:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  bfPillTxt:  { fontSize: 11, fontWeight: '800' },
  bfGaugeLabel:{ fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  bfCards:    { flex: 1, gap: 8 },
  massCard:   { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 10, borderLeftWidth: 3 },
  massKg:     { fontSize: 20, fontWeight: '900' },
  massLabel:  { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // Water/REE
  extraRow:   { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  extraItem:  { flex: 1, alignItems: 'center', gap: 2 },
  extraDiv:   { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  extraVal:   { fontSize: 20, fontWeight: '900', color: Colors.text },
  extraLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  extraSub:   { fontSize: 10, color: Colors.textMuted },

  // Rows
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLeft:    { flex: 1, gap: 2 },
  rowLabel:   { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  clsTag:     { fontSize: 10, fontWeight: '700' },
  rowRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowVal:     { fontSize: 14, fontWeight: '800', color: Colors.text },
  infoBtn:    { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  infoBtnTxt: { fontSize: 11, fontWeight: '900', color: Colors.textMuted },

  // Reference table
  refRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  refLabel:   { flex: 1, fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  refRef:     { fontSize: 11, color: Colors.textMuted, marginRight: 10 },
  refVal:     { fontSize: 13, fontWeight: '800', minWidth: 60, textAlign: 'right' },

  saveBtn:    { backgroundColor: '#22C55E', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:  { backgroundColor: Colors.card, borderRadius: 20, padding: 20, width: '100%', gap: 12, elevation: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  modalDesc:  { fontSize: 13, color: Colors.textLight, lineHeight: 19 },
  modalSection:{ gap: 4 },
  modalSectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalRef:   { fontSize: 13, color: Colors.text, fontWeight: '600', lineHeight: 19 },
  modalClose: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Disclaimer
  disclaimerBox:   { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  disclaimerTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  disclaimerTxt:   { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  disclaimerBold:  { fontWeight: '800', color: Colors.textLight },
});
