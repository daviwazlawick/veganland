import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { analyzeProductWithApi, hasApiConfig } from '../services/apiService';
import { PremiumIcon } from '../components/ui';

const TIP_KEYS = ['scan.tip_barcode', 'scan.tip_ingredients', 'scan.tip_product'];
const VALID_STATUSES = new Set(['SAFE', 'CAUTION', 'NOT_SAFE']);

export default function ScanScreen({ navigation }) {
  const { language, profile, addScanToHistory } = useApp();
  const { token } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);
  const cameraRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => setTipIndex(i => (i + 1) % TIP_KEYS.length), 3500);
    return () => clearInterval(id);
  }, []);

  function handleClose() {
    setCameraActive(false);
    navigation.goBack();
  }

  async function handleCapture() {
    if (!hasApiConfig()) {
      Alert.alert('', t(language, 'errors.no_api_key'));
      return;
    }
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      await runAnalysis(photo.base64, photo.uri);
    } catch (e) {
      Alert.alert('', t(language, 'errors.camera_error'));
    }
  }

  async function handleGallery() {
    if (!hasApiConfig()) {
      Alert.alert('', t(language, 'errors.no_api_key'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      await runAnalysis(asset.base64, asset.uri);
    }
  }

  async function runAnalysis(base64, imageUri) {
    setAnalyzing(true);
    try {
      const result = await analyzeProductWithApi(base64, profile, language, token);
      if (!result.status || !VALID_STATUSES.has(result.status)) {
        Alert.alert(
          t(language, 'errors.not_a_product_title'),
          t(language, 'errors.not_a_product')
        );
        return;
      }
      const scan = { ...result, date: new Date().toISOString(), imageUri };
      await addScanToHistory(scan);
      setCameraActive(false);
      navigation.replace('Result', { result: scan });
    } catch (e) {
      let msg;
      if (e.status === 429) {
        const usage = e.data?.usage;
        const limit = usage?.limit || 30;
        msg = t(language, 'limits.monthly_reached', { limit });
        if (usage?.resets_at) {
          const days = Math.ceil((new Date(usage.resets_at) - new Date()) / 86400000);
          msg += '\n' + (days <= 1
            ? t(language, 'limits.resets_tomorrow')
            : t(language, 'limits.resets_in_days', { days }));
        }
      } else if (e.message?.toLowerCase().includes('network') || e.message?.toLowerCase().includes('fetch')) {
        msg = t(language, 'errors.network_error');
      } else {
        msg = t(language, 'errors.analysis_failed');
      }
      Alert.alert('', msg);
    } finally {
      setAnalyzing(false);
    }
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

  return (
    <View style={styles.container}>
      {cameraActive && (
        <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} facing="back" />
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
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.frameContainer} pointerEvents="none">
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.frameHint}>{t(language, 'scan.instruction')}</Text>
          </View>

          <View style={styles.tipsRow} pointerEvents="none">
            <View style={styles.tipPill}>
              <Text style={styles.tipIcon}>💡</Text>
              <Text style={styles.tipText}>{t(language, TIP_KEYS[tipIndex])}</Text>
            </View>
          </View>

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

            <View style={{ width: 72 }} />
          </View>
        </SafeAreaView>
      )}

      {analyzing && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <PremiumIcon name="ai" size={58} />
            <Text style={styles.analyzingText}>{t(language, 'scan.analyzing')}</Text>
            <Text style={styles.analyzingSubtitle}>{t(language, 'scan.analyzing_subtitle')}</Text>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,40,34,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 280, height: 280, position: 'relative' },
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
  frameHint: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 20,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingBottom: 24,
    paddingTop: 16,
  },
  tipsRow: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  tipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,40,34,0.62)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tipIcon: { fontSize: 14 },
  tipText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
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
  analyzingText: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 14, fontFamily: 'serif' },
  analyzingSubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', fontWeight: '500' },
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
