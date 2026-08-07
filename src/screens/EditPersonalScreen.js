import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Image, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';

const SEXES = ['male', 'female', 'other'];
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
const GOALS = ['lose', 'maintain', 'gain'];

export default function EditPersonalScreen({ navigation }) {
  const { language, profile, saveProfile } = useApp();
  const { bodyProfile, saveBodyProfile } = useNutrition();

  const [name, setName] = useState(profile?.name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoUri, setPhotoUri] = useState(profile?.photoUri || null);

  const [sex, setSex]           = useState(null);
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight]     = useState('');
  const [weight, setWeight]     = useState('');
  const [activity, setActivity] = useState('moderate');
  const [goal, setGoal]         = useState('maintain');

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

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
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
              <Ionicons name="camera" size={16} color={Colors.white} />
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
  avatarInitials: { fontSize: 36, fontWeight: '800', color: Colors.white, fontFamily: 'serif' },
  cameraBtn: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.white,
  },
  tapHint: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginTop: -8 },
  sectionDivider: {
    width: '100%',
    fontSize: 13, fontWeight: '800', color: Colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 18, marginTop: 4,
  },
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
  optionSelectedText: { color: Colors.white },
  listOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.backgroundSecondary,
  },
  listOptionText: { fontSize: 13, color: Colors.text, flex: 1 },
  listOptionSelectedText: { color: Colors.navy, fontWeight: '700' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: Colors.border },
  radioSelected: { borderColor: Colors.navy, backgroundColor: Colors.navy },
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
  saveBtnText: { color: Colors.white, fontSize: 17, fontWeight: '900' },
});
