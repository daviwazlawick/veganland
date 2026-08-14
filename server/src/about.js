import { tr, LANGS, LANG_NAMES } from './web_i18n.js';

const NOVAQI_ICON = (size, ring = '#2FC472', tail = '#F4B53F') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="${size}" height="${size}">
    <circle cx="27.6" cy="27.6" r="18" stroke="${ring}" stroke-width="5.4" fill="none"/>
    <path d="M37.2 39.6 C44.4 43.2 49.2 49.2 50.4 54" stroke="${tail}" stroke-width="5.4" fill="none" stroke-linecap="round"/>
  </svg>`;

const NOVAQI_ICON_DARK = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
    <rect width="100" height="100" rx="22" fill="#0E1B14"/>
    <circle cx="46" cy="46" r="30" stroke="#16A75A" stroke-width="9" fill="none"/>
    <path d="M62 66 C74 72 82 82 84 90" stroke="#E8991C" stroke-width="9" fill="none" stroke-linecap="round"/>
  </svg>`;

const SVG_APPLE  = `<svg width="18" height="22" viewBox="0 0 814 1000" fill="currentColor"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.8 0 133.3 2.6 198.3 99zM554.1 158.4c22.4-26.9 38.3-64.2 38.3-101.6 0-5.2-.3-10.4-1.3-14.6-36.4 1.3-80 24.3-106.2 55.2-20.5 23.7-39.5 60.4-39.5 98.4 0 5.8.6 11.5 1 13.5 2.3.3 5.8.6 9.1.6 32.8 0 74.1-21.8 98.6-51.5z"/></svg>`;
const SVG_GOOGLE = `<svg width="18" height="20" viewBox="0 0 512 512" fill="none"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c17.1-9.8 17.1-26 .1-35.3l-1.3-.5zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" fill="currentColor"/></svg>`;
const SVG_CHECK  = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const BRANDS = {
  veganland: {
    name: 'VeganLand', primary: '#7CB518', dark: '#1C2B22', light: '#F0F7E6', accent: '#5A9A0A', navy: '#1C2B22',
    appUrl: 'https://veganland.app',
    privacyUrl: 'https://veganland.app/legal/privacy', termsUrl: 'https://veganland.app/legal/terms', supportUrl: 'https://veganland.app/support',
    iosUrl: null, androidUrl: null,
    headerLogo: `<span style="color:#fff;font-size:20px">🌱</span><span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:-0.4px;margin-left:8px">VeganLand</span>`,
    plans: [
      { id: 'starter', price: '€2.99', scans: '30', trial: true,  popular: true },
      { id: 'premium', price: '€5.99', scans: '100', trial: true },
    ],
  },
  novaqi: {
    name: 'NovaQI', primary: '#16A75A', dark: '#0E1B14', light: '#F6F3EB', accent: '#E8991C', navy: '#0E1B14',
    appUrl: 'https://novaqi.app',
    privacyUrl: 'https://novaqi.app/legal/privacy', termsUrl: 'https://novaqi.app/legal/terms', supportUrl: 'https://novaqi.app/support',
    iosUrl: 'https://apps.apple.com/us/app/novaqi-scan/id6775790620',
    androidUrl: 'https://play.google.com/store/apps/details?id=app.novaqi',
    headerLogo: `<span style="display:flex;align-items:center;gap:8px">${NOVAQI_ICON(28)}<span style="font-family:'Manrope',sans-serif;font-weight:800;font-size:20px;letter-spacing:-0.5px;color:#fff">Nova<span style="color:#2FC472">QI</span></span></span>`,
    plans: [
      { id: 'free',    price: '€0',    scans: '7',   trial: false, freeForever: true },
      { id: 'starter', price: '€2.99', scans: '30',  trial: true,  popular: true },
      { id: 'premium', price: '€5.99', scans: '100', trial: true },
    ],
  },
};

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

function langSwitcher(currentLang, path) {
  const links   = LANGS.map(l => `<a href="${path}?lang=${l}" class="ls-lnk${l === currentLang ? ' ls-act' : ''}">${LANG_NAMES[l]}</a>`).join('');
  const options = LANGS.map(l => `<option value="${path}?lang=${l}"${l === currentLang ? ' selected' : ''}>${LANG_NAMES[l]}</option>`).join('');
  return `<span class="ls-desk">${links}</span><select class="ls-mob" onchange="location.href=this.value">${options}</select>`;
}

function storeButtons(b, t, size = 'normal') {
  const p = size === 'large' ? 'padding:16px 28px;font-size:15px' : 'padding:13px 22px;font-size:14px';
  const apple = b.iosUrl
    ? `<a href="${b.iosUrl}" class="btn-dl btn-apple" style="${p}" onclick="if(window.fbq)fbq('track','Lead',{content_name:'app_store'})">${SVG_APPLE}<span><span class="dl-lbl">${t('about_dl_apple')}</span><span class="dl-nm">App Store</span></span></a>`
    : '';
  const google = b.androidUrl
    ? `<a href="${b.androidUrl}" class="btn-dl btn-google" style="${p}" onclick="if(window.fbq)fbq('track','Lead',{content_name:'google_play'})">${SVG_GOOGLE}<span><span class="dl-lbl">${t('about_dl_google')}</span><span class="dl-nm">Google Play</span></span></a>`
    : '';
  return `<div class="dl-btns">${apple}${google}</div>`;
}

// ─── per-language content not in web_i18n.js ───────────────────────────────
const L = {
  en: {
    hero_h1: 'Eat smarter.<br><em>Every single day.</em>',
    hero_sub: 'Scan any food label in seconds. Track calories, macros and workouts. Analyse full meals from a photo. NovaQI is the all-in-one food intelligence app powered by Claude AI.',
    hero_note: 'Free to try · No credit card · iOS & Android',

    trust_scans: 'Product scans',
    trust_allergens: 'Allergens tracked',
    trust_exercises: 'Exercises & sports',
    trust_langs: 'Languages',

    pill_scan: '📷 Ingredient scan',
    pill_macro: '📊 Macro tracking',
    pill_exercise: '🏃 Exercise log',
    pill_plate: '🍽️ Plate analysis',
    pill_halal: '☪️ Halal verified',
    pill_water: '💧 Hydration',

    s1_label: 'Ingredient check',
    s1_title: 'Know exactly what\'s in every product — in 3 seconds.',
    s1_body: 'Point your camera at any barcode or ingredient label. NovaQI reads the full list, cross-references your diet profile, and gives you an instant verdict: Safe, Caution, or Not Safe. No guessing. No reading tiny print.',
    s1_f1: 'Works on any barcode or text label',
    s1_f2: 'Flags allergens and hidden ingredients',
    s1_f3: 'Full explanation of every concern',
    s1_f4: 'Cached results — no wait for repeat scans',

    s2_label: 'Nutrition tracking',
    s2_title: 'Your complete nutrition picture, updated in real time.',
    s2_body: 'Log meals, track macros, monitor water and weight — all in a single daily dashboard. Set personalised goals based on your body profile. Get weekly and monthly reports to see your progress over time.',
    s2_f1: 'Calories, protein, carbs, fat, fibre, sugar, salt',
    s2_f2: 'Smart food search across 3M+ products',
    s2_f3: 'Hydration reminders at 09:00, 13:00 and 17:00',
    s2_f4: 'Weekly & monthly nutrition reports with charts',

    s3_label: 'Exercise & fitness',
    s3_title: 'Track workouts. See how food and fitness balance.',
    s3_body: '27 exercises with scientifically-calibrated calorie burn (MET values). Log any workout in seconds. See burned calories offset against consumed — so you always know your real daily balance.',
    s3_f1: 'Cardio, strength, sports, yoga and more',
    s3_f2: 'Real-time calorie burn preview before logging',
    s3_f3: 'Body measurements history (waist, hips, chest…)',
    s3_f4: '"Burn equivalent" shown on every scanned product',

    s4_label: 'Plate analysis',
    s4_title: 'Photograph your meal. Get the full breakdown.',
    s4_body: 'Take a photo of any prepared meal — at home, at a restaurant, at a buffet. Claude AI identifies every item, estimates portions, and gives you macros for the whole plate. Edit any item, then log it all with one tap.',
    s4_f1: 'Works on any meal, even home-cooked dishes',
    s4_f2: 'Edit items and portions before logging',
    s4_f3: 'Diet verdict per item (Safe / Caution / Not Safe)',
    s4_f4: 'Counts as one scan against your monthly plan',

    halal_label: 'Halal mode',
    halal_title: 'The most complete halal ingredient engine.',
    halal_body: 'NovaQI\'s halal mode goes beyond a simple keyword list. Every ingredient and E-code is checked against a dedicated halal ruleset — right on your device, instantly, with no data shared externally.',
    halal_f1: 'Every E-code classified: Halal, Mashbooh, or Not Halal',
    halal_f2: 'Per-ingredient reason shown for every flag',
    halal_f3: 'Strictness levels: Cautious or Moderate',
    halal_f4: '"Not Halal" verdict — never "Haram" (Apple compliant)',

    how_label: 'How it works',
    how_title: 'Up and running in under a minute.',
    step1_n: '1', step1_title: 'Set your profile', step1_body: 'Choose your diet (vegan, halal, gluten-free…) and select any food sensitivities. Takes 30 seconds.',
    step2_n: '2', step2_title: 'Scan a product',   step2_body: 'Point the camera at a barcode or ingredient list. The AI reads it instantly. No internet wait for cached products.',
    step3_n: '3', step3_title: 'Get your verdict', step3_body: 'Green = safe. Amber = check the details. Red = avoid. Full explanation included every time.',
    step4_n: '4', step4_title: 'Track your day',   step4_body: 'Log meals, water and workouts. The dashboard updates your calorie balance in real time.',

    diets_label: 'Dietary profiles',
    diets_title: 'Works for every lifestyle',
    diets_sub: 'Set your profile once. Every scan, every food search, and every analysis instantly adapts.',

    pricing_label: 'Pricing',
    pricing_title: 'Simple, transparent pricing',
    pricing_sub: 'Start free with 7 scans a month. Upgrade anytime — no hidden fees.',
    free_feat1: '7 scans per month',
    free_feat2: 'All diet profiles',
    free_feat3: 'Nutrition tracking',
    free_feat4: 'Exercise logging',
    starter_feat1: '30 scans per month',
    starter_feat2: 'Everything in Free',
    starter_feat3: 'Full nutrition reports',
    starter_feat4: 'Priority analysis',
    premium_feat1: '100 scans per month',
    premium_feat2: 'Everything in Starter',
    premium_feat3: 'Scan history (unlimited)',
    premium_feat4: 'Best value per scan',
    plan_free_name: 'Free',
    plan_forever: 'Forever free',
    plan_month: '/ month',
    plan_try: 'Try free',
    plan_start: 'Start free trial',
    plan_get: 'Get Premium',
    plan_legal: 'Subscriptions renew automatically. Cancel anytime in your account settings. Paid plans include a free trial — no charge until it ends.',

    faq_label: 'FAQ',
    faq_title: 'Common questions',
    faq: [
      ['Does it work without internet?', 'Barcode lookups for previously scanned products work offline. New product analyses and AI food search require a connection.'],
      ['What diets and allergies are supported?', 'Vegan, vegetarian, pescatarian, gluten-free, halal, and omnivore. Plus 22 food sensitivities including nuts, dairy, soy, shellfish, eggs, sesame, mustard, sulphites and more.'],
      ['Can I earn more scans without paying?', 'Yes. Refer friends with your unique code — you earn +30 bonus scans for every 3 friends who make their first scan. No limit.'],
      ['Is my food data private?', 'Your diet, allergies, and food logs are stored on our servers and never shared with Meta, Google, or any third party. Only anonymised event names are used for ad measurement.'],
      ['Does it work on Android and iPhone?', 'Yes — native app for both iOS and Android, plus a full web version at novaqi.app. All platforms stay in sync.'],
      ['What happens at the end of the free trial?', 'You\'re automatically moved to the Free plan (7 scans/month). No charge unless you chose to continue. Cancel anytime before the trial ends to avoid any billing.'],
    ],

    cta_title: 'Ready to eat smarter?',
    cta_sub: 'Join thousands of people who scan before they eat.',
    footer_note: 'AI-powered ingredient reading · For informational purposes only',
  },

  pt: {
    hero_h1: 'Come com mais inteligência.<br><em>Todos os dias.</em>',
    hero_sub: 'Escaneia qualquer rótulo em segundos. Faz tracking de calorias, macros e exercícios. Analisa refeições completas a partir de uma foto. O NovaQI é o app de inteligência alimentar tudo-em-um, powered by Claude AI.',
    hero_note: 'Grátis para experimentar · Sem cartão · iOS & Android',
    trust_scans: 'Scans de produtos', trust_allergens: 'Alergénios monitorizados', trust_exercises: 'Exercícios e desportos', trust_langs: 'Idiomas',
    pill_scan: '📷 Scan de ingredientes', pill_macro: '📊 Tracking de macros', pill_exercise: '🏃 Registo de exercício', pill_plate: '🍽️ Análise de prato', pill_halal: '☪️ Verificado halal', pill_water: '💧 Hidratação',
    s1_label: 'Verificação de ingredientes', s1_title: 'Saiba exatamente o que tem cada produto — em 3 segundos.',
    s1_body: 'Aponte a câmara para qualquer código de barras ou rótulo. O NovaQI lê a lista completa, cruza com o seu perfil alimentar e dá-lhe um veredicto imediato: Seguro, Atenção ou Evitar. Sem adivinhação. Sem ler letra miúda.',
    s1_f1: 'Funciona em qualquer código de barras ou rótulo', s1_f2: 'Sinaliza alergénios e ingredientes escondidos', s1_f3: 'Explicação completa de cada preocupação', s1_f4: 'Resultados em cache — sem espera em repetições',
    s2_label: 'Tracking de nutrição', s2_title: 'A sua nutrição completa, atualizada em tempo real.',
    s2_body: 'Registe refeições, acompanhe macros, monitore água e peso — tudo num único dashboard diário. Defina metas personalizadas com base no seu perfil corporal. Veja relatórios semanais e mensais para acompanhar a sua evolução.',
    s2_f1: 'Calorias, proteína, hidratos, gordura, fibra, açúcar, sal', s2_f2: 'Busca de alimentos em 3M+ produtos', s2_f3: 'Lembretes de hidratação às 09h, 13h e 17h', s2_f4: 'Relatórios semanais e mensais com gráficos',
    s3_label: 'Exercício e fitness', s3_title: 'Registe treinos. Veja o equilíbrio entre comida e fitness.',
    s3_body: '27 exercícios com queima calórica cientificamente calibrada (valores MET). Registe qualquer treino em segundos. Veja as calorias queimadas a compensar as consumidas — sabendo sempre o saldo real do dia.',
    s3_f1: 'Cardio, força, desportos, yoga e mais', s3_f2: 'Preview de queima calórica em tempo real antes de registar', s3_f3: 'Histórico de medidas corporais (cintura, anca, peito…)', s3_f4: '"Equivale a queimar" mostrado em cada produto scaneado',
    s4_label: 'Análise de prato', s4_title: 'Fotografe a sua refeição. Obtenha a análise completa.',
    s4_body: 'Tire uma foto de qualquer refeição — em casa, num restaurante, num buffet. A IA Claude identifica cada alimento, estima as porções e devolve os macros do prato completo. Edite o que quiser e registe tudo com um toque.',
    s4_f1: 'Funciona em qualquer refeição, incluindo pratos caseiros', s4_f2: 'Edite alimentos e porções antes de registar', s4_f3: 'Veredicto de dieta por item (Seguro / Atenção / Evitar)', s4_f4: 'Conta como um scan do plano mensal',
    halal_label: 'Modo halal', halal_title: 'O motor de ingredientes halal mais completo.',
    halal_body: 'O modo halal do NovaQI vai além de uma lista de palavras-chave. Cada ingrediente e código-E é verificado contra um ruleset halal dedicado — no próprio dispositivo, instantaneamente, sem dados partilhados externamente.',
    halal_f1: 'Cada código-E classificado: Halal, Mashbooh ou Não Halal', halal_f2: 'Motivo por ingrediente mostrado em cada flag', halal_f3: 'Níveis de rigor: Cauteloso ou Moderado', halal_f4: 'Veredicto "Not Halal" — nunca "Haram" (conforme Apple)',
    how_label: 'Como funciona', how_title: 'Pronto a usar em menos de um minuto.',
    step1_n:'1', step1_title:'Configure o seu perfil', step1_body:'Escolha a sua dieta (vegan, halal, sem glúten…) e selecione as sensibilidades alimentares. Demora 30 segundos.',
    step2_n:'2', step2_title:'Escanear um produto', step2_body:'Aponte a câmara para um código de barras ou rótulo. A IA lê instantaneamente. Sem espera para produtos já scaneados.',
    step3_n:'3', step3_title:'Obtenha o veredicto', step3_body:'Verde = seguro. Âmbar = verifique os detalhes. Vermelho = evitar. Explicação completa incluída sempre.',
    step4_n:'4', step4_title:'Acompanhe o seu dia', step4_body:'Registe refeições, água e treinos. O dashboard atualiza o saldo calórico em tempo real.',
    diets_label:'Perfis de dieta', diets_title:'Funciona para todos os estilos de vida', diets_sub:'Configure o perfil uma vez. Cada scan, pesquisa e análise adapta-se instantaneamente.',
    pricing_label:'Preços', pricing_title:'Preços simples e transparentes', pricing_sub:'Comece grátis com 7 scans por mês. Mude a qualquer momento — sem taxas escondidas.',
    free_feat1:'7 scans por mês', free_feat2:'Todos os perfis de dieta', free_feat3:'Tracking de nutrição', free_feat4:'Registo de exercícios',
    starter_feat1:'30 scans por mês', starter_feat2:'Tudo do plano Grátis', starter_feat3:'Relatórios de nutrição completos', starter_feat4:'Análise prioritária',
    premium_feat1:'100 scans por mês', premium_feat2:'Tudo do Starter', premium_feat3:'Histórico de scans (ilimitado)', premium_feat4:'Melhor custo por scan',
    plan_free_name:'Grátis', plan_forever:'Para sempre grátis', plan_month:'/mês', plan_try:'Experimentar grátis', plan_start:'Iniciar trial', plan_get:'Obter Premium',
    plan_legal:'As subscrições renovam automaticamente. Cancele a qualquer momento nas definições da conta. Os planos pagos incluem trial gratuito — sem cobrança até o trial terminar.',
    faq_label:'FAQ', faq_title:'Perguntas frequentes',
    faq: [
      ['Funciona sem internet?','A pesquisa por código de barras para produtos já scaneados funciona offline. Novas análises e busca de alimentos com IA requerem ligação.'],
      ['Que dietas e alergias são suportadas?','Vegan, vegetariano, pescatariano, sem glúten, halal e omnívoro. Mais 22 sensibilidades alimentares incluindo frutos secos, laticínios, soja, mariscos, ovos, sésamo, mostarda, sulfitos e mais.'],
      ['Posso ganhar mais scans sem pagar?','Sim. Indique amigos com o seu código único — ganha +30 scans bónus a cada 3 amigos que façam o primeiro scan. Sem limite.'],
      ['Os meus dados alimentares são privados?','A sua dieta, alergias e registo alimentar estão nos nossos servidores e nunca são partilhados com o Meta, Google ou terceiros.'],
      ['Funciona em Android e iPhone?','Sim — app nativo para iOS e Android, mais versão web completa em novaqi.app.'],
      ['O que acontece no fim do trial?','Fica automaticamente no plano Grátis (7 scans/mês). Sem cobrança. Cancele antes do fim do trial para evitar qualquer débito.'],
    ],
    cta_title:'Pronto para comer com mais inteligência?', cta_sub:'Junte-se a milhares de pessoas que escaneiam antes de comer.',
    footer_note:'Leitura de ingredientes por IA · Apenas para fins informativos',
  },

  de: {
    hero_h1: 'Essen Sie intelligenter.<br><em>Jeden Tag.</em>',
    hero_sub: 'Scannen Sie jedes Produktetikett in Sekunden. Tracken Sie Kalorien, Makros und Training. Analysieren Sie komplette Mahlzeiten per Foto. NovaQI ist die All-in-One Ernährungs-App powered by Claude AI.',
    hero_note: 'Kostenlos testen · Keine Kreditkarte · iOS & Android',
    trust_scans:'Produkt-Scans', trust_allergens:'Allergene getrackt', trust_exercises:'Übungen & Sportarten', trust_langs:'Sprachen',
    pill_scan:'📷 Zutaten-Scan', pill_macro:'📊 Makro-Tracking', pill_exercise:'🏃 Trainingslog', pill_plate:'🍽️ Mahlzeit-Analyse', pill_halal:'☪️ Halal-geprüft', pill_water:'💧 Hydration',
    s1_label:'Zutaten-Check', s1_title:'Wissen Sie genau, was in jedem Produkt steckt — in 3 Sekunden.',
    s1_body:'Kamera auf Barcode oder Etikett richten. NovaQI liest die vollständige Liste, gleicht sie mit Ihrem Profil ab und gibt ein sofortiges Urteil: Sicher, Vorsicht oder Nicht geeignet.',
    s1_f1:'Funktioniert mit Barcode oder Textetikett', s1_f2:'Erkennt Allergene und versteckte Zutaten', s1_f3:'Vollständige Erklärung jeder Auffälligkeit', s1_f4:'Cache-Ergebnisse — keine Wartezeit bei Wiederholung',
    s2_label:'Ernährungs-Tracking', s2_title:'Ihr vollständiges Ernährungsbild — in Echtzeit aktualisiert.',
    s2_body:'Mahlzeiten erfassen, Makros verfolgen, Wasser und Gewicht überwachen — alles in einem täglichen Dashboard. Personalisierte Ziele basierend auf Ihrem Körperprofil.',
    s2_f1:'Kalorien, Eiweiß, Kohlenhydrate, Fett, Ballaststoffe, Zucker, Salz', s2_f2:'Intelligente Lebensmittelsuche in 3M+ Produkten', s2_f3:'Hydrations-Erinnerungen um 09:00, 13:00 und 17:00 Uhr', s2_f4:'Wochen- und Monatsberichte mit Diagrammen',
    s3_label:'Sport & Fitness', s3_title:'Training tracken. Ernährung und Fitness im Gleichgewicht sehen.',
    s3_body:'27 Übungen mit wissenschaftlich kalibrierten Kalorienverbrennung (MET-Werte). Training in Sekunden erfassen. Verbrannte Kalorien mit aufgenommenen verrechnen — immer den echten Tagesbedarf kennen.',
    s3_f1:'Cardio, Kraft, Sport, Yoga und mehr', s3_f2:'Echtzeit-Vorschau der Kalorienverbrennung', s3_f3:'Körpermaß-Verlauf (Taille, Hüfte, Brust…)', s3_f4:'"Verbrennen-Äquivalent" bei jedem gescannten Produkt',
    s4_label:'Mahlzeit-Analyse', s4_title:'Mahlzeit fotografieren. Vollständige Analyse erhalten.',
    s4_body:'Foto von einer Mahlzeit machen — zu Hause, im Restaurant, am Buffet. KI identifiziert jedes Lebensmittel, schätzt Portionen und liefert Makros für den gesamten Teller.',
    s4_f1:'Funktioniert bei jeder Mahlzeit, auch selbst gekochten', s4_f2:'Lebensmittel und Portionen vor dem Speichern bearbeiten', s4_f3:'Diäturteil pro Lebensmittel (Sicher / Vorsicht / Nicht geeignet)', s4_f4:'Zählt als ein Scan Ihres Monatsplans',
    halal_label:'Halal-Modus', halal_title:'Die vollständigste Halal-Zutaten-Engine.',
    halal_body:'NovaQIs Halal-Modus geht über eine einfache Schlüsselwortliste hinaus. Jede Zutat und jeder E-Code wird gegen ein dediziertes Halal-Regelwerk geprüft — direkt auf dem Gerät.',
    halal_f1:'Jeder E-Code klassifiziert: Halal, Mashbooh oder Nicht Halal', halal_f2:'Grund pro Zutat bei jeder Markierung', halal_f3:'Strenge-Level: Vorsichtig oder Moderat', halal_f4:'"Not Halal" Urteil — nie "Haram" (Apple-konform)',
    how_label:'So funktioniert es', how_title:'In unter einer Minute startklar.',
    step1_n:'1', step1_title:'Profil einrichten', step1_body:'Diät wählen (vegan, halal, glutenfrei…) und Unverträglichkeiten auswählen. Dauert 30 Sekunden.',
    step2_n:'2', step2_title:'Produkt scannen', step2_body:'Kamera auf Barcode oder Etikett richten. KI liest sofort. Keine Wartezeit für gecachte Produkte.',
    step3_n:'3', step3_title:'Urteil erhalten', step3_body:'Grün = sicher. Amber = Details prüfen. Rot = vermeiden. Immer mit vollständiger Erklärung.',
    step4_n:'4', step4_title:'Tag verfolgen', step4_body:'Mahlzeiten, Wasser und Training erfassen. Dashboard aktualisiert Kalorienbalance in Echtzeit.',
    diets_label:'Ernährungsprofile', diets_title:'Für jeden Lebensstil', diets_sub:'Profil einmal einrichten. Jeder Scan und jede Analyse passt sich sofort an.',
    pricing_label:'Preise', pricing_title:'Einfache, transparente Preise', pricing_sub:'Kostenlos mit 7 Scans pro Monat starten. Jederzeit upgraden — keine versteckten Kosten.',
    free_feat1:'7 Scans pro Monat', free_feat2:'Alle Diätprofile', free_feat3:'Ernährungs-Tracking', free_feat4:'Trainingsprotokoll',
    starter_feat1:'30 Scans pro Monat', starter_feat2:'Alles aus Free', starter_feat3:'Vollständige Ernährungsberichte', starter_feat4:'Prioritäts-Analyse',
    premium_feat1:'100 Scans pro Monat', premium_feat2:'Alles aus Starter', premium_feat3:'Scan-Verlauf (unbegrenzt)', premium_feat4:'Bestes Preis-Leistungs-Verhältnis',
    plan_free_name:'Kostenlos', plan_forever:'Dauerhaft kostenlos', plan_month:'/Monat', plan_try:'Kostenlos testen', plan_start:'Trial starten', plan_get:'Premium holen',
    plan_legal:'Abonnements verlängern sich automatisch. Jederzeit kündigen. Bezahlte Pläne beinhalten einen kostenlosen Testzeitraum — keine Belastung bis dieser endet.',
    faq_label:'FAQ', faq_title:'Häufige Fragen',
    faq: [
      ['Funktioniert es ohne Internet?','Barcode-Suchen für bereits gescannte Produkte funktionieren offline. Neue Analysen und KI-Lebensmittelsuche benötigen eine Verbindung.'],
      ['Welche Diäten und Allergien werden unterstützt?','Vegan, vegetarisch, pescatarisch, glutenfrei, halal und omnivor. Plus 22 Unverträglichkeiten.'],
      ['Kann ich mehr Scans ohne Bezahlen verdienen?','Ja. Freunde empfehlen und +30 Bonus-Scans pro 3 qualifizierende Freunde verdienen. Kein Limit.'],
      ['Sind meine Ernährungsdaten privat?','Ihre Diät, Allergien und Ernährungsprotokolle werden sicher auf unseren Servern gespeichert und nicht geteilt.'],
      ['Funktioniert es auf Android und iPhone?','Ja — native App für iOS und Android, plus vollständige Web-Version unter novaqi.app.'],
      ['Was passiert nach dem Testzeitraum?','Sie wechseln automatisch in den kostenlosen Plan (7 Scans/Monat). Keine Belastung. Jederzeit vor Ablauf kündigen.'],
    ],
    cta_title:'Bereit, intelligenter zu essen?', cta_sub:'Schließen Sie sich Tausenden an, die vor dem Essen scannen.',
    footer_note:'KI-gestützte Zutatenanalyse · Nur zu Informationszwecken',
  },

  fr: {
    hero_h1: 'Mangez plus intelligemment.<br><em>Chaque jour.</em>',
    hero_sub: "Scannez n'importe quelle étiquette en secondes. Suivez calories, macros et entraînements. Analysez vos repas depuis une photo. NovaQI est l'app d'intelligence alimentaire tout-en-un, powered by Claude AI.",
    hero_note: 'Gratuit à tester · Sans carte bancaire · iOS & Android',
    trust_scans:'Scans de produits', trust_allergens:'Allergènes suivis', trust_exercises:'Exercices et sports', trust_langs:'Langues',
    pill_scan:'📷 Scan ingrédients', pill_macro:'📊 Suivi macros', pill_exercise:'🏃 Journal sport', pill_plate:"🍽️ Analyse d'assiette", pill_halal:'☪️ Certifié halal', pill_water:'💧 Hydratation',
    s1_label:'Vérification ingrédients', s1_title:'Sachez exactement ce que contient chaque produit — en 3 secondes.',
    s1_body:"Pointez votre caméra sur un code-barres ou une étiquette. NovaQI lit la liste complète, la croise avec votre profil alimentaire et vous donne un verdict immédiat : Sûr, Attention ou À éviter.",
    s1_f1:"Fonctionne sur tout code-barres ou étiquette texte", s1_f2:"Signale allergènes et ingrédients cachés", s1_f3:"Explication complète de chaque problème", s1_f4:"Résultats en cache — pas d'attente pour les rescans",
    s2_label:'Suivi nutritionnel', s2_title:'Votre tableau nutritionnel complet, mis à jour en temps réel.',
    s2_body:'Enregistrez vos repas, suivez vos macros, surveillez eau et poids — dans un tableau de bord quotidien. Objectifs personnalisés selon votre profil corporel.',
    s2_f1:'Calories, protéines, glucides, lipides, fibres, sucre, sel', s2_f2:'Recherche intelligente sur 3M+ produits', s2_f3:'Rappels hydratation à 09h, 13h et 17h', s2_f4:'Rapports hebdomadaires et mensuels avec graphiques',
    s3_label:'Sport & fitness', s3_title:'Trackez vos entraînements. Équilibrez alimentation et fitness.',
    s3_body:'27 exercices avec calories brûlées scientifiquement calibrées (valeurs MET). Enregistrez tout entraînement en secondes. Calories brûlées compensées contre consommées — solde journalier toujours clair.',
    s3_f1:'Cardio, musculation, sports, yoga et plus', s3_f2:"Aperçu calories brûlées en temps réel", s3_f3:'Historique mensurations (taille, hanches, poitrine…)', s3_f4:'"Équivalent à brûler" affiché sur chaque produit scanné',
    s4_label:"Analyse d'assiette", s4_title:'Photographiez votre repas. Obtenez l\'analyse complète.',
    s4_body:"Prenez une photo de n'importe quel repas — chez vous, au restaurant, au buffet. L'IA identifie chaque aliment, estime les portions et vous donne les macros de toute l'assiette.",
    s4_f1:"Fonctionne pour tout repas, même fait maison", s4_f2:'Modifiez aliments et portions avant de sauvegarder', s4_f3:'Verdict alimentaire par item (Sûr / Attention / À éviter)', s4_f4:"Compte comme un scan de votre plan mensuel",
    halal_label:'Mode halal', halal_title:"Le moteur d'ingrédients halal le plus complet.",
    halal_body:"Le mode halal de NovaQI va au-delà d'une simple liste de mots-clés. Chaque ingrédient et code-E est vérifié contre un ensemble de règles halal dédié — directement sur votre appareil.",
    halal_f1:'Chaque code-E classé : Halal, Mashbooh ou Non Halal', halal_f2:'Raison par ingrédient affichée pour chaque signal', halal_f3:'Niveaux de rigueur : Prudent ou Modéré', halal_f4:'"Not Halal" — jamais "Haram" (conforme Apple)',
    how_label:'Comment ça marche', how_title:'Prêt en moins d\'une minute.',
    step1_n:'1', step1_title:'Configurer votre profil', step1_body:'Choisissez votre régime (vegan, halal, sans gluten…) et sélectionnez vos sensibilités alimentaires. 30 secondes.',
    step2_n:'2', step2_title:'Scanner un produit', step2_body:"Pointez la caméra sur un code-barres ou étiquette. L'IA lit instantanément. Pas d'attente pour les produits en cache.",
    step3_n:'3', step3_title:'Voir le verdict', step3_body:'Vert = sûr. Ambre = vérifiez les détails. Rouge = éviter. Explication complète à chaque fois.',
    step4_n:'4', step4_title:'Suivre votre journée', step4_body:'Enregistrez repas, eau et entraînements. Le tableau de bord met à jour le solde calorique en temps réel.',
    diets_label:'Profils alimentaires', diets_title:'Pour tous les modes de vie', diets_sub:'Configurez votre profil une fois. Chaque scan et analyse s\'adapte instantanément.',
    pricing_label:'Tarifs', pricing_title:'Tarifs simples et transparents', pricing_sub:'Démarrez gratuitement avec 7 scans par mois. Passez à la version supérieure à tout moment.',
    free_feat1:'7 scans par mois', free_feat2:'Tous les profils alimentaires', free_feat3:'Suivi nutritionnel', free_feat4:"Journal d'entraînement",
    starter_feat1:'30 scans par mois', starter_feat2:'Tout du plan Gratuit', starter_feat3:'Rapports nutritionnels complets', starter_feat4:'Analyse prioritaire',
    premium_feat1:'100 scans par mois', premium_feat2:'Tout du Starter', premium_feat3:'Historique scans (illimité)', premium_feat4:'Meilleur rapport qualité-prix',
    plan_free_name:'Gratuit', plan_forever:'Gratuit pour toujours', plan_month:'/mois', plan_try:'Essayer gratuitement', plan_start:"Démarrer l'essai", plan_get:'Obtenir Premium',
    plan_legal:"Les abonnements se renouvellent automatiquement. Annulez à tout moment. Les plans payants incluent un essai gratuit — aucun débit jusqu'à la fin.",
    faq_label:'FAQ', faq_title:'Questions fréquentes',
    faq: [
      ["Fonctionne-t-il sans internet ?","La recherche par code-barres pour les produits déjà scannés fonctionne hors ligne. Les nouvelles analyses nécessitent une connexion."],
      ["Quels régimes et allergies sont supportés ?","Vegan, végétarien, pescatarien, sans gluten, halal et omnivore. Plus 22 sensibilités alimentaires."],
      ["Puis-je gagner plus de scans sans payer ?","Oui. Parrainez des amis avec votre code unique — gagnez +30 scans bonus par tranche de 3 amis qualifiés."],
      ["Mes données alimentaires sont-elles privées ?","Votre régime, allergies et journal alimentaire sont stockés sur nos serveurs et jamais partagés."],
      ["Fonctionne-t-il sur Android et iPhone ?","Oui — app native pour iOS et Android, plus version web complète sur novaqi.app."],
      ["Que se passe-t-il à la fin de l'essai ?","Vous passez automatiquement au plan Gratuit (7 scans/mois). Sans débit. Annulez avant la fin pour éviter tout paiement."],
    ],
    cta_title:'Prêt à manger plus intelligemment ?', cta_sub:'Rejoignez des milliers de personnes qui scannent avant de manger.',
    footer_note:"Lecture d'ingrédients par IA · À titre informatif uniquement",
  },

  it: {
    hero_h1: 'Mangia in modo più intelligente.<br><em>Ogni giorno.</em>',
    hero_sub: 'Scansiona qualsiasi etichetta in secondi. Traccia calorie, macros e allenamenti. Analizza pasti completi da una foto. NovaQI è l\'app di intelligenza alimentare all-in-one, powered by Claude AI.',
    hero_note: 'Gratis da provare · Nessuna carta · iOS & Android',
    trust_scans:'Scansioni prodotti', trust_allergens:'Allergeni tracciati', trust_exercises:'Esercizi e sport', trust_langs:'Lingue',
    pill_scan:'📷 Scan ingredienti', pill_macro:'📊 Tracking macros', pill_exercise:'🏃 Diario sport', pill_plate:"🍽️ Analisi piatto", pill_halal:'☪️ Verificato halal', pill_water:'💧 Idratazione',
    s1_label:'Verifica ingredienti', s1_title:'Sai esattamente cosa c\'è in ogni prodotto — in 3 secondi.',
    s1_body:'Punta la fotocamera su qualsiasi codice a barre o etichetta. NovaQI legge la lista completa, la incrocia con il tuo profilo e ti dà un verdetto immediato: Sicuro, Attenzione o Da evitare.',
    s1_f1:'Funziona su qualsiasi codice a barre o etichetta', s1_f2:'Segnala allergeni e ingredienti nascosti', s1_f3:'Spiegazione completa di ogni problema', s1_f4:'Risultati in cache — nessuna attesa per i prodotti già scansionati',
    s2_label:'Tracking nutrizionale', s2_title:'Il tuo quadro nutrizionale completo, aggiornato in tempo reale.',
    s2_body:'Registra pasti, traccia macros, monitora acqua e peso — tutto in un unico dashboard giornaliero. Obiettivi personalizzati in base al tuo profilo corporeo.',
    s2_f1:'Calorie, proteine, carboidrati, grassi, fibre, zucchero, sale', s2_f2:'Ricerca intelligente su 3M+ prodotti', s2_f3:'Promemoria idratazione alle 09:00, 13:00 e 17:00', s2_f4:'Report settimanali e mensili con grafici',
    s3_label:'Sport & fitness', s3_title:'Traccia gli allenamenti. Vedi l\'equilibrio tra cibo e fitness.',
    s3_body:'27 esercizi con calorie bruciate calibrate scientificamente (valori MET). Registra qualsiasi allenamento in secondi. Calorie bruciate compensate con quelle consumate — saldo giornaliero sempre chiaro.',
    s3_f1:'Cardio, forza, sport, yoga e altro', s3_f2:'Anteprima calorie bruciate in tempo reale', s3_f3:'Cronologia misure corporee (vita, fianchi, petto…)', s3_f4:'"Equivalente di bruciare" mostrato su ogni prodotto scansionato',
    s4_label:'Analisi piatto', s4_title:'Fotografa il tuo pasto. Ottieni l\'analisi completa.',
    s4_body:'Scatta una foto di qualsiasi pasto — a casa, al ristorante, al buffet. L\'IA identifica ogni alimento, stima le porzioni e fornisce i macros per l\'intero piatto.',
    s4_f1:'Funziona per qualsiasi pasto, anche fatto in casa', s4_f2:'Modifica alimenti e porzioni prima di salvare', s4_f3:'Verdetto dieta per voce (Sicuro / Attenzione / Da evitare)', s4_f4:'Conta come una scansione del tuo piano mensile',
    halal_label:'Modalità halal', halal_title:"Il motore di ingredienti halal più completo.",
    halal_body:"La modalità halal di NovaQI va oltre una semplice lista di parole chiave. Ogni ingrediente e codice-E viene verificato contro un set di regole halal dedicato — direttamente sul dispositivo.",
    halal_f1:'Ogni codice-E classificato: Halal, Mashbooh o Non Halal', halal_f2:'Motivo per ingrediente mostrato per ogni segnalazione', halal_f3:'Livelli di rigore: Prudente o Moderato', halal_f4:'"Not Halal" — mai "Haram" (conforme Apple)',
    how_label:'Come funziona', how_title:'Pronto in meno di un minuto.',
    step1_n:'1', step1_title:'Configura il tuo profilo', step1_body:'Scegli la tua dieta (vegan, halal, senza glutine…) e seleziona le sensibilità alimentari. 30 secondi.',
    step2_n:'2', step2_title:'Scansiona un prodotto', step2_body:"Punta la fotocamera su codice a barre o etichetta. L'IA legge istantaneamente.",
    step3_n:'3', step3_title:'Vedi il verdetto', step3_body:'Verde = sicuro. Ambra = controlla i dettagli. Rosso = evita. Spiegazione completa ogni volta.',
    step4_n:'4', step4_title:'Monitora la giornata', step4_body:'Registra pasti, acqua e allenamenti. Il dashboard aggiorna il saldo calorico in tempo reale.',
    diets_label:'Profili dietetici', diets_title:'Per ogni stile di vita', diets_sub:'Configura il profilo una volta. Ogni scansione e analisi si adatta istantaneamente.',
    pricing_label:'Prezzi', pricing_title:'Prezzi semplici e trasparenti', pricing_sub:'Inizia gratis con 7 scansioni al mese. Aggiorna quando vuoi.',
    free_feat1:'7 scansioni al mese', free_feat2:'Tutti i profili dietetici', free_feat3:'Tracking nutrizionale', free_feat4:'Diario allenamenti',
    starter_feat1:'30 scansioni al mese', starter_feat2:'Tutto di Free', starter_feat3:'Report nutrizionali completi', starter_feat4:'Analisi prioritaria',
    premium_feat1:'100 scansioni al mese', premium_feat2:'Tutto di Starter', premium_feat3:'Cronologia scansioni (illimitata)', premium_feat4:'Miglior rapporto qualità-prezzo',
    plan_free_name:'Gratuito', plan_forever:'Gratis per sempre', plan_month:'/mese', plan_try:'Prova gratis', plan_start:"Avvia la prova", plan_get:'Ottieni Premium',
    plan_legal:"Gli abbonamenti si rinnovano automaticamente. Cancella in qualsiasi momento. I piani a pagamento includono una prova gratuita — nessun addebito fino alla fine.",
    faq_label:'FAQ', faq_title:'Domande frequenti',
    faq: [
      ["Funziona senza internet?","La ricerca per codice a barre per prodotti già scansionati funziona offline. Le nuove analisi richiedono connessione."],
      ["Quali diete e allergie sono supportate?","Vegan, vegetariana, pescatariana, senza glutine, halal e onnivora. Più 22 sensibilità alimentari."],
      ["Posso guadagnare più scansioni senza pagare?","Sì. Invita amici con il tuo codice unico — guadagni +30 scansioni bonus ogni 3 amici qualificati."],
      ["I miei dati alimentari sono privati?","La tua dieta, allergie e diario alimentare sono sui nostri server e mai condivisi con terze parti."],
      ["Funziona su Android e iPhone?","Sì — app nativa per iOS e Android, più versione web completa su novaqi.app."],
      ["Cosa succede alla fine della prova?","Passi automaticamente al piano Gratuito (7 scansioni/mese). Nessun addebito. Cancella prima della fine per evitare qualsiasi pagamento."],
    ],
    cta_title:'Pronto a mangiare in modo più intelligente?', cta_sub:'Unisciti a migliaia di persone che scansionano prima di mangiare.',
    footer_note:'Lettura ingredienti con IA · Solo a scopo informativo',
  },

  es: {
    hero_h1: 'Come de forma más inteligente.<br><em>Cada día.</em>',
    hero_sub: 'Escanea cualquier etiqueta en segundos. Rastrea calorías, macros y entrenamientos. Analiza comidas completas desde una foto. NovaQI es la app de inteligencia alimentaria todo-en-uno, powered by Claude AI.',
    hero_note: 'Gratis para probar · Sin tarjeta · iOS & Android',
    trust_scans:'Escaneos de productos', trust_allergens:'Alérgenos rastreados', trust_exercises:'Ejercicios y deportes', trust_langs:'Idiomas',
    pill_scan:'📷 Scan ingredientes', pill_macro:'📊 Seguimiento macros', pill_exercise:'🏃 Diario ejercicio', pill_plate:'🍽️ Análisis de plato', pill_halal:'☪️ Verificado halal', pill_water:'💧 Hidratación',
    s1_label:'Verificación de ingredientes', s1_title:'Sabe exactamente qué hay en cada producto — en 3 segundos.',
    s1_body:'Apunta tu cámara a cualquier código de barras o etiqueta. NovaQI lee la lista completa, la cruza con tu perfil alimentario y te da un veredicto inmediato: Seguro, Atención o Evitar.',
    s1_f1:'Funciona en cualquier código de barras o etiqueta', s1_f2:'Detecta alérgenos e ingredientes ocultos', s1_f3:'Explicación completa de cada problema', s1_f4:'Resultados en caché — sin espera para repetir escaneos',
    s2_label:'Seguimiento nutricional', s2_title:'Tu cuadro nutricional completo, actualizado en tiempo real.',
    s2_body:'Registra comidas, rastrea macros, monitorea agua y peso — todo en un único panel diario. Objetivos personalizados según tu perfil corporal.',
    s2_f1:'Calorías, proteínas, carbohidratos, grasas, fibra, azúcar, sal', s2_f2:'Búsqueda inteligente en 3M+ productos', s2_f3:'Recordatorios de hidratación a las 09:00, 13:00 y 17:00', s2_f4:'Informes semanales y mensuales con gráficos',
    s3_label:'Ejercicio y fitness', s3_title:'Rastrea entrenamientos. Ve el equilibrio entre comida y fitness.',
    s3_body:'27 ejercicios con quema calórica científicamente calibrada (valores MET). Registra cualquier entrenamiento en segundos. Calorías quemadas compensadas con las consumidas — siempre conoce tu balance real.',
    s3_f1:'Cardio, fuerza, deportes, yoga y más', s3_f2:'Vista previa de calorías quemadas en tiempo real', s3_f3:'Historial de medidas corporales (cintura, caderas, pecho…)', s3_f4:'"Equivalente a quemar" mostrado en cada producto escaneado',
    s4_label:'Análisis de plato', s4_title:'Fotografía tu comida. Obtén el análisis completo.',
    s4_body:'Toma una foto de cualquier comida — en casa, en un restaurante, en un bufé. La IA identifica cada alimento, estima las porciones y te da los macros de todo el plato.',
    s4_f1:'Funciona para cualquier comida, incluso casera', s4_f2:'Edita alimentos y porciones antes de guardar', s4_f3:'Veredicto de dieta por elemento (Seguro / Atención / Evitar)', s4_f4:'Cuenta como un escaneo de tu plan mensual',
    halal_label:'Modo halal', halal_title:'El motor de ingredientes halal más completo.',
    halal_body:'El modo halal de NovaQI va más allá de una simple lista de palabras clave. Cada ingrediente y código-E se verifica contra un conjunto de reglas halal dedicado — directamente en tu dispositivo.',
    halal_f1:'Cada código-E clasificado: Halal, Mashbooh o No Halal', halal_f2:'Motivo por ingrediente mostrado en cada señal', halal_f3:'Niveles de rigor: Cauteloso o Moderado', halal_f4:'"Not Halal" — nunca "Haram" (conforme Apple)',
    how_label:'Cómo funciona', how_title:'Listo en menos de un minuto.',
    step1_n:'1', step1_title:'Configura tu perfil', step1_body:'Elige tu dieta (vegana, halal, sin gluten…) y selecciona tus sensibilidades. 30 segundos.',
    step2_n:'2', step2_title:'Escanea un producto', step2_body:'Apunta la cámara a un código de barras o etiqueta. La IA lee al instante.',
    step3_n:'3', step3_title:'Obtén tu veredicto', step3_body:'Verde = seguro. Ámbar = revisa los detalles. Rojo = evitar. Explicación completa siempre.',
    step4_n:'4', step4_title:'Sigue tu día', step4_body:'Registra comidas, agua y entrenamientos. El panel actualiza el balance calórico en tiempo real.',
    diets_label:'Perfiles de dieta', diets_title:'Para cada estilo de vida', diets_sub:'Configura tu perfil una vez. Cada escaneo y análisis se adapta al instante.',
    pricing_label:'Precios', pricing_title:'Precios simples y transparentes', pricing_sub:'Empieza gratis con 7 escaneos al mes. Mejora cuando quieras.',
    free_feat1:'7 escaneos al mes', free_feat2:'Todos los perfiles de dieta', free_feat3:'Seguimiento nutricional', free_feat4:'Registro de ejercicios',
    starter_feat1:'30 escaneos al mes', starter_feat2:'Todo de Free', starter_feat3:'Informes nutricionales completos', starter_feat4:'Análisis prioritario',
    premium_feat1:'100 escaneos al mes', premium_feat2:'Todo de Starter', premium_feat3:'Historial de escaneos (ilimitado)', premium_feat4:'Mejor relación calidad-precio',
    plan_free_name:'Gratis', plan_forever:'Gratis para siempre', plan_month:'/mes', plan_try:'Probar gratis', plan_start:'Iniciar prueba', plan_get:'Obtener Premium',
    plan_legal:'Las suscripciones se renuevan automáticamente. Cancela en cualquier momento. Los planes de pago incluyen prueba gratuita — sin cargo hasta que termine.',
    faq_label:'FAQ', faq_title:'Preguntas frecuentes',
    faq: [
      ['¿Funciona sin internet?','La búsqueda por código de barras para productos ya escaneados funciona sin conexión. Los nuevos análisis requieren conexión.'],
      ['¿Qué dietas y alergias son compatibles?','Vegana, vegetariana, pescatariana, sin gluten, halal y omnívora. Más 22 sensibilidades alimentarias.'],
      ['¿Puedo ganar más escaneos sin pagar?','Sí. Refiere amigos con tu código único — ganas +30 escaneos de bonificación por cada 3 amigos calificados.'],
      ['¿Son privados mis datos alimentarios?','Tu dieta, alergias y diario alimentario están en nuestros servidores y nunca se comparten con terceros.'],
      ['¿Funciona en Android e iPhone?','Sí — app nativa para iOS y Android, más versión web completa en novaqi.app.'],
      ['¿Qué pasa al final de la prueba?','Pasas automáticamente al plan Gratis (7 escaneos/mes). Sin cargo. Cancela antes del final para evitar cualquier cobro.'],
    ],
    cta_title:'¿Listo para comer de forma más inteligente?', cta_sub:'Únete a miles de personas que escanean antes de comer.',
    footer_note:'Lectura de ingredientes con IA · Solo con fines informativos',
  },
};

function l(lang, key) {
  return (L[lang]?.[key]) ?? (L.en[key] ?? key);
}

function featCheck(b, text) {
  return `<li style="display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#444;line-height:1.5;margin-bottom:10px"><span style="color:${b.primary};margin-top:2px;flex-shrink:0">${SVG_CHECK}</span>${text}</li>`;
}

function featureRow(b, lang, side, icon, label, title, body, checks) {
  const img = `<div style="background:${b.dark};border-radius:24px;width:100%;max-width:360px;aspect-ratio:9/16;max-height:320px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <div style="text-align:center;opacity:.85">
      <div style="font-size:72px;line-height:1">${icon}</div>
    </div>
  </div>`;
  const text = `<div style="flex:1;min-width:240px">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px">${label}</div>
    <h2 style="font-size:clamp(20px,3vw,28px);font-weight:900;color:${b.dark};letter-spacing:-0.6px;line-height:1.2;margin-bottom:14px">${title}</h2>
    <p style="font-size:15px;color:#555;line-height:1.7;margin-bottom:22px">${body}</p>
    <ul style="list-style:none">${checks.map(c => featCheck(b, c)).join('')}</ul>
  </div>`;
  const [a, bb] = side === 'right' ? [text, img] : [img, text];
  return `<div style="display:flex;gap:48px;align-items:center;flex-wrap:wrap">${a}${bb}</div>`;
}

function pricingCard(b, lang, plan) {
  const isNovaQI = b.name === 'NovaQI';
  const nameMap  = { free: l(lang,'plan_free_name'), starter: 'Starter', premium: 'Premium' };
  const featsMap = {
    free:    [l(lang,'free_feat1'),    l(lang,'free_feat2'),    l(lang,'free_feat3'),    l(lang,'free_feat4')],
    starter: [l(lang,'starter_feat1'), l(lang,'starter_feat2'), l(lang,'starter_feat3'), l(lang,'starter_feat4')],
    premium: [l(lang,'premium_feat1'), l(lang,'premium_feat2'), l(lang,'premium_feat3'), l(lang,'premium_feat4')],
  };
  const ctaMap  = { free: l(lang,'plan_try'), starter: l(lang,'plan_start'), premium: l(lang,'plan_get') };
  const subMap  = { free: l(lang,'plan_forever'), starter: l(lang,'plan_month'), premium: l(lang,'plan_month') };
  const isFree = plan.id === 'free';
  const popular = plan.popular;
  const trialBadge = plan.trial && !isFree
    ? `<div style="display:inline-block;background:${b.accent}22;color:${b.accent};font-size:11px;font-weight:800;padding:4px 12px;border-radius:20px;margin-bottom:16px">${tr(lang,'plan_trial')}</div><br>`
    : '';
  const popBadge = popular
    ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:${b.primary};color:#fff;font-size:11px;font-weight:800;padding:5px 18px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 12px ${b.primary}50">${tr(lang,'plan_popular')}</div>`
    : '';
  const border = popular ? `border:2px solid ${b.primary};box-shadow:0 12px 48px ${b.primary}20` : 'border:2px solid #f0f0f0';
  const ctaStyle = popular
    ? `background:${b.primary};color:#fff;`
    : isFree
      ? `background:${b.light};color:${b.dark};`
      : `background:${b.dark};color:#fff;`;
  const cta = b.iosUrl
    ? `<a href="${b.iosUrl}" style="${ctaStyle}display:block;text-align:center;padding:14px;border-radius:14px;font-size:15px;font-weight:800;text-decoration:none;margin-top:24px">${ctaMap[plan.id]}</a>`
    : '';
  return `<div style="background:#fff;border-radius:24px;padding:28px;position:relative;${border}">
    ${popBadge}
    <div style="font-size:17px;font-weight:900;color:${b.dark};margin-bottom:8px">${nameMap[plan.id]}</div>
    ${trialBadge}
    <div style="display:flex;align-items:baseline;gap:4px;margin-bottom:4px">
      <span style="font-size:40px;font-weight:900;color:${b.dark};line-height:1">${plan.price}</span>
      <span style="font-size:14px;color:#aaa;font-weight:500">${subMap[plan.id]}</span>
    </div>
    <div style="height:1px;background:#f5f5f5;margin:18px 0"></div>
    <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
      ${featsMap[plan.id].map(f => `<li style="display:flex;gap:8px;font-size:14px;color:#444"><span style="color:${b.primary};flex-shrink:0">${SVG_CHECK}</span>${f}</li>`).join('')}
    </ul>
    ${cta}
  </div>`;
}

export function htmlAboutPage(host, lang) {
  const b  = getBrand(host);
  const t  = (key) => tr(lang, key);
  const ll = (key) => l(lang, key);
  const isNovaQI = b.name === 'NovaQI';

  const diets = [
    ['🌱', 'Vegan'], ['🥗', lang==='de'?'Vegetarisch':lang==='fr'?'Végétarien':lang==='pt'?'Vegetariano':lang==='it'?'Vegetariano':lang==='es'?'Vegetariano':'Vegetarian'],
    ['🐟', 'Pescatarian'], ['🌾', lang==='de'?'Glutenfrei':lang==='fr'?'Sans gluten':lang==='pt'?'Sem glúten':lang==='it'?'Senza glutine':lang==='es'?'Sin gluten':'Gluten-free'],
    ['☪️', 'Halal'], ['🥩', lang==='de'?'Allesfresser':lang==='fr'?'Omnivore':lang==='pt'?'Omnívoro':lang==='it'?'Onnivoro':lang==='es'?'Omnívoro':'Omnivore'],
  ].map(([icon, name]) =>
    `<span style="display:inline-flex;align-items:center;gap:8px;background:#fff;color:${b.dark};font-size:14px;font-weight:700;padding:10px 20px;border-radius:24px;border:1.5px solid ${b.primary}30;box-shadow:0 2px 8px rgba(0,0,0,.04)">${icon} ${name}</span>`
  ).join('');

  const pills = ['pill_scan','pill_macro','pill_exercise','pill_plate','pill_halal','pill_water']
    .map(k => `<span style="display:inline-block;background:rgba(255,255,255,.08);color:rgba(255,255,255,.75);font-size:13px;font-weight:600;padding:8px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.12)">${ll(k)}</span>`)
    .join('');

  const faqItems = (ll('faq') || []).map(([q, a], i) =>
    `<div style="border-bottom:1px solid #eee">
      <button onclick="var p=this.nextElementSibling;var open=p.style.display==='block';this.querySelector('span').textContent=open?'+':'−';p.style.display=open?'none':'block'"
        style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:18px 0;background:none;border:none;cursor:pointer;text-align:left;font-size:15px;font-weight:700;color:${b.dark}">
        ${q}<span style="color:${b.primary};font-size:22px;font-weight:400;flex-shrink:0;margin-left:16px">+</span>
      </button>
      <div style="display:none;padding-bottom:18px;font-size:14px;color:#555;line-height:1.7">${a}</div>
    </div>`
  ).join('');

  const plans = b.plans.map(p => pricingCard(b, lang, p)).join('');
  const termsLabel = lang==='de'?'AGB':lang==='fr'?'CGU':lang==='pt'?'Termos':lang==='it'?'Termini':lang==='es'?'Términos':'Terms';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${b.name} — ${ll('hero_h1').replace(/<[^>]+>/g,'').replace('\n','')}</title>
<meta name="description" content="${ll('hero_sub')}">
<meta property="og:title" content="${b.name}">
<meta property="og:description" content="${ll('hero_sub')}">
<meta property="og:url" content="${b.appUrl}/about">
<meta property="og:image" content="${b.appUrl}/favicon.ico">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800;900&display=swap" rel="stylesheet">
<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','868003866387139');fbq('track','PageView');fbq('track','ViewContent',{content_name:'${b.name}',content_category:'App'});</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=868003866387139&ev=PageView&noscript=1"/></noscript>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Manrope',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;color:#1a1a1a;-webkit-font-smoothing:antialiased;line-height:1.6}
a{text-decoration:none}
header{position:sticky;top:0;z-index:100;background:${b.dark};height:64px;display:flex;align-items:center;padding:0 32px;gap:0;box-shadow:0 1px 0 rgba(255,255,255,.06)}
.nav-r{display:flex;align-items:center;gap:20px;margin-left:auto}
.nav-r a{color:rgba(255,255,255,.5);font-size:13px;font-weight:700;transition:color .15s}
.nav-r a:hover{color:#fff}
.nav-cta{background:${b.primary} !important;color:${b.dark} !important;padding:9px 20px;border-radius:10px;font-weight:800 !important}
.ls-desk a,.ls-lnk{color:rgba(255,255,255,.35);font-size:11px;font-weight:700;padding:3px 5px;border-radius:4px;transition:color .15s}
.ls-act{color:#fff !important}
.ls-mob{display:none;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:8px;padding:5px 8px;font-size:13px;font-weight:700;cursor:pointer}
.dl-btns{display:flex;gap:12px;flex-wrap:wrap;justify-content:center}
.btn-dl{display:inline-flex;align-items:center;gap:10px;border-radius:14px;font-weight:800;transition:opacity .15s;text-decoration:none}
.btn-dl:hover{opacity:.85}
.btn-apple{background:#fff;color:${b.dark}}
.btn-google{background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.2)}
.dl-lbl{font-size:10px;font-weight:500;opacity:.65;line-height:1;display:block}
.dl-nm{font-size:15px;font-weight:900;line-height:1.3;display:block}
.w{max-width:1020px;margin:0 auto;padding:0 24px}
@media(max-width:680px){header{padding:0 16px}.nh{display:none}section{padding:52px 20px !important}.ls-desk{display:none}.ls-mob{display:block}}
</style>
</head>
<body>

<!-- HEADER -->
<header>
  <a href="${b.appUrl}" style="display:flex;align-items:center;text-decoration:none">${b.headerLogo}</a>
  <div class="nav-r">
    <a href="#features" class="nh">${t('nav_features')}</a>
    <a href="#pricing" class="nh">${t('nav_pricing')}</a>
    <a href="${b.supportUrl}" class="nh">${t('nav_support')}</a>
    ${b.iosUrl ? `<a href="${b.iosUrl}" class="nav-cta">${t('nav_download')}</a>` : ''}
    <div style="padding-left:16px;border-left:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:2px">
      ${langSwitcher(lang,'/about')}
    </div>
  </div>
</header>

<!-- HERO -->
<div style="background:${b.dark};padding:88px 24px 80px;text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 80% -20%,${b.primary}1A 0%,transparent 55%),radial-gradient(ellipse at 20% 100%,${b.accent}12 0%,transparent 50%)"></div>
  <div style="position:relative;max-width:700px;margin:0 auto">
    <div style="display:inline-flex;align-items:center;gap:8px;background:${b.primary}18;border:1px solid ${b.primary}35;padding:7px 16px;border-radius:24px;margin-bottom:28px">
      ${NOVAQI_ICON(18)}
      <span style="font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${b.primary}">NovaQI · Claude AI</span>
    </div>
    <h1 style="color:#fff;font-size:clamp(32px,6vw,58px);font-weight:900;letter-spacing:-2px;line-height:1.08;margin-bottom:22px">${ll('hero_h1').replace('<em>',`<em style="font-style:normal;color:${b.primary}">`)}</h1>
    <p style="color:rgba(255,255,255,.6);font-size:clamp(15px,2vw,18px);line-height:1.65;margin-bottom:36px;max-width:560px;margin-left:auto;margin-right:auto">${ll('hero_sub')}</p>
    ${storeButtons(b, t, 'large')}
    <p style="color:rgba(255,255,255,.28);font-size:12px;margin-top:14px;margin-bottom:40px">${ll('hero_note')}</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">${pills}</div>
  </div>
</div>

<!-- TRUST BAR -->
<div style="background:${b.light};border-bottom:1px solid ${b.primary}18">
  <div class="w" style="display:flex;justify-content:center;gap:0;flex-wrap:wrap">
    ${[
      ['3M+',   ll('trust_scans')],
      ['22',    ll('trust_allergens')],
      ['27',    ll('trust_exercises')],
      ['6',     ll('trust_langs')],
    ].map(([n,lbl]) =>
      `<div style="text-align:center;padding:24px 36px;border-right:1px solid ${b.primary}18">
        <div style="font-size:28px;font-weight:900;color:${b.dark};line-height:1;font-family:'Manrope',sans-serif">${n}</div>
        <div style="font-size:12px;color:#777;margin-top:4px;font-weight:600">${lbl}</div>
      </div>`
    ).join('')}
  </div>
</div>

<!-- FEATURES -->
<div id="features">

  <!-- S1: Ingredient scan -->
  <div style="background:#fff;padding:80px 24px">
    <div class="w">${featureRow(b, lang, 'left', '📷', ll('s1_label'), ll('s1_title'), ll('s1_body'),
      [ll('s1_f1'), ll('s1_f2'), ll('s1_f3'), ll('s1_f4')])}</div>
  </div>

  <!-- S2: Nutrition tracking -->
  <div style="background:${b.light};padding:80px 24px">
    <div class="w">${featureRow(b, lang, 'right', '📊', ll('s2_label'), ll('s2_title'), ll('s2_body'),
      [ll('s2_f1'), ll('s2_f2'), ll('s2_f3'), ll('s2_f4')])}</div>
  </div>

  <!-- S3: Exercise & fitness -->
  <div style="background:#fff;padding:80px 24px">
    <div class="w">${featureRow(b, lang, 'left', '🏃', ll('s3_label'), ll('s3_title'), ll('s3_body'),
      [ll('s3_f1'), ll('s3_f2'), ll('s3_f3'), ll('s3_f4')])}</div>
  </div>

  <!-- S4: Plate analysis -->
  <div style="background:${b.light};padding:80px 24px">
    <div class="w">${featureRow(b, lang, 'right', '🍽️', ll('s4_label'), ll('s4_title'), ll('s4_body'),
      [ll('s4_f1'), ll('s4_f2'), ll('s4_f3'), ll('s4_f4')])}</div>
  </div>

</div>

<!-- HALAL SPOTLIGHT -->
<div style="background:${b.dark};padding:80px 24px;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 100% 50%,${b.primary}14 0%,transparent 60%)"></div>
  <div class="w" style="position:relative;display:flex;gap:56px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:240px">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.accent};margin-bottom:12px">${ll('halal_label')}</div>
      <h2 style="color:#fff;font-size:clamp(22px,3vw,32px);font-weight:900;letter-spacing:-0.6px;line-height:1.2;margin-bottom:14px">${ll('halal_title')}</h2>
      <p style="color:rgba(255,255,255,.55);font-size:15px;line-height:1.7;margin-bottom:24px">${ll('halal_body')}</p>
      <ul style="list-style:none;display:flex;flex-direction:column;gap:10px">
        ${[ll('halal_f1'),ll('halal_f2'),ll('halal_f3'),ll('halal_f4')].map(f =>
          `<li style="display:flex;gap:10px;align-items:flex-start;font-size:14px;color:rgba(255,255,255,.7)"><span style="color:${b.primary};flex-shrink:0;margin-top:2px">${SVG_CHECK}</span>${f}</li>`
        ).join('')}
      </ul>
    </div>
    <div style="display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <div style="background:${b.primary}18;border:1px solid ${b.primary}30;border-radius:28px;padding:40px;text-align:center">
        <div style="font-size:80px;line-height:1;margin-bottom:12px">☪️</div>
        <div style="font-size:22px;font-weight:900;color:${b.primary}">Halal ✓</div>
        <div style="font-size:13px;color:rgba(255,255,255,.4);margin-top:4px">Mashbooh · Not Halal</div>
      </div>
    </div>
  </div>
</div>

<!-- HOW IT WORKS -->
<div style="background:#fff;padding:80px 24px">
  <div class="w" style="text-align:center">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px">${ll('how_label')}</div>
    <h2 style="font-size:clamp(22px,3vw,32px);font-weight:900;color:${b.dark};letter-spacing:-0.6px;margin-bottom:52px">${ll('how_title')}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;text-align:left">
      ${[['step1','🛠️'],['step2','📷'],['step3','✅'],['step4','📊']].map(([s, icon]) => `
        <div>
          <div style="width:52px;height:52px;background:${b.dark};border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px">${icon}</div>
          <div style="font-size:11px;font-weight:800;color:${b.primary};letter-spacing:1.5px;text-transform:uppercase;margin-bottom:8px">Step ${ll(s+'_n')}</div>
          <h3 style="font-size:16px;font-weight:800;color:${b.dark};margin-bottom:8px">${ll(s+'_title')}</h3>
          <p style="font-size:14px;color:#666;line-height:1.65">${ll(s+'_body')}</p>
        </div>`
      ).join('')}
    </div>
  </div>
</div>

<!-- DIET PROFILES -->
<div style="background:${b.light};padding:64px 24px">
  <div class="w" style="text-align:center">
    <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px">${ll('diets_label')}</div>
    <h2 style="font-size:clamp(22px,3vw,32px);font-weight:900;color:${b.dark};letter-spacing:-0.6px;margin-bottom:10px">${ll('diets_title')}</h2>
    <p style="font-size:15px;color:#777;margin-bottom:32px;max-width:480px;margin-left:auto;margin-right:auto">${ll('diets_sub')}</p>
    <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">${diets}</div>
  </div>
</div>

<!-- PRICING -->
<div id="pricing" style="background:#fff;padding:80px 24px">
  <div class="w">
    <div style="text-align:center;margin-bottom:48px">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px">${ll('pricing_label')}</div>
      <h2 style="font-size:clamp(22px,3vw,32px);font-weight:900;color:${b.dark};letter-spacing:-0.6px;margin-bottom:10px">${ll('pricing_title')}</h2>
      <p style="font-size:15px;color:#777;max-width:440px;margin:0 auto">${ll('pricing_sub')}</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;align-items:start;margin-bottom:28px">
      ${plans}
    </div>
    <p style="font-size:11px;color:#bbb;text-align:center;max-width:560px;margin:0 auto;line-height:1.65">
      ${ll('plan_legal')} · <a href="${b.termsUrl}" style="color:#bbb">${termsLabel}</a> · <a href="${b.privacyUrl}" style="color:#bbb">${t('privacy_link')}</a>
    </p>
  </div>
</div>

<!-- FAQ -->
<div style="background:${b.light};padding:80px 24px">
  <div class="w" style="max-width:680px">
    <div style="text-align:center;margin-bottom:48px">
      <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px">${ll('faq_label')}</div>
      <h2 style="font-size:clamp(22px,3vw,32px);font-weight:900;color:${b.dark};letter-spacing:-0.6px">${ll('faq_title')}</h2>
    </div>
    <div style="background:#fff;border-radius:20px;padding:8px 32px;box-shadow:0 2px 24px rgba(0,0,0,.04)">
      ${faqItems}
    </div>
  </div>
</div>

<!-- FINAL CTA -->
<div style="background:${b.dark};padding:88px 24px;text-align:center;position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,${b.primary}18 0%,transparent 60%)"></div>
  <div style="position:relative;max-width:520px;margin:0 auto">
    <div style="margin-bottom:24px;opacity:.5">${NOVAQI_ICON(40)}</div>
    <h2 style="color:#fff;font-size:clamp(24px,4vw,38px);font-weight:900;letter-spacing:-1px;line-height:1.15;margin-bottom:14px">${ll('cta_title')}</h2>
    <p style="color:rgba(255,255,255,.5);font-size:16px;margin-bottom:36px">${ll('cta_sub')}</p>
    ${storeButtons(b, t, 'large')}
    <p style="color:rgba(255,255,255,.2);font-size:12px;margin-top:20px">${ll('hero_note')}</p>
  </div>
</div>

<!-- FOOTER -->
<footer style="background:#080f09;padding:32px 24px;text-align:center">
  <div style="display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin-bottom:14px">
    <a href="${b.appUrl}/about" style="color:rgba(255,255,255,.3);font-size:12px;font-weight:700">${b.name}</a>
    <a href="${b.supportUrl}" style="color:rgba(255,255,255,.3);font-size:12px;font-weight:700">${t('nav_support')}</a>
    <a href="${b.termsUrl}" style="color:rgba(255,255,255,.3);font-size:12px;font-weight:700">${termsLabel}</a>
    <a href="${b.privacyUrl}" style="color:rgba(255,255,255,.3);font-size:12px;font-weight:700">${t('privacy_link')}</a>
    <a href="${b.appUrl}/legal/imprint" style="color:rgba(255,255,255,.3);font-size:12px;font-weight:700">Imprint</a>
  </div>
  <div style="color:rgba(255,255,255,.12);font-size:11px">© 2026 ${b.name} · ${ll('footer_note')}</div>
</footer>

</body></html>`;
}
