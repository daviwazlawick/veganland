import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { apiSetUserPlan } from '../services/apiService';

const PLANS = [
  { id: 'free',    priceKey: 'free_price',    nameKey: 'free_name',    descKey: 'free_desc',    popular: false },
  { id: 'starter', priceKey: 'starter_price', nameKey: 'starter_name', descKey: 'starter_desc', popular: true  },
  { id: 'premium', priceKey: 'premium_price', nameKey: 'premium_name', descKey: 'premium_desc', popular: false },
];

export default function PaywallScreen({ navigation, route }) {
  const { language, profile } = useApp();
  const { token } = useAuth();
  const currentPlan = route?.params?.currentPlan || profile?.plan || 'free';
  const [selected, setSelected] = useState(currentPlan);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (selected === currentPlan) {
      navigation.goBack();
      return;
    }
    setLoading(true);
    try {
      await apiSetUserPlan(selected, token);
      navigation.goBack();
    } catch {
      // silently fail — plan change is best-effort until payment is wired
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'plans.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t(language, 'plans.subtitle')}</Text>

        {PLANS.map(plan => {
          const sel = selected === plan.id;
          return (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, sel && styles.planCardSelected]}
              onPress={() => setSelected(plan.id)}
              activeOpacity={0.85}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t(language, 'plans.most_popular')}</Text>
                </View>
              )}
              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, sel && styles.planNameSelected]}>
                    {t(language, `plans.${plan.nameKey}`)}
                  </Text>
                  <Text style={[styles.planDesc, sel && styles.planDescSelected]}>
                    {t(language, `plans.${plan.descKey}`)}
                  </Text>
                </View>
                <View style={styles.planPriceWrap}>
                  <Text style={[styles.planPrice, sel && styles.planPriceSelected]}>
                    {t(language, `plans.${plan.priceKey}`)}
                  </Text>
                  {plan.id !== 'free' && (
                    <Text style={[styles.planPerMonth, sel && styles.planPerMonthSelected]}>
                      {t(language, 'plans.per_month')}
                    </Text>
                  )}
                </View>
                <View style={[styles.radio, sel && styles.radioSelected]}>
                  {sel && <View style={styles.radioDot} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.btn} onPress={handleConfirm} activeOpacity={0.9} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.btnText}>{t(language, 'plans.continue')}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 24, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  content: { padding: 20, paddingBottom: 120 },
  subtitle: {
    fontSize: 14, color: Colors.textLight, textAlign: 'center',
    marginBottom: 24, fontWeight: '500',
  },
  planCard: {
    backgroundColor: Colors.glass,
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.72)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
    overflow: 'visible',
  },
  planCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,255,255,0.75)',
    shadowColor: Colors.primary,
    shadowOpacity: 0.15,
    elevation: 5,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  popularText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '900', color: Colors.text, marginBottom: 3 },
  planNameSelected: { color: Colors.primaryDark },
  planDesc: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  planDescSelected: { color: Colors.primaryDark },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontWeight: '900', color: Colors.text },
  planPriceSelected: { color: Colors.primaryDark },
  planPerMonth: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  planPerMonthSelected: { color: Colors.primaryDark },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
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
  btnText: { color: Colors.white, fontSize: 18, fontWeight: '900' },
});
