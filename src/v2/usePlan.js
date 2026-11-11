// Plano atual (dieta + treino) recarregado sempre que a tela ganha foco.
import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { v2GetFitness } from './api';

export function usePlan() {
  const { token } = useAuth();
  const [state, setState] = useState({ loading: true, plan: null, profile: null });
  const reload = useCallback(() => {
    if (!token) return;
    v2GetFitness(token)
      .then(r => setState({ loading: false, plan: r.plan, profile: r.profile }))
      .catch(() => setState(s => ({ ...s, loading: false })));
  }, [token]);
  useFocusEffect(reload);
  return { ...state, reload };
}

// Segunda = 0 … domingo = 6.
export const weekdayIndex = (d = new Date()) => (d.getDay() + 6) % 7;

// Qual sessão cai hoje pelo "schedule" do plano.
export function sessionForDay(workout, idx = weekdayIndex()) {
  if (!workout?.days?.length) return null;
  const sched = Array.isArray(workout.schedule) && workout.schedule.length === 7 ? workout.schedule : null;
  const key = sched ? sched[idx] : null;
  if (!key || /rest|descanso/i.test(key)) return null;
  return workout.days.find(d => d.key === key) || null;
}

// Próxima refeição pelo horário.
export function nextMeal(diet, now = new Date()) {
  const meals = diet?.meals || [];
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  return meals.find(m => toMin(m.time) + 45 >= mins) || meals[0] || null;
}

export function mealTypeFor(meal) {
  const h = Number(String(meal?.time || '12').split(':')[0]);
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
