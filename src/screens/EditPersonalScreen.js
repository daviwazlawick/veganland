import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t, localeFor } from '../i18n';
import { Colors } from '../constants/colors';

const SEXES = ['male', 'female', 'other'];
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS = ['lose', 'maintain', 'gain'];

const MEASURE_FIELDS = [
  { key: 'waist_cm',     i18n: 'measurements.waist',    placeholder: '80' },
  { key: 'hips_cm',      i18n: 'measurements.hips',     placeholder: '95' },
  { key: 'chest_cm',     i18n: 'measurements.chest',    placeholder: '100' },
  { key: 'arm_cm',       i18n: 'measurements.arm',      placeholder: '35' },
  { key: 'thigh_cm',     i18n: 'measurements.thigh',    placeholder: '55' },
  { key: 'neck_cm',      i18n: 'measurements.neck',     placeholder: '38' },
  { key: 'body_fat_pct', i18n: 'measurements.body_fat', placeholder: '18' },
];

function formatDate(iso, language) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(localeFor(language), { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EditPersonalScreen({ navigation }) {
  const { language, profile, saveProfile } = useApp();
  const { bodyProfile, saveBodyProfile, measurementsHistory, logMeasurements } = useNutrition();

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
    if (latest) {
      const filled = {};
      MEASURE_FIELDS.forEach(({ key }) => {
        if (latest[key] != null) filled[key] = String(latest[key]);
      });
      setMeasures(filled);
    }
  }, [latest]);

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

  async function handleSave() {
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
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

          {/* ── Body Measurements ── */}
          <Text style={styles.sectionDivider}>{t(language, 'measurements.title')}</Text>

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
