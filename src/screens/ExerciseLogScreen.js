import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Modal, Pressable, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useNutrition } from '../context/NutritionContext';
import { t } from '../i18n';
import { Colors } from '../constants/colors';
import { BrandFonts } from '../brand';
import {
  EXERCISES, EXERCISE_CATEGORY_KEYS,
  calsBurnedForDuration, getExerciseName,
} from '../constants/exercises';

const FAVORITES_KEY = '@exercise_favorites';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function ExerciseLogScreen({ navigation }) {
  const { language } = useApp();
  const { token } = useAuth();
  const { todayExercise, todayBurned, logExercise, deleteExercise, bodyProfile } = useNutrition();

  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'favorites' | category id | 'all'
  const [logModal, setLogModal] = useState(null); // exercise object
  const [duration, setDuration] = useState('30');
  const [logging, setLogging] = useState(false);

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
    setDuration('30');
  }, []);

  const confirmLog = useCallback(async () => {
    if (!logModal) return;
    const mins = parseFloat(duration);
    if (!mins || mins <= 0) return;
    setLogging(true);
    const kcal = calsBurnedForDuration(logModal.met, weight, mins);
    try {
      await logExercise({
        exercise_id: logModal.id,
        exercise_name: getExerciseName(logModal, language),
        duration_min: mins,
        calories_burned: kcal,
        local_date: todayStr(),
      });
    } catch {}
    setLogging(false);
    setLogModal(null);
  }, [logModal, duration, weight, language, logExercise]);

  const categories = [...new Set(EXERCISES.map(e => e.category))];

  const displayed = activeTab === 'all'
    ? EXERCISES
    : activeTab === 'favorites'
    ? EXERCISES.filter(e => favorites.includes(e.id))
    : EXERCISES.filter(e => e.category === activeTab);

  const totalBurnedRounded = Math.round(todayBurned);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t(language, 'exercise.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Today summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t(language, 'exercise.today_burned')}</Text>
        <Text style={styles.summaryKcal}>{totalBurnedRounded} kcal</Text>
      </View>

      {/* Today's log */}
      {todayExercise.length > 0 && (
        <View style={styles.todaySection}>
          {todayExercise.map(entry => (
            <View key={entry.id} style={styles.todayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayName}>{entry.exercise_name}</Text>
                <Text style={styles.todayMeta}>
                  {Math.round(entry.duration_min)} {t(language, 'exercise.minutes_short')} · {Math.round(entry.calories_burned)} kcal
                </Text>
              </View>
              <TouchableOpacity onPress={() => deleteExercise(entry.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteTxt}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsRow} contentContainerStyle={styles.tabsContent}>
        {[
          { id: 'all', label: t(language, 'exercise.all') },
          { id: 'favorites', label: t(language, 'exercise.favorites') },
          ...categories.map(c => ({ id: c, label: t(language, EXERCISE_CATEGORY_KEYS[c]) })),
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabTxt, activeTab === tab.id && styles.tabTxtActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Exercise list */}
      <FlatList
        data={displayed}
        keyExtractor={e => e.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item: ex }) => {
          const mins30 = calsBurnedForDuration(ex.met, weight, 30);
          const isFav = favorites.includes(ex.id);
          return (
            <View style={styles.exRow}>
              <TouchableOpacity onPress={() => toggleFav(ex.id)} style={styles.favBtn}>
                <Text style={{ fontSize: 18, color: isFav ? '#FFB800' : '#CCC' }}>★</Text>
              </TouchableOpacity>
              <View style={styles.exInfo}>
                <Text style={styles.exName}>{getExerciseName(ex, language)}</Text>
                <Text style={styles.exMeta}>{mins30} kcal / 30 {t(language, 'exercise.minutes_short')}</Text>
              </View>
              <TouchableOpacity onPress={() => openLog(ex)} style={styles.logBtn}>
                <Text style={styles.logBtnTxt}>{t(language, 'exercise.log_exercise')}</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Log modal */}
      <Modal visible={!!logModal} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalBackdrop} onPress={() => setLogModal(null)}>
            <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
              {logModal && (
                <>
                  <Text style={styles.modalTitle}>{getExerciseName(logModal, language)}</Text>
                  <Text style={styles.modalLabel}>{t(language, 'exercise.duration_min')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.modalPreview}>
                    ≈ {calsBurnedForDuration(logModal.met, weight, parseFloat(duration) || 0)} kcal
                  </Text>
                  <TouchableOpacity
                    style={[styles.modalConfirm, logging && { opacity: 0.5 }]}
                    onPress={confirmLog}
                    disabled={logging}
                  >
                    <Text style={styles.modalConfirmTxt}>{t(language, 'exercise.confirm_log')}</Text>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background || '#F8F9FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backArrow: { fontSize: 28, color: Colors.primary, lineHeight: 32 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    fontFamily: BrandFonts.heading || undefined,
    color: Colors.text || '#111',
  },
  summaryCard: {
    margin: 16,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  summaryKcal: { fontSize: 32, color: '#FFF', fontWeight: '800', marginTop: 4, fontFamily: BrandFonts.heading || undefined },
  todaySection: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  todayName: { fontSize: 14, fontWeight: '600', color: Colors.text || '#111' },
  todayMeta: { fontSize: 12, color: Colors.textMuted || '#888', marginTop: 2 },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  deleteTxt: { fontSize: 22, color: '#CCC', lineHeight: 24 },
  tabsRow: { flexGrow: 0, marginBottom: 8 },
  tabsContent: { paddingHorizontal: 16, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  tabActive: { backgroundColor: Colors.primary },
  tabTxt: { fontSize: 13, fontWeight: '600', color: Colors.textMuted || '#888' },
  tabTxtActive: { color: '#FFF' },
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  exRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  favBtn: { width: 32, alignItems: 'center' },
  exInfo: { flex: 1, marginLeft: 8 },
  exName: { fontSize: 14, fontWeight: '600', color: Colors.text || '#111' },
  exMeta: { fontSize: 12, color: Colors.textMuted || '#888', marginTop: 2 },
  logBtn: {
    backgroundColor: Colors.primaryBg || '#EEF9F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  logBtnTxt: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '82%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text || '#111',
    marginBottom: 16,
    fontFamily: BrandFonts.heading || undefined,
  },
  modalLabel: { fontSize: 13, color: Colors.textMuted || '#888', marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    color: Colors.text || '#111',
    marginBottom: 8,
  },
  modalPreview: {
    textAlign: 'center',
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 20,
  },
  modalConfirm: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
