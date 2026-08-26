import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Image, TextInput, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { apiReportProduct } from '../services/apiService';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';

// Photo slots: 3 required (barcode, ingredients, front label) + 2 optional.
// Order matters for the email — the reviewer expects barcode first.
const SLOTS = [
  { key: 'barcode',     required: true,  i18n: 'report_product.slot_barcode',     hintI18n: 'report_product.slot_barcode_hint' },
  { key: 'ingredients', required: true,  i18n: 'report_product.slot_ingredients', hintI18n: 'report_product.slot_ingredients_hint' },
  { key: 'label',       required: true,  i18n: 'report_product.slot_label',       hintI18n: 'report_product.slot_label_hint' },
  { key: 'optional_1',  required: false, i18n: 'report_product.slot_optional',    hintI18n: 'report_product.slot_optional_hint' },
  { key: 'optional_2',  required: false, i18n: 'report_product.slot_optional',    hintI18n: 'report_product.slot_optional_hint' },
];

// Preset categories the user can tick — hint to the reviewer what to fix.
// Uses stable keys; the email body shows them joined with commas.
const CATEGORIES = [
  { key: 'wrong_product',   i18n: 'report_product.cat_wrong_product' },
  { key: 'wrong_ingredients', i18n: 'report_product.cat_wrong_ingredients' },
  { key: 'wrong_nutrition', i18n: 'report_product.cat_wrong_nutrition' },
  { key: 'other',           i18n: 'report_product.cat_other' },
];

export default function ReportProductScreen({ navigation, route }) {
  const { language } = useApp();
  const { token } = useAuth();

  const productName = route?.params?.productName || '';
  const barcode     = route?.params?.barcode || '';

  const [photos, setPhotos] = useState({});   // key -> { uri, base64, mime }
  const [cats, setCats]     = useState([]);
  const [desc, setDesc]     = useState('');
  const [busy, setBusy]     = useState(false);

  async function pickPhoto(slotKey) {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        t(language, 'report_product.alert_perm_title') || 'Câmara',
        t(language, 'report_product.alert_perm_msg') || 'Precisamos de acesso à câmara para tirar as fotos.'
      );
      return;
    }
    // Prefer the camera (fresh photo, higher fidelity than an old gallery
    // shot for a product review). Quality 0.6 keeps payloads under ~2 MB each
    // — five slots × 2 MB = well within the 30 MB nginx cap.
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]) return;
    const asset = picked.assets[0];
    const mime = asset.mimeType || 'image/jpeg';
    setPhotos(prev => ({
      ...prev,
      [slotKey]: {
        uri: asset.uri,
        mime,
        base64: `data:${mime};base64,${asset.base64}`,
      },
    }));
  }

  function removePhoto(slotKey) {
    setPhotos(prev => {
      const next = { ...prev };
      delete next[slotKey];
      return next;
    });
  }

  function toggleCat(key) {
    setCats(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function submit() {
    const missingRequired = SLOTS.filter(s => s.required).filter(s => !photos[s.key]);
    if (missingRequired.length > 0) {
      Alert.alert(
        t(language, 'report_product.alert_missing_title') || 'Fotos em falta',
        t(language, 'report_product.alert_missing_msg') || 'As fotos do barcode, ingredientes e frente do produto são obrigatórias.'
      );
      return;
    }
    setBusy(true);
    try {
      const payload = SLOTS
        .filter(s => photos[s.key])
        .map(s => ({
          name: s.key,
          mime: photos[s.key].mime,
          base64: photos[s.key].base64,
        }));
      await apiReportProduct(token, {
        productName, barcode, description: desc.trim(),
        categories: cats, language, photos: payload,
      });
      Alert.alert(
        t(language, 'report_product.alert_sent_title') || 'Enviado',
        t(language, 'report_product.alert_sent_msg') || 'Obrigado! Vamos rever a informação e actualizar o produto assim que possível.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert(
        t(language, 'report_product.alert_error_title') || 'Erro',
        (e?.message || 'unknown_error')
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Text style={s.headerBtnTxt}>←</Text>
          </TouchableOpacity>
          <Text
            style={s.headerTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >{t(language, 'report_product.title') || 'Reportar produto'}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={s.subtitle}>
            {t(language, 'report_product.subtitle') || 'Ajuda-nos a corrigir os dados deste produto. Não conta como scan.'}
          </Text>

          {/* Product summary */}
          {(productName || barcode) && (
            <View style={s.productCard}>
              {productName ? <Text style={s.productName} numberOfLines={2}>{productName}</Text> : null}
              {barcode ? <Text style={s.productBarcode}>{barcode}</Text> : null}
            </View>
          )}

          {/* Categories */}
          <Text style={s.sectionTitle}>{t(language, 'report_product.section_what') || 'O que está errado?'}</Text>
          <View style={s.catRow}>
            {CATEGORIES.map(c => {
              const on = cats.includes(c.key);
              return (
                <TouchableOpacity
                  key={c.key}
                  onPress={() => toggleCat(c.key)}
                  style={[s.catChip, on && s.catChipOn]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[s.catChipTxt, on && s.catChipTxtOn]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >{t(language, c.i18n)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Description */}
          <Text style={s.sectionTitle}>{t(language, 'report_product.section_desc') || 'Descrição (opcional)'}</Text>
          <TextInput
            style={s.descInput}
            value={desc}
            onChangeText={setDesc}
            multiline
            numberOfLines={4}
            maxLength={3000}
            placeholder={t(language, 'report_product.desc_placeholder') || 'Ex: os ingredientes reais são leite, açúcar, cacau — o app mostra amendoim que não existe.'}
            placeholderTextColor={Colors.textMuted}
            textAlignVertical="top"
          />

          {/* Photos */}
          <Text style={s.sectionTitle}>{t(language, 'report_product.section_photos') || 'Fotos'}</Text>
          <Text style={s.sectionHint}>{t(language, 'report_product.photos_hint') || 'Barcode + ingredientes + frente do produto são obrigatórios. Até 2 fotos extra opcionais.'}</Text>

          <View style={s.slotGrid}>
            {SLOTS.map(slot => {
              const p = photos[slot.key];
              return (
                <View key={slot.key} style={s.slot}>
                  <TouchableOpacity
                    onPress={() => pickPhoto(slot.key)}
                    style={[s.slotTouch, slot.required && !p && s.slotTouchRequired]}
                    activeOpacity={0.8}
                  >
                    {p ? (
                      <Image source={{ uri: p.uri }} style={s.slotImg} resizeMode="cover" />
                    ) : (
                      <Text style={s.slotPlus}>＋</Text>
                    )}
                  </TouchableOpacity>
                  <Text
                    style={[s.slotLabel, slot.required && s.slotLabelReq]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >{t(language, slot.i18n)}{slot.required ? ' *' : ''}</Text>
                  <Text style={s.slotHint} numberOfLines={2}>{t(language, slot.hintI18n)}</Text>
                  {p && (
                    <TouchableOpacity onPress={() => removePhoto(slot.key)} style={s.slotRemove}>
                      <Text style={s.slotRemoveTxt}>×</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          <TouchableOpacity
            style={[s.submitBtn, busy && s.submitBtnBusy]}
            onPress={submit}
            disabled={busy}
            activeOpacity={0.9}
          >
            {busy
              ? <ActivityIndicator color="#fff" />
              : <Text
                  style={s.submitBtnTxt}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >{t(language, 'report_product.submit') || 'Enviar pedido de revisão'}</Text>}
          </TouchableOpacity>

          <Text style={s.footNote}>
            {t(language, 'report_product.foot_note') || 'Este envio não conta como scan e não afecta o teu limite.'}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 8, paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.headerBg,
  },
  headerBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerBtnTxt: { fontSize: 26, color: Colors.headerText, marginTop: -2 },
  headerTitle:  { fontSize: 17, fontWeight: '800', color: Colors.headerText, flex: 1, textAlign: 'center', fontFamily: BrandFonts?.heading || undefined },

  content: { padding: 18, paddingBottom: 40, gap: 14 },
  subtitle: { fontSize: 13, color: Colors.textMuted, lineHeight: 18, marginBottom: 4 },

  productCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border || '#E5E7EB', gap: 4,
  },
  productName:    { fontSize: 15, fontWeight: '800', color: Colors.text },
  productBarcode: { fontSize: 12, fontFamily: BrandFonts?.mono || undefined, color: Colors.textMuted },

  sectionTitle: { fontSize: 13, fontWeight: '800', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
  sectionHint:  { fontSize: 12, color: Colors.textMuted, marginTop: -6, marginBottom: 4 },

  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: Colors.backgroundSecondary || '#F1F5F9',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  catChipOn:    { backgroundColor: (Colors.primary || '#7CB518') + '20', borderColor: Colors.primary || '#7CB518' },
  catChipTxt:   { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  catChipTxtOn: { color: Colors.primary || '#7CB518' },

  descInput: {
    backgroundColor: Colors.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.border || '#E5E7EB',
    paddingHorizontal: 14, paddingVertical: 12, minHeight: 96,
    fontSize: 14, color: Colors.text,
  },

  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  slot:     { width: '31.5%', gap: 4, position: 'relative' },
  slotTouch: {
    aspectRatio: 1, borderRadius: 12,
    backgroundColor: Colors.backgroundSecondary || '#F1F5F9',
    borderWidth: 1.5, borderColor: Colors.border || '#E5E7EB',
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  slotTouchRequired: { borderColor: Colors.primary || '#7CB518', borderStyle: 'dashed' },
  slotImg:   { width: '100%', height: '100%' },
  slotPlus:  { fontSize: 36, color: Colors.textMuted, fontWeight: '300' },
  slotLabel: { fontSize: 11, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  slotLabelReq: { color: Colors.primary || '#7CB518' },
  slotHint:  { fontSize: 10, color: Colors.textMuted, textAlign: 'center', lineHeight: 12 },
  slotRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  slotRemoveTxt: { color: '#fff', fontSize: 15, lineHeight: 15, fontWeight: '700' },

  submitBtn: {
    backgroundColor: Colors.primaryDark || Colors.navy,
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    alignItems: 'center', justifyContent: 'center', marginTop: 12,
  },
  submitBtnBusy: { opacity: 0.7 },
  submitBtnTxt:  { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center' },

  footNote: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
});
