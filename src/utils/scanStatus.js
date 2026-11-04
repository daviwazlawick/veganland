import { Colors } from '../constants/colors';
import { applyHalalRules, HALAL_STATUS, DEFAULT_HALAL_STRICTNESS } from '../constants/halalRules';
import { applyKosherRules, KOSHER_STATUS } from '../constants/kosherRules';

const HALAL_TO_STATUS = {
  [HALAL_STATUS.HALAL]: 'SAFE',
  [HALAL_STATUS.MASHBOOH]: 'CAUTION',
  [HALAL_STATUS.NOT_HALAL]: 'NOT_SAFE',
};

const KOSHER_TO_STATUS = {
  [KOSHER_STATUS.KOSHER]: 'SAFE',
  [KOSHER_STATUS.SUPERVISION]: 'CAUTION',
  [KOSHER_STATUS.NOT_KOSHER]: 'NOT_SAFE',
};

export const STATUS_CONFIG = {
  SAFE:     { color: Colors.safeDark,    bg: Colors.safeLight,    strip: Colors.safe,    icon: 'safe',    labelKey: 'result.safe' },
  CAUTION:  { color: Colors.cautionDark, bg: Colors.cautionLight, strip: Colors.caution, icon: 'caution', labelKey: 'result.caution' },
  NOT_SAFE: { color: Colors.dangerDark,  bg: Colors.dangerLight,  strip: Colors.danger,  icon: 'danger',  labelKey: 'result.not_safe' },
};

// Status que o usuário vê na lista: halal e kosher passam pelas regras do app,
// igual à tela de Resultado, pra lista e resultado nunca discordarem.
export function effectiveStatus(scan, profile) {
  const ings = scan.normalized_ingredients;
  const labels = (scan.productInfo?.offMeta?.labels || []).map(l => String(l).toLowerCase());
  let status = scan.status;
  if (ings?.length) {
    if (profile?.dietId === 'halal' && !labels.includes('halal')) {
      status = HALAL_TO_STATUS[applyHalalRules(ings, profile?.halalStrictness || DEFAULT_HALAL_STRICTNESS).status] || scan.status;
    } else if (profile?.dietId === 'kosher' && !labels.includes('kosher') && !labels.includes('orthodox union kosher')) {
      status = KOSHER_TO_STATUS[applyKosherRules(ings).status] || scan.status;
    }
  }
  return STATUS_CONFIG[status] ? status : 'CAUTION';
}

// Refeição mais provável pela hora local, pra o registro já vir marcado certo.
export function mealForNow(date = new Date()) {
  const h = date.getHours();
  if (h >= 5 && h < 11) return 'breakfast';
  if (h >= 11 && h < 15) return 'lunch';
  if (h >= 18 && h < 23) return 'dinner';
  return 'snack';
}
