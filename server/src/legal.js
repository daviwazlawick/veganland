const PRIMARY_COLOR = '#7CB518';
const DARK = '#1C2B22';

const OWNER_NAME    = process.env.LEGAL_OWNER_NAME    || 'Davi Augusto Wazlawick';
const OWNER_ADDRESS = process.env.LEGAL_OWNER_ADDRESS || '4 Frankfurter Allee, 10247 Berlin, Germany';
const OWNER_EMAIL   = process.env.LEGAL_OWNER_EMAIL   || 'contact@veganland.app';
const CONTACT_EMAIL = process.env.CONTACT_EMAIL       || 'contact@veganland.app';
const APP_URL       = process.env.APP_URL              || 'https://veganland.app';

const LAST_UPDATED = '20 May 2026';

function shell(title, body) {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — VeganLand</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif;background:#fafafa;color:#222;line-height:1.7}
header{background:${DARK};padding:20px 32px;display:flex;align-items:center;gap:14px}
header .logo{color:#fff;font-size:20px;font-weight:900;text-decoration:none}
header nav{display:flex;gap:20px;margin-left:auto}
header nav a{color:rgba(255,255,255,.65);font-size:13px;font-weight:600;text-decoration:none}
header nav a:hover{color:#fff}
.hero{background:${DARK};padding:40px 32px 50px;text-align:center}
.hero h1{color:#fff;font-size:28px;font-weight:900;margin-bottom:8px}
.hero p{color:rgba(255,255,255,.6);font-size:14px}
main{max-width:780px;margin:-24px auto 0;padding:0 24px 60px;position:relative}
.card{background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,.07)}
.warn{background:#FFF8E7;border:1.5px solid #F2C94C;border-radius:14px;padding:16px 20px;margin-bottom:28px;font-size:14px;color:#7A5C00;font-weight:600}
.warn strong{display:block;margin-bottom:4px;font-size:15px}
h2{font-size:19px;font-weight:800;color:${DARK};margin:32px 0 10px}
h2:first-child{margin-top:0}
h3{font-size:15px;font-weight:700;color:#444;margin:18px 0 6px}
p{font-size:15px;color:#444;margin-bottom:12px}
ul,ol{padding-left:22px;margin-bottom:12px}
li{font-size:15px;color:#444;margin-bottom:5px}
a{color:${PRIMARY_COLOR};text-decoration:none}
a:hover{text-decoration:underline}
.chip{display:inline-block;background:#EEF5E8;color:${DARK};font-size:12px;font-weight:800;padding:4px 10px;border-radius:7px;margin:2px}
.updated{font-size:12px;color:#aaa;text-align:right;margin-top:28px;padding-top:16px;border-top:1px solid #f0f0f0}
footer{text-align:center;padding:24px;font-size:12px;color:#aaa}
footer a{color:#aaa}
@media(max-width:600px){.card{padding:24px}.hero{padding:28px 20px 40px}.hero h1{font-size:22px}}
</style></head>
<body>
<header>
  <a class="logo" href="${APP_URL}">🌱 VeganLand</a>
  <nav>
    <a href="/legal/terms">Terms</a>
    <a href="/legal/privacy">Privacy</a>
    <a href="/legal/imprint">Imprint</a>
  </nav>
</header>
<div class="hero"><h1>${title}</h1><p>Last updated: ${LAST_UPDATED}</p></div>
<main><div class="card">${body}<p class="updated">Last updated: ${LAST_UPDATED}</p></div></main>
<footer>© 2026 VeganLand · <a href="/legal/terms">Terms</a> · <a href="/legal/privacy">Privacy Policy</a> · <a href="/legal/imprint">Imprint</a></footer>
</body></html>`;
}

export function htmlTerms() {
  return shell('Terms of Service', `
<div class="warn">
  <strong>⚠️ Important — Please read before using VeganLand</strong>
  VeganLand is an <strong>entertainment and food-discovery tool</strong>. It is <strong>not</strong> a medical device, not a certified allergy-safety system, and must never be relied upon to protect anyone from allergic reactions or other health risks. Always read the physical product label.
</div>

<h2>1. About VeganLand</h2>
<p>VeganLand ("the App", "the Service") is operated by <strong>${OWNER_NAME}</strong> (see <a href="/legal/imprint">Imprint</a>). It uses artificial intelligence to analyse photos or barcodes of food products and provides information about ingredients relative to a user-defined dietary profile.</p>

<h2>2. Not Medical Advice — Critical Disclaimer</h2>
<p>THE INFORMATION PROVIDED BY VEGANLAND IS FOR <strong>ENTERTAINMENT AND GENERAL FOOD-DISCOVERY PURPOSES ONLY</strong>. It does not constitute medical, nutritional, or allergy-safety advice.</p>
<ul>
  <li>AI-generated results <strong>may be incomplete, inaccurate, or outdated</strong>.</li>
  <li>Product recipes and ingredients change without notice. The App may not reflect the latest formulation.</li>
  <li>VeganLand <strong>must not be used</strong> as the sole or primary method of determining whether a product is safe for consumption by individuals with food allergies, intolerances, or medical conditions.</li>
  <li>If you have a <strong>life-threatening allergy or serious medical condition</strong>, always consult the product label, the manufacturer, and a qualified medical professional.</li>
  <li>The operator assumes <strong>no liability</strong> for any harm, injury, allergic reaction, or adverse health event resulting from reliance on the App's output.</li>
</ul>

<h2>3. Eligibility</h2>
<p>You must be at least 16 years of age to create an account. By registering, you confirm that you meet this requirement. Users under 18 should obtain parental consent.</p>

<h2>4. Your Account</h2>
<ul>
  <li>You are responsible for keeping your login credentials confidential.</li>
  <li>You must provide a valid email address. We may suspend accounts using false information.</li>
  <li>You may delete your account at any time by contacting us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</li>
</ul>

<h2>5. Acceptable Use</h2>
<p>You agree not to:</p>
<ul>
  <li>Use the App for any unlawful purpose or in violation of any applicable laws.</li>
  <li>Attempt to reverse-engineer, scrape, or overload the Service.</li>
  <li>Upload content that is illegal, offensive, or infringes third-party rights.</li>
  <li>Resell or redistribute access to the Service without written permission.</li>
</ul>

<h2>6. AI-Generated Content</h2>
<p>Results are generated by a third-party AI model (Anthropic Claude). The operator does not guarantee the accuracy, completeness, or fitness for any purpose of AI-generated output. Ingredient analysis is probabilistic and inherently fallible.</p>
<p>Product data may additionally be sourced from Open Food Facts (openfoodfacts.org), a community-edited database. The operator is not responsible for errors in that database.</p>

<h2>7. Scan Limits</h2>
<p>Free accounts are currently limited to <strong>50 scans per calendar month</strong>. This limit may change with notice.</p>

<h2>8. Intellectual Property</h2>
<p>All design, code, branding, and original content in the App are the property of the operator. User-submitted photos remain the property of the user; by uploading them you grant the operator a limited, non-exclusive licence to process them for the purpose of providing the Service.</p>

<h2>9. Third-Party Services</h2>
<p>The App relies on:</p>
<ul>
  <li><strong>Anthropic, Inc.</strong> — AI inference (Claude API). <a href="https://www.anthropic.com/privacy" target="_blank">Privacy Policy</a></li>
  <li><strong>Open Food Facts</strong> — product database. <a href="https://world.openfoodfacts.org/privacy" target="_blank">Privacy Policy</a></li>
</ul>
<p>We are not responsible for the practices or content of these third-party services.</p>

<h2>10. Limitation of Liability</h2>
<p>To the maximum extent permitted by applicable law, the operator shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of health, loss of data, or personal injury, arising from your use of the App.</p>
<p>The App is provided <strong>"as is"</strong> and <strong>"as available"</strong> without warranties of any kind.</p>

<h2>11. Changes to These Terms</h2>
<p>We may update these Terms at any time. Continued use of the App after changes are posted constitutes acceptance of the updated Terms. We will notify you of material changes via the App or email.</p>

<h2>12. Governing Law & Jurisdiction</h2>
<p>These Terms are governed by the laws of the <strong>Federal Republic of Germany</strong>. Any disputes shall be subject to the exclusive jurisdiction of the competent courts in Germany, unless mandatory consumer protection law in your country provides otherwise.</p>
<p>The European Commission provides an online dispute resolution (ODR) platform: <a href="https://ec.europa.eu/consumers/odr" target="_blank">ec.europa.eu/consumers/odr</a>. We are not obliged to participate in dispute resolution proceedings before a consumer arbitration board, but are willing to do so.</p>

<h2>13. Contact</h2>
<p>Questions about these Terms: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></p>
`);
}

export function htmlPrivacy() {
  return shell('Privacy Policy', `
<h2>1. Data Controller</h2>
<p>The data controller responsible for processing your personal data is:</p>
<p><strong>${OWNER_NAME}</strong><br>${OWNER_ADDRESS}<br>Email: <a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a></p>

<h2>2. What Data We Collect</h2>
<h3>Account Data</h3>
<ul>
  <li><strong>Email address</strong> — required to create an account and for password reset.</li>
  <li><strong>Password</strong> — stored as a one-way bcrypt hash. We never store your plaintext password.</li>
</ul>
<h3>Profile Data (optional)</h3>
<ul>
  <li>Dietary preference (e.g. vegan, vegetarian)</li>
  <li>Dietary sensitivities / allergies you choose to declare</li>
  <li>Display name and short bio</li>
  <li>Profile photo (stored locally on your device, not uploaded to our servers)</li>
</ul>
<p><em>Note: Dietary and allergy information may constitute health-related data under GDPR Article 9. We process it solely to provide personalised analysis results, based on your <strong>explicit consent</strong> given during onboarding.</em></p>
<h3>Usage Data</h3>
<ul>
  <li>Scan history: product name, analysis result, timestamp, source (barcode / image / database)</li>
  <li>Monthly scan counter (to enforce usage limits)</li>
  <li>Anonymised server logs (IP address, timestamp, HTTP method — retained max 7 days)</li>
</ul>
<h3>Product Images</h3>
<p>Photos you take or upload are sent to <strong>Anthropic's API</strong> for AI analysis and are <strong>not stored</strong> on our servers after the analysis is complete. Anthropic's data handling is governed by their <a href="https://www.anthropic.com/privacy" target="_blank">Privacy Policy</a>.</p>

<h2>3. How We Use Your Data</h2>
<ul>
  <li>To provide, operate, and improve the Service</li>
  <li>To personalise scan results based on your dietary profile</li>
  <li>To enforce usage limits</li>
  <li>To send transactional emails (account confirmation, password reset) — no marketing emails without separate consent</li>
  <li>To comply with legal obligations</li>
</ul>

<h2>4. Legal Basis (GDPR Art. 6 & 9)</h2>
<ul>
  <li><strong>Contract performance (Art. 6(1)(b))</strong> — account data and scan history, necessary to provide the Service</li>
  <li><strong>Explicit consent (Art. 6(1)(a) + Art. 9(2)(a))</strong> — dietary and allergy/sensitivity data (special category health data)</li>
  <li><strong>Legitimate interest (Art. 6(1)(f))</strong> — anonymised server logs for security and abuse prevention</li>
  <li><strong>Legal obligation (Art. 6(1)(c))</strong> — where required by applicable law</li>
</ul>

<h2>5. Data Sharing & Third Parties</h2>
<p>We do <strong>not sell</strong> your personal data. We share data only as follows:</p>
<ul>
  <li><strong>Anthropic, Inc. (USA)</strong> — receives product images for AI analysis. Transfer is based on Anthropic's Standard Contractual Clauses. See <a href="https://www.anthropic.com/privacy" target="_blank">Anthropic Privacy Policy</a>.</li>
  <li><strong>Open Food Facts</strong> — we query their public API using a barcode or product name (no personal data sent).</li>
  <li><strong>Hosting provider</strong> — our server infrastructure provider processes data as a data processor under a data processing agreement.</li>
</ul>

<h2>6. Data Retention</h2>
<ul>
  <li><strong>Account data</strong>: retained until you delete your account, plus up to 30 days for backup purposes.</li>
  <li><strong>Scan history</strong>: retained as long as your account is active, or until you request deletion.</li>
  <li><strong>Server logs</strong>: maximum 7 days, then automatically deleted.</li>
  <li><strong>Product images</strong>: not retained after AI analysis (processed in memory only).</li>
</ul>

<h2>7. Your Rights Under GDPR</h2>
<p>You have the right to:</p>
<ul>
  <li><span class="chip">Access</span> Request a copy of all personal data we hold about you</li>
  <li><span class="chip">Rectification</span> Correct inaccurate or incomplete data</li>
  <li><span class="chip">Erasure</span> Request deletion of your account and all associated data ("right to be forgotten")</li>
  <li><span class="chip">Portability</span> Receive your data in a structured, machine-readable format</li>
  <li><span class="chip">Restriction</span> Ask us to pause processing while a dispute is resolved</li>
  <li><span class="chip">Objection</span> Object to processing based on legitimate interest</li>
  <li><span class="chip">Withdraw consent</span> Withdraw your consent for special-category data at any time (this may limit functionality)</li>
</ul>
<p>To exercise any right, email <a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a>. We will respond within <strong>30 days</strong>.</p>
<p>You also have the right to lodge a complaint with your national data protection supervisory authority. In Germany: <a href="https://www.bfdi.bund.de" target="_blank">Bundesbeauftragter für den Datenschutz (BfDI)</a>.</p>

<h2>8. Security</h2>
<p>We implement industry-standard security measures including HTTPS/TLS encryption in transit, bcrypt password hashing, and restricted database access. No system is completely secure; we cannot guarantee absolute security.</p>

<h2>9. International Transfers</h2>
<p>Product images are processed by Anthropic in the United States. This transfer is made under appropriate safeguards (Standard Contractual Clauses). No other personal data is transferred outside the EU/EEA.</p>

<h2>10. Children's Privacy</h2>
<p>The Service is not directed at children under 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data from a child, contact us immediately.</p>

<h2>11. Cookies</h2>
<p>The mobile app does not use cookies. Our web pages (terms, privacy, password reset) use no tracking cookies — only essential browser behaviour.</p>

<h2>12. Changes to This Policy</h2>
<p>We will notify you of material changes via email or in-app notification at least 14 days before they take effect.</p>

<h2>13. Contact & Data Protection Enquiries</h2>
<p><strong>${OWNER_NAME}</strong><br>${OWNER_ADDRESS}<br><a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a></p>
`);
}

export function htmlImprint() {
  return shell('Imprint (Impressum)', `
<h2>Angaben gemäß § 5 DDG / Information according to § 5 DDG</h2>

<h3>Responsible for content / Verantwortlicher</h3>
<p>
  <strong>${OWNER_NAME}</strong><br>
  ${OWNER_ADDRESS}<br>
  Germany
</p>

<h3>Contact / Kontakt</h3>
<p>Email: <a href="mailto:${OWNER_EMAIL}">${OWNER_EMAIL}</a></p>

<h2>Disclaimer of Liability</h2>
<h3>Content</h3>
<p>The operator has compiled the content of this website with the greatest possible care. However, no guarantee is given for the accuracy, completeness, or timeliness of the information provided. The operator is not liable for any damage arising from the use of this website.</p>

<h3>AI-Generated Results</h3>
<p>VeganLand uses artificial intelligence to analyse food products. Results are <strong>not</strong> medical advice and may be inaccurate. The operator accepts no liability for harm arising from reliance on AI-generated analysis. Always read the physical product label.</p>

<h3>External Links</h3>
<p>This website contains links to external third-party websites. The operator has no influence over the content of those sites and accepts no liability for them. The respective providers of those sites are responsible for their content.</p>

<h2>Online Dispute Resolution (EU)</h2>
<p>The European Commission provides an online dispute resolution platform: <a href="https://ec.europa.eu/consumers/odr" target="_blank">https://ec.europa.eu/consumers/odr</a></p>
<p>We are not obliged to participate in dispute resolution proceedings before a consumer arbitration body, but are willing to do so.</p>

<h2>Copyright</h2>
<p>All content and works on this website created by the operator are subject to German copyright law. Duplication, processing, distribution, or any form of commercialisation beyond the scope of copyright law requires the prior written consent of the operator.</p>
`);
}
