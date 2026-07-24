export const DIETS = [
  {
    id: 'vegan',
    icon: 'vegan',
    label: { pt: 'Vegano', en: 'Vegan', de: 'Vegan', fr: 'Végane', it: 'Vegano', es: 'Vegano' },
    description: { pt: 'Sem nenhum produto animal', en: 'No animal products whatsoever', de: 'Ganz ohne tierische Produkte', fr: 'Sans aucun produit animal', it: 'Senza prodotti animali', es: 'Sin ningún producto animal' },
    restrictions: ['meat', 'fish', 'dairy', 'eggs', 'honey', 'gelatin', 'lard', 'whey', 'casein', 'albumin'],
  },
  {
    id: 'vegetarian',
    icon: 'vegetarian',
    label: { pt: 'Vegetariano', en: 'Vegetarian', de: 'Vegetarisch', fr: 'Végétarien', it: 'Vegetariano', es: 'Vegetariano' },
    description: { pt: 'Sem carne ou peixe', en: 'No meat or fish', de: 'Ohne Fleisch oder Fisch', fr: 'Sans viande ni poisson', it: 'Senza carne o pesce', es: 'Sin carne ni pescado' },
    restrictions: ['meat', 'fish', 'gelatin', 'lard'],
  },
  {
    id: 'pescatarian',
    icon: 'pescatarian',
    label: { pt: 'Pescetariano', en: 'Pescatarian', de: 'Pescetarisch', fr: 'Pescétarien', it: 'Pescetariano', es: 'Pescetariano' },
    description: { pt: 'Vegetariano + peixe', en: 'Vegetarian + fish', de: 'Vegetarisch + Fisch', fr: 'Végétarien + poisson', it: 'Vegetariano + pesce', es: 'Vegetariano + pescado' },
    restrictions: ['meat', 'gelatin', 'lard'],
  },
  {
    id: 'gluten_free',
    icon: 'gluten_free',
    label: { pt: 'Sem Glúten', en: 'Gluten-Free', de: 'Glutenfrei', fr: 'Sans gluten', it: 'Senza glutine', es: 'Sin gluten' },
    description: { pt: 'Sem trigo, cevada ou centeio', en: 'No wheat, barley or rye', de: 'Ohne Weizen, Gerste oder Roggen', fr: 'Sans blé, orge ni seigle', it: 'Senza frumento, orzo o segale', es: 'Sin trigo, cebada ni centeno' },
    restrictions: ['gluten', 'wheat', 'barley', 'rye', 'oats'],
  },
  {
    id: 'halal',
    icon: 'halal',
    label: { pt: 'Halal', en: 'Halal', de: 'Halal', fr: 'Halal', it: 'Halal', es: 'Halal' },
    description: { pt: 'Conforme a lei islâmica', en: 'Compliant with Islamic law', de: 'Nach islamischem Recht', fr: 'Conforme à la loi islamique', it: 'Conforme alla legge islamica', es: 'Conforme a la ley islámica' },
    restrictions: ['pork', 'alcohol', 'lard', 'gelatin_pork'],
  },
  {
    id: 'omnivore',
    icon: 'omnivore',
    label: { pt: 'Onívoro', en: 'Omnivore', de: 'Omnivor', fr: 'Omnivore', it: 'Onnivoro', es: 'Omnívoro' },
    description: { pt: 'Sem restrições alimentares', en: 'No dietary restrictions', de: 'Keine Ernährungseinschränkungen', fr: 'Aucune restriction alimentaire', it: 'Nessuna restrizione alimentare', es: 'Sin restricciones alimentarias' },
    restrictions: [],
  },
];

// VeganLand only exposes plant-based diets (vegan + vegetarian) — the other
// options exist in the shared codebase for NovaQI. Any brand other than
// 'veganland' gets the full list (i.e. NovaQI behavior is preserved).
const VEGANLAND_DIET_IDS = ['vegan', 'vegetarian'];

export function getDiets(brand) {
  if (brand === 'veganland') {
    return DIETS.filter(d => VEGANLAND_DIET_IDS.includes(d.id));
  }
  return DIETS;
}
