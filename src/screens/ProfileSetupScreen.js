import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';
import { PremiumIcon } from '../components/ui';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 12) / 2;

export default function ProfileSetupScreen({ navigation }) {
  const { language, saveProfile, profile } = useApp();
  const { token, user, refreshUser } = useAuth();
  const isFirstTime = !profile?.dietId;
  const [step, setStep] = useState(1);
  const [selectedDiet, setSelectedDiet] = useState(profile?.dietId || null);
  const [selectedAllergies, setSelectedAllergies] = useState(profile?.allergyIds || []);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [saving, setSaving] = useState(false);

  const currentUserType = user?.user_type || 'free';

  useEffect(() => {
    if (step === 3 && !isFirstTime) refreshUser();
  }, [step]);

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
    setSaving(true);
    try {
      await saveProfile({ dietId: selectedDiet, allergyIds: selectedAllergies });
      if (isFirstTime) {
        navigation.navigate('Paywall', { currentPlan: 'free' });
      } else {
        navigation.navigate('Main');
      }
    } catch {
      Alert.alert('', t(language, 'profile_setup.save_error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleContinueFree() {
    if (!selectedDiet) {
      Alert.alert('', t(language, 'profile_setup.select_diet'));
      return;
    }
    setSaving(true);
    try {
      await saveProfile({ dietId: selectedDiet, allergyIds: selectedAllergies });
      navigation.navigate('Main');
    } catch {
      Alert.alert('', t(language, 'profile_setup.save_error'));
    } finally {
      setSaving(false);
    }
  }

  function getPlanName() {
    if (currentUserType === 'starter') return t(language, 'plans.starter_name');
    if (currentUserType === 'premium') return t(language, 'plans.premium_name');
    if (currentUserType === 'admin') return 'Admin';
    return t(language, 'plans.free_name');
  }

  function getPlanDesc() {
    if (currentUserType === 'starter') return t(language, 'plans.starter_desc');
    if (currentUserType === 'premium') return t(language, 'plans.premium_desc');
    if (currentUserType === 'admin') return '∞ scans / month';
    return t(language, 'plans.free_desc');
  }

  function getPlanPrice() {
    if (currentUserType === 'starter') return t(language, 'plans.starter_price');
    if (currentUserType === 'premium') return t(language, 'plans.premium_price');
    if (currentUserType === 'admin') return '—';
    return t(language, 'plans.free_price');
  }

  const canUpgrade = currentUserType !== 'premium' && currentUserType !== 'admin';
  const currentPlanForPaywall = currentUserType === 'starter' ? 'starter' : 'free';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(s => s - 1)} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
        )}
        <View style={styles.stepTrack}>
          <StepPill number={1} label={t(language, 'profile_setup.diet_step')} active={true} />
          <View style={[styles.connector, step >= 2 && styles.connectorActive]} />
          <StepPill number={2} label={t(language, 'profile_setup.allergies_step')} active={step >= 2} />
          <View style={[styles.connector, step >= 3 && styles.connectorActive]} />
          <StepPill number={3} label={t(language, 'profile_setup.plan_step')} active={step >= 3} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {step === 1 && (
          <>
            <PremiumIcon name="vegan" size={72} />
            <Text style={styles.sectionTitle}>{t(language, 'profile_setup.diet_title')}</Text>
            <Text style={styles.sectionSub}>{t(language, 'profile_setup.how_do_you_eat')}</Text>
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
        )}

        {step === 2 && (
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

        {step === 3 && (
          <>
            <PremiumIcon name="premium" size={72} />
            <Text style={styles.sectionTitle}>{t(language, 'plans.title')}</Text>
            <Text style={styles.sectionSub}>{t(language, 'plans.subtitle')}</Text>

            {isFirstTime ? (
              <View style={styles.planList}>
                {[
                  { id: 'starter', nameKey: 'starter_name', descKey: 'starter_desc', priceKey: 'starter_price', popular: true  },
                  { id: 'premium', nameKey: 'premium_name', descKey: 'premium_desc', priceKey: 'premium_price', popular: false },
                ].map(plan => {
                  const sel = selectedPlan === plan.id;
                  return (
                    <TouchableOpacity
                      key={plan.id}
                      style={[styles.planCard, sel && styles.planCardSelected]}
                      onPress={() => setSelectedPlan(plan.id)}
                      activeOpacity={0.85}
                    >
                      {plan.popular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularText}>{t(language, 'plans.most_popular')}</Text>
                        </View>
                      )}
                      <View style={styles.planRow}>
                        <View style={styles.planInfo}>
                          <Text style={[styles.planName, sel && styles.planNameSel]}>
                            {t(language, `plans.${plan.nameKey}`)}
                          </Text>
                          <Text style={styles.planDesc}>
                            {t(language, `plans.${plan.descKey}`)}
                          </Text>
                        </View>
                        <View style={styles.planPriceWrap}>
                          <Text style={[styles.planPrice, sel && styles.planPriceSel]}>
                            {t(language, `plans.${plan.priceKey}`)}
                          </Text>
                          <Text style={styles.planPerMonth}>{t(language, 'plans.per_month')}</Text>
                        </View>
                        <View style={[styles.radio, sel && styles.radioSelected]}>
                          {sel && <View style={styles.radioDot} />}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity onPress={handleContinueFree} style={styles.continueFreeLinkWrap}>
                  <Text style={styles.continueFreeLink}>{t(language, 'plans.continue_free')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.currentPlanCard}>
                  <View style={styles.currentPlanBadge}>
                    <Text style={styles.currentPlanBadgeText}>{t(language, 'plans.current')}</Text>
                  </View>
                  <View style={styles.currentPlanRow}>
                    <View style={styles.currentPlanInfo}>
                      <Text style={styles.currentPlanName}>{getPlanName()}</Text>
                      <Text style={styles.currentPlanDesc}>{getPlanDesc()}</Text>
                    </View>
                    <View style={styles.currentPlanPriceWrap}>
                      <Text style={styles.currentPlanPrice}>{getPlanPrice()}</Text>
                      {currentUserType !== 'free' && currentUserType !== 'admin' && (
                        <Text style={styles.currentPlanPerMonth}>{t(language, 'plans.per_month')}</Text>
                      )}
                    </View>
                  </View>
                </View>
                {canUpgrade && (
                  <TouchableOpacity
                    style={styles.upgradeBtn}
                    onPress={() => navigation.navigate('Paywall', { currentPlan: currentPlanForPaywall })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.upgradeBtnText}>{t(language, 'plans.change')}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity
            style={[styles.btn, step === 1 && !selectedDiet && styles.btnDisabled]}
            onPress={() => {
              if (step === 1 && !selectedDiet) return;
              setStep(s => s + 1);
            }}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>{t(language, 'profile_setup.next')} →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btn} onPress={handleSave} activeOpacity={0.9} disabled={saving}>
            {saving
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.btnText}>{t(language, 'profile_setup.save')}</Text>
            }
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
  header: { zIndex: 10, elevation: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', left: 16, top: 12,
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 24, color: Colors.accent, fontWeight: '800' },
  stepTrack: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 24, paddingHorizontal: 10, paddingVertical: 7,
  },
  stepPillActive: { backgroundColor: Colors.accent },
  stepPillInactive: { backgroundColor: Colors.border },
  stepNum: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  stepNumInactive: { backgroundColor: 'rgba(0,0,0,0.1)' },
  stepNumText: { fontSize: 11, fontWeight: '900', color: Colors.white },
  stepNumTextInactive: { color: Colors.textMuted },
  stepLabel: { fontSize: 11, fontWeight: '800', color: Colors.white },
  stepLabelInactive: { color: Colors.textMuted },
  connector: { width: 18, height: 3, borderRadius: 2, backgroundColor: Colors.border },
  connectorActive: { backgroundColor: Colors.accent },
  content: { padding: 20, paddingBottom: 130, alignItems: 'center' },
  sectionTitle: { fontSize: 30, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 6, fontFamily: 'serif' },
  sectionSub: { fontSize: 14, color: Colors.textLight, fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  dietGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, justifyContent: 'center', width: '100%',
  },
  dietCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.glass,
    borderRadius: 28, padding: 18,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)',
    gap: 8, position: 'relative',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dietCardSelected: {
    borderColor: Colors.primary, backgroundColor: 'rgba(255,255,255,0.7)',
    shadowColor: Colors.primary, shadowOpacity: 0.15, elevation: 4,
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
    gap: 10, justifyContent: 'center', width: '100%',
  },
  allergyCard: {
    backgroundColor: Colors.glass,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)',
    minWidth: 90, gap: 4, position: 'relative',
  },
  allergyCardSelected: {
    borderColor: Colors.accent, backgroundColor: Colors.accentLight,
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
  planList: { width: '100%', gap: 14 },
  planCard: {
    backgroundColor: Colors.glass,
    borderRadius: 24, padding: 20,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)',
    position: 'relative', overflow: 'visible',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  planCardSelected: {
    borderColor: Colors.primary, backgroundColor: 'rgba(255,255,255,0.75)',
    shadowColor: Colors.primary, shadowOpacity: 0.15, elevation: 5,
  },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  popularText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '900', color: Colors.text, marginBottom: 3 },
  planNameSel: { color: Colors.primaryDark },
  planDesc: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontWeight: '900', color: Colors.text },
  planPriceSel: { color: Colors.primaryDark },
  planPerMonth: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  continueFreeLinkWrap: { alignItems: 'center', paddingVertical: 12 },
  continueFreeLink: { fontSize: 13, color: Colors.textMuted, fontWeight: '500', textDecorationLine: 'underline' },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  currentPlanCard: {
    width: '100%',
    backgroundColor: Colors.primaryBg,
    borderRadius: 24, padding: 20,
    borderWidth: 2, borderColor: Colors.primaryLight,
    position: 'relative', marginBottom: 16,
  },
  currentPlanBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: Colors.safe, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  currentPlanBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  currentPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  currentPlanInfo: { flex: 1 },
  currentPlanName: { fontSize: 20, fontWeight: '900', color: Colors.primaryDark, marginBottom: 3 },
  currentPlanDesc: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  currentPlanPriceWrap: { alignItems: 'flex-end' },
  currentPlanPrice: { fontSize: 22, fontWeight: '900', color: Colors.primaryDark },
  currentPlanPerMonth: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  upgradeBtn: {
    width: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 18, paddingVertical: 16,
    alignItems: 'center',
  },
  upgradeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: 32,
    backgroundColor: 'rgba(250,248,244,0.94)',
  },
  btn: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 18, paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.darkSurface,
    shadowOpacity: 0.16, shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  btnDisabled: { backgroundColor: Colors.border },
  btnText: { color: Colors.white, fontSize: 18, fontWeight: '900' },
});
