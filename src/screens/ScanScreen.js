import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { analyzeProductWithApi, analyzeBarcodeWithApi, hasApiConfig } from '../services/apiService';
import { PremiumIcon } from '../components/ui';

const VALID_STATUSES = new Set(['SAFE', 'CAUTION', 'NOT_SAFE']);

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'];

export default function ScanScreen({ navigation, route }) {
  const { language, profile, addScanToHistory } = useApp();
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [searchingText, setSearchingText] = useState(null);
  const [cameraActive, setCameraActive] = useState(true);
  const [scanError, setScanError] = useState(null);
  const [isLimitError, setIsLimitError] = useState(false);
  const isWeb = Platform.OS === 'web';
  const [scanStep, setScanStep] = useState(
    route?.params?.photoMode ? 'photo'
    : 'barcode'
  ); // 'barcode' | 'photo' | 'ingredients'
  const [pendingBarcode, setPendingBarcode] = useState(route?.params?.wrongProductBarcode || null);
  const wrongProductBarcode = route?.params?.wrongProductBarcode || null;
  const [pendingResult, setPendingResult] = useState(null);
  const [noIngredientsPrompt, setNoIngredientsPrompt] = useState(false);
  const [lockedBarcode, setLockedBarcode] = useState(null);
  const cameraRef = useRef(null);
  const lockRef = useRef({ code: null, since: 0, timer: null });

  const LOCK_DELAY = 900; // ms the same barcode must be held to trigger

  function handleClose() {
    clearTimeout(lockRef.current.timer);
    setCameraActive(false);
    navigation.goBack();
  }

  function handleBarcodeScanned({ data }) {
    if (analyzing) return;
    if (!hasApiConfig()) return;

    // Same barcode still in frame — reset the timer if it's a new code
    if (data !== lockRef.current.code) {
      clearTimeout(lockRef.current.timer);
      lockRef.current.code = data;
      lockRef.current.since = Date.now();
      setLockedBarcode(data);

      lockRef.current.timer = setTimeout(() => {
        triggerBarcodeSearch(data);
      }, LOCK_DELAY);
    }
  }

  async function triggerBarcodeSearch(data) {
    if (analyzing) return;
    clearTimeout(lockRef.current.timer);
    setLockedBarcode(null);
    lockRef.current.code = null;

    setScanError(null);
    setAnalyzing(true);
    setSearchingText(t(language, 'scan.barcode_searching'));

    try {
      const result = await analyzeBarcodeWithApi(data, profile, language, token);

      if (result.status === 'NEEDS_PHOTO') {
        setPendingBarcode(data);
        setScanStep('photo');
        setScanError(t(language, 'scan.barcode_not_found'));
        return;
      }

      if (!VALID_STATUSES.has(result.status)) {
        setScanError(t(language, 'errors.not_a_product'));
        return;
      }

      const scan = { ...result, date: new Date().toISOString() };
      await addScanToHistory(scan);
      setCameraActive(false);
      navigation.replace('Result', { result: scan });
    } catch (e) {
      setScanError(buildErrorMessage(e, language));
      setIsLimitError(e.status === 429);
    } finally {
      setAnalyzing(false);
      setSearchingText(null);
    }
  }

  function resetBarcodeScanner() {
    clearTimeout(lockRef.current.timer);
    lockRef.current = { code: null, since: 0, timer: null };
    setLockedBarcode(null);
  }

  // On web, CameraView's onBarcodeScanned is a no-op — use ZXing instead.
  // ZXing does its own image processing and works reliably on all desktop browsers.
  useEffect(() => {
    if (!isWeb || scanStep !== 'barcode' || analyzing || scanError) return;

    let active = true;
    let timeout;
    let reader;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        reader = new BrowserMultiFormatReader();
      } catch (e) {
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      async function scanFrame() {
        if (!active) return;
        const video = document.querySelector('video');
        if (video && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          try {
            const result = reader.decodeFromCanvas(canvas);
            if (active) handleBarcodeScanned({ data: result.getText() });
            return;
          } catch (e) {
            // NotFoundException = no barcode in this frame, keep polling
          }
        }
        if (active) timeout = setTimeout(scanFrame, 250);
      }

      timeout = setTimeout(scanFrame, 800);
    }

    startScanner();
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [isWeb, scanStep, analyzing, scanError]);

  async function handleCapture() {
    if (!hasApiConfig()) {
      setScanError(t(language, 'errors.no_api_key'));
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      await runPhotoAnalysis(photo.base64, photo.uri);
    } catch (e) {
      setScanError(t(language, 'errors.camera_error'));
    }
  }

  async function handleGallery() {
    if (!hasApiConfig()) {
      setScanError(t(language, 'errors.no_api_key'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await runPhotoAnalysis(asset.base64, asset.uri);
    }
  }

  async function runPhotoAnalysis(base64, imageUri) {
    setScanError(null);
    setNoIngredientsPrompt(false);
    setAnalyzing(true);
    setSearchingText(null);
    try {
      const skipBarcodeCache = !!wrongProductBarcode;
      const result = await analyzeProductWithApi(base64, profile, language, token, pendingBarcode, skipBarcodeCache);
      if (!result.status || !VALID_STATUSES.has(result.status)) {
        setScanError(t(language, 'errors.not_a_product'));
        return;
      }
      // Product photo step: if no real ingredients found, suggest photographing ingredients list
      if (scanStep === 'photo' && result.ingredients_source === 'knowledge') {
        setPendingResult({ ...result, date: new Date().toISOString(), imageUri });
        setNoIngredientsPrompt(true);
        return;
      }
      const scan = { ...result, date: new Date().toISOString(), imageUri };
      await addScanToHistory(scan);
      setCameraActive(false);
      navigation.replace('Result', { result: scan });
    } catch (e) {
      setScanError(buildErrorMessage(e, language));
      setIsLimitError(e.status === 429);
    } finally {
      setAnalyzing(false);
    }
  }

  async function navigateToResult(scan) {
    await addScanToHistory(scan);
    setCameraActive(false);
    navigation.replace('Result', { result: scan });
  }

  function buildErrorMessage(e, lang) {
    if (e.status === 429) return t(lang, 'limits.credits_exhausted');
    if (e.message?.toLowerCase().includes('network') || e.message?.toLowerCase().includes('fetch')) {
      return t(lang, 'errors.network_error');
    }
    return t(lang, 'errors.analysis_failed');
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionIconWrap}>
          <PremiumIcon name="scan" size={54} />
        </View>
        <Text style={styles.permissionText}>{t(language, 'scan.camera_permission')}</Text>
        <TouchableOpacity style={styles.allowButton} onPress={requestPermission} activeOpacity={0.9}>
          <Text style={styles.allowButtonText}>{t(language, 'scan.allow')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryOnlyButton} onPress={handleGallery}>
          <Text style={styles.galleryOnlyText}>{t(language, 'scan.gallery')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isBarcodeStep = scanStep === 'barcode';
  const isPhotoStep = scanStep === 'photo';
  const isIngredientsStep = scanStep === 'ingredients';
  const isLocked = isBarcodeStep && !!lockedBarcode;

  const frameHint = isBarcodeStep
    ? t(language, 'scan.barcode_hint')
    : isIngredientsStep
      ? t(language, 'scan.photo_ingredients_hint')
      : t(language, 'scan.photo_product_hint');

  const stepLabel = isIngredientsStep
    ? `📷 ${t(language, 'scan.photo_ingredients_hint')}`
    : `📷 ${t(language, 'scan.photo_product_hint')}`;

  function handleBackFromPhoto() {
    if (isIngredientsStep) {
      setScanStep('photo');
      setNoIngredientsPrompt(false);
    } else {
      setScanStep('barcode');
      setPendingBarcode(null);
      resetBarcodeScanner();
    }
    setScanError(null);
  }

  return (
    <View style={styles.container}>
      {cameraActive && (
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={cameraRef}
          facing="back"
          onBarcodeScanned={isBarcodeStep && !analyzing ? handleBarcodeScanned : undefined}
          barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        />
      )}

      {cameraActive && (
        <SafeAreaView style={styles.overlay} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeBtn}
              disabled={analyzing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.scanTitle}>{t(language, 'scan.title')}</Text>
            <View style={{ width: 52 }} />
          </View>

          {isBarcodeStep && (
            <View style={styles.barcodeTitleRow} pointerEvents="none">
              <Text style={styles.barcodeTitle}>{t(language, 'scan.barcode_title')}</Text>
            </View>
          )}

          <View style={styles.frameContainer} pointerEvents="none">
            <View style={isBarcodeStep ? styles.barcodeFrame : styles.frame}>
              <View style={[styles.corner, styles.topLeft, isLocked && styles.cornerLocked]} />
              <View style={[styles.corner, styles.topRight, isLocked && styles.cornerLocked]} />
              <View style={[styles.corner, styles.bottomLeft, isLocked && styles.cornerLocked]} />
              <View style={[styles.corner, styles.bottomRight, isLocked && styles.cornerLocked]} />
              {isBarcodeStep && (
                <View style={[styles.barcodeLine, isLocked && styles.barcodeLineLocked]} />
              )}
            </View>
            <Text style={styles.frameHint}>{frameHint}</Text>
          </View>

          {!isBarcodeStep && (
            <View style={styles.stepRow} pointerEvents="none">
              <View style={styles.stepPill}>
                <Text style={styles.stepText}>{stepLabel}</Text>
              </View>
            </View>
          )}

          {isBarcodeStep && (
            <View style={styles.switchRow}>
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setScanStep('photo')}
                disabled={analyzing}
              >
                <Text style={styles.switchBtnText}>📷 {t(language, 'scan.take_photo')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isBarcodeStep && (
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} disabled={analyzing}>
                <PremiumIcon name="scan" size={28} color={Colors.white} muted />
                <Text style={styles.galleryBtnText}>{t(language, 'scan.gallery')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.captureBtn, analyzing && styles.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={analyzing}
              >
                {analyzing ? (
                  <ActivityIndicator color={Colors.primary} size="large" />
                ) : (
                  <View style={styles.captureBtnInner} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleBackFromPhoto}
                disabled={analyzing}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.cancelBtnText}>←</Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      )}

      {(analyzing || searchingText) && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <PremiumIcon name="ai" size={58} />
            <Text style={styles.analyzingText}>
              {searchingText || t(language, 'scan.analyzing')}
            </Text>
            <Text style={styles.analyzingSubtitle}>
              {searchingText ? '' : t(language, 'scan.analyzing_subtitle')}
            </Text>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
          </View>
        </View>
      )}

      {noIngredientsPrompt && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{t(language, 'scan.no_ingredients_prompt')}</Text>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => { setNoIngredientsPrompt(false); setScanStep('ingredients'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.errorBtnText}>{t(language, 'scan.take_ingredients_photo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setNoIngredientsPrompt(false); navigateToResult(pendingResult); }}
              activeOpacity={0.75}
            >
              <Text style={styles.errorLinkText}>{t(language, 'scan.show_result_anyway')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{scanError}</Text>
            {isLimitError && (
              <TouchableOpacity
                onPress={() => { setScanError(null); setIsLimitError(false); navigation.navigate('Paywall'); }}
                activeOpacity={0.75}
              >
                <Text style={styles.errorLinkText}>{t(language, 'limits.change_subscription')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={() => { setScanError(null); setIsLimitError(false); resetBarcodeScanner(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.errorBtnText}>{t(language, 'scan.dismiss')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 26;
const CORNER_THICKNESS = 4;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.darkSurface },
  overlay: { ...StyleSheet.absoluteFillObject, flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  closeBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: '800', fontFamily: BrandFonts.heading || undefined },
  barcodeTitleRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  barcodeTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    fontFamily: BrandFonts.heading || undefined,
  },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 280, height: 280, position: 'relative' },
  barcodeFrame: { width: 300, height: 160, position: 'relative', justifyContent: 'center' },
  barcodeLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.8,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: Colors.accent,
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerLocked: { borderColor: Colors.safe },
  barcodeLineLocked: { backgroundColor: Colors.safe },
  frameHint: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  stepRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  stepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  stepText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
  },
  switchRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  switchBtn: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  switchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 24,
    paddingTop: 16,
  },
  galleryBtn: { alignItems: 'center', width: 72 },
  galleryBtnText: { color: '#fff', fontSize: 12, marginTop: 4, fontWeight: '600' },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  cancelBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  cancelBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingCard: {
    backgroundColor: Colors.glass,
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    width: '82%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  analyzingText: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 14, fontFamily: BrandFonts.headingMed || 'serif' },
  analyzingSubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', fontWeight: '500' },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: Colors.glass,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '82%',
    gap: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
  },
  errorText: { fontSize: 15, fontWeight: '600', color: Colors.text, textAlign: 'center', lineHeight: 22 },
  errorLinkText: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'center', textDecorationLine: 'underline' },
  errorBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primaryDark,
  },
  errorBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 20,
  },
  permissionIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
  },
  allowButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderBottomWidth: 4,
    borderBottomColor: Colors.primaryDark,
    alignItems: 'center',
    width: '100%',
  },
  allowButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  galleryOnlyButton: { padding: 12 },
  galleryOnlyText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
});
