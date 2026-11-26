// Tour slides com mock da UI real da app. Cada slide mostra uma versão estilizada do
// ecrã com o elemento-chave destacado (borda âmbar + "Toca aqui") e legenda a explicar
// a acção. Zero medições — pura renderização. No fim, CTA → Paywall.
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { font } from '../theme/type';
import { s2 } from './strings';

const C = {
  bg: '#0E1B14',
  card: '#1A2A22',
  cardSoft: '#243932',
  ink: '#FFFFFF',
  muted: '#C9D4CD',
  mutedDark: '#7A8B82',
  green: '#2FC472',
  deep: '#16A75A',
  amber: '#F4B53F',
  amberSoft: 'rgba(244,181,63,0.18)',
  track: 'rgba(255,255,255,0.08)',
};

const SLIDES = ['welcome', 'scan', 'plate', 'diet', 'workout', 'final'];

export default function TourSlidesScreen({ navigation }) {
  const { language } = useApp();
  const { user, completeDemo } = useAuth();
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef(null);

  const pages = (T.tourSlides || {});

  function goTo(i) {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, i));
    setIdx(clamped);
    scrollRef.current?.scrollTo({ x: clamped * W, animated: true });
  }

  async function finish() {
    await completeDemo?.();
    navigation.reset({ index: 0, routes: [{ name: 'Paywall', params: { source: 'tour_done', currentPlan: user?.user_type || 'free' } }] });
  }

  return (
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        style={{ flex: 1 }}
      >
        {SLIDES.map(key => {
          const p = pages[key] || { title: '', body: '' };
          return (
            <View key={key} style={{ width: W, paddingTop: insets.top + 24, paddingBottom: 150, paddingHorizontal: 20, alignItems: 'center' }}>
              <View style={{ width: '100%', maxWidth: 420, alignItems: 'center' }}>
                <Mock variant={key} T={T} wide={W > 500} />
                <Text style={st.title}>{p.title}</Text>
                <Text style={st.body}>{p.body}</Text>
                {key === 'final' && p.reassure ? <Text style={st.reassure}>{p.reassure}</Text> : null}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Dots */}
      <View style={[st.dots, { bottom: 100 + insets.bottom }]} pointerEvents="none">
        {SLIDES.map((_, i) => (
          <View key={i} style={[st.dot, i === idx && st.dotActive]} />
        ))}
      </View>

      {/* CTA */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 20 }]}>
        {idx < SLIDES.length - 1 ? (
          <Pressable onPress={() => goTo(idx + 1)} style={({ pressed }) => [st.cta, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Text style={st.ctaText}>{T.tour?.next || 'Próximo'}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={finish} style={({ pressed }) => [st.ctaGreen, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Text style={st.ctaText}>{(T.pitch?.cta) || 'Start my free trial'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Mocks ───────────────────────────────────────────────────────────────────
function Mock({ variant, T }) {
  if (variant === 'welcome') return <WelcomeMock T={T} />;
  if (variant === 'scan') return <HomeMock highlight="scan" T={T} />;
  if (variant === 'plate') return <HomeMock highlight="plate" T={T} />;
  if (variant === 'diet') return <DietMock T={T} />;
  if (variant === 'workout') return <WorkoutMock T={T} />;
  if (variant === 'final') return <FinalMock T={T} />;
  return null;
}

function Hint({ label }) {
  // Pequeno "Toca aqui" com seta, usado nos mocks sobre o elemento destacado.
  return (
    <View style={m.hintWrap} pointerEvents="none">
      <View style={m.hint}>
        <Ionicons name="finger-print" size={14} color={C.bg} />
        <Text style={m.hintText}>{label}</Text>
      </View>
      <View style={m.hintArrow} />
    </View>
  );
}

function PhoneFrame({ children }) {
  return (
    <View style={m.phone}>
      <View style={m.notch} />
      <View style={m.phoneContent}>{children}</View>
    </View>
  );
}

function WelcomeMock({ T }) {
  return (
    <View style={m.welcomeWrap}>
      <View style={m.logo}>
        <Ionicons name="sparkles" size={56} color={C.amber} />
      </View>
    </View>
  );
}

function HomeMock({ highlight, T }) {
  const hintLabel = T.tourSlides?.hintTap || 'Toca aqui';
  return (
    <PhoneFrame>
      {/* header */}
      <View style={m.headerRow}>
        <View style={m.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={m.smallInk}>NovaQI</Text>
          <Text style={m.smallMuted}>Home</Text>
        </View>
      </View>

      {/* scan button */}
      <View style={[m.scanBtn, highlight === 'scan' && m.highlighted]}>
        <Ionicons name="barcode-outline" size={28} color="#fff" />
        <View style={{ marginLeft: 10 }}>
          <Text style={m.scanBtnText}>Scanear produto</Text>
          <Text style={m.scanBtnSub}>Código de barras ou foto</Text>
        </View>
        {highlight === 'scan' ? <Hint label={hintLabel} /> : null}
      </View>

      {/* plate button */}
      <View style={[m.plateRow, highlight === 'plate' && m.highlighted]}>
        <View style={m.plateIcon}>
          <Ionicons name="camera-outline" size={18} color={C.deep} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={m.smallInk}>Fotografar prato</Text>
          <Text style={m.smallMuted}>Refeição inteira</Text>
        </View>
        {highlight === 'plate' ? <Hint label={hintLabel} /> : null}
      </View>

      {/* daily ring */}
      <View style={m.todayCard}>
        <View style={m.ring}>
          <View style={m.ringInner}><Text style={m.ringText}>1240</Text><Text style={m.ringUnit}>kcal</Text></View>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={m.smallMuted}>Faltam</Text>
          <Text style={m.bigKcal}>560 kcal</Text>
          <View style={m.macroBarTrack}><View style={[m.macroBarFill, { width: '55%' }]} /></View>
          <Text style={m.smallMuted}>66/120 g proteína</Text>
        </View>
      </View>
    </PhoneFrame>
  );
}

function DietMock({ T }) {
  const hintLabel = T.tourSlides?.hintTap || 'Toca aqui';
  return (
    <PhoneFrame>
      <Text style={[m.smallInk, { marginBottom: 10, fontSize: 15 }]}>O teu plano de hoje</Text>
      {['Pequeno-almoço · 07:30 · 410 kcal', 'Almoço · 13:00 · 620 kcal', 'Jantar · 20:00 · 540 kcal'].map((label, i) => (
        <View key={i} style={[m.mealRow, i === 1 && m.highlighted]}>
          <Ionicons name="restaurant-outline" size={18} color={C.amber} />
          <Text style={[m.smallInk, { flex: 1, marginLeft: 10 }]}>{label}</Text>
          {i === 1 ? (
            <View style={m.ateBtn}><Text style={m.ateBtnText}>Comi esta</Text></View>
          ) : null}
          {i === 1 ? <Hint label={hintLabel} /> : null}
        </View>
      ))}
      <Text style={[m.smallMuted, { marginTop: 14, textAlign: 'center' }]}>Marca cada refeição ao comer. Soma aos macros automaticamente.</Text>
    </PhoneFrame>
  );
}

function WorkoutMock({ T }) {
  const hintLabel = T.tourSlides?.hintTap || 'Toca aqui';
  return (
    <PhoneFrame>
      <Text style={[m.smallInk, { marginBottom: 10, fontSize: 15 }]}>Treino de hoje · Corpo todo</Text>
      <View style={m.exCard}>
        <Text style={[m.smallInk, { fontSize: 14 }]}>Agachamento livre</Text>
        <Text style={m.smallMuted}>Quadríceps · 3 × 6-10 · 120 s descanso</Text>
        <View style={m.setsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[m.setCell, i < 2 && m.setCellDone, i === 1 && m.highlighted]}>
              <Text style={m.setCellText}>{i + 1}</Text>
              <Text style={m.smallMuted}>{i < 2 ? '30×8' : '—'}</Text>
              {i === 1 ? <Hint label={hintLabel} /> : null}
            </View>
          ))}
        </View>
      </View>
      <Text style={[m.smallMuted, { marginTop: 14, textAlign: 'center' }]}>Marca cada série ao fazeres. Progressão automática.</Text>
    </PhoneFrame>
  );
}

function FinalMock() {
  return (
    <View style={m.finalWrap}>
      <View style={m.logoLarge}>
        <Ionicons name="rocket-outline" size={64} color={C.amber} />
      </View>
    </View>
  );
}

const m = StyleSheet.create({
  // Phone frame
  phone: { width: '100%', maxWidth: 320, aspectRatio: 9 / 16, backgroundColor: C.bg, borderWidth: 4, borderColor: C.cardSoft, borderRadius: 32, padding: 14, alignSelf: 'center' },
  notch: { alignSelf: 'center', width: 60, height: 6, backgroundColor: C.cardSoft, borderRadius: 3, marginBottom: 10 },
  phoneContent: { flex: 1 },
  // Common
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.amberSoft, marginRight: 10 },
  smallInk: { fontSize: 13, color: C.ink, ...font('bodyBold') },
  smallMuted: { fontSize: 11, color: C.mutedDark, ...font('body') },
  bigKcal: { fontSize: 22, color: C.ink, ...font('display') },
  // Home scan
  scanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.deep, borderRadius: 14, padding: 14, marginBottom: 10, position: 'relative' },
  scanBtnText: { fontSize: 13, color: '#FFFFFF', ...font('bold') },
  scanBtnSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', ...font('body'), marginTop: 2 },
  plateRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 12, padding: 10, marginBottom: 10, position: 'relative' },
  plateIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  // Today card
  todayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 14, padding: 12 },
  ring: { width: 58, height: 58, borderRadius: 29, borderWidth: 5, borderColor: C.green, alignItems: 'center', justifyContent: 'center' },
  ringInner: { alignItems: 'center' },
  ringText: { fontSize: 14, color: C.ink, ...font('display') },
  ringUnit: { fontSize: 8, color: C.mutedDark, ...font('body') },
  macroBarTrack: { height: 5, backgroundColor: C.track, borderRadius: 3, marginTop: 6, marginBottom: 4 },
  macroBarFill: { height: 5, backgroundColor: C.green, borderRadius: 3 },
  // Diet
  mealRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.cardSoft, borderRadius: 12, padding: 10, marginBottom: 8, position: 'relative' },
  ateBtn: { backgroundColor: C.amber, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  ateBtnText: { fontSize: 11, color: C.bg, ...font('bold') },
  // Workout
  exCard: { backgroundColor: C.cardSoft, borderRadius: 12, padding: 12 },
  setsRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  setCell: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingVertical: 8, alignItems: 'center', position: 'relative' },
  setCellDone: { backgroundColor: 'rgba(47,196,114,0.18)' },
  setCellText: { fontSize: 12, color: C.ink, ...font('bold') },
  // Highlight
  highlighted: { borderWidth: 2.5, borderColor: C.amber, shadowColor: C.amber, shadowOpacity: 0.5, shadowRadius: 10 },
  // Hint callout
  hintWrap: { position: 'absolute', top: -34, right: -8, alignItems: 'flex-end' },
  hint: { backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  hintText: { fontSize: 11, color: C.bg, ...font('bold') },
  hintArrow: { marginRight: 14, marginTop: -1, width: 0, height: 0, borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: C.amber },
  // Final + Welcome visuals
  welcomeWrap: { alignItems: 'center', justifyContent: 'center', height: 240, marginBottom: 24 },
  finalWrap: { alignItems: 'center', justifyContent: 'center', height: 240, marginBottom: 24 },
  logo: { width: 130, height: 130, borderRadius: 65, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' },
  logoLarge: { width: 150, height: 150, borderRadius: 75, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' },
});

const st = StyleSheet.create({
  root: { flex: 1 },
  title: { fontSize: 24, color: C.ink, textAlign: 'center', marginTop: 24, letterSpacing: -0.3, ...font('heading') },
  body: { fontSize: 15, color: C.muted, textAlign: 'center', marginTop: 10, lineHeight: 22, ...font('body') },
  reassure: { fontSize: 12.5, color: C.muted, textAlign: 'center', marginTop: 16, opacity: 0.8, ...font('body') },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },
  dotActive: { backgroundColor: C.green, width: 22 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12 },
  cta: { backgroundColor: C.amber, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  ctaGreen: { backgroundColor: C.green, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, color: '#FFFFFF', ...font('bold') },
});
