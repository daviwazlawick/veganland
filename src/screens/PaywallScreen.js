import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import {
  isPurchasesAvailable,
  fetchCurrentOffering,
  purchasePackage,
  restorePurchases,
  activeEntitlementId,
  entitlementToUserType,
  ENTITLEMENT_STARTER,
  ENTITLEMENT_PRO,
} from '../services/purchasesService';

const PLANS = [
  {
    id: 'free',
    rcPackageId: null,
    nameKey: 'free_name',
    descKey: 'free_desc',
    priceKey: 'free_price',
    popular: false,
  },
  {
    id: 'starter',
    rcPackageId: ENTITLEMENT_STARTER,
    nameKey: 'starter_name',
    descKey: 'starter_desc',
    priceKey: 'starter_price',
    popular: true,
  },
  {
    id: 'premium',
    rcPackageId: ENTITLEMENT_PRO,
    nameKey: 'premium_name',
    descKey: 'premium_desc',
    priceKey: 'premium_price',
    popular: false,
  },
];

export default function PaywallScreen({ navigation, route }) {
  const { language } = useApp();
  const { token, updateUserType } = useAuth();
  const currentPlan = route?.params?.currentPlan || 'free';
  const [selected, setSelected] = useState(currentPlan === 'free' ? 'starter' : currentPlan);
  const [offering, setOffering] = useState(null);
  const [offeringLoaded, setOfferingLoaded] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const isNative = Platform.OS !== 'web' && isPurchasesAvailable();

  useEffect(() => {
    if (isNative) {
      fetchCurrentOffering()
        .then(o => {
          console.log('[RC] offering:', JSON.stringify(o));
          setOffering(o);
          setOfferingLoaded(true);
        })
        .catch(e => {
          console.log('[RC] offering error:', e?.message);
          setOfferingLoaded(true);
        });
    }
  }, [isNative]);

  const PRODUCT_IDS = { starter: 'novaqi_starter', premium: 'novaqi_premium' };

  function getRcPackage(planId) {
    const pkgs = offering?.availablePackages;
    if (!pkgs?.length) return null;

    const productId = PRODUCT_IDS[planId];

    // 1. by product store ID
    const byProduct = pkgs.find(p =>
      p.product?.identifier === productId ||
      p.product?.productIdentifier === productId
    );
    if (byProduct) return byProduct;

    // 2. by RC package identifier
    const byIdentifier = pkgs.find(p => p.identifier === planId);
    if (byIdentifier) return byIdentifier;

    // 3. fallback by price order — cheapest = starter, most expensive = premium
    const sorted = [...pkgs].sort((a, b) => (a.product?.price ?? 0) - (b.product?.price ?? 0));
    if (planId === 'starter') return sorted[0] || null;
    if (planId === 'premium') return sorted[sorted.length - 1] || null;

    return null;
  }

  function hasTrial(planId) {
    const pkg = getRcPackage(planId);
    return pkg?.product?.introPrice?.price === 0;
  }

  function getPriceString(planId) {
    if (planId === 'free') return t(language, 'plans.free_price');
    const pkg = getRcPackage(planId);
    if (pkg?.product?.priceString) return pkg.product.priceString;
    if (planId === 'premium') return Platform.OS === 'ios' ? '€5.99' : '€5.49';
    if (planId === 'starter') return Platform.OS === 'ios' ? '€3.99' : '€2.99';
    return t(language, 'plans.premium_price');
  }

  async function handleSelect(plan) {
    if (plan.id === currentPlan) { navigation.goBack(); return; }

    if (plan.id === 'free') {
      navigation.goBack();
      return;
    }

    if (!isNative) {
      Alert.alert('', t(language, 'plans.mobile_only'));
      return;
    }

    const pkg = getRcPackage(plan.id);
    if (!pkg) {
      Alert.alert('', t(language, 'plans.not_configured'));
      return;
    }

    setPurchasing(true);
    try {
      const customerInfo = await purchasePackage(pkg);
      const entId = activeEntitlementId(customerInfo);
      const newUserType = entitlementToUserType(entId);
      updateUserType(newUserType);
      navigation.navigate('Main');
      if (route?.params?.onPurchase) route.params.onPurchase(newUserType);
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('', t(language, 'plans.purchase_error'));
      }
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (!isNative) {
      Alert.alert('', t(language, 'plans.mobile_only'));
      return;
    }
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      const entId = activeEntitlementId(customerInfo);
      const newUserType = entitlementToUserType(entId);
      updateUserType(newUserType);
      Alert.alert('', t(language, 'plans.restore_done'));
      if (route?.params?.onPurchase) route.params.onPurchase(newUserType);
    } catch (e) {
      if (!e.userCancelled) Alert.alert('', t(language, 'plans.purchase_error'));
    } finally {
      setRestoring(false);
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
          const isCurrent = plan.id === currentPlan;
          const isSel = selected === plan.id;
          const pkg = plan.rcPackageId ? getRcPackage(plan.id) : null;
          const loading = plan.rcPackageId && isNative && !offeringLoaded;
          // Only block on web — on native, let the user try and handle errors at purchase time
          const unavailable = plan.rcPackageId && Platform.OS === 'web';

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                isSel && styles.planCardSelected,
                isCurrent && styles.planCardCurrent,
                unavailable && styles.planCardLocked,
              ]}
              onPress={() => { setSelected(plan.id); }}
              activeOpacity={(unavailable || loading) ? 1 : 0.85}
              disabled={unavailable || loading}
            >
              {plan.popular && !unavailable && !loading && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t(language, 'plans.most_popular')}</Text>
                </View>
              )}
              {isCurrent && (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentText}>{t(language, 'plans.current')}</Text>
                </View>
              )}
              {unavailable && (
                <View style={styles.comingSoonBadge}>
                  <Text style={styles.comingSoonText}>{t(language, 'plans.coming_soon')}</Text>
                </View>
              )}
              <View style={styles.planRow}>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, isSel && styles.planNameSelected, unavailable && styles.planNameLocked]}>
                    {t(language, `plans.${plan.nameKey}`)}
                  </Text>
                  <Text style={[styles.planDesc, unavailable && styles.planDescLocked]}>
                    {t(language, `plans.${plan.descKey}`)}
                  </Text>
                  {hasTrial(plan.id) && !unavailable && (
                    <Text style={styles.trialText}>{t(language, 'plans.free_trial_badge')}</Text>
                  )}
                </View>
                <View style={styles.planPriceWrap}>
                  {loading
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <>
                        <Text style={[styles.planPrice, isSel && styles.planPriceSelected, unavailable && styles.planPriceLocked]}>
                          {getPriceString(plan.id)}
                        </Text>
                        {plan.id !== 'free' && (
                          <Text style={[styles.planPerMonth, unavailable && styles.planPerMonthLocked]}>
                            {t(language, 'plans.per_month')}
                          </Text>
                        )}
                      </>
                  }
                </View>
                {!unavailable && !loading && (
                  <View style={[styles.radio, isSel && styles.radioSelected]}>
                    {isSel && <View style={styles.radioDot} />}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}

        {isNative && (
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>
              {restoring ? '...' : t(language, 'plans.restore')}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, (purchasing || restoring) && styles.btnDisabled]}
          onPress={() => handleSelect(PLANS.find(p => p.id === selected) || PLANS[0])}
          activeOpacity={0.9}
          disabled={purchasing || restoring}
        >
          {purchasing
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.btnText}>{t(language, selected === 'free' ? 'plans.continue' : hasTrial(selected) ? 'plans.start_trial' : 'plans.subscribe')}</Text>
          }
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: Colors.accent, fontWeight: '800' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: Colors.text },
  content: { padding: 20, paddingBottom: 120 },
  subtitle: {
    fontSize: 14, color: Colors.textLight, textAlign: 'center',
    marginBottom: 24, fontWeight: '500',
  },
  planCard: {
    backgroundColor: Colors.glass,
    borderRadius: 24, padding: 20, marginBottom: 14,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.72)',
    position: 'relative', overflow: 'visible',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  planCardSelected: {
    borderColor: Colors.primary, backgroundColor: 'rgba(255,255,255,0.75)',
    shadowColor: Colors.primary, shadowOpacity: 0.15, elevation: 5,
  },
  planCardCurrent: { borderColor: Colors.safe },
  planCardLocked: { opacity: 0.5 },
  popularBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  popularText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  currentBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: Colors.safe, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  currentText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  comingSoonBadge: {
    position: 'absolute', top: -12, alignSelf: 'center',
    backgroundColor: Colors.textMuted, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  comingSoonText: { color: Colors.white, fontSize: 11, fontWeight: '800' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 17, fontWeight: '900', color: Colors.text, marginBottom: 3 },
  planNameSelected: { color: Colors.primaryDark },
  planNameLocked: { color: Colors.textMuted },
  planDesc: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  planDescLocked: { color: Colors.textMuted },
  trialText: { fontSize: 11, color: Colors.safe, fontWeight: '700', marginTop: 4 },
  planPriceWrap: { alignItems: 'flex-end' },
  planPrice: { fontSize: 20, fontWeight: '900', color: Colors.text },
  planPriceSelected: { color: Colors.primaryDark },
  planPriceLocked: { color: Colors.textMuted },
  planPerMonth: { fontSize: 11, color: Colors.textLight, fontWeight: '600' },
  planPerMonthLocked: { color: Colors.textMuted },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  restoreBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  restoreText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600', textDecorationLine: 'underline' },
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
