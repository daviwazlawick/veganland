// Bloco do topo da Início: o treino de hoje e a próxima refeição do plano.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { font } from '../theme/type';
import { s2 } from './strings';
import { usePlan, sessionForDay, nextMeal } from './usePlan';

export default function TodayPlanCard({ navigation }) {
  const { language } = useApp();
  const T = s2(language);
  const { plan } = usePlan();
  if (!plan) {
    return (
      <Pressable onPress={() => navigation.navigate('OnboardingV2', { edit: true })} style={[s.card, s.make]} accessibilityRole="button">
        <Text style={s.makeText}>{T.diet.makePlan}</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </Pressable>
    );
  }
  const session = sessionForDay(plan.workout);
  const meal = nextMeal(plan.diet);
  return (
    <View style={s.row}>
      <Pressable onPress={() => navigation.navigate('Workout')} style={({ pressed }) => [s.card, s.dark, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityRole="button">
        <Text style={s.labelDark}>{session ? T.home.workoutToday : T.home.restToday}</Text>
        <Text style={s.bigDark} numberOfLines={2}>{session ? `${session.key}  ${session.title}` : plan.workout?.split_name}</Text>
        {session ? <Text style={s.subDark}>{session.exercises?.length} exercícios   {session.duration_min || ''} min</Text> : null}
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Plan')} style={({ pressed }) => [s.card, s.light, { transform: [{ scale: pressed ? 0.98 : 1 }] }]} accessibilityRole="button">
        <Text style={s.label}>{T.home.nextMeal}</Text>
        <Text style={s.big} numberOfLines={2}>{meal ? meal.name : ''}</Text>
        {meal ? <Text style={s.sub}>{meal.time}   {meal.kcal} kcal</Text> : null}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  card: { flex: 1, borderRadius: 22, padding: 16, minHeight: 122 },
  dark: { backgroundColor: '#0E1B14' },
  light: { backgroundColor: '#FCEFD2' },
  labelDark: { fontSize: 12.5, color: '#9FD3B3', ...font('bold') },
  bigDark: { fontSize: 20, color: '#fff', marginTop: 6, lineHeight: 24, ...font('heading') },
  subDark: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6, ...font('bodyBold') },
  label: { fontSize: 12.5, color: '#9A5A06', ...font('bold') },
  big: { fontSize: 20, color: '#3A2604', marginTop: 6, lineHeight: 24, ...font('heading') },
  sub: { fontSize: 13, color: '#9A5A06', marginTop: 6, ...font('bodyBold') },
  make: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B7A3F', minHeight: 0, marginBottom: 14 },
  makeText: { fontSize: 18, color: '#fff', ...font('bold') },
});
