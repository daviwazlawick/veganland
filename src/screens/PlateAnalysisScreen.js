import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Image, Platform, Modal, TextInput,
  KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import { PremiumIcon } from '../components/ui';
import { apiAnalyzePlate } from '../services/apiService';

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

const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: 'safe',    labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: 'caution', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: 'danger',  labelKey: 'result.not_safe' },
};

const EMPTY_ITEM = () => ({ name: '', grams: '', calories_kcal: '', protein_g: '', fat_g: '', carbs_g: '', fiber_g: '' });

function calcTotal(items) {
  return items.reduce((acc, item) => ({
    calories_kcal: acc.calories_kcal + (parseFloat(item.calories_kcal) || 0),
    protein_g:     acc.protein_g     + (parseFloat(item.protein_g)     || 0),
    fat_g:         acc.fat_g         + (parseFloat(item.fat_g)         || 0),
    carbs_g:       acc.carbs_g       + (parseFloat(item.carbs_g)       || 0),
    fiber_g:       acc.fiber_g       + (parseFloat(item.fiber_g)       || 0),
  }), { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 });
}

export default function PlateAnalysisScreen({ navigation }) {
  const { language, profile } = useApp();
  const { token } = useAuth();
  const { logConsumption } = useNutrition();
  const insets = useSafeAreaInsets();

  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [editableItems, setEditableItems] = useState([]);
  const [meal, setMeal] = useState('lunch');
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  // Edit / add modal
  const [editModal, setEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState(null); // null = new item
  const [editDraft, setEditDraft] = useState(EMPTY_ITEM());
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (result?.items) setEditableItems(result.items.map(i => ({ ...i })));
  }, [result]);

  function updateNameAndSuggest(text) {
    setEditDraft(d => ({ ...d, name: text }));
    if (text.length < 2) { setSuggestions([]); return; }
    const pool = FOOD_SUGGESTIONS[language] || FOOD_SUGGESTIONS.en;
    const lower = text.toLowerCase();
    setSuggestions(pool.filter(f => f.toLowerCase().includes(lower)).slice(0, 5));
  }

  function pickSuggestion(food) {
    setEditDraft(d => ({ ...d, name: food }));
    setSuggestions([]);
  }

  function openEdit(index) {
    setSuggestions([]);
    if (index === null) {
      setEditDraft(EMPTY_ITEM());
    } else {
      const item = editableItems[index];
      setEditDraft({
        name:         String(item.name || ''),
        grams:        item.grams         != null ? String(item.grams)         : '',
        calories_kcal:item.calories_kcal != null ? String(item.calories_kcal) : '',
        protein_g:    item.protein_g     != null ? String(item.protein_g)     : '',
        fat_g:        item.fat_g         != null ? String(item.fat_g)         : '',
        carbs_g:      item.carbs_g       != null ? String(item.carbs_g)       : '',
        fiber_g:      item.fiber_g       != null ? String(item.fiber_g)       : '',
      });
    }
    setEditIndex(index);
    setEditModal(true);
  }

  function saveEdit() {
    if (!editDraft.name.trim()) {
      Alert.alert('', 'O nome do alimento é obrigatório.');
      return;
    }
    const prev = editIndex !== null ? editableItems[editIndex] : {};
    const nameChanged = editDraft.name.trim() !== (prev.name || '');
    const item = {
      name:          editDraft.name.trim(),
      grams:         parseFloat(editDraft.grams)         || 0,
      calories_kcal: parseFloat(editDraft.calories_kcal) || 0,
      protein_g:     parseFloat(editDraft.protein_g)     || 0,
      fat_g:         parseFloat(editDraft.fat_g)         || 0,
      carbs_g:       parseFloat(editDraft.carbs_g)       || 0,
      fiber_g:       parseFloat(editDraft.fiber_g)       || 0,
      // clear diet classification when name changes — it belongs to the old food
      item_status:   nameChanged ? null : (prev.item_status || null),
      item_concern:  nameChanged ? null : (prev.item_concern || null),
    };
    setEditableItems(curr => {
      const next = [...curr];
      if (editIndex === null) return [...next, item];
      next[editIndex] = item;
      return next;
    });
    // any manual edit invalidates the overall plate verdict
    setResult(r => r ? { ...r, diet_verdict: null } : r);
    setEditModal(false);
  }

  function deleteItem(index) {
    setEditableItems(prev => prev.filter((_, i) => i !== index));
    setResult(r => r ? { ...r, diet_verdict: null } : r);
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
    try {
      const data = await apiAnalyzePlate(token, base64, language, profile);
      setResult(data);
      if (!data.items || data.items.length === 0) {
        Alert.alert('', t(language, 'nutrition.plate_no_food'));
      }
    } catch {
      Alert.alert('Erro', 'Análise falhou. Tenta com outra foto.');
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
  const verdict = result?.diet_verdict;
  const cfg = verdict?.status ? (STATUS_CONFIG[verdict.status] || STATUS_CONFIG.CAUTION) : null;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{t(language, 'nutrition.plate_title')}</Text>
        <View style={{ width: 44 }} />
      </View>

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
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_pick_library')}</Text>
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
                    <Text style={s.pickBtnText}>{t(language, 'nutrition.plate_pick_library')}</Text>
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
                <ActivityIndicator color={Colors.navy || '#0B1E3F'} size="large" />
                <Text style={s.analyzingText}>{t(language, 'nutrition.plate_analyzing')}</Text>
              </View>
            )}

            {!analyzing && (result || editableItems.length > 0) && (
              <>
                {cfg && (
                  <View style={[s.verdictCard, { backgroundColor: cfg.bg, borderColor: cfg.strip }]}>
                    <View style={[s.verdictIconWrap, { backgroundColor: cfg.strip + '30' }]}>
                      <PremiumIcon name={cfg.icon} size={36} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.verdictStatus, { color: cfg.color }]}>{t(language, cfg.labelKey)}</Text>
                      {verdict.explanation ? (
                        <Text style={[s.verdictExplanation, { color: cfg.color }]}>{verdict.explanation}</Text>
                      ) : null}
                      {verdict.concerns?.length > 0 && (
                        <View style={s.verdictConcerns}>
                          {verdict.concerns.map((c, i) => (
                            <Text key={i} style={[s.verdictConcernItem, { color: cfg.color }]}>• {c}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                <View style={s.card}>
                  <Text style={s.sectionTitle}>
                    {t(language, 'nutrition.plate_items_found')} ({editableItems.length})
                  </Text>

                  {editableItems.map((item, i) => {
                    const itemCfg = item.item_status ? (STATUS_CONFIG[item.item_status] || null) : null;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[s.itemRow, itemCfg && { borderLeftWidth: 3, borderLeftColor: itemCfg.strip, paddingLeft: 10 }]}
                        onPress={() => openEdit(i)}
                        activeOpacity={0.75}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={s.itemNameRow}>
                            <Text style={s.itemName}>{item.name}</Text>
                            {itemCfg && item.item_status !== 'SAFE' && (
                              <View style={[s.itemStatusDot, { backgroundColor: itemCfg.strip }]} />
                            )}
                          </View>
                          <Text style={s.itemMacros}>
                            {Math.round(item.grams || 0)}g
                            {item.calories_kcal ? `  ·  ${Math.round(item.calories_kcal)} kcal` : ''}
                            {item.protein_g ? `  ·  ${Math.round(item.protein_g)}g prot` : ''}
                          </Text>
                          {item.item_concern ? (
                            <Text style={[s.itemConcern, { color: itemCfg?.color || '#94a3b8' }]}>{item.item_concern}</Text>
                          ) : null}
                        </View>
                        <Text style={s.editChev}>✏️</Text>
                      </TouchableOpacity>
                    );
                  })}

                  <View style={s.totalRow}>
                    <Text style={s.totalLabel}>Total</Text>
                    <Text style={s.totalValue}>{Math.round(liveTotal.calories_kcal)} kcal</Text>
                  </View>

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
                  <Text style={s.logBtnText}>
                    {logged ? `✓ ${t(language, 'nutrition.plate_logged')}` : logging ? '…' : t(language, 'nutrition.plate_log_btn')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Edit / Add Item Modal ── */}
      <Modal visible={editModal} transparent animationType="slide" onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={s.modalCard}>
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitle}>
                {editIndex === null ? t(language, 'nutrition.plate_add_item') : t(language, 'nutrition.plate_edit_item')}
              </Text>
              <TouchableOpacity onPress={() => setEditModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={s.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
              {suggestions.length > 0 && (
                <View style={s.suggestList}>
                  {suggestions.map((food, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.suggestItem, i < suggestions.length - 1 && s.suggestItemBorder]}
                      onPress={() => pickSuggestion(food)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.suggestText}>{food}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={s.modalRow2}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalLabel}>{t(language, 'nutrition.body_weight')} (g)</Text>
                  <TextInput style={s.modalInput} value={editDraft.grams} onChangeText={v => setEditDraft(d => ({ ...d, grams: v }))} placeholder="100" placeholderTextColor="#94a3b8" keyboardType="decimal-pad" />
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

              <TouchableOpacity style={s.modalSaveBtn} onPress={saveEdit} activeOpacity={0.85}>
                <Text style={s.modalSaveBtnText}>{t(language, 'personal.save')}</Text>
              </TouchableOpacity>

              {editIndex !== null && (
                <TouchableOpacity style={s.modalDeleteBtn} onPress={() => deleteItem(editIndex)} activeOpacity={0.85}>
                  <Text style={s.modalDeleteBtnText}>{t(language, 'nutrition.plate_delete_item')}</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  header: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.headerBg },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 28, color: Colors.headerText, marginTop: -2 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.headerText, fontFamily: BrandFonts?.heading },
  content: { padding: 16, gap: 14 },

  pickCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  pickEmoji: { fontSize: 52 },
  pickTitle: { fontSize: 18, fontWeight: '800', color: Colors.navy || '#0B1E3F', textAlign: 'center' },
  pickSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },
  pickBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  pickBtn: { flex: 1, backgroundColor: Colors.navy || '#0B1E3F', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  pickBtnSecondary: { backgroundColor: '#F1F5F9' },
  pickBtnIcon: { fontSize: 24 },
  pickBtnText: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' },

  imageCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  previewImage: { width: '100%', height: 240 },
  retakeBtn: { padding: 12, alignItems: 'center' },
  retakeBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  analyzingCard: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  analyzingText: { fontSize: 14, color: '#64748b', fontWeight: '600' },

  verdictCard: { borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderWidth: 2 },
  verdictIconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  verdictStatus: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  verdictExplanation: { fontSize: 13, fontWeight: '500', marginTop: 4, lineHeight: 18, opacity: 0.85 },
  verdictConcerns: { marginTop: 6, gap: 2 },
  verdictConcernItem: { fontSize: 12, fontWeight: '600', lineHeight: 17 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 8 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.navy || '#0B1E3F' },
  itemStatusDot: { width: 8, height: 8, borderRadius: 4 },
  itemMacros: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  itemConcern: { fontSize: 11, fontWeight: '600', marginTop: 3, fontStyle: 'italic' },
  editChev: { fontSize: 14, opacity: 0.5 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8 },
  totalLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  totalValue: { fontSize: 14, fontWeight: '800', color: Colors.navy || '#0B1E3F' },

  addItemBtn: { marginTop: 2, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.navy || '#0B1E3F', borderStyle: 'dashed', alignItems: 'center' },
  addItemBtnText: { fontSize: 13, fontWeight: '700', color: Colors.navy || '#0B1E3F' },

  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#e2e8f0' },
  mealBtnActive: { backgroundColor: Colors.navy || '#0B1E3F', borderColor: Colors.navy || '#0B1E3F' },
  mealBtnText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  mealBtnTextActive: { color: '#fff' },

  logBtn: { backgroundColor: '#22C55E', padding: 16, borderRadius: 14, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32, maxHeight: '85%',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.navy || '#0B1E3F' },
  modalClose: { fontSize: 26, color: '#94a3b8', fontWeight: '400', lineHeight: 28 },
  modalLabel: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6, marginTop: 12 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, fontWeight: '600', color: Colors.navy || '#0B1E3F',
  },
  modalRow2: { flexDirection: 'row', gap: 10 },
  modalRow3: { flexDirection: 'row', gap: 8 },
  suggestList: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e2e8f0',
    borderRadius: 12, marginTop: 4, overflow: 'hidden',
  },
  suggestItem: { paddingVertical: 11, paddingHorizontal: 14 },
  suggestItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  suggestText: { fontSize: 14, fontWeight: '600', color: Colors.navy || '#0B1E3F' },

  modalSaveBtn: { backgroundColor: Colors.navy || '#0B1E3F', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
  modalSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  modalDeleteBtn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
  modalDeleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
});
