import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Image, Platform, Modal, TextInput,
  KeyboardAvoidingView, Keyboard, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import Brand, { BrandFonts } from '../brand';
import { apiAnalyzePlate, apiSearchFood } from '../services/apiService';
import { logFunnelEvent } from '../services/funnelService';
import ScanLimitCard from '../components/ScanLimitCard';
import { EXERCISES, minutesToBurn, getExerciseName, DEFAULT_BURN_EXERCISES } from '../constants/exercises';

const isNovaQI = Brand.id === 'novaqi';

const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];

// Common foods per language for autocomplete
const FOOD_SUGGESTIONS = {
  pt: ['Arroz branco','Arroz integral','Feijão preto','Feijão carioca','Lentilha','Grão-de-bico','Frango grelhado','Frango assado','Peito de frango','Peixe grelhado','Salmão','Atum','Bife','Carne moída','Ovos mexidos','Ovo estrelado','Omelete','Batata cozida','Batata assada','Batata frita','Batata doce','Brócolis','Couve','Espinafre','Alface','Tomate','Cenoura','Abobrinha','Berinjela','Cebola','Alho','Maçã','Banana','Laranja','Mamão','Manga','Abacaxi','Morango','Uva','Iogurte natural','Iogurte grego','Queijo','Queijo cottage','Leite','Manteiga','Azeite','Pão integral','Pão branco','Tapioca','Aveia','Granola','Macarrão','Macarrão integral','Pizza','Hambúrguer','Salada','Sopa','Caldo','Molho de tomate','Maionese','Ketchup','Mostarda','Azeite de oliva'],
  en: ['White rice','Brown rice','Black beans','Chicken breast','Grilled chicken','Roast chicken','Salmon','Tuna','Beef steak','Ground beef','Scrambled eggs','Fried egg','Omelette','Boiled potato','Roasted potato','French fries','Sweet potato','Broccoli','Kale','Spinach','Lettuce','Tomato','Carrot','Zucchini','Eggplant','Onion','Garlic','Apple','Banana','Orange','Mango','Strawberry','Grapes','Greek yogurt','Natural yogurt','Cheese','Cottage cheese','Milk','Butter','Olive oil','Whole wheat bread','White bread','Oatmeal','Granola','Pasta','Whole wheat pasta','Pizza','Burger','Salad','Soup','Tomato sauce','Mayonnaise','Ketchup','Mustard','Avocado','Quinoa','Lentils','Chickpeas','Tofu','Tempeh'],
  de: ['Weißer Reis','Brauner Reis','Hähnchenbrust','Gegrilltes Hähnchen','Lachs','Thunfisch','Rindersteak','Rührei','Spiegelei','Omelett','Gekochte Kartoffel','Bratkartoffeln','Pommes frites','Süßkartoffel','Brokkoli','Spinat','Kopfsalat','Tomate','Karotte','Zucchini','Aubergine','Zwiebel','Apfel','Banane','Orange','Joghurt','Griechischer Joghurt','Käse','Butter','Olivenöl','Vollkornbrot','Weißbrot','Haferflocken','Granola','Nudeln','Vollkornnudeln','Pizza','Burger','Salat','Suppe','Avocado','Quinoa','Linsen','Kichererbsen','Tofu'],
  fr: ['Riz blanc','Riz complet','Blanc de poulet','Poulet grillé','Saumon','Thon','Steak de bœuf','Œufs brouillés','Œuf au plat','Omelette','Pomme de terre bouillie','Pomme de terre rôtie','Frites','Patate douce','Brocoli','Épinards','Laitue','Tomate','Carotte','Courgette','Aubergine','Oignon','Pomme','Banane','Orange','Yaourt nature','Yaourt grec','Fromage','Beurre','Huile d\'olive','Pain complet','Pain blanc','Flocons d\'avoine','Granola','Pâtes','Pâtes complètes','Pizza','Burger','Salade','Soupe','Avocat','Quinoa','Lentilles','Pois chiches','Tofu'],
  it: ['Riso bianco','Riso integrale','Petto di pollo','Pollo alla griglia','Salmone','Tonno','Bistecca','Uova strapazzate','Uovo fritto','Frittata','Patata bollita','Patata arrosto','Patatine fritte','Patata dolce','Broccoli','Spinaci','Lattuga','Pomodoro','Carota','Zucchina','Melanzana','Cipolla','Mela','Banana','Arancia','Yogurt naturale','Yogurt greco','Formaggio','Burro','Olio d\'oliva','Pane integrale','Pane bianco','Avena','Granola','Pasta','Pasta integrale','Pizza','Hamburger','Insalata','Zuppa','Avocado','Quinoa','Lenticchie','Ceci','Tofu'],
  es: ['Arroz blanco','Arroz integral','Pechuga de pollo','Pollo a la plancha','Salmón','Atún','Filete de ternera','Huevos revueltos','Huevo frito','Tortilla','Patata cocida','Patata asada','Patatas fritas','Boniato','Brócoli','Espinacas','Lechuga','Tomate','Zanahoria','Calabacín','Berenjena','Cebolla','Manzana','Plátano','Naranja','Yogur natural','Yogur griego','Queso','Mantequilla','Aceite de oliva','Pan integral','Pan blanco','Avena','Granola','Pasta','Pasta integral','Pizza','Hamburguesa','Ensalada','Sopa','Aguacate','Quinoa','Lentejas','Garbanzos','Tofu'],
};

const EMPTY_ITEM = () => ({ name: '', grams: '', calories_kcal: '', protein_g: '', fat_g: '', carbs_g: '', fiber_g: '', sugar_g: '', salt_g: '' });

function calcTotal(items) {
  return items.reduce((acc, item) => ({
    calories_kcal: acc.calories_kcal + (parseFloat(item.calories_kcal) || 0),
    protein_g:     acc.protein_g     + (parseFloat(item.protein_g)     || 0),
    fat_g:         acc.fat_g         + (parseFloat(item.fat_g)         || 0),
    carbs_g:       acc.carbs_g       + (parseFloat(item.carbs_g)       || 0),
    fiber_g:       acc.fiber_g       + (parseFloat(item.fiber_g)       || 0),
    sugar_g:       acc.sugar_g       + (parseFloat(item.sugar_g)       || 0),
    salt_g:        acc.salt_g        + (parseFloat(item.salt_g)        || 0),
  }), { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sugar_g: 0, salt_g: 0 });
}

export default function PlateAnalysisScreen({ navigation }) {
  const { language, profile, setMonthlyScanCount } = useApp();
  const { token } = useAuth();
  const { logConsumption, bodyProfile } = useNutrition();
  const insets = useSafeAreaInsets();

  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [result, setResult] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [meal, setMeal] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  const [burnExIds, setBurnExIds] = useState(DEFAULT_BURN_EXERCISES);

  const [noticeOpen, setNoticeOpen] = useState(false);

  useEffect(() => {
    if (!isNovaQI) return;
    AsyncStorage.getItem('@exercise_favorites').then(v => {
      if (!v) return;
      try {
        const favs = JSON.parse(v);
        if (Array.isArray(favs) && favs.length > 0) {
          const shuffled = [...favs].sort(() => Math.random() - 0.5);
          setBurnExIds(shuffled.slice(0, 3));
        }
      } catch (_) {}
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('@plate_notice_dismissed').then(v => {
      if (v !== '1') setNoticeOpen(true);
    });
  }, []);

  function dismissNoticeForever() {
    AsyncStorage.setItem('@plate_notice_dismissed', '1').catch(() => {});
    setNoticeOpen(false);
  }

  // Edit / add modal
  const [editModal, setEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null); // null = new item
  const [editDraft, setEditDraft] = useState(EMPTY_ITEM());
  const [suggestions, setSuggestions] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [perGram, setPerGram] = useState(null); // per-gram ratios for proportional recalc
  const searchTimer = useRef(null);

  useEffect(() => {
    if (result?.items) setEditableItems(result.items.map(i => ({ ...i })));
  }, [result?.items]);

  function updateNameAndSuggest(text) {
    setEditDraft(d => ({ ...d, name: text }));
    if (text.length < 2) { setSuggestions([]); setSearchResults([]); return; }
    // Local static suggestions (instant)
    const pool = FOOD_SUGGESTIONS[language] || FOOD_SUGGESTIONS.en;
    const lower = text.toLowerCase();
    setSuggestions(pool.filter(f => f.toLowerCase().includes(lower)).slice(0, 3));
    // Debounced API search (350ms)
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await apiSearchFood(token, text, language);
        setSearchResults(results.slice(0, 6));
      } catch {}
    }, 350);
  }

  function pickSuggestion(food, apiResult = null) {
    if (apiResult) {
      const g = parseFloat(editDraft.grams) || 100;
      const ratio = g / 100;
      const n = v => v != null ? Math.round(Number(v) * ratio * 10) / 10 : '';
      setEditDraft(d => ({
        ...d,
        name: apiResult.product_name,
        calories_kcal: n(apiResult.calories_kcal),
        protein_g:     n(apiResult.protein_g),
        fat_g:         n(apiResult.fat_g),
        carbs_g:       n(apiResult.carbs_g),
        fiber_g:       n(apiResult.fiber_g),
        sugar_g:       n(apiResult.sugar_g),
        salt_g:        n(apiResult.salt_g),
      }));
    } else {
      setEditDraft(d => ({ ...d, name: food }));
    }
    setSuggestions([]);
    setSearchResults([]);
  }

  function openEdit(index) {
    setSuggestions([]);
    setSearchResults([]);
    if (index === null) {
      setEditDraft(EMPTY_ITEM());
      setPerGram(null);
    } else {
      const item = editableItems[index];
      const g = parseFloat(item.grams) || 0;
      setEditDraft({
        name:          String(item.name || ''),
        grams:         item.grams         != null ? String(item.grams)         : '',
        calories_kcal: item.calories_kcal != null ? String(item.calories_kcal) : '',
        protein_g:     item.protein_g     != null ? String(item.protein_g)     : '',
        fat_g:         item.fat_g         != null ? String(item.fat_g)         : '',
        carbs_g:       item.carbs_g       != null ? String(item.carbs_g)       : '',
        fiber_g:       item.fiber_g       != null ? String(item.fiber_g)       : '',
        sugar_g:       item.sugar_g       != null ? String(item.sugar_g)       : '',
        salt_g:        item.salt_g        != null ? String(item.salt_g)        : '',
      });
      setPerGram(g > 0 ? {
        calories_kcal: (parseFloat(item.calories_kcal) || 0) / g,
        protein_g:     (parseFloat(item.protein_g)     || 0) / g,
        fat_g:         (parseFloat(item.fat_g)         || 0) / g,
        carbs_g:       (parseFloat(item.carbs_g)       || 0) / g,
        fiber_g:       (parseFloat(item.fiber_g)       || 0) / g,
        sugar_g:       (parseFloat(item.sugar_g)       || 0) / g,
        salt_g:        (parseFloat(item.salt_g)        || 0) / g,
      } : null);
    }
    setEditIndex(index);
    setEditModal(true);
  }

  function handleGramsChange(text) {
    const newG = parseFloat(text);
    if (perGram && !isNaN(newG) && newG > 0) {
      setEditDraft(d => ({
        ...d,
        grams:         text,
        calories_kcal: String(Math.round(perGram.calories_kcal * newG * 10) / 10),
        protein_g:     String(Math.round(perGram.protein_g     * newG * 10) / 10),
        fat_g:         String(Math.round(perGram.fat_g         * newG * 10) / 10),
        carbs_g:       String(Math.round(perGram.carbs_g       * newG * 10) / 10),
        fiber_g:       String(Math.round(perGram.fiber_g       * newG * 10) / 10),
        sugar_g:       String(Math.round(perGram.sugar_g       * newG * 10) / 10),
        salt_g:        String(Math.round(perGram.salt_g        * newG * 100) / 100),
      }));
    } else {
      setEditDraft(d => ({ ...d, grams: text }));
    }
  }

  function saveEdit() {
    if (!editDraft.name.trim()) {
      Alert.alert('', 'O nome do alimento é obrigatório.');
      return;
    }
    const item = {
      name:          editDraft.name.trim(),
      grams:         parseFloat(editDraft.grams)         || 0,
      calories_kcal: parseFloat(editDraft.calories_kcal) || 0,
      protein_g:     parseFloat(editDraft.protein_g)     || 0,
      fat_g:         parseFloat(editDraft.fat_g)         || 0,
      carbs_g:       parseFloat(editDraft.carbs_g)       || 0,
      fiber_g:       parseFloat(editDraft.fiber_g)       || 0,
      sugar_g:       parseFloat(editDraft.sugar_g)       || 0,
      salt_g:        parseFloat(editDraft.salt_g)        || 0,
    };
    setEditableItems(curr => {
      const next = [...curr];
      if (editIndex === null) return [...next, item];
      next[editIndex] = item;
      return next;
    });
    setEditModal(false);
  }

  function deleteItem(index) {
    setEditableItems(prev => prev.filter((_, i) => i !== index));
    setEditModal(false);
  }

  async function pickImage(fromCamera) {
    try {
      let res;
      if (fromCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('', t(language, 'scan.camera_permission')); return; }
        res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      } else {
        res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
      }
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setImage(asset.uri);
      setResult(null);
      setEditableItems([]);
      setLogged(false);
      await analyzeImage(asset.base64);
    } catch {
      Alert.alert('Erro', 'Não foi possível aceder à câmara.');
    }
  }

  function pickImageWeb(useCamera) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (useCamera) input.capture = 'environment';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        setImage(dataUrl);
        setResult(null);
        setEditableItems([]);
        setLogged(false);
        await analyzeImage(dataUrl.split(',')[1]);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function analyzeImage(base64) {
    setAnalyzing(true);
    logFunnelEvent('scan_started', { method: 'plate' }, token);
    try {
      const data = await apiAnalyzePlate(token, base64, language, profile);
      setResult(data);
      setMonthlyScanCount(c => c + 1);
      logFunnelEvent('scan_completed', { method: 'plate', items: data?.items?.length || 0 }, token);
      if (!data.items || data.items.length === 0) {
        Alert.alert('', t(language, 'nutrition.plate_no_food'));
      }
    } catch (e) {
      if (e?.message === 'scan_limit_reached') {
        setLimitReached(true);
        logFunnelEvent('scan_failed', { method: 'plate', reason: 'limit' }, token);
      } else {
        Alert.alert('Erro', 'Análise falhou. Tenta com outra foto.');
        logFunnelEvent('scan_failed', { method: 'plate', reason: (e?.message || 'error').slice(0, 120) }, token);
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleLog() {
    if (!editableItems.length) return;
    setLogging(true);
    try {
      for (const item of editableItems) {
        await logConsumption({
          product_name:  item.name,
          source:        'plate_photo',
          grams:         item.grams         || null,
          meal_type:     meal,
          calories_kcal: item.calories_kcal || null,
          protein_g:     item.protein_g     || null,
          fat_g:         item.fat_g         || null,
          carbs_g:       item.carbs_g       || null,
          fiber_g:       item.fiber_g       || null,
          sugar_g:       item.sugar_g       || null,
          salt_g:        item.salt_g        || null,
        });
      }
      setLogged(true);
      setTimeout(() => navigation.navigate('NutritionDashboard'), 1200);
    } catch {
      Alert.alert('Erro', 'Não foi possível registar. Tenta novamente.');
    } finally {
      setLogging(false);
    }
  }

  const liveTotal = calcTotal(editableItems);

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.plate_title')}</Text>
        <TouchableOpacity
          onPress={() => setNoticeOpen(true)}
          style={s.headerInfoBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t(language, 'nutrition.plate_notice_title')}
        >
          <Text style={s.headerInfoBtnText}>ⓘ</Text>
        </TouchableOpacity>
      </View>

      {/* ── Info modal (auto-opens on first entry, reopens via header ⓘ) ── */}
      <Modal visible={noticeOpen} transparent animationType="fade" onRequestClose={() => setNoticeOpen(false)}>
        <TouchableOpacity style={s.noticeOverlay} activeOpacity={1} onPress={() => setNoticeOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.noticeCard}>
            <Text style={s.noticeTitle}>{t(language, 'nutrition.plate_notice_title')}</Text>
            <Text style={s.noticeBody}>{t(language, 'nutrition.plate_notice_body')}</Text>
            <View style={s.noticeActions}>
              <TouchableOpacity style={[s.noticeBtn, s.noticeBtnGhost]} onPress={dismissNoticeForever}>
                <Text style={s.noticeBtnGhostText}>{t(language, 'nutrition.plate_notice_dismiss')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.noticeBtn, s.noticeBtnPrimary]} onPress={() => setNoticeOpen(false)}>
                <Text style={s.noticeBtnPrimaryText}>{t(language, 'nutrition.plate_notice_close')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]}>

        {!image ? (
          <View style={s.pickCard}>
            <Text style={s.pickEmoji}>🍽️</Text>
            <Text style={s.pickTitle}>{t(language, 'nutrition.plate_title')}</Text>
            <Text style={s.pickSub}>{t(language, 'nutrition.plate_subtitle')}</Text>
            <View style={s.pickBtns}>
              {Platform.OS === 'web' ? (
                <>
                  <TouchableOpacity style={s.pickBtn} onPress={() => pickImageWeb(true)}>
                    <Text style={s.pickBtnIcon}>📷</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_take_photo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickBtn, s.pickBtnSecondary]} onPress={() => pickImageWeb(false)}>
                    <Text style={s.pickBtnIcon}>🖼️</Text>
                    <Text style={[s.pickBtnText, isNovaQI && s.pickBtnTextSecondary]}>{t(language, 'nutrition.plate_pick_library')}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={s.pickBtn} onPress={() => pickImage(true)}>
                    <Text style={s.pickBtnIcon}>📷</Text>
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_take_photo')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.pickBtn, s.pickBtnSecondary]} onPress={() => pickImage(false)}>
                    <Text style={s.pickBtnIcon}>🖼️</Text>
                    <Text style={[s.pickBtnText, isNovaQI && s.pickBtnTextSecondary]}>{t(language, 'nutrition.plate_pick_library')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={s.imageCard}>
              <Image source={{ uri: image }} style={s.previewImage} resizeMode="cover" />
              <TouchableOpacity style={s.retakeBtn} onPress={() => { setImage(null); setResult(null); setEditableItems([]); }}>
                <Text style={s.retakeBtnText}>↩ {t(language, 'nutrition.plate_retake')}</Text>
              </TouchableOpacity>
            </View>

            {analyzing && (
              <View style={s.analyzingCard}>
                <ActivityIndicator color={Colors.navy} size="large" />
                <Text style={s.analyzingText}>{t(language, 'nutrition.plate_analyzing')}</Text>
              </View>
            )}

            {!analyzing && (result || editableItems.length > 0) && (
              <>
                <View style={s.card}>
                  <Text style={s.sectionTitle}>
                    {t(language, 'nutrition.plate_items_found')} ({editableItems.length})
                  </Text>

                  {editableItems.map((item, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.itemRow}
                      onPress={() => openEdit(i)}
                      activeOpacity={0.75}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={s.itemName}>{item.name}</Text>
                        <Text style={s.itemMacros}>
                          {Math.round(item.grams || 0)}g
                          {item.calories_kcal ? `  ·  ${Math.round(item.calories_kcal)} kcal` : ''}
                          {item.protein_g ? `  ·  ${Math.round(item.protein_g)}g prot` : ''}
                        </Text>
                      </View>
                      <Text style={s.editChev}>✏️</Text>
                    </TouchableOpacity>
                  ))}

                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalValue}>{Math.round(liveTotal.calories_kcal)} kcal</Text>
                  </View>

                  {isNovaQI && liveTotal.calories_kcal > 0 && (() => {
                    const weight = bodyProfile?.weight_kg || 70;
                    const burnExercises = burnExIds
                      .map(id => EXERCISES.find(e => e.id === id))
                      .filter(Boolean);
                    if (!burnExercises.length) return null;
                    return (
                      <View style={s.burnBox}>
                        <Text style={s.burnTitle}>{t(language, 'exercise.burn_equivalent')} {Math.round(liveTotal.calories_kcal)} kcal</Text>
                        <View style={s.burnRow}>
                          {burnExercises.map(ex => (
                            <View key={ex.id} style={s.burnItem}>
                              <Text style={s.burnItemIcon}>{ex.icon}</Text>
                              <Text style={s.burnMins}>{minutesToBurn(liveTotal.calories_kcal, ex.met, weight)}'</Text>
                              <Text style={s.burnExName} numberOfLines={2}>{getExerciseName(ex, language)}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })()}

                  <TouchableOpacity style={s.addItemBtn} onPress={() => openEdit(null)} activeOpacity={0.8}>
                    <Text style={s.addItemBtnText}>+ {t(language, 'nutrition.plate_add_item')}</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.card}>
                  <Text style={s.sectionTitle}>{t(language, 'nutrition.meal_label')}</Text>
                  <View style={s.mealRow}>
                    {MEALS.map(m => (
                      <TouchableOpacity key={m} onPress={() => setMeal(m)} style={[s.mealBtn, meal === m && s.mealBtnActive]}>
                        <Text style={[s.mealBtnText, meal === m && s.mealBtnTextActive]}>{t(language, `nutrition.${m}`)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  style={[s.logBtn, (logging || logged || !editableItems.length) && { opacity: 0.7 }]}
                  onPress={handleLog}
                  disabled={logging || logged || !editableItems.length}
                >
                  <Text style={s.logBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                    {logged ? `✓ ${t(language, 'nutrition.plate_logged')}` : logging ? '…' : t(language, 'nutrition.plate_log_btn')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Edit / Add Item Modal ── */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => { Keyboard.dismiss(); setEditModal(false); }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setEditModal(false); }} />
          <View style={[s.modalCard, { paddingBottom: 24 + insets.bottom }]}>
              <View style={s.modalHeaderRow}>
                <Text style={s.modalTitle}>
                  {editIndex === null ? t(language, 'nutrition.plate_add_item') : t(language, 'nutrition.plate_edit_item')}
                </Text>
                <View style={s.modalHeaderActions}>
                  {editIndex !== null && (
                    <TouchableOpacity onPress={() => deleteItem(editIndex)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={s.modalDeleteIcon}>
                      <Text style={s.modalDeleteIconText}>🗑️</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => { Keyboard.dismiss(); setEditModal(false); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                    <Text style={s.modalClose}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.modalLabel}>{t(language, 'nutrition.plate_item_name')}</Text>
                <TextInput
                  style={s.modalInput}
                  value={editDraft.name}
                  onChangeText={updateNameAndSuggest}
                  placeholder={t(language, 'nutrition.plate_item_name_placeholder')}
                  placeholderTextColor="#94a3b8"
                  autoFocus
                  returnKeyType="next"
                  autoComplete="off"
                  autoCorrect={false}
                />
                {(suggestions.length > 0 || searchResults.length > 0) && (
                  <View style={s.suggestList}>
                    {suggestions.map((food, i) => (
                      <TouchableOpacity
                        key={`local-${i}`}
                        style={[s.suggestItem, s.suggestItemBorder]}
                        onPress={() => pickSuggestion(food)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.suggestText}>{food}</Text>
                      </TouchableOpacity>
                    ))}
                    {searchResults.map((r, i) => (
                      <TouchableOpacity
                        key={`api-${i}`}
                        style={[s.suggestItem, i < searchResults.length - 1 && s.suggestItemBorder]}
                        onPress={() => pickSuggestion(r.product_name, r)}
                        activeOpacity={0.7}
                      >
                        <Text style={s.suggestText}>{r.product_name}</Text>
                        {r.calories_kcal != null && (
                          <Text style={s.suggestKcal}>{Math.round(r.calories_kcal)} kcal/100g</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={s.modalRow2}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>{t(language, 'nutrition.body_weight')} (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.grams} onChangeText={handleGramsChange} placeholder="100" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>Kcal</Text>
                    <TextInput style={s.modalInput} value={editDraft.calories_kcal} onChangeText={v => setEditDraft(d => ({ ...d, calories_kcal: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                </View>

                <View style={s.modalRow3}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>Prot (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.protein_g} onChangeText={v => setEditDraft(d => ({ ...d, protein_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>Carbs (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.carbs_g} onChangeText={v => setEditDraft(d => ({ ...d, carbs_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>Fat (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.fat_g} onChangeText={v => setEditDraft(d => ({ ...d, fat_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                </View>

                <View style={s.modalRow3}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>{t(language, 'nutrition.fiber')} (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.fiber_g} onChangeText={v => setEditDraft(d => ({ ...d, fiber_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>{t(language, 'nutrition.sugar')} (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.sugar_g} onChangeText={v => setEditDraft(d => ({ ...d, sugar_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalLabel}>{t(language, 'nutrition.salt')} (g)</Text>
                    <TextInput style={s.modalInput} value={editDraft.salt_g} onChangeText={v => setEditDraft(d => ({ ...d, salt_g: v }))} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
                  </View>
                </View>

                <TouchableOpacity style={s.modalSaveBtn} onPress={saveEdit} activeOpacity={0.85}>
                  <Text style={s.modalSaveBtnText}>{t(language, 'personal.save')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
        </KeyboardAvoidingView>
      </Modal>

      {limitReached && (
        <ScanLimitCard
          navigation={navigation}
          source="plate_limit"
          token={token}
          onDismiss={() => setLimitReached(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  headerInfoBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerInfoBtnText: { fontSize: 22, color: Colors.headerText, fontWeight: '700' },

  noticeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  noticeCard: { backgroundColor: '#fff', borderRadius: 20, padding: 22, width: '100%', gap: 14, elevation: 12 },
  noticeTitle: { fontSize: 17, fontWeight: '900', color: Colors.navy, fontFamily: BrandFonts?.heading },
  noticeBody: { fontSize: 14, color: '#334155', lineHeight: 21, fontWeight: '500' },
  noticeActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  noticeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  noticeBtnGhost: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  noticeBtnGhostText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  noticeBtnPrimary: { backgroundColor: Colors.navy },
  noticeBtnPrimaryText: { fontSize: 13, fontWeight: '800', color: '#fff' },
  content: { padding: 16, gap: 14 },

  pickCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pickEmoji: { fontSize: 52 },
  pickTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy, textAlign: 'center' },
  pickSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  pickBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  pickBtn: { flex: 1, backgroundColor: isNovaQI ? Colors.primary : Colors.navy, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  pickBtnSecondary: { backgroundColor: isNovaQI ? Colors.backgroundSecondary : '#F1F5F9' },
  pickBtnIcon: { fontSize: 24 },
  pickBtnText: { fontSize: 13, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  pickBtnTextSecondary: { color: isNovaQI ? Colors.text : Colors.white },

  imageCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  previewImage: { width: '100%', height: 240 },
  retakeBtn: { padding: 12, alignItems: 'center' },
  retakeBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  analyzingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  analyzingText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.navy },
  itemMacros: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  editChev: { fontSize: 14, opacity: 0.5 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  totalValue: { fontSize: 14, fontWeight: '800', color: Colors.navy },

  burnBox: { backgroundColor: '#0E1B14', borderRadius: 16, padding: 14, gap: 10, marginTop: 12 },
  burnTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 0.8 },
  burnRow: { flexDirection: 'row', gap: 8 },
  burnItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, paddingVertical: 10, gap: 3 },
  burnItemIcon: { fontSize: 20 },
  burnMins: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  burnExName: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', textAlign: 'center' },

  addItemBtn: { marginTop: 2, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.navy, borderStyle: 'dashed', alignItems: 'center' },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: Colors.navy },

  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
  mealBtnActive: { backgroundColor: Colors.navy, borderColor: Colors.navy },
  mealBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  mealBtnTextActive: { color: Colors.white },

  logBtn: { backgroundColor: isNovaQI ? Colors.primary : Colors.safe, padding: 16, borderRadius: 14, alignItems: 'center' },
  logBtnText: { color: Colors.white, fontSize: 16, fontWeight: '800' },

  // Modal
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, maxHeight: '88%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy },
  modalHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalDeleteIcon: { padding: 2 },
  modalDeleteIconText: { fontSize: 20 },
  modalClose: { fontSize: 26, color: '#94a3b8', fontWeight: '400', lineHeight: 28 },
  modalLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, fontWeight: '600', color: Colors.navy,
  },
  modalRow2: { flexDirection: 'row', gap: 10 },
  modalRow3: { flexDirection: 'row', gap: 8 },
  suggestList: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  suggestItem: { paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  suggestItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestText: { fontSize: 14, fontWeight: '600', color: Colors.navy, flex: 1 },
  suggestKcal: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginLeft: 8 },

  modalSaveBtn: { backgroundColor: Colors.navy, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalDeleteBtn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  modalDeleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
