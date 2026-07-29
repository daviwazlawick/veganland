// Kosher rules engine — applied client-side. Pure JS, zero imports, OTA-safe.
//
// Three verdict levels (mirrors halal engine's three-tier design):
//   KOSHER      → meets basic kosher requirements
//   SUPERVISION → requires kosher certification / rabbinical supervision
//   NOT_KOSHER  → contains ingredients that are clearly not kosher
//
// Key forbidden categories:
//   - Pork and all its derivatives
//   - Shellfish and non-scaled aquatic creatures
//   - Blood and blood products
//   - Lard
//
// Supervision-required categories (need a kosher-certified product):
//   - Gelatin of unspecified origin (may be porcine)
//   - Wine / grape products (require kosher-certified wine)
//   - Rennet (cheese must be certified kosher)
//   - Uncertified meat/poultry (must come from kosher slaughter + inspection)
//   - Mixing of meat and dairy ingredients in the same product

export const KOSHER_STATUS = {
  KOSHER: 'kosher',
  SUPERVISION: 'supervision',
  NOT_KOSHER: 'not_kosher',
};

const STATUS_RANK = {
  [KOSHER_STATUS.KOSHER]: 0,
  [KOSHER_STATUS.SUPERVISION]: 1,
  [KOSHER_STATUS.NOT_KOSHER]: 2,
};

export function worseKosherStatus(a, b) {
  return (STATUS_RANK[a] || 0) >= (STATUS_RANK[b] || 0) ? a : b;
}

// Reuse the same normalizer pattern as halalRules so ingredient strings
// are comparable across both engines.
function normalizeIngredient(raw) {
  if (!raw) return '';
  let s = String(raw).toLowerCase();
  s = s.replace(/\d+[.,]?\d*\s*%/g, ' ');
  s = s.replace(/[.,;:()\[\]"']/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

const E_CODE_RE = /\be[\s\-]?(\d{3,4})([a-f]?)\b/gi;
function extractECodes(normalized) {
  if (!normalized) return [];
  const out = [];
  let m;
  E_CODE_RE.lastIndex = 0;
  while ((m = E_CODE_RE.exec(normalized)) !== null) {
    out.push(`e${m[1]}${(m[2] || '').toLowerCase()}`);
  }
  return out;
}

// Ingredient aliases that indicate meat/poultry (used for meat+dairy detection)
const MEAT_ALIASES = [
  'carne', 'beef', 'chicken', 'turkey', 'veal', 'lamb', 'poultry',
  'frango', 'peru', 'vitela', 'carne bovina', 'carne de vaca',
  'poulet', 'boeuf', 'dinde', 'veau', 'agneau', 'viande',
  'pollo', 'pavo', 'ternera', 'cordero', 'carne de res',
  'huhn', 'rindfleisch', 'fleisch', 'lamm', 'kalb', 'truthahn',
  'manzo', 'tacchino', 'agnello', 'vitello', 'carne di pollo',
];

// Ingredient aliases that indicate dairy (used for meat+dairy detection)
const DAIRY_ALIASES = [
  'milk', 'cheese', 'butter', 'cream', 'whey', 'casein', 'lactose', 'dairy',
  'leite', 'queijo', 'manteiga', 'nata', 'soro', 'caseína',
  'lait', 'fromage', 'beurre', 'crème', 'lactosérum', 'caséine',
  'leche', 'queso', 'mantequilla', 'nata', 'suero',
  'milch', 'käse', 'rahm', 'sahne', 'molke',
  'latte', 'formaggio', 'burro', 'panna', 'siero',
];

function hasAny(normalizedList, aliases) {
  return aliases.some(alias => normalizedList.some(n => n.includes(alias)));
}

export const KOSHER_RULES = [
  // ============================================================
  // NOT_KOSHER — always forbidden
  // ============================================================
  {
    id: 'pork',
    category: 'not_kosher',
    reasonKey: 'kosher.reason.pork',
    aliases: [
      'porco', 'suíno', 'suino', 'carne de porco',
      'pork', 'ham ', 'bacon', 'lardon', 'jambon',
      'cerdo', 'jamón', 'jamon',
      'schwein', 'schweinefleisch', 'speck',
      'maiale', 'prosciutto', 'pancetta',
      'gelatina suina', 'gelatina suína', 'gelatina de porco', 'gelatina de cerdo',
      'porcine gelatin', 'porcine gelatine', 'pork gelatin', 'pork gelatine',
      'schweinegelatine', 'gélatine porcine', 'gelatine porcine',
      'sus scrofa',
    ],
    aliasRegex: /\bporc(?:o|ino|ini|ine|)?\b|\bporcina\b/i,
  },
  {
    id: 'lard',
    category: 'not_kosher',
    reasonKey: 'kosher.reason.lard',
    aliases: [
      'banha', 'banha de porco',
      'lard', 'saindoux', 'strutto',
      'manteca de cerdo', 'schmalz', 'schweineschmalz',
    ],
  },
  {
    id: 'shellfish',
    category: 'not_kosher',
    reasonKey: 'kosher.reason.shellfish',
    aliases: [
      // Portuguese
      'camarão', 'camarao', 'lagosta', 'caranguejo', 'mexilhão', 'mexilhao', 'amêijoa', 'amêijoas', 'ostra',
      // English
      'shrimp', 'prawn', 'lobster', 'crab', 'mussel', 'clam', 'oyster', 'scallop', 'squid', 'calamari', 'octopus',
      // French
      'crevette', 'homard', 'crabe', 'moule', 'palourde', 'huître', 'huître', 'calamar', 'poulpe',
      // Spanish
      'gamba', 'langosta', 'cangrejo', 'mejillón', 'mejillon', 'almeja', 'calamar', 'pulpo',
      // German
      'garnele', 'hummer', 'krabbe', 'miesmuschel', 'auster', 'tintenfisch',
      // Italian
      'gambero', 'aragosta', 'granchio', 'cozza', 'vongola', 'ostrica', 'calamaro', 'polpo',
    ],
  },
  {
    id: 'blood',
    category: 'not_kosher',
    reasonKey: 'kosher.reason.blood',
    aliases: [
      'morcilla', 'boudin noir', 'black pudding', 'blood sausage', 'blood pudding',
      'blutwurst', 'bloedworst',
    ],
    aliasRegex: /\bblood\b/i,
  },

  // ============================================================
  // SUPERVISION — requires a kosher-certified product
  // ============================================================
  {
    id: 'gelatin_unspecified',
    category: 'supervision',
    reasonKey: 'kosher.reason.gelatin_unspecified',
    aliases: [
      'gelatina', 'gelatin', 'gelatine', 'gelée', 'gelatina alimentaria',
    ],
    ecodes: new Set(['e441']),
  },
  {
    id: 'wine_grape',
    category: 'supervision',
    reasonKey: 'kosher.reason.wine_grape',
    aliases: [
      // Wine
      'vinho', 'wine', 'vin ', 'vino', 'wein', 'vino',
      // Vinegar from wine
      'vinagre de vinho', 'wine vinegar', 'vinaigre de vin', 'vinagre de vino', 'weinessig', 'aceto di vino',
      // Grape juice/must
      'suco de uva', 'grape juice', 'jus de raisin', 'jugo de uva', 'traubensaft', 'succo d\'uva',
      'mosto', 'grape must', 'moût de raisin',
    ],
  },
  {
    id: 'rennet',
    category: 'supervision',
    reasonKey: 'kosher.reason.rennet',
    aliases: [
      'coalho', 'quimosina', 'rennet', 'presure', 'cuajo', 'présure',
      'lab', 'labferment', 'caglio', 'coagulante',
    ],
  },
  {
    id: 'meat_uncertified',
    category: 'supervision',
    reasonKey: 'kosher.reason.meat_uncertified',
    aliases: [
      'carne bovina', 'carne de vaca', 'carne de frango', 'carne de peru',
      'beef', 'chicken', 'turkey', 'veal', 'lamb', 'meat extract',
      'extrato de carne', 'extracto de carne',
      'poulet', 'boeuf', 'dinde', 'veau', 'agneau', 'extrait de viande',
      'pollo', 'pavo', 'ternera', 'cordero', 'extracto de carne',
      'huhn', 'rindfleisch', 'fleischextrakt', 'lamm', 'kalb', 'truthahn',
      'manzo', 'tacchino', 'agnello', 'vitello', 'estratto di carne',
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

// Main entry point.
// Returns { status, flagged: [{ ingredient, status, ruleId, reasonKey }], meatDairyMix }
// where `status` is the worst outcome and `meatDairyMix` is true if meat+dairy detected.
export function applyKosherRules(ingredients) {
  const flagged = [];
  let worst = KOSHER_STATUS.KOSHER;
  if (!Array.isArray(ingredients)) return { status: worst, flagged, meatDairyMix: false };

  const normalizedList = ingredients.map(normalizeIngredient).filter(Boolean);

  for (const ing of ingredients) {
    const normal = normalizeIngredient(ing);
    if (!normal) continue;
    const ecodes = extractECodes(normal);
    let bestForThisIngredient = null;
    for (const rule of KOSHER_RULES) {
      if (!ruleMatches(rule, normal, ecodes)) continue;
      const status = rule.category === 'not_kosher' ? KOSHER_STATUS.NOT_KOSHER : KOSHER_STATUS.SUPERVISION;
      if (!bestForThisIngredient || STATUS_RANK[status] > STATUS_RANK[bestForThisIngredient.status]) {
        bestForThisIngredient = { ingredient: ing, status, ruleId: rule.id, reasonKey: rule.reasonKey };
      }
    }
    if (bestForThisIngredient) {
      flagged.push(bestForThisIngredient);
      worst = worseKosherStatus(worst, bestForThisIngredient.status);
    }
  }

  // Detect meat + dairy mixing (basar b'chalav — biblically forbidden)
  const hasMeat = hasAny(normalizedList, MEAT_ALIASES);
  const hasDairy = hasAny(normalizedList, DAIRY_ALIASES);
  const meatDairyMix = hasMeat && hasDairy;
  if (meatDairyMix) {
    worst = worseKosherStatus(worst, KOSHER_STATUS.NOT_KOSHER);
  }

  return { status: worst, flagged, meatDairyMix };
}
