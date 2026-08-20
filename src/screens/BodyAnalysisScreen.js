import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { apiBodyAnalyze, apiSaveBodyMeasurements } from '../services/apiService';

export default function BodyAnalysisScreen({ navigation }) {
  const { token } = useAuth();
  const { profile, saveProfile } = useApp();
  const { saveBodyProfile, bodyProfile } = useNutrition();

  const [frontUri, setFrontUri] = useState(null);
  const [sideUri, setSideUri]   = useState(null);
  const [heightCm, setHeightCm] = useState(bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '');
  const [weightKg, setWeightKg] = useState(bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '');
  const [sex, setSex]           = useState(bodyProfile?.sex || 'female');
  const [age, setAge]           = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState(null);

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
    // expo-image-picker can re-export with base64 if we re-launch,
    // but here we use fetch to read the file URI directly
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data:image/...;base64,...
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  async function runAnalysis() {
    if (!frontUri || !sideUri) {
      Alert.alert('Fotos em falta', 'Selecciona a foto frontal e a lateral.');
      return;
    }
    if (!heightCm || !weightKg) {
      Alert.alert('Dados em falta', 'Preenche altura e peso.');
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const [frontB64, sideB64] = await Promise.all([
        uriToBase64(frontUri),
        uriToBase64(sideUri),
      ]);
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
    const m = result.measurements;
    const idx = result.indices;

    // 1. Save measurements to DB (history)
    try {
      await apiSaveBodyMeasurements(token, {
        ...m,
        hip_cm: m.hip_cm,
        ...idx,
        confidence: result.meta?.confidence,
        warnings:   result.meta?.warnings,
        scale_px_per_cm: result.meta?.scale_px_per_cm,
      });
    } catch { /* non-fatal */ }

    // 2. Offer to update body profile (height, weight)
    Alert.alert(
      'Actualizar perfil?',
      `Substituir os dados do teu perfil com os valores usados nesta análise?\n\nAltura: ${heightCm} cm\nPeso: ${weightKg} kg`,
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
                sex:            sex,
                birth_date:     birthYear ? `${birthYear}-01-01` : bodyProfile?.birth_date || null,
                activity_level: bodyProfile?.activity_level || 'moderate',
                goal:           bodyProfile?.goal || 'maintain',
              });
              Alert.alert('Perfil actualizado', 'Os dados foram guardados com sucesso.');
            } catch {
              Alert.alert('Erro', 'Não foi possível guardar o perfil.');
            }
          },
        },
      ]
    );
  }

  const m = result?.measurements;
  const idx = result?.indices;
  const cls = result?.classification;

  function classLabel(key) {
    const map = {
      low_risk: 'Baixo risco',
      elevated_risk: 'Risco elevado',
      adequate: 'Adequado',
    };
    return map[cls?.[key]] || '—';
  }

  function classColor(key) {
    if (cls?.[key] === 'low_risk' || cls?.[key] === 'adequate') return Colors.safe;
    if (cls?.[key] === 'elevated_risk') return Colors.danger;
    return Colors.textMuted;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          <PhotoPicker label="Lateral" uri={sideUri} onPress={() => pickPhoto('side')} />
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
              <TouchableOpacity
                key={s}
                style={[styles.sexBtn, sex === s && styles.sexBtnActive]}
                onPress={() => setSex(s)}
              >
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
            : <Text style={styles.analyzeBtnText}>Analisar →</Text>
          }
        </TouchableOpacity>

        {result?.meta?.warnings?.length > 0 && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠ {result.meta.warnings.join(' · ')}
            </Text>
          </View>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Overlays */}
            {result.overlays && (
              <View style={styles.overlayRow}>
                <OverlayImage b64={result.overlays.front} label="Frente" />
                <OverlayImage b64={result.overlays.side}  label="Lateral" />
              </View>
            )}

            {/* Measurements */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Perímetros</Text>
              <Text style={styles.cardSub}>Precisão ±2–4 cm (modelo elíptico)</Text>
              {[
                ['Braço',       m?.arm_cm],
                ['Antebraço',   m?.forearm_cm],
                ['Cintura',     m?.waist_cm],
                ['Quadril',     m?.hip_cm],
                ['Coxa',        m?.thigh_cm],
                ['Panturrilha', m?.calf_cm],
              ].map(([label, val]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <Text style={styles.rowValue}>{val != null ? `${val} cm` : '—'}</Text>
                </View>
              ))}
            </View>

            {/* Indices */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Índices</Text>
              {[
                ['IMC',                  idx?.bmi,              null],
                ['Razão cintura/estatura', idx?.waist_to_height, 'waist_to_height'],
                ['Razão cintura/quadril',  idx?.waist_to_hip,   'waist_to_hip'],
                ['Índice de conicidade',   idx?.conicity_index, 'conicity_index'],
              ].map(([label, val, clsKey]) => (
                <View key={label} style={styles.row}>
                  <Text style={styles.rowLabel}>{label}</Text>
                  <View style={styles.rowRight}>
                    <Text style={styles.rowValue}>{val != null ? String(val) : '—'}</Text>
                    {clsKey && (
                      <Text style={[styles.clsTag, { color: classColor(clsKey) }]}>
                        {classLabel(clsKey)}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Save button */}
            <TouchableOpacity style={styles.saveBtn} onPress={saveResults} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Guardar resultados</Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.disclaimer}>
          Apenas para uso interno (admin). Precisão ±2–4 cm.{'\n'}
          Não tem poder diagnóstico.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function PhotoPicker({ label, uri, onPress }) {
  return (
    <TouchableOpacity style={styles.photoPicker} onPress={onPress} activeOpacity={0.8}>
      {uri
        ? <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
        : <Text style={styles.photoPlaceholder}>+{'\n'}{label}</Text>
      }
      <Text style={styles.photoLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function Field({ label, value, onChangeText, keyboardType }) {
  const { Colors: C } = require('../constants/colors');
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInput}>
        <Text
          style={styles.fieldValue}
          onPress={() => {}}
        >
          <TextInput
            style={styles.fieldInputText}
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            placeholder="—"
            placeholderTextColor={Colors.textMuted}
          />
        </Text>
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

// Fix: import TextInput at top
import { TextInput } from 'react-native';

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
  fieldValue:  {},
  sexRow:      { flexDirection: 'row', gap: 8 },
  sexBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  sexBtnActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  sexBtnText:  { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  sexBtnTextActive: { color: Colors.white },
  analyzeBtn:  { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  analyzeBtnDisabled: { opacity: 0.45 },
  analyzeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '900', fontFamily: BrandFonts.bold || undefined },
  warningBox:  { backgroundColor: Colors.cautionLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.caution },
  warningText: { fontSize: 12, color: Colors.cautionDark, fontWeight: '600' },
  overlayRow:  { flexDirection: 'row', gap: 10 },
  overlayWrap: { flex: 1, alignItems: 'center', gap: 4 },
  overlayImg:  { width: '100%', aspectRatio: 0.75, borderRadius: 12 },
  overlayLabel:{ fontSize: 11, fontWeight: '700', color: Colors.textMuted },
  card:        { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle:   { fontSize: 15, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  cardSub:     { fontSize: 11, color: Colors.textMuted, fontWeight: '500', marginTop: -6 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel:    { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  rowValue:    { fontSize: 14, fontWeight: '800', color: Colors.text },
  rowRight:    { alignItems: 'flex-end', gap: 2 },
  clsTag:      { fontSize: 10, fontWeight: '700' },
  saveBtn:     { backgroundColor: Colors.safe, borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveBtnText: { color: Colors.white, fontSize: 15, fontWeight: '900' },
  disclaimer:  { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 15, marginTop: 8 },
});
