const BRANDS = {
  veganland: {
    name:         'VeganLand',
    tagline:      'Find vegan products with confidence.',
    description:  'VeganLand uses AI to scan product labels and instantly identify non-vegan, allergenic or unsuitable ingredients — based on your personal dietary profile.',
    primary:      '#7CB518',
    dark:         '#1C2B22',
    light:        '#F0F7E6',
    accent:       '#5A9A0A',
    logo:         '🌱',
    appUrl:       'https://veganland.app',
    privacyUrl:   'https://veganland.app/legal/privacy',
    termsUrl:     'https://veganland.app/legal/terms',
    supportUrl:   'https://veganland.app/support',
    iosUrl:       'https://apps.apple.com/app/veganland/id0000000001',
    androidUrl:   'https://play.google.com/store/apps/details?id=app.veganland',
    color2:       '#5A9A0A',
    heroText:     '#fff',
    plans: [
      { name: 'Free',    price: '€0',    period: '',       scans: '7 scans / month',   trial: false, features: ['7 product scans/month', 'AI ingredient analysis', 'All diets & allergens', '6 languages'] },
      { name: 'Starter', price: '€2.99', period: '/month', scans: '50 scans / month',  trial: true,  popular: true, features: ['50 product scans/month', 'Everything in Free', 'Scan history', 'Priority analysis'] },
      { name: 'Premium', price: '€5.49', period: '/month', scans: '100 scans / month', trial: true,  features: ['100 product scans/month', 'Everything in Starter', 'Unlimited history', 'Early access to new features'] },
    ],
  },
  novaqi: {
    name:         'NovaQI',
    tagline:      'Know exactly what\'s in your food.',
    description:  'NovaQI uses AI to instantly analyze product labels and tell you if they\'re safe for your diet and allergies — in seconds, in 6 languages.',
    primary:      '#E8A020',
    dark:         '#1E1B4B',
    light:        '#F0F0FA',
    accent:       '#F5A623',
    logo:         '⬡',
    appUrl:       'https://novaqi.app',
    privacyUrl:   'https://novaqi.app/legal/privacy',
    termsUrl:     'https://novaqi.app/legal/terms',
    supportUrl:   'https://novaqi.app/support',
    iosUrl:       'https://apps.apple.com/app/novaqi/id0000000000',
    androidUrl:   'https://play.google.com/store/apps/details?id=app.novaqi',
    color2:       '#E8A020',
    heroText:     '#fff',
    plans: [
      { name: 'Free',    price: '€0',    period: '',       scans: '7 scans / month',   trial: false, features: ['7 product scans/month', 'AI ingredient analysis', 'All diets & allergens', '6 languages'] },
      { name: 'Starter', price: '€3.99', period: '/month', scans: '50 scans / month',  trial: true,  popular: true, features: ['50 product scans/month', 'Everything in Free', 'Scan history', 'Priority analysis'] },
      { name: 'Premium', price: '€5.49', period: '/month', scans: '100 scans / month', trial: true,  features: ['100 product scans/month', 'Everything in Starter', 'Unlimited history', 'Early access to new features'] },
    ],
  },
};

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

function featureCard(icon, title, desc) {
  return `<div class="feat-card"><div class="feat-icon">${icon}</div><h3>${title}</h3><p>${desc}</p></div>`;
}

function planCard(b, plan) {
  const popular = plan.popular
    ? `<div class="plan-badge" style="background:${b.primary}">Most popular</div>` : '';
  const trial = plan.trial
    ? `<div class="trial-badge">15-day free trial</div>` : '';
  const features = plan.features.map(f => `<li>✓ ${f}</li>`).join('');
  const btnStyle = plan.popular
    ? `background:${b.dark};color:#fff`
    : `background:${b.light};color:${b.dark}`;
  return `
  <div class="plan-card${plan.popular ? ' plan-popular' : ''}" style="${plan.popular ? `border-color:${b.primary}` : ''}">
    ${popular}
    <div class="plan-name">${plan.name}</div>
    ${trial}
    <div class="plan-price">${plan.price}<span class="plan-period">${plan.period}</span></div>
    <div class="plan-scans">${plan.scans}</div>
    <ul class="plan-features">${features}</ul>
    <a href="${b.iosUrl}" class="plan-btn" style="${btnStyle}">${plan.trial ? 'Start free trial' : 'Get started free'}</a>
  </div>`;
}

export function htmlAboutPage(host) {
  const b = getBrand(host);
  const plans = b.plans.map(p => planCard(b, p)).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${b.name} — ${b.tagline}</title>
<meta name="description" content="${b.description}">
<meta property="og:title" content="${b.name}">
<meta property="og:description" content="${b.description}">
<meta property="og:url" content="${b.appUrl}/about">
<meta name="apple-itunes-app" content="app-id=0000000000">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#fff;color:#1a1a1a;line-height:1.6;-webkit-font-smoothing:antialiased}

/* Header */
header{position:sticky;top:0;z-index:100;background:${b.dark};padding:0 32px;height:60px;display:flex;align-items:center;gap:16px;box-shadow:0 2px 16px rgba(0,0,0,.18)}
.logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-icon{width:32px;height:32px;background:${b.primary};border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px}
.logo-name{color:#fff;font-size:18px;font-weight:900;letter-spacing:-0.4px}
header nav{display:flex;gap:24px;margin-left:auto;align-items:center}
header nav a{color:rgba(255,255,255,.6);font-size:13px;font-weight:600;text-decoration:none;transition:color .15s}
header nav a:hover{color:#fff}
.nav-cta{background:${b.primary};color:${b.dark} !important;padding:8px 18px;border-radius:8px;font-weight:800 !important;opacity:1 !important}
.nav-cta:hover{opacity:.88 !important}

/* Hero */
.hero{background:${b.dark};padding:72px 24px 88px;text-align:center;position:relative;overflow:hidden}
.hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 60% 0%, ${b.primary}22 0%, transparent 65%)}
.hero-eyebrow{display:inline-block;background:${b.primary}22;color:${b.primary};font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:20px}
.hero h1{color:#fff;font-size:clamp(32px,6vw,54px);font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:18px;max-width:700px;margin-left:auto;margin-right:auto}
.hero h1 span{color:${b.primary}}
.hero-sub{color:rgba(255,255,255,.65);font-size:clamp(15px,2.5vw,18px);max-width:520px;margin:0 auto 36px;line-height:1.6}
.hero-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.btn-store{display:inline-flex;align-items:center;gap:10px;padding:13px 22px;border-radius:12px;font-size:14px;font-weight:800;text-decoration:none;transition:opacity .15s}
.btn-store:hover{opacity:.88}
.btn-apple{background:#fff;color:${b.dark}}
.btn-google{background:rgba(255,255,255,.12);color:#fff;border:1.5px solid rgba(255,255,255,.25)}
.btn-store-icon{font-size:20px;line-height:1}
.btn-store-text{display:flex;flex-direction:column;line-height:1.2}
.btn-store-label{font-size:10px;font-weight:600;opacity:.65}
.btn-store-name{font-size:15px;font-weight:900}
.hero-note{color:rgba(255,255,255,.35);font-size:12px;margin-top:16px}

/* Phone mockup */
.mockup-wrap{margin-top:56px;display:flex;justify-content:center;gap:20px;position:relative}
.phone{width:200px;background:#0d0d1a;border-radius:36px;padding:12px;box-shadow:0 32px 80px rgba(0,0,0,.5);border:2px solid rgba(255,255,255,.08)}
.phone-inner{background:${b.light};border-radius:26px;overflow:hidden;aspect-ratio:9/19}
.phone-screen{padding:16px 12px;height:100%;display:flex;flex-direction:column;gap:8px}
.phone-bar{height:10px;border-radius:5px;background:${b.dark}18}
.phone-card{background:#fff;border-radius:12px;padding:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.phone-safe{background:#E8F5E9;border-radius:12px;padding:14px;text-align:center}
.phone-safe-icon{font-size:28px;margin-bottom:4px}
.phone-safe-text{font-size:11px;font-weight:800;color:#2E7D32}
.phone-chip{display:inline-block;background:#E8F5E9;color:#2E7D32;font-size:9px;font-weight:700;padding:3px 8px;border-radius:6px;margin:2px}
.phone-chip.warn{background:#FFF8E7;color:#B45309}

/* Stats bar */
.stats{background:${b.light};padding:32px 24px;display:flex;justify-content:center;gap:48px;flex-wrap:wrap}
.stat{text-align:center}
.stat-num{font-size:28px;font-weight:900;color:${b.dark};line-height:1}
.stat-label{font-size:13px;color:#666;margin-top:4px;font-weight:500}

/* Sections */
section{padding:72px 24px;max-width:1000px;margin:0 auto}
.section-label{font-size:12px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${b.primary};margin-bottom:12px}
.section-title{font-size:clamp(24px,4vw,36px);font-weight:900;color:${b.dark};letter-spacing:-0.8px;line-height:1.2;margin-bottom:16px}
.section-sub{font-size:16px;color:#666;max-width:520px;line-height:1.6;margin-bottom:48px}

/* Features */
.feat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.feat-card{background:#fafafa;border-radius:20px;padding:28px;border:1.5px solid #f0f0f0;transition:box-shadow .2s}
.feat-card:hover{box-shadow:0 8px 32px rgba(0,0,0,.08)}
.feat-icon{font-size:32px;margin-bottom:14px}
.feat-card h3{font-size:16px;font-weight:800;color:${b.dark};margin-bottom:8px}
.feat-card p{font-size:14px;color:#666;line-height:1.6}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:32px;margin-top:48px}
.step{text-align:center;padding:0 16px}
.step-num{width:52px;height:52px;background:${b.dark};color:#fff;border-radius:16px;font-size:22px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 16px}
.step h3{font-size:16px;font-weight:800;color:${b.dark};margin-bottom:8px}
.step p{font-size:14px;color:#666;line-height:1.6}
.step-connector{display:none}

/* Diets */
.diets-wrap{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
.diet-chip{display:inline-flex;align-items:center;gap:7px;background:${b.light};color:${b.dark};font-size:13px;font-weight:700;padding:8px 16px;border-radius:20px;border:1.5px solid ${b.primary}30}

/* Pricing */
#pricing{background:${b.light}}
#pricing > div{max-width:1000px;margin:0 auto;padding:72px 24px}
.pricing-note{font-size:13px;color:#888;margin-bottom:40px}
.plans-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;align-items:start}
.plan-card{background:#fff;border-radius:24px;padding:28px;border:2px solid #f0f0f0;position:relative;overflow:visible}
.plan-popular{border-color:${b.primary};box-shadow:0 8px 40px ${b.primary}25}
.plan-badge{position:absolute;top:-14px;left:50%;transform:translateX(-50%);color:#fff;font-size:11px;font-weight:800;padding:5px 14px;border-radius:10px;white-space:nowrap}
.trial-badge{display:inline-block;background:${b.primary}20;color:${b.accent};font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;margin-bottom:10px}
.plan-name{font-size:18px;font-weight:900;color:${b.dark};margin-bottom:4px}
.plan-price{font-size:36px;font-weight:900;color:${b.dark};line-height:1;margin:12px 0 4px}
.plan-period{font-size:15px;font-weight:600;color:#999}
.plan-scans{font-size:13px;color:#888;font-weight:600;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid #f0f0f0}
.plan-features{list-style:none;margin-bottom:24px;display:flex;flex-direction:column;gap:8px}
.plan-features li{font-size:14px;color:#444;font-weight:500}
.plan-btn{display:block;text-align:center;padding:14px;border-radius:14px;font-size:15px;font-weight:800;text-decoration:none;transition:opacity .15s}
.plan-btn:hover{opacity:.85}

/* Legal note */
.legal-note{font-size:11px;color:#aaa;text-align:center;margin-top:24px;line-height:1.6;max-width:560px;margin-left:auto;margin-right:auto}
.legal-note a{color:#aaa;text-decoration:underline}

/* CTA bottom */
.cta-section{background:${b.dark};padding:72px 24px;text-align:center}
.cta-section h2{color:#fff;font-size:clamp(24px,4vw,36px);font-weight:900;letter-spacing:-0.8px;margin-bottom:14px}
.cta-section p{color:rgba(255,255,255,.6);font-size:16px;margin-bottom:36px}

/* Footer */
footer{background:#0d0d0d;padding:32px 24px;text-align:center}
.footer-links{display:flex;justify-content:center;gap:24px;flex-wrap:wrap;margin-bottom:16px}
.footer-links a{color:rgba(255,255,255,.4);font-size:13px;font-weight:600;text-decoration:none}
.footer-links a:hover{color:rgba(255,255,255,.8)}
.footer-copy{color:rgba(255,255,255,.2);font-size:12px}

@media(max-width:640px){
  header{padding:0 16px}
  header nav .nav-hide{display:none}
  .stats{gap:28px}
  .mockup-wrap .phone:nth-child(2){display:none}
  #pricing > div, section{padding:48px 20px}
}
</style>
</head>
<body>

<header>
  <a class="logo-wrap" href="${b.appUrl}">
    <div class="logo-icon">${b.logo}</div>
    <span class="logo-name">${b.name}</span>
  </a>
  <nav>
    <a href="#features" class="nav-hide">Features</a>
    <a href="#pricing" class="nav-hide">Pricing</a>
    <a href="${b.supportUrl}">Support</a>
    <a href="${b.iosUrl}" class="nav-cta">Download</a>
  </nav>
</header>

<!-- Hero -->
<div class="hero">
  <div class="hero-eyebrow">AI-powered ingredient scanner</div>
  <h1>Know what's in your food. <span>Instantly.</span></h1>
  <p class="hero-sub">${b.description}</p>
  <div class="hero-btns">
    <a href="${b.iosUrl}" class="btn-store btn-apple">
      <span class="btn-store-icon"></span>
      <span class="btn-store-text">
        <span class="btn-store-label">Download on the</span>
        <span class="btn-store-name">App Store</span>
      </span>
    </a>
    <a href="${b.androidUrl}" class="btn-store btn-google">
      <span class="btn-store-icon">▶</span>
      <span class="btn-store-text">
        <span class="btn-store-label">Get it on</span>
        <span class="btn-store-name">Google Play</span>
      </span>
    </a>
  </div>
  <p class="hero-note">Free to download · 15-day trial on paid plans · No credit card required to start</p>

  <div class="mockup-wrap">
    <div class="phone">
      <div class="phone-inner">
        <div class="phone-screen">
          <div class="phone-bar" style="width:60%;background:${b.dark}30"></div>
          <div class="phone-safe">
            <div class="phone-safe-icon">✅</div>
            <div class="phone-safe-text">SAFE FOR YOUR DIET</div>
          </div>
          <div class="phone-card">
            <div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:6px">INGREDIENTS</div>
            <div><span class="phone-chip">Water</span><span class="phone-chip">Oats</span><span class="phone-chip warn">Milk</span><span class="phone-chip">Sugar</span><span class="phone-chip">Salt</span></div>
          </div>
          <div class="phone-card">
            <div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:4px">AI ANALYSIS</div>
            <div style="font-size:9px;color:#666;line-height:1.5">This product is suitable for your vegan profile. Contains milk — flagged for your lactose allergy.</div>
          </div>
        </div>
      </div>
    </div>
    <div class="phone" style="margin-top:32px;opacity:.7">
      <div class="phone-inner">
        <div class="phone-screen">
          <div class="phone-bar" style="width:40%;background:${b.dark}30"></div>
          <div style="background:${b.dark};border-radius:12px;padding:16px;text-align:center">
            <div style="font-size:24px;margin-bottom:6px">📷</div>
            <div style="font-size:10px;color:rgba(255,255,255,.7);font-weight:700">POINT AT LABEL</div>
          </div>
          <div class="phone-card">
            <div style="font-size:10px;font-weight:800;color:${b.dark};margin-bottom:4px">RECENT SCANS</div>
            <div style="display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:9px;color:#333;font-weight:600">Oat Milk</span><span style="font-size:8px;background:#E8F5E9;color:#2E7D32;padding:2px 6px;border-radius:5px;font-weight:800">SAFE</span></div>
              <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:9px;color:#333;font-weight:600">Chocolate Bar</span><span style="font-size:8px;background:#FFF8E7;color:#B45309;padding:2px 6px;border-radius:5px;font-weight:800">CAUTION</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Stats -->
<div class="stats">
  <div class="stat"><div class="stat-num">22</div><div class="stat-label">Allergen types</div></div>
  <div class="stat"><div class="stat-num">6</div><div class="stat-label">Diets supported</div></div>
  <div class="stat"><div class="stat-num">6</div><div class="stat-label">Languages</div></div>
  <div class="stat"><div class="stat-num">AI</div><div class="stat-label">Powered by Claude</div></div>
</div>

<!-- Features -->
<section id="features">
  <div class="section-label">Features</div>
  <h2 class="section-title">Everything you need to eat with confidence</h2>
  <p class="section-sub">Whether you have allergies, follow a specific diet, or just want to know what's in your food.</p>
  <div class="feat-grid">
    ${featureCard('📷', 'Scan any product', 'Point your camera at any ingredient label or barcode. Our AI reads and interprets it instantly — no manual typing needed.')}
    ${featureCard('🤖', 'AI-powered analysis', 'Powered by Claude AI, one of the most advanced language models available. Gets the context right, not just keywords.')}
    ${featureCard('🎯', 'Personalized results', 'Set your diet and allergies once. Every scan is instantly evaluated against your profile — SAFE, CAUTION, or NOT SAFE.')}
    ${featureCard('🌾', '22 allergen types', 'From the 14 major EU allergens to cosmetics and clothing sensitivities. The most comprehensive allergen coverage available.')}
    ${featureCard('📋', 'Ingredient breakdown', 'See every ingredient clearly listed and flagged. Know exactly which ingredient triggered a caution — not just that one did.')}
    ${featureCard('🌍', '6 languages', 'Available in English, Portuguese, German, French, Italian and Spanish. Switch language anytime, results adapt instantly.')}
  </div>
</section>

<!-- Diets -->
<section style="padding-top:0">
  <div class="section-label">Diet profiles</div>
  <h2 class="section-title">Supports all major dietary lifestyles</h2>
  <div class="diets-wrap">
    <div class="diet-chip">🌱 Vegan</div>
    <div class="diet-chip">🥗 Vegetarian</div>
    <div class="diet-chip">🐟 Pescatarian</div>
    <div class="diet-chip">🌾 Gluten-free</div>
    <div class="diet-chip">☪️ Halal</div>
    <div class="diet-chip">🍽️ Omnivore</div>
  </div>
</section>

<!-- How it works -->
<section style="background:#fafafa;padding:72px 0">
  <div style="max-width:1000px;margin:0 auto;padding:0 24px">
    <div class="section-label">How it works</div>
    <h2 class="section-title">Three steps to confidence</h2>
    <div class="steps">
      <div class="step">
        <div class="step-num" style="background:${b.dark}">1</div>
        <h3>Set your profile</h3>
        <p>Choose your diet and select any allergens you want to avoid. Takes 30 seconds, applies to every scan.</p>
      </div>
      <div class="step">
        <div class="step-num" style="background:${b.dark}">2</div>
        <h3>Scan a product</h3>
        <p>Point your camera at an ingredient label or barcode. No barcode? No problem — the AI reads the label directly.</p>
      </div>
      <div class="step">
        <div class="step-num" style="background:${b.dark}">3</div>
        <h3>Get your result</h3>
        <p>Instantly see if the product is SAFE, needs CAUTION, or is NOT SAFE for your profile — with a full explanation.</p>
      </div>
    </div>
  </div>
</section>

<!-- Pricing -->
<section id="pricing" style="padding:0">
  <div>
    <div class="section-label">Pricing</div>
    <h2 class="section-title">Simple, transparent pricing</h2>
    <p class="section-sub">Start free. Upgrade when you need more scans. Cancel anytime.</p>
    <p class="pricing-note">Paid plans include a 15-day free trial. No credit card required to start with the free plan.</p>
    <div class="plans-grid">${plans}</div>
    <p class="legal-note">
      Subscriptions renew automatically unless cancelled at least 24 hours before the end of the billing period.
      Payment charged to your account at purchase confirmation.
      Manage or cancel anytime in your account settings.
      <a href="${b.termsUrl}">Terms of Service</a> · <a href="${b.privacyUrl}">Privacy Policy</a>
    </p>
  </div>
</section>

<!-- Bottom CTA -->
<div class="cta-section">
  <h2>Ready to scan smarter?</h2>
  <p>Join thousands of people eating with more confidence every day.</p>
  <div class="hero-btns">
    <a href="${b.iosUrl}" class="btn-store btn-apple">
      <span class="btn-store-icon"></span>
      <span class="btn-store-text">
        <span class="btn-store-label">Download on the</span>
        <span class="btn-store-name">App Store</span>
      </span>
    </a>
    <a href="${b.androidUrl}" class="btn-store btn-google">
      <span class="btn-store-icon">▶</span>
      <span class="btn-store-text">
        <span class="btn-store-label">Get it on</span>
        <span class="btn-store-name">Google Play</span>
      </span>
    </a>
  </div>
</div>

<footer>
  <div class="footer-links">
    <a href="${b.appUrl}/about">${b.name}</a>
    <a href="${b.supportUrl}">Support</a>
    <a href="${b.termsUrl}">Terms</a>
    <a href="${b.privacyUrl}">Privacy</a>
    <a href="${b.appUrl}/legal/imprint">Imprint</a>
  </div>
  <div class="footer-copy">© 2026 ${b.name} · AI-powered ingredient analysis · Not a medical device</div>
</footer>

</body></html>`;
}
