import './env.js';
import nodemailer from 'nodemailer';
import { getPool } from './db.js';
import { unsubscribeUrl } from './unsubscribe.js';

// Decaying-cadence email nudges: day 1, 3, 7, 14 since the user became
// eligible (or since the previous nudge), then the sequence stops for good.
// Deliberately capped and throttled — a burst of ~310 sequential sends once
// tripped Hostinger's outbound limiter and broke transactional email
// site-wide (confirmations, resets) for hours. Never repeat that: hard cap
// per run, a real pause between sends, and a circuit breaker that aborts
// the whole run the moment Hostinger signals it's throttling us.
const STAGE_DELAY_DAYS = { 1: 1, 2: 3, 3: 7, 4: 14 };
const MAX_STAGE = 4;
const MAX_EMAILS_PER_RUN = 12;
const SEND_DELAY_MS = 1800;

const CTA = {
  first_scan:    { pt: 'Fazer o scan',        en: 'Try a scan',           de: 'Jetzt scannen',         fr: 'Scanner maintenant',      it: 'Scansiona ora',        es: 'Escanear ahora' },
  body_profile:  { pt: 'Configurar perfil',   en: 'Set up my profile',   de: 'Profil einrichten',      fr: 'Configurer mon profil',   it: 'Configura il profilo', es: 'Configurar mi perfil' },
};

const CONTENT = {
  first_scan: {
    1: {
      pt: { subject: 'O que está mesmo dentro do teu snack favorito?', body: 'Criaste a tua conta no NovaQI mas ainda não fizeste o primeiro scan. Aponta a câmara a qualquer rótulo ou código de barras e descobre em segundos se o produto combina com a tua dieta. É grátis.' },
      en: { subject: "What's really inside your favorite snack?", body: "You created your NovaQI account but haven't tried a scan yet. Point your camera at any label or barcode and find out in seconds if the product fits your diet. It's free." },
      de: { subject: 'Was steckt wirklich in deinem Lieblingssnack?', body: 'Du hast dein NovaQI-Konto erstellt, aber noch nicht gescannt. Richte die Kamera auf ein Etikett oder einen Barcode und erfahre in Sekunden, ob das Produkt zu deiner Ernährung passt. Kostenlos.' },
      fr: { subject: "Que contient vraiment ton snack préféré ?", body: "Tu as créé ton compte NovaQI mais tu n'as pas encore essayé le scan. Pointe la caméra vers une étiquette ou un code-barres et découvre en quelques secondes si le produit te convient. C'est gratuit." },
      it: { subject: 'Cosa contiene davvero il tuo snack preferito?', body: 'Hai creato il tuo account NovaQI ma non hai ancora provato la scansione. Inquadra un\'etichetta o un codice a barre e scopri in pochi secondi se il prodotto fa per te. È gratis.' },
      es: { subject: '¿Qué hay realmente en tu snack favorito?', body: 'Creaste tu cuenta en NovaQI pero aún no has probado el escaneo. Apunta la cámara a cualquier etiqueta o código de barras y descubre en segundos si el producto encaja en tu dieta. Es gratis.' },
    },
    2: {
      pt: { subject: 'Leva 5 segundos (a sério)', body: 'Sem digitar nada: tira uma foto do código de barras ou do rótulo e o NovaQI faz o resto — ingredientes, alergénios e se combina com o teu perfil. Continua 100% grátis.' },
      en: { subject: 'It takes 5 seconds (seriously)', body: 'No typing needed: snap a photo of the barcode or label and NovaQI does the rest — ingredients, allergens, and whether it fits your profile. Still 100% free.' },
      de: { subject: 'Dauert 5 Sekunden (ernsthaft)', body: 'Kein Tippen nötig: Foto vom Barcode oder Etikett machen, NovaQI erledigt den Rest — Zutaten, Allergene und ob es zu deinem Profil passt. Weiterhin 100% kostenlos.' },
      fr: { subject: 'Ça prend 5 secondes (vraiment)', body: "Rien à taper : prends en photo le code-barres ou l'étiquette, NovaQI fait le reste — ingrédients, allergènes, et si ça te convient. Toujours 100% gratuit." },
      it: { subject: 'Ci vogliono 5 secondi (davvero)', body: "Niente da digitare: fotografa il codice a barre o l'etichetta e NovaQI fa il resto — ingredienti, allergeni e se è adatto a te. Sempre gratis al 100%." },
      es: { subject: 'Toma 5 segundos (en serio)', body: 'Sin escribir nada: toma una foto del código de barras o la etiqueta y NovaQI hace el resto — ingredientes, alérgenos y si encaja en tu perfil. Sigue siendo 100% gratis.' },
    },
    3: {
      pt: { subject: 'Alergénios escondidos em letras minúsculas', body: 'Muitos rótulos escondem traços de alergénios em letra pequena. O scan do NovaQI lê tudo por ti e avisa-te antes de comeres — grátis, sem letras miúdas para ti decifrar.' },
      en: { subject: 'Allergens hiding in tiny print', body: 'Plenty of labels bury allergen traces in fine print. NovaQI\'s scan reads all of it for you and warns you before you eat — free, no fine print for you to decode.' },
      de: { subject: 'Allergene im Kleingedruckten', body: 'Viele Etiketten verstecken Allergenspuren im Kleingedruckten. Der NovaQI-Scan liest alles für dich und warnt dich vorher — kostenlos, ohne dass du selbst entziffern musst.' },
      fr: { subject: 'Des allergènes cachés en petits caractères', body: "Beaucoup d'étiquettes cachent des traces d'allergènes en petits caractères. Le scan NovaQI lit tout pour toi et t'avertit avant de manger — gratuit, sans rien à déchiffrer." },
      it: { subject: 'Allergeni nascosti in caratteri minuscoli', body: "Molte etichette nascondono tracce di allergeni in caratteri minuscoli. La scansione NovaQI legge tutto per te e ti avvisa prima di mangiare — gratis, senza nulla da decifrare." },
      es: { subject: 'Alérgenos escondidos en letra pequeña', body: 'Muchas etiquetas esconden trazas de alérgenos en letra diminuta. El escaneo de NovaQI lo lee todo por ti y te avisa antes de comer — gratis, sin letra pequeña que descifrar.' },
    },
    4: {
      pt: { subject: 'Última vez que te escrevemos sobre isto 👋', body: 'Não queremos encher a tua caixa de entrada — esta é a última vez que te lembramos. O teu primeiro scan continua grátis e à espera, sempre que quiseres experimentar.' },
      en: { subject: 'Last time we write about this 👋', body: "We don't want to fill your inbox — this is the last reminder. Your first scan is still free and waiting, whenever you feel like trying it." },
      de: { subject: 'Letzte Erinnerung dazu 👋', body: 'Wir wollen dein Postfach nicht überladen — das ist die letzte Erinnerung. Dein erster Scan ist weiterhin kostenlos und wartet auf dich, wann immer du magst.' },
      fr: { subject: 'Dernier message à ce sujet 👋', body: "On ne veut pas surcharger ta boîte mail — c'est le dernier rappel. Ton premier scan reste gratuit et t'attend, quand tu voudras essayer." },
      it: { subject: 'Ultimo promemoria su questo 👋', body: 'Non vogliamo riempire la tua casella — questo è l\'ultimo promemoria. La tua prima scansione resta gratis e ti aspetta, quando vorrai provarla.' },
      es: { subject: 'Último recordatorio sobre esto 👋', body: 'No queremos llenar tu bandeja de entrada — este es el último recordatorio. Tu primer escaneo sigue siendo gratis y te espera, cuando quieras probarlo.' },
    },
  },
  body_profile: {
    1: {
      pt: { subject: 'As tuas metas de calorias, feitas à tua medida', body: 'Ainda não configuraste o teu perfil corporal. Leva 1 minuto e o NovaQI calcula metas de calorias e macros pensadas para ti — grátis.' },
      en: { subject: 'Your calorie goals, made to fit you', body: "You haven't set up your body profile yet. It takes 1 minute and NovaQI calculates calorie and macro goals built around you — free." },
      de: { subject: 'Deine Kalorienziele, auf dich zugeschnitten', body: 'Du hast dein Körperprofil noch nicht eingerichtet. Es dauert 1 Minute, und NovaQI berechnet Kalorien- und Makroziele nur für dich — kostenlos.' },
      fr: { subject: 'Tes objectifs caloriques, sur mesure', body: "Tu n'as pas encore configuré ton profil corporel. Ça prend 1 minute et NovaQI calcule des objectifs caloriques et macro rien que pour toi — gratuit." },
      it: { subject: 'I tuoi obiettivi calorici, su misura', body: 'Non hai ancora configurato il tuo profilo corporeo. Basta 1 minuto e NovaQI calcola obiettivi calorici e di macro pensati per te — gratis.' },
      es: { subject: 'Tus metas de calorías, a tu medida', body: 'Aún no has configurado tu perfil corporal. Toma 1 minuto y NovaQI calcula metas de calorías y macros pensadas para ti — gratis.' },
    },
    2: {
      pt: { subject: 'Sabes quantas calorias precisas por dia?', body: 'Sem perfil corporal, só mostramos números genéricos. Com ele, as metas são calculadas com a tua altura, peso, idade e objetivo. Grátis, leva 1 minuto.' },
      en: { subject: 'Do you know your daily calorie need?', body: "Without a body profile we can only show generic numbers. With one, your goals are calculated from your height, weight, age and target. Free, takes 1 minute." },
      de: { subject: 'Kennst du deinen täglichen Kalorienbedarf?', body: 'Ohne Körperprofil zeigen wir nur generische Zahlen. Damit werden deine Ziele aus Größe, Gewicht, Alter und Ziel berechnet. Kostenlos, dauert 1 Minute.' },
      fr: { subject: 'Connais-tu tes besoins caloriques ?', body: "Sans profil corporel, on ne peut montrer que des chiffres génériques. Avec, tes objectifs sont calculés selon ta taille, ton poids, ton âge et ton but. Gratuit, 1 minute." },
      it: { subject: 'Conosci il tuo fabbisogno calorico?', body: 'Senza profilo corporeo mostriamo solo numeri generici. Con esso, gli obiettivi sono calcolati su altezza, peso, età e obiettivo. Gratis, basta 1 minuto.' },
      es: { subject: '¿Sabes cuántas calorías necesitas al día?', body: 'Sin perfil corporal solo mostramos números genéricos. Con él, tus metas se calculan según tu altura, peso, edad y objetivo. Gratis, toma 1 minuto.' },
    },
    3: {
      pt: { subject: 'Queima calorias? Vê o equivalente em exercício', body: 'Com o perfil corporal configurado, cada produto mostra quantos minutos de corrida ou caminhada equivalem às calorias. Configura grátis.' },
      en: { subject: 'Curious how much exercise burns it off?', body: 'With your body profile set up, every product shows how many minutes of running or walking match its calories. Set it up for free.' },
      de: { subject: 'Wie viel Sport verbrennt das eigentlich?', body: 'Mit eingerichtetem Körperprofil zeigt jedes Produkt, wie viele Minuten Laufen oder Gehen den Kalorien entsprechen. Kostenlos einrichten.' },
      fr: { subject: "Curieux de savoir combien d'exercice ça représente ?", body: "Avec ton profil corporel configuré, chaque produit indique combien de minutes de course ou de marche équivalent à ses calories. Configure-le gratuitement." },
      it: { subject: 'Quanto esercizio serve per bruciarlo?', body: 'Con il profilo corporeo configurato, ogni prodotto mostra quanti minuti di corsa o camminata equivalgono alle sue calorie. Configuralo gratis.' },
      es: { subject: '¿Cuánto ejercicio hace falta para quemarlo?', body: 'Con tu perfil corporal configurado, cada producto muestra cuántos minutos de carrera o caminata equivalen a sus calorías. Configúralo gratis.' },
    },
    4: {
      pt: { subject: 'Última vez que te escrevemos sobre isto 👋', body: 'É a última vez que te lembramos — o teu perfil corporal grátis continua à espera, sempre que quiseres.' },
      en: { subject: 'Last time we write about this 👋', body: "This is the last reminder — your free body profile is still there whenever you feel like setting it up." },
      de: { subject: 'Letzte Erinnerung dazu 👋', body: 'Das ist die letzte Erinnerung — dein kostenloses Körperprofil wartet weiterhin, wann immer du magst.' },
      fr: { subject: 'Dernier message à ce sujet 👋', body: "C'est le dernier rappel — ton profil corporel gratuit t'attend toujours, quand tu voudras le configurer." },
      it: { subject: 'Ultimo promemoria su questo 👋', body: 'Questo è l\'ultimo promemoria — il tuo profilo corporeo gratuito ti aspetta ancora, quando vorrai configurarlo.' },
      es: { subject: 'Último recordatorio sobre esto 👋', body: 'Este es el último recordatorio — tu perfil corporal gratis sigue esperando, cuando quieras configurarlo.' },
    },
  },
};

const FALLBACK = 'en';
const CTA_URL = { first_scan: 'https://novaqi.app/get', body_profile: 'https://novaqi.app/get' };

function pickLang(obj, locale) {
  const lang = (locale || '').slice(0, 2);
  return obj[lang] ? lang : FALLBACK;
}

function buildEmail({ campaign, stage, locale, unsubUrl }) {
  const lang = pickLang(CONTENT[campaign][stage], locale);
  const c = CONTENT[campaign][stage][lang];
  const cta = CTA[campaign][lang] || CTA[campaign][FALLBACK];
  const html = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#fff;color:#333;">
      <h2 style="color:#0E1B14;margin-bottom:16px;">🔍 NovaQI</h2>
      <p style="font-size:15px;line-height:1.55;">${c.body}</p>
      <p style="text-align:center;margin:28px 0;">
        <a href="${CTA_URL[campaign]}" style="display:inline-block;background:#16A75A;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">${cta}</a>
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="color:#888;font-size:11px;margin:0;"><a href="${unsubUrl}" style="color:#888;">Unsubscribe</a></p>
    </div>
  `;
  const text = `${c.body}\n\n${CTA_URL[campaign]}\n\nUnsubscribe: ${unsubUrl}`;
  return { subject: c.subject, html, text };
}

export async function runOnboardingEmails() {
  const db = await getPool();
  if (!db || !process.env.SMTP_HOST) return;

  // Candidates per campaign: confirmed email, not opted out, matching
  // eligibility, joined against their own send history for that campaign.
  const [{ rows: firstScan }, { rows: bodyProfile }] = await Promise.all([
    db.query(`
      SELECT u.id AS user_id, u.email, u.created_at,
             COALESCE(LEFT(pt.locale, 2), 'en') AS locale,
             h.max_stage, h.last_sent_at
      FROM users u
      LEFT JOIN LATERAL (
        SELECT locale FROM push_tokens pt WHERE pt.user_id = u.id ORDER BY last_seen_at DESC LIMIT 1
      ) pt ON true
      LEFT JOIN LATERAL (
        SELECT max(stage) AS max_stage, max(sent_at) AS last_sent_at
        FROM onboarding_email_log l WHERE l.user_id = u.id AND l.campaign = 'first_scan'
      ) h ON true
      WHERE u.email_confirmed = true AND u.email IS NOT NULL
        AND u.marketing_email_opt_out = false
        AND NOT EXISTS (SELECT 1 FROM scan_events se WHERE se.user_id = u.id)
        AND COALESCE(h.max_stage, 0) < ${MAX_STAGE}
    `).catch(() => ({ rows: [] })),
    db.query(`
      SELECT u.id AS user_id, u.email, u.created_at,
             COALESCE(LEFT(pt.locale, 2), 'en') AS locale,
             h.max_stage, h.last_sent_at
      FROM users u
      LEFT JOIN LATERAL (
        SELECT locale FROM push_tokens pt WHERE pt.user_id = u.id ORDER BY last_seen_at DESC LIMIT 1
      ) pt ON true
      LEFT JOIN LATERAL (
        SELECT max(stage) AS max_stage, max(sent_at) AS last_sent_at
        FROM onboarding_email_log l WHERE l.user_id = u.id AND l.campaign = 'body_profile'
      ) h ON true
      WHERE u.email_confirmed = true AND u.email IS NOT NULL
        AND u.marketing_email_opt_out = false
        AND NOT EXISTS (SELECT 1 FROM user_body_profile bp WHERE bp.user_id = u.id)
        AND COALESCE(h.max_stage, 0) < ${MAX_STAGE}
        -- body profile is a NovaQI-only feature — only nudge users with a
        -- corroborating NovaQI usage signal, never VeganLand-only accounts.
        AND (
          EXISTS (SELECT 1 FROM push_tokens pt2 WHERE pt2.user_id = u.id AND pt2.brand = 'novaqi')
          OR EXISTS (SELECT 1 FROM funnel_events fe WHERE fe.user_id = u.id AND fe.brand = 'novaqi')
        )
    `).catch(() => ({ rows: [] })),
  ]);

  const now = Date.now();
  const due = [];
  for (const { rows, campaign } of [{ rows: firstScan, campaign: 'first_scan' }, { rows: bodyProfile, campaign: 'body_profile' }]) {
    for (const u of rows) {
      const nextStage = (u.max_stage || 0) + 1;
      const sinceMs = u.last_sent_at ? now - new Date(u.last_sent_at).getTime() : now - new Date(u.created_at).getTime();
      const thresholdDays = STAGE_DELAY_DAYS[nextStage];
      if (thresholdDays == null) continue;
      if (sinceMs < thresholdDays * 24 * 60 * 60 * 1000) continue;
      due.push({ ...u, campaign, stage: nextStage, dueSince: u.last_sent_at || u.created_at });
    }
  }

  if (due.length === 0) return;

  // Oldest-due first, hard cap per run regardless of backlog size.
  due.sort((a, b) => new Date(a.dueSince) - new Date(b.dueSince));
  const batch = due.slice(0, MAX_EMAILS_PER_RUN);

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.NOVAQI_SMTP_USER, pass: process.env.NOVAQI_SMTP_PASS },
  });
  const from = process.env.NOVAQI_SMTP_FROM || 'NovaQI <contact@novaqi.app>';

  console.log(`[onboarding-email] Sending ${batch.length} of ${due.length} due reminders`);

  let ok = 0, err = 0;
  for (const u of batch) {
    const unsubUrl = unsubscribeUrl('novaqi.app', u.user_id, u.campaign);
    const { subject, html, text } = buildEmail({ campaign: u.campaign, stage: u.stage, locale: u.locale, unsubUrl });
    try {
      await transport.sendMail({
        from, to: u.email, subject, html, text,
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>, <mailto:contact@novaqi.app?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      ok++;
      await db.query(
        `INSERT INTO onboarding_email_log (user_id, campaign, stage) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [u.user_id, u.campaign, u.stage]
      ).catch(() => {});
    } catch (e) {
      err++;
      console.warn(`[onboarding-email] fail ${u.email}: ${e.message}`);
      // Circuit breaker: Hostinger throttling us (outbound disabled / auth
      // errors) means every remaining send in this batch will fail too —
      // stop immediately instead of hammering a blocked account.
      if (/outbound sending is disabled|too many|rate limit/i.test(e.message || '')) {
        console.warn('[onboarding-email] circuit breaker tripped — aborting rest of run');
        break;
      }
    }
    await new Promise(r => setTimeout(r, SEND_DELAY_MS));
  }

  console.log(`[onboarding-email] done. ok=${ok} err=${err} (backlog remaining: ${due.length - ok - err})`);
}
