import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

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
      Alert.alert('', language === 'pt' ? 'Selecione uma dieta' : 'Please select a diet');
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
        <Text style={styles.stepText}>
          {t(language, 'profile_setup.step')} {step} {t(language, 'profile_setup.of')} 2
        </Text>
        <View style={styles.stepDots}>
          <View style={[styles.dot, step >= 1 && styles.dotActive]} />
          <View style={[styles.dot, step >= 2 && styles.dotActive]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>{t(language, 'profile_setup.diet_title')}</Text>
            <View style={styles.dietGrid}>
              {DIETS.map(diet => (
                <TouchableOpacity
                  key={diet.id}
                  style={[styles.dietCard, selectedDiet === diet.id && styles.dietCardSelected]}
                  onPress={() => setSelectedDiet(diet.id)}
                >
                  <Text style={styles.dietIcon}>{diet.icon}</Text>
                  <Text style={[styles.dietLabel, selectedDiet === diet.id && styles.dietLabelSelected]}>
                    {diet.label[language]}
                  </Text>
                  <Text style={[styles.dietDesc, selectedDiet === diet.id && styles.dietDescSelected]}>
                    {diet.description[language]}
                  </Text>
                  {selectedDiet === diet.id && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t(language, 'profile_setup.allergy_title')}</Text>
            <Text style={styles.sectionSubtitle}>{t(language, 'profile_setup.allergy_subtitle')}</Text>
            <View style={styles.allergyGrid}>
              {ALLERGIES.map(allergy => {
                const selected = selectedAllergies.includes(allergy.id);
                return (
                  <TouchableOpacity
                    key={allergy.id}
                    style={[styles.allergyChip, selected && styles.allergyChipSelected]}
                    onPress={() => toggleAllergy(allergy.id)}
                  >
                    <Text style={styles.allergyIcon}>{allergy.icon}</Text>
                    <Text style={[styles.allergyLabel, selected && styles.allergyLabelSelected]}>
                      {allergy.label[language]}
                    </Text>
                    {selected && <Text style={styles.allergyCheck}>✓</Text>}
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
            style={[styles.button, !selectedDiet && styles.buttonDisabled]}
            onPress={() => selectedDiet && setStep(2)}
          >
            <Text style={styles.buttonText}>{t(language, 'profile_setup.next')} →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>💾 {t(language, 'profile_setup.save')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    padding: 20,
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    position: 'absolute',
    left: 20,
    top: 20,
    padding: 8,
  },
  backText: { fontSize: 24, color: Colors.primary },
  stepText: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },
  stepDots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 32,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
  },
  dotActive: { backgroundColor: Colors.primary },
  content: { padding: 20, paddingBottom: 100 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  dietGrid: { gap: 12 },
  dietCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    position: 'relative',
  },
  dietCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FAF2',
  },
  dietIcon: { fontSize: 32, marginBottom: 8 },
  dietLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  dietLabelSelected: { color: Colors.primary },
  dietDesc: { fontSize: 13, color: Colors.textLight },
  dietDescSelected: { color: Colors.primaryDark },
  checkBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: Colors.white, fontWeight: '700' },
  allergyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  allergyChipSelected: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerLight,
  },
  allergyIcon: { fontSize: 18 },
  allergyLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  allergyLabelSelected: { color: Colors.danger },
  allergyCheck: { fontSize: 12, color: Colors.danger, fontWeight: '700' },
  footer: {
    padding: 20,
    backgroundColor: Colors.card,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: Colors.textMuted },
  buttonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
});
