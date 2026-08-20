import React, { useState } from 'react';
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

// ── Info content ─────────────────────────────────────────────────────────────
const INFO = {
  arm_cm: {
    title: 'Perímetro do braço',
    desc: 'Circunferência do braço médio, entre ombro e cotovelo.',
    ref: 'Homens: 28–38 cm\nMulheres: 25–33 cm',
    why: 'Indicador de massa muscular dos membros superiores. Útil para monitorizar ganhos/perdas ao longo do tempo.',
  },
  forearm_cm: {
    title: 'Perímetro do antebraço',
    desc: 'Circunferência do antebraço entre cotovelo e pulso.',
    ref: 'Homens: 24–32 cm\nMulheres: 20–26 cm',
    why: 'Complementar ao braço. Reflete força de preensão e massa muscular periférica.',
  },
  waist_cm: {
    title: 'Perímetro da cintura',
    desc: 'Circunferência na zona mais estreita do tronco, acima do umbigo.',
    ref: 'Risco elevado: >94 cm (♂) / >80 cm (♀)\nRisco muito elevado: >102 cm (♂) / >88 cm (♀)',
    why: 'Melhor indicador simples de gordura visceral — o tipo mais associado a risco cardiovascular e metabólico.',
  },
  hip_cm: {
    title: 'Perímetro do quadril',
    desc: 'Circunferência na zona mais larga das ancas/glúteos.',
    ref: 'Varia com estatura; tipicamente 90–105 cm',
    why: 'Usado com a cintura para calcular RCQ. Quadril maior indica gordura subcutânea (menos nociva que visceral).',
  },
  thigh_cm: {
    title: 'Perímetro da coxa',
    desc: 'Circunferência da coxa no terço superior, abaixo da virilha.',
    ref: 'Homens: 50–65 cm\nMulheres: 52–65 cm',
    why: 'Coxa maior está associada a menor risco cardiovascular. Reflete massa muscular dos membros inferiores.',
  },
  calf_cm: {
    title: 'Perímetro da panturrilha',
    desc: 'Circunferência da zona mais larga da barriga da perna.',
    ref: 'Homens: 33–42 cm\nMulheres: 31–41 cm\n\n<31 cm em idosos: critério de sarcopenia',
    why: 'Proxy de massa muscular periférica e estado nutricional. Também reflete retenção de líquidos.',
  },
  bmi: {
    title: 'IMC — Índice de Massa Corporal',
    desc: 'Peso (kg) ÷ altura² (m²). Triagem rápida de peso relativo à altura.',
    ref: 'Abaixo do peso: <18,5\nNormal (Eutrofia): 18,5–24,9\nExcesso de peso: 25–29,9\nObesidade: ≥30',
    why: 'Prático e amplamente usado, mas não distingue músculo de gordura. Um atleta muscular pode ter IMC "elevado". Use em conjunto com IMM, IMG e % gordura.',
  },
  lean_mass_index: {
    title: 'Índice de Massa Magra (IMM)',
    desc: 'Massa magra (kg) ÷ altura² (m²). Avalia a quantidade de músculo, osso e órgãos em relação à altura.',
    ref: 'Adequado: ≥14,6 kg/m² (♂) / ≥11,8 kg/m² (♀)\nBaixo: abaixo desses valores',
    why: 'Valores adequados de IMM estão associados a menor risco de diabetes, hipertensão e melhor desempenho físico. Complementa o IMC ao separar massa muscular de gordura.',
  },
  fat_mass_index: {
    title: 'Índice de Massa Gorda (IMG)',
    desc: 'Massa gorda (kg) ÷ altura² (m²). Avalia a quantidade de gordura em relação à altura.',
    ref: 'Adequado: <6,0 kg/m² (♂) / <9,0 kg/m² (♀)\nRisco elevado: acima desses valores',
    why: 'Quanto maior o IMG, maior o risco de obesidade, doenças cardiovasculares e diabetes. Mais sensível que o IMC para detectar excesso de gordura em pessoas de estatura baixa.',
  },
  waist_to_height: {
    title: 'Razão Cintura/Estatura (RCE)',
    desc: 'Cintura (cm) ÷ estatura (cm). Independente do sexo e da estatura.',
    ref: 'Baixo risco: <0,5\nRisco elevado: ≥0,5\n\n"Mantém a cintura abaixo de metade da estatura."',
    why: 'Preditor de risco cardiometabólico mais forte do que o IMC. Estudo de 300k pessoas: RCE >0,5 associado a +45% risco cardiovascular.',
  },
  waist_to_hip: {
    title: 'Razão Cintura/Quadril (RCQ)',
    desc: 'Cintura ÷ quadril. Mede distribuição de gordura (central "maçã" vs. periférica "pera").',
    ref: 'Adequado: <0,85 (♀) / <0,90 (♂)\nRisco elevado: ≥esses valores',
    why: 'Gordura abdominal ("maçã") aumenta risco de diabetes tipo 2, doença cardíaca e hipertensão. Gordura periférica ("pera") é relativamente protetora.',
  },
  conicity_index: {
    title: 'Índice de Conicidade (IC)',
    desc: 'Fórmula: cintura ÷ (0,109 × √(peso/altura)). Quanto maior, mais o tronco se assemelha a um cone — acumulação central de gordura.',
    ref: 'Adequado: <1,18\nRisco elevado: ≥1,18',
    why: 'Mais sensível que RCQ para detectar gordura visceral. Independente do sexo. Usado para rastrear síndrome metabólica e risco cardiovascular.',
  },
  body_fat: {
    title: '% de Gordura Corporal',
    desc: 'Estimada pela fórmula de Deurenberg (1991):\n1,20×IMC + 0,23×idade − 10,8×sexo − 5,4\n\nErro médio ±4–6% vs. DEXA.',
    ref: 'Homens:\n  Essencial: 2–5%  |  Atlético: 6–13%\n  Normal: 14–24%  |  Obeso: >25%\n\nMulheres:\n  Essencial: 10–13%  |  Atlético: 14–20%\n  Normal: 21–31%  |  Obeso: >32%',
    why: 'Mais informativa que o IMC porque separa massa magra de gordura. Permite acompanhar recomposição corporal mesmo quando o peso não muda.',
  },
  body_water: {
    title: 'Água Corporal',
    desc: 'Estimada como 72,3% da massa magra (constante hídrica de mamíferos).',
    ref: 'Normal: 45–60% do peso corporal (♀)\nNormal: 50–65% do peso corporal (♂)',
    why: 'A água corporal total é essencial para todas as funções metabólicas. Desidratação de apenas 2% reduz performance cognitiva e física.',
  },
  ree: {
    title: 'Gasto Energético de Repouso (GER)',
    desc: 'Estimado pela equação de Cunningham (1980): 500 + 22 × massa magra (kg).',
    ref: 'Variável: tipicamente 1200–2000 kcal/dia\nDepende da massa magra individual',
    why: 'É a energia que o corpo gasta em repouso para manter funções vitais (respiração, circulação, temperatura). Base para calcular necessidade calórica total (multiplicar por fator de atividade).',
  },
  score: {
    title: 'NovaQI Score',
    desc: 'Score composto de 0–100 baseado em 6 indicadores: % gordura, IMM, IMG, RCE, RCQ e índice de conicidade.',
    ref: '90–100: Excelente\n75–89: Bom\n60–74: Moderado\n<60: Atenção',
    why: 'Dá uma visão global e simplificada da composição corporal. Útil para acompanhar evolução ao longo do tempo sem precisar interpretar cada indicador individualmente.',
  },
};

function InfoModal({ info, onClose }) {
  if (!info) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
          <Text style={styles.modalTitle}>{info.title}</Text>
          <Text style={styles.modalDesc}>{info.desc}</Text>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Valores de referência</Text>
            <Text style={styles.modalRef}>{info.ref}</Text>
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionLabel}>Porquê importa</Text>
            <Text style={styles.modalRef}>{info.why}</Text>
          </View>
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Text style={styles.modalCloseText}>Fechar</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

export default function BodyAnalysisScreen({ navigation }) {
  const { token } = useAuth();
  const { saveBodyProfile, bodyProfile } = useNutrition();

  const [frontUri, setFrontUri]     = useState(null);
  const [sideUri,  setSideUri]      = useState(null);
  const [heightCm, setHeightCm]     = useState(bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '');
  const [weightKg, setWeightKg]     = useState(bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '');
  const [sex,      setSex]          = useState(bodyProfile?.sex || 'female');
  const [age,      setAge]          = useState('');
  const [analyzing, setAnalyzing]   = useState(false);
  const [result,    setResult]      = useState(null);
  const [activeInfo, setActiveInfo] = useState(null);

  function showInfo(key) { setActiveInfo(INFO[key] || null); }

  async function pickPhoto(side) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Preciso de acesso à galeria para seleccionar fotos.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: false,
    });
    if (!picked.canceled && picked.assets?.[0]) {
      if (side === 'front') setFrontUri(picked.assets[0].uri);
      else setSideUri(picked.assets[0].uri);
    }
  }

  async function uriToBase64(uri) {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function runAnalysis() {
    if (!frontUri || !sideUri) { Alert.alert('Fotos em falta', 'Selecciona a foto frontal e a lateral.'); return; }
    if (!heightCm || !weightKg) { Alert.alert('Dados em falta', 'Preenche altura e peso.'); return; }
    setAnalyzing(true);
    setResult(null);
    try {
      const [frontB64, sideB64] = await Promise.all([uriToBase64(frontUri), uriToBase64(sideUri)]);
      const data = await apiBodyAnalyze(token, {
        frontImage: frontB64,
        sideImage:  sideB64,
        heightCm:   parseFloat(heightCm),
        weightKg:   parseFloat(weightKg),
        sex,
        age: age ? parseInt(age, 10) : 0,
      });
      setResult(data);
    } catch (e) {
      Alert.alert('Erro na análise', e.message || 'Tenta novamente.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function saveResults() {
    if (!result) return;
    try {
      await apiSaveBodyMeasurements(token, {
        ...result.measurements,
        ...result.indices,
        confidence:      result.meta?.confidence,
        warnings:        result.meta?.warnings,
        scale_px_per_cm: result.meta?.scale_px_per_cm,
      });
    } catch { /* non-fatal */ }

    Alert.alert(
      'Actualizar perfil?',
      `Substituir os dados do teu perfil?\n\nAltura: ${heightCm} cm\nPeso: ${weightKg} kg`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, actualizar',
          onPress: async () => {
            try {
              const birthYear = bodyProfile?.birth_date?.slice(0, 4) || null;
              await saveBodyProfile({
                height_cm:      parseFloat(heightCm),
                weight_kg:      parseFloat(weightKg),
                sex,
                birth_date:     birthYear ? `${birthYear}-01-01` : bodyProfile?.birth_date || null,
                activity_level: bodyProfile?.activity_level || 'moderate',
                goal:           bodyProfile?.goal || 'maintain',
              });
              Alert.alert('Perfil actualizado', 'Os dados foram guardados com sucesso.');
            } catch { Alert.alert('Erro', 'Não foi possível guardar o perfil.'); }
          },
        },
      ]
    );
  }

  const m   = result?.measurements;
  const idx = result?.indices;
  const cls = result?.classification;
  const bc  = result?.body_composition;
  const sc  = result?.score;

  const CLS_LABEL = {
    low_risk: 'Baixo risco',   elevated_risk: 'Risco elevado',
    adequate: 'Adequado',      low: 'Baixo',
    underweight: 'Abaixo do peso', normal: 'Eutrofia',
    overweight: 'Excesso de peso', obese: 'Obesidade',
  };
  const CLS_COLOR = {
    low_risk: Colors.safe,   adequate: Colors.safe,   normal: Colors.safe,
    elevated_risk: Colors.danger, obese: Colors.danger,
    overweight: '#F59E0B',   underweight: '#F59E0B',   low: '#F59E0B',
  };

  function clsLabel(key) { return CLS_LABEL[cls?.[key]] || '—'; }
  function clsColor(key) { return CLS_COLOR[cls?.[key]] || Colors.textMuted; }

  function bfCategory(pct) {
    if (!pct) return null;
    if (sex === 'male') {
      if (pct < 6)  return { label: 'Essencial',  color: '#F59E0B' };
      if (pct < 14) return { label: 'Atlético',   color: Colors.safe };
      if (pct < 25) return { label: 'Normal',     color: Colors.safe };
      return             { label: 'Obeso',        color: Colors.danger };
    } else {
      if (pct < 14) return { label: 'Essencial',  color: '#F59E0B' };
      if (pct < 21) return { label: 'Atlético',   color: Colors.safe };
      if (pct < 32) return { label: 'Normal',     color: Colors.safe };
      return             { label: 'Obeso',        color: Colors.danger };
    }
  }

  function scoreColor(s) {
    if (!s) return Colors.textMuted;
    if (s >= 90) return Colors.safe;
    if (s >= 75) return '#22C55E';
    if (s >= 60) return '#F59E0B';
    return Colors.danger;
  }
  function scoreLabel(s) {
    if (!s) return '—';
    if (s >= 90) return 'Excelente';
    if (s >= 75) return 'Bom';
    if (s >= 60) return 'Moderado';
    return 'Atenção';
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <InfoModal info={activeInfo} onClose={() => setActiveInfo(null)} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Análise corporal</Text>
        <Text style={styles.badge}>ADMIN</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Photo pickers */}
        <View style={styles.photoRow}>
          <PhotoPicker label="Frente" uri={frontUri} onPress={() => pickPhoto('front')} />
          <PhotoPicker label="Lateral" uri={sideUri}  onPress={() => pickPhoto('side')} />
        </View>

        {/* Demographics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Dados para calibração</Text>
          <View style={styles.inputRow}>
            <Field label="Altura (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
            <Field label="Peso (kg)"   value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" />
            <Field label="Idade"       value={age}      onChangeText={setAge}       keyboardType="number-pad" />
          </View>
          <View style={styles.sexRow}>
            {['female', 'male'].map(s => (
              <TouchableOpacity key={s} style={[styles.sexBtn, sex === s && styles.sexBtnActive]} onPress={() => setSex(s)}>
                <Text style={[styles.sexBtnText, sex === s && styles.sexBtnTextActive]}>
                  {s === 'female' ? '♀ Feminino' : '♂ Masculino'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analyse button */}
        <TouchableOpacity
          style={[styles.analyzeBtn, (analyzing || !frontUri || !sideUri) && styles.analyzeBtnDisabled]}
          onPress={runAnalysis}
          disabled={analyzing || !frontUri || !sideUri}
          activeOpacity={0.85}
        >
          {analyzing
            ? <><ActivityIndicator color="#fff" /><Text style={styles.analyzeBtnText}> A analisar…</Text></>
            : <Text style={styles.analyzeBtnText}>Analisar →</Text>}
        </TouchableOpacity>

        {result?.meta?.warnings?.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠ {result.meta.warnings.join(' · ')}</Text>
          </View>
        )}

        {result && (
          <>
            {/* Overlays */}
            {result.overlays && (
              <View style={styles.overlayRow}>
                <OverlayImage b64={result.overlays.front} label="Frente" />
                <OverlayImage b64={result.overlays.side}  label="Lateral" />
              </View>
            )}

            {/* Score */}
            {sc != null && (
              <TouchableOpacity style={styles.scoreCard} onPress={() => showInfo('score')} activeOpacity={0.85}>
                <View style={styles.scoreLeft}>
                  <Text style={[styles.scoreNum, { color: scoreColor(sc) }]}>{sc}</Text>
                  <Text style={styles.scoreMax}>/100</Text>
                </View>
                <View style={styles.scoreRight}>
                  <Text style={styles.scoreTitle}>NovaQI Score</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: scoreColor(sc) + '22' }]}>
                    <Text style={[styles.scoreBadgeText, { color: scoreColor(sc) }]}>{scoreLabel(sc)}</Text>
                  </View>
                  <Text style={styles.scoreDesc}>Baseado em 6 indicadores de composição corporal</Text>
                </View>
                <Text style={styles.scoreInfo}>?</Text>
              </TouchableOpacity>
            )}

            {/* Body composition */}
            {bc && (
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.cardTitle}>Composição corporal</Text>
                  <TouchableOpacity onPress={() => showInfo('body_fat')} style={styles.infoBtn}>
                    <Text style={styles.infoBtnText}>?</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardSub}>Estimativa Deurenberg ±4–6%</Text>

                {/* Fat % prominent */}
                <View style={styles.bfRow}>
                  <View style={styles.bfMain}>
                    <Text style={[styles.bfPct, { color: bfCategory(bc.body_fat_pct)?.color || Colors.text }]}>
                      {bc.body_fat_pct}%
                    </Text>
                    <Text style={styles.bfLabel}>gordura</Text>
                    {bfCategory(bc.body_fat_pct) && (
                      <View style={[styles.bfCatBadge, { backgroundColor: bfCategory(bc.body_fat_pct).color + '22' }]}>
                        <Text style={[styles.bfCatText, { color: bfCategory(bc.body_fat_pct).color }]}>
                          {bfCategory(bc.body_fat_pct).label}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.bfSplit}>
                    <View style={styles.bfSplitItem}>
                      <Text style={styles.bfSplitVal}>{bc.fat_mass_kg} kg</Text>
                      <Text style={styles.bfSplitLabel}>massa gorda</Text>
                    </View>
                    <View style={styles.bfSplitItem}>
                      <Text style={styles.bfSplitVal}>{bc.lean_mass_kg} kg</Text>
                      <Text style={styles.bfSplitLabel}>massa magra</Text>
                    </View>
                  </View>
                </View>

                {/* Water + REE row */}
                <View style={styles.extraRow}>
                  <TouchableOpacity style={styles.extraItem} onPress={() => showInfo('body_water')}>
                    <Text style={styles.extraVal}>{bc.body_water_l} L</Text>
                    <Text style={styles.extraLabel}>água corporal</Text>
                    <Text style={styles.extraSub}>{bc.body_water_pct}%  ·  ?</Text>
                  </TouchableOpacity>
                  <View style={styles.extraDivider} />
                  <TouchableOpacity style={styles.extraItem} onPress={() => showInfo('ree')}>
                    <Text style={styles.extraVal}>{bc.ree_kcal}</Text>
                    <Text style={styles.extraLabel}>kcal/dia repouso</Text>
                    <Text style={styles.extraSub}>Cunningham  ·  ?</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Perímetros */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perímetros</Text>
              <Text style={styles.cardSub}>Precisão ±2–4 cm (modelo elíptico)</Text>
              {[
                ['Braço',       m?.arm_cm,     'arm_cm'],
                ['Antebraço',   m?.forearm_cm, 'forearm_cm'],
                ['Cintura',     m?.waist_cm,   'waist_cm'],
                ['Quadril',     m?.hip_cm,     'hip_cm'],
                ['Coxa',        m?.thigh_cm,   'thigh_cm'],
                ['Panturrilha', m?.calf_cm,    'calf_cm'],
              ].map(([label, val, key]) => (
                <MetricRow key={key} label={label} value={val != null ? `${val} cm` : '—'} onInfo={() => showInfo(key)} />
              ))}
            </View>

            {/* Índices */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Índices</Text>
              {[
                ['IMC',                    idx?.bmi,             'bmi',             'bmi'],
                ['Índ. massa magra (IMM)', idx?.lean_mass_index, 'lean_mass_index', 'lean_mass_index'],
                ['Índ. massa gorda (IMG)', idx?.fat_mass_index,  'fat_mass_index',  'fat_mass_index'],
                ['Razão cintura/estatura', idx?.waist_to_height, 'waist_to_height', 'waist_to_height'],
                ['Razão cintura/quadril',  idx?.waist_to_hip,    'waist_to_hip',    'waist_to_hip'],
                ['Índice de conicidade',   idx?.conicity_index,  'conicity_index',  'conicity_index'],
              ].map(([label, val, clsKey, infoKey]) => (
                <MetricRow
                  key={infoKey}
                  label={label}
                  value={val != null ? String(val) : '—'}
                  tag={clsKey ? clsLabel(clsKey) : null}
                  tagColor={clsKey ? clsColor(clsKey) : null}
                  onInfo={() => showInfo(infoKey)}
                />
              ))}
            </View>

            {/* Referências rápidas (como Shaped) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Referências</Text>
              {[
                ['Índ. massa gorda',  idx?.fat_mass_index  != null ? `${idx.fat_mass_index} kg/m²`  : '—', sex === 'male' ? '<6,0 kg/m²' : '<9,0 kg/m²', 'fat_mass_index'],
                ['Índ. massa magra',  idx?.lean_mass_index != null ? `${idx.lean_mass_index} kg/m²` : '—', sex === 'male' ? '>14,6 kg/m²' : '>11,8 kg/m²', 'lean_mass_index'],
                ['Razão cin./estatura', idx?.waist_to_height != null ? String(idx.waist_to_height) : '—', '<0,5', 'waist_to_height'],
                ['Razão cintura/quadril', idx?.waist_to_hip != null ? String(idx.waist_to_hip) : '—', sex === 'male' ? '<0,90' : '<0,85', 'waist_to_hip'],
                ['Índ. conicidade',   idx?.conicity_index  != null ? String(idx.conicity_index)  : '—', '<1,18', 'conicity_index'],
              ].map(([label, val, ref, key]) => (
                <View key={key} style={styles.refRow}>
                  <Text style={styles.refLabel}>{label}</Text>
                  <Text style={styles.refRef}>{ref}</Text>
                  <Text style={[styles.refVal, { color: clsColor(key) }]}>{val}</Text>
                </View>
              ))}
            </View>

            {/* Save */}
            <TouchableOpacity style={styles.saveBtn} onPress={saveResults} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Guardar resultados</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>Aviso legal</Text>
          <Text style={styles.disclaimerText}>
            Os dados gerados por esta análise <Text style={styles.disclaimerBold}>não têm poder diagnóstico</Text> e não substituem avaliação clínica. A interpretação final é da responsabilidade do profissional de saúde.{'\n\n'}
            <Text style={styles.disclaimerBold}>As fotos não são armazenadas pelo NovaQI.</Text> São processadas localmente e no servidor apenas durante a análise e eliminadas de imediato. A gestão e armazenamento das imagens é da responsabilidade exclusiva do utilizador.{'\n\n'}
            Poses, vestuário e qualidade da imagem podem influenciar os resultados. Precisão dos perímetros: ±2–4 cm (modelo elíptico). Erro da % gordura: ±4–6% vs. DEXA.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricRow({ label, value, tag, tagColor, onInfo }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowLabel}>{label}</Text>
        {tag && <Text style={[styles.clsTag, { color: tagColor }]}>{tag}</Text>}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value}</Text>
        <TouchableOpacity onPress={onInfo} style={styles.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.infoBtnText}>?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PhotoPicker({ label, uri, onPress }) {
  return (
    <TouchableOpacity style={styles.photoPicker} onPress={onPress} activeOpacity={0.8}>
      {uri
        ? <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
        : <Text style={styles.photoPlaceholder}>+{'\n'}{label}</Text>}
      <Text style={styles.photoLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, keyboardType }) {
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInput}>
        <TextInput
          style={styles.fieldInputText}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          placeholder="—"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
    </View>
  );
}

function OverlayImage({ b64, label }) {
  if (!b64) return null;
  return (
    <View style={styles.overlayWrap}>
      <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} style={styles.overlayImg} resizeMode="contain" />
      <Text style={styles.overlayLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText:    { fontSize: 22, color: Colors.primary, fontWeight: '800' },
  title:       { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  badge:       { fontSize: 10, fontWeight: '900', color: Colors.white, backgroundColor: Colors.danger, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  scroll:      { padding: 16, paddingBottom: 48, gap: 16 },

  photoRow:    { flexDirection: 'row', gap: 12 },
  photoPicker: { flex: 1, aspectRatio: 0.75, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview:{ width: '100%', height: '100%' },
  photoPlaceholder: { fontSize: 28, color: Colors.textMuted, textAlign: 'center', lineHeight: 32 },
  photoLabel:  { position: 'absolute', bottom: 6, fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  section:     { backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  sectionLabel:{ fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow:    { flexDirection: 'row', gap: 8 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  fieldInput:  { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  fieldInputText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  sexRow:      { flexDirection: 'row', gap: 8 },
  sexBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  sexBtnActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  sexBtnText:  { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  sexBtnTextActive: { color: Colors.white },

  analyzeBtn:  { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  analyzeBtnDisabled: { opacity: 0.45 },
  analyzeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '900', fontFamily: BrandFonts.bold || undefined },

  warningBox:  { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F59E0B' },
  warningText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  overlayRow:  { flexDirection: 'row', gap: 10 },
  overlayWrap: { flex: 1, alignItems: 'center', gap: 4 },
  overlayImg:  { width: '100%', aspectRatio: 0.75, borderRadius: 12 },
  overlayLabel:{ fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  // Score card
  scoreCard:   { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreLeft:   { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreNum:    { fontSize: 52, fontWeight: '900', fontFamily: BrandFonts.bold || undefined, lineHeight: 56 },
  scoreMax:    { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginBottom: 8 },
  scoreRight:  { flex: 1, gap: 4 },
  scoreTitle:  { fontSize: 14, fontWeight: '900', color: Colors.text },
  scoreBadge:  { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 11, fontWeight: '800' },
  scoreDesc:   { fontSize: 10, color: Colors.textMuted, fontWeight: '500', lineHeight: 14 },
  scoreInfo:   { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, textAlign: 'center', lineHeight: 21, fontSize: 11, fontWeight: '900', color: Colors.textMuted },

  // Cards
  card:        { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:   { flex: 1, fontSize: 15, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  cardSub:     { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: -6 },

  // Body fat
  bfRow:       { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 4 },
  bfMain:      { alignItems: 'center', gap: 2 },
  bfPct:       { fontSize: 42, fontWeight: '900', fontFamily: BrandFonts.bold || undefined },
  bfLabel:     { fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  bfCatBadge:  { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
  bfCatText:   { fontSize: 11, fontWeight: '800' },
  bfSplit:     { flex: 1, gap: 10 },
  bfSplitItem: { gap: 1 },
  bfSplitVal:  { fontSize: 18, fontWeight: '900', color: Colors.text },
  bfSplitLabel:{ fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // Water + REE
  extraRow:    { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, gap: 0 },
  extraItem:   { flex: 1, alignItems: 'center', gap: 2 },
  extraDivider:{ width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  extraVal:    { fontSize: 20, fontWeight: '900', color: Colors.text },
  extraLabel:  { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  extraSub:    { fontSize: 10, color: Colors.textMuted },

  // Metric rows
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLeft:     { flex: 1, gap: 2 },
  rowLabel:    { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  clsTag:      { fontSize: 10, fontWeight: '700' },
  rowRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue:    { fontSize: 14, fontWeight: '800', color: Colors.text },
  infoBtn:     { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  infoBtnText: { fontSize: 11, fontWeight: '900', color: Colors.textMuted },

  // Reference table
  refRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  refLabel:    { flex: 1, fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  refRef:      { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginRight: 10 },
  refVal:      { fontSize: 13, fontWeight: '800', minWidth: 55, textAlign: 'right' },

  saveBtn:     { backgroundColor: Colors.safe, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '900' },

  // Info modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:    { backgroundColor: Colors.card, borderRadius: 20, padding: 20, width: '100%', gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  modalTitle:   { fontSize: 16, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  modalDesc:    { fontSize: 13, color: Colors.textLight, fontWeight: '500', lineHeight: 19 },
  modalSection: { gap: 4 },
  modalSectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalRef:     { fontSize: 13, color: Colors.text, fontWeight: '600', lineHeight: 19 },
  modalClose:   { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: Colors.white, fontSize: 14, fontWeight: '800' },

  disclaimerBox:   { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6, marginTop: 4 },
  disclaimerTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  disclaimerText:  { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  disclaimerBold:  { fontWeight: '800', color: Colors.textLight },
});
