// Halal rules engine — applied client-side on top of the neutral analysis
// returned by the server. The server does NOT know how to score halal (it
// only handles vegan/vegetarian/glutenFree today); this file is the whole
// halal decision surface. Kept OTA-safe: pure JS, zero imports, no I/O.
//
// Design notes
// ------------
// * Match against `normalized_ingredients` (array of strings) that the
//   server already extracts. We do NOT re-parse the raw label.
// * Three categories:
//     - haram_always     → always maps to "not_halal"
//     - haram_depends    → strict: not_halal · moderate: mashbooh
//     - mashbooh_always  → always mashbooh (both strictness levels)
// * Overall verdict = worst category present. Priorities:
//     not_halal (2) > mashbooh (1) > halal (0)
// * Matching handles: case-insensitive, singular/plural, multi-language
//   aliases where the term is common; E-codes normalize any of
//   "E120", "e 120", "E-120", "E120c" → e120 (letter kept as suffix).
//
// Compliance / tone (Apple review 1.4.1)
// --------------------------------------
// Labels shown to the user are "Halal", "Mashbooh", "Not Halal" — never
// "Haram" as the top verdict. The word "haram" only appears in per-
// ingredient reason strings for cases where the ingredient is inequivocal
// (e.g. declared porcine gelatin). Advisory framing is preserved via the
// existing disclaimer box plus a halal-specific certification reminder
// added in ResultScreen.

export const HALAL_STATUS = {
  HALAL: 'halal',
  MASHBOOH: 'mashbooh',
  NOT_HALAL: 'not_halal',
};

export const HALAL_STRICTNESS = {
  CAUTIOUS: 'cautious',
  MODERATE: 'moderate',
};

export const DEFAULT_HALAL_STRICTNESS = HALAL_STRICTNESS.CAUTIOUS;

// Category → status resolver. Kept as a small pure function so the tests
// can reason about the mapping without going through the whole engine.
export function resolveCategoryStatus(category, strictness) {
  if (category === 'haram_always') return HALAL_STATUS.NOT_HALAL;
  if (category === 'mashbooh_always') return HALAL_STATUS.MASHBOOH;
  if (category === 'haram_depends') {
    return strictness === HALAL_STRICTNESS.MODERATE
      ? HALAL_STATUS.MASHBOOH
      : HALAL_STATUS.NOT_HALAL;
  }
  return HALAL_STATUS.HALAL;
}

const STATUS_RANK = {
  [HALAL_STATUS.HALAL]: 0,
  [HALAL_STATUS.MASHBOOH]: 1,
  [HALAL_STATUS.NOT_HALAL]: 2,
};

export function worseHalalStatus(a, b) {
  return (STATUS_RANK[a] || 0) >= (STATUS_RANK[b] || 0) ? a : b;
}

// Normalize a raw ingredient string so aliases match reliably.
// Lowercase, strip common punctuation/percentages/parentheticals content
// only where safe, collapse whitespace.
export function normalizeIngredient(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();
  // Strip percentages like "12,5%" or "12.5 %"
  s = s.replace(/\d+[.,]?\d*\s*%/g, ' ');
  // Strip common punctuation but keep letters, digits, hyphens and spaces
  s = s.replace(/[.,;:()\[\]"']/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Extract E-code tokens from a normalized string.
// Matches: e120, e 120, e-120, e120a, e 471 b, etc. Returns an array of
// normalized codes like ["e120", "e471a"].
const E_CODE_RE = /\be[\s\-]?(\d{3,4})([a-f]?)\b/gi;
export function extractECodes(normalized) {
  if (!normalized) return [];
  const out = [];
  let m;
  E_CODE_RE.lastIndex = 0;
  while ((m = E_CODE_RE.exec(normalized)) !== null) {
    out.push(`e${m[1]}${(m[2] || '').toLowerCase()}`);
  }
  return out;
}

// Rule shape: { id, category, reasonKey, aliases?, ecodes?, aliasRegex? }
// aliases   — substrings matched against the normalized ingredient
// ecodes    — set of normalized E-codes ("e120") that trigger this rule
// aliasRegex — optional RegExp used in addition to aliases (for stemming)
//
// Order does not matter — the engine collects all matches and picks the
// worst. IDs are stable and referenced by i18n reasonKey.
export const HALAL_RULES = [
  // ============================================================
  // HARAM_ALWAYS — inequivocally not halal
  // ============================================================
  {
    id: 'pork_gelatin',
    category: 'haram_always',
    reasonKey: 'halal.reason.pork_gelatin',
    aliases: [
      'gelatina suina', 'gelatina suína', 'gelatina de porco', 'gelatina de cerdo',
      'porcine gelatin', 'porcine gelatine', 'pork gelatin', 'pork gelatine',
      'schweinegelatine', 'gélatine porcine', 'gelatine porcine',
      'gelatina di maiale', 'sus scrofa',
    ],
  },
  {
    id: 'pork',
    category: 'haram_always',
    reasonKey: 'halal.reason.pork',
    aliases: [
      'porco', 'suíno', 'suino', 'carne de porco',
      'pork', 'ham ', 'bacon', 'lardon', 'jambon',
      'cerdo', 'jamón', 'jamon',
      'schwein', 'schweinefleisch', 'speck',
      'porc', 'maiale', 'prosciutto', 'pancetta',
    ],
    // Guard against false positives like "sport", "porcelain" by requiring
    // a word boundary for the short "porc" alias.
    aliasRegex: /\bporc(?:o|ino|ini|ine|)?\b|\bporcina\b/i,
  },
  {
    id: 'lard',
    category: 'haram_always',
    reasonKey: 'halal.reason.lard',
    aliases: [
      'banha', 'banha de porco',
      'lard', 'saindoux', 'strutto',
      'manteca de cerdo', 'schmalz', 'schweineschmalz',
    ],
  },
  {
    id: 'alcohol',
    category: 'haram_always',
    reasonKey: 'halal.reason.alcohol',
    aliases: [
      'álcool', 'alcool', 'etanol',
      'alcohol', 'ethanol',
      'ethyl alcohol', 'alcool éthylique', 'alcool etilico',
      'alkohol', 'ethylalkohol',
    ],
  },
  {
    id: 'wine_beer',
    category: 'haram_always',
    reasonKey: 'halal.reason.wine_beer',
    aliases: [
      'vinho', 'vinagre de vinho', 'cerveja', 'malte de cerveja',
      'wine', 'wine vinegar', 'beer', 'malt beer',
      'vin', 'vinaigre de vin', 'bière', 'biere',
      'vino', 'vinagre de vino', 'cerveza',
      'wein', 'weinessig', 'bier',
      'birra', 'aceto di vino',
    ],
  },

  // ============================================================
  // HARAM_DEPENDS — strict: not_halal · moderate: mashbooh
  // ============================================================
  {
    id: 'gelatin_unspecified',
    category: 'haram_depends',
    reasonKey: 'halal.reason.gelatin_unspecified',
    aliases: [
      'gelatina', 'gelatin', 'gelatine', 'gelée',
      'gelatina alimentaria',
    ],
    ecodes: new Set(['e441']),
  },
  {
    id: 'carmine_e120',
    category: 'haram_depends',
    reasonKey: 'halal.reason.carmine',
    aliases: [
      'carmim', 'carmín', 'carmine', 'cochonilha', 'cochineal',
      'ácido carmínico', 'carminic acid', 'karmin',
    ],
    ecodes: new Set(['e120']),
  },
  {
    id: 'meat_uncertified',
    category: 'haram_depends',
    reasonKey: 'halal.reason.meat_uncertified',
    aliases: [
      'carne bovina', 'carne de vaca', 'frango', 'peru',
      'beef', 'chicken', 'turkey', 'meat extract',
      'extrato de carne', 'extracto de carne',
      'poulet', 'boeuf', 'dinde', 'extrait de viande',
      'pollo', 'pavo', 'extracto de carne',
      'huhn', 'rindfleisch', 'fleischextrakt',
      'manzo', 'pollo', 'tacchino', 'estratto di carne',
    ],
  },

  // ============================================================
  // MASHBOOH_ALWAYS — doubtful in both strictness levels
  // ============================================================
  {
    id: 'mono_diglycerides',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.mono_diglycerides',
    aliases: [
      'mono e diglicerídeos', 'monoglicerídeos', 'diglicerídeos',
      'mono and diglycerides', 'monoglycerides', 'diglycerides',
      'mono- und diglyceride', 'mono- et diglycérides',
      'mono e digliceridi',
    ],
    ecodes: new Set(['e471', 'e472', 'e472a', 'e472b', 'e472c', 'e472d', 'e472e', 'e472f']),
  },
  {
    id: 'glycerol',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.glycerol',
    aliases: ['glicerol', 'glycerol', 'glycerin', 'glycérol', 'glicerina'],
    ecodes: new Set(['e422']),
  },
  {
    id: 'bone_phosphate',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.bone_phosphate',
    aliases: [
      'fosfato de osso', 'bone phosphate', 'phosphate d\'os',
      'knochenphosphat', 'fosfato de hueso', 'fosfato di ossa',
    ],
    ecodes: new Set(['e542']),
  },
  {
    id: 'shellac',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.shellac',
    aliases: ['shellac', 'goma laca', 'gomme laque', 'schellack'],
    ecodes: new Set(['e904']),
  },
  {
    id: 'l_cysteine',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.l_cysteine',
    aliases: [
      'l-cisteína', 'l-cisteina', 'l-cysteine',
      'l-cystein', 'l-cistéine',
    ],
    ecodes: new Set(['e920']),
  },
  {
    id: 'nucleotides',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.nucleotides',
    aliases: [
      'guanilato dissódico', 'inosinato dissódico',
      'disodium guanylate', 'disodium inosinate',
      'dinatriumguanylat', 'dinatriuminosinat',
      'guanylate disodique', 'inosinate disodique',
    ],
    ecodes: new Set(['e627', 'e631']),
  },
  {
    id: 'rennet',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.rennet',
    aliases: [
      'coalho', 'quimosina', 'rennet', 'presure', 'cuajo',
      'lab', 'labferment', 'caglio',
    ],
  },
  {
    id: 'whey',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.whey',
    aliases: [
      'soro de leite', 'soro do leite', 'whey', 'lactosérum',
      'lactoserum', 'suero de leche', 'molke', 'siero di latte',
    ],
  },
  {
    id: 'pepsin',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.pepsin',
    aliases: ['pepsina', 'pepsin', 'pepsine'],
  },
  {
    id: 'natural_flavor',
    category: 'mashbooh_always',
    reasonKey: 'halal.reason.natural_flavor',
    aliases: [
      'aroma natural', 'aromas naturais',
      'natural flavor', 'natural flavour', 'natural flavors', 'natural flavours',
      'arôme naturel', 'arome naturel', 'aromas naturales',
      'natürliches aroma', 'natuerliches aroma',
      'aroma naturale', 'aromi naturali',
      'extrato de baunilha', 'vanilla extract', 'extrait de vanille',
      'vanilleextrakt', 'estratto di vaniglia',
    ],
  },
];

function ruleMatches(rule, normalized, ecodes) {
  if (rule.ecodes) {
    for (const code of ecodes) {
      if (rule.ecodes.has(code)) return true;
    }
  }
  if (rule.aliasRegex && rule.aliasRegex.test(normalized)) return true;
  if (Array.isArray(rule.aliases)) {
    for (const alias of rule.aliases) {
      if (!alias) continue;
      const needle = normalizeIngredient(alias);
      if (needle && normalized.includes(needle)) return true;
    }
  }
  return false;
}

// Main entry point. Runs the rule table against each normalized ingredient
// string and returns:
//   { status, flagged: [{ ingredient, status, ruleId, reasonKey }] }
// where `status` is the worst outcome across all ingredients.
export function applyHalalRules(ingredients, strictness = DEFAULT_HALAL_STRICTNESS) {
  const flagged = [];
  let worst = HALAL_STATUS.HALAL;
  if (!Array.isArray(ingredients)) return { status: worst, flagged };

  for (const ing of ingredients) {
    const normal = normalizeIngredient(ing);
    if (!normal) continue;
    const ecodes = extractECodes(normal);
    // A single ingredient string may trigger more than one rule; keep only
    // the worst per-ingredient so the chip doesn't spam the UI.
    let bestForThisIngredient = null;
    for (const rule of HALAL_RULES) {
      if (!ruleMatches(rule, normal, ecodes)) continue;
      const status = resolveCategoryStatus(rule.category, strictness);
      if (!bestForThisIngredient || STATUS_RANK[status] > STATUS_RANK[bestForThisIngredient.status]) {
        bestForThisIngredient = { ingredient: ing, status, ruleId: rule.id, reasonKey: rule.reasonKey };
      }
    }
    if (bestForThisIngredient) {
      flagged.push(bestForThisIngredient);
      worst = worseHalalStatus(worst, bestForThisIngredient.status);
    }
  }
  return { status: worst, flagged };
}
