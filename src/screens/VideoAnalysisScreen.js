import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  SafeAreaView, Alert, ActivityIndicator, ScrollView, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNutrition } from '../context/NutritionContext';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';

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

const STEPS = ['intro', 'front', 'side', 'confirm'];

const TIPS = [
  { icon: '🧱', text: 'Encosta-te a uma parede BRANCA ou lisa — sem padrões, móveis ou sombras atrás de ti' },
  { icon: '👙', text: 'Roupa JUSTA: leggings, calções curtos ou roupa interior. Sem camisolas largas nem cintos' },
  { icon: '💳', text: 'Cola um cartão de crédito com fita-cola no CENTRO DO PEITO (frente) e na LATERAL DA CINTURA (lado). Plano e totalmente visível' },
  { icon: '🙋', text: 'Foto de lado: LADO DIREITO do corpo para a câmara. Braço direito a 90° à frente (horizontal). Braço esquerdo atrás do corpo. Nunca braços junto ao tronco' },
  { icon: '📱', text: 'Telemóvel fixo a ~2 m de distância, ao nível do peito — usa um suporte ou encosta-o a algo estável' },
  { icon: '💡', text: 'Boa iluminação frontal — evita luz atrás de ti (contra-luz) ou sombras no rosto' },
  { icon: '📏', text: 'Corpo INTEIRO visível da cabeça à planta do pé — não te cortes nos bordos da câmara' },
];

export default function VideoAnalysisScreen({ navigation }) {
  const { bodyProfile } = useNutrition();
  const sex = bodyProfile?.sex || 'female';

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep]           = useState('intro');
  const [frontUri, setFrontUri]   = useState(null);
  const [sideUri, setSideUri]     = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [facing]                  = useState('front');
  const cameraRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => () => { if (countdownRef.current) clearInterval(countdownRef.current); }, []);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          capturePhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [step]);

  const capturePhoto = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, skipProcessing: false });
      if (step === 'front') {
        setFrontUri(photo.uri);
        setStep('side');
      } else if (step === 'side') {
        setSideUri(photo.uri);
        setStep('confirm');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível capturar a foto. Tenta novamente.');
    }
  }, [step]);

  const retake = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setCountdown(null);
    if (step === 'confirm' && !sideUri) setStep('side');
    else if (step === 'confirm') setStep('front');
    else if (step === 'side') { setSideUri(null); setStep('side'); }
    else { setFrontUri(null); setStep('front'); }
  }, [step, sideUri]);

  const goToAnalysis = useCallback(() => {
    if (!frontUri || !sideUri) return;
    navigation.navigate('BodyAnalysis', { frontUri, sideUri });
  }, [frontUri, sideUri, navigation]);

  // ── Intro ──────────────────────────────────────────────────────────────────

  if (step === 'intro') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.introContainer} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Vídeo Análise</Text>
          <Text style={s.subtitle}>
            O app guia-te passo a passo. Segue as instruções para obter as medições mais precisas possível.
          </Text>

          <View style={s.cardCallout}>
            <Text style={s.cardCalloutIcon}>💳</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.cardCalloutTitle}>Cartão de crédito obrigatório</Text>
              <Text style={s.cardCalloutText}>
                Antes de começar, cola com fita-cola um cartão de crédito plano no centro do peito. Terás de o mudar para a lateral da cintura antes da foto de lado.
              </Text>
            </View>
          </View>

          <View style={s.tipsCard}>
            <Text style={s.tipsTitle}>Instruções completas</Text>
            {TIPS.map((t, i) => (
              <View key={i} style={s.tipRow}>
                <Text style={s.tipIcon}>{t.icon}</Text>
                <Text style={s.tipText}>{t.text}</Text>
              </View>
            ))}
          </View>

          <View style={s.poseRow}>
            <View style={s.poseItem}>
              <Image source={SILHOUETTES.front[sex === 'male' ? 'male' : 'female']}
                     style={s.poseImg} resizeMode="contain" />
              <Text style={s.poseLabel}>Frente</Text>
            </View>
            <View style={s.poseArrow}><Text style={s.poseArrowText}>→</Text></View>
            <View style={s.poseItem}>
              <Image source={SILHOUETTES.side[sex === 'male' ? 'male' : 'female']}
                     style={s.poseImg} resizeMode="contain" />
              <Text style={s.poseLabel}>Lado direito</Text>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={async () => {
            if (!permission?.granted) {
              const { granted } = await requestPermission();
              if (!granted) { Alert.alert('Câmara necessária', 'Permite o acesso à câmara nas definições.'); return; }
            }
            setStep('front');
          }}>
            <Text style={s.primaryBtnText}>Começar →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.backLink} onPress={() => navigation.goBack()}>
            <Text style={s.backLinkText}>Voltar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Camera step ────────────────────────────────────────────────────────────

  if (step === 'front' || step === 'side') {
    const isFront = step === 'front';
    const silhouette = SILHOUETTES[isFront ? 'front' : 'side'][sex === 'male' ? 'male' : 'female'];
    const instruction = isFront
      ? 'Cartão no centro do peito · Braços afastados do tronco\nPernas abertas · Palmas para a câmara'
      : 'Cartão na lateral da cintura · LADO DIREITO para a câmara\nBraço direito 90° à frente · Braço esquerdo atrás do corpo';
    const stepLabel = isFront ? 'Passo 1 de 2 — Frente' : 'Passo 2 de 2 — Lado direito';

    if (!permission?.granted) {
      return (
        <SafeAreaView style={[s.safe, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={s.subtitle}>Câmara sem permissão</Text>
          <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
            <Text style={s.primaryBtnText}>Permitir câmara</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return (
      <View style={s.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

        {/* Silhouette overlay */}
        <View style={s.silhouetteOverlay} pointerEvents="none">
          <Image source={silhouette} style={s.silhouetteImg} resizeMode="contain" />
        </View>

        {/* Top bar */}
        <SafeAreaView style={s.cameraTopBar} pointerEvents="box-none">
          <Text style={s.stepLabel}>{stepLabel}</Text>
          <Text style={s.instructionText}>{instruction}</Text>
        </SafeAreaView>

        {/* Countdown overlay */}
        {countdown !== null && (
          <View style={s.countdownOverlay} pointerEvents="none">
            <Text style={s.countdownText}>{countdown}</Text>
          </View>
        )}

        {/* Bottom controls */}
        <SafeAreaView style={s.cameraBottomBar}>
          {!isFront && (
            <TouchableOpacity style={s.retakeBtn} onPress={() => { setStep('front'); setFrontUri(null); if (countdownRef.current) clearInterval(countdownRef.current); setCountdown(null); }}>
              <Text style={s.retakeBtnText}>← Refazer frente</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[s.captureBtn, countdown !== null && s.captureBtnDisabled]}
            onPress={countdown === null ? startCountdown : undefined}
            disabled={countdown !== null}
          >
            <View style={s.captureBtnInner} />
          </TouchableOpacity>
          <Text style={s.captureHint}>
            {countdown !== null ? `A capturar em ${countdown}s...` : 'Toca para iniciar contagem (3s)'}
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  if (step === 'confirm') {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.confirmContainer} showsVerticalScrollIndicator={false}>
          <Text style={s.title}>Confirmar fotos</Text>
          <Text style={s.subtitle}>Verifica se as fotos estão nítidas e o corpo inteiro visível.</Text>

          <View style={s.photoRow}>
            <View style={s.photoItem}>
              <Image source={{ uri: frontUri }} style={s.photoThumb} resizeMode="cover" />
              <Text style={s.photoLabel}>Frente</Text>
              <TouchableOpacity onPress={() => { setFrontUri(null); setStep('front'); }}>
                <Text style={s.retakeText}>Refazer</Text>
              </TouchableOpacity>
            </View>
            <View style={s.photoItem}>
              <Image source={{ uri: sideUri }} style={s.photoThumb} resizeMode="cover" />
              <Text style={s.photoLabel}>Lado</Text>
              <TouchableOpacity onPress={() => { setSideUri(null); setStep('side'); }}>
                <Text style={s.retakeText}>Refazer</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={goToAnalysis}>
            <Text style={s.primaryBtnText}>Analisar →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.backLink} onPress={() => { setFrontUri(null); setSideUri(null); setStep('intro'); }}>
            <Text style={s.backLinkText}>Recomeçar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const s = StyleSheet.create({
  safe:              { flex: 1, backgroundColor: Colors.background },
  introContainer:    { padding: 24, paddingBottom: 48 },
  confirmContainer:  { padding: 24, paddingBottom: 48 },
  title:             { fontSize: 26, fontWeight: '800', color: Colors.text, marginBottom: 8, fontFamily: BrandFonts.bold || undefined },
  subtitle:          { fontSize: 15, color: Colors.textMuted, lineHeight: 22, marginBottom: 24 },

  cardCallout:       { flexDirection: 'row', backgroundColor: '#FFF8E7', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1.5, borderColor: '#F5C842', gap: 12 },
  cardCalloutIcon:   { fontSize: 28, lineHeight: 34 },
  cardCalloutTitle:  { fontSize: 14, fontWeight: '800', color: '#7A5C00', marginBottom: 4 },
  cardCalloutText:   { fontSize: 13, color: '#7A5C00', lineHeight: 19 },

  tipsCard:          { backgroundColor: Colors.card, borderRadius: 16, padding: 20, marginBottom: 24 },
  tipsTitle:         { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  tipRow:            { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  tipIcon:           { fontSize: 20, marginRight: 12, marginTop: 1 },
  tipText:           { flex: 1, fontSize: 14, color: Colors.textMuted, lineHeight: 20 },

  poseRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 32, gap: 16 },
  poseItem:          { alignItems: 'center' },
  poseImg:           { width: 90, height: 160 },
  poseLabel:         { fontSize: 12, color: Colors.textMuted, marginTop: 6, fontWeight: '600' },
  poseArrow:         { alignItems: 'center' },
  poseArrowText:     { fontSize: 28, color: Colors.textMuted },

  primaryBtn:        { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  primaryBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: BrandFonts.bold || undefined },
  backLink:          { alignItems: 'center', paddingVertical: 8 },
  backLinkText:      { color: Colors.textMuted, fontSize: 14 },

  // Camera
  cameraContainer:   { flex: 1, backgroundColor: '#000' },
  silhouetteOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  silhouetteImg:     { width: '55%', height: '80%', opacity: 0.35 },

  cameraTopBar:      { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  stepLabel:         { color: '#fff', fontSize: 13, fontWeight: '700', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, alignSelf: 'center', marginBottom: 8, overflow: 'hidden' },
  instructionText:   { color: '#fff', fontSize: 14, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, lineHeight: 20 },

  countdownOverlay:  { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  countdownText:     { fontSize: 120, fontWeight: '900', color: '#fff', opacity: 0.9 },

  cameraBottomBar:   { position: 'absolute', bottom: 0, left: 0, right: 0, paddingBottom: Platform.OS === 'android' ? 24 : 0, alignItems: 'center', paddingHorizontal: 24 },
  retakeBtn:         { marginBottom: 12 },
  retakeBtnText:     { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  captureBtn:        { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  captureBtnDisabled:{ opacity: 0.5 },
  captureBtnInner:   { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff' },
  captureHint:       { color: 'rgba(255,255,255,0.75)', fontSize: 12, textAlign: 'center', marginBottom: 16 },

  // Confirm
  photoRow:          { flexDirection: 'row', gap: 16, marginBottom: 32 },
  photoItem:         { flex: 1, alignItems: 'center' },
  photoThumb:        { width: '100%', aspectRatio: 9 / 16, borderRadius: 12, marginBottom: 8 },
  photoLabel:        { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  retakeText:        { fontSize: 13, color: Colors.primary, fontWeight: '600' },
});
