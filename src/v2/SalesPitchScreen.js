// Ecrã final do demo mode: discurso de vendas antes do paywall. Ao tocar no CTA,
// marca o demo como concluído e navega para o Paywall. "Saltar" faz o mesmo.
import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { font } from '../theme/type';
import { s2 } from './strings';

const C = { bg: '#0E1B14', card: '#1A2A22', ink: '#FFFFFF', muted: '#C9D4CD', green: '#2FC472', amber: '#F4B53F' };

export default function SalesPitchScreen({ navigation }) {
  const { language } = useApp();
  const { user, completeDemo } = useAuth();
  const T = s2(language);
  const insets = useSafeAreaInsets();
  const pitch = T.pitch || {};

  async function startTrial() {
    await completeDemo?.();
    navigation.reset({ index: 0, routes: [{ name: 'Paywall', params: { source: 'demo_done', currentPlan: user?.user_type || 'free' } }] });
  }

  const bullets = pitch.bullets || [];

  return (
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 32 + insets.bottom, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 480 }}>
          <View style={st.sparkleWrap}>
            <Ionicons name="sparkles" size={44} color={C.amber} />
          </View>
          <Text style={st.h1}>{pitch.title || 'Agora é contigo'}</Text>
          {pitch.sub ? <Text style={st.sub}>{pitch.sub}</Text> : null}

          <View style={st.bullets}>
            {bullets.map((b, i) => (
              <View key={i} style={st.bullet}>
                <View style={st.check}><Ionicons name="checkmark" size={16} color="#FFFFFF" /></View>
                <Text style={st.bulletText}>{b}</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={startTrial} style={({ pressed }) => [st.cta, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Text style={st.ctaText}>{pitch.cta || 'Start my free trial'}</Text>
          </Pressable>
          <Text style={st.reassure}>{pitch.reassure}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  sparkleWrap: { alignItems: 'center', marginBottom: 20 },
  h1: { fontSize: 32, color: C.ink, textAlign: 'center', letterSpacing: -0.6, ...font('heading') },
  sub: { fontSize: 16, color: C.muted, textAlign: 'center', marginTop: 12, lineHeight: 24, ...font('body') },
  bullets: { marginTop: 32, marginBottom: 32 },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: 15, color: C.ink, lineHeight: 22, ...font('bodyMed') },
  cta: { backgroundColor: C.green, paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 8 },
  ctaText: { fontSize: 17, color: '#FFFFFF', ...font('bold') },
  reassure: { fontSize: 12.5, color: C.muted, textAlign: 'center', marginTop: 14, lineHeight: 18, opacity: 0.8, ...font('body') },
});
