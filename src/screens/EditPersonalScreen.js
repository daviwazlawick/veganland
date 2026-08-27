import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t, localeFor } from '../i18n';
import { Colors } from '../constants/colors';
import ImportPlanButton from '../components/ImportPlanButton';
import Brand from '../brand';

const SEXES = ['male', 'female', 'other'];
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS = ['lose', 'maintain', 'gain'];
const IS_NOVAQI = Brand.id === 'novaqi';

const MEASURE_FIELDS = [
  { key: 'waist_cm',     i18n: 'measurements.waist',    placeholder: '80' },
  { key: 'hips_cm',      i18n: 'measurements.hips',     placeholder: '95' },
  { key: 'chest_cm',     i18n: 'measurements.chest',    placeholder: '100' },
  { key: 'arm_cm',       i18n: 'measurements.arm',      placeholder: '35' },
  { key: 'forearm_cm',   i18n: 'measurements.forearm',  placeholder: '28' },
  { key: 'thigh_cm',     i18n: 'measurements.thigh',    placeholder: '55' },
  { key: 'calf_cm',      i18n: 'measurements.calf',     placeholder: '37' },
  { key: 'neck_cm',      i18n: 'measurements.neck',     placeholder: '38' },
  { key: 'body_fat_pct', i18n: 'measurements.body_fat', placeholder: '18' },
];

function _baScore(score) {
  if (score >= 80) return { color: '#22C55E', label: 'Excelente' };
  if (score >= 60) return { color: '#84CC16', label: 'Bom' };
  if (score >= 40) return { color: '#F97316', label: 'Moderado' };
  return { color: '#EF4444', label: 'Atenção' };
}
function _baFmt(key, val) {
  if (val == null) return '—';
  if (key === 'ree_kcal') return String(Math.round(val));
  if (['waist_to_height','waist_to_hip','conicity_index'].includes(key)) return Number(val).toFixed(2);
  return Number(val).toFixed(1);
}
function _baCls(key, val, sex) {
  if (val == null) return null;
  const v = Number(val);
  if (key === 'waist_to_height') return v < 0.5 ? { color: '#22C55E', label: 'Baixo risco' } : { color: '#EF4444', label: 'Risco elevado' };
  if (key === 'waist_to_hip') { const th = sex === 'male' ? 0.90 : 0.85; return v < th ? { color: '#22C55E', label: 'Adequado' } : { color: '#EF4444', label: 'Risco elevado' }; }
  if (key === 'conicity_index') return v < 1.18 ? { color: '#22C55E', label: 'Adequado' } : { color: '#EF4444', label: 'Risco elevado' };
  if (key === 'bmi') {
    if (v < 18.5) return { color: '#3B82F6', label: 'Abaixo do peso' };
    if (v < 25.0) return { color: '#22C55E', label: 'Normal' };
    if (v < 30.0) return { color: '#F97316', label: 'Sobrepeso' };
    return { color: '#EF4444', label: 'Obesidade' };
  }
  if (key === 'lean_mass_index') {
    const [lo, hi] = sex === 'male' ? [17, 22] : [14, 18];
    if (v < lo) return { color: '#F97316', label: 'Abaixo' };
    if (v <= hi) return { color: '#22C55E', label: 'Normal' };
    return { color: '#3B82F6', label: 'Elevado' };
  }
  if (key === 'fat_mass_index') {
    if (sex === 'male') {
      if (v < 2) return { color: '#3B82F6', label: 'Essencial' };
      if (v < 5) return { color: '#22C55E', label: 'Baixo' };
      if (v < 8) return { color: '#84CC16', label: 'Normal' };
      return { color: '#EF4444', label: 'Elevado' };
    } else {
      if (v < 3) return { color: '#3B82F6', label: 'Essencial' };
      if (v < 7) return { color: '#22C55E', label: 'Baixo' };
      if (v < 12) return { color: '#84CC16', label: 'Normal' };
      return { color: '#EF4444', label: 'Elevado' };
    }
  }
  if (key === 'body_fat_pct') {
    if (sex === 'male') {
      if (v < 6)  return { color: '#3B82F6', label: 'Essencial' };
      if (v < 14) return { color: '#22C55E', label: 'Atleta' };
      if (v < 18) return { color: '#84CC16', label: 'Fitness' };
      if (v < 25) return { color: '#F97316', label: 'Aceitável' };
      return { color: '#EF4444', label: 'Obeso' };
    } else {
      if (v < 14) return { color: '#3B82F6', label: 'Essencial' };
      if (v < 21) return { color: '#22C55E', label: 'Atleta' };
      if (v < 25) return { color: '#84CC16', label: 'Fitness' };
      if (v < 32) return { color: '#F97316', label: 'Aceitável' };
      return { color: '#EF4444', label: 'Obeso' };
    }
  }
  return null;
}

function formatDate(iso, language) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditPersonalScreen({ navigation }) {
  const { language, token, profile, saveProfile } = useApp();
  const { bodyProfile, saveBodyProfile, measurementsHistory, logMeasurements, goals, saveGoals, bodyMeasurements } = useNutrition();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUri, setPhotoUri] = useState(profile?.photoUri || null);

  const [sex, setSex]             = useState(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight]       = useState('');
  const [weight, setWeight]       = useState('');
  const [activity, setActivity]   = useState('moderate');
  const [goal, setGoal]           = useState('maintain');

  const [measures, setMeasures] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  const GOAL_FIELDS = [
    { key: 'calories_kcal', unit: 'kcal', i18n: 'nutrition.calories' },
    { key: 'protein_g',     unit: 'g',    i18n: 'nutrition.protein' },
    { key: 'fat_g',         unit: 'g',    i18n: 'nutrition.fat' },
    { key: 'carbs_g',       unit: 'g',    i18n: 'nutrition.carbs' },
    { key: 'fiber_g',       unit: 'g',    i18n: 'nutrition.fiber' },
    { key: 'sugar_g',       unit: 'g',    i18n: 'nutrition.sugar' },
    { key: 'salt_g',        unit: 'g',    i18n: 'nutrition.salt' },
    { key: 'water_ml',      unit: 'ml',   i18n: 'nutrition.water' },
    { key: 'bmr',           unit: 'kcal', i18n: 'nutrition.bmr_label' },
    { key: 'tdee',          unit: 'kcal', i18n: 'nutrition.tdee_label' },
  ];
  const [goalValues, setGoalValues] = useState({});

  const bmrInfo = useMemo(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (!w || !h || !birthDate) return null;
    const age = Math.max(10, Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 24 * 3600 * 1000)));
    const bmr = Math.round(10 * w + 6.25 * h - 5 * age + (sex === 'male' ? 5 : -161));
    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    const tdee = Math.round(bmr * (mult[activity] || 1.375));
    return { bmr, tdee };
  }, [weight, height, birthDate, sex, activity]);

  const latest = measurementsHistory[0] || null;

  useEffect(() => {
    if (bodyProfile) {
      if (bodyProfile.sex) setSex(bodyProfile.sex);
      if (bodyProfile.birth_date) setBirthDate(bodyProfile.birth_date.slice(0, 10));
      if (bodyProfile.height_cm) setHeight(String(bodyProfile.height_cm));
      if (bodyProfile.weight_kg) setWeight(String(bodyProfile.weight_kg));
      if (bodyProfile.activity_level) setActivity(bodyProfile.activity_level);
      if (bodyProfile.goal) setGoal(bodyProfile.goal);
    }
  }, [bodyProfile]);

  useEffect(() => {
    if (goals) {
      const init = {};
      GOAL_FIELDS.forEach(f => { if (goals[f.key] != null) init[f.key] = String(Math.round(Number(goals[f.key]) * 10) / 10); });
      setGoalValues(init);
    }
  }, [goals]);

  // Form key → bodyMeasurements key (aliases differ for arm/hips)
  const BA_FIELD_MAP = {
    waist_cm:'waist_cm', hips_cm:'hip_cm', chest_cm:'chest_cm',
    arm_cm:'bicep_cm', forearm_cm:'forearm_cm', thigh_cm:'thigh_cm',
    calf_cm:'calf_cm', neck_cm:'neck_cm', body_fat_pct:'body_fat_pct',
  };

  useEffect(() => {
    const ba = bodyMeasurements[0] || null;
    const filled = {};
    // Prefer manual measurement history
    if (latest) {
      MEASURE_FIELDS.forEach(({ key }) => {
        if (latest[key] != null) filled[key] = String(latest[key]);
      });
    }
    // Fill any gaps from the last photo analysis
    if (ba) {
      MEASURE_FIELDS.forEach(({ key }) => {
        const baKey = BA_FIELD_MAP[key];
        if (filled[key] == null && baKey && ba[baKey] != null)
          filled[key] = String(ba[baKey]);
      });
    }
    if (Object.keys(filled).length > 0) setMeasures(filled);
  }, [latest, bodyMeasurements]);

  // Derived analysis: merges manual form edits with last photo analysis.
  // All indices, body composition and NovaQI score are recomputed live whenever
  // any input changes — no re-scan needed to see updated results.
  const effectiveBa = useMemo(() => {
    const ba  = bodyMeasurements[0] || {};
    const h   = parseFloat(height);
    const w   = parseFloat(weight);
    const hm  = h > 50 ? h / 100 : null;
    const sx  = bodyProfile?.sex || sex || 'female';

    // Manual values win; photo analysis fills gaps
    const chest   = parseFloat(measures.chest_cm)     || ba.chest_cm     || null;
    const neck    = parseFloat(measures.neck_cm)      || ba.neck_cm      || null;
    const bicep   = parseFloat(measures.arm_cm)       || ba.bicep_cm     || null;
    const forearm = parseFloat(measures.forearm_cm)   || ba.forearm_cm   || null;
    const waist   = parseFloat(measures.waist_cm)     || ba.waist_cm     || null;
    const hip     = parseFloat(measures.hips_cm)      || ba.hip_cm       || null;
    const thigh   = parseFloat(measures.thigh_cm)     || ba.thigh_cm     || null;
    const calf    = parseFloat(measures.calf_cm)      || ba.calf_cm      || null;

    // Indices — fully recomputed from current values
    const bmi_v = hm && w > 0         ? +(w / (hm * hm)).toFixed(1)                                      : (ba.bmi             || null);

    // Body fat: (1) manual override, (2) US Navy from perimeters + height,
    // (3) Deurenberg BMI+age fallback, (4) last photo analysis. Mirrors the
    // server-side pipeline in body_analysis.py:1352-1395 so a user who only
    // tapes waist/neck (+hip for female) gets full body composition without
    // needing a photo. bf_source is exposed so the UI can label the value.
    let bf = parseFloat(measures.body_fat_pct);
    let bf_source = null;
    if (!isNaN(bf) && bf > 0) {
      bf_source = 'manual';
    } else {
      bf = null;
      if (waist && neck && h > 0) {
        let calc = null;
        try {
          if (sx === 'male') {
            const diff = waist - neck;
            if (diff > 0) calc = 86.01 * Math.log10(diff) - 70.041 * Math.log10(h) + 36.76;
          } else if (hip) {
            const diff = waist + hip - neck;
            if (diff > 0) calc = 163.205 * Math.log10(diff) - 97.684 * Math.log10(h) - 78.387;
          }
        } catch {}
        if (calc != null && isFinite(calc)) {
          bf = Math.max(3, Math.min(60, +calc.toFixed(1)));
          bf_source = 'navy';
        }
      }
      if (bf == null && bmi_v && birthDate) {
        const age = Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 86400000));
        if (age > 0 && age < 120) {
          const calc = 1.20 * bmi_v + 0.23 * age - 10.8 * (sx === 'male' ? 1 : 0) - 5.4;
          if (isFinite(calc)) {
            bf = Math.max(3, Math.min(60, +calc.toFixed(1)));
            bf_source = 'deurenberg';
          }
        }
      }
      if (bf == null && ba.body_fat_pct != null) {
        bf = Number(ba.body_fat_pct);
        bf_source = 'photo';
      }
    }

    const wth_v = h > 0 && waist      ? +(waist / h).toFixed(2)                                           : (ba.waist_to_height || null);
    const whi_v = waist && hip        ? +(waist / hip).toFixed(2)                                         : (ba.waist_to_hip    || null);
    const ci_v  = hm && w > 0 && waist? +((waist / 100) / (0.109 * Math.sqrt(w / hm))).toFixed(2)        : (ba.conicity_index  || null);

    // Body composition — recomputed from bf% + weight
    const fmk_v = bf && w > 0  ? +(w * bf / 100).toFixed(1)          : (ba.fat_mass_kg    || null);
    const lmk_v = bf && w > 0  ? +(w * (1 - bf / 100)).toFixed(1)    : (ba.lean_mass_kg   || null);
    const fmi_v = fmk_v && hm  ? +(fmk_v / (hm * hm)).toFixed(1)    : (ba.fat_mass_index || null);
    const lmi_v = lmk_v && hm  ? +(lmk_v / (hm * hm)).toFixed(1)    : (ba.lean_mass_index|| null);
    const bwl_v = lmk_v        ? +(lmk_v * 0.723).toFixed(1)         : (ba.body_water_l   || null);
    const bwp_v = bwl_v && w > 0 ? +(bwl_v / w * 100).toFixed(1)    : (ba.body_water_pct || null);
    const ree_v = lmk_v        ? Math.round(500 + 22 * lmk_v)        : (ba.ree_kcal       || null);

    // NovaQI score — same formula as body_analysis.py (6 indicators, 100/6 pts each)
    function _pts(ok, border = false) { return ok ? 100 / 6 : border ? 50 / 6 : 0; }
    let score_pts = 0, n_avail = 0;
    if (bf != null)    { n_avail++; score_pts += sx === 'male' ? _pts(bf < 25, bf >= 25 && bf < 30)             : _pts(bf < 32, bf >= 32 && bf < 38); }
    if (lmi_v != null) { n_avail++; const th = sx === 'male' ? 14.6 : 11.8; score_pts += _pts(lmi_v >= th, lmi_v >= th - 2 && lmi_v < th); }
    if (fmi_v != null) { n_avail++; const th = sx === 'male' ? 6.0 : 9.0;   score_pts += _pts(fmi_v < th, fmi_v >= th && fmi_v < th + 2.5); }
    if (wth_v != null) { n_avail++; score_pts += _pts(wth_v < 0.5, wth_v >= 0.5 && wth_v < 0.6); }
    if (whi_v != null) { n_avail++; const th = sx === 'male' ? 0.90 : 0.85;  score_pts += _pts(whi_v < th, whi_v >= th && whi_v < th + 0.1); }
    if (ci_v  != null) { n_avail++; score_pts += _pts(ci_v < 1.18, ci_v >= 1.18 && ci_v < 1.30); }
    const score_v = n_avail > 0 ? Math.round(score_pts / n_avail * 6) : (ba.score || null);

    // Only render the analysis panel if there is at least some data to show
    const hasData = [chest, neck, bicep, waist, hip, bf, bmi_v, wth_v].some(v => v != null);
    if (!hasData) return null;

    return {
      ...ba,
      chest_cm: chest, neck_cm: neck, bicep_cm: bicep, forearm_cm: forearm,
      waist_cm: waist, hip_cm: hip, thigh_cm: thigh, calf_cm: calf,
      body_fat_pct: bf,
      bf_source,
      bmi: bmi_v, waist_to_height: wth_v, waist_to_hip: whi_v, conicity_index: ci_v,
      fat_mass_kg: fmk_v, lean_mass_kg: lmk_v,
      fat_mass_index: fmi_v, lean_mass_index: lmi_v,
      body_water_pct: bwp_v, ree_kcal: ree_v,
      score: score_v,
    };
  }, [bodyMeasurements, measures, height, weight, birthDate, sex, bodyProfile]);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPhotoUri(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setPhotoUri(asset.uri);
      }
    }
  }

  function handleExtracted(extracted) {
    setGoalValues(prev => {
      const next = { ...prev };
      GOAL_FIELDS.forEach(f => { if (extracted[f.key] != null) next[f.key] = String(extracted[f.key]); });
      return next;
    });
  }

  async function handleSave() {
    // Locale-safe: accept both comma and dot as decimal separator.
    const heightNum = parseFloat(String(height).replace(',', '.'));
    const weightNum = parseFloat(String(weight).replace(',', '.'));
    if (height && (isNaN(heightNum) || heightNum < 50 || heightNum > 300)) {
      Alert.alert('', t(language, 'nutrition.body_height_error') || 'Height must be between 50 and 300 cm.'); return;
    }
    if (weight && (isNaN(weightNum) || weightNum < 20 || weightNum > 500)) {
      Alert.alert('', t(language, 'nutrition.body_weight_error') || 'Weight must be between 20 and 500 kg.'); return;
    }
    try {
      await saveProfile({ ...profile, name: name.trim(), bio: bio.trim(), photoUri });
      await saveBodyProfile({
        sex: sex || null,
        birth_date: birthDate || null,
        height_cm: heightNum || null,
        weight_kg: weightNum || null,
        activity_level: activity,
        goal,
      });
      // Log measurements only if at least one field has a value
      const measureData = {};
      let hasMeasure = false;
      MEASURE_FIELDS.forEach(({ key }) => {
        const v = parseFloat(measures[key]);
        if (!isNaN(v) && v > 0) { measureData[key] = v; hasMeasure = true; }
      });
      if (hasMeasure) await logMeasurements(measureData);
      // Save goals if any field is filled
      const goalPayload = {};
      let hasGoal = false;
      GOAL_FIELDS.forEach(({ key }) => {
        const v = parseFloat(goalValues[key]);
        if (!isNaN(v) && v > 0) { goalPayload[key] = v; hasGoal = true; }
      });
      if (hasGoal) await saveGoals(goalPayload);
      navigation.goBack();
    } catch {
      Alert.alert('', t(language, 'profile_setup.save_error'));
    }
  }

  const initials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.accent} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'personal.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Photo & Name ── */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickPhoto} activeOpacity={0.85}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={16} color={Colors.white || '#fff'} />
            </View>
          </TouchableOpacity>
          <Text style={styles.tapHint}>{t(language, 'personal.tap_to_change')}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'personal.name')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t(language, 'personal.name_placeholder')}
              placeholderTextColor={Colors.textMuted}
              maxLength={40}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'personal.bio')}</Text>
            <TextInput
              style={[styles.input, styles.inputBio]}
              value={bio}
              onChangeText={setBio}
              placeholder={t(language, 'personal.bio_placeholder')}
              placeholderTextColor={Colors.textMuted}
              maxLength={120}
              multiline
            />
          </View>

          {/* ── Body Profile ── */}
          <Text style={styles.sectionDivider}>{t(language, 'nutrition.body_title')}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_sex')}</Text>
            <View style={styles.optionRow}>
              {SEXES.map(o => (
                <TouchableOpacity key={o} onPress={() => setSex(o)} style={[styles.optionBtn, sex === o && styles.optionSelected]}>
                  <Text style={[styles.optionText, sex === o && styles.optionSelectedText]}>{t(language, `nutrition.body_sex_${o}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_birth')}</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          <View style={styles.row2}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_height')} (cm)</Text>
              <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_weight')} (kg)</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor={Colors.textMuted} keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_activity')}</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity key={a} onPress={() => setActivity(a)} style={[styles.listOption, activity === a && styles.listOptionSelected]}>
                <View style={[styles.radio, activity === a && styles.radioSelected]} />
                <Text style={[styles.listOptionText, activity === a && styles.listOptionSelectedText]}>{t(language, `nutrition.activity_${a}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{t(language, 'nutrition.body_goal')}</Text>
            <View style={styles.optionRow}>
              {GOALS.map(o => (
                <TouchableOpacity key={o} onPress={() => setGoal(o)} style={[styles.optionBtn, goal === o && styles.optionSelected]}>
                  <Text style={[styles.optionText, goal === o && styles.optionSelectedText]}>{t(language, `nutrition.goal_${o}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── BMR / TDEE ── */}
          {bmrInfo && (
            <View style={styles.bmrCard}>
              <Text style={styles.bmrCardTitle}>{t(language, 'nutrition.bmr_title')}</Text>
              <Text style={styles.bmrCardSub}>{t(language, 'nutrition.bmr_subtitle')}</Text>
              <View style={styles.bmrRow}>
                <View style={styles.bmrItem}>
                  <Text style={styles.bmrValue}>{bmrInfo.bmr}</Text>
                  <Text style={styles.bmrLabel}>{t(language, 'nutrition.bmr_label')}</Text>
                  <Text style={styles.bmrUnit}>kcal/dia</Text>
                </View>
                <View style={styles.bmrDivider} />
                <View style={styles.bmrItem}>
                  <Text style={styles.bmrValue}>{bmrInfo.tdee}</Text>
                  <Text style={styles.bmrLabel}>{t(language, 'nutrition.tdee_label')}</Text>
                  <Text style={styles.bmrUnit}>kcal/dia</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Nutrition Goals ── */}
          <Text style={styles.sectionDivider}>{t(language, 'nutrition.goals_title')}</Text>
          <ImportPlanButton language={language} token={token} onExtracted={handleExtracted} style={{ width: '100%' }} />
          <View style={styles.goalGrid}>
            {GOAL_FIELDS.map(({ key, unit, i18n: i18nKey }) => (
              <View key={key} style={styles.goalField}>
                <Text style={styles.goalLabel}>{t(language, i18nKey)}</Text>
                <View style={styles.goalInputRow}>
                  <TextInput
                    style={styles.goalInput}
                    value={goalValues[key] || ''}
                    onChangeText={v => setGoalValues(prev => ({ ...prev, [key]: v.replace(',', '.') }))}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={styles.goalUnit}>{unit}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* ── Body Measurements ── */}
          <Text style={styles.sectionDivider}>{t(language, 'measurements.title')}</Text>

          {/* Photo-analysis suggestion — pushes users to the automatic pipeline
              before they type 9 fields manually. Any measure they don't like
              is still editable one-by-one below. */}
          {IS_NOVAQI && (
            <TouchableOpacity
              style={styles.baSuggest}
              onPress={() => navigation.navigate('VideoAnalysis')}
              activeOpacity={0.85}
            >
              <Text style={styles.baSuggestIcon}>📐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.baSuggestTitle}>Análise corporal por foto</Text>
                <Text style={styles.baSuggestText}>
                  Preenche automaticamente as medidas por foto — depois podes corrigir cada uma abaixo.
                </Text>
              </View>
              <Text style={styles.baSuggestArrow}>›</Text>
            </TouchableOpacity>
          )}

          <View style={styles.measureSubtitleRow}>
            <Text style={styles.measureSubtitle}>{t(language, 'measurements.subtitle')}</Text>
            {latest && (
              <Text style={styles.lastRecorded}>
                {t(language, 'measurements.last_recorded')}: {formatDate(latest.recorded_at, language)}
              </Text>
            )}
          </View>

          <View style={styles.measureGrid}>
            {MEASURE_FIELDS.map(({ key, i18n: i18nKey, placeholder }) => (
              <View key={key} style={styles.measureField}>
                <Text style={styles.measureLabel}>{t(language, i18nKey)}</Text>
                <TextInput
                  style={styles.measureInput}
                  value={measures[key] || ''}
                  onChangeText={v => setMeasures(prev => ({ ...prev, [key]: v }))}
                  placeholder={placeholder}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>

          <Text style={styles.measureHint}>{t(language, 'measurements.save_hint')}</Text>

          {/* ── NovaQI Body Analysis (NovaQI brand only) ── */}
          {IS_NOVAQI && effectiveBa && (() => {
            const ba = effectiveBa;
            const baSex = bodyProfile?.sex || sex || 'female';
            const dateStr = bodyMeasurements[0]?.recorded_at
              ? new Date(bodyMeasurements[0].recorded_at).toLocaleDateString(localeFor(language), { day: '2-digit', month: 'short', year: 'numeric' })
              : null;

            return (
              <>
                <Text style={styles.sectionDivider}>{t(language, 'body_analysis.section_title')}</Text>
                {dateStr && <Text style={styles.baDateLabel}>{t(language, 'body_analysis.last_analysis')}: {dateStr}</Text>}

                {/* Score */}
                {ba.score != null && (() => {
                  const sc = _baScore(ba.score);
                  return (
                    <View style={styles.baCard}>
                      <Text style={styles.baCardTitle}>{t(language, 'body_analysis.score')}</Text>
                      <View style={styles.baScoreRow}>
                        <Text style={[styles.baScoreNum, { color: sc.color }]}>{ba.score}</Text>
                        <Text style={styles.baScoreDen}>/100</Text>
                        <View style={[styles.baBadge, { backgroundColor: sc.color + '20', borderColor: sc.color }]}>
                          <Text style={[styles.baBadgeText, { color: sc.color }]}>{sc.label}</Text>
                        </View>
                      </View>
                      <View style={styles.baScoreBar}>
                        <View style={[styles.baScoreFill, { width: `${Math.min(100, ba.score)}%`, backgroundColor: sc.color }]} />
                      </View>
                    </View>
                  );
                })()}

                {/* Medidas Corporais */}
                {[ba.chest_cm, ba.neck_cm, ba.bicep_cm, ba.forearm_cm, ba.waist_cm, ba.hip_cm, ba.thigh_cm, ba.calf_cm].some(v => v != null) && (
                  <View style={styles.baCard}>
                    <Text style={styles.baCardTitle}>Medidas Corporais</Text>
                    <View style={styles.baGrid}>
                      {[
                        ['chest_cm',   ba.chest_cm,   'cm'],
                        ['neck_cm',    ba.neck_cm,    'cm'],
                        ['bicep_cm',   ba.bicep_cm,   'cm'],
                        ['forearm_cm', ba.forearm_cm, 'cm'],
                        ['waist_cm',   ba.waist_cm,   'cm'],
                        ['hip_cm',     ba.hip_cm,     'cm'],
                        ['thigh_cm',   ba.thigh_cm,   'cm'],
                        ['calf_cm',    ba.calf_cm,    'cm'],
                      ].filter(([, v]) => v != null).map(([key, val, unit]) => (
                        <View key={key} style={styles.baCell}>
                          <Text style={styles.baCellVal}>{_baFmt(key, val)} <Text style={styles.baCellUnit}>{unit}</Text></Text>
                          <Text style={styles.baCellLabel}>{t(language, `body_analysis.${key}`)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Composição Corporal */}
                {[ba.body_fat_pct, ba.lean_mass_kg, ba.fat_mass_kg, ba.body_water_pct, ba.ree_kcal].some(v => v != null) && (
                  <View style={styles.baCard}>
                    <Text style={styles.baCardTitle}>Composição Corporal</Text>
                    {ba.bf_source && ba.bf_source !== 'manual' && (
                      <Text style={styles.baBfSource}>
                        {ba.bf_source === 'navy'       ? '⓵ % de gordura calculado por perímetros (US Navy)'
                       : ba.bf_source === 'deurenberg' ? '⓵ % de gordura estimado por BMI + idade (Deurenberg)'
                       : ba.bf_source === 'photo'      ? '⓵ % de gordura da última análise por foto'
                       : ''}
                        {'  '}Digita o valor manualmente para mais precisão.
                      </Text>
                    )}
                    <View style={styles.baGrid}>
                      {[
                        ['body_fat_pct',  ba.body_fat_pct,  '%'],
                        ['lean_mass_kg',  ba.lean_mass_kg,  'kg'],
                        ['fat_mass_kg',   ba.fat_mass_kg,   'kg'],
                        ['body_water_pct',ba.body_water_pct,'%'],
                        ['ree_kcal',      ba.ree_kcal,      'kcal'],
                      ].filter(([, v]) => v != null).map(([key, val, unit]) => {
                        const cls = _baCls(key, val, baSex);
                        return (
                          <View key={key} style={styles.baCell}>
                            <Text style={styles.baCellVal}>{_baFmt(key, val)} <Text style={styles.baCellUnit}>{unit}</Text></Text>
                            <Text style={styles.baCellLabel}>{t(language, `body_analysis.${key}`)}</Text>
                            {cls && <View style={[styles.baMini, { backgroundColor: cls.color + '20', borderColor: cls.color }]}><Text style={[styles.baMiniText, { color: cls.color }]}>{cls.label}</Text></View>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Índices */}
                {[ba.bmi, ba.lean_mass_index, ba.fat_mass_index, ba.waist_to_height, ba.waist_to_hip, ba.conicity_index].some(v => v != null) && (
                  <View style={styles.baCard}>
                    <Text style={styles.baCardTitle}>Índices</Text>
                    <View style={styles.baGrid}>
                      {[
                        ['bmi',             ba.bmi,             ''],
                        ['lean_mass_index',  ba.lean_mass_index, 'kg/m²'],
                        ['fat_mass_index',   ba.fat_mass_index,  'kg/m²'],
                        ['waist_to_height',  ba.waist_to_height, ''],
                        ['waist_to_hip',     ba.waist_to_hip,    ''],
                        ['conicity_index',   ba.conicity_index,  ''],
                      ].filter(([, v]) => v != null).map(([key, val, unit]) => {
                        const cls = _baCls(key, val, baSex);
                        return (
                          <View key={key} style={styles.baCell}>
                            <Text style={styles.baCellVal}>{_baFmt(key, val)}{unit ? <Text style={styles.baCellUnit}> {unit}</Text> : null}</Text>
                            <Text style={styles.baCellLabel}>{t(language, `body_analysis.${key}`)}</Text>
                            {cls && <View style={[styles.baMini, { backgroundColor: cls.color + '20', borderColor: cls.color }]}><Text style={[styles.baMiniText, { color: cls.color }]}>{cls.label}</Text></View>}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Quadro de Referências */}
                <View style={styles.baCard}>
                  <Text style={styles.baCardTitle}>Quadro de Referências</Text>
                  {[
                    { label: 'IMG (Índice Massa Gorda)',   male: '2–8 kg/m²',   female: '3–12 kg/m²' },
                    { label: 'IMM (Índice Massa Magra)',   male: '17–22 kg/m²', female: '14–18 kg/m²' },
                    { label: 'RCE (Cintura/Estatura)',     male: '< 0,50',       female: '< 0,50' },
                    { label: 'RCQ (Cintura/Quadril)',      male: '< 0,90',       female: '< 0,85' },
                    { label: 'IC (Índice Conicidade)',     male: '< 1,18',       female: '< 1,18' },
                  ].map((row, i) => (
                    <View key={i} style={[styles.baRefRow, i > 0 && styles.baRefRowBorder]}>
                      <Text style={styles.baRefLabel} numberOfLines={2}>{row.label}</Text>
                      <View style={styles.baRefVals}>
                        <Text style={styles.baRefVal}><Text style={styles.baRefSex}>♂ </Text>{row.male}</Text>
                        <Text style={styles.baRefVal}><Text style={styles.baRefSex}>♀ </Text>{row.female}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            );
          })()}

          {/* ── History ── */}
          {measurementsHistory.length > 0 && (
            <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory(v => !v)} activeOpacity={0.7}>
              <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.primary} />
              <Text style={styles.historyToggleTxt}>{t(language, 'measurements.history')} ({measurementsHistory.length})</Text>
            </TouchableOpacity>
          )}

          {showHistory && (
            <View style={styles.historyCard}>
              <Text style={styles.historyTitle}>{t(language, 'measurements.history_title')}</Text>
              {measurementsHistory.map((entry, idx) => (
                <View key={entry.id} style={[styles.historyRow, idx > 0 && styles.historyRowBorder]}>
                  <Text style={styles.historyDate}>{formatDate(entry.recorded_at, language)}</Text>
                  <View style={styles.historyValues}>
                    {MEASURE_FIELDS.map(({ key, i18nKey: k }) => {
                      const v = entry[key];
                      if (v == null) return null;
                      const label = key === 'body_fat_pct' ? '%' : 'cm';
                      const shortKey = key.replace('_cm','').replace('_pct','').replace('body_fat','bf');
                      return (
                        <Text key={key} style={styles.historyVal}>
                          {shortKey} {v}{label}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.9}>
          <Text style={styles.saveBtnText}>{t(language, 'personal.save')}</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  content: { padding: 24, alignItems: 'center', gap: 18, paddingBottom: 120 },
  avatarWrap: { position: 'relative', width: 110, height: 110, marginTop: 8 },
  avatarImage: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 3, borderColor: Colors.primary + '60',
  },
  avatarPlaceholder: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: Colors.forest,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: Colors.primary + '40',
  },
  avatarInitials: { fontSize: 36, fontWeight: '800', color: Colors.white || '#fff', fontFamily: 'serif' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white || '#fff',
  },
  tapHint: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginTop: -8 },
  sectionDivider: {
    width: '100%',
    fontSize: 13, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 18, marginTop: 4,
  },
  goalGrid: { width: '100%', gap: 8 },
  goalField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  goalLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  goalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: {
    width: 80, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 8,
    padding: 8, fontSize: 14, fontWeight: '700', textAlign: 'right',
    color: Colors.text, backgroundColor: Colors.card || '#fff',
  },
  goalUnit: { fontSize: 12, color: Colors.textMuted, width: 28 },

  bmrCard: {
    width: '100%',
    backgroundColor: Colors.forest || '#1C2B22',
    borderRadius: 16, padding: 18, gap: 12,
  },
  bmrCardTitle: { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: 0.4 },
  bmrCardSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 16, marginTop: -6 },
  bmrRow: { flexDirection: 'row', alignItems: 'center' },
  bmrItem: { flex: 1, alignItems: 'center', gap: 2 },
  bmrDivider: { width: 1, height: 48, backgroundColor: 'rgba(255,255,255,0.1)' },
  bmrValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  bmrLabel: { fontSize: 11, fontWeight: '700', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  bmrUnit: { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: '600' },
  fieldGroup: { width: '100%', gap: 8 },
  fieldLabel: {
    fontSize: 12, fontWeight: '800', color: Colors.textLight,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, fontWeight: '600', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  inputBio: { height: 90, textAlignVertical: 'top', paddingTop: 14 },
  row2: { flexDirection: 'row', gap: 12, width: '100%' },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: {
    flex: 1, minWidth: 70, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center',
  },
  optionSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  optionText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted, textAlign: 'center' },
  optionSelectedText: { color: Colors.white || '#fff' },
  listOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.backgroundSecondary,
  },
  listOptionText: { fontSize: 13, color: Colors.text, flex: 1 },
  listOptionSelectedText: { color: Colors.navy, fontWeight: '700' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioSelected: { borderColor: Colors.navy, backgroundColor: Colors.navy },

  // Measurements
  measureSubtitleRow: { width: '100%', gap: 4 },
  measureSubtitle: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  lastRecorded: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  measureGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  measureField: { width: '47%', gap: 6 },
  measureLabel: { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.4 },
  measureInput: {
    backgroundColor: Colors.card,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, fontWeight: '700', color: Colors.text,
    borderWidth: 1, borderColor: Colors.border,
  },
  measureHint: { width: '100%', fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  // Body Analysis cards
  baDateLabel: { width: '100%', fontSize: 12, color: Colors.primary, fontWeight: '700', marginTop: -10 },
  baCard: {
    width: '100%', backgroundColor: Colors.card || '#fff',
    borderRadius: 18, padding: 16, gap: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  baCardTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  baBfSource: { fontSize: 11, color: Colors.textMuted, fontStyle: 'italic', lineHeight: 15, marginTop: -6 },
  baSuggest: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: (Colors.primary || '#7CB518') + '14',
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary || '#7CB518',
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12,
  },
  baSuggestIcon: { fontSize: 26 },
  baSuggestTitle: { fontSize: 14, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  baSuggestText: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  baSuggestArrow: { fontSize: 24, color: Colors.primary || '#7CB518', fontWeight: '700' },
  baScoreRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  baScoreNum: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  baScoreDen: { fontSize: 18, color: Colors.textMuted, fontWeight: '600', paddingBottom: 6 },
  baBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 'auto', alignSelf: 'center' },
  baBadgeText: { fontSize: 12, fontWeight: '800' },
  baScoreBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  baScoreFill: { height: 8, borderRadius: 4 },
  baGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  baCell: { minWidth: 76, alignItems: 'flex-start', gap: 2 },
  baCellVal: { fontSize: 18, fontWeight: '900', color: Colors.text },
  baCellUnit: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  baCellLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },
  baMini: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 },
  baMiniText: { fontSize: 10, fontWeight: '700' },
  baRefRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  baRefRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  baRefLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: Colors.text, lineHeight: 16 },
  baRefVals: { gap: 2, alignItems: 'flex-end' },
  baRefVal: { fontSize: 12, fontWeight: '700', color: Colors.navy || Colors.text },
  baRefSex: { color: Colors.textMuted, fontWeight: '600' },

  // History
  historyToggle: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 10,
  },
  historyToggleTxt: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  historyCard: {
    width: '100%', backgroundColor: Colors.card,
    borderRadius: 16, padding: 16, gap: 0,
    borderWidth: 1, borderColor: Colors.border,
  },
  historyTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12 },
  historyRow: { paddingVertical: 10 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  historyDate: { fontSize: 12, fontWeight: '700', color: Colors.navy, marginBottom: 6 },
  historyValues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyVal: { fontSize: 12, color: Colors.text, fontWeight: '600', backgroundColor: Colors.backgroundSecondary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: Colors.footerScrim || 'rgba(250,248,244,0.94)',
  },
  saveBtn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  saveBtnText: { color: Colors.white || '#fff', fontSize: 17, fontWeight: '900' },
});
