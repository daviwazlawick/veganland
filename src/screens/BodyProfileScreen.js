import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, KeyboardAvoidingView, Platform, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { pickDocumentAsBase64 } from '../utils/fileUtils';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts, Brand } from '../brand';
import { apiParsePlan } from '../services/apiService';

const isNovaQI = Brand.id === 'novaqi';

const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS = ['lose', 'maintain', 'gain'];
const SEXES = ['male', 'female', 'other'];

export default function BodyProfileScreen({ navigation }) {
  const { language, token } = useApp();
  const { bodyProfile, saveBodyProfile } = useNutrition();
  const insets = useSafeAreaInsets();

  const [sex, setSex]                   = useState(bodyProfile?.sex || null);
  const [birthDate, setBirthDate]       = useState(bodyProfile?.birth_date ? bodyProfile.birth_date.slice(0, 10) : '');
  const [height, setHeight]             = useState(bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '');
  const [weight, setWeight]             = useState(bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '');
  const [activity, setActivity]         = useState(bodyProfile?.activity_level || 'moderate');
  const [goal, setGoal]                 = useState(bodyProfile?.goal || 'maintain');
  const [saving, setSaving]             = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [parsing, setParsing]           = useState(false);

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

  async function pickAndParse(source) {
    setShowPickerModal(false);
    let base64 = null;
    let mediaType = null;
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
        if (result.canceled || !result.assets?.[0]?.base64) return;
        base64 = result.assets[0].base64;
      } else if (source === 'gallery') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) return;
        const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
        if (result.canceled || !result.assets?.[0]?.base64) return;
        base64 = result.assets[0].base64;
      } else {
        const picked = await pickDocumentAsBase64();
        if (!picked) return;
        base64 = picked.base64;
        mediaType = picked.mediaType;
      }
    } catch {
      Alert.alert('', t(language, 'nutrition.import_plan_error'));
      return;
    }
    if (!base64) return;
    setParsing(true);
    try {
      const extracted = await apiParsePlan(token, base64, language, mediaType);
      const hasAny = extracted && Object.values(extracted).some(v => v !== null);
      if (!hasAny) {
        Alert.alert('', t(language, 'nutrition.import_plan_empty'));
        return;
      }
      navigation.navigate('NutritionGoals', { suggested: extracted });
    } catch {
      Alert.alert('', t(language, 'nutrition.import_plan_error'));
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    if (height && (isNaN(heightNum) || heightNum < 50 || heightNum > 300)) {
      Alert.alert('', 'Height must be between 50 and 300 cm.'); return;
    }
    if (weight && (isNaN(weightNum) || weightNum < 20 || weightNum > 500)) {
      Alert.alert('', 'Weight must be between 20 and 500 kg.'); return;
    }
    setSaving(true);
    try {
      const res = await saveBodyProfile({
        sex: sex || null,
        birth_date: birthDate || null,
        height_cm: heightNum || null,
        weight_kg: weightNum || null,
        activity_level: activity,
        goal,
      });
      navigation.navigate('NutritionGoals', { suggested: res?.suggested });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível salvar. Tenta novamente.');
    } finally {
      setSaving(false);
    }
  }

  const OptionRow = ({ options, selected, onSelect, labelKey }) => (
    <View style={styles.optionRow}>
      {options.map(o => (
        <TouchableOpacity key={o} onPress={() => onSelect(o)} style={[styles.optionBtn, selected === o && styles.optionSelected]}>
          <Text style={[styles.optionText, selected === o && styles.optionSelectedText]}>{t(language, labelKey(o))}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'nutrition.body_title')}</Text>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>

          <View style={styles.card}>
            <Text style={styles.label}>{t(language, 'nutrition.body_sex')}</Text>
            <OptionRow options={SEXES} selected={sex} onSelect={setSex} labelKey={o => `nutrition.body_sex_${o}`} />
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t(language, 'nutrition.body_birth')}</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
          </View>

          <View style={styles.row2}>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.label}>{t(language, 'nutrition.body_height')}</Text>
              <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="175" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            </View>
            <View style={[styles.card, { flex: 1 }]}>
              <Text style={styles.label}>{t(language, 'nutrition.body_weight')}</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight} placeholder="70" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t(language, 'nutrition.body_activity')}</Text>
            {ACTIVITY_LEVELS.map(a => (
              <TouchableOpacity key={a} onPress={() => setActivity(a)} style={[styles.listOption, activity === a && styles.listOptionSelected]}>
                <View style={[styles.radio, activity === a && styles.radioSelected]} />
                <Text style={[styles.listOptionText, activity === a && styles.listOptionSelectedText]}>{t(language, `nutrition.activity_${a}`)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>{t(language, 'nutrition.body_goal')}</Text>
            <OptionRow options={GOALS} selected={goal} onSelect={setGoal} labelKey={o => `nutrition.goal_${o}`} />
          </View>

          {isNovaQI && (
            <TouchableOpacity onPress={() => setShowPickerModal(true)} style={styles.importBtn}>
              <Text style={styles.importBtnIcon}>📄</Text>
              <Text style={styles.importBtnText}>{t(language, 'nutrition.import_plan_btn')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
            <Text style={styles.saveBtnText}>{saving ? '…' : t(language, 'nutrition.body_save')}</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPickerModal} transparent animationType="slide" onRequestClose={() => setShowPickerModal(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowPickerModal(false)} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <TouchableOpacity style={styles.pickerOption} onPress={() => pickAndParse('camera')}>
            <Text style={styles.pickerOptionText}>📷  {t(language, 'nutrition.import_plan_camera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerOption} onPress={() => pickAndParse('gallery')}>
            <Text style={styles.pickerOptionText}>🖼️  {t(language, 'nutrition.import_plan_gallery')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickerOption} onPress={() => pickAndParse('document')}>
            <Text style={styles.pickerOptionText}>📄  {t(language, 'nutrition.import_plan_document')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {parsing && (
        <View style={styles.parsingOverlay}>
          <View style={styles.parsingBox}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <Text style={styles.parsingText}>{t(language, 'nutrition.import_plan_loading')}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border },
  row2: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  input: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: Colors.navy },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { flex: 1, minWidth: 80, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  optionSelected: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  optionText: { fontSize: 13, fontWeight: '600', color: '#64748b', textAlign: 'center' },
  optionSelectedText: { color: Colors.white },
  listOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  listOptionSelected: {},
  listOptionText: { fontSize: 13, color: '#475569', flex: 1 },
  listOptionSelectedText: { color: Colors.navy, fontWeight: '700' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1' },
  radioSelected: { borderColor: Colors.navy, backgroundColor: Colors.navy },
  saveBtn: { backgroundColor: Colors.navy, padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.navy, borderRadius: 14, padding: 14, borderStyle: 'dashed' },
  importBtnIcon: { fontSize: 18 },
  importBtnText: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 8 },
  pickerHandle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  pickerOption: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f8fafc' },
  pickerOptionText: { fontSize: 16, fontWeight: '600', color: Colors.navy },
  parsingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  parsingBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, marginHorizontal: 40 },
  parsingText: { fontSize: 14, fontWeight: '600', color: Colors.navy, textAlign: 'center' },
});
