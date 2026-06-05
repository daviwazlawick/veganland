import { tr, LANGS, LANG_NAMES } from './web_i18n.js';

const BRANDS = {
  veganland: {
    name: 'VeganLand', primary: '#7CB518', dark: '#1C2B22', light: '#F0F7E6', accent: '#5A9A0A',
    logo: '🌱', appUrl: 'https://veganland.app',
    privacyUrl: 'https://veganland.app/legal/privacy', termsUrl: 'https://veganland.app/legal/terms', supportUrl: 'https://veganland.app/support',
    iosUrl: 'https://apps.apple.com/app/veganland/id0000000001', androidUrl: 'https://play.google.com/store/apps/details?id=app.veganland',
    plans: [
      { id: 'free',    price: '€0',    period: '',       scans: '7',   trial: false },
      { id: 'starter', price: '€2.99', period: '/month', scans: '50',  trial: true, popular: true },
      { id: 'premium', price: '€5.49', period: '/month', scans: '100', trial: true },
    ],
  },
  novaqi: {
    name: 'NovaQI', primary: '#E8A020', dark: '#1E1B4B', light: '#F0F0FA', accent: '#F5A623',
    logo: '⬡', appUrl: 'https://novaqi.app',
    privacyUrl: 'https://novaqi.app/legal/privacy', termsUrl: 'https://novaqi.app/legal/terms', supportUrl: 'https://novaqi.app/support',
    iosUrl: 'https://apps.apple.com/app/novaqi/id0000000000', androidUrl: 'https://play.google.com/store/apps/details?id=app.novaqi',
    plans: [
      { id: 'free',    price: '€0',    period: '',       scans: '7',   trial: false },
      { id: 'starter', price: '€3.99', period: '/month', scans: '50',  trial: true, popular: true },
      { id: 'premium', price: '€5.49', period: '/month', scans: '100', trial: true },
    ],
  },
};

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

function langSwitcher(currentLang, path) {
  return LANGS.map(l =>
    `<a href="${path}?lang=${l}" style="color:${l === currentLang ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.4)'};font-size:12px;font-weight:${l === currentLang ? '800' : '600'};text-decoration:none;padding:4px 6px">${LANG_NAMES[l]}</a>`
  ).join('');
}

function planCard(b, plan, lang) {
  const scansLabel = plan.scans + ' scans / ' + (lang === 'de' ? 'Monat' : lang === 'fr' ? 'mois' : lang === 'pt' ? 'mês' : lang === 'it' ? 'mese' : lang === 'es' ? 'mes' : 'month');
  const features = [
    scansLabel,
    plan.id === 'free' ? 'AI ' + (lang === 'de' ? 'Zutatenanalyse' : lang === 'fr' ? "analyse d'ingrédients" : lang === 'pt' ? 'análise de ingredientes' : lang === 'it' ? 'analisi ingredienti' : lang === 'es' ? 'análisis de ingredientes' : 'ingredient analysis') : (lang === 'de' ? 'Alles in Free' : lang === 'fr' ? 'Tout de Gratuit' : lang === 'pt' ? 'Tudo do Grátis' : lang === 'it' ? 'Tutto di Gratuito' : lang === 'es' ? 'Todo de Gratis' : 'Everything in Free'),
    lang === 'de' ? 'Alle Diäten & Allergene' : lang === 'fr' ? 'Tous régimes & allergènes' : lang === 'pt' ? 'Todas dietas e alergénios' : lang === 'it' ? 'Tutte le diete e allergeni' : lang === 'es' ? 'Todas las dietas y alérgenos' : 'All diets & allergens',
    plan.id !== 'free' ? (lang === 'de' ? 'Scan-Verlauf' : lang === 'fr' ? 'Historique des scans' : lang === 'pt' ? 'Histórico de scans' : lang === 'it' ? 'Cronologia scansioni' : lang === 'es' ? 'Historial de escaneos' : 'Scan history') : '6 ' + tr(lang, 'about_stats_langs').toLowerCase(),
  ];
  const popularBadge = plan.popular ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:${b.primary};color:#fff;font-size:11px;font-weight:800;padding:5px 14px;border-radius:10px;white-space:nowrap">${tr(lang, 'plan_popular')}</div>` : '';
  const trialBadge = plan.trial ? `<div style="display:inline-block;background:${b.primary}20;color:${b.accent};font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;margin-bottom:10px">${tr(lang, 'plan_trial')}</div>` : '';
  const btnStyle = plan.popular ? `background:${b.dark};color:#fff` : `background:${b.light};color:${b.dark}`;
  const btnText = plan.trial ? tr(lang, 'plan_cta_paid') : tr(lang, 'plan_cta_free');
  return `
<div style="background:#fff;border-radius:24px;padding:28px;border:2px solid ${plan.popular ? b.primary : '#f0f0f0'};position:relative;${plan.popular ? `box-shadow:0 8px 40px ${b.primary}25` : ''}">
  ${popularBadge}
  <div style="font-size:18px;font-weight:900;color:${b.dark};margin-bottom:4px">${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}</div>
  ${trialBadge}
  <div style="font-size:36px;font-weight:900;color:${b.dark};line-height:1;margin:12px 0 4px">${plan.price}<span style="font-size:15px;font-weight:600;color:#999">${plan.period}</span></div>
  <div style="font-size:13px;color:#888;font-weight:600;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f0f0">${scansLabel}</div>
  <ul style="list-style:none;margin-bottom:24px;display:flex;flex-direction:column;gap:8px">
    ${features.map(f => `<li style="font-size:14px;color:#444;font-weight:500">✓ ${f}</li>`).join('')}
  </ul>
  <a href="${b.iosUrl}" style="display:block;text-align:center;padding:14px;border-radius:14px;font-size:15px;font-weight:800;text-decoration:none;${btnStyle}">${btnText}</a>
</div>`;
}

export function htmlAboutPage(host, lang) {
  const b = getBrand(host);
  const t = (key) => tr(lang, key);
  const plans = b.plans.map(p => planCard(b, p, lang)).join('');
  const diets = [
    ['🌱', 'Vegan'], ['🥗', lang === 'de' ? 'Vegetarisch' : lang === 'fr' ? 'Végétarien' : lang === 'pt' ? 'Vegetariano' : lang === 'it' ? 'Vegetariano' : lang === 'es' ? 'Vegetariano' : 'Vegetarian'],
    ['🐟', 'Pescatarian'], ['🌾', lang === 'de' ? 'Glutenfrei' : lang === 'fr' ? 'Sans gluten' : lang === 'pt' ? 'Sem glúten' : lang === 'it' ? 'Senza glutine' : lang === 'es' ? 'Sin gluten' : 'Gluten-free'],
    ['☪️', 'Halal'], ['🍽️', lang === 'de' ? 'Allesfresser' : lang === 'fr' ? 'Omnivore' : lang === 'pt' ? 'Omnívoro' : lang === 'it' ? 'Onnivoro' : lang === 'es' ? 'Omnívoro' : 'Omnivore'],
  ].map(([icon, name]) => `<div style="display:inline-flex;align-items:center;gap:7px;background:${b.light};color:${b.dark};font-size:13px;font-weight:700;padding:8px 16px;border-radius:20px;border:1.5px solid ${b.primary}30">${icon} ${name}</div>`).join('');

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${b.name} — ${t('about_h1_a')} ${t('about_h1_b')}</title>
<meta name="description" content="${t('about_h1_a')} ${t('about_h1_b')}">
<meta property="og:title" content="${b.name}">
<meta property="og:url" content="${b.appUrl}/about">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;line-height:1.6;-webkit-font-smoothing:antialiased}
header{position:sticky;top:0;z-index:100;background:${b.dark};padding:0 32px;height:60px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 16px rgba(0,0,0,.18)}
.logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-icon{width:32px;height:32px;background:${b.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.logo-name{color:#fff;font-size:18px;font-weight:900;letter-spacing:-0.4px}
.nav-links{display:flex;gap:20px;margin-left:auto;align-items:center}
.nav-links a{color:rgba(255,255,255,.6);font-size:13px;font-weight:600;text-decoration:none}
.nav-links a:hover{color:#fff}
.nav-cta{background:${b.primary};color:${b.dark} !important;padding:8px 18px;border-radius:8px;font-weight:800 !important}
.lang-switcher{display:flex;align-items:center;gap:2px;margin-left:16px;border-left:1px solid rgba(255,255,255,.15);padding-left:16px}
.hero{background:${b.dark};padding:72px 24px 88px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 60% 0%,${b.primary}22 0%,transparent 65%)}
.eyebrow{display:inline-block;background:${b.primary}22;color:${b.primary};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:20px}
h1{color:#fff;font-size:clamp(30px,5vw,52px);font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:18px;max-width:680px;margin-left:auto;margin-right:auto}
h1 span{color:${b.primary}}
.hero-sub{color:rgba(255,255,255,.65);font-size:clamp(15px,2vw,18px);max-width:500px;margin:0 auto 36px;line-height:1.6}
.btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.btn-s{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none}
.btn-apple{background:#fff;color:${b.dark}}
.btn-google{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.25)}
.btn-lbl{font-size:10px;font-weight:600;opacity:.65;line-height:1}
.btn-nm{font-size:15px;font-weight:900;line-height:1.2}
.hero-note{color:rgba(255,255,255,.35);font-size:12px;margin-top:16px}
.mockup-wrap{margin-top:56px;display:flex;justify-content:center;gap:20px}
.phone{width:200px;background:#0d0d1a;border-radius:36px;padding:12px;box-shadow:0 32px 80px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.08)}
.phone-inner{background:${b.light};border-radius:26px;overflow:hidden;aspect-ratio:9/19}
.phone-screen{padding:16px 12px;height:100%;display:flex;flex-direction:column;gap:8px}
.pbar{height:10px;border-radius:5px;background:${b.dark}18}
.pcard{background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.psafe{background:#E8F5E9;border-radius:12px;padding:14px;text-align:center}
.pchip{display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;margin:2px}
.pchip.w{background:#FFF8E7;color:#B45309}
.stats{background:${b.light};padding:32px 24px;display:flex;justify-content:center;gap:48px;flex-wrap:wrap}
.stat{text-align:center}
.stat-n{font-size:28px;font-weight:900;color:${b.dark};line-height:1}
.stat-l{font-size:13px;color:#666;margin-top:4px}
section{padding:72px 24px;max-width:1000px;margin:0 auto}
.s-label{font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${b.primary};margin-bottom:12px}
.s-title{font-size:clamp(22px,4vw,34px);font-weight:900;color:${b.dark};letter-spacing:-0.8px;line-height:1.2;margin-bottom:16px}
.s-sub{font-size:16px;color:#666;max-width:520px;line-height:1.6;margin-bottom:48px}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.feat-card{background:#fafafa;border-radius:20px;padding:28px;border:1.5px solid #f0f0f0}
.feat-icon{font-size:32px;margin-bottom:14px}
.feat-card h3{font-size:16px;font-weight:800;color:${b.dark};margin-bottom:8px}
.feat-card p{font-size:14px;color:#666;line-height:1.6}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px;margin-top:48px}
.step{text-align:center;padding:0 16px}
.step-n{width:52px;height:52px;background:${b.dark};color:#fff;border-radius:16px;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.step h3{font-size:16px;font-weight:800;color:${b.dark};margin-bottom:8px}
.step p{font-size:14px;color:#666;line-height:1.6}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;align-items:start}
.cta-s{background:${b.dark};padding:72px 24px;text-align:center}
.cta-s h2{color:#fff;font-size:clamp(22px,4vw,34px);font-weight:900;margin-bottom:14px}
.cta-s p{color:rgba(255,255,255,.6);font-size:16px;margin-bottom:36px}
footer{background:#0d0d0d;padding:32px 24px;text-align:center}
.f-links{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin-bottom:16px}
.f-links a{color:rgba(255,255,255,.4);font-size:13px;font-weight:600;text-decoration:none}
.f-copy{color:rgba(255,255,255,.2);font-size:12px}
@media(max-width:640px){header{padding:0 16px}.nav-hide{display:none}.phone:nth-child(2){display:none}.stats{gap:24px}section{padding:48px 20px}}
</style>
</head>
<body>
<header>
  <a class="logo-wrap" href="${b.appUrl}">
    <div class="logo-icon">${b.logo}</div>
    <span class="logo-name">${b.name}</span>
  </a>
  <div class="nav-links">
    <a href="#features" class="nav-hide">${t('nav_features')}</a>
    <a href="#pricing" class="nav-hide">${t('nav_pricing')}</a>
    <a href="${b.supportUrl}">${t('nav_support')}</a>
    <a href="${b.iosUrl}" class="nav-cta">${t('nav_download')}</a>
    <div class="lang-switcher">${langSwitcher(lang, '/about')}</div>
  </div>
</header>

<div class="hero">
  <div class="eyebrow">${t('about_eyebrow')}</div>
  <h1>${t('about_h1_a')} <span>${t('about_h1_b')}</span></h1>
  <p class="hero-sub">${t('about_feat_sub')}</p>
  <div class="btns">
    <a href="${b.iosUrl}" class="btn-s btn-apple">
      <span style="font-size:20px"></span>
      <span><div class="btn-lbl">${t('about_dl_apple')}</div><div class="btn-nm">App Store</div></span>
    </a>
    <a href="${b.androidUrl}" class="btn-s btn-google">
      <span style="font-size:16px">▶</span>
      <span><div class="btn-lbl">${t('about_dl_google')}</div><div class="btn-nm">Google Play</div></span>
    </a>
  </div>
  <p class="hero-note">${t('about_hero_note')}</p>
  <div class="mockup-wrap">
    <div class="phone"><div class="phone-inner"><div class="phone-screen">
      <div class="pbar" style="width:60%"></div>
      <div class="psafe"><div style="font-size:28px;margin-bottom:4px">✅</div><div style="font-size:11px;font-weight:800;color:#2E7D32">SAFE</div></div>
      <div class="pcard"><div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:6px">INGREDIENTS</div><span class="pchip">Water</span><span class="pchip">Oats</span><span class="pchip w">Milk</span><span class="pchip">Sugar</span></div>
      <div class="pcard"><div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:4px">AI ANALYSIS</div><div style="font-size:9px;color:#666;line-height:1.5">Suitable for your vegan profile. Contains milk — flagged for your lactose allergy.</div></div>
    </div></div></div>
    <div class="phone" style="margin-top:32px;opacity:.7"><div class="phone-inner"><div class="phone-screen">
      <div class="pbar" style="width:40%"></div>
      <div style="background:${b.dark};border-radius:12px;padding:16px;text-align:center"><div style="font-size:24px;margin-bottom:6px">📷</div><div style="font-size:10px;color:rgba(255,255,255,.7);font-weight:700">SCAN</div></div>
      <div class="pcard"><div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:4px">RECENT</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:9px;color:#333;font-weight:600">Oat Milk</span><span style="font-size:8px;background:#E8F5E9;color:#2E7D32;padding:2px 6px;border-radius:5px;font-weight:800">SAFE</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:9px;color:#333;font-weight:600">Chocolate</span><span style="font-size:8px;background:#FFF8E7;color:#B45309;padding:2px 6px;border-radius:5px;font-weight:800">CAUTION</span></div>
      </div>
    </div></div></div>
  </div>
</div>

<div class="stats">
  <div class="stat"><div class="stat-n">22</div><div class="stat-l">${t('about_stats_allergens')}</div></div>
  <div class="stat"><div class="stat-n">6</div><div class="stat-l">${t('about_stats_diets')}</div></div>
  <div class="stat"><div class="stat-n">6</div><div class="stat-l">${t('about_stats_langs')}</div></div>
  <div class="stat"><div class="stat-n">AI</div><div class="stat-l">${t('about_stats_ai')}</div></div>
</div>

<section id="features">
  <div class="s-label">${t('about_feat_label')}</div>
  <h2 class="s-title">${t('about_feat_title')}</h2>
  <p class="s-sub">${t('about_feat_sub')}</p>
  <div class="feat-grid">
    <div class="feat-card"><div class="feat-icon">📷</div><h3>${t('feat1_title')}</h3><p>${t('feat1_body')}</p></div>
    <div class="feat-card"><div class="feat-icon">🤖</div><h3>${t('feat2_title')}</h3><p>${t('feat2_body')}</p></div>
    <div class="feat-card"><div class="feat-icon">🎯</div><h3>${t('feat3_title')}</h3><p>${t('feat3_body')}</p></div>
    <div class="feat-card"><div class="feat-icon">🌾</div><h3>${t('feat4_title')}</h3><p>${t('feat4_body')}</p></div>
    <div class="feat-card"><div class="feat-icon">📋</div><h3>${t('feat5_title')}</h3><p>${t('feat5_body')}</p></div>
    <div class="feat-card"><div class="feat-icon">🌍</div><h3>${t('feat6_title')}</h3><p>${t('feat6_body')}</p></div>
  </div>
</section>

<section style="padding-top:0">
  <div class="s-label">${t('about_diets_label')}</div>
  <h2 class="s-title">${t('about_diets_title')}</h2>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">${diets}</div>
</section>

<div style="background:#fafafa;padding:1px 0">
<section>
  <div class="s-label">${t('about_steps_label')}</div>
  <h2 class="s-title">${t('about_steps_title')}</h2>
  <div class="steps">
    <div class="step"><div class="step-n">1</div><h3>${t('step1_title')}</h3><p>${t('step1_body')}</p></div>
    <div class="step"><div class="step-n">2</div><h3>${t('step2_title')}</h3><p>${t('step2_body')}</p></div>
    <div class="step"><div class="step-n">3</div><h3>${t('step3_title')}</h3><p>${t('step3_body')}</p></div>
  </div>
</section>
</div>

<div id="pricing" style="background:${b.light};padding:1px 0">
<section>
  <div class="s-label">${t('about_pricing_label')}</div>
  <h2 class="s-title">${t('about_pricing_title')}</h2>
  <p class="s-sub">${t('about_pricing_sub')}</p>
  <p style="font-size:13px;color:#888;margin-bottom:40px">${t('about_pricing_note')}</p>
  <div class="plans-grid">${plans}</div>
  <p style="font-size:11px;color:#aaa;text-align:center;margin-top:24px;max-width:560px;margin-left:auto;margin-right:auto;line-height:1.6">
    ${t('plan_legal')} · <a href="${b.termsUrl}" style="color:#aaa;text-decoration:underline">${lang === 'de' ? 'AGB' : lang === 'fr' ? 'CGU' : lang === 'pt' ? 'Termos' : lang === 'it' ? 'Termini' : lang === 'es' ? 'Términos' : 'Terms'}</a> · <a href="${b.privacyUrl}" style="color:#aaa;text-decoration:underline">${tr(lang, 'privacy_link')}</a>
  </p>
</section>
</div>

<div class="cta-s">
  <h2>${t('about_cta_title')}</h2>
  <p>${t('about_cta_sub')}</p>
  <div class="btns">
    <a href="${b.iosUrl}" class="btn-s btn-apple">
      <span style="font-size:20px"></span>
      <span><div class="btn-lbl">${t('about_dl_apple')}</div><div class="btn-nm">App Store</div></span>
    </a>
    <a href="${b.androidUrl}" class="btn-s btn-google">
      <span style="font-size:16px">▶</span>
      <span><div class="btn-lbl">${t('about_dl_google')}</div><div class="btn-nm">Google Play</div></span>
    </a>
  </div>
</div>

<footer>
  <div class="f-links">
    <a href="${b.appUrl}/about">${b.name}</a>
    <a href="${b.supportUrl}">${t('nav_support')}</a>
    <a href="${b.termsUrl}">${lang === 'de' ? 'AGB' : lang === 'fr' ? 'CGU' : lang === 'pt' ? 'Termos' : lang === 'it' ? 'Termini' : lang === 'es' ? 'Términos' : 'Terms'}</a>
    <a href="${b.privacyUrl}">${tr(lang, 'privacy_link')}</a>
    <a href="${b.appUrl}/legal/imprint">Imprint</a>
  </div>
  <div class="f-copy">© 2026 ${b.name} · ${t('about_footer_note')}</div>
</footer>
</body></html>`;
}
