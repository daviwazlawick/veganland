// Cálculo único do NovaQI Score e da análise corporal derivada, usado pela
// Home e pelo EditPersonal. Valores manuais ganham; a última análise por foto
// preenche as lacunas. Devolve null se não há perímetro, % de gordura ou foto.

const BA_FIELD_MAP = {
  waist_cm: 'waist_cm', hips_cm: 'hip_cm', chest_cm: 'chest_cm',
  arm_cm: 'bicep_cm', forearm_cm: 'forearm_cm', thigh_cm: 'thigh_cm',
  calf_cm: 'calf_cm', neck_cm: 'neck_cm', body_fat_pct: 'body_fat_pct',
};

// Chaves do formulário de medidas -> valores (string) vindos do último registo
// manual, completados pela última análise por foto.
export function buildMeasures(latest, ba) {
  const filled = {};
  if (latest) {
    Object.keys(BA_FIELD_MAP).forEach((key) => {
      if (latest[key] != null) filled[key] = String(latest[key]);
    });
  }
  if (ba) {
    Object.entries(BA_FIELD_MAP).forEach(([key, baKey]) => {
      if (filled[key] == null && ba[baKey] != null) filled[key] = String(ba[baKey]);
    });
  }
  return filled;
}

export function computeBodyAnalysis({ bodyMeasurements, measures, height, weight, birthDate, sex, bodyProfile }) {
  const ba  = bodyMeasurements[0] || {};
  const h   = parseFloat(height);
  const w   = parseFloat(weight);
  const hm  = h > 50 ? h / 100 : null;
  const sx  = bodyProfile?.sex || sex || 'female';

  // Manual values win; photo analysis fills gaps
  const chest   = parseFloat(measures.chest_cm)     || ba.chest_cm     || null;
  const neck    = parseFloat(measures.neck_cm)      || ba.neck_cm      || null;
  const bicep   = parseFloat(measures.arm_cm)       || ba.bicep_cm     || null;
  const forearm = parseFloat(measures.forearm_cm)   || ba.forearm_cm   || null;
  const waist   = parseFloat(measures.waist_cm)     || ba.waist_cm     || null;
  const hip     = parseFloat(measures.hips_cm)      || ba.hip_cm       || null;
  const thigh   = parseFloat(measures.thigh_cm)     || ba.thigh_cm     || null;
  const calf    = parseFloat(measures.calf_cm)      || ba.calf_cm      || null;

  // Indices — fully recomputed from current values
  const bmi_v = hm && w > 0         ? +(w / (hm * hm)).toFixed(1)                                      : (ba.bmi             || null);

  // Body fat: (1) manual override, (2) US Navy from perimeters + height,
  // (3) Deurenberg BMI+age fallback, (4) last photo analysis. Mirrors the
  // server-side pipeline in body_analysis.py:1352-1395 so a user who only
  // tapes waist/neck (+hip for female) gets full body composition without
  // needing a photo. bf_source is exposed so the UI can label the value.
  let bf = parseFloat(measures.body_fat_pct);
  let bf_source = null;
  if (!isNaN(bf) && bf > 0) {
    bf_source = 'manual';
  } else {
    bf = null;
    if (waist && neck && h > 0) {
      let calc = null;
      try {
        if (sx === 'male') {
          const diff = waist - neck;
          if (diff > 0) calc = 86.01 * Math.log10(diff) - 70.041 * Math.log10(h) + 36.76;
        } else if (hip) {
          const diff = waist + hip - neck;
          if (diff > 0) calc = 163.205 * Math.log10(diff) - 97.684 * Math.log10(h) - 78.387;
        }
      } catch {}
      if (calc != null && isFinite(calc)) {
        bf = Math.max(3, Math.min(60, +calc.toFixed(1)));
        bf_source = 'navy';
      }
    }
    if (bf == null && bmi_v && birthDate) {
      const age = Math.floor((Date.now() - new Date(birthDate)) / (365.25 * 86400000));
      if (age > 0 && age < 120) {
        const calc = 1.20 * bmi_v + 0.23 * age - 10.8 * (sx === 'male' ? 1 : 0) - 5.4;
        if (isFinite(calc)) {
          bf = Math.max(3, Math.min(60, +calc.toFixed(1)));
          bf_source = 'deurenberg';
        }
      }
    }
    if (bf == null && ba.body_fat_pct != null) {
      bf = Number(ba.body_fat_pct);
      bf_source = 'photo';
    }
  }

  const wth_v = h > 0 && waist      ? +(waist / h).toFixed(2)                                           : (ba.waist_to_height || null);
  const whi_v = waist && hip        ? +(waist / hip).toFixed(2)                                         : (ba.waist_to_hip    || null);
  const ci_v  = hm && w > 0 && waist? +((waist / 100) / (0.109 * Math.sqrt(w / hm))).toFixed(2)        : (ba.conicity_index  || null);

  // Body composition — recomputed from bf% + weight
  const fmk_v = bf && w > 0  ? +(w * bf / 100).toFixed(1)          : (ba.fat_mass_kg    || null);
  const lmk_v = bf && w > 0  ? +(w * (1 - bf / 100)).toFixed(1)    : (ba.lean_mass_kg   || null);
  const fmi_v = fmk_v && hm  ? +(fmk_v / (hm * hm)).toFixed(1)    : (ba.fat_mass_index || null);
  const lmi_v = lmk_v && hm  ? +(lmk_v / (hm * hm)).toFixed(1)    : (ba.lean_mass_index|| null);
  const bwl_v = lmk_v        ? +(lmk_v * 0.723).toFixed(1)         : (ba.body_water_l   || null);
  const bwp_v = bwl_v && w > 0 ? +(bwl_v / w * 100).toFixed(1)    : (ba.body_water_pct || null);
  const ree_v = lmk_v        ? Math.round(500 + 22 * lmk_v)        : (ba.ree_kcal       || null);

  // NovaQI score — same formula as body_analysis.py (6 indicators, 100/6 pts each)
  function _pts(ok, border = false) { return ok ? 100 / 6 : border ? 50 / 6 : 0; }
  let score_pts = 0, n_avail = 0;
  if (bf != null)    { n_avail++; score_pts += sx === 'male' ? _pts(bf < 25, bf >= 25 && bf < 30)             : _pts(bf < 32, bf >= 32 && bf < 38); }
  if (lmi_v != null) { n_avail++; const th = sx === 'male' ? 14.6 : 11.8; score_pts += _pts(lmi_v >= th, lmi_v >= th - 2 && lmi_v < th); }
  if (fmi_v != null) { n_avail++; const th = sx === 'male' ? 6.0 : 9.0;   score_pts += _pts(fmi_v < th, fmi_v >= th && fmi_v < th + 2.5); }
  if (wth_v != null) { n_avail++; score_pts += _pts(wth_v < 0.5, wth_v >= 0.5 && wth_v < 0.6); }
  if (whi_v != null) { n_avail++; const th = sx === 'male' ? 0.90 : 0.85;  score_pts += _pts(whi_v < th, whi_v >= th && whi_v < th + 0.1); }
  if (ci_v  != null) { n_avail++; score_pts += _pts(ci_v < 1.18, ci_v >= 1.18 && ci_v < 1.30); }
  const score_v = n_avail > 0 ? Math.round(score_pts / n_avail * 6) : (ba.score || null);

  // Only render the analysis panel if the user actually did a body scan or
  // typed at least one perimeter / body-fat number. Having just a BMI
  // (computed automatically from height+weight entered at onboarding)
  // isn't enough — otherwise every new user sees a "Body Analysis" panel
  // populated with Deurenberg-estimated body fat and waist-to-height
  // ratios that come from nowhere real, which is misleading.
  const hasPerimeterMeasurement = [chest, neck, bicep, forearm, waist, hip, thigh, calf]
    .some(v => v != null && Number(v) > 0);
  const hasManualBodyFat = parseFloat(measures.body_fat_pct) > 0;
  const hasPhotoScan = bodyMeasurements[0] != null;
  if (!hasPerimeterMeasurement && !hasManualBodyFat && !hasPhotoScan) return null;

  return {
    ...ba,
    chest_cm: chest, neck_cm: neck, bicep_cm: bicep, forearm_cm: forearm,
    waist_cm: waist, hip_cm: hip, thigh_cm: thigh, calf_cm: calf,
    body_fat_pct: bf,
    bf_source,
    bmi: bmi_v, waist_to_height: wth_v, waist_to_hip: whi_v, conicity_index: ci_v,
    fat_mass_kg: fmk_v, lean_mass_kg: lmk_v,
    fat_mass_index: fmi_v, lean_mass_index: lmi_v,
    body_water_pct: bwp_v, ree_kcal: ree_v,
    score: score_v,
  };
}

// Faixa do score; as etiquetas vêm do i18n (body_analysis_screen.score_*).
export function scoreLevel(score) {
  if (score >= 90) return { key: 'score_excellent', color: '#22C55E' };
  if (score >= 75) return { key: 'score_good', color: '#4ADE80' };
  if (score >= 60) return { key: 'score_moderate', color: '#F59E0B' };
  return { key: 'score_attention', color: '#EF4444' };
}
