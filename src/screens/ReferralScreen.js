import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Clipboard, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { useReferral } from '../context/ReferralContext';
import { BrandFonts } from '../brand';
import Brand from '../brand';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { logEvent } from '../services/analyticsService';

export default function ReferralScreen({ navigation }) {
  const { language } = useApp();
  const { stats, refreshStats, redeem, isValidShape, pendingCode, clearPendingCode } = useReferral();
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);
  const [enterCodeOpen, setEnterCodeOpen] = useState(false);
  const [codeInput, setCodeInput] = useState(pendingCode || '');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => { refreshStats(); }, [refreshStats]);
  useEffect(() => { if (pendingCode) setCodeInput(pendingCode); }, [pendingCode]);

  const code = stats?.code || '------';
  const qualified = stats?.qualified || 0;
  const pending = stats?.pending || 0;
  const credit = stats?.credit_count || 0;
  const needed = stats?.referrals_needed || 3;
  const totalRewarded = stats?.total_rewarded || 0;
  const bonusRemaining = stats?.bonus_remaining || 0;
  const bonusExpiresAt = stats?.bonus_expires_at;
  const progress = Math.min(1, credit / needed);

  const bonusExpiresFmt = useMemo(() => {
    if (!bonusExpiresAt) return null;
    const d = new Date(bonusExpiresAt);
    if (d <= new Date()) return null;
    return d.toLocaleDateString(language === 'pt' ? 'pt-PT' : language);
  }, [bonusExpiresAt, language]);

  function copyCode() {
    Clipboard.setString(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareCode() {
    const url = `https://${Brand.domain}/r/${code}`;
    const message = t(language, 'referral.share_message', { code, url });
    try {
      await Share.share({ message }, { dialogTitle: t(language, 'referral.share_title') });
      logEvent('InviteShared', { code, language });
    } catch {}
  }

  async function applyCode() {
    const trimmed = codeInput.trim().toUpperCase();
    if (!isValidShape(trimmed)) {
      Alert.alert(t(language, 'referral.invalid_title'), t(language, 'referral.invalid_body'));
      return;
    }
    setRedeeming(true);
    const r = await redeem(trimmed);
    setRedeeming(false);
    if (r.ok) {
      Alert.alert(t(language, 'referral.applied_title'), t(language, 'referral.applied_body'));
      setEnterCodeOpen(false);
      await clearPendingCode();
    } else {
      const key = `referral.error_${r.error || 'generic'}`;
      Alert.alert(t(language, 'referral.error_title'), t(language, key));
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'referral.title')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🎁</Text>
          <Text style={styles.heroTitle}>{t(language, 'referral.hero_title')}</Text>
          <Text style={styles.heroSub}>{t(language, 'referral.hero_subtitle')}</Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t(language, 'referral.your_code')}</Text>
          <Text style={styles.codeText}>{code}</Text>
          <View style={styles.codeBtnRow}>
            <TouchableOpacity onPress={copyCode} style={[styles.codeBtn, styles.codeBtnSecondary]}>
              <Text style={styles.codeBtnSecondaryText}>{copied ? t(language, 'referral.copied') : t(language, 'referral.copy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={shareCode} style={[styles.codeBtn, styles.codeBtnPrimary]}>
              <Text style={styles.codeBtnPrimaryText}>{t(language, 'referral.share')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>{t(language, 'referral.progress', { qualified: credit, total: needed })}</Text>
            <Text style={styles.progressBadge}>{credit}/{needed}</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          {pending > 0 && (
            <Text style={styles.pendingNote}>⏳ {t(language, 'referral.pending_note', { count: pending })}</Text>
          )}
        </View>

        {bonusRemaining > 0 && (
          <View style={styles.promoCard}>
            <Text style={styles.promoEmoji}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.promoTitle}>{t(language, 'referral.bonus_balance', { count: bonusRemaining })}</Text>
              {bonusExpiresFmt && (
                <Text style={styles.promoSub}>{t(language, 'referral.bonus_expires', { date: bonusExpiresFmt })}</Text>
              )}
            </View>
          </View>
        )}

        {totalRewarded > 0 && (
          <Text style={styles.rewardedTotal}>{t(language, 'referral.total_rewards', { count: totalRewarded })}</Text>
        )}

        <View style={styles.howCard}>
          <Text style={styles.howTitle}>{t(language, 'referral.how_it_works')}</Text>
          <Text style={styles.howStep}>1. {t(language, 'referral.step_1')}</Text>
          <Text style={styles.howStep}>2. {t(language, 'referral.step_2')}</Text>
          <Text style={styles.howStep}>3. {t(language, 'referral.step_3')}</Text>
        </View>

        {!enterCodeOpen ? (
          <TouchableOpacity onPress={() => setEnterCodeOpen(true)} style={styles.haveCodeLink}>
            <Text style={styles.haveCodeText}>{t(language, 'referral.have_a_code')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.enterCodeCard}>
            <Text style={styles.enterCodeLabel}>{t(language, 'referral.enter_code_label')}</Text>
            <TextInput
              value={codeInput}
              onChangeText={text => setCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="ABCD23"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              style={styles.enterCodeInput}
            />
            <TouchableOpacity onPress={applyCode} disabled={redeeming} style={[styles.applyBtn, redeeming && { opacity: 0.6 }]}>
              <Text style={styles.applyBtnText}>{redeeming ? '…' : t(language, 'referral.apply')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.headerBg,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 14 },

  heroCard: {
    backgroundColor: Colors.navy,
    borderRadius: 24, padding: 24, alignItems: 'center',
  },
  heroEmoji: { fontSize: 44, marginBottom: 6 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },

  codeCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  codeLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  codeText: { fontSize: 36, fontWeight: '800', color: Colors.navy, letterSpacing: 6, textAlign: 'center', fontFamily: BrandFonts.mono || 'Courier' },
  codeBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  codeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  codeBtnSecondary: { backgroundColor: Colors.primaryBg, borderWidth: 1, borderColor: Colors.primaryLight },
  codeBtnSecondaryText: { color: Colors.navy, fontWeight: '700' },
  codeBtnPrimary: { backgroundColor: Colors.navy },
  codeBtnPrimaryText: { color: Colors.white, fontWeight: '700' },

  progressCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 14, color: Colors.navy, fontWeight: '600' },
  progressBadge: { fontSize: 14, fontWeight: '800', color: Colors.navy, fontFamily: BrandFonts.mono || undefined },
  progressBar: { height: 10, backgroundColor: Colors.border, borderRadius: 5, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: 10, backgroundColor: Colors.primary, borderRadius: 5 },
  pendingNote: { fontSize: 13, color: Colors.textMuted, marginTop: 10 },

  promoCard: {
    backgroundColor: Colors.cautionLight,
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: Colors.caution,
  },
  promoEmoji: { fontSize: 30 },
  promoTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy },
  promoSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  rewardedTotal: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  howCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  howTitle: { fontSize: 14, fontWeight: '800', color: Colors.navy, marginBottom: 10 },
  howStep: { fontSize: 13, color: Colors.textLight, lineHeight: 22 },

  haveCodeLink: { alignItems: 'center', paddingVertical: 10 },
  haveCodeText: { color: Colors.navy, textDecorationLine: 'underline', fontSize: 14 },

  enterCodeCard: {
    backgroundColor: Colors.card,
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: Colors.border,
  },
  enterCodeLabel: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  enterCodeInput: {
    borderWidth: 2, borderColor: Colors.border, borderRadius: 12,
    padding: 14, fontSize: 22, letterSpacing: 4, textAlign: 'center',
    fontFamily: BrandFonts.mono || 'Courier', color: Colors.navy,
  },
  applyBtn: { backgroundColor: Colors.navy, padding: 14, borderRadius: 12, marginTop: 12, alignItems: 'center' },
  applyBtnText: { color: Colors.white, fontWeight: '800' },
});
