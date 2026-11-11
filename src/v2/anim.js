// Movimento da V2. Tudo por requestAnimationFrame em JS: funciona igual no web e no
// nativo, e o SVG do boneco pode ser redesenhado a cada quadro sem depender de
// setNativeProps do react-native-svg (que no web não anima prop de path).
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export const reducedMotion = (() => {
  try {
    return Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  } catch { return false; }
})();

// Ease-out forte (o mesmo papel do cubic-bezier(.16,1,.3,1)).
export const easeOut = t => 1 - Math.pow(1 - t, 4);
export const easeInOut = t => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2);

function lerpValue(a, b, k) {
  if (typeof b === 'number') return (typeof a === 'number' ? a : b) + (b - (typeof a === 'number' ? a : b)) * k;
  if (Array.isArray(b)) return b.map((v, i) => lerpValue(a?.[i], v, k));
  const out = {};
  for (const key of Object.keys(b)) out[key] = lerpValue(a?.[key], b[key], k);
  return out;
}

// Anima de onde está até `target` (número ou objeto de números).
export function useTween(target, ms = 520, ease = easeOut) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const curRef = useRef(target);
  const key = JSON.stringify(target);
  useEffect(() => {
    if (reducedMotion || ms <= 0) { curRef.current = target; setValue(target); return; }
    fromRef.current = curRef.current;
    let raf; const t0 = Date.now();
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / ms);
      const v = lerpValue(fromRef.current, target, ease(k));
      curRef.current = v; setValue(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [key]);
  return value;
}

// Fase 0..1 que gira sem parar enquanto `active`.
export function useLoop(periodMs = 1600, active = true) {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    if (!active || reducedMotion) { setPhase(0.25); return; }
    let raf; const t0 = Date.now();
    const tick = () => { setPhase(((Date.now() - t0) % periodMs) / periodMs); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [periodMs, active]);
  return phase;
}

// Conta de 0 até n quando n muda (números da revelação do plano).
export function useCountUp(n, ms = 1100) {
  const v = useTween(n || 0, ms);
  return Math.round(v);
}

// Mistura duas cores hex.
export function mixHex(a, b, k) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const m = s => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * k);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
}

// Cor que desliza até a próxima quando muda.
export function useColorTween(hex, ms = 600) {
  const [color, setColor] = useState(hex);
  const curRef = useRef(hex);
  useEffect(() => {
    const from = curRef.current;
    if (from === hex) return;
    if (reducedMotion) { curRef.current = hex; setColor(hex); return; }
    let raf; const t0 = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      const c = mixHex(from, hex, easeInOut(p));
      curRef.current = c; setColor(c);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [hex]);
  return color;
}
