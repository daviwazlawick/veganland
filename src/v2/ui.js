// Peças de interface da V2: opção grande, chip, régua de número e botão.
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, PanResponder, TextInput, Platform, StyleSheet } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { font } from '../theme/type';
import { useTween } from './anim';

const press = ({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }];

export function Choice({ title, sub, selected, onPress, fg, accent, surface }) {
  const k = useTween(selected ? 1 : 0, 180);
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }} style={press}>
      <View style={[st.choice, {
        backgroundColor: selected ? accent : surface,
        borderColor: selected ? accent : 'transparent',
      }]}>
        <View style={{ flex: 1 }}>
          <Text style={[st.choiceTitle, { color: selected ? '#FFFFFF' : fg }]}>{title}</Text>
          {sub ? <Text style={[st.choiceSub, { color: selected ? 'rgba(255,255,255,0.85)' : fg, opacity: selected ? 1 : 0.68 }]}>{sub}</Text> : null}
        </View>
        <View style={[st.dot, { borderColor: selected ? '#FFFFFF' : fg, opacity: selected ? 1 : 0.35 }]}>
          <View style={[st.dotIn, { transform: [{ scale: k }], backgroundColor: '#FFFFFF' }]} />
        </View>
      </View>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, fg, accent, surface, big }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} style={press}>
      <View style={[big ? st.chipBig : st.chip, { backgroundColor: selected ? accent : surface }]}>
        <Text style={[big ? st.chipBigText : st.chipText, { color: selected ? '#FFFFFF' : fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled, bg, fg, style }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled }}
      style={(s) => [press(s), style]}>
      <View style={[st.btn, { backgroundColor: bg, opacity: disabled ? 0.35 : 1 }]}>
        <Text style={[st.btnText, { color: fg }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

// Régua: número gigante em cima (dá pra digitar), régua arrastável embaixo, − e +.
export function Ruler({ value, onChange, min, max, step = 1, unit, fg, accent, width = 320, decimals = 0 }) {
  const PPU = step < 1 ? 14 : 9; // pixels por passo
  const valRef = useRef(value);
  const startRef = useRef(value);
  valRef.current = value;
  const [text, setText] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setText(fmt(value, decimals)); }, [value, editing]);

  const clampSnap = v => {
    const snapped = Math.round(v / step) * step;
    return Math.min(max, Math.max(min, Number(snapped.toFixed(2))));
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => { startRef.current = valRef.current; },
    onPanResponderMove: (_, g) => {
      const v = clampSnap(startRef.current - (g.dx / PPU) * step);
      if (v !== valRef.current) onChange(v);
    },
  })).current;

  const ticks = [];
  const span = Math.ceil(width / 2 / PPU) + 1;
  const center = Math.round(value / step);
  for (let i = center - span; i <= center + span; i++) {
    const v = i * step;
    if (v < min - 1e-6 || v > max + 1e-6) continue;
    const x = width / 2 + (v - value) / step * PPU;
    const whole = Math.abs(v - Math.round(v)) < 1e-6;
    const major = whole && Math.round(v) % (step < 1 ? 5 : 10) === 0;
    const mid = whole && !major && Math.round(v) % 5 === 0 && step >= 1;
    ticks.push({ x, v, major, mid, whole });
  }

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={st.numRow}>
        <Pressable accessibilityLabel="menos" onPress={() => onChange(clampSnap(value - step))} style={press} hitSlop={8}>
          <View style={[st.round, { borderColor: fg }]}><Text style={[st.roundText, { color: fg }]}>−</Text></View>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginHorizontal: 14 }}>
          <TextInput
            value={text}
            onFocus={() => setEditing(true)}
            onBlur={() => { setEditing(false); const n = parseFloat(String(text).replace(',', '.')); if (Number.isFinite(n)) onChange(clampSnap(n)); }}
            onChangeText={tx => { setText(tx); const n = parseFloat(tx.replace(',', '.')); if (Number.isFinite(n) && n >= min && n <= max) onChange(clampSnap(n)); }}
            keyboardType="decimal-pad"
            inputMode="decimal"
            accessibilityLabel={unit}
            selectTextOnFocus
            style={[st.bigNum, { color: fg, width: Math.max(2, String(text).length) * 50 + 8 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
          />
          <Text style={[st.unit, { color: fg }]}>{unit}</Text>
        </View>
        <Pressable accessibilityLabel="mais" onPress={() => onChange(clampSnap(value + step))} style={press} hitSlop={8}>
          <View style={[st.round, { borderColor: fg }]}><Text style={[st.roundText, { color: fg }]}>+</Text></View>
        </Pressable>
      </View>
      <View {...responder.panHandlers} style={[{ width, height: 64 }, Platform.OS === 'web' ? { cursor: 'ew-resize', touchAction: 'none', userSelect: 'none' } : null]}>
        <Svg width={width} height={64}>
          {ticks.map(t => (
            <Line key={t.v} x1={t.x} x2={t.x} y1={t.major ? 8 : t.mid ? 16 : 22} y2={44}
              stroke={fg} strokeWidth={t.major ? 2 : 1} opacity={t.major ? 0.8 : t.whole ? 0.4 : 0.22} />
          ))}
          {ticks.filter(t => t.major).map(t => (
            <SvgText key={`l${t.v}`} x={t.x} y={60} fontSize={11} fill={fg} opacity={0.6} textAnchor="middle">{Math.round(t.v)}</SvgText>
          ))}
          <Line x1={width / 2} x2={width / 2} y1={2} y2={48} stroke={accent} strokeWidth={3.5} strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}

function fmt(v, decimals) {
  if (decimals === 0) return String(Math.round(v));
  return Number.isInteger(v) ? String(v) : v.toFixed(decimals).replace('.', ',');
}

const st = StyleSheet.create({
  choice: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 18, paddingVertical: 15, paddingHorizontal: 18,
    marginBottom: 10, borderWidth: 2,
  },
  choiceTitle: { fontSize: 17, ...font('bold') },
  choiceSub: { fontSize: 13.5, marginTop: 2, ...font('body') },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  dotIn: { width: 10, height: 10, borderRadius: 5 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 15, ...font('bodyBold') },
  chipBig: { minWidth: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginBottom: 10, paddingHorizontal: 14 },
  chipBigText: { fontSize: 24, ...font('display') },
  btn: { height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  btnText: { fontSize: 17, ...font('bold') },
  numRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  bigNum: { fontSize: 84, lineHeight: 92, textAlign: 'center', padding: 0, ...font('display') },
  unit: { fontSize: 20, marginBottom: 16, marginLeft: 4, opacity: 0.7, ...font('bold') },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', opacity: 0.8 },
  roundText: { fontSize: 24, lineHeight: 26, ...font('bodyMed') },
});
