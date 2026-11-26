// Tour slide-show simples: 6 slides com ícone + título + body + dots. Último slide
// tem CTA que marca demo_done e vai para o Paywall. Substitui o overlay anterior.
import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { font } from '../theme/type';
import { s2 } from './strings';

const C = { bg: '#0E1B14', card: '#1A2A22', ink: '#FFFFFF', muted: '#C9D4CD', green: '#2FC472', amber: '#F4B53F' };

const ICONS = {
  welcome: 'sparkles',
  scan:    'barcode-outline',
  plate:   'camera-outline',
  plan:    'book-outline',
  track:   'stats-chart-outline',
  final:   'rocket-outline',
};
const SLIDES = ['welcome', 'scan', 'plate', 'plan', 'track', 'final'];

export default function TourSlidesScreen({ navigation }) {
  const { language } = useApp();
  const { user, completeDemo } = useAuth();
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
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
            <View key={key} style={{ width: W, paddingTop: insets.top + 40, paddingBottom: 140, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center' }}>
              <View style={st.iconWrap}>
                <Ionicons name={ICONS[key]} size={72} color={C.amber} />
              </View>
              <Text style={st.title}>{p.title}</Text>
              <Text style={st.body}>{p.body}</Text>
              {key === 'final' && p.reassure ? <Text style={st.reassure}>{p.reassure}</Text> : null}
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

const st = StyleSheet.create({
  root: { flex: 1 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(244,181,63,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 28, color: C.ink, textAlign: 'center', letterSpacing: -0.4, ...font('heading') },
  body: { fontSize: 16, color: C.muted, textAlign: 'center', marginTop: 16, lineHeight: 24, maxWidth: 420, ...font('body') },
  reassure: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 20, opacity: 0.8, ...font('body') },
  dots: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 4 },
  dotActive: { backgroundColor: C.green, width: 22 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 12 },
  cta: { backgroundColor: C.amber, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  ctaGreen: { backgroundColor: C.green, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, color: '#FFFFFF', ...font('bold') },
});
