// Tour guiado para null users em modo demo. Scrim com "buraco" no alvo,
// bloqueia taps fora do alvo, callout com seta. Progressivo e único por conta.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { font } from '../theme/type';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { s2 } from './strings';
import { navigationRef } from '../navigation/AppNavigator';

const WalkthroughContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────────────────
export function WalkthroughProvider({ children }) {
  const { demoMode, completeDemo } = useAuth();
  const { disclaimerAccepted, profile } = useApp();
  const [stepIdx, setStepIdx] = useState(-1); // -1 = inactive
  const [targets, setTargets] = useState({}); // { name: { x, y, w, h } }
  // Pedido pelos ecrãs quando montam: 'navegar para X foi concluído, se quiseres podes avançar'.
  const screenReachedRef = useRef('');
  // Gate: só podemos arrancar o tour quando o utilizador está na Main (disclaimer aceite + perfil pronto).
  const canStart = demoMode && disclaimerAccepted && !!profile;

  const register = useCallback((name, layout) => {
    if (!layout) return;
    setTargets(prev => ({ ...prev, [name]: layout }));
  }, []);

  const unregister = useCallback(name => {
    setTargets(prev => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const start = useCallback(() => setStepIdx(0), []);
  const next = useCallback(() => setStepIdx(i => (i < 0 ? 0 : i + 1)), []);
  // Saltar fecha o tour E marca demo_done — senão o utilizador que salta cai no mesmo
  // tour no próximo arranque; fica numa UX frustrante.
  const skip = useCallback(() => {
    setStepIdx(-2);
    try { completeDemo?.(); } catch {}
    // Depois do flag, routing vai mandar o utilizador para o Paywall na próxima navegação.
    try { navigationRef.navigate?.('Paywall', { source: 'demo_skip' }); } catch {}
  }, [completeDemo]);
  const complete = useCallback(() => setStepIdx(-2), []);

  // Dispara start automático SÓ depois do disclaimer aceite e do perfil criado (user em Main).
  // Pequeno atraso para o layout dos ecrãs estar pronto.
  useEffect(() => {
    if (canStart && stepIdx === -1) {
      const t = setTimeout(() => setStepIdx(0), 800);
      return () => clearTimeout(t);
    }
    if (!demoMode && stepIdx >= 0) setStepIdx(-1);
  }, [canStart, demoMode, stepIdx]);

  const screenReached = useCallback(name => { screenReachedRef.current = name; }, []);

  return (
    <WalkthroughContext.Provider value={{ stepIdx, targets, register, unregister, start, next, skip, complete, screenReached }}>
      {children}
    </WalkthroughContext.Provider>
  );
}

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) return { stepIdx: -1, targets: {}, register: () => {}, unregister: () => {}, start: () => {}, next: () => {}, skip: () => {}, complete: () => {}, screenReached: () => {} };
  return ctx;
}

// ─── Hook para registar um alvo via ref ──────────────────────────────────────
export function useTourTarget(name) {
  const ref = useRef(null);
  const { register, unregister, stepIdx } = useWalkthrough();
  const measure = useCallback(() => {
    if (!ref.current || typeof ref.current.measureInWindow !== 'function') return;
    ref.current.measureInWindow((x, y, w, h) => {
      if (Number.isFinite(x) && Number.isFinite(y) && w > 0 && h > 0) {
        register(name, { x, y, w, h });
      }
    });
  }, [name, register]);
  // Mede quando o tour avança (para apanhar scroll entre passos).
  useEffect(() => { if (stepIdx >= 0) measure(); }, [stepIdx, measure]);
  useEffect(() => () => unregister(name), [name, unregister]);
  return { ref, measure };
}

// ─── Steps ───────────────────────────────────────────────────────────────────
// kind: modal (centered no overlay) | spot (aponta para alvo) | screen (navega e mostra modal)
const STEPS = [
  { id: 'welcome', kind: 'modal' },
  { id: 'pill',    kind: 'spot', target: 'home.pill',  place: 'below' },
  { id: 'scan',    kind: 'spot', target: 'home.scan',  place: 'above' },
  { id: 'plate',   kind: 'spot', target: 'home.plate', place: 'above' },
  { id: 'water',   kind: 'spot', target: 'home.water', place: 'above' },
  { id: 'diary',   kind: 'screen', route: 'Plan' }, // "Plan" é a aba Dieta
  { id: 'workout', kind: 'screen', route: 'Workout' },
  { id: 'profile', kind: 'screen', route: 'Profile' },
  { id: 'done',    kind: 'screen', route: 'SalesPitch' }, // último — SalesPitch screen fecha o loop
];

// ─── Overlay (render) ────────────────────────────────────────────────────────
export function WalkthroughOverlay() {
  const { stepIdx, targets, next, skip } = useWalkthrough();
  const { language } = useApp();
  const T = s2(language);

  if (stepIdx < 0 || stepIdx >= STEPS.length) return null;
  const step = STEPS[stepIdx];
  const tr = T.tour?.[step.id] || { title: '', body: '' };
  const { width: W, height: H } = Dimensions.get('window');

  // Screen step: navega para a rota uma vez e mostra modal. Para 'done' navega para
  // o SalesPitch e fecha o tour.
  if (step.kind === 'screen') {
    // Fire-and-forget navigation. Pequeno delay garante que o navigator está pronto.
    try {
      if (step.id === 'done') {
        navigationRef.navigate?.('SalesPitch');
        // Encerra o tour: SalesPitch cuida do resto (CTA → Paywall).
        setTimeout(() => skip(), 0);
        return null;
      }
      navigationRef.navigate?.('Main', { screen: step.route });
    } catch {}
    return (
      <View style={st.full} pointerEvents="auto">
        <View style={st.scrim} />
        <View style={st.modalWrap} pointerEvents="box-none">
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>{tr.title}</Text>
            {tr.body ? <Text style={st.modalBody}>{tr.body}</Text> : null}
            <Pressable onPress={next} style={({ pressed }) => [st.cta, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <Text style={st.ctaText}>{T.tour?.next || 'Próximo'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  if (step.kind === 'modal') {
    return (
      <View style={st.full} pointerEvents="auto">
        <View style={st.scrim} />
        <View style={st.modalWrap} pointerEvents="box-none">
          <View style={st.modalCard}>
            <Text style={st.modalTitle}>{tr.title}</Text>
            <Text style={st.modalBody}>{tr.body}</Text>
            <Pressable onPress={next} style={({ pressed }) => [st.cta, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <Text style={st.ctaText}>{T.tour?.start || 'Começar'}</Text>
            </Pressable>
            <Pressable onPress={skip} style={({ pressed }) => [st.skip, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={st.skipText}>{T.tour?.skip || 'Saltar'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // Spot: 4 rects à volta do alvo (top/bottom/left/right). Alvo fica "furado".
  const tgt = targets[step.target];
  if (!tgt) {
    // Alvo ainda não medido: escurece tudo e espera 1 tick.
    return <View style={st.full} pointerEvents="auto"><View style={st.scrim} /></View>;
  }
  const pad = 8; // folga à volta do alvo
  const hx = Math.max(0, tgt.x - pad);
  const hy = Math.max(0, tgt.y - pad);
  const hw = Math.min(W - hx, tgt.w + pad * 2);
  const hh = Math.min(H - hy, tgt.h + pad * 2);
  const below = step.place === 'below';
  const calloutTop = below ? hy + hh + 16 : hy - 170;
  const calloutMaxH = 150;

  return (
    <View style={st.full} pointerEvents="box-none">
      {/* Top */}
      <Pressable style={[st.rect, { left: 0, top: 0, width: W, height: hy }]} onPress={() => {}} />
      {/* Bottom */}
      <Pressable style={[st.rect, { left: 0, top: hy + hh, width: W, height: Math.max(0, H - (hy + hh)) }]} onPress={() => {}} />
      {/* Left */}
      <Pressable style={[st.rect, { left: 0, top: hy, width: hx, height: hh }]} onPress={() => {}} />
      {/* Right */}
      <Pressable style={[st.rect, { left: hx + hw, top: hy, width: Math.max(0, W - (hx + hw)), height: hh }]} onPress={() => {}} />
      {/* Highlight ring (sem apanhar tap, deixa passar para o alvo real) */}
      <View pointerEvents="none" style={[st.ring, { left: hx, top: hy, width: hw, height: hh }]} />
      {/* Arrow */}
      <View pointerEvents="none" style={[st.arrow, { left: Math.max(16, Math.min(W - 32, hx + hw / 2 - 8)), top: below ? hy + hh + 2 : hy - 12 }, below ? st.arrowDown : st.arrowUp]} />
      {/* Callout */}
      <View pointerEvents="box-none" style={[st.calloutWrap, { top: calloutTop, maxHeight: calloutMaxH }]}>
        <View style={st.callout}>
          <Text style={st.calloutTitle}>{tr.title}</Text>
          {tr.body ? <Text style={st.calloutBody}>{tr.body}</Text> : null}
          <View style={st.calloutRow}>
            <Pressable onPress={skip} style={({ pressed }) => [st.ghostBtn, { opacity: pressed ? 0.6 : 1 }]}>
              <Text style={st.ghostBtnText}>{T.tour?.skip || 'Saltar'}</Text>
            </Pressable>
            <Pressable onPress={next} style={({ pressed }) => [st.nextBtn, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
              <Text style={st.nextBtnText}>{T.tour?.next || 'Próximo'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  full: { ...StyleSheet.absoluteFillObject, zIndex: 9999, elevation: 9999 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.70)' },
  rect: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.70)' },
  ring: { position: 'absolute', borderWidth: 3, borderColor: '#16A75A', borderRadius: 14, backgroundColor: 'transparent' },
  arrow: { position: 'absolute', width: 16, height: 10, backgroundColor: 'transparent' },
  arrowDown: { borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#FFFFFF' },
  arrowUp: { borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#FFFFFF' },
  calloutWrap: { position: 'absolute', left: 20, right: 20 },
  callout: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  calloutTitle: { fontSize: 16, color: '#0E1B14', ...font('bold') },
  calloutBody: { fontSize: 14, color: '#5F6E66', marginTop: 6, lineHeight: 20, ...font('body') },
  calloutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 },
  ghostBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  ghostBtnText: { fontSize: 13, color: '#5F6E66', ...font('bold') },
  nextBtn: { backgroundColor: '#16A75A', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  nextBtnText: { fontSize: 14, color: '#FFFFFF', ...font('bold') },
  modalWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, width: '100%', maxWidth: 360, alignItems: 'center' },
  modalTitle: { fontSize: 22, color: '#0E1B14', textAlign: 'center', ...font('heading') },
  modalBody: { fontSize: 15, color: '#5F6E66', textAlign: 'center', marginTop: 10, lineHeight: 22, ...font('body') },
  cta: { backgroundColor: '#16A75A', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, marginTop: 20, width: '100%', alignItems: 'center' },
  ctaText: { fontSize: 15, color: '#FFFFFF', ...font('bold') },
  skip: { marginTop: 12, padding: 8 },
  skipText: { fontSize: 13, color: '#5F6E66', ...font('bold') },
});
