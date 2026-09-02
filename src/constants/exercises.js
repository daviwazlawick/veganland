// MET values from Ainsworth et al. compendium
// Icon field holds an Ionicons name (from @expo/vector-icons). Approximations
// used where Ionicons lacks a specific sport/activity icon (swim, row, yoga,
// dance, skate, volleyball, gymnastic, hiking boot, ladder).
export const EXERCISES = [
  // Cardio
  { id: 'running_slow',     met: 8.3,  category: 'cardio',    icon: 'walk-outline',              en: 'Running (slow)',       pt: 'Corrida leve',       de: 'Joggen (leicht)',     fr: 'Course (lente)',         it: 'Corsa (lenta)',        es: 'Carrera (suave)' },
  { id: 'running_fast',     met: 11.5, category: 'cardio',    icon: 'walk-outline',              en: 'Running (fast)',       pt: 'Corrida rápida',     de: 'Laufen (schnell)',    fr: 'Course (rapide)',        it: 'Corsa (veloce)',       es: 'Carrera (rápida)' },
  { id: 'cycling_moderate', met: 8.0,  category: 'cardio',    icon: 'bicycle-outline',           en: 'Cycling (moderate)',   pt: 'Ciclismo moderado',  de: 'Radfahren (moderat)', fr: 'Vélo (modéré)',          it: 'Ciclismo (moderato)',  es: 'Ciclismo (moderado)' },
  { id: 'cycling_fast',     met: 12.0, category: 'cardio',    icon: 'bicycle-outline',           en: 'Cycling (fast)',       pt: 'Ciclismo rápido',    de: 'Radfahren (schnell)', fr: 'Vélo (rapide)',          it: 'Ciclismo (veloce)',    es: 'Ciclismo (rápido)' },
  { id: 'swimming',         met: 8.0,  category: 'cardio',    icon: 'water-outline',             en: 'Swimming',             pt: 'Natação',            de: 'Schwimmen',           fr: 'Natation',               it: 'Nuoto',                es: 'Natación' },
  { id: 'jump_rope',        met: 12.3, category: 'cardio',    icon: 'body-outline',              en: 'Jump rope',            pt: 'Pular corda',        de: 'Seilspringen',        fr: 'Corde à sauter',         it: 'Saltare la corda',     es: 'Comba' },
  { id: 'rowing',           met: 7.0,  category: 'cardio',    icon: 'boat-outline',              en: 'Rowing (machine)',     pt: 'Remo (máquina)',     de: 'Rudern (Gerät)',      fr: 'Aviron (machine)',       it: 'Canottaggio (attrezzo)', es: 'Remo (máquina)' },
  { id: 'elliptical',       met: 5.0,  category: 'cardio',    icon: 'ellipse-outline',           en: 'Elliptical',           pt: 'Elíptico',           de: 'Crosstrainer',        fr: 'Elliptique',             it: 'Ellittica',            es: 'Elíptica' },
  { id: 'stair_climbing',   met: 9.0,  category: 'cardio',    icon: 'swap-vertical-outline',     en: 'Stair climbing',       pt: 'Subir escadas',      de: 'Treppensteigen',      fr: "Montée d'escaliers",     it: 'Salire le scale',      es: 'Subir escaleras' },
  { id: 'hiit',             met: 10.0, category: 'cardio',    icon: 'flash-outline',             en: 'HIIT',                 pt: 'HIIT',               de: 'HIIT',                fr: 'HIIT',                   it: 'HIIT',                 es: 'HIIT' },
  // Walking
  { id: 'walking_slow',     met: 2.5,  category: 'walking',   icon: 'walk-outline',              en: 'Walking (slow)',       pt: 'Caminhada leve',     de: 'Gehen (langsam)',     fr: 'Marche (lente)',         it: 'Camminata (lenta)',    es: 'Caminata (lenta)' },
  { id: 'walking_brisk',    met: 4.3,  category: 'walking',   icon: 'walk-outline',              en: 'Walking (brisk)',      pt: 'Caminhada rápida',   de: 'Zügiges Gehen',       fr: 'Marche rapide',          it: 'Camminata (veloce)',   es: 'Caminata rápida' },
  { id: 'hiking',           met: 6.0,  category: 'walking',   icon: 'map-outline',               en: 'Hiking',               pt: 'Trilha',             de: 'Wandern',             fr: 'Randonnée',              it: 'Escursionismo',        es: 'Senderismo' },
  // Strength
  { id: 'weight_training',  met: 5.0,  category: 'strength',  icon: 'barbell-outline',           en: 'Weight training',      pt: 'Musculação',         de: 'Krafttraining',       fr: 'Musculation',            it: 'Allenamento con pesi', es: 'Pesas' },
  { id: 'bodyweight',       met: 4.0,  category: 'strength',  icon: 'body-outline',              en: 'Bodyweight exercises', pt: 'Exercícios corpo',   de: 'Körpergewicht',       fr: 'Poids du corps',         it: 'Corpo libero',         es: 'Peso corporal' },
  { id: 'crossfit',         met: 9.0,  category: 'strength',  icon: 'flame-outline',             en: 'CrossFit',             pt: 'CrossFit',           de: 'CrossFit',            fr: 'CrossFit',               it: 'CrossFit',             es: 'CrossFit' },
  // Sports
  { id: 'soccer',           met: 7.0,  category: 'sports',    icon: 'football-outline',          en: 'Soccer',               pt: 'Futebol',            de: 'Fußball',             fr: 'Football',               it: 'Calcio',               es: 'Fútbol' },
  { id: 'basketball',       met: 6.5,  category: 'sports',    icon: 'basketball-outline',        en: 'Basketball',           pt: 'Basquete',           de: 'Basketball',          fr: 'Basketball',             it: 'Pallacanestro',        es: 'Baloncesto' },
  { id: 'tennis',           met: 7.3,  category: 'sports',    icon: 'tennisball-outline',        en: 'Tennis',               pt: 'Ténis',              de: 'Tennis',              fr: 'Tennis',                 it: 'Tennis',               es: 'Tenis' },
  { id: 'volleyball',       met: 4.0,  category: 'sports',    icon: 'american-football-outline', en: 'Volleyball',           pt: 'Vôlei',              de: 'Volleyball',          fr: 'Volleyball',             it: 'Pallavolo',            es: 'Voleibol' },
  // Mind-body
  { id: 'yoga',             met: 3.0,  category: 'mind_body', icon: 'body-outline',              en: 'Yoga',                 pt: 'Yoga',               de: 'Yoga',                fr: 'Yoga',                   it: 'Yoga',                 es: 'Yoga' },
  { id: 'pilates',          met: 3.5,  category: 'mind_body', icon: 'body-outline',              en: 'Pilates',              pt: 'Pilates',            de: 'Pilates',             fr: 'Pilates',                it: 'Pilates',              es: 'Pilates' },
  { id: 'tai_chi',          met: 3.0,  category: 'mind_body', icon: 'water-outline',             en: 'Tai Chi',              pt: 'Tai Chi',            de: 'Tai Chi',             fr: 'Tai-chi',                it: 'Tai Chi',              es: 'Tai Chi' },
  // Dance & other
  { id: 'dancing',          met: 5.5,  category: 'dance',     icon: 'musical-notes-outline',     en: 'Dancing',              pt: 'Dança',              de: 'Tanzen',              fr: 'Danse',                  it: 'Danza',                es: 'Baile' },
  { id: 'zumba',            met: 6.5,  category: 'dance',     icon: 'musical-notes-outline',     en: 'Zumba',                pt: 'Zumba',              de: 'Zumba',               fr: 'Zumba',                  it: 'Zumba',                es: 'Zumba' },
  { id: 'roller_skating',   met: 7.0,  category: 'dance',     icon: 'walk-outline',              en: 'Roller skating',       pt: 'Patinagem',          de: 'Rollschuhfahren',     fr: 'Roller',                 it: 'Pattinaggio',          es: 'Patinaje' },
];

export const CATEGORY_CONFIG = {
  cardio:    { color: '#E8450A', bg: '#FFF0EB', label: 'exercise.cat_cardio' },
  walking:   { color: '#16A75A', bg: '#E2F7EA', label: 'exercise.cat_walking' },
  strength:  { color: '#4C6EF5', bg: '#EEF0FF', label: 'exercise.cat_strength' },
  sports:    { color: '#9C4DCC', bg: '#F5EEFF', label: 'exercise.cat_sports' },
  mind_body: { color: '#00897B', bg: '#E0F4F2', label: 'exercise.cat_mind_body' },
  dance:     { color: '#D63384', bg: '#FCE8F3', label: 'exercise.cat_dance' },
};

// kcal burned per minute: MET × weight_kg × 3.5 / 200
export function calsBurnedPerMin(met, weight_kg) {
  return (met * weight_kg * 3.5) / 200;
}

// Minutes needed to burn `calories` kcal
export function minutesToBurn(calories, met, weight_kg) {
  const perMin = calsBurnedPerMin(met, weight_kg);
  if (!perMin) return 0;
  return Math.ceil(calories / perMin);
}

// Total kcal burned in `minutes`
export function calsBurnedForDuration(met, weight_kg, duration_min) {
  return Math.round(calsBurnedPerMin(met, weight_kg) * duration_min);
}

export function getExerciseName(exercise, lang) {
  return exercise[lang] || exercise.en;
}

// Default exercises shown in burn-equivalent on scan result
export const DEFAULT_BURN_EXERCISES = ['running_slow', 'cycling_moderate', 'walking_brisk'];

export const EXERCISE_CATEGORY_KEYS = {
  cardio:    'exercise.cat_cardio',
  walking:   'exercise.cat_walking',
  strength:  'exercise.cat_strength',
  sports:    'exercise.cat_sports',
  mind_body: 'exercise.cat_mind_body',
  dance:     'exercise.cat_dance',
};

// Re-export CATEGORY_CONFIG label keys for backward compat
// (CATEGORY_CONFIG is the canonical source for colors + labels)
