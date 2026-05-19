import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { PremiumIcon } from '../components/ui';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

export default function ProfileSetupScreen({ navigation }) {
  const { language, saveProfile, profile } = useApp();
  const [step, setStep] = useState(1);
  const [selectedDiet, setSelectedDiet] = useState(profile?.dietId || null);
  const [selectedAllergies, setSelectedAllergies] = useState(profile?.allergyIds || []);

  function toggleAllergy(id) {
    setSelectedAllergies(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!selectedDiet) {
      Alert.alert('', t(language, 'profile_setup.select_diet'));
      return;
    }
    await saveProfile({ dietId: selectedDiet, allergyIds: selectedAllergies });
    navigation.navigate('Main');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step === 2 && (
          <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.stepTrack}>
          <StepPill number={1} label={t(language, 'profile_setup.diet_step')} active={true} />
          <View style={[styles.connector, step >= 2 && styles.connectorActive]} />
          <StepPill number={2} label={t(language, 'profile_setup.allergies_step')} active={step >= 2} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <>
            <PremiumIcon name="vegan" size={72} />
            <Text style={styles.sectionTitle}>{t(language, 'profile_setup.diet_title')}</Text>
            <Text style={styles.sectionSub}>
              {t(language, 'profile_setup.how_do_you_eat')}
            </Text>
            <View style={styles.dietGrid}>
              {DIETS.map(diet => {
                const sel = selectedDiet === diet.id;
                return (
                  <TouchableOpacity
                    key={diet.id}
                    style={[styles.dietCard, sel && styles.dietCardSelected]}
                    onPress={() => setSelectedDiet(diet.id)}
                    activeOpacity={0.85}
                  >
                    {sel && (
                      <View style={styles.dietCheckCircle}>
                        <Text style={styles.dietCheckText}>✓</Text>
                      </View>
                    )}
                    <View style={[styles.dietEmojiWrap, sel && styles.dietEmojiWrapSel]}>
                      <PremiumIcon name={diet.icon} size={44} />
                    </View>
                    <Text style={[styles.dietLabel, sel && styles.dietLabelSel]}>
                      {diet.label[language] || diet.label.en}
                    </Text>
                    <Text style={[styles.dietDesc, sel && styles.dietDescSel]} numberOfLines={2}>
                      {diet.description[language] || diet.description.en}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <PremiumIcon name="profile" size={72} />
            <Text style={styles.sectionTitle}>{t(language, 'profile_setup.allergy_title')}</Text>
            <Text style={styles.sectionSub}>{t(language, 'profile_setup.allergy_subtitle')}</Text>
            <View style={styles.allergyGrid}>
              {ALLERGIES.map(allergy => {
                const sel = selectedAllergies.includes(allergy.id);
                return (
                  <TouchableOpacity
                    key={allergy.id}
                    style={[styles.allergyCard, sel && styles.allergyCardSelected]}
                    onPress={() => toggleAllergy(allergy.id)}
                    activeOpacity={0.85}
                  >
                    <PremiumIcon name={allergy.icon} size={34} />
                    <Text style={[styles.allergyLabel, sel && styles.allergyLabelSel]}>
                      {allergy.label[language] || allergy.label.en}
                    </Text>
                    {sel && (
                      <View style={styles.allergyCheck}>
                        <Text style={styles.allergyCheckText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.btn, !selectedDiet && styles.btnDisabled]}
            onPress={() => selectedDiet && setStep(2)}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>
              {t(language, 'profile_setup.next')} →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.9}>
            <Text style={styles.btnText}>{t(language, 'profile_setup.save')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepPill({ number, label, active }) {
  return (
    <View style={[styles.stepPill, active ? styles.stepPillActive : styles.stepPillInactive]}>
      <View style={[styles.stepNum, active ? styles.stepNumActive : styles.stepNumInactive]}>
        <Text style={[styles.stepNumText, !active && styles.stepNumTextInactive]}>{number}</Text>
      </View>
      <Text style={[styles.stepLabel, !active && styles.stepLabelInactive]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', left: 16, top: 12,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 24, color: Colors.accent, fontWeight: '800' },
  stepTrack: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 24, paddingHorizontal: 14, paddingVertical: 8,
  },
  stepPillActive: { backgroundColor: Colors.accent },
  stepPillInactive: { backgroundColor: Colors.border },
  stepNum: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  stepNumInactive: { backgroundColor: 'rgba(0,0,0,0.1)' },
  stepNumText: { fontSize: 12, fontWeight: '900', color: Colors.white },
  stepNumTextInactive: { color: Colors.textMuted },
  stepLabel: { fontSize: 13, fontWeight: '800', color: Colors.white },
  stepLabelInactive: { color: Colors.textMuted },
  connector: { width: 28, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  connectorActive: { backgroundColor: Colors.accent },
  content: { padding: 20, paddingBottom: 130, alignItems: 'center' },
  stepEmoji: { fontSize: 48, marginBottom: 4, marginTop: 8 },
  sectionTitle: { fontSize: 32, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 6, fontFamily: 'serif' },
  sectionSub: { fontSize: 14, color: Colors.textLight, fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  dietGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center',
    width: '100%',
  },
  dietCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.glass,
    borderRadius: 28,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    gap: 8,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dietCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    elevation: 4,
  },
  dietCheckCircle: {
    position: 'absolute', top: 10, right: 10,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  dietCheckText: { color: Colors.white, fontSize: 13, fontWeight: '900' },
  dietEmojiWrap: {
    width: 64, height: 64, borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  dietEmojiWrapSel: {
    backgroundColor: Colors.primaryLight + '30',
    borderColor: Colors.primary + '60',
  },
  dietLabel: { fontSize: 15, fontWeight: '900', color: Colors.text, textAlign: 'center' },
  dietLabelSel: { color: Colors.primaryDark },
  dietDesc: { fontSize: 11, color: Colors.textLight, textAlign: 'center', fontWeight: '500', lineHeight: 15 },
  dietDescSel: { color: Colors.primaryDark },
  allergyGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, justifyContent: 'center',
    width: '100%',
  },
  allergyCard: {
    backgroundColor: Colors.glass,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    minWidth: 90,
    gap: 4,
    position: 'relative',
  },
  allergyCardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  allergyLabel: { fontSize: 12, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  allergyLabelSel: { color: Colors.accentDark },
  allergyCheck: {
    position: 'absolute', top: -8, right: -8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.card,
  },
  allergyCheckText: { color: Colors.white, fontSize: 11, fontWeight: '900' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: 'rgba(250,248,244,0.94)',
    borderTopWidth: 0,
  },
  btn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  btnDisabled: {
    backgroundColor: Colors.border,
    borderBottomColor: Colors.textMuted,
  },
  btnText: { color: Colors.white, fontSize: 18, fontWeight: '900' },
});
