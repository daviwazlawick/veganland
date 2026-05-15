import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { analyzeProductWithApi, hasApiConfig } from '../services/apiService';

export default function ScanScreen({ navigation }) {
  const { language, profile, addScanToHistory } = useApp();
  const [permission, requestPermission] = useCameraPermissions();
  const [analyzing, setAnalyzing] = useState(false);
  const cameraRef = useRef(null);

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
      const result = await analyzeProductWithApi(base64, profile, language);

      const scan = {
        ...result,
        date: new Date().toISOString(),
        imageUri,
      };
      await addScanToHistory(scan);
      navigation.navigate('Result', { result: scan });
    } catch (e) {
      const msg = e.message?.includes('network') || e.message?.includes('fetch')
        ? t(language, 'errors.network_error')
        : t(language, 'errors.analysis_failed');
      Alert.alert('', msg);
    } finally {
      setAnalyzing(false);
    }
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionText}>{t(language, 'scan.camera_permission')}</Text>
        <TouchableOpacity style={styles.allowButton} onPress={requestPermission}>
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
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <SafeAreaView style={styles.overlay}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.scanTitle}>{t(language, 'scan.title')}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.frameContainer}>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.frameHint}>{t(language, 'scan.instruction')}</Text>
          </View>

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} disabled={analyzing}>
              <Text style={styles.galleryBtnIcon}>🖼️</Text>
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
      </CameraView>

      {analyzing && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <Text style={styles.analyzingIcon}>🤖</Text>
            <Text style={styles.analyzingText}>{t(language, 'scan.analyzing')}</Text>
            <Text style={styles.analyzingSubtitle}>{t(language, 'scan.analyzing_subtitle')}</Text>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
          </View>
        </View>
      )}
    </View>
  );
}

const CORNER_SIZE = 24;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  topLeft: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  topRight: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  frameHint: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 20,
    fontSize: 14,
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
  galleryBtn: { alignItems: 'center', width: 72 },
  galleryBtnIcon: { fontSize: 28 },
  galleryBtnText: { color: '#fff', fontSize: 12, marginTop: 4 },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureBtnDisabled: { opacity: 0.5 },
  captureBtnInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '80%',
  },
  analyzingIcon: { fontSize: 48, marginBottom: 12 },
  analyzingText: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  analyzingSubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center' },
  permissionContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  permissionIcon: { fontSize: 64, marginBottom: 20 },
  permissionText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 26,
  },
  allowButton: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 40,
    paddingVertical: 14,
    marginBottom: 12,
  },
  allowButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  galleryOnlyButton: { padding: 12 },
  galleryOnlyText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
