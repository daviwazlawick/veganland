// O boneco da V2: uma figura humana de frente, desenhada por parâmetros.
// sex 0 (homem) a 1 (mulher), fat 0 a 1, muscle 0 a 1, belly 0 a 1, height 0,9 a 1,1.
// Como é tudo conta, o mesmo desenho serve pro onboarding (ele engorda, cresce e ganha
// ombro conforme a pessoa responde), pras silhuetas de escolha e pro guia de medida.
import React from 'react';
import Svg, { Path, Ellipse, Circle, G, Defs, ClipPath, Rect, Line, Text as SvgText } from 'react-native-svg';

const FEET = 392;

function clamp(v, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, v)); }

// Catmull-Rom fechado → cúbicas.
function closedSmooth(pts) {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

// Faixa em volta de uma linha central (braço, perna), com ponta arredondada embaixo.
function ribbon(center) {
  const left = [], right = [];
  for (let i = 0; i < center.length; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(center.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    const nx = dy / len, ny = -dx / len;
    left.push([center[i].x - nx * center[i].w, center[i].y - ny * center[i].w]);
    right.push([center[i].x + nx * center[i].w, center[i].y + ny * center[i].w]);
  }
  const end = center[center.length - 1], start = center[0];
  return closedSmooth([[start.x, start.y - start.w * 0.8], ...left, [end.x, end.y + end.w * 0.9], ...right.reverse()]);
}

export function figureGeometry(p = {}) {
  const sex = clamp(p.sex ?? 0), fat = clamp(p.fat ?? 0.3), mus = clamp(p.muscle ?? 0.3), belly = clamp(p.belly ?? 0);
  const hs = clamp(p.height ?? 1, 0.85, 1.12);
  const ws = 1 + (hs - 1) * 0.35;
  const X = x => 100 + x * ws;
  const Y = y => FEET - (FEET - y) * hs;

  const nk = 8.5 + fat * 3 + mus * 3 - sex * 1.5;
  const sh = 37 + mus * 9 + fat * 5 - sex * 6;
  const ch = 31 + mus * 6 + fat * 9 - sex * 3;
  const wa = 24 + fat * 15 + belly * 8 - sex * 4 - mus * 2.5;
  const be = 26 + fat * 17 + belly * 15 - sex * 3;
  const hi = 29 + fat * 11 + sex * 7 + mus * 1;

  const right = [[0, 64], [nk, 68], [nk + 0.5, 81], [nk + 11 + mus * 3, 88], [sh - 6, 94], [sh, 105], [sh - 4, 121],
    [ch + sex * 3, 131], [wa, 166], [be, 189], [hi, 210], [hi - 2, 228], [0, 237]];
  const torsoPts = [...right, ...right.slice(1, -1).reverse().map(([x, y]) => [-x, y])]
    .map(([x, y]) => [X(x), Y(y)]);
  const torso = closedSmooth(torsoPts);

  const thigh = 14.5 + fat * 8 + mus * 4 + sex * 3;
  const knee = 9.2 + fat * 3 + mus * 0.8;
  const calf = 10 + mus * 3.2 + fat * 3.5;
  const ankle = 5.4 + fat;
  const legs = [-1, 1].map(s => {
    const top = s * hi * 0.5, bot = s * (hi * 0.3 + 2);
    const at = k => top + (bot - top) * k;
    const c = [
      { x: X(at(0)), y: Y(214), w: hi * 0.5 + 1 },
      { x: X(at(0.2)), y: Y(252), w: thigh },
      { x: X(at(0.5)), y: Y(302), w: knee },
      { x: X(at(0.68)), y: Y(334), w: calf },
      { x: X(at(0.92)), y: Y(374), w: ankle },
      { x: X(at(1)), y: Y(384), w: ankle },
    ];
    return { d: ribbon(c), c, s, foot: { cx: X(bot + s * 4), cy: Y(389), rx: 10 * ws, ry: 4.5 } };
  });

  const arms = [-1, 1].map(s => {
    const sx = sh - 4, wx = Math.max(sh + 10, be + 11) + fat * 3;
    const at = (y) => s * (sx + (wx - sx) * ((y - 100) / 130));
    const c = [
      { x: X(at(98)), y: Y(98), w: 9 + mus * 3 + fat * 2 },
      { x: X(at(112)), y: Y(112), w: 10.5 + mus * 4.5 + fat * 2.5 },
      { x: X(at(142)), y: Y(142), w: 8.6 + mus * 4.5 + fat * 4.5 },
      { x: X(at(172)), y: Y(172), w: 6.8 + fat * 2.5 },
      { x: X(at(192)), y: Y(192), w: 7.6 + mus * 2 + fat * 2 },
      { x: X(at(228)), y: Y(228), w: 4.8 + fat },
    ];
    return { d: ribbon(c), c, s, hand: { cx: X(at(244)), cy: Y(244), rx: 6.5, ry: 11 } };
  });

  const head = { cx: X(0), cy: Y(44), rx: 16.5 - sex * 1, ry: 20.5 };
  const bun = sex > 0.5 ? { cx: X(0), cy: Y(22), r: 8 } : null;

  // Onde a fita passa em cada medida: centro, meia largura.
  const R = arms[1].c, L = legs[1].c;
  const tapes = {
    neck:  { x: X(0), y: Y(76), rx: (nk + 3) * ws },
    chest: { x: X(0), y: Y(124), rx: (Math.max(ch, sh - 4) + 3) * ws },
    waist: { x: X(0), y: Y(166), rx: (wa + 3) * ws },
    hips:  { x: X(0), y: Y(210), rx: (hi + 3) * ws },
    arm:   { x: R[2].x, y: R[2].y, rx: R[2].w + 3 },
    thigh: { x: L[1].x, y: L[1].y, rx: L[1].w + 3 },
    calf:  { x: L[3].x, y: L[3].y, rx: L[3].w + 3 },
  };

  return { torso, legs, arms, head, bun, tapes, X, Y, sh, ch, wa, hi, ws };
}

// Parâmetros a partir das respostas do onboarding.
export function paramsFromAnswers(a = {}) {
  const sex = a.sex === 'female' ? 1 : 0;
  const h = Number(a.height_cm) || (sex ? 163 : 176);
  const w = Number(a.weight_kg) || (sex ? 62 : 78);
  const bmi = w / ((h / 100) ** 2);
  const base = SILHOUETTES.find(s => s.id === a.silhouette);
  const fatFromBmi = clamp((bmi - (sex ? 18 : 19)) / 17);
  return {
    sex,
    height: 1 + (h - (sex ? 163 : 176)) / 176,
    fat: base ? base.fat : fatFromBmi,
    muscle: base ? base.muscle : (a.experience === 'advanced' ? 0.6 : a.experience === 'solid' ? 0.45 : 0.28),
    belly: base ? base.belly : clamp((bmi - 26) / 12) * 0.6,
  };
}

export function goalParams(p, goal) {
  if (goal === 'lose') return { ...p, fat: clamp(p.fat - 0.3), belly: clamp(p.belly - 0.4) };
  if (goal === 'gain') return { ...p, muscle: clamp(p.muscle + 0.35), fat: clamp(p.fat + 0.03) };
  if (goal === 'recomp') return { ...p, fat: clamp(p.fat - 0.2), belly: clamp(p.belly - 0.35), muscle: clamp(p.muscle + 0.25) };
  return { ...p, fat: clamp(p.fat - 0.08), belly: clamp(p.belly - 0.15), muscle: clamp(p.muscle + 0.08) };
}

export const SILHOUETTES = [
  { id: 'slim',     fat: 0.04, muscle: 0.08, belly: 0 },
  { id: 'lean',     fat: 0.14, muscle: 0.38, belly: 0 },
  { id: 'athletic', fat: 0.2,  muscle: 0.88, belly: 0 },
  { id: 'average',  fat: 0.42, muscle: 0.25, belly: 0.15 },
  { id: 'belly',    fat: 0.55, muscle: 0.3,  belly: 0.85 },
  { id: 'heavy',    fat: 0.95, muscle: 0.3,  belly: 0.6 },
];

const FOCUS_SHAPES = {
  chest: 'chest', shoulders: 'shoulders', arms: 'arms', abs: 'abs', back: 'back',
  glutes: 'glutes', thighs: 'thighs', calves: 'calves',
};

export default function Figure({
  params, width = 200, height = 400, id = 'f', color = '#16A75A', limbColor, accent = '#E8991C',
  highlight = [], highlightOpacity = 0.95, tape = null, tapePhase = 0, tapeLabel = null, outline = false, labelColor,
  scan = null, viewBox = "0 0 200 400",
}) {
  const g = figureGeometry(params);
  const limb = limbColor || color;
  const fillProps = outline
    ? { fill: 'none', stroke: color, strokeWidth: 2, strokeDasharray: '5 4' }
    : { fill: color };
  const limbProps = outline ? fillProps : { fill: limb };
  const hl = new Set(highlight.map(h => FOCUS_SHAPES[h]).filter(Boolean));
  const clipTorso = `${id}-torso`;
  const t = tape ? g.tapes[tape] : null;

  return (
    <Svg width={width} height={height} viewBox={viewBox}>
      <Defs>
        <ClipPath id={clipTorso}><Path d={g.torso} /></ClipPath>
      </Defs>

      {/* Braços atrás do tronco, um tom abaixo, pra ler profundidade. */}
      {g.arms.map(a => (
        <G key={`a${a.s}`}>
          <Path d={a.d} {...limbProps} />
          <Ellipse cx={a.hand.cx} cy={a.hand.cy} rx={a.hand.rx} ry={a.hand.ry} {...limbProps} />
          {hl.has('arms') && !outline && <Path d={a.d} fill={accent} opacity={highlightOpacity} />}
        </G>
      ))}
      {g.legs.map(l => (
        <G key={`l${l.s}`}>
          <Path d={l.d} {...fillProps} />
          <Ellipse cx={l.foot.cx} cy={l.foot.cy} rx={l.foot.rx} ry={l.foot.ry} {...fillProps} />
        </G>
      ))}
      <Path d={g.torso} {...fillProps} />
      {g.bun && <Circle cx={g.bun.cx} cy={g.bun.cy} r={g.bun.r} {...fillProps} />}
      <Ellipse cx={g.head.cx} cy={g.head.cy} rx={g.head.rx} ry={g.head.ry} {...fillProps} />

      {!outline && hl.size > 0 && (
        <G>
          {hl.has('back') && <Path d={g.torso} fill="none" stroke={accent} strokeWidth={5} opacity={highlightOpacity} />}
          <G clipPath={`url(#${clipTorso})`}>
            {hl.has('chest') && [-1, 1].map(s => (
              <Ellipse key={s} cx={g.X(s * 15)} cy={g.Y(124)} rx={15 * g.ws} ry={11} fill={accent} opacity={highlightOpacity} />
            ))}
            {hl.has('abs') && <Rect x={g.X(-13)} y={g.Y(140)} width={26 * g.ws} height={56} rx={9} fill={accent} opacity={highlightOpacity} />}
            {hl.has('glutes') && <Rect x={g.X(-g.hi - 4)} y={g.Y(200)} width={(g.hi + 4) * 2 * g.ws} height={40} fill={accent} opacity={highlightOpacity} />}
          </G>
          {hl.has('shoulders') && [-1, 1].map(s => (
            <Circle key={s} cx={g.X(s * (g.sh - 6))} cy={g.Y(104)} r={10.5} fill={accent} opacity={highlightOpacity} />
          ))}
          {(hl.has('thighs') || hl.has('calves')) && g.legs.map(l => {
            const c = l.c;
            const part = [];
            if (hl.has('thighs')) part.push(c[0], c[1], { ...c[2], w: c[2].w * 0.9 });
            const thighD = part.length ? ribbonPart(part) : null;
            const calfD = hl.has('calves') ? ribbonPart([{ ...c[2], y: c[2].y + 10, w: c[2].w * 0.95 }, c[3], { ...c[4], w: c[4].w * 1.2 }]) : null;
            return (
              <G key={`h${l.s}`}>
                {thighD && <Path d={thighD} fill={accent} opacity={highlightOpacity} />}
                {calfD && <Path d={calfD} fill={accent} opacity={highlightOpacity} />}
              </G>
            );
          })}
        </G>
      )}

      {scan != null && (
        <Rect x={0} y={g.Y(18) + (FEET - g.Y(18)) * scan - 1.5} width={200} height={3} fill={accent} opacity={0.9} />
      )}

      {t && <Tape t={t} phase={tapePhase} accent={accent} label={tapeLabel} labelColor={labelColor || accent} />}
    </Svg>
  );
}

function ribbonPart(c) { return ribbon(c); }

// Fita métrica dando a volta: a metade de trás tracejada, a da frente correndo.
function Tape({ t, phase, accent, label, labelColor }) {
  const { x, y, rx } = t;
  const ry = Math.max(4, rx * 0.16);
  const front = `M${x - rx},${y} A${rx},${ry} 0 0 0 ${x + rx},${y}`;
  const back = `M${x - rx},${y} A${rx},${ry} 0 0 1 ${x + rx},${y}`;
  const len = Math.PI * rx;
  const draw = Math.min(1, phase * 1.6);
  const pulse = 0.35 + 0.35 * Math.sin(phase * Math.PI * 2);
  const labelX = x + rx + 10 > 170 ? x - rx - 10 : x + rx + 10;
  const anchor = x + rx + 10 > 170 ? 'end' : 'start';
  return (
    <G>
      <Ellipse cx={x} cy={y} rx={rx + 5} ry={ry + 5} fill={accent} opacity={pulse * 0.35} />
      <Path d={back} fill="none" stroke={accent} strokeWidth={2} strokeDasharray="3 3" opacity={0.7} />
      <Path d={front} fill="none" stroke={accent} strokeWidth={4.5} strokeLinecap="round"
        strokeDasharray={`${len * draw} ${len}`} />
      {/* marquinhas da fita */}
      {draw >= 1 && [0.2, 0.35, 0.5, 0.65, 0.8].map(k => {
        const a = Math.PI * k;
        const px = x - rx * Math.cos(a), py = y + ry * Math.sin(a);
        return <Line key={k} x1={px} y1={py - 2.5} x2={px} y2={py + 2.5} stroke="#FFFFFF" strokeWidth={1} opacity={0.9} />;
      })}
      {label ? (
        <SvgText x={labelX} y={y + 4} fontSize={12} fontFamily="Archivo_800ExtraBold, Archivo, sans-serif" fill={labelColor} textAnchor={anchor}>{label}</SvgText>
      ) : null}
    </G>
  );
}
