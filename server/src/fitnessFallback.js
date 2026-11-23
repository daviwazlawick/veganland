// Plano de reserva, sem IA: usado quando a chamada ao Claude falha (sem crédito,
// fora do ar). Fecha nas mesmas metas, com alimentos de mercado e fichas clássicas.
// Fica marcado com source: 'regras' pra tela saber que não veio da IA.

// por 100 g: kcal, proteína, carbo, gordura
const F = {
  ovo:        { n: 'Ovos', k: 143, p: 12.6, c: 0.7, f: 9.5, unit: 50, unitName: 'unidade', tags: ['eggs', 'veg'] },
  pao:        { n: 'Pão integral', k: 247, p: 13, c: 41, f: 3.4, unit: 25, unitName: 'fatia', tags: ['gluten', 'vegan'] },
  tapioca:    { n: 'Tapioca', k: 240, p: 0, c: 60, f: 0, tags: ['vegan'] },
  aveia:      { n: 'Aveia em flocos', k: 389, p: 17, c: 66, f: 7, tags: ['gluten', 'vegan'] },
  iogurte:    { n: 'Iogurte natural', k: 61, p: 3.5, c: 4.7, f: 3.3, tags: ['dairy', 'veg'] },
  queijo:     { n: 'Queijo minas frescal', k: 264, p: 17, c: 3, f: 20, tags: ['dairy', 'veg'] },
  banana:     { n: 'Banana', k: 89, p: 1.1, c: 23, f: 0.3, unit: 100, unitName: 'unidade', tags: ['vegan'] },
  frango:     { n: 'Peito de frango grelhado', k: 165, p: 31, c: 0, f: 3.6, tags: ['meat'] },
  patinho:    { n: 'Patinho moído refogado', k: 200, p: 30, c: 0, f: 9, tags: ['meat'] },
  tilapia:    { n: 'Tilápia grelhada', k: 128, p: 26, c: 0, f: 2.7, tags: ['fish'] },
  tofu:       { n: 'Tofu firme grelhado', k: 144, p: 15.6, c: 3, f: 8.7, tags: ['soy', 'vegan'] },
  soja:       { n: 'Proteína de soja hidratada', k: 120, p: 17, c: 9, f: 0.5, tags: ['soy', 'vegan'] },
  grao:       { n: 'Grão-de-bico cozido', k: 164, p: 8.9, c: 27, f: 2.6, tags: ['vegan'] },
  arroz:      { n: 'Arroz cozido', k: 128, p: 2.5, c: 28, f: 0.2, tags: ['vegan'] },
  feijao:     { n: 'Feijão cozido', k: 76, p: 4.8, c: 13.6, f: 0.5, tags: ['vegan'] },
  batata:     { n: 'Batata-doce cozida', k: 86, p: 1.6, c: 20, f: 0.1, tags: ['vegan'] },
  legumes:    { n: 'Legumes cozidos (brócolis, cenoura, abobrinha)', k: 35, p: 2, c: 7, f: 0.2, tags: ['vegan'] },
  salada:     { n: 'Salada de folhas e tomate', k: 18, p: 1, c: 3.5, f: 0.2, tags: ['vegan'] },
  azeite:     { n: 'Azeite de oliva', k: 884, p: 0, c: 0, f: 100, tags: ['vegan'] },
  whey:       { n: 'Whey protein', k: 400, p: 80, c: 8, f: 6, tags: ['dairy', 'veg'] },
  amendoim:   { n: 'Pasta de amendoim', k: 588, p: 25, c: 20, f: 50, tags: ['peanuts', 'vegan'] },
  fruta:      { n: 'Fruta da estação', k: 55, p: 0.8, c: 14, f: 0.2, tags: ['vegan'] },
};

function allowed(key, p) {
  const t = F[key].tags;
  const diet = p.diet_id || 'omnivore';
  const al = new Set(p.allergy_ids || []);
  if (t.includes('gluten') && (al.has('gluten') || diet === 'gluten_free')) return false;
  if (t.includes('eggs') && (al.has('eggs') || diet === 'vegan')) return false;
  if (t.includes('dairy') && (al.has('dairy') || diet === 'vegan')) return false;
  if (t.includes('soy') && al.has('soy')) return false;
  if (t.includes('peanuts') && al.has('peanuts')) return false;
  if (t.includes('fish') && (al.has('fish') || ['vegan', 'vegetarian'].includes(diet))) return false;
  if (t.includes('meat') && ['vegan', 'vegetarian', 'pescatarian'].includes(diet)) return false;
  return true;
}
const first = (p, keys) => keys.find(k => allowed(k, p));

const SPLITS = { 3: [0.3, 0.4, 0.3], 4: [0.25, 0.3, 0.15, 0.3], 5: [0.2, 0.1, 0.3, 0.15, 0.25], 6: [0.2, 0.1, 0.25, 0.1, 0.2, 0.15] };
const KIND = { 3: ['cafe', 'almoco', 'jantar'], 4: ['cafe', 'almoco', 'lanche', 'jantar'], 5: ['cafe', 'lanche', 'almoco', 'lanche', 'jantar'], 6: ['cafe', 'lanche', 'almoco', 'lanche', 'jantar', 'ceia'] };
const NAME = { cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche', jantar: 'Jantar', ceia: 'Ceia' };
const TIME = { 3: ['07:30', '12:30', '19:30'], 4: ['07:30', '12:30', '16:30', '20:00'], 5: ['07:00', '10:00', '12:30', '16:30', '20:00'], 6: ['07:00', '10:00', '12:30', '16:00', '19:30', '22:00'] };

function item(key, g) {
  const f = F[key];
  const grams = Math.max(5, Math.round(g / 5) * 5);
  const qty = f.unit ? `${Math.max(1, Math.round(grams / f.unit))} ${f.unitName}${Math.round(grams / f.unit) > 1 ? 's' : ''} (${grams} g)` : `${grams} g`;
  const k = grams / 100;
  return { key, g: grams, food: f.n, qty, kcal: Math.round(f.k * k), protein_g: Math.round(f.p * k), carbs_g: Math.round(f.c * k), fat_g: Math.round(f.f * k) };
}

function buildMeal(p, kind, tgt) {
  const items = [];
  const add = (key, g) => { if (key && g > 4) items.push(item(key, g)); };
  const sum = () => items.reduce((a, i) => ({ p: a.p + i.protein_g, c: a.c + i.carbs_g, f: a.f + i.fat_g }), { p: 0, c: 0, f: 0 });
  let swap = '';
  if (kind === 'cafe' || kind === 'lanche' || kind === 'ceia') {
    const prot = kind === 'cafe' ? first(p, ['ovo', 'iogurte', 'tofu', 'whey']) : first(p, ['iogurte', 'whey', 'ovo', 'tofu']);
    const carb = kind === 'cafe' ? first(p, ['pao', 'tapioca', 'aveia']) : first(p, ['aveia', 'tapioca', 'pao']);
    if (kind !== 'ceia') add('fruta', kind === 'cafe' ? 120 : 100);
    add(carb, ((tgt.c - (kind !== 'ceia' ? 14 : 0)) / F[carb].c) * 100);
    const s0 = sum();
    add(prot, ((tgt.p - s0.p) / F[prot].p) * 100);
    swap = prot === 'ovo' ? 'Trocar os ovos por iogurte natural com whey, mesma proteína.' : 'Trocar por ovos mexidos com pão, se preferir salgado.';
  } else {
    const prot = kind === 'almoco' ? first(p, ['frango', 'patinho', 'tilapia', 'tofu', 'soja', 'ovo']) : first(p, ['patinho', 'tilapia', 'frango', 'soja', 'tofu', 'ovo']);
    const carb = kind === 'almoco' ? 'arroz' : 'batata';
    add('legumes', 150);
    add('salada', 80);
    add('feijao', kind === 'almoco' ? 100 : 0);
    if (['vegan', 'vegetarian'].includes(p.diet_id)) add('grao', 80);
    const s0 = sum();
    add(carb, ((tgt.c - s0.c) / F[carb].c) * 100);
    const s1 = sum();
    add(prot, ((tgt.p - s1.p) / F[prot].p) * 100);
    swap = carb === 'arroz' ? 'Trocar o arroz por batata-doce: 1,4× o peso do arroz.' : 'Trocar a batata-doce por arroz: 0,7× o peso.';
  }
  const s2 = sum();
  if (tgt.f - s2.f > 3) add('azeite', ((tgt.f - s2.f) / 100) * 100);
  // Ajuste final: escala tudo (menos folha e legume) pra fechar nas kcal da refeição.
  const kcalNow = items.reduce((a, i) => a + i.kcal, 0);
  const kcalFixed = items.filter(i => i.key === 'legumes' || i.key === 'salada').reduce((a, i) => a + i.kcal, 0);
  const sc = (tgt.kcal - kcalFixed) / Math.max(1, kcalNow - kcalFixed);
  if (sc > 0.5 && sc < 1.5) {
    for (let j = 0; j < items.length; j++) {
      if (items[j].key !== 'legumes' && items[j].key !== 'salada') items[j] = item(items[j].key, items[j].g * sc);
    }
  }
  const tot = items.reduce((a, i) => ({ kcal: a.kcal + i.kcal, p: a.p + i.protein_g, c: a.c + i.carbs_g, f: a.f + i.fat_g }), { kcal: 0, p: 0, c: 0, f: 0 });
  return { kcal: tot.kcal, protein_g: tot.p, carbs_g: tot.c, fat_g: tot.f, items, swap };
}

export function fallbackDiet(p, t) {
  const n = Math.min(6, Math.max(3, Number(p.meals_per_day) || 4));
  const meals = SPLITS[n].map((share, i) => {
    const kind = KIND[n][i];
    const m = buildMeal(p, kind, { kcal: t.calories_kcal * share, p: t.protein_g * share, c: t.carbs_g * share, f: t.fat_g * share });
    m.items = m.items.map(({ key, g, ...rest }) => rest);
    return { key: `m${i + 1}`, name: NAME[kind], time: TIME[n][i], ...m };
  });
  return {
    source: 'regras',
    summary: `Cardápio montado em cima de ${t.calories_kcal} kcal e ${t.protein_g} g de proteína por dia. Proteína em todas as refeições e o grosso do carboidrato no almoço e no jantar.`,
    meals,
    rest_day_note: 'No dia sem treino, tire um terço do arroz ou da batata do almoço e do jantar.',
    tips: ['Pese a comida pronta nas primeiras duas semanas: depois o olho aprende.', 'Beba água ao longo do dia, não tudo de uma vez.'],
  };
}

// ── Treino ──────────────────────────────────────────────────────────────────
const LIB = {
  gym: {
    chest: [['supino_reto_barra', 'Supino reto com barra', 'Peito'], ['supino_inclinado_halter', 'Supino inclinado com halteres', 'Peito'], ['crucifixo_maquina', 'Crucifixo na máquina', 'Peito']],
    back: [['puxada_frente', 'Puxada na frente', 'Costas'], ['remada_baixa', 'Remada baixa no cabo', 'Costas'], ['remada_curvada', 'Remada curvada com barra', 'Costas']],
    shoulders: [['desenvolvimento_halter', 'Desenvolvimento com halteres', 'Ombros'], ['elevacao_lateral', 'Elevação lateral', 'Ombros']],
    biceps: [['rosca_direta', 'Rosca direta com barra', 'Bíceps'], ['rosca_martelo', 'Rosca martelo', 'Bíceps']],
    triceps: [['triceps_corda', 'Tríceps na corda', 'Tríceps'], ['triceps_frances', 'Tríceps francês', 'Tríceps']],
    quads: [['agachamento_livre', 'Agachamento livre', 'Quadríceps'], ['leg_press', 'Leg press 45', 'Quadríceps'], ['cadeira_extensora', 'Cadeira extensora', 'Quadríceps']],
    hams: [['stiff', 'Stiff com halteres', 'Posteriores'], ['mesa_flexora', 'Mesa flexora', 'Posteriores']],
    glutes: [['elevacao_pelvica', 'Elevação pélvica', 'Glúteos'], ['abducao_maquina', 'Abdução na máquina', 'Glúteos']],
    calves: [['panturrilha_em_pe', 'Panturrilha em pé', 'Panturrilha']],
    abs: [['prancha', 'Prancha', 'Abdômen'], ['abdominal_cabo', 'Abdominal no cabo', 'Abdômen']],
  },
  home: {
    chest: [['supino_halter_chao', 'Supino com halteres no chão', 'Peito'], ['flexao', 'Flexão de braço', 'Peito'], ['crucifixo_halter', 'Crucifixo com halteres', 'Peito']],
    back: [['remada_unilateral', 'Remada unilateral com halter', 'Costas'], ['remada_elastico', 'Remada com elástico', 'Costas'], ['pullover_halter', 'Pullover com halter', 'Costas']],
    shoulders: [['desenvolvimento_halter', 'Desenvolvimento com halteres', 'Ombros'], ['elevacao_lateral', 'Elevação lateral', 'Ombros']],
    biceps: [['rosca_alternada', 'Rosca alternada', 'Bíceps'], ['rosca_martelo', 'Rosca martelo', 'Bíceps']],
    triceps: [['triceps_testa_halter', 'Tríceps testa com halter', 'Tríceps'], ['mergulho_banco', 'Mergulho no banco', 'Tríceps']],
    quads: [['agachamento_goblet', 'Agachamento goblet', 'Quadríceps'], ['afundo_halter', 'Afundo com halteres', 'Quadríceps'], ['bulgaro', 'Agachamento búlgaro', 'Quadríceps']],
    hams: [['stiff', 'Stiff com halteres', 'Posteriores'], ['ponte_unilateral', 'Ponte unilateral', 'Posteriores']],
    glutes: [['elevacao_pelvica', 'Elevação pélvica com halter', 'Glúteos'], ['abducao_elastico', 'Abdução com elástico', 'Glúteos']],
    calves: [['panturrilha_unilateral', 'Panturrilha unilateral no degrau', 'Panturrilha']],
    abs: [['prancha', 'Prancha', 'Abdômen'], ['abdominal_bicicleta', 'Abdominal bicicleta', 'Abdômen']],
  },
  bodyweight: {
    chest: [['flexao', 'Flexão de braço', 'Peito'], ['flexao_inclinada', 'Flexão com pés elevados', 'Peito'], ['flexao_diamante', 'Flexão diamante', 'Peito']],
    back: [['barra_fixa', 'Barra fixa (ou remada na mesa)', 'Costas'], ['remada_invertida', 'Remada invertida na mesa', 'Costas'], ['superman', 'Superman', 'Costas']],
    shoulders: [['flexao_pike', 'Flexão pike', 'Ombros'], ['elevacao_y', 'Elevação em Y no chão', 'Ombros']],
    biceps: [['rosca_toalha', 'Rosca isométrica com toalha', 'Bíceps']],
    triceps: [['mergulho_cadeira', 'Mergulho na cadeira', 'Tríceps']],
    quads: [['agachamento', 'Agachamento livre', 'Quadríceps'], ['afundo', 'Afundo alternado', 'Quadríceps'], ['bulgaro', 'Agachamento búlgaro', 'Quadríceps']],
    hams: [['ponte_unilateral', 'Ponte unilateral', 'Posteriores'], ['good_morning', 'Bom-dia sem peso', 'Posteriores']],
    glutes: [['elevacao_pelvica', 'Elevação pélvica', 'Glúteos'], ['abducao_lateral', 'Abdução deitado', 'Glúteos']],
    calves: [['panturrilha_unilateral', 'Panturrilha unilateral no degrau', 'Panturrilha']],
    abs: [['prancha', 'Prancha', 'Abdômen'], ['abdominal_bicicleta', 'Abdominal bicicleta', 'Abdômen']],
  },
};

const FOCUS_TO = { chest: 'chest', back: 'back', shoulders: 'shoulders', arms: 'biceps', abs: 'abs', glutes: 'glutes', thighs: 'quads', calves: 'calves' };

const TEMPLATES = {
  fullA: { title: 'Corpo todo A', focus: 'Pernas, peito e costas', parts: ['quads', 'chest', 'back', 'shoulders', 'hams', 'abs'] },
  fullB: { title: 'Corpo todo B', focus: 'Posteriores, costas e ombros', parts: ['hams', 'back', 'chest', 'glutes', 'triceps', 'biceps'] },
  fullC: { title: 'Corpo todo C', focus: 'Pernas, empurrar e puxar', parts: ['quads', 'back', 'shoulders', 'chest', 'calves', 'abs'] },
  upA: { title: 'Superiores A', focus: 'Peito, costas e braços', parts: ['chest', 'back', 'shoulders', 'chest', 'biceps', 'triceps'] },
  loA: { title: 'Inferiores A', focus: 'Quadríceps e glúteos', parts: ['quads', 'quads', 'hams', 'glutes', 'calves', 'abs'] },
  upB: { title: 'Superiores B', focus: 'Costas, ombros e braços', parts: ['back', 'chest', 'back', 'shoulders', 'triceps', 'biceps'] },
  loB: { title: 'Inferiores B', focus: 'Posteriores e glúteos', parts: ['hams', 'quads', 'glutes', 'hams', 'calves', 'abs'] },
  push: { title: 'Empurrar', focus: 'Peito, ombros e tríceps', parts: ['chest', 'chest', 'shoulders', 'shoulders', 'triceps', 'triceps'] },
  pull: { title: 'Puxar', focus: 'Costas e bíceps', parts: ['back', 'back', 'back', 'shoulders', 'biceps', 'biceps'] },
  legs: { title: 'Pernas', focus: 'Quadríceps, posteriores e glúteos', parts: ['quads', 'quads', 'hams', 'glutes', 'calves', 'abs'] },
};
const PLANS = {
  2: { name: 'Corpo todo', days: ['fullA', 'fullB'], schedule: ['A', 'rest', 'rest', 'B', 'rest', 'rest', 'rest'] },
  3: { name: 'Corpo todo', days: ['fullA', 'fullB', 'fullC'], schedule: ['A', 'rest', 'B', 'rest', 'C', 'rest', 'rest'] },
  4: { name: 'Superior / Inferior', days: ['upA', 'loA', 'upB', 'loB'], schedule: ['A', 'B', 'rest', 'C', 'D', 'rest', 'rest'] },
  5: { name: 'Superior / Inferior + Empurrar, Puxar, Pernas', days: ['upA', 'loA', 'push', 'pull', 'legs'], schedule: ['A', 'B', 'rest', 'C', 'D', 'E', 'rest'] },
  6: { name: 'Empurrar, Puxar, Pernas', days: ['push', 'pull', 'legs'], schedule: ['A', 'B', 'C', 'A', 'B', 'C', 'rest'] },
};

export function fallbackWorkout(p) {
  const nDays = Math.min(6, Math.max(2, Number(p.days_per_week) || 3));
  const lib = LIB[p.place] || LIB.gym;
  const plan = PLANS[nDays];
  const perSession = (Number(p.session_min) || 60) <= 45 ? 4 : (Number(p.session_min) || 60) >= 75 ? 6 : 5;
  const beginner = !p.experience || p.experience === 'none';
  const focusParts = (p.focus || []).map(f => FOCUS_TO[f]).filter(Boolean);
  const keys = 'ABCDEF';
  const days = plan.days.map((tk, di) => {
    const tpl = TEMPLATES[tk];
    let parts = tpl.parts.slice(0, perSession);
    // Prioridade: a parte pedida ganha um exercício a mais onde já cabe na sessão.
    for (const fp of focusParts) if (tpl.parts.includes(fp) && parts.length < perSession + 1) parts.push(fp);
    const used = {};
    const exercises = parts.map((part, i) => {
      const opts = lib[part] || lib.abs;
      const idx = (used[part] = (used[part] ?? (di % opts.length) - 1) + 1) % opts.length;
      const [key, name, muscle] = opts[idx];
      const compound = i < 2 && part !== 'abs';
      return {
        key, name, muscle,
        sets: beginner ? 3 : compound ? 4 : 3,
        reps: part === 'abs' ? (key === 'prancha' ? '30-45 s' : '12-15') : compound ? '6-10' : '10-12',
        rest_s: compound ? 120 : 75,
        cue: compound ? 'Desça controlando em 2 segundos e suba firme.' : 'Sem roubar: amplitude completa antes de subir carga.',
      };
    });
    const seen = new Set();
    return {
      key: keys[di], title: tpl.title, focus: tpl.focus, duration_min: Number(p.session_min) || 60,
      warmup: '5 min de bicicleta ou esteira leve e 2 séries leves do primeiro exercício.',
      exercises: exercises.filter(e => (seen.has(e.key) ? false : seen.add(e.key))),
      finisher: '',
    };
  });
  return {
    source: 'regras',
    split_name: plan.name,
    summary: `${nDays} treinos por semana em ${plan.name.toLowerCase()}, cada um com cerca de ${Number(p.session_min) || 60} minutos.`,
    schedule: plan.schedule,
    days,
    progression: 'Quando fechar todas as séries no topo da faixa de repetições, suba 2 a 5% da carga na semana seguinte.',
  };
}
