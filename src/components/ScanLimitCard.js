import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand from '../brand';
import { logFunnelEvent } from '../services/funnelService';

const isNovaQI = Brand.id === 'novaqi';
const FREE_LIMIT = 7;

// Full-screen overlay shown when a free user hits the monthly scan limit.
// Two CTAs: primary Upgrade → Paywall, secondary Log manually →
// NutritionDashboard's add-food modal. `source` tags the funnel events so
// we can split scan-limit-from-product vs from-plate later.
export default function ScanLimitCard({ navigation, source, token, onDismiss }) {
  const { language } = useApp();

  useEffect(() => {
    logFunnelEvent('scan_limit_shown', { source }, token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goUpgrade() {
    onDismiss?.();
    navigation.navigate('Paywall', { source });
  }

  function goManual() {
    logFunnelEvent('scan_limit_log_manually_click', { source }, token);
    onDismiss?.();
    navigation.navigate('NutritionDashboard', { openAddFood: true });
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
          {t(language, 'limits.limit_reached_title', { limit: FREE_LIMIT })}
        </Text>
        <Text style={styles.body}>
          {t(language, 'limits.log_manually_hint')}
        </Text>
        <Text style={styles.bodyBold}>
          {t(language, 'limits.or_upgrade')}
        </Text>
        <TouchableOpacity
          style={[styles.upgradeBtn, !isNovaQI && styles.upgradeBtnSkeuo]}
          onPress={goUpgrade}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {t(language, 'limits.upgrade_btn')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={goManual}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {t(language, 'limits.log_manually_btn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 20,
  },
  card: {
    backgroundColor: Colors.glass,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'stretch',
    width: '88%',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.85,
  },
  bodyBold: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 2,
  },
  upgradeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginTop: 6,
    alignItems: 'center',
  },
  upgradeBtnSkeuo: { borderBottomWidth: 3, borderBottomColor: Colors.primaryDark },
  upgradeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
});
