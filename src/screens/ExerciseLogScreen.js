import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Modal, Pressable, FlatList, KeyboardAvoidingView, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import {
  EXERCISES, CATEGORY_CONFIG, EXERCISE_CATEGORY_KEYS,
  calsBurnedForDuration, getExerciseName,
} from '../constants/exercises';

const FAVORITES_KEY = '@exercise_favorites';
const DURATION_PRESETS = [10, 20, 30, 45, 60];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function ActivityChip({ entry, onDelete, language }) {
  const ex = EXERCISES.find(e => e.id === entry.exercise_id);
  const icon = ex?.icon || '🏃';
  return (
    <View style={chip.wrap}>
      <Text style={chip.icon}>{icon}</Text>
      <View style={chip.info}>
        <Text style={chip.name} numberOfLines={1}>{entry.exercise_name}</Text>
        <Text style={chip.meta}>{Math.round(entry.duration_min)} {t(language, 'exercise.minutes_short')} · {Math.round(entry.calories_burned)} kcal</Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={chip.del} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={chip.delTxt}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ExerciseLogScreen({ navigation }) {
  const { language } = useApp();
  const { todayExercise, todayBurned, logExercise, deleteExercise, bodyProfile } = useNutrition();

  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [logModal, setLogModal] = useState(null);
  const [duration, setDuration] = useState(30);
  const [customInput, setCustomInput] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [logging, setLogging] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const weight = bodyProfile?.weight_kg || 70;

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(v => {
      if (v) setFavorites(JSON.parse(v));
    });
  }, []);

  const toggleFav = useCallback(async (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const openLog = useCallback((ex) => {
    setLogModal(ex);
    setDuration(30);
    setCustomInput('');
    setUseCustom(false);
  }, []);

  const effectiveDuration = useCustom ? (parseFloat(customInput) || 0) : duration;

  const pulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.15, duration: 120, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [pulseAnim]);

  const confirmLog = useCallback(async () => {
    if (!logModal || effectiveDuration <= 0) return;
    setLogging(true);
    const kcal = calsBurnedForDuration(logModal.met, weight, effectiveDuration);
    try {
      await logExercise({
        exercise_id: logModal.id,
        exercise_name: getExerciseName(logModal, language),
        duration_min: effectiveDuration,
        calories_burned: kcal,
        local_date: todayStr(),
      });
      pulse();
    } catch {}
    setLogging(false);
    setLogModal(null);
  }, [logModal, effectiveDuration, weight, language, logExercise, pulse]);

  const categories = [...new Set(EXERCISES.map(e => e.category))];

  const displayed = activeTab === 'all'
    ? EXERCISES
    : activeTab === 'favorites'
    ? EXERCISES.filter(e => favorites.includes(e.id))
    : EXERCISES.filter(e => e.category === activeTab);

  const totalBurnedRounded = Math.round(todayBurned);
  const catCfg = logModal ? CATEGORY_CONFIG[logModal.category] : null;
  const previewKcal = logModal && effectiveDuration > 0
    ? calsBurnedForDuration(logModal.met, weight, effectiveDuration)
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Dark hero header */}
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.heroTitle}>{t(language, 'exercise.title')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <Animated.View style={[styles.burnBubble, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.burnNum}>{totalBurnedRounded}</Text>
          <Text style={styles.burnUnit}>kcal {t(language, 'nutrition.burned') || 'burned'}</Text>
        </Animated.View>

        {todayExercise.length === 0 && (
          <Text style={styles.heroHint}>{t(language, 'exercise.no_exercises_today')}</Text>
        )}
      </View>

      {/* Today's activity chips */}
      {todayExercise.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {todayExercise.map(entry => (
            <ActivityChip
              key={entry.id}
              entry={entry}
              language={language}
              onDelete={() => deleteExercise(entry.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsRow}
        contentContainerStyle={styles.tabsContent}
      >
        {[
          { id: 'all', label: t(language, 'exercise.all') },
          { id: 'favorites', label: '★ ' + t(language, 'exercise.favorites') },
          ...categories.map(c => ({ id: c, label: t(language, EXERCISE_CATEGORY_KEYS[c]) })),
        ].map(tab => {
          const isActive = activeTab === tab.id;
          const cfg = CATEGORY_CONFIG[tab.id];
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                isActive && { backgroundColor: cfg?.color || Colors.primary },
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabTxt, isActive && styles.tabTxtActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Exercise list */}
      <FlatList
        data={displayed}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: ex }) => {
          const cfg = CATEGORY_CONFIG[ex.category];
          const kcal30 = calsBurnedForDuration(ex.met, weight, 30);
          const isFav = favorites.includes(ex.id);
          return (
            <View style={styles.exCard}>
              <View style={[styles.iconBubble, { backgroundColor: cfg?.bg || '#F0F0F0' }]}>
                <Text style={styles.iconEmoji}>{ex.icon}</Text>
              </View>
              <View style={styles.exInfo}>
                <Text style={styles.exName}>{getExerciseName(ex, language)}</Text>
                <Text style={styles.exMeta}>
                  ~{kcal30} kcal / 30 {t(language, 'exercise.minutes_short')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => toggleFav(ex.id)} style={styles.favBtn}>
                <Text style={{ fontSize: 16, color: isFav ? '#FFB800' : '#DDD' }}>★</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openLog(ex)}
                style={[styles.addBtn, { backgroundColor: cfg?.color || Colors.primary }]}
              >
                <Text style={styles.addBtnTxt}>+</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Log modal */}
      <Modal visible={!!logModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLogModal(null)}>
            <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
              {logModal && (
                <>
                  {/* Modal header strip */}
                  <View style={[styles.modalStrip, { backgroundColor: catCfg?.color || Colors.primary }]}>
                    <Text style={styles.modalIcon}>{logModal.icon}</Text>
                    <Text style={styles.modalExName}>{getExerciseName(logModal, language)}</Text>
                  </View>

                  {/* Duration label */}
                  <Text style={styles.modalSectionLabel}>{t(language, 'exercise.duration_min')}</Text>

                  {/* Preset chips */}
                  <View style={styles.presets}>
                    {DURATION_PRESETS.map(mins => (
                      <TouchableOpacity
                        key={mins}
                        style={[
                          styles.preset,
                          !useCustom && duration === mins && { backgroundColor: catCfg?.color || Colors.primary, borderColor: catCfg?.color || Colors.primary },
                        ]}
                        onPress={() => { setDuration(mins); setUseCustom(false); }}
                      >
                        <Text style={[
                          styles.presetTxt,
                          !useCustom && duration === mins && styles.presetTxtActive,
                        ]}>
                          {mins}'
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[styles.preset, useCustom && { backgroundColor: catCfg?.color || Colors.primary, borderColor: catCfg?.color || Colors.primary }]}
                      onPress={() => setUseCustom(true)}
                    >
                      <Text style={[styles.presetTxt, useCustom && styles.presetTxtActive]}>···</Text>
                    </TouchableOpacity>
                  </View>

                  {useCustom && (
                    <TextInput
                      style={styles.customInput}
                      value={customInput}
                      onChangeText={setCustomInput}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      autoFocus
                      placeholder="min"
                      placeholderTextColor="#CCC"
                    />
                  )}

                  {/* Live kcal preview */}
                  <View style={[styles.kcalPreviewBox, { backgroundColor: catCfg?.bg || Colors.primaryBg }]}>
                    <Text style={[styles.kcalPreviewNum, { color: catCfg?.color || Colors.primary }]}>
                      {previewKcal}
                    </Text>
                    <Text style={[styles.kcalPreviewLabel, { color: catCfg?.color || Colors.primary }]}>kcal</Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.confirmBtn, { backgroundColor: catCfg?.color || Colors.primary }, logging && { opacity: 0.6 }]}
                    onPress={confirmLog}
                    disabled={logging || effectiveDuration <= 0}
                  >
                    <Text style={styles.confirmBtnTxt}>{t(language, 'exercise.confirm_log')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.07)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    maxWidth: 220,
  },
  icon: { fontSize: 18, marginRight: 8 },
  info: { flex: 1 },
  name: { fontSize: 13, fontWeight: '700', color: '#111' },
  meta: { fontSize: 11, color: '#888', marginTop: 1 },
  del: { marginLeft: 8, width: 20, alignItems: 'center' },
  delTxt: { fontSize: 18, color: '#CCC', lineHeight: 20 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background || '#F6F3EB' },

  // Hero
  hero: {
    backgroundColor: Colors.navy || '#0E1B14',
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 40 },
  backArrow: { fontSize: 28, color: '#FFF', lineHeight: 32 },
  heroTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: BrandFonts.heading || undefined,
  },
  burnBubble: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  burnNum: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: BrandFonts.heading || undefined,
    lineHeight: 58,
  },
  burnUnit: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
  },
  heroHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    fontStyle: 'italic',
  },

  // Activity chips row
  chipsRow: { flexGrow: 0, backgroundColor: Colors.background || '#F6F3EB' },
  chipsContent: { paddingHorizontal: 16, paddingVertical: 12 },

  // Category tabs
  tabsRow: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#EBEBEB',
  },
  tabTxt: { fontSize: 12, fontWeight: '600', color: '#666' },
  tabTxtActive: { color: '#FFF' },

  // Exercise cards
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  exCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconEmoji: { fontSize: 22 },
  exInfo: { flex: 1 },
  exName: { fontSize: 14, fontWeight: '700', color: Colors.text || '#111' },
  exMeta: { fontSize: 12, color: Colors.textMuted || '#888', marginTop: 2 },
  favBtn: { width: 32, alignItems: 'center' },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addBtnTxt: { fontSize: 22, color: '#FFF', lineHeight: 26, marginTop: -2 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 36,
  },
  modalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    gap: 12,
  },
  modalIcon: { fontSize: 28 },
  modalExName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
    fontFamily: BrandFonts.heading || undefined,
    flex: 1,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted || '#888',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 10,
  },
  presets: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
  },
  preset: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  presetTxt: { fontSize: 14, fontWeight: '700', color: '#555' },
  presetTxtActive: { color: '#FFF' },
  customInput: {
    marginHorizontal: 24,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 12,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text || '#111',
  },
  kcalPreviewBox: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  kcalPreviewNum: { fontSize: 36, fontWeight: '800', fontFamily: BrandFonts.heading || undefined },
  kcalPreviewLabel: { fontSize: 16, fontWeight: '600' },
  confirmBtn: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
