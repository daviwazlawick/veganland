import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../constants/colors';
import { Brand } from '../brand';
import { t } from '../i18n';
import { apiParsePlan } from '../services/apiService';

const isNovaQI = Brand.id === 'novaqi';

// Reads a file URI as base64 on native
async function readNativeUri(uri) {
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

export default function ImportPlanButton({ language, token, onExtracted, style }) {
  const [showModal, setShowModal] = useState(false);
  const [parsing, setParsing] = useState(false);

  if (!isNovaQI) return null;
  return null; // temporarily hidden — upload not working

  async function sendToApi(base64, mediaType) {
    if (!base64) return;
    setParsing(true);
    try {
      const extracted = await apiParsePlan(token, base64, language, mediaType);
      const hasAny = extracted && Object.values(extracted).some(v => v !== null);
      if (!hasAny) { Alert.alert('', t(language, 'nutrition.import_plan_empty')); return; }
      onExtracted(extracted);
    } catch {
      Alert.alert('', t(language, 'nutrition.import_plan_error'));
    } finally {
      setParsing(false);
    }
  }

  async function pickCamera() {
    setShowModal(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    await sendToApi(result.assets[0].base64, null);
  }

  async function pickGallery() {
    setShowModal(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (result.canceled || !result.assets?.[0]?.base64) return;
    await sendToApi(result.assets[0].base64, null);
  }

  async function pickDocument() {
    setShowModal(false);
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const base64 = await readNativeUri(asset.uri);
    await sendToApi(base64, asset.mimeType || 'application/pdf');
  }

  // Web: <input type="file"> overlaid directly on the button — no async gap, no modal needed
  function handleWebFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset so same file can be picked again
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const comma = result.indexOf(',');
      const base64 = comma >= 0 ? result.slice(comma + 1) : result;
      sendToApi(base64, file.type || 'application/pdf');
    };
    reader.onerror = () => Alert.alert('', t(language, 'nutrition.import_plan_error'));
    reader.readAsDataURL(file);
  }

  if (Platform.OS === 'web') {
    return (
      <>
        <View style={[styles.importBtn, style]}>
          <Text style={styles.importBtnIcon}>📄</Text>
          <Text style={styles.importBtnText}>{t(language, 'nutrition.import_plan_btn')}</Text>
          {/* Invisible file input overlaid on button — direct user gesture, no async gap */}
          <input
            type="file"
            accept="application/pdf,image/*"
            onChange={handleWebFileChange}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
          />
        </View>
        {parsing && (
          <View style={styles.parsingOverlay}>
            <View style={styles.parsingBox}>
              <ActivityIndicator size="large" color={Colors.navy} />
              <Text style={styles.parsingText}>{t(language, 'nutrition.import_plan_loading')}</Text>
            </View>
          </View>
        )}
      </>
    );
  }

  // Native: modal with Camera / Gallery / Document
  return (
    <>
      <TouchableOpacity onPress={() => setShowModal(true)} style={[styles.importBtn, style]}>
        <Text style={styles.importBtnIcon}>📄</Text>
        <Text style={styles.importBtnText}>{t(language, 'nutrition.import_plan_btn')}</Text>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowModal(false)} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <TouchableOpacity style={styles.option} onPress={pickCamera}>
            <Text style={styles.optionText}>📷  {t(language, 'nutrition.import_plan_camera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={pickGallery}>
            <Text style={styles.optionText}>🖼️  {t(language, 'nutrition.import_plan_gallery')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={pickDocument}>
            <Text style={styles.optionText}>📄  {t(language, 'nutrition.import_plan_document')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {parsing && (
        <View style={styles.parsingOverlay}>
          <View style={styles.parsingBox}>
            <ActivityIndicator size="large" color={Colors.navy} />
            <Text style={styles.parsingText}>{t(language, 'nutrition.import_plan_loading')}</Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  importBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.navy, borderRadius: 14, padding: 14, borderStyle: 'dashed', overflow: 'hidden' },
  importBtnIcon: { fontSize: 18 },
  importBtnText: { fontSize: 15, fontWeight: '700', color: Colors.navy },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 8 },
  handle: { width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  option: { paddingVertical: 16, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#f8fafc' },
  optionText: { fontSize: 16, fontWeight: '600', color: Colors.navy },
  parsingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  parsingBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 16, marginHorizontal: 40 },
  parsingText: { fontSize: 14, fontWeight: '600', color: Colors.navy, textAlign: 'center' },
});
