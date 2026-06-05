const BRANDS = {
  veganland: {
    name:         'VeganLand',
    primary:      '#7CB518',
    dark:         '#1C2B22',
    contactEmail: 'contact@veganland.app',
    privacyUrl:   'https://veganland.app/legal/privacy',
    logo:         '🌱 VeganLand',
  },
  novaqi: {
    name:         'NovaQI',
    primary:      '#E8A020',
    dark:         '#1E1B4B',
    contactEmail: 'contact@novaqi.app',
    privacyUrl:   'https://novaqi.app/legal/privacy',
    logo:         '⬡ NovaQI',
  },
};

function getBrand(host) {
  return (host || '').includes('novaqi') ? BRANDS.novaqi : BRANDS.veganland;
}

export function htmlSupportPage(host) {
  const b = getBrand(host);
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Support — ${b.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#f5f5f7;color:#1a1a1a;line-height:1.6}
header{background:${b.dark};padding:18px 32px;display:flex;align-items:center}
header .logo{color:#fff;font-size:18px;font-weight:900;text-decoration:none;letter-spacing:-0.3px}
.wrap{max-width:560px;margin:48px auto;padding:0 20px 80px}
h1{font-size:26px;font-weight:900;color:${b.dark};margin-bottom:8px}
.sub{font-size:15px;color:#666;margin-bottom:36px}
label{display:block;font-size:13px;font-weight:700;color:#444;margin-bottom:6px;margin-top:20px}
input,select,textarea{width:100%;padding:12px 14px;border:1.5px solid #ddd;border-radius:10px;font-size:15px;font-family:inherit;background:#fff;color:#1a1a1a;transition:border 0.15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:${b.primary}}
textarea{min-height:120px;resize:vertical}
.check-wrap{display:flex;align-items:flex-start;gap:10px;margin-top:22px;cursor:pointer}
.check-wrap input[type=checkbox]{width:18px;height:18px;min-width:18px;margin-top:2px;accent-color:${b.dark};cursor:pointer}
.check-label{font-size:13px;color:#555;line-height:1.5}
.check-label a{color:${b.dark};font-weight:600}
.check-label .opt{font-size:12px;color:#999;font-weight:400}
button{margin-top:28px;width:100%;padding:15px;background:${b.dark};color:#fff;border:none;border-radius:12px;font-size:16px;font-weight:800;cursor:pointer;transition:opacity 0.15s}
button:hover{opacity:0.88}
button:disabled{opacity:0.45;cursor:not-allowed}
.error{color:#c0392b;font-size:13px;margin-top:8px;display:none}
.success{display:none;text-align:center;padding:48px 24px;background:#fff;border-radius:16px;border:1.5px solid #eee}
.success .icon{font-size:48px;margin-bottom:16px}
.success h2{font-size:22px;font-weight:900;color:${b.dark};margin-bottom:10px}
.success p{font-size:15px;color:#666}
</style>
</head><body>
<header><a class="logo" href="/">${b.logo}</a></header>
<div class="wrap">
  <h1>Support</h1>
  <p class="sub">Fill in the form and we'll get back to you as soon as possible.</p>

  <form id="form" novalidate>
    <input name="hp" style="display:none" tabindex="-1" autocomplete="off">

    <label for="name">Full name *</label>
    <input id="name" name="name" type="text" placeholder="Your name" autocomplete="name" required>

    <label for="email">Email address *</label>
    <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>

    <label for="topic">Topic *</label>
    <select id="topic" name="topic" required>
      <option value="" disabled selected>Select a topic…</option>
      <option value="Account &amp; Login">Account &amp; Login</option>
      <option value="Subscription &amp; Billing">Subscription &amp; Billing</option>
      <option value="Scan / Analysis issue">Scan / Analysis issue</option>
      <option value="Privacy &amp; Data">Privacy &amp; Data</option>
      <option value="Other">Other</option>
    </select>

    <label for="message">Message *</label>
    <textarea id="message" name="message" placeholder="Describe your issue or question…" required></textarea>

    <div class="check-wrap">
      <input type="checkbox" id="gdpr" name="gdpr" required>
      <label class="check-label" for="gdpr">
        I agree that ${b.name} may contact me to respond to this support request.
        I have read the <a href="${b.privacyUrl}" target="_blank">Privacy Policy</a>. *
      </label>
    </div>

    <div class="check-wrap">
      <input type="checkbox" id="marketing" name="marketing">
      <label class="check-label" for="marketing">
        I would like to receive product updates and news from ${b.name}.
        <span class="opt">(optional)</span>
      </label>
    </div>

    <p class="error" id="err">Please fill in all required fields and accept the privacy policy.</p>
    <button type="submit" id="btn">Send message</button>
  </form>

  <div class="success" id="success">
    <div class="icon">✅</div>
    <h2>Message received!</h2>
    <p>Thank you for reaching out. We'll reply to <span id="reply-email"></span> as soon as possible.</p>
  </div>
</div>
<script>
document.getElementById('form').addEventListener('submit', async function(e) {
  e.preventDefault();
  var f = e.target;
  var err = document.getElementById('err');
  err.style.display = 'none';

  if (!f.name.value.trim() || !f.email.value.trim() || !f.topic.value || !f.message.value.trim() || !f.gdpr.checked) {
    err.style.display = 'block';
    return;
  }

  var btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  try {
    var res = await fetch('/support/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hp:        f.hp.value,
        name:      f.name.value.trim(),
        email:     f.email.value.trim(),
        topic:     f.topic.value,
        message:   f.message.value.trim(),
        gdpr:      f.gdpr.checked,
        marketing: f.marketing.checked,
      }),
    });
    if (res.ok) {
      f.style.display = 'none';
      document.getElementById('reply-email').textContent = f.email.value.trim();
      document.getElementById('success').style.display = 'block';
    } else {
      btn.disabled = false;
      btn.textContent = 'Send message';
      err.textContent = 'Something went wrong. Please try again.';
      err.style.display = 'block';
    }
  } catch(_) {
    btn.disabled = false;
    btn.textContent = 'Send message';
    err.textContent = 'Network error. Please try again.';
    err.style.display = 'block';
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
