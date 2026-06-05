import { tr, LANGS, LANG_NAMES } from './web_i18n.js';

const BRANDS = {
  veganland: { name: 'VeganLand', primary: '#7CB518', dark: '#1C2B22', light: '#F0F7E6', appUrl: 'https://veganland.app', privacyUrl: 'https://veganland.app/legal/privacy', contactEmail: 'contact@veganland.app' },
  novaqi:    { name: 'NovaQI',    primary: '#E8A020', dark: '#1E1B4B', light: '#F0F0FA', appUrl: 'https://novaqi.app',    privacyUrl: 'https://novaqi.app/legal/privacy',    contactEmail: 'contact@novaqi.app' },
};

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

function langSwitcher(currentLang, path) {
  return LANGS.map(l =>
    `<a href="${path}?lang=${l}" style="color:${l === currentLang ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.4)'};font-size:12px;font-weight:${l === currentLang ? '800' : '600'};text-decoration:none;padding:4px 6px">${LANG_NAMES[l]}</a>`
  ).join('');
}

export function htmlSupportPage(host, lang) {
  const b = getBrand(host);
  const t = (key) => tr(lang, key);

  const gdprText = t('support_gdpr')
    .replace('{brand}', b.name)
    .replace('{privacy}', `<a href="${b.privacyUrl}" target="_blank" style="color:${b.dark};font-weight:600">${t('privacy_link')}</a>`);
  const marketingText = t('support_marketing').replace('{brand}', b.name);

  return `<!DOCTYPE html><html lang="${lang}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t('support_title')} — ${b.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#f5f5f7;color:#1a1a1a;line-height:1.6}
header{background:${b.dark};padding:0 32px;height:60px;display:flex;align-items:center;gap:16px}
.logo-wrap{display:flex;align-items:center;gap:10px;text-decoration:none}
.logo-name{color:#fff;font-size:18px;font-weight:900}
.lang-sw{display:flex;align-items:center;gap:2px;margin-left:auto;border-right:1px solid rgba(255,255,255,.15);padding-right:16px;margin-right:16px}
header nav a{color:rgba(255,255,255,.6);font-size:13px;font-weight:600;text-decoration:none}
header nav a:hover{color:#fff}
.wrap{max-width:560px;margin:48px auto;padding:0 20px 80px}
h1{font-size:26px;font-weight:900;color:${b.dark};margin-bottom:8px}
.sub{font-size:15px;color:#666;margin-bottom:36px}
label.field-label{display:block;font-size:13px;font-weight:700;color:#444;margin-bottom:6px;margin-top:20px}
input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:#1a1a1a;transition:border .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:${b.primary}}
textarea{min-height:120px;resize:vertical}
.check-wrap{display:flex;align-items:flex-start;gap:10px;margin-top:22px}
.check-wrap input[type=checkbox]{width:18px;height:18px;min-width:18px;margin-top:2px;accent-color:${b.dark};cursor:pointer}
.check-label{font-size:13px;color:#555;line-height:1.5}
.opt{font-size:12px;color:#999}
button{margin-top:28px;width:100%;padding:15px;background:${b.dark};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;transition:opacity .15s}
button:hover{opacity:.88}
button:disabled{opacity:.45;cursor:not-allowed}
.error{color:#c0392b;font-size:13px;margin-top:8px;display:none}
.success{display:none;text-align:center;padding:48px 24px;background:#fff;border-radius:16px;border:1.5px solid #eee}
.success .icon{font-size:48px;margin-bottom:16px}
.success h2{font-size:22px;font-weight:900;color:${b.dark};margin-bottom:10px}
.success p{font-size:15px;color:#666}
</style>
</head><body>
<header>
  <a class="logo-wrap" href="${b.appUrl}">
    <span class="logo-name">${b.name}</span>
  </a>
  <div class="lang-sw">${langSwitcher(lang, '/support')}</div>
  <nav><a href="${b.appUrl}/about">← ${b.name}</a></nav>
</header>
<div class="wrap">
  <h1>${t('support_title')}</h1>
  <p class="sub">${t('support_sub')}</p>

  <form id="form" novalidate>
    <input name="hp" style="display:none" tabindex="-1" autocomplete="off">

    <label class="field-label" for="name">${t('support_name')} *</label>
    <input id="name" name="name" type="text" placeholder="${t('support_name')}" autocomplete="name" required>

    <label class="field-label" for="email">${t('support_email')} *</label>
    <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>

    <label class="field-label" for="topic">${t('support_topic')} *</label>
    <select id="topic" name="topic" required>
      <option value="" disabled selected>${t('topic_placeholder')}</option>
      <option value="${t('topic_account')}">${t('topic_account')}</option>
      <option value="${t('topic_billing')}">${t('topic_billing')}</option>
      <option value="${t('topic_scan')}">${t('topic_scan')}</option>
      <option value="${t('topic_privacy')}">${t('topic_privacy')}</option>
      <option value="${t('topic_other')}">${t('topic_other')}</option>
    </select>

    <label class="field-label" for="message">${t('support_message')} *</label>
    <textarea id="message" name="message" placeholder="${t('support_message')}…" required></textarea>

    <div class="check-wrap">
      <input type="checkbox" id="gdpr" name="gdpr" required>
      <label class="check-label" for="gdpr">${gdprText} *</label>
    </div>

    <div class="check-wrap">
      <input type="checkbox" id="marketing" name="marketing">
      <label class="check-label" for="marketing">${marketingText} <span class="opt">(${t('support_optional')})</span></label>
    </div>

    <p class="error" id="err">${t('support_error_fields')}</p>
    <button type="submit" id="btn">${t('support_btn')}</button>
  </form>

  <div class="success" id="success">
    <div class="icon">✅</div>
    <h2>${t('support_thanks_title')}</h2>
    <p id="thanks-body"></p>
  </div>
</div>
<script>
var ERR_FIELDS = ${JSON.stringify(t('support_error_fields'))};
var ERR_NET    = ${JSON.stringify(t('support_error_net'))};
var ERR_SERVER = ${JSON.stringify(t('support_error_server'))};
var SENDING    = ${JSON.stringify(t('support_sending'))};
var BTN_LABEL  = ${JSON.stringify(t('support_btn'))};
var THANKS     = ${JSON.stringify(t('support_thanks_body'))};

document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var f = e.target, err = document.getElementById('err');
  err.style.display = 'none';
  if (!f.name.value.trim() || !f.email.value.trim() || !f.topic.value || !f.message.value.trim() || !f.gdpr.checked) {
    err.textContent = ERR_FIELDS; err.style.display = 'block'; return;
  }
  var btn = document.getElementById('btn');
  btn.disabled = true; btn.textContent = SENDING;
  try {
    var res = await fetch('/support/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hp: f.hp.value, name: f.name.value.trim(), email: f.email.value.trim(), topic: f.topic.value, message: f.message.value.trim(), gdpr: f.gdpr.checked, marketing: f.marketing.checked }),
    });
    if (res.ok) {
      f.style.display = 'none';
      document.getElementById('thanks-body').textContent = THANKS.replace('{email}', f.email.value.trim());
      document.getElementById('success').style.display = 'block';
    } else {
      btn.disabled = false; btn.textContent = BTN_LABEL;
      err.textContent = ERR_SERVER; err.style.display = 'block';
    }
  } catch(_) {
    btn.disabled = false; btn.textContent = BTN_LABEL;
    err.textContent = ERR_NET; err.style.display = 'block';
  }
});
</script>
</body></html>`;
}

export function getSupportRecipient(host) {
  return getBrand(host).contactEmail;
}

export function getSupportBrandName(host) {
  return getBrand(host).name;
}
