import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { apiBodyAnalyze, apiSaveBodyMeasurements } from '../services/apiService';
import { t } from '../i18n';

// ── Helpers ───────────────────────────────────────────────────────────────────
function ageFromBirthDate(dateStr) {
  if (!dateStr) return '';
  const birth = new Date(dateStr);
  if (isNaN(birth)) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? String(age) : '';
}

// ── Info content ──────────────────────────────────────────────────────────────
const INFO_KEYS = [
  'chest_cm','neck_cm','bicep_cm','forearm_cm','waist_cm','hip_cm','thigh_cm','calf_cm',
  'bmi','lean_mass_index','fat_mass_index','waist_to_height','waist_to_hip','conicity_index',
  'body_fat','body_water','ree','score',
];
function buildInfo(language) {
  const info = {};
  for (const k of INFO_KEYS) {
    info[k] = {
      title: t(language, `body_analysis_screen.info.${k}.title`),
      desc:  t(language, `body_analysis_screen.info.${k}.desc`),
      ref:   t(language, `body_analysis_screen.info.${k}.ref`),
      why:   t(language, `body_analysis_screen.info.${k}.why`),
    };
  }
  return info;
}

// ── Classification helpers ────────────────────────────────────────────────────
const CLS_COLOR = {
  low_risk: '#22C55E', adequate: '#22C55E', normal: '#22C55E',
  elevated_risk: '#EF4444', obese: '#EF4444',
  overweight: '#F59E0B', underweight: '#F59E0B', low: '#F59E0B',
};

function clsL(c, language) {
  if (!c) return t(language, 'body_analysis_screen.cls_none');
  return t(language, `body_analysis_screen.cls_${c}`);
}
function clsC(c) { return CLS_COLOR[c] || Colors.textMuted; }

// ── Gauge (semicircle) ────────────────────────────────────────────────────────
function Gauge({ pct, color, size = 110 }) {
  // Draw a semicircle gauge using nested Views + overflow:hidden
  const r = size / 2;
  const rotation = -180 + (pct / 100) * 180;
  return (
    <View style={{ width: size, height: r + 8, alignItems: 'center' }}>
      {/* Track */}
      <View style={{ width: size, height: size, borderRadius: r, borderWidth: 10, borderColor: Colors.border, position: 'absolute', top: 0 }} />
      {/* Fill — clip top half */}
      <View style={{ width: size, height: r, overflow: 'hidden', position: 'absolute', top: 0 }}>
        <View style={{
          width: size, height: size, borderRadius: r,
          borderWidth: 10, borderColor: color,
          transform: [{ rotate: `${rotation}deg` }],
        }} />
      </View>
      {/* Center number */}
      <View style={{ position: 'absolute', bottom: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, fontWeight: '900', color, fontFamily: BrandFonts.bold || undefined }}>{pct}%</Text>
      </View>
    </View>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, min, max, thresholds, color }) {
  // thresholds: [{at: 0.5, color: '#EF4444'}] — marks on the bar
  const clamped = Math.max(min, Math.min(max, value ?? min));
  const pct = ((clamped - min) / (max - min)) * 100;
  return (
    <View style={{ height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
      <View style={{ height: 6, width: `${pct}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ── Score badge grid ──────────────────────────────────────────────────────────
function ScoreBadges({ cls, sex, language }) {
  const items = [
    { key: 'body_fat',        label: t(language, 'body_analysis_screen.badge_body_fat') },
    { key: 'lean_mass_index', label: t(language, 'body_analysis_screen.badge_lean_mass_index') },
    { key: 'fat_mass_index',  label: t(language, 'body_analysis_screen.badge_fat_mass_index') },
    { key: 'waist_to_height', label: t(language, 'body_analysis_screen.badge_waist_to_height') },
    { key: 'waist_to_hip',    label: t(language, 'body_analysis_screen.badge_waist_to_hip') },
    { key: 'conicity_index',  label: t(language, 'body_analysis_screen.badge_conicity_index') },
  ];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {items.map(({ key, label }) => {
        const c = cls?.[key];
        const color = clsC(c);
        return (
          <View key={key} style={[sbStyles.badge, { backgroundColor: color + '18', borderColor: color + '44' }]}>
            <View style={[sbStyles.dot, { backgroundColor: color }]} />
            <Text style={[sbStyles.label, { color }]}>{label}</Text>
            <Text style={[sbStyles.sub, { color }]}>{clsL(c, language)}</Text>
          </View>
        );
      })}
    </View>
  );
}
const sbStyles = StyleSheet.create({
  badge:  { flexDirection: 'column', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, minWidth: 68 },
  dot:    { width: 7, height: 7, borderRadius: 4, marginBottom: 3 },
  label:  { fontSize: 10, fontWeight: '800' },
  sub:    { fontSize: 9, fontWeight: '600', opacity: 0.8 },
});

// ── Pose silhouette ───────────────────────────────────────────────────────────
const SILHOUETTES = {
  front: {
    female: require('../../assets/novaqi/silhouette-front-female.png'),
    male:   require('../../assets/novaqi/silhouette-front-male.png'),
  },
  side: {
    female: require('../../assets/novaqi/silhouette-side-female.png'),
    male:   require('../../assets/novaqi/silhouette-side-male.png'),
  },
};

function PoseSilhouette({ pose, sex }) {
  const gender = sex === 'male' ? 'male' : 'female';
  const src = SILHOUETTES[pose]?.[gender];
  if (!src) return null;
  return <Image source={src} style={{ width: 100, height: 100 }} resizeMode="contain" />;
}

// ── Info modal ────────────────────────────────────────────────────────────────
function InfoModal({ info, onClose, language }) {
  if (!info) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalCard}>
          <Text style={s.modalTitle}>{info.title}</Text>
          <Text style={s.modalDesc}>{info.desc}</Text>
          <View style={s.modalSection}>
            <Text style={s.modalSectionLabel}>{t(language, 'body_analysis_screen.modal_ref_label')}</Text>
            <Text style={s.modalRef}>{info.ref}</Text>
          </View>
          <View style={s.modalSection}>
            <Text style={s.modalSectionLabel}>{t(language, 'body_analysis_screen.modal_why_label')}</Text>
            <Text style={s.modalRef}>{info.why}</Text>
          </View>
          <TouchableOpacity style={s.modalClose} onPress={onClose}>
            <Text style={s.modalCloseText}>{t(language, 'body_analysis_screen.modal_close')}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BodyAnalysisScreen({ navigation, route }) {
  const { token } = useAuth();
  const { language } = useApp();
  const { saveBodyProfile, bodyProfile, refresh } = useNutrition();

  const INFO = useMemo(() => buildInfo(language), [language]);
  const derivedAge = useMemo(() => ageFromBirthDate(bodyProfile?.birth_date), [bodyProfile?.birth_date]);

  const [frontUri,   setFrontUri]   = useState(route?.params?.frontUri || null);
  const [sideUri,    setSideUri]    = useState(route?.params?.sideUri  || null);
  const [frontB64,   setFrontB64]   = useState(null);
  const [sideB64,    setSideB64]    = useState(null);
  const frontPitchDeg = route?.params?.frontPitchDeg ?? null;
  const sidePitchDeg  = route?.params?.sidePitchDeg  ?? null;
  const [heightCm,   setHeightCm]   = useState(bodyProfile?.height_cm ? String(bodyProfile.height_cm) : '');
  const [weightKg,   setWeightKg]   = useState(bodyProfile?.weight_kg ? String(bodyProfile.weight_kg) : '');
  const [sex,        setSex]        = useState(bodyProfile?.sex || 'female');
  const [age,        setAge]        = useState(derivedAge);
  const [analyzing,      setAnalyzing]      = useState(false);
  const [result,         setResult]         = useState(null);
  const [activeInfo,     setActiveInfo]     = useState(null);
  const [zoomedOverlay,  setZoomedOverlay]  = useState(null);

  // Auto-analyze when photos arrive from VideoAnalysisScreen
  const autoTriggered = React.useRef(false);
  React.useEffect(() => {
    if (route?.params?.frontUri && route?.params?.sideUri && !autoTriggered.current) {
      autoTriggered.current = true;
      setTimeout(() => runAnalysis(), 300);
    }
  }, []);

  function showInfo(key) { setActiveInfo(INFO[key] || null); }

  async function pickPhoto(side) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert(t(language, 'body_analysis_screen.alert_permission_title'), t(language, 'body_analysis_screen.alert_permission_msg')); return; }
    // base64:true makes Expo transcode HEIC/HEIF/WebP → JPEG automatically on iOS
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
    });
    if (!picked.canceled && picked.assets?.[0]) {
      const asset = picked.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const b64 = `data:${mime};base64,${asset.base64}`;
      if (side === 'front') { setFrontUri(asset.uri); setFrontB64(b64); }
      else                  { setSideUri(asset.uri);  setSideB64(b64); }
    }
  }

  // Fallback for URIs coming from VideoAnalysisScreen. iPhones set to "High
  // Efficiency" (default on iOS) return HEIC even from expo-camera despite it
  // claiming JPEG, so derive the mime from the file extension instead of
  // hard-coding image/jpeg — the server accepts HEIC/HEIF/PNG/WebP too.
  async function uriToBase64(uri) {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
    const ext = (uri.split('?')[0].split('.').pop() || '').toLowerCase();
    const mime =
      ext === 'png'                       ? 'image/png'  :
      ext === 'heic' || ext === 'heif'    ? 'image/heic' :
      ext === 'webp'                      ? 'image/webp' :
                                            'image/jpeg';
    return `data:${mime};base64,${base64}`;
  }

  async function runAnalysis() {
    if (!frontUri || !sideUri) { Alert.alert(t(language, 'body_analysis_screen.alert_photos_missing_title'), t(language, 'body_analysis_screen.alert_photos_missing_msg')); return; }
    if (!weightKg) { Alert.alert(t(language, 'body_analysis_screen.alert_data_missing_title'), t(language, 'body_analysis_screen.alert_data_missing_msg')); return; }
    setAnalyzing(true); setResult(null);
    try {
      // Use pre-converted base64 from picker; fall back to FileSystem for camera URIs
      const [fB64, sB64] = await Promise.all([
        frontB64 || uriToBase64(frontUri),
        sideB64  || uriToBase64(sideUri),
      ]);
      setResult(await apiBodyAnalyze(token, {
        frontImage: fB64, sideImage: sB64,
        heightCm: heightCm ? parseFloat(heightCm) : 0,
        weightKg: parseFloat(weightKg),
        sex, age: age ? parseInt(age, 10) : 0,
        frontPitchDeg, sidePitchDeg,
      }));
    } catch (e) { Alert.alert(t(language, 'body_analysis_screen.alert_analysis_error'), e.message || t(language, 'body_analysis_screen.alert_try_again')); }
    finally { setAnalyzing(false); }
  }

  async function saveResults() {
    if (!result) return;
    try {
      await apiSaveBodyMeasurements(token, {
        ...result.measurements, ...result.indices,
        ...(result.body_composition || {}),
        score: result.score,
        confidence: result.meta?.confidence,
        warnings: result.meta?.warnings,
        scale_px_per_cm: result.meta?.scale_px_per_cm,
      });
      refresh();
    } catch {}
    Alert.alert(
      t(language, 'body_analysis_screen.alert_update_profile_title'),
      t(language, 'body_analysis_screen.alert_update_profile_msg', { h: heightCm, w: weightKg }),
      [
        { text: t(language, 'body_analysis_screen.alert_no'), style: 'cancel' },
        { text: t(language, 'body_analysis_screen.alert_update'), onPress: async () => {
          try {
            await saveBodyProfile({ height_cm: parseFloat(heightCm), weight_kg: parseFloat(weightKg), sex, birth_date: bodyProfile?.birth_date || null, activity_level: bodyProfile?.activity_level || 'moderate', goal: bodyProfile?.goal || 'maintain' });
            Alert.alert(t(language, 'body_analysis_screen.alert_profile_updated_title'), t(language, 'body_analysis_screen.alert_profile_updated_msg'));
          } catch { Alert.alert(t(language, 'body_analysis_screen.alert_error'), t(language, 'body_analysis_screen.alert_save_failed')); }
        }},
      ]
    );
  }

  const m   = result?.measurements;
  const idx = result?.indices;
  const cls = result?.classification;
  const bc  = result?.body_composition;
  const sc  = result?.score;

  function bfMeta(pct) {
    if (!pct) return null;
    const L = {
      essential: t(language, 'body_analysis_screen.bf_essential'),
      athletic:  t(language, 'body_analysis_screen.bf_athletic'),
      normal:    t(language, 'body_analysis_screen.bf_normal'),
      obese:     t(language, 'body_analysis_screen.bf_obese'),
    };
    if (sex === 'male') {
      if (pct < 6)  return { label: L.essential, color: '#F59E0B', pctOfMax: pct / 35 * 100 };
      if (pct < 14) return { label: L.athletic,  color: '#22C55E', pctOfMax: pct / 35 * 100 };
      if (pct < 25) return { label: L.normal,    color: '#22C55E', pctOfMax: pct / 35 * 100 };
      return             { label: L.obese,       color: '#EF4444', pctOfMax: Math.min(pct / 35 * 100, 100) };
    }
    if (pct < 14) return { label: L.essential, color: '#F59E0B', pctOfMax: pct / 45 * 100 };
    if (pct < 21) return { label: L.athletic,  color: '#22C55E', pctOfMax: pct / 45 * 100 };
    if (pct < 32) return { label: L.normal,    color: '#22C55E', pctOfMax: pct / 45 * 100 };
    return             { label: L.obese,       color: '#EF4444', pctOfMax: Math.min(pct / 45 * 100, 100) };
  }

  function scoreColor(v) {
    if (!v) return Colors.textMuted;
    if (v >= 90) return '#22C55E'; if (v >= 75) return '#4ADE80';
    if (v >= 60) return '#F59E0B'; return '#EF4444';
  }
  function scoreLabel(v) {
    if (!v) return '—';
    if (v >= 90) return t(language, 'body_analysis_screen.score_excellent');
    if (v >= 75) return t(language, 'body_analysis_screen.score_good');
    if (v >= 60) return t(language, 'body_analysis_screen.score_moderate');
    return t(language, 'body_analysis_screen.score_attention');
  }

  const bf = bfMeta(bc?.body_fat_pct);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <InfoModal info={activeInfo} onClose={() => setActiveInfo(null)} language={language} />

      {/* ── Overlay zoom modal ── */}
      <Modal visible={!!zoomedOverlay} transparent animationType="fade" onRequestClose={() => setZoomedOverlay(null)}>
        <TouchableOpacity style={s.zoomOverlay} activeOpacity={1} onPress={() => setZoomedOverlay(null)}>
          <Image
            source={{ uri: zoomedOverlay ? `data:image/jpeg;base64,${zoomedOverlay}` : undefined }}
            style={s.zoomImage}
            resizeMode="contain"
          />
          <View style={s.zoomCloseBtn} pointerEvents="none">
            <Text style={s.zoomCloseTxt}>{t(language, 'body_analysis_screen.zoom_close')}</Text>
          </View>
        </TouchableOpacity>
      </Modal>

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t(language, 'body_analysis_screen.header_title')}</Text>
        <View />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Pose guide */}
        <View style={s.poseGuide}>
          <Text style={s.poseGuideTitle}>{t(language, 'body_analysis_screen.pose_guide_title')}</Text>

          <View style={s.cardHint}>
            <Text style={s.cardHintIcon}>💳</Text>
            <Text style={s.cardHintText}>{t(language, 'body_analysis_screen.card_hint')}</Text>
          </View>

          <View style={s.poseGuideRow}>
            <View style={s.poseTip}>
              <Text style={s.poseTipLabel}>{t(language, 'body_analysis_screen.pose_front_label')}</Text>
              <Text style={s.poseTipText}>{t(language, 'body_analysis_screen.pose_front_text')}</Text>
            </View>
            <View style={s.poseTip}>
              <Text style={s.poseTipLabel}>{t(language, 'body_analysis_screen.pose_side_label')}</Text>
              <Text style={s.poseTipText}>{t(language, 'body_analysis_screen.pose_side_text')}</Text>
            </View>
          </View>
        </View>

        {/* Photos */}
        <View style={s.photoRow}>
          {['front','side'].map(side => (
            <TouchableOpacity key={side} style={s.photoPicker} onPress={() => pickPhoto(side)} activeOpacity={0.8}>
              {(side === 'front' ? frontUri : sideUri)
                ? <Image source={{ uri: side === 'front' ? frontUri : sideUri }} style={s.photoPreview} resizeMode="cover" />
                : (
                  <View style={s.photoEmpty}>
                    <PoseSilhouette pose={side} sex={sex} />
                    <Text style={s.photoEmptyPlus}>{t(language, side === 'front' ? 'body_analysis_screen.photo_add_front' : 'body_analysis_screen.photo_add_side')}</Text>
                  </View>
                )}
              <Text style={s.photoLabel}>{t(language, side === 'front' ? 'body_analysis_screen.photo_front' : 'body_analysis_screen.photo_side')}</Text>
            </TouchableOpacity>
          ))}
        </View>


        {/* Demographics */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>{t(language, 'body_analysis_screen.calibration_title')}</Text>
          <Text style={s.sectionHint}>{t(language, 'body_analysis_screen.calibration_hint')}</Text>
          <View style={s.inputRow}>
            <Field label={t(language, 'body_analysis_screen.field_height')} value={heightCm} onChange={setHeightCm} kbType="decimal-pad" />
            <Field label={t(language, 'body_analysis_screen.field_weight')} value={weightKg} onChange={setWeightKg} kbType="decimal-pad" />
            <Field label={t(language, 'body_analysis_screen.field_age')}    value={age}      onChange={setAge}      kbType="number-pad" />
          </View>
          <View style={s.sexRow}>
            {['female','male'].map(sv => (
              <TouchableOpacity key={sv} style={[s.sexBtn, sex === sv && s.sexBtnOn]} onPress={() => setSex(sv)}>
                <Text style={[s.sexBtnTxt, sex === sv && s.sexBtnTxtOn]}>{t(language, sv === 'female' ? 'body_analysis_screen.sex_female' : 'body_analysis_screen.sex_male')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Analyse */}
        <TouchableOpacity style={[s.analyzeBtn, (analyzing || !frontUri || !sideUri) && s.analyzeBtnOff]} onPress={runAnalysis} disabled={analyzing || !frontUri || !sideUri} activeOpacity={0.85}>
          {analyzing
            ? <><ActivityIndicator color="#fff" /><Text style={s.analyzeBtnTxt}>{t(language, 'body_analysis_screen.analyzing')}</Text></>
            : <Text style={s.analyzeBtnTxt}>{t(language, 'body_analysis_screen.analyze_btn')}</Text>}
        </TouchableOpacity>

        {result?.meta?.warnings?.length > 0 && (
          <View style={s.warnBox}><Text style={s.warnTxt}>⚠ {result.meta.warnings.join(' · ')}</Text></View>
        )}

        {(() => {
          // Only surface the mask-derived height estimate when it's plausibly
          // close to the informed height. When the mask span is short (bad
          // segmentation, cropped feet, camera tilt) the estimate is often 15+ %
          // off — showing "estimada 151 cm vs informada 175 cm" just alarms the
          // user without explaining anything actionable. Threshold: 8 %.
          const est = result?.meta?.height_cm_estimated;
          const inp = result?.meta?.input_height_cm;
          if (est == null) return null;
          if (inp) {
            const diffPct = Math.abs(est - inp) / inp;
            if (diffPct > 0.08) return null;
            return (
              <View style={s.heightBox}>
                <Text style={s.heightBoxTxt}>
                  {t(language, 'body_analysis_screen.height_estimated_full', { h: est, informed: inp })}
                </Text>
              </View>
            );
          }
          return (
            <View style={s.heightBox}>
              <Text style={s.heightBoxTxt}>
                {t(language, 'body_analysis_screen.height_estimated_short', { h: est })}
              </Text>
            </View>
          );
        })()}

        {result && <>

          {/* Overlays — tap para ampliar */}
          {result.overlays && (
            <View style={s.overlayRow}>
              {[['front','overlay_zoom_hint_front'],['side','overlay_zoom_hint_side']].map(([k, hintKey]) => result.overlays[k] ? (
                <TouchableOpacity key={k} style={s.overlayWrap} onPress={() => setZoomedOverlay(result.overlays[k])} activeOpacity={0.85}>
                  <Image source={{ uri: `data:image/jpeg;base64,${result.overlays[k]}` }} style={s.overlayImg} resizeMode="contain" />
                  <Text style={s.overlayLabel}>{t(language, `body_analysis_screen.${hintKey}`)}</Text>
                </TouchableOpacity>
              ) : null)}
            </View>
          )}

          {/* ── SCORE ── */}
          {sc != null && (
            <View style={s.scoreCard}>
              <View style={s.scoreTop}>
                <View style={s.scoreNumWrap}>
                  <Text style={[s.scoreNum, { color: scoreColor(sc) }]}>{sc}</Text>
                  <Text style={s.scoreSlash}>/100</Text>
                </View>
                <View style={s.scoreInfo}>
                  <Text style={s.scoreTitle}>{t(language, 'body_analysis_screen.score_title')}</Text>
                  <View style={[s.scorePill, { backgroundColor: scoreColor(sc) + '22' }]}>
                    <Text style={[s.scorePillTxt, { color: scoreColor(sc) }]}>{scoreLabel(sc)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => showInfo('score')} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={s.infoBtnTxt}>?</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* Score bar */}
              <View style={s.scoreBarTrack}>
                <View style={[s.scoreBarFill, { width: `${sc}%`, backgroundColor: scoreColor(sc) }]} />
              </View>
              {/* Badge grid */}
              <ScoreBadges cls={cls} sex={sex} language={language} />
            </View>
          )}

          {/* ── COMPOSIÇÃO CORPORAL ── */}
          {bc && (
            <View style={s.card}>
              <Row2 title={t(language, 'body_analysis_screen.bc_title')} onInfo={() => showInfo('body_fat')} sub={t(language, 'body_analysis_screen.bc_sub')} />

              {/* Gauge + split */}
              <View style={s.bfMain}>
                <View style={s.gaugeWrap}>
                  <Gauge pct={bc.body_fat_pct} color={bf?.color || Colors.primary} size={120} />
                  {bf && (
                    <View style={[s.bfPill, { backgroundColor: bf.color + '20', borderColor: bf.color + '50' }]}>
                      <Text style={[s.bfPillTxt, { color: bf.color }]}>{bf.label}</Text>
                    </View>
                  )}
                  <Text style={s.bfGaugeLabel}>{t(language, 'body_analysis_screen.bc_gauge_label')}</Text>
                </View>
                <View style={s.bfCards}>
                  <MassCard label={t(language, 'body_analysis_screen.bc_lean_mass')} kg={bc.lean_mass_kg} color="#22C55E" />
                  <MassCard label={t(language, 'body_analysis_screen.bc_fat_mass')}  kg={bc.fat_mass_kg}  color={bf?.color || '#F59E0B'} />
                </View>
              </View>

              {/* Water + REE */}
              <View style={s.extraRow}>
                <TouchableOpacity style={s.extraItem} onPress={() => showInfo('body_water')}>
                  <Text style={s.extraVal}>{bc.body_water_l} L</Text>
                  <Text style={s.extraLabel}>{t(language, 'body_analysis_screen.bc_water_label')}</Text>
                  <Text style={s.extraSub}>{t(language, 'body_analysis_screen.bc_water_sub', { pct: bc.body_water_pct })}</Text>
                </TouchableOpacity>
                <View style={s.extraDiv} />
                <TouchableOpacity style={s.extraItem} onPress={() => showInfo('ree')}>
                  <Text style={s.extraVal}>{bc.ree_kcal} kcal</Text>
                  <Text style={s.extraLabel}>{t(language, 'body_analysis_screen.bc_ree_label')}</Text>
                  <Text style={s.extraSub}>{t(language, 'body_analysis_screen.bc_ree_sub')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── PERÍMETROS ── */}
          <View style={s.card}>
            <Row2 title={t(language, 'body_analysis_screen.per_title')} sub={t(language, 'body_analysis_screen.per_sub')} />
            {[
              [t(language, 'body_analysis_screen.per_chest'),   m?.chest_cm,   'chest_cm',   60, 140],
              [t(language, 'body_analysis_screen.per_neck'),    m?.neck_cm,    'neck_cm',    25, 55],
              [t(language, 'body_analysis_screen.per_bicep'),   m?.bicep_cm,   'bicep_cm',   8, 50],
              [t(language, 'body_analysis_screen.per_forearm'), m?.forearm_cm, 'forearm_cm', 8, 45],
              [t(language, 'body_analysis_screen.per_waist'),   m?.waist_cm,   'waist_cm',   50, 130],
              [t(language, 'body_analysis_screen.per_hip'),     m?.hip_cm,     'hip_cm',     60, 140],
              [t(language, 'body_analysis_screen.per_thigh'),   m?.thigh_cm,   'thigh_cm',   30, 90],
              [t(language, 'body_analysis_screen.per_calf'),    m?.calf_cm,    'calf_cm',    20, 60],
            ].map(([label, val, key, min, max]) => (
              <View key={key}>
                <MetricRow label={label} value={val != null ? `${val} cm` : '—'} onInfo={() => showInfo(key)} />
                {val != null && <ProgressBar value={val} min={min} max={max} color={Colors.primary} />}
              </View>
            ))}
          </View>

          {/* ── ÍNDICES ── */}
          <View style={s.card}>
            <Row2 title={t(language, 'body_analysis_screen.idx_title')} />
            {[
              { label: t(language, 'body_analysis_screen.idx_bmi'), val: idx?.bmi,             clsKey: 'bmi',             infoKey: 'bmi',             min: 15,  max: 40 },
              { label: t(language, 'body_analysis_screen.idx_lmi'), val: idx?.lean_mass_index, clsKey: 'lean_mass_index', infoKey: 'lean_mass_index', min: 8,   max: 25 },
              { label: t(language, 'body_analysis_screen.idx_fmi'), val: idx?.fat_mass_index,  clsKey: 'fat_mass_index',  infoKey: 'fat_mass_index',  min: 0,   max: 18 },
              { label: t(language, 'body_analysis_screen.idx_wth'), val: idx?.waist_to_height, clsKey: 'waist_to_height', infoKey: 'waist_to_height', min: 0.3, max: 0.8 },
              { label: t(language, 'body_analysis_screen.idx_whr'), val: idx?.waist_to_hip,    clsKey: 'waist_to_hip',    infoKey: 'waist_to_hip',    min: 0.5, max: 1.2 },
              { label: t(language, 'body_analysis_screen.idx_ci'),  val: idx?.conicity_index,  clsKey: 'conicity_index',  infoKey: 'conicity_index',  min: 0.9, max: 1.5 },
            ].map(({ label, val, clsKey, infoKey, min, max }) => {
              const c = cls?.[clsKey];
              const barColor = clsC(c);
              return (
                <View key={infoKey}>
                  <MetricRow
                    label={label}
                    value={val != null ? String(val) : '—'}
                    tag={clsL(c, language)}
                    tagColor={clsC(c)}
                    onInfo={() => showInfo(infoKey)}
                  />
                  {val != null && <ProgressBar value={val} min={min} max={max} color={barColor} />}
                </View>
              );
            })}
          </View>

          {/* ── TABELA DE REFERÊNCIAS ── */}
          <View style={s.card}>
            <Row2 title={t(language, 'body_analysis_screen.ref_title')} />
            {[
              [t(language, 'body_analysis_screen.badge_fat_mass_index'),  idx?.fat_mass_index  != null ? `${idx.fat_mass_index} kg/m²`  : '—', sex==='male' ? '<6,0' : '<9,0', 'fat_mass_index'],
              [t(language, 'body_analysis_screen.badge_lean_mass_index'), idx?.lean_mass_index != null ? `${idx.lean_mass_index} kg/m²` : '—', sex==='male' ? '>14,6' : '>11,8', 'lean_mass_index'],
              [t(language, 'body_analysis_screen.badge_waist_to_height'), idx?.waist_to_height != null ? String(idx.waist_to_height)    : '—', '<0,5',                           'waist_to_height'],
              [t(language, 'body_analysis_screen.badge_waist_to_hip'),    idx?.waist_to_hip    != null ? String(idx.waist_to_hip)       : '—', sex==='male' ? '<0,90' : '<0,85', 'waist_to_hip'],
              [t(language, 'body_analysis_screen.badge_conicity_index'),  idx?.conicity_index  != null ? String(idx.conicity_index)     : '—', '<1,18',                          'conicity_index'],
            ].map(([label, val, ref, key]) => (
              <View key={key} style={s.refRow}>
                <Text style={s.refLabel}>{label}</Text>
                <Text style={s.refRef}>{t(language, 'body_analysis_screen.ref_prefix', { v: ref })}</Text>
                <Text style={[s.refVal, { color: clsC(cls?.[key]) }]}>{val}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.saveBtn} onPress={saveResults} activeOpacity={0.85}>
            <Text style={s.saveBtnTxt}>{t(language, 'body_analysis_screen.save_btn')}</Text>
          </TouchableOpacity>
        </>}

        {/* Disclaimer */}
        <View style={s.disclaimerBox}>
          <Text style={s.disclaimerTitle}>{t(language, 'body_analysis_screen.disclaimer_title')}</Text>
          <Text style={s.disclaimerTxt}>
            {t(language, 'body_analysis_screen.disclaimer_p1')}{'\n\n'}
            {t(language, 'body_analysis_screen.disclaimer_p2')}{'\n\n'}
            {t(language, 'body_analysis_screen.disclaimer_p3')}
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function Row2({ title, sub, onInfo }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={s.cardTitle}>{title}</Text>
        {onInfo && (
          <TouchableOpacity onPress={onInfo} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.infoBtnTxt}>?</Text>
          </TouchableOpacity>
        )}
      </View>
      {sub && <Text style={s.cardSub}>{sub}</Text>}
    </View>
  );
}

function MassCard({ label, kg, color }) {
  return (
    <View style={[s.massCard, { borderLeftColor: color }]}>
      <Text style={[s.massKg, { color }]}>{kg} kg</Text>
      <Text style={s.massLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value, tag, tagColor, onInfo }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {tag && <Text style={[s.clsTag, { color: tagColor }]}>{tag}</Text>}
      </View>
      <View style={s.rowRight}>
        <Text style={s.rowVal}>{value}</Text>
        <TouchableOpacity onPress={onInfo} style={s.infoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.infoBtnTxt}>?</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Sanitise numeric input at typing time:
//  - convert comma to dot (PT/DE/FR keyboards default to comma on decimal-pad)
//  - allow only digits + a single dot
//  - trim to 6 chars so a runaway type can't produce e.g. "10000" that then
//    overflows the numeric(5,1) columns server-side (max 9999.9)
function _sanitizeDecimal(v, maxLen = 6) {
  if (v == null) return '';
  let s = String(v).replace(',', '.').replace(/[^0-9.]/g, '');
  const firstDot = s.indexOf('.');
  if (firstDot !== -1) s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '');
  return s.slice(0, maxLen);
}

function Field({ label, value, onChange, kbType }) {
  const isDecimal = kbType === 'decimal-pad';
  return (
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldBox}>
        <TextInput
          style={s.fieldTxt}
          value={value}
          onChangeText={raw => onChange(isDecimal ? _sanitizeDecimal(raw) : String(raw).replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType={kbType}
          placeholder="—"
          placeholderTextColor={Colors.textMuted}
        />
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  header:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  backBtn:    { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText:   { fontSize: 22, color: Colors.primary, fontWeight: '800' },
  title:      { flex: 1, fontSize: 18, fontWeight: '800', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  badge:      { fontSize: 10, fontWeight: '900', color: '#fff', backgroundColor: '#EF4444', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  scroll:     { padding: 16, paddingBottom: 56, gap: 16 },

  poseGuide:      { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  poseGuideTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  cardHint:       { flexDirection: 'row', backgroundColor: '#FFF8E7', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#F5C842', gap: 8, alignItems: 'flex-start' },
  cardHintIcon:   { fontSize: 20 },
  cardHintText:   { flex: 1, fontSize: 12, color: '#7A5C00', lineHeight: 18 },
  poseGuideRow:   { flexDirection: 'row', gap: 12 },
  poseTip:        { flex: 1 },
  poseTipLabel:   { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 3 },
  poseTipText:    { fontSize: 12, color: Colors.textMuted, lineHeight: 17 },

  photoRow:        { flexDirection: 'row', gap: 12 },
  photoPicker:     { flex: 1, aspectRatio: 0.75, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photoPreview:    { width: '100%', height: '100%' },
  photoEmpty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoEmptyPlus:  { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  photoPlaceholder:{ fontSize: 28, color: Colors.textMuted, textAlign: 'center', lineHeight: 32 },
  photoLabel:      { position: 'absolute', bottom: 6, fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  section:    { backgroundColor: Colors.card, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionHint:  { fontSize: 11, color: Colors.textMuted, marginTop: 2, marginBottom: 8 },
  inputRow:   { flexDirection: 'row', gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: Colors.textLight },
  fieldBox:   { backgroundColor: Colors.backgroundSecondary, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8 },
  fieldTxt:   { fontSize: 15, fontWeight: '600', color: Colors.text },
  sexRow:     { flexDirection: 'row', gap: 8 },
  sexBtn:     { flex: 1, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  sexBtnOn:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sexBtnTxt:  { fontSize: 13, fontWeight: '700', color: Colors.textLight },
  sexBtnTxtOn:{ color: '#fff' },

  analyzeBtn: { backgroundColor: Colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  analyzeBtnOff: { opacity: 0.45 },
  analyzeBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '900', fontFamily: BrandFonts.bold || undefined },

  warnBox:    { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F59E0B' },
  warnTxt:    { fontSize: 12, color: '#92400E', fontWeight: '600' },

  heightBox:  { backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: Colors.primary },
  heightBoxTxt: { fontSize: 12, color: Colors.primaryDark, fontWeight: '600' },

  overlayRow: { flexDirection: 'row', gap: 10 },
  overlayWrap:{ flex: 1, alignItems: 'center', gap: 4 },
  overlayImg: { width: '100%', aspectRatio: 0.75, borderRadius: 12 },
  overlayLabel:{ fontSize: 11, fontWeight: '700', color: Colors.textMuted },

  // Score
  scoreCard:  { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.border },
  scoreTop:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  scoreNumWrap:{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  scoreNum:   { fontSize: 56, fontWeight: '900', fontFamily: BrandFonts.bold || undefined, lineHeight: 60 },
  scoreSlash: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginBottom: 10 },
  scoreInfo:  { flex: 1, gap: 6 },
  scoreTitle: { fontSize: 15, fontWeight: '900', color: Colors.text },
  scorePill:  { alignSelf: 'flex-start', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  scorePillTxt:{ fontSize: 12, fontWeight: '800' },
  scoreBarTrack:{ height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  scoreBarFill: { height: 8, borderRadius: 4 },

  // Card
  card:       { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: Colors.border },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  cardSub:    { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  // Body fat gauge layout
  bfMain:     { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gaugeWrap:  { alignItems: 'center', gap: 6 },
  bfPill:     { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  bfPillTxt:  { fontSize: 11, fontWeight: '800' },
  bfGaugeLabel:{ fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  bfCards:    { flex: 1, gap: 8 },
  massCard:   { backgroundColor: Colors.backgroundSecondary, borderRadius: 12, padding: 10, borderLeftWidth: 3 },
  massKg:     { fontSize: 20, fontWeight: '900' },
  massLabel:  { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  // Water/REE
  extraRow:   { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10 },
  extraItem:  { flex: 1, alignItems: 'center', gap: 2 },
  extraDiv:   { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  extraVal:   { fontSize: 20, fontWeight: '900', color: Colors.text },
  extraLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  extraSub:   { fontSize: 10, color: Colors.textMuted },

  // Rows
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLeft:    { flex: 1, gap: 2 },
  rowLabel:   { fontSize: 13, color: Colors.textLight, fontWeight: '600' },
  clsTag:     { fontSize: 10, fontWeight: '700' },
  rowRight:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowVal:     { fontSize: 14, fontWeight: '800', color: Colors.text },
  infoBtn:    { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.backgroundSecondary, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  infoBtnTxt: { fontSize: 11, fontWeight: '900', color: Colors.textMuted },

  // Reference table
  refRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: Colors.border },
  refLabel:   { flex: 1, fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  refRef:     { fontSize: 11, color: Colors.textMuted, marginRight: 10 },
  refVal:     { fontSize: 13, fontWeight: '800', minWidth: 60, textAlign: 'right' },

  saveBtn:    { backgroundColor: '#22C55E', borderRadius: 16, paddingVertical: 15, alignItems: 'center' },
  saveBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '900' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard:  { backgroundColor: Colors.card, borderRadius: 20, padding: 20, width: '100%', gap: 12, elevation: 12 },
  modalTitle: { fontSize: 16, fontWeight: '900', color: Colors.text, fontFamily: BrandFonts.bold || undefined },
  modalDesc:  { fontSize: 13, color: Colors.textLight, lineHeight: 19 },
  modalSection:{ gap: 4 },
  modalSectionLabel: { fontSize: 11, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  modalRef:   { fontSize: 13, color: Colors.text, fontWeight: '600', lineHeight: 19 },
  modalClose: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  modalCloseText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Disclaimer
  disclaimerBox:   { backgroundColor: Colors.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border, gap: 6 },
  disclaimerTitle: { fontSize: 12, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  disclaimerTxt:   { fontSize: 11, color: Colors.textMuted, lineHeight: 16 },
  disclaimerBold:  { fontWeight: '800', color: Colors.textLight },

  // Overlay zoom
  zoomOverlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center', alignItems: 'center' },
  zoomImage:    { width: '100%', height: '100%' },
  zoomCloseBtn: { position: 'absolute', top: 56, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  zoomCloseTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
