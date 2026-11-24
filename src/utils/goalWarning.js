// Aviso quando logar um item passa a meta diária em algum nutriente.
// Chamar antes de logConsumption: se retornar null, loga direto. Se objecto, mostrar Alert
// com `title` + `body` e botões `confirmLabel` / `cancelLabel`; só continuar o log no "confirm".
import { Alert } from 'react-native';
import { t } from '../i18n';

// Nutrientes vigiados. Fibra fica de fora (excesso é bom). Água também.
const WATCHED = ['calories_kcal', 'protein_g', 'fat_g', 'carbs_g', 'sugar_g', 'salt_g'];
const GOAL_KEY = { calories_kcal: 'calories_kcal', protein_g: 'protein_g', fat_g: 'fat_g', carbs_g: 'carbs_g', sugar_g: 'sugar_g', salt_g: 'salt_g' };
const LABEL_KEY = { calories_kcal: 'calories', protein_g: 'protein', fat_g: 'fat', carbs_g: 'carbs', sugar_g: 'sugar', salt_g: 'salt' };

// Ignora água e entradas sem macros relevantes.
function isNutritionalEntry(entry) {
  return WATCHED.some(k => Number(entry?.[k]) > 0);
}

export function overGoalWarning(todayTotals, goals, entry, language) {
  if (!entry || !goals || !isNutritionalEntry(entry)) return null;
  const overs = [];
  for (const k of WATCHED) {
    const goal = Number(goals[GOAL_KEY[k]]);
    if (!Number.isFinite(goal) || goal <= 0) continue;
    const before = Number(todayTotals?.[k]) || 0;
    const add = Number(entry[k]) || 0;
    if (add <= 0) continue;
    const after = before + add;
    // Só avisa se ultrapassar em mais de 5% (tolerância para erro de arredondamento).
    if (after > goal * 1.05) {
      const percentOver = Math.round(((after - goal) / goal) * 100);
      overs.push({ key: k, label: LABEL_KEY[k], before, after, goal, percentOver });
    }
  }
  if (!overs.length) return null;
  const parts = overs.map(o => `${t(language, `goalWarning.nutrient.${o.label}`)} +${o.percentOver}%`).join(', ');
  const title = t(language, 'goalWarning.title');
  const body = overs.length === 1
    ? t(language, 'goalWarning.body_one', { nutrient: t(language, `goalWarning.nutrient.${overs[0].label}`), pct: overs[0].percentOver })
    : t(language, 'goalWarning.body_many', { list: parts });
  return { overs, title, body, confirmLabel: t(language, 'goalWarning.confirm'), cancelLabel: t(language, 'goalWarning.cancel') };
}

// Helper: dispara Alert se preciso; chama onConfirm se puder seguir. onCancel opcional.
export function confirmBeforeLog({ todayTotals, goals, entry, language, onConfirm, onCancel }) {
  const w = overGoalWarning(todayTotals, goals, entry, language);
  if (!w) return onConfirm();
  Alert.alert(w.title, w.body, [
    { text: w.cancelLabel, style: 'cancel', onPress: onCancel },
    { text: w.confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
