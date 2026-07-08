import { tr, LANGS, LANG_NAMES } from './web_i18n.js';

// Inline SVG assets from assets/novaqi/
const NOVAQI_TARGET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <circle cx="50" cy="50" r="30" stroke="#E8A020" stroke-width="3.5" fill="none"/>
  <circle cx="50" cy="50" r="13" stroke="#E8A020" stroke-width="3.5" fill="none"/>
  <circle cx="50" cy="50" r="5" fill="#E8A020"/>
  <line x1="50" y1="8" x2="50" y2="22" stroke="#E8A020" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="50" y1="78" x2="50" y2="92" stroke="#E8A020" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="8" y1="50" x2="22" y2="50" stroke="#E8A020" stroke-width="3.5" stroke-linecap="round"/>
  <line x1="78" y1="50" x2="92" y2="50" stroke="#E8A020" stroke-width="3.5" stroke-linecap="round"/>
</svg>`;

const NOVAQI_TARGET_ICON = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" width="${size}" height="${size}">
  <circle cx="30" cy="30" r="18" stroke="#E8A020" stroke-width="3" fill="none"/>
  <circle cx="30" cy="30" r="8" stroke="#E8A020" stroke-width="3" fill="none"/>
  <circle cx="30" cy="30" r="4" fill="#E8A020"/>
  <line x1="30" y1="4" x2="30" y2="14" stroke="#E8A020" stroke-width="3" stroke-linecap="round"/>
  <line x1="30" y1="46" x2="30" y2="56" stroke="#E8A020" stroke-width="3" stroke-linecap="round"/>
  <line x1="4" y1="30" x2="14" y2="30" stroke="#E8A020" stroke-width="3" stroke-linecap="round"/>
  <line x1="46" y1="30" x2="56" y2="30" stroke="#E8A020" stroke-width="3" stroke-linecap="round"/>
</svg>`;

const NOVAQI_LOGO_HEADER = `<span style="display:flex;align-items:center;gap:10px">${NOVAQI_TARGET_ICON(32)}<span style="font-family:'Syne',sans-serif;font-weight:800;font-size:22px;letter-spacing:-1px;line-height:1;color:#fff">Nova<span style="color:#E8A020">QI</span></span></span>`;

const NOVAQI_HERO_LOGO = null;

const BRANDS = {
  veganland: {
    name: 'VeganLand', primary: '#7CB518', dark: '#1C2B22', light: '#F0F7E6', accent: '#5A9A0A',
    appUrl: 'https://veganland.app',
    privacyUrl: 'https://veganland.app/legal/privacy', termsUrl: 'https://veganland.app/legal/terms', supportUrl: 'https://veganland.app/support',
    iosUrl: null, androidUrl: null, // VeganLand not yet published on either store
    headerLogo: `<span style="color:#fff;font-size:20px">🌱</span><span style="color:#fff;font-size:18px;font-weight:900;letter-spacing:-0.4px">VeganLand</span>`,
    heroLogo: `<span style="font-size:48px">🌱</span><span style="display:block;color:#fff;font-size:42px;font-weight:900;letter-spacing:-2px;line-height:1">VeganLand</span>`,
    plans: [
      { id: 'starter', price: '€2.99', period: '/month', scans: '30', trial: true,  popular: true },
      { id: 'premium', price: '€5.99', period: '/month', scans: '100', trial: true },
    ],
  },
  novaqi: {
    name: 'NovaQI', primary: '#E8A020', dark: '#1E1B4B', light: '#F0F0FA', accent: '#F5A623',
    appUrl: 'https://novaqi.app',
    privacyUrl: 'https://novaqi.app/legal/privacy', termsUrl: 'https://novaqi.app/legal/terms', supportUrl: 'https://novaqi.app/support',
    iosUrl: 'https://apps.apple.com/us/app/novaqi-scan/id6775790620', androidUrl: null,
    headerLogo: NOVAQI_LOGO_HEADER,
    heroLogo: NOVAQI_HERO_LOGO,
    plans: [
      { id: 'starter', price: '€2.99', period: '/month', scans: '30', trial: true,  popular: true },
      { id: 'premium', price: '€5.99', period: '/month', scans: '100', trial: true },
    ],
  },
};

const SVG_APPLE = `<svg width="20" height="24" viewBox="0 0 814 1000" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.6-49 192.5-49 30.8 0 133.3 2.6 198.3 99zM554.1 158.4c22.4-26.9 38.3-64.2 38.3-101.6 0-5.2-.3-10.4-1.3-14.6-36.4 1.3-80 24.3-106.2 55.2-20.5 23.7-39.5 60.4-39.5 98.4 0 5.8.6 11.5 1 13.5 2.3.3 5.8.6 9.1.6 32.8 0 74.1-21.8 98.6-51.5z"/></svg>`;
const SVG_GOOGLE = `<svg width="20" height="22" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c17.1-9.8 17.1-26 .1-35.3l-1.3-.5zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z" fill="currentColor"/></svg>`;

function storeButtons(b, t) {
  const androidBtn = b.androidUrl
    ? `<a href="${b.androidUrl}" class="btn-s btn-google">
      ${SVG_GOOGLE}
      <span><span class="btn-lbl">${t('about_dl_google')}</span><span class="btn-nm">Google Play</span></span>
    </a>`
    : `<span class="btn-s btn-google" style="opacity:.45;cursor:default">
      ${SVG_GOOGLE}
      <span><span class="btn-lbl">${t('about_dl_google')}</span><span class="btn-nm">Coming soon</span></span>
    </span>`;
  return `<div class="btns">
    <a href="${b.iosUrl}" class="btn-s btn-apple">
      ${SVG_APPLE}
      <span><span class="btn-lbl">${t('about_dl_apple')}</span><span class="btn-nm">App Store</span></span>
    </a>
    ${androidBtn}
  </div>`;
}

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

function langSwitcher(currentLang, path) {
  const links = LANGS.map(l =>
    `<a href="${path}?lang=${l}" style="color:${l === currentLang ? '#fff' : 'rgba(255,255,255,.38)'};font-size:11px;font-weight:${l === currentLang ? '800' : '600'};text-decoration:none;padding:3px 5px">${LANG_NAMES[l]}</a>`
  ).join('');
  const options = LANGS.map(l =>
    `<option value="${path}?lang=${l}"${l === currentLang ? ' selected' : ''}>${LANG_NAMES[l]}</option>`
  ).join('');
  return `<span class="lang-sw-desk">${links}</span><select class="lang-sw-mob" onchange="location.href=this.value">${options}</select>`;
}

function monthLabel(lang) {
  return lang === 'de' ? 'Monat' : lang === 'fr' ? 'mois' : lang === 'pt' ? 'mês' : lang === 'it' ? 'mese' : lang === 'es' ? 'mes' : 'month';
}

function planCard(b, plan, lang) {
  const scansLine = `${plan.scans} scans / ${monthLabel(lang)}`;
  const trialBadge = plan.trial
    ? `<div style="display:inline-block;background:${b.primary}22;color:${b.accent};font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;margin-bottom:12px">${tr(lang, 'plan_trial')}</div><br>` : '';
  const popularBadge = plan.popular
    ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);background:${b.primary};color:#fff;font-size:11px;font-weight:800;padding:5px 16px;border-radius:10px;white-space:nowrap">${tr(lang, 'plan_popular')}</div>` : '';
  const features = [
    scansLine,
    lang === 'de' ? 'KI-Zutatenanalyse' : lang === 'fr' ? "Analyse d'ingrédients IA" : lang === 'pt' ? 'Análise de ingredientes IA' : lang === 'it' ? 'Analisi ingredienti IA' : lang === 'es' ? 'Análisis de ingredientes IA' : 'AI ingredient analysis',
    lang === 'de' ? 'Alle Ernährungsprofile' : lang === 'fr' ? 'Tous les profils alimentaires' : lang === 'pt' ? 'Todos os perfis alimentares' : lang === 'it' ? 'Tutti i profili alimentari' : lang === 'es' ? 'Todos los perfiles alimentarios' : 'All dietary profiles',
    lang === 'de' ? 'Scan-Verlauf' : lang === 'fr' ? 'Historique des scans' : lang === 'pt' ? 'Histórico de scans' : lang === 'it' ? 'Cronologia scansioni' : lang === 'es' ? 'Historial de escaneos' : 'Scan history',
    ...(plan.id === 'premium' ? [lang === 'de' ? 'Unbegrenzter Verlauf' : lang === 'fr' ? 'Historique illimité' : lang === 'pt' ? 'Histórico ilimitado' : lang === 'it' ? 'Cronologia illimitata' : lang === 'es' ? 'Historial ilimitado' : 'Unlimited history'] : []),
  ];
  return `
<div style="background:#fff;border-radius:24px;padding:28px;border:2px solid ${plan.popular ? b.primary : '#f0f0f0'};position:relative;${plan.popular ? `box-shadow:0 8px 40px ${b.primary}20` : ''}">
  ${popularBadge}
  <div style="font-size:17px;font-weight:900;color:${b.dark};margin-bottom:6px">${plan.id.charAt(0).toUpperCase() + plan.id.slice(1)}</div>
  ${trialBadge}
  <div style="font-size:38px;font-weight:900;color:${b.dark};line-height:1;margin-bottom:4px">${plan.price}<span style="font-size:15px;font-weight:600;color:#aaa">${plan.period}</span></div>
  <div style="font-size:13px;color:#999;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f5f5f5">${scansLine}</div>
  <ul style="list-style:none;display:flex;flex-direction:column;gap:9px">
    ${features.map(f => `<li style="font-size:14px;color:#555;display:flex;gap:8px"><span style="color:${b.primary};font-weight:800">✓</span>${f}</li>`).join('')}
  </ul>
</div>`;
}

export function htmlAboutPage(host, lang) {
  const b = getBrand(host);
  const t = (key) => tr(lang, key);
  const plans = b.plans.map(p => planCard(b, p, lang)).join('');
  const isNovaQI = b.name === 'NovaQI';

  const diets = [
    ['🌱', 'Vegan'],
    ['🥗', lang === 'de' ? 'Vegetarisch' : lang === 'fr' ? 'Végétarien' : lang === 'pt' ? 'Vegetariano' : lang === 'it' ? 'Vegetariano' : lang === 'es' ? 'Vegetariano' : 'Vegetarian'],
    ['🐟', 'Pescatarian'],
    ['🌾', lang === 'de' ? 'Glutenfrei' : lang === 'fr' ? 'Sans gluten' : lang === 'pt' ? 'Sem glúten' : lang === 'it' ? 'Senza glutine' : lang === 'es' ? 'Sin gluten' : 'Gluten-free'],
    ['☪️', 'Halal'],
    ['🍽️', lang === 'de' ? 'Allesfresser' : lang === 'fr' ? 'Omnivore' : lang === 'pt' ? 'Omnívoro' : lang === 'it' ? 'Onnivoro' : lang === 'es' ? 'Omnívoro' : 'Omnivore'],
  ].map(([icon, name]) => `<span style="display:inline-flex;align-items:center;gap:7px;background:${b.light};color:${b.dark};font-size:13px;font-weight:700;padding:8px 16px;border-radius:20px;border:1.5px solid ${b.primary}30">${icon} ${name}</span>`).join('');

  const termsLabel = lang === 'de' ? 'AGB' : lang === 'fr' ? 'CGU' : lang === 'pt' ? 'Termos' : lang === 'it' ? 'Termini' : lang === 'es' ? 'Términos' : 'Terms';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${b.name} — ${t('about_h1_a')} ${t('about_h1_b')}</title>
<meta name="description" content="${t('about_hero_sub')}">
<meta property="og:title" content="${b.name}">
<meta property="og:url" content="${b.appUrl}/about">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;line-height:1.6;-webkit-font-smoothing:antialiased}
header{position:sticky;top:0;z-index:100;background:${b.dark};padding:0 32px;height:60px;display:flex;align-items:center;gap:0;box-shadow:0 2px 20px rgba(0,0,0,.2)}
.nav-links{display:flex;gap:20px;margin-left:auto;align-items:center}
.nav-links a{color:rgba(255,255,255,.55);font-size:13px;font-weight:600;text-decoration:none;transition:color .15s}
.nav-links a:hover{color:#fff}
.nav-cta{background:${b.primary};color:${b.dark} !important;padding:8px 18px;border-radius:8px;font-weight:800 !important}
.lang-sw{display:flex;align-items:center;gap:1px;margin-left:20px;padding-left:16px;border-left:1px solid rgba(255,255,255,.12)}
.lang-sw-desk{display:flex;align-items:center;gap:1px}
.lang-sw-mob{display:none;background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.18);border-radius:8px;padding:5px 8px;font-size:13px;font-weight:700;cursor:pointer;appearance:none;-webkit-appearance:none}
.hero{background:${b.dark};padding:80px 24px 80px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 70% -10%,${b.primary}18 0%,transparent 60%)}
.eyebrow{display:inline-block;background:${b.primary}20;color:${b.primary};font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:24px}
.hero h1{color:#fff;font-size:clamp(28px,5vw,50px);font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:20px;max-width:640px;margin-left:auto;margin-right:auto}
.hero h1 em{font-style:normal;color:${b.primary}}
.hero-sub{color:rgba(255,255,255,.6);font-size:clamp(15px,2vw,17px);max-width:500px;margin:0 auto 36px;line-height:1.65}
.btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:14px}
.btn-s{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;transition:opacity .15s}
.btn-s:hover{opacity:.85}
.btn-apple{background:#fff;color:${b.dark}}
.btn-google{background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.2)}
.btn-lbl{font-size:10px;font-weight:500;opacity:.7;line-height:1;display:block}
.btn-nm{font-size:15px;font-weight:900;line-height:1.3;display:block}
.hero-note{color:rgba(255,255,255,.3);font-size:12px}
.hero-logo{margin-top:56px;display:flex;justify-content:center;align-items:center;opacity:.12}
.stats{background:${b.light};padding:28px 24px;display:flex;justify-content:center;gap:40px;flex-wrap:wrap}
.stat{text-align:center}
.stat-n{font-size:26px;font-weight:900;color:${b.dark};line-height:1}
.stat-l{font-size:12px;color:#777;margin-top:3px;font-weight:500}
section{padding:64px 24px;max-width:960px;margin:0 auto}
.s-lbl{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${b.primary};margin-bottom:10px}
.s-title{font-size:clamp(22px,3.5vw,32px);font-weight:900;color:${b.dark};letter-spacing:-0.8px;line-height:1.2;margin-bottom:14px}
.s-sub{font-size:15px;color:#666;max-width:500px;line-height:1.65;margin-bottom:44px}
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.feat{background:#fafafa;border-radius:18px;padding:26px;border:1.5px solid #f0f0f0}
.feat-icon{font-size:28px;margin-bottom:12px}
.feat h3{font-size:15px;font-weight:800;color:${b.dark};margin-bottom:7px}
.feat p{font-size:14px;color:#666;line-height:1.6}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:28px;margin-top:44px}
.step{text-align:center;padding:0 12px}
.step-n{width:48px;height:48px;background:${b.dark};color:#fff;border-radius:14px;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.step h3{font-size:15px;font-weight:800;color:${b.dark};margin-bottom:7px}
.step p{font-size:14px;color:#666;line-height:1.6}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;align-items:start;margin-top:0}
.cta-s{background:${b.dark};padding:64px 24px;text-align:center;position:relative;overflow:hidden}
.cta-s::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 100%,${b.primary}15 0%,transparent 60%)}
.cta-s h2{color:#fff;font-size:clamp(22px,3.5vw,32px);font-weight:900;letter-spacing:-0.8px;margin-bottom:12px}
.cta-s p{color:rgba(255,255,255,.55);font-size:15px;margin-bottom:32px}
footer{background:#0a0a0f;padding:28px 24px;text-align:center}
.f-links{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;margin-bottom:12px}
.f-links a{color:rgba(255,255,255,.35);font-size:12px;font-weight:600;text-decoration:none}
.f-links a:hover{color:rgba(255,255,255,.7)}
.f-copy{color:rgba(255,255,255,.18);font-size:11px}
@media(max-width:600px){header{padding:0 16px}.nav-hide{display:none}section{padding:44px 20px}.stats{gap:20px}.lang-sw-desk{display:none}.lang-sw-mob{display:block}}
</style>
</head>
<body>

<header>
  <a href="${b.appUrl}" style="display:flex;align-items:center;gap:10px;text-decoration:none">${b.headerLogo}</a>
  <div class="nav-links">
    <a href="#features" class="nav-hide">${t('nav_features')}</a>
    <a href="#pricing" class="nav-hide">${t('nav_pricing')}</a>
    <a href="${b.supportUrl}">${t('nav_support')}</a>
    <a href="${b.iosUrl}" class="nav-cta" style="display:none">${t('nav_download')}</a>
    <div class="lang-sw">${langSwitcher(lang, '/about')}</div>
  </div>
</header>

<div class="hero">
  <div class="eyebrow">${t('about_eyebrow')}</div>
  <h1>${t('about_h1_a')} <em>${t('about_h1_b')}</em></h1>
  <p class="hero-sub">${t('about_hero_sub')}</p>
  ${storeButtons(b, t)}
  <p class="hero-note">${t('about_hero_note')}</p>
  ${isNovaQI ? `<div class="hero-logo" style="margin-top:48px;display:flex;justify-content:center;align-items:center;gap:16px;opacity:.15">${NOVAQI_TARGET_ICON(120)}</div>` : ''}
</div>

<div class="stats">
  <div class="stat"><div class="stat-n">22</div><div class="stat-l">${t('about_stats_cats')}</div></div>
  <div class="stat"><div class="stat-n">6</div><div class="stat-l">${t('about_stats_diets')}</div></div>
  <div class="stat"><div class="stat-n">6</div><div class="stat-l">${t('about_stats_langs')}</div></div>
  <div class="stat"><div class="stat-n">AI</div><div class="stat-l">${t('about_stats_ai')}</div></div>
</div>

<section id="features">
  <div class="s-lbl">${t('about_feat_label')}</div>
  <h2 class="s-title">${t('about_feat_title')}</h2>
  <p class="s-sub">${t('about_feat_sub')}</p>
  <div class="feat-grid">
    <div class="feat"><div class="feat-icon">📷</div><h3>${t('feat1_title')}</h3><p>${t('feat1_body')}</p></div>
    <div class="feat"><div class="feat-icon">🤖</div><h3>${t('feat2_title')}</h3><p>${t('feat2_body')}</p></div>
    <div class="feat"><div class="feat-icon">🎯</div><h3>${t('feat3_title')}</h3><p>${t('feat3_body')}</p></div>
    <div class="feat"><div class="feat-icon">📋</div><h3>${t('feat4_title')}</h3><p>${t('feat4_body')}</p></div>
    <div class="feat"><div class="feat-icon">🔍</div><h3>${t('feat5_title')}</h3><p>${t('feat5_body')}</p></div>
    <div class="feat"><div class="feat-icon">🌍</div><h3>${t('feat6_title')}</h3><p>${t('feat6_body')}</p></div>
  </div>
</section>

<div style="background:#fafafa;padding:1px 0">
<section style="padding-top:48px">
  <div class="s-lbl">${t('about_diets_label')}</div>
  <h2 class="s-title">${t('about_diets_title')}</h2>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">${diets}</div>
</section>

<section style="padding-bottom:56px">
  <div class="s-lbl">${t('about_steps_label')}</div>
  <h2 class="s-title">${t('about_steps_title')}</h2>
  <div class="steps">
    <div class="step"><div class="step-n">1</div><h3>${t('step1_title')}</h3><p>${t('step1_body')}</p></div>
    <div class="step"><div class="step-n">2</div><h3>${t('step2_title')}</h3><p>${t('step2_body')}</p></div>
    <div class="step"><div class="step-n">3</div><h3>${t('step3_title')}</h3><p>${t('step3_body')}</p></div>
  </div>
</section>
</div>

<section id="pricing">
  <div class="s-lbl">${t('about_pricing_label')}</div>
  <h2 class="s-title">${t('about_pricing_title')}</h2>
  <p class="s-sub">${t('about_pricing_sub')}</p>
  <p style="font-size:13px;color:#999;margin-bottom:36px">${t('about_pricing_note')}</p>
  <div class="plans-grid">${plans}</div>
  <div style="text-align:center;margin-top:32px;display:none">
    <a href="${b.iosUrl}" style="display:inline-block;background:${b.dark};color:#fff;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:800;text-decoration:none">${t('plan_cta')}</a>
  </div>
  <p style="font-size:11px;color:#bbb;text-align:center;margin-top:20px;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.6">
    ${t('plan_legal')} · <a href="${b.termsUrl}" style="color:#bbb">${termsLabel}</a> · <a href="${b.privacyUrl}" style="color:#bbb">${tr(lang, 'privacy_link')}</a>
  </p>
</section>

<div class="cta-s">
  <h2>${t('about_cta_title')}</h2>
  <p>${t('about_cta_sub')}</p>
  ${storeButtons(b, t)}
</div>

<footer>
  <div class="f-links">
    <a href="${b.appUrl}/about">${b.name}</a>
    <a href="${b.supportUrl}">${t('nav_support')}</a>
    <a href="${b.termsUrl}">${termsLabel}</a>
    <a href="${b.privacyUrl}">${tr(lang, 'privacy_link')}</a>
    <a href="${b.appUrl}/legal/imprint">Imprint</a>
  </div>
  <div class="f-copy">© 2026 ${b.name} · ${t('about_footer_note')}</div>
</footer>
</body></html>`;
}
