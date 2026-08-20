import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import {
  apiGetBodyProfile, apiSaveBodyProfile,
  apiGetNutritionGoals, apiSaveNutritionGoals,
  apiLogConsumption, apiUpdateConsumption, apiDeleteConsumption,
  apiGetDayLog, apiGetNutritionReport,
  apiLogWeight, apiGetWeightHistory,
  apiGetTodayExercise, apiLogExercise, apiDeleteExercise,
  apiLogMeasurements, apiGetMeasurements,
  apiGetBodyMeasurements,
} from '../services/apiService';

const NutritionContext = createContext(null);

export function NutritionProvider({ children }) {
  const { token } = useAuth();
  const [bodyProfile, setBodyProfile] = useState(null);
  const [goals, setGoals] = useState(null);
  const [todayLog, setTodayLog] = useState([]);
  const [weightHistory, setWeightHistory] = useState([]);
  const [measurementsHistory, setMeasurementsHistory] = useState([]);
  const [bodyMeasurements, setBodyMeasurements] = useState([]);
  const [todayExercise, setTodayExercise] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const todayStr = () => new Date().toISOString().slice(0, 10);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const [profile, g, log, wh, mh, bm, ex] = await Promise.all([
        apiGetBodyProfile(token).catch(() => null),
        apiGetNutritionGoals(token).catch(() => null),
        apiGetDayLog(token, todayStr()).catch(() => []),
        apiGetWeightHistory(token).catch(() => []),
        apiGetMeasurements(token).catch(() => []),
        apiGetBodyMeasurements(token).catch(() => []),
        apiGetTodayExercise(token, todayStr()),
      ]);
      if (profile != null) setBodyProfile(profile);
      if (g != null) setGoals(g);
      setTodayLog(Array.isArray(log) ? log : []);
      setWeightHistory(Array.isArray(wh) ? wh : []);
      setMeasurementsHistory(Array.isArray(mh) ? mh : []);
      setBodyMeasurements(Array.isArray(bm) ? bm : []);
      setTodayExercise(Array.isArray(ex) ? ex : []);
    } catch {}
    setLoaded(true);
  }, [token]);

  useEffect(() => { if (token) refresh(); }, [token, refresh]);

  const saveBodyProfile = useCallback(async (data) => {
    if (!token) return null;
    const res = await apiSaveBodyProfile(token, data);
    setBodyProfile(data);
    if (res.suggested && !goals?.is_custom) setGoals(res.suggested);
    return res;
  }, [token, goals]);

  const saveGoals = useCallback(async (g) => {
    if (!token) return;
    await apiSaveNutritionGoals(token, g);
    setGoals({ ...g, is_custom: true });
  }, [token]);

  const logConsumption = useCallback(async (entry) => {
    if (!token) return null;
    const res = await apiLogConsumption(token, entry);
    const log = await apiGetDayLog(token, todayStr());
    setTodayLog(Array.isArray(log) ? log : []);
    return res;
  }, [token]);

  const updateConsumption = useCallback(async (id, entry) => {
    if (!token) return null;
    const res = await apiUpdateConsumption(token, id, entry);
    const log = await apiGetDayLog(token, todayStr());
    setTodayLog(Array.isArray(log) ? log : []);
    return res;
  }, [token]);

  const deleteConsumption = useCallback(async (id) => {
    if (!token) return;
    await apiDeleteConsumption(token, id);
    setTodayLog(prev => prev.filter(e => e.id !== id));
  }, [token]);

  const getReport = useCallback(async (from, to) => {
    if (!token) return { rows: [] };
    return apiGetNutritionReport(token, from, to);
  }, [token]);

  const addWeight = useCallback(async (kg) => {
    if (!token) return;
    await apiLogWeight(token, kg);
    const wh = await apiGetWeightHistory(token);
    setWeightHistory(Array.isArray(wh) ? wh : []);
  }, [token]);

  const logMeasurements = useCallback(async (data) => {
    if (!token) return;
    await apiLogMeasurements(token, data);
    const mh = await apiGetMeasurements(token);
    setMeasurementsHistory(Array.isArray(mh) ? mh : []);
  }, [token]);

  const logExercise = useCallback(async (entry) => {
    if (!token) return null;
    const res = await apiLogExercise(token, entry);
    setTodayExercise(prev => [...prev, res]);
    return res;
  }, [token]);

  const deleteExercise = useCallback(async (id) => {
    if (!token) return;
    await apiDeleteExercise(token, id);
    setTodayExercise(prev => prev.filter(e => e.id !== id));
  }, [token]);

  const todayBurned = todayExercise.reduce((sum, e) => sum + (Number(e.calories_burned) || 0), 0);

  const todayTotals = todayLog.reduce((acc, e) => ({
    calories_kcal: acc.calories_kcal + (Number(e.calories_kcal) || 0),
    protein_g:     acc.protein_g     + (Number(e.protein_g)     || 0),
    fat_g:         acc.fat_g         + (Number(e.fat_g)         || 0),
    carbs_g:       acc.carbs_g       + (Number(e.carbs_g)       || 0),
    fiber_g:       acc.fiber_g       + (Number(e.fiber_g)       || 0),
    sugar_g:       acc.sugar_g       + (Number(e.sugar_g)       || 0),
    salt_g:        acc.salt_g        + (Number(e.salt_g)        || 0),
    water_ml:      acc.water_ml      + (Number(e.water_ml)      || 0),
  }), { calories_kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, sugar_g: 0, salt_g: 0, water_ml: 0 });

  return (
    <NutritionContext.Provider value={{
      bodyProfile, goals, todayLog, todayTotals, weightHistory, measurementsHistory, bodyMeasurements, loaded,
      todayExercise, todayBurned,
      refresh, saveBodyProfile, saveGoals,
      logConsumption, updateConsumption, deleteConsumption, getReport, addWeight,
      logExercise, deleteExercise, logMeasurements,
    }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error('useNutrition must be used within NutritionProvider');
  return ctx;
}
