import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { analyzeProductWithApi, analyzeBarcodeWithApi, analyzeIngredientsPhotoWithApi, hasApiConfig } from '../services/apiService';
import { logFunnelEvent } from '../services/funnelService';
import { PremiumIcon } from '../components/ui';
import ScanLimitCard from '../components/ScanLimitCard';

const isNovaQI = Brand.id === 'novaqi';

const VALID_STATUSES = new Set(['SAFE', 'CAUTION', 'NOT_SAFE']);

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'];

export default function ScanScreen({ navigation, route }) {
  const { language, profile, addScanToHistory } = useApp();
  const { token, refreshUser, markOnboardingScanUsed } = useAuth();
  const insets = useSafeAreaInsets();
  const isOnboarding = route?.params?.onboarding === true;
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
  const [showCameraChoice, setShowCameraChoice] = useState(false);
  const [lockedBarcode, setLockedBarcode] = useState(null);
  const cameraRef = useRef(null);
  const lockRef = useRef({ code: null, since: 0, timer: null });

  const LOCK_DELAY = 900; // ms the same barcode must be held to trigger

  function handleClose() {
    clearTimeout(lockRef.current.timer);
    setCameraActive(false);
    if (isOnboarding) {
      // No previous screen to pop back to — land the user on Main so they
      // can explore the app even if they bail on the guided scan.
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
      return;
    }
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

    logFunnelEvent('scan_started', { method: 'barcode', onboarding: isOnboarding }, token);
    try {
      const result = await analyzeBarcodeWithApi(data, profile, language, token);

      if (result.status === 'NEEDS_PHOTO' || result.status === 'NEEDS_LABEL_PHOTO') {
        setPendingBarcode(data);
        setScanStep('photo');
        setScanError(t(language, 'scan.barcode_not_found'));
        return;
      }

      // Product identity known (barcode matched a DB stub) but no ingredients
      // yet — show the identified name for confirmation, then let the user
      // take the ingredients photo. Never analyze without real ingredients.
      if (result.status === 'NEEDS_INGREDIENTS_PHOTO') {
        setPendingBarcode(data);
        setPendingResult({ ...result, date: new Date().toISOString() });
        setNoIngredientsPrompt(true);
        return;
      }

      if (!VALID_STATUSES.has(result.status)) {
        setScanError(t(language, 'errors.not_a_product'));
        return;
      }

      const scan = { ...result, date: new Date().toISOString() };
      await addScanToHistory(scan);
      if (isOnboarding) {
        await markOnboardingScanUsed();
        refreshUser().catch(() => {});
      }
      logFunnelEvent('scan_completed', {
        method: 'barcode',
        onboarding: isOnboarding,
        status: result.status,
      }, token);
      setCameraActive(false);
      navigation.replace('Result', { result: scan, onboarding: isOnboarding });
    } catch (e) {
      setScanError(buildErrorMessage(e, language));
      setIsLimitError(e.status === 429);
      logFunnelEvent('scan_failed', {
        method: 'barcode',
        onboarding: isOnboarding,
        reason: e.status === 429 ? 'limit' : (e.message || 'error').slice(0, 120),
      }, token);
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
    logFunnelEvent('scan_started', {
      method: scanStep === 'ingredients' ? 'ingredients' : 'photo',
      onboarding: isOnboarding,
    }, token);
    try {
      const skipBarcodeCache = !!wrongProductBarcode;
      // Two distinct call shapes:
      //   - ingredients step → dedicated endpoint that only extracts ingredients
      //     and writes them back to the previously-identified product row.
      //   - photo step (label) → full identify+analyze path.
      const result = scanStep === 'ingredients'
        ? await analyzeIngredientsPhotoWithApi(
            base64, profile, language, token, pendingBarcode,
            pendingResult?.product_name || null,
            pendingResult?.brand || null,
          )
        : await analyzeProductWithApi(base64, profile, language, token, pendingBarcode, skipBarcodeCache);

      // Server identified the product but has no ingredients yet — bounce the
      // user to the ingredients step. Never fall through to an analysis
      // without ingredients (would be inventing them).
      if (result.status === 'NEEDS_INGREDIENTS_PHOTO') {
        setPendingBarcode(result.barcode || pendingBarcode);
        setPendingResult({ ...result, date: new Date().toISOString(), imageUri });
        setNoIngredientsPrompt(true);
        return;
      }

      if (!result.status || !VALID_STATUSES.has(result.status)) {
        setScanError(t(language, 'errors.not_a_product'));
        return;
      }

      const scan = { ...result, date: new Date().toISOString(), imageUri };
      await addScanToHistory(scan);
      if (isOnboarding) {
        await markOnboardingScanUsed();
        refreshUser().catch(() => {});
      }
      logFunnelEvent('scan_completed', {
        method: scanStep === 'ingredients' ? 'ingredients' : 'photo',
        onboarding: isOnboarding,
        status: result.status,
      }, token);
      setCameraActive(false);
      navigation.replace('Result', { result: scan, onboarding: isOnboarding });
    } catch (e) {
      setScanError(buildErrorMessage(e, language));
      setIsLimitError(e.status === 429);
      logFunnelEvent('scan_failed', {
        method: scanStep === 'ingredients' ? 'ingredients' : 'photo',
        onboarding: isOnboarding,
        reason: e.status === 429 ? 'limit' : (e.message || 'error').slice(0, 120),
      }, token);
    } finally {
      setAnalyzing(false);
    }
  }

  async function navigateToResult(scan) {
    await addScanToHistory(scan);
    setCameraActive(false);
    navigation.replace('Result', { result: scan, onboarding: isOnboarding });
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
        <TouchableOpacity style={[styles.allowButton, !isNovaQI && styles.allowButtonSkeuo]} onPress={requestPermission} activeOpacity={0.9}>
          <Text style={styles.allowButtonText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t(language, 'scan.allow')}</Text>
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

  const stepLabelText = isIngredientsStep
    ? t(language, 'scan.photo_ingredients_hint')
    : t(language, 'scan.photo_product_hint');

  function handleBackFromPhoto() {
    if (isIngredientsStep) {
      // If the product was identified from a DB stub (barcode-first flow), the
      // user never took a label photo — going back should return to the barcode
      // scanner, not the photo step.
      const cameFromStub = !!pendingResult?.product_id;
      if (cameFromStub) {
        setScanStep('barcode');
        setPendingBarcode(null);
        setPendingResult(null);
        resetBarcodeScanner();
      } else {
        setScanStep('photo');
      }
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
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scanTitle}>{t(language, 'scan.title')}</Text>
            <View style={{ width: 52 }} />
          </View>

          {isOnboarding && isBarcodeStep && (
            <View style={onboardingScanStyles.hero} pointerEvents="none">
              <Text style={onboardingScanStyles.heroTitle}>{t(language, 'onboarding.scan_title')}</Text>
              <Text style={onboardingScanStyles.heroHeadline}>{t(language, 'onboarding.scan_headline')}</Text>
              <Text style={onboardingScanStyles.heroSub}>{t(language, 'onboarding.scan_subtitle')}</Text>
              <Text style={onboardingScanStyles.heroHint}><Ionicons name="sparkles-outline" size={14} color={Colors.primary} /> {t(language, 'onboarding.scan_hint')}</Text>
            </View>
          )}

          {!isOnboarding && isBarcodeStep && (
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
                <Text style={styles.stepText}><Ionicons name="camera-outline" size={14} color="#fff" /> {stepLabelText}</Text>
              </View>
            </View>
          )}

          {isBarcodeStep && (
            <View style={styles.switchRow}>
              <TouchableOpacity
                style={styles.switchBtn}
                onPress={() => setShowCameraChoice(true)}
                disabled={analyzing}
              >
                <Text style={styles.switchBtnText}><Ionicons name="camera-outline" size={16} color="#fff" /> {t(language, 'scan.take_photo')}</Text>
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
            {pendingResult?.product_name ? (
              <>
                <Text style={styles.errorText}>{t(language, 'scan.confirm_product_title')}</Text>
                <Text style={[styles.errorText, { fontSize: 20, fontWeight: '800', marginTop: 4 }]}>
                  {pendingResult.product_name}
                </Text>
                <Text style={[styles.errorText, { fontSize: 14, marginTop: 8, opacity: 0.85 }]}>
                  {t(language, 'scan.confirm_product_ingredients_needed')}
                </Text>
              </>
            ) : (
              <Text style={styles.errorText}>{t(language, 'scan.no_ingredients_prompt')}</Text>
            )}
            <TouchableOpacity
              style={[styles.errorBtn, !isNovaQI && styles.errorBtnSkeuo]}
              onPress={() => { setNoIngredientsPrompt(false); setScanStep('ingredients'); }}
              activeOpacity={0.85}
            >
              <Text style={styles.errorBtnText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>{t(language, 'scan.take_ingredients_photo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setNoIngredientsPrompt(false);
                setPendingResult(null);
                setPendingBarcode(null);
                setScanStep('barcode');
                resetBarcodeScanner();
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.errorLinkText}>{t(language, 'scan.wrong_product')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanError && !isLimitError && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{scanError}</Text>
            <TouchableOpacity
              style={[styles.errorBtn, !isNovaQI && styles.errorBtnSkeuo]}
              onPress={() => { setScanError(null); setIsLimitError(false); resetBarcodeScanner(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.errorBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{t(language, 'scan.dismiss')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLimitError && (
        <ScanLimitCard
          navigation={navigation}
          source="scan_limit"
          token={token}
          onDismiss={() => { setScanError(null); setIsLimitError(false); resetBarcodeScanner(); }}
        />
      )}

      <Modal
        visible={showCameraChoice}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCameraChoice(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowCameraChoice(false)}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>
        <View style={[cameraChoiceStyles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={cameraChoiceStyles.handle} />
          <Text style={cameraChoiceStyles.title}>{t(language, 'scan.camera_choice_title')}</Text>
          <TouchableOpacity
            style={cameraChoiceStyles.option}
            activeOpacity={0.85}
            onPress={() => { setShowCameraChoice(false); setScanStep('photo'); }}
          >
            <Ionicons name="camera-outline" size={28} color={Colors.navy} />
            <View style={{ flex: 1 }}>
              <Text style={cameraChoiceStyles.optionLabel}>{t(language, 'scan.camera_choice_product')}</Text>
              <Text style={cameraChoiceStyles.optionSub}>{t(language, 'scan.camera_choice_product_sub')}</Text>
            </View>
            <Text style={cameraChoiceStyles.optionArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={cameraChoiceStyles.option}
            activeOpacity={0.85}
            onPress={() => { setShowCameraChoice(false); navigation.navigate('PlateAnalysis'); }}
          >
            <Text style={cameraChoiceStyles.optionIcon}>🍽️</Text>
            <View style={{ flex: 1 }}>
              <Text style={cameraChoiceStyles.optionLabel}>{t(language, 'scan.camera_choice_plate')}</Text>
              <Text style={cameraChoiceStyles.optionSub}>{t(language, 'scan.camera_choice_plate_sub')}</Text>
            </View>
            <Text style={cameraChoiceStyles.optionArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  analyzingText: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 14, fontFamily: BrandFonts.headingMed || undefined },
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
  },
  errorBtnSkeuo: { borderBottomWidth: 3, borderBottomColor: Colors.primaryDark },
  errorBtnText: { color: Colors.white, fontSize: 15, fontWeight: '800' },
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
    alignItems: 'center',
    width: '100%',
  },
  allowButtonSkeuo: { borderBottomWidth: 4, borderBottomColor: Colors.primaryDark },
  allowButtonText: { color: Colors.white, fontSize: 17, fontWeight: '800' },
  galleryOnlyButton: { padding: 12 },
  galleryOnlyText: { color: Colors.accent, fontSize: 15, fontWeight: '700' },
});

const onboardingScanStyles = StyleSheet.create({
  hero: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 22,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroTitle: {
    color: '#FFD37A',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
    marginBottom: 4,
  },
  heroHeadline: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 27,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  heroHint: {
    color: '#FFD37A',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});

const cameraChoiceStyles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 12,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: { fontSize: 28 },
  optionLabel: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  optionSub: { fontSize: 13, color: Colors.textLight, fontWeight: '500' },
  optionArrow: { fontSize: 22, color: Colors.textMuted, fontWeight: '700' },
});
