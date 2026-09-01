# VeganLand / NovaQI — Contexto para Claude Code

## O que é este projeto

App React Native (Expo SDK 54, web + nativo) + servidor Node.js próprio.
Permite escanear produtos (foto ou barcode), analisar ingredientes com IA (Anthropic Claude) e dizer se o produto é adequado ao perfil do utilizador (dieta + alergias).

Dois brands partilham o mesmo codebase, servidor e base de dados:
- **VeganLand** — `https://veganland.app` — tema verde
- **NovaQI** — `https://novaqi.app` (web) / `app.novaqi` (nativo) — tema navy + citrus

**Servidor:** VPS Ubuntu, `/opt/veganland`, processo PM2 `veganland-api`  
**Owner:** Davi Augusto Wazlawick, 4 Frankfurter Allee, 10247 Berlin, Germany  
**Email:** contact@veganland.app

---

## Stack

| Camada | Tecnologia |
|---|---|
| App | React Native + Expo SDK 54 (web export + EAS nativo) |
| Navegação | React Navigation (Stack + Bottom Tabs) |
| Estado | React Context (AppContext + AuthContext) |
| Backend | Node.js puro (sem framework), PM2 |
| Base de dados | PostgreSQL |
| IA | Anthropic Claude (analyze.js + anthropic.js) |
| IAP | RevenueCat (`react-native-purchases` ^10.1.2) |
| Email | Nodemailer, SMTP Hostinger smtp.hostinger.com:465 |
| Auth | JWT + bcrypt |
| Browser in-app | expo-web-browser (Safari ViewController) |

---

## Sistema de White-label (Brand)

O brand é seleccionado por variável de ambiente em build-time: `EXPO_PUBLIC_BRAND` (ou `BRAND`).

### Ficheiros de brand
```
src/brand/
  index.js      — selecciona brand via EXPO_PUBLIC_BRAND, exporta Brand, Colors, BrandFonts
  veganland.js  — cores verde + strings vazias (usa i18n padrão)
  novaqi.js     — cores navy+citrus + string overrides para 6 idiomas + fontes Syne/Jakarta
src/constants/colors.js  — re-exporta Colors do brand activo
```

### Como funciona
- `Colors.X` — sempre do brand activo
- `t(lang, 'key')` — verifica overrides do brand antes das traduções padrão
- `Brand.id`, `Brand.name`, `Brand.domain` (`veganland.app` ou `novaqi.app`), `Brand.fonts`
- `BrandName` component — renderiza "Nova" + "QI" em cores split, ou "VeganLand" simples
- `BrandLogo` component — círculo navy com SVG target (NovaQI) ou círculo verde com câmera (VeganLand)
- `PremiumIcon name="scan"` — target/radar para NovaQI, câmera para VeganLand

### Tokens de cor partilhados (presentes em ambos os brands)
`navy`, `navyDeep`, `navyMid`, `headerBg`, `headerText`, `headerMuted`, `aboutCardBg`, `aboutCardBorder`, `primaryBg`, `primaryLight`, `primaryDark`, `safe`, `safeLight`, `safeDark`, `caution`, `cautionLight`, `cautionDark`, `danger`, `dangerLight`, `dangerDark`

### Fontes NovaQI
Syne 800 + Plus Jakarta Sans — via `@expo-google-fonts`. Carregadas em App.js com `useFonts` condicionalmente (`Brand.fonts ? {...} : {}`).

---

## Estrutura de ficheiros importantes

```
src/
  screens/
    WelcomeScreen.js        — landing, sem auth
    LoginScreen.js          — login com resend confirmation
    RegisterScreen.js       — registo + check email screen
    ForgotPasswordScreen.js — reset password por email
    ForceUpdateScreen.js    — ecrã de bloqueio para updates obrigatórios
    DisclaimerScreen.js     — disclaimer obrigatório no primeiro lançamento (com checkbox)
    HomeScreen.js           — dashboard, histórico de scans
    ScanScreen.js           — câmera + análise
    ResultScreen.js         — resultado SAFE/CAUTION/NOT_SAFE + disclaimer box + citação AI
    ProfileScreen.js        — perfil + settings + legal links + manage subscription
    PaywallScreen.js        — planos Free/Starter/Premium com RevenueCat
    ProfileSetupScreen.js   — dieta + alergias (usado em edição também)
    EditPersonalScreen.js   — nome + bio + avatar
    ReferralScreen.js       — código de referral + progresso + partilhar
    DeleteAccountScreen.js  — apagar conta
  context/
    AppContext.js      — profile, language, scan history, saveProfile()
    AuthContext.js     — login, register, logout, token JWT, updateUserType()
    ReferralContext.js — lê clipboard por código pendente, armazena em AsyncStorage
  services/
    apiService.js                  — chamadas HTTP ao servidor
    purchasesService.native.js     — RevenueCat SDK (iOS/Android) — chaves hardcoded aqui
    purchasesService.js            — no-ops para web
    analyticsService.native.js     — Meta SDK (App ID/Client Token, eventos)
    analyticsService.js            — no-ops para web
    notificationsService.native.js — Expo push token registration
    notificationsService.js        — no-ops para web
  hooks/
    useForceUpdate.js      — verifica versão mínima no servidor ao arrancar
    usePushNotifications.js — regista push token + deep-link no tap
  constants/
    allergies.js    — ALLERGIES[] com id, icon, label por idioma
    diets.js        — DIETS[] com id, icon, label por idioma
    colors.js       — re-exporta Colors do brand activo
  i18n/
    index.js        — LANGUAGES[], t(lang, key, params) com brand overrides, localeFor()
    en/pt/de/fr/it/es.js — traduções (6 idiomas)
  components/ui/
    BetaRibbon.js   — COMPONENTE MORTO — não usar, não renderizar em lado nenhum
    PremiumIcon.js  — ícones brand-aware
    BrandName.js    — wordmark split-color
    BrandLogo.js    — círculo de logo brand-aware
    NovaQILogo.js   — ícone target/radar
    index.js        — exports

assets/
  novaqi/
    icon.png, adaptive-icon.png, splash-icon.png, favicon.png
    novaqi-icon.svg        — target/radar com fundo navy
    novaqi-logo-dark.svg   — lockup completo (ícone + wordmark) para fundos escuros
    novaqi-logo-light.svg  — lockup para fundos claros
    novaqi-logo-mono.svg, novaqi-wordmark-dark.svg

server/src/
  server.js       — rotas HTTP
  db.js           — queries PostgreSQL
  analyze.js      — orquestração da análise
  anthropic.js    — prompts + chamadas Anthropic
  auth.js         — JWT, bcrypt
  email.js        — nodemailer + sendSupportEmail()
  legal.js        — HTML das páginas legais (Terms, Privacy, Imprint)
  support.js      — HTML da página /support (formulário de contacto GDPR)
  about.js        — HTML da página /about (marketing, multilíngue)
  web_i18n.js     — traduções para /about e /support (6 idiomas, detecta Accept-Language)
  migrate.js      — migrações de BD (roda os ficheiros em migrations/ que ainda não correram)
  migrations/     — SQL numerado (017_referrals.sql, 018_bonus_scans.sql, 019_push_tokens.sql, etc.)
  openFoodFacts.js — lookup por barcode e nome
  referralCode.js  — gera código único de 6 chars (sem 0/1/O/I)
  backfillReferralCodes.js — gerou códigos pros users existentes antes do referral program
  env.js           — carrega .env manualmente (sem dependência dotenv)
```

---

## Funcionalidades implementadas

### Auth
- Registo com confirmação de email obrigatória (novos utilizadores)
- Utilizadores existentes grandfathered (email_confirmed = true)
- Login bloqueia se email não confirmado → mostra banner amarelo com botão "Reenviar"
- Forgot password por email (link de reset)
- Resend confirmation disponível na tela de registo e login

### Disclaimer obrigatório
- `DisclaimerScreen` mostrado uma vez no primeiro lançamento antes de qualquer funcionalidade
- Tem 4 blocos informativos + checkbox obrigatório
- Checkbox exige: "Confirmarei sempre os ingredientes no rótulo físico antes de consumir"
- Aceite guardado em AsyncStorage + servidor (`apiAcceptDisclaimer`)

### Perfil
- Dieta: vegan, vegetarian, pescatarian, glutenFree, halal, omnivore
- 22 tipos de sensibilidades (alimentares + cosméticos + vestuário)
- Guardado local (AsyncStorage) + servidor (users.diet_id, users.allergy_ids, users.halal_strictness)

### Experiência halal (2026-07)
- **Motor**: `src/constants/halalRules.js` — mapa de ingredientes/E-codes → status halal (`halal` / `mashbooh` / `not_halal`). Client-side puro, zero deps, OTA-safe. Testes reprodutíveis em `/tmp/halal-test/test.mjs` (copiar halalRules.js → .mjs porque o package não é ESM).
- **Ativação**: só quando `profile.dietId === 'halal'`. Outros diets nunca chamam o motor — comportamento existente intacto.
- **Rigor**: `profile.halalStrictness` = `'cautious'` (default) | `'moderate'`. Selector escondido em `ProfileSetupScreen` para outros diets. Persistido em `users.halal_strictness` via migration 027 (coluna nullable → cliente aplica default quando ausente).
- **⚠️ REGRA DE ARQUITECTURA**: a lógica halal NUNCA deve subir para os prompts de `server/src/anthropic.js` nem para o formato do cache neutro (`applyProfileToAnalysis` em `server/src/analyze.js` só cobre vegan/vegetarian/glutenFree). O cache é **neutro por produto+idioma**, partilhado por todos os diets — misturar halal ali quebraria vegan/vegetarian. Toda regra halal vive no cliente, aplicada por cima do resultado neutro que já vem do servidor.
- **UI overrides (halal-only)**: `ResultScreen.js` sobrepõe banner title/subtitle (Halal ✓ / Mashbooh / Not Halal), concerns list (com motivos por ingrediente), chips flagged, e mostra `halal.cert_line` no disclaimer box. Cores mantêm-se (safe/caution/danger).
- **Compliance Apple 1.4.1**: label principal é "Not Halal", nunca "Haram". A palavra "haram" só aparece nos motivos por-ingrediente para casos inequívocos (gelatina suína, banha, álcool, vinho/cerveja). Cert reminder informa, não prescreve veredito religioso.

### Scan / Análise
- Foto da câmera ou galeria
- Barcode shortcut: lookup direto na BD (evita re-análise)
- Cache neutral: análise guardada por produto+idioma, perfil aplicado localmente
- `analyzeProductByKnowledge`: fallback quando sem ingredientes

### Resultado (ResultScreen)
- 3 estados: SAFE / CAUTION / NOT_SAFE
- **Disclaimer box visível** (fundo âmbar, ícone ⚠️): "Esta informação não substitui a leitura do rótulo..."
- **Citação clicável**: "Analysis generated by Claude AI (Anthropic) · anthropic.com" — link funcional
- Card de ingredientes, alergénios, concerns

### Planos de utilizador (IAP)
- **free**: 7 scans/mês, €0
- **starter**: 30 scans/mês, €2.99/mês — badge "Mais popular"
- **premium**: 100 scans/mês, €5.99/mês — badge "Melhor custo-benefício"
- `SCAN_LIMITS` em `db.js`: `{ free: 7, starter: 30, premium: 100, admin: null }`
- Trial: iOS = "2 semanas grátis", Android = "15 dias grátis"
- Webhook RevenueCat → `POST /webhook/revenuecat` → `setUserType()`
- CANCELLATION/EXPIRATION → downgrade para `'free'` (não 'starter')

### PaywallScreen
- RevenueCat product IDs: `novaqi_starter`, `novaqi_premium` (exatamente assim, sem bundle ID)
- Fallback de preço hardcoded: starter €2.99, premium €5.99 (sem distinção iOS/Android)
- `hasTrial()`: usa `introPrice` do RC se disponível; fallback `true` para starter/premium
- Badge "Mais popular" e "Melhor custo-benefício" escondem-se quando é o plano actual
- **NUNCA** adicionar "Em breve" / "Coming soon" nos planos — foi causa de rejeição Apple
- Texto de auto-renovação + links clicáveis Privacy Policy e Terms of Use obrigatórios
- "Manage subscription" no ProfileScreen para utilizadores pagos (iOS → Apple, Android → Google)

### RevenueCat — chaves API
- iOS: `appl_yitutMbhXnSxJFnCqDqkNunlogI`
- Android: `goog_YnmIYLSJyriFzhvfSSnypZCFibv`
- **As chaves reais usadas em runtime estão HARDCODED em `RC_KEYS` no `src/services/purchasesService.native.js`** — os `EXPO_PUBLIC_REVENUECAT_*` no `eas.json`/scripts npm nunca chegam a ser lidos (só existem como fallback morto no código). Pra mudar a chave, editar `purchasesService.native.js` directamente.
- **Nota:** mudança de chaves RC requer novo build nativo (não é OTA)
- **Bug corrigido (1.0.12):** `entitlementToUserType(null)` tinha fallback errado pra `'starter'` em vez de `'free'` — qualquer user tocando "Restaurar compras" sem ter comprado nada ganhava o plano starter grátis. Corrigido para retornar `'free'` quando não há entitlement activo.

### Meta / Facebook Ads tracking (1.0.10+)

Stack: `react-native-fbsdk-next` + `expo-tracking-transparency`.

**Estado do SDK (lazy init, GDPR-safe):**
- Plugin Facebook só é adicionado se `EXPO_PUBLIC_FB_APP_ID` e `EXPO_PUBLIC_FB_CLIENT_TOKEN` estiverem definidos em `eas.json` (per-brand)
- `isAutoInitEnabled: false`, `autoLogAppEventsEnabled: false`, `advertiserIDCollectionEnabled: false` no plugin — tudo é activado manualmente após consentimento
- `initAnalytics()` no `App.js` configura mas só liga o SDK quando ATT é decidido
- ATT prompt dispara em `AppContext.acceptDisclaimer()` (após o user aceitar o disclaimer, não antes)

**Eventos disparados:**
| Evento | Onde | Quando |
|---|---|---|
| `fb_mobile_complete_registration` | `AuthContext.register()` | API confirma criação de conta (mesmo se email ainda não confirmado) |
| `StartTrial` | `PaywallScreen.handleSelect()` | RevenueCat `customerInfo.entitlements.active[entId].periodType === 'TRIAL'` |
| `Subscribe` + `logPurchase` | `PaywallScreen.handleSelect()` | RevenueCat confirma compra paga (não trial) |
| `Scan` | `AppContext.addScanToHistory()` | Qualquer scan completo (cobre photo, barcode e prompt flows) |

**Credenciais (env vars em `eas.json`):**
- `EXPO_PUBLIC_FB_APP_ID` — App ID do Meta for Developers
- `EXPO_PUBLIC_FB_CLIENT_TOKEN` — Settings → Advanced → Client Token

**SKAdNetwork (iOS 14.5+):**
- 33 IDs hardcoded em `app.config.js` (Meta + parceiros)
- Para máxima atribuição, adicionar a lista completa publicada em https://developers.facebook.com/docs/SKAdNetwork

**Privacy Policy:**
- Secção 9 (International Transfers) cobre Meta Ireland → US (SCCs)
- Secção 11 (Cookies, Tracking & Advertising) lista eventos, base legal (consent), ATT opt-in, e o que **não** se envia (email, perfil, fotos, ingredientes)

**App Store Connect Nutrition Labels — obrigatório actualizar antes de submeter:**
- Data Used to Track You: Device ID, Product Interaction, Advertising Data
- Data Linked to You (adicionar): Purchases, Device ID — purposes: Third-Party Advertising + Developer's Advertising + Analytics

**Google Play Data Safety:**
- Device or other IDs → shared with Meta, purposes: Advertising + Analytics
- App activity / interactions → shared, Analytics + Advertising

**Texto do ATT prompt (já no `app.config.js`):**
*"Allow {Brand} to measure ad performance so we can show you more relevant content and continue improving the app."*

**O que **NÃO** se envia ao Meta:** email, nome, dieta, alergias, fotos, ingredientes. Só identifiers + event names + amount/currency em purchases.

---

### Updates obrigatórios (Force Update)
- `GET /app/version` — retorna versão mínima por plataforma
- `useForceUpdate` hook — compara versão instalada vs mínima ao arrancar
- **Para activar:** alterar `min` em `server.js` + `pm2 restart`

### Legal
- Páginas `/legal/terms`, `/legal/privacy`, `/legal/imprint` — servidor Node.js
- `/support` — formulário de contacto GDPR (honeypot, consent obrigatório, consent marketing opcional)
- `/about` — página de marketing multilíngue (6 idiomas, detecta Accept-Language, `?lang=XX`)
- `Brand.domain` usado para URLs legais

### i18n
- 6 línguas: PT, EN, DE, FR, IT, ES
- `t(lang, 'key', { param: value })` com fallback para EN
- **Quando adicionar strings:** adicionar nos 6 ficheiros — usar aspas duplas `"` em FR/IT

---

## Versão actual

| Campo | Valor |
|---|---|
| version | `1.0.13` (build em progresso, ainda não submetido) |
| versionCode (Android) | `16` |
| bundleIdentifier iOS | `app.novaqi` |
| package Android | `app.novaqi` |
| runtimeVersion policy | `appVersion` — OTA só chega a builds com a mesma versão |
| force update `min` (servidor) | `1.0.12` (iOS + Android) — confirmar em `GET /app/version` |
| Em produção actualmente | `1.0.12` na App Store e Play Store |

**Histórico:**
- 1.0.5 — rejeitado pela Apple (BetaRibbon, planos bloqueados, etc.)
- 1.0.6 — fixes de compliance
- 1.0.7 — fixes adicionais Apple review
- 1.0.8 — **aprovado pela Apple** ✅, RC iOS key corrigida
- 1.0.9 — fixes barcode/OFF fallback, MAY CONTAIN, traces, cache
- 1.0.10 — **Meta SDK + ATT** (CompleteRegistration, StartTrial, Subscribe, Scan); Privacy Policy actualizada
- 1.0.11 — **aprovado e em produção** (iOS + Android, Android já publicado na Play Store) — Push Notifications (APNs + FCM via Expo Push Service) + Programa de referência (referrals com bónus de scans). Firebase Analytics SDK foi tentado e **revertido** por incompatibilidade com Expo SDK 54 (ver secção "Firebase Analytics — tentativa revertida")
- 1.0.12 — fix do Meta Client Token (tinha um char a mais no `eas.json`, quebrava auth do SDK), fix de bug no RevenueCat (`entitlementToUserType` dava plano starter grátis via "Restaurar compras"), force update `min` bumped pra 1.0.12 em ambas plataformas
- 1.0.13 — **em build, NovaQI apenas** — Sign in with Apple + Sign in with Google (backend + app), esconder opção "Continue with Free plan" (feature flag), trial pill amber prominente, fixes de bugs pré-existentes (origin scope no catch + XSS no admin panel)

---

## OTA update vs novo build nativo

| Mudança | OTA suficiente? |
|---|---|
| Texto, i18n, estilos, lógica JS | ✅ Sim |
| Novos ecrãs (JS puro) | ✅ Sim |
| Alterações servidor (server.js, etc.) | ✅ Apenas `git pull && pm2 restart` |
| Chaves RevenueCat / EAS env vars | ❌ Novo build |
| Novos plugins nativos (Meta SDK, etc.) | ❌ Novo build |
| Permissões iOS (infoPlist, ATT, SKAdNetwork) | ❌ Novo build |
| Bump de versão | ❌ Novo build (runtimeVersion = appVersion) |

**OTA update command:**
```bash
EXPO_PUBLIC_BRAND=novaqi EXPO_PUBLIC_API_URL=https://novaqi.app \
EXPO_PUBLIC_APP_API_KEY=79se0AyWPbh963SvguuDFi10JsT0Mr9U \
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YnmIYLSJyriFzhvfSSnypZCFibv \
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_yitutMbhXnSxJFnCqDqkNunlogI \
EXPO_PUBLIC_FB_APP_ID=1717962282965252 \
EXPO_PUBLIC_FB_CLIENT_TOKEN=0217ebfebacd37d56743ae72d0faa08b \
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=529528181342-k25vds3r9sr0fon0rvs0i4ni3q8utsjd.apps.googleusercontent.com \
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=529528181342-vms6qe7ue4d3d1unoentfgvcjrqbtnpd.apps.googleusercontent.com \
eas update --branch production --message "descrição"
```
**⚠️ Rodar sempre com TODOS os env vars acima — faltar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` faz `isGoogleAuthAvailable()` (`socialAuthService.native.js`) devolver `false` e o botão "Continue with Google" desaparece silenciosamente do Login/Register — bug real que aconteceu em 2026-09-01 (uma OTA publicada só com o bloco RC+FB, sem os vars Google, matou o botão até a OTA seguinte corrigir). Preferir sempre `npm run update:novaqi`, que já inclui a lista completa — só copiar o comando manual se o script falhar em non-interactive.

---

## Deploy — Web

### VeganLand
```bash
# No Mac:
git push origin main
# No servidor:
cd /opt/veganland && git pull && npm run build:deploy
```

### NovaQI
```bash
# No servidor:
cd /opt/veganland && git pull && npm run build:novaqi:deploy
```

### Só reiniciar servidor
```bash
pm2 restart veganland-api --update-env
```

### Ver logs
```bash
pm2 logs veganland-api --lines 50 --nostream
```

---

## Deploy — Nativo (iOS / Android) com EAS

```bash
npm run build:android:novaqi     # AAB para Google Play
npm run build:ios:novaqi         # IPA para App Store
npm run submit:android:novaqi    # requer google-play-key.json
npm run submit:ios:novaqi        # requer Apple ID configurado
```

**Antes de buildar:** confirmar que a versão em `app.config.js` foi incrementada.

---

## Servidor — variáveis de ambiente (`/opt/veganland/server/.env`)

```
PORT=3000
DATABASE_URL=postgres://veganland:<PASSWORD>@localhost:5432/veganland?sslmode=disable
DATABASE_SSL=false
ANTHROPIC_API_KEY=...
APP_API_KEY=...
JWT_SECRET=...
APP_URL=https://veganland.app
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@veganland.app
SMTP_PASS=...
SMTP_FROM=VeganLand <contact@veganland.app>
REVENUECAT_WEBHOOK_SECRET=...
```

---

## BD — colunas importantes

**`users`**
- `email_confirmed BOOLEAN NOT NULL DEFAULT false`
- `diet_id TEXT`, `allergy_ids JSONB NOT NULL DEFAULT '[]'` (não é `TEXT[]` — é `jsonb`; `updateUserProfile` em `db.js` usa `JSON.stringify()` no valor, compatível)
- `user_type TEXT NOT NULL DEFAULT 'free'` — valores: `free`, `starter`, `premium`, `admin`

**`scan_counters`**
- `user_id`, `month` (formato `YYYY-MM`), `count INT`

**`product_analyses`**
- `product_id`, `language`, `result JSONB` — inclui `normalized_ingredients`, `identified_allergens`, `concerns`, `explanation`

**`scan_events`**
- `user_id`, `product_id`, `status`, `title`, `source`, `language`, `result JSONB`, `created_at`

**`push_tokens`** (migração `019_push_tokens.sql`)
- `user_id`, `token` (unique), `platform` (`ios`/`android`/`web`), `locale`, `last_seen_at`

**`push_broadcasts`** (migração `020_push_broadcasts.sql`)
- `title`, `body`, `locale`, `user_type`, `route`, `total_count`, `ok_count`, `error_count`, `invalid_count`, `created_at` — histórico de envios feitos em `/admin/push`

---

## nginx — rotas proxy

### Ambos os sites (VeganLand + NovaQI)
```nginx
location ~ ^/(analyze-product|health|auth/.+|user/.+|scan/.+|admin/?|admin/user/.+|legal/.+|webhook/.+|app/.+|support/?.+|support|about)$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
    client_max_body_size 10m;
}
```
Após editar: `sudo nginx -t && sudo systemctl reload nginx`

---

## Apple App Store — Lições aprendidas (rejeições 1.0.5)

### ❌ NUNCA fazer
- **BetaRibbon** em produção — causa rejeição 2.2 (Beta Testing). O componente `BetaRibbon.js` existe mas está morto — nunca renderizar.
- **"Em breve" / "Coming soon"** nos planos do PaywallScreen — bloqueia compra durante review (rejeição 2.1). Planos sempre visíveis e clicáveis.
- **Termos médicos** nos ecrãs (SAFE/CAUTION, allergen, medical device) — rejeição 1.4.1. Usar linguagem neutra (dietary categories, doesn't match your profile).
- **Botão "Permitir/Allow"** antes do pedido de câmara — rejeição 5.1.1(iv). Usar "Continue/Continuar".

### ✅ Obrigatório em cada submissão
- **ResultScreen**: disclaimer box visível (fundo âmbar) + citação clicável "Claude AI (Anthropic)"
- **DisclaimerScreen**: checkbox com "confirmarei sempre os ingredientes na embalagem física"
- **PaywallScreen**: texto de auto-renovação + links clicáveis Privacy Policy e Terms of Use
- **ProfileScreen**: "Manage subscription" link para utilizadores starter/premium (iOS → Apple, Android → Google)
- **App Store Connect**: Support URL = `https://novaqi.app/support`, Privacy URL = `https://novaqi.app/legal/privacy`
- **App Store Connect**: IAP products `novaqi_starter` e `novaqi_premium` em "Ready to Submit"
- **App Store Connect**: Paid Apps Agreement aceite
- **App Store Connect**: Privacy Nutrition Labels preenchidas (Email, Name, Usage Data)
- **App Description**: incluir link EULA da Apple no final

### App Store Connect — campos importantes
- Support URL: `https://novaqi.app/support`
- Marketing URL: `https://novaqi.app/about`
- Privacy Policy URL: `https://novaqi.app/legal/privacy`
- EULA: standard Apple EULA (adicionar link na descrição)

---

## Padrões de código

- Sem comentários desnecessários
- Sem abstrações prematuras
- `t(language, 'section.key')` para todos os textos visíveis
- Quando adicionar string i18n: adicionar nos 6 ficheiros (en/pt/de/fr/it/es) — usar aspas duplas `"` para evitar conflito com apóstrofes em FR/IT
- `Colors.X` para todas as cores — nunca hardcoded exceto rgba temporários
- Safe area: usar `useSafeAreaInsets()` para bottom padding nas telas com tab bar
- Ao alterar visuais: perguntar se aplica a um ou ambos os brands

---

## Deploy — nota sobre migrações

Sempre que houver nova migration em `server/src/migrations/`, correr no servidor após `git pull`:
```bash
cd /opt/veganland && node server/src/migrate.js
```

---

## Estado actual / Próximos passos

### Lançado ✅
- NovaQI iOS — aprovado pela Apple, em produção (1.0.12 mais recente)
- NovaQI Android — publicado na Play Store
- Web: novaqi.app + veganland.app
- Meta SDK + ATT (1.0.10); Push Notifications + Programa de Referência (1.0.11)
- Force update `min` 1.0.12 activo em ambas plataformas
- Admin panel: acesso via handoff da app (JWT → token one-shot → cookie HttpOnly), ver secção "Admin Panel"

### Pendente
- [ ] Confirmar se falta algo na integração RevenueCat (IAP products no App Store Connect + Paid Apps Agreement)
- [ ] `google-play-key.json` para submissão automática via EAS (upload do `.aab` ainda é manual)
- [ ] Testes end-to-end do fluxo de confirmação de email
- [ ] Admin: endpoint para inserir/editar produtos manualmente na BD
- [ ] Conversions API server-side via webhook RevenueCat (deduplicação com Pixel — fase 2)
- [ ] Limpar `google-services.json`/`GoogleService-Info.plist` órfãos (Firebase revertido) se não for reativar
- [ ] VeganLand: publicar app própria nas lojas (hoje só web, funil de rebrand pra NovaQI) — flip `rebrandToNovaqi: false` quando acontecer

---

## 1.0.11 — aprovado e em produção (iOS + Android)

Tudo o que foi adicionado entre 2026-06-29 e 2026-06-30:

### 1) Programa de Referência (referrals) — em produção desde 2026-06-29

- **Mecânica:** Cada user tem código único de 6 chars (alfabeto sem 0/1/O/I, gerado em `referralCode.js`). Quando A indica B e B se regista usando o código: B ganha **+10 scans bónus** imediatamente. A ganha **+30 scans bónus** quando 3 amigos qualificarem (cada amigo "qualifica" ao fazer o primeiro scan, não só ao registar). Acumulativo — a cada novo trio que qualifica, A ganha outros +30. Sem cap lifetime.
- **Bónus expira em 30 dias** (rolling window — cada novo grant prolonga para `now() + 30d`)
- **Migrações:** `017_referrals.sql` (colunas em users + tabela `referral_events`), `018_bonus_scans.sql` (colunas `bonus_scans_remaining`, `bonus_scans_expires_at`)
- **Como é consumido o bónus:** `checkAndIncrementScanCounter` em `db.js` consome `bonus_scans_remaining` PRIMEIRO antes de tocar no `scan_counters` mensal. Funciona em qualquer plano (free/starter/premium).
- **App (JS — OTA-safe nesta camada):**
  - `src/context/ReferralContext.js` lê clipboard uma vez após disclaimer aceite; armazena `pendingCode` em AsyncStorage
  - `src/screens/ReferralScreen.js` ecrã principal — código + barra de progresso + botão Partilhar (RN core `Share.share({ message })` — sem url separada, senão o iOS duplica)
  - `src/components/PendingReferralPrompt.js` Modal que sugere aplicar código encontrado no clipboard
  - CTAs em ProfileScreen (card permanente), HomeScreen (hero até atingir 3), ResultScreen (banner cada 5 scans), PaywallScreen (Alert ao fechar como free), RegisterScreen (campo opcional)
  - i18n: secção `referral.*` em 6 línguas — **CUIDADO:** placeholders usam `{{name}}` (double brace), não `{name}` — bug corrigido em `f7a6d81`
- **Backend (`server.js`):**
  - `POST /auth/register` aceita `referral_code` opcional → popula `referred_by_user_id`, cria `referral_events` em `pending`, grant +10 ao B
  - `GET /referral/me` (auth) — devolve `{code, pending, qualified, credit_count, total_rewarded, referrals_needed, referrer_reward, referred_bonus, bonus_remaining, bonus_expires_at}`
  - `POST /referral/redeem` (auth) — aplica código depois do registo (só uma vez por user, antes do primeiro scan)
  - `GET /r/:code` — landing page brand-aware (NovaQI mostra código + botões store; veganland mostra "VeganLand became NovaQI" — ver Brand Migration)
  - `saveScanEvent` em `db.js` chama `qualifyReferralIfPending` ao primeiro scan; se atinge 3 → grant +30 ao A
- **Backfill:** `server/src/backfillReferralCodes.js` (gerou códigos para os 54 users existentes)
- **Anti-fraude:** `users.email UNIQUE` + `referred_by_user_id` set uma vez + `referral_events UNIQUE (referrer_id, referred_id)` + qualificação exige scan real

### 2) Push Notifications — 1.0.11 (aprovado, em produção)

- **Stack:** `expo-notifications@~0.32.17` + `expo-device@~8.0.10` + Expo Push Service (relay para APNs/FCM)
- **Não é OTA** — requer build nativo. Versão bumped 1.0.10 → 1.0.11, versionCode 12 → 13
- **App:**
  - `src/services/notificationsService.native.js` — `getExpoPushTokenAsync({ projectId })` + Android channel `default` + handler para mostrar foreground
  - `src/hooks/usePushNotifications.js` — regista token no servidor após disclaimer + auth; tap handler usa `data.route` para deep-link (precisa do `navigationRef` em AppNavigator.js, exportado como `createNavigationContainerRef()`)
- **Backend:**
  - Migração `019_push_tokens.sql` (FK user, unique token, platform check)
  - Funções em `db.js`: `upsertPushToken`, `deletePushToken`, `listPushTokens({locale, userType})`
  - `POST /push/register` + `POST /push/unregister` (auth)
  - `POST /admin/push/broadcast` (admin-token-gated): filtra tokens por locale + user_type, batches de 100 ao `https://exp.host/--/api/v2/push/send`, devolve tickets ok/error/invalid
  - `GET /admin/push?token=<JWT_ADMIN>` — formulário HTML com title/body/locale/plan/route
- **APNs key (já configurada no EAS):** Key ID `2QK7NN5PZ6` (criada pelo `eas credentials`, atribuída a `app.novaqi`). A chave manual `ZX89QJ2V8B` ficou redundante.
- **Firebase Cloud Messaging:** activo em `novaqi-9dd63` (Sender ID `529528181342`)
- **nginx:** routes `/push/.+` e `/admin/push|/admin/push/.+` adicionadas em ambos sites
- **Ícone de notificação:** `assets/novaqi/notification-icon.png` (96×96 white silhouette do target NovaQI, desenhado em PIL)

### 3) Firebase Analytics SDK — tentativa revertida (não está em produção)

- **Foi tentado e removido** (commit `87739aa`) — `@react-native-firebase/app` + `expo-build-properties` (`useFrameworks: 'static'`) são incompatíveis com Expo SDK 54 / RN 0.81 (framework `RNFBApp` não consegue importar `React/RCTConvert.h` como modular header). O erro persistiu mesmo com downgrade pra v22.x e vários workarounds de pods/modular headers.
- **`analyticsService.native.js` dispara eventos só para o Meta agora.** Os event names Firebase (`sign_up`, `begin_checkout`, `purchase`, `product_scan`, `share`, `referral_qualified`) mencionados numa versão anterior deste doc eram para o SDK do Firebase — foram descontinuados junto com a remoção.
- `google-services.json` e `GoogleService-Info.plist` continuam no repo e referenciados em `app.config.js` (`ios.googleServicesFile` / `android.googleServicesFile`) mas estão **órfãos** — nenhum plugin nativo os processa mais. Inofensivo, mas candidatos a limpeza futura.
- **Push notifications não dependem do Firebase** — `expo-notifications` fala directo com o Expo Push Service (relay pra APNs/FCM), sem precisar do SDK nativo do Firebase.
- Atribuição de instalação pra Google Ads hoje depende de Play Install Referrer + SKAdNetwork (iOS), não de Firebase Analytics.
- **Se for reativar no futuro:** esperar uma combinação estável Expo+RNFirebase que resolva o modular header, ou trocar a estratégia de `useFrameworks`.

### 4) Brand Migration (VeganLand → NovaQI)

- VeganLand **não tem app própria** em nenhuma store (só web). `STORE_LINKS['veganland.app']` tem `iosUrl: null`, `androidUrl: null`, `rebrandToNovaqi: true`.
- Tráfego a `veganland.app/get` e `veganland.app/r/:code` é capturado por `htmlBrandMigrationLanding()` em `server.js` — página "VeganLand became NovaQI 🎉" com botões para NovaQI App Store / Play Store. Se houver código de referral, propaga para a NovaQI.
- **NovaQI URLs reais:**
  - iOS: `https://apps.apple.com/us/app/novaqi-scan/id6775790620`
  - Android: `https://play.google.com/store/apps/details?id=app.novaqi`
- **Quando VeganLand for publicado**, flip `rebrandToNovaqi: false` + preencher `iosUrl`/`androidUrl` em ambos `STORE_LINKS` (server.js) e `BRANDS` (about.js).
- **Regra absoluta:** VeganLand e NovaQI usam SEMPRE os seus URLs respectivos — nunca cross-link. Resolver brand por Host header no servidor, `Brand.domain` no app. Ver memória `feedback_brand_urls.md`.

### 5) `/get` Auto-Redirect Page

- `GET /get` no server.js detecta User-Agent (`detectPlatform`): iOS → 302 App Store, Android → 302 Play Store, desktop/bot → chooser HTML
- `?picker=1` força o chooser
- Brand-aware via Host header
- VeganLand entra no rebrand funnel (ponto 4 acima)
- nginx routes `/get` adicionadas em ambos sites
- Use para QR codes, bio social, email signatures

### 6) Force Update

- `GET /app/version` actualizado com URLs reais (de `STORE_LINKS[host]`)
- `min` actualmente em **1.0.12** (iOS + Android) — qualquer pessoa em ≤1.0.11 cai em `ForceUpdateScreen`
- Para forçar uma nova versão depois de aprovada: editar `server/src/server.js` (~linha 768, dentro de `GET /app/version`) → `min: 'X.X.X'` pra `ios`/`android` → `git pull && pm2 restart veganland-api --update-env` no servidor

### 7) OFF (OpenFoodFacts) — fix anterior

- Bug de fim de Junho: produtos antigos guardados por imagem retornavam `productInfo.offMeta = null`. Corrigido em commit `2387b7e` (on-read enrichment) + `518127c` / `efdec09` (URLs reais).
- `buildOffMeta` agora lê de `raw.nutriments` (API live shape) OU `raw` flat (bulk dump shape).
- Use OFF API com User-Agent `VeganLand/1.0 (https://veganland.app)` (sem ele o WAF bloqueia respostas com HTML).

---

## Admin Panel — modelo de acesso (`server.js`)

- **`GET /admin`** — cookie-first. Se não houver cookie `admin_session` válido, aceita um `?token=` one-shot vindo do handoff da app, troca por um cookie `HttpOnly; Secure; SameSite=Strict` (4h de validade) e redireciona pra `/admin` limpo (token não fica no histórico do browser).
- **`POST /admin/handoff`** — a app chama isto com o JWT do user pra mintar o token one-shot consumido pelo passo acima.
- **`POST /admin/logout`** — limpa o cookie.
- **`GET/POST /admin/push*`** — broadcast de push continua a usar um token admin separado (lifetime, via query `?token=`), não o cookie de sessão.
- Antes disto o admin era acessível por token estático direto na URL — mudou pra reduzir exposição (token na URL fica em logs/histórico).

### Legenda da tabela de utilizadores (dashboard `/admin`)
- Barra de legenda sempre visível acima da tabela (não só tooltip no hover): `NEW` = cadastro nos últimos 7 dias · `✔` verde = email confirmado · `!` amarelo = email não confirmado · `—` na coluna Dieta = utilizador ainda não escolheu dieta.

### Diagnóstico de dieta (cards no dashboard)
- `stats.no_diet` / `no_diet_legacy` / `no_diet_recent` — contagem de users com `diet_id IS NULL`, dividida em antes/depois de `2026-05-19` (data em que o diet-sync com o servidor entrou em produção, commit `213daf9`). Serve pra distinguir contas antigas que nunca vão ter dieta (legado, sem solução retroactiva) de um problema activo (se `no_diet_recent` crescer, investigar).
- Implementado em `getAdminStats()` (`server/src/db.js`) + cards no `htmlAdminPage()` (`server/src/server.js`).

### Push Broadcast — histórico (`push_broadcasts` table, migração `020_push_broadcasts.sql`)
- Antes disto, cada broadcast de push (`POST /admin/push/broadcast`) só mostrava um resumo efémero na própria página — nada era persistido.
- Agora cada envio grava `title, body, locale, user_type, route, total_count, ok_count, error_count, invalid_count, created_at` em `push_broadcasts` (`logPushBroadcast` em `db.js`).
- `GET /admin/push` lista os últimos 30 broadcasts numa tabela abaixo do formulário (`listPushBroadcasts`).

### RevenueCat — utilizadores contados divergem do Admin (não é bug)
- RevenueCat pode mostrar bem mais utilizadores que o admin (ex: 200+ vs ~100+). **Motivo:** `initPurchases()` roda no module-scope de `App.js` — o SDK é inicializado assim que o app abre, antes de qualquer login, criando um "customer" anónimo no RevenueCat pra qualquer pessoa que apenas abra o app. Só `loginPurchasesUser(userId)` (chamado em `AuthContext` após login, ver `purchasesService.native.js`) associa esse ID anónimo a uma conta real. O admin conta só linhas reais na tabela `users`. A diferença é gente que abriu o app e nunca se registou — normal, não precisa de fix.

### Bug corrigido: falha silenciosa ao salvar perfil (dieta/alergias)
- `AppContext.saveProfile()` engolia qualquer erro da API (`catch {}`) — se o `PATCH /user/profile` falhasse por qualquer motivo, o user nunca sabia e seguia em frente achando que salvou. Auditoria não achou bug activo na query SQL (a coluna `allergy_ids` é `jsonb`, compatível com o `JSON.stringify` usado em `updateUserProfile`), mas a falha silenciosa em si já é um problema de observabilidade.
- Corrigido: `saveProfile()` agora propaga o erro; `ProfileSetupScreen` e `EditPersonalScreen` mostram alerta (`profile_setup.save_error`, 6 idiomas) e permitem tentar de novo em vez de navegar como se tivesse dado certo.
- Contas antigas sem dieta (criadas antes do diet-sync existir) não têm solução retroactiva automática — ver "Diagnóstico de dieta" acima.

---

## 1.0.12 — fixes de Meta SDK + RevenueCat

- **Meta Client Token corrigido:** `eas.json` tinha um `b` extra no `EXPO_PUBLIC_FB_CLIENT_TOKEN` (33 chars em vez de 32) — SDK autenticava com token inválido, eventos não chegavam ao Events Manager. Corrigido em ambos os profiles (`novaqi-android`, `novaqi-ios`).
- **RevenueCat — leak de plano grátis corrigido:** ver nota na secção "RevenueCat — chaves API" acima (`entitlementToUserType`).
- **`package.json` `update:novaqi`:** tinha uma RevenueCat iOS key embaralhada (não fazia diferença real já que a key usada em runtime é a hardcoded em `purchasesService.native.js`, mas era um risco se algum dia essa env var passasse a ser lida) — corrigida, e adicionadas as vars `EXPO_PUBLIC_FB_APP_ID`/`EXPO_PUBLIC_FB_CLIENT_TOKEN` que faltavam nesse script.
- **Version bump:** `1.0.11 → 1.0.12`, `versionCode 14 → 15`.
- **Force update:** `min` bumped pra `1.0.12` em iOS e Android depois de confirmado que ambos builds estavam live nas lojas.

---

## Build / Deploy 1.0.11

### Antes do build
- ✅ `npm install` (Mac) — confirmar package versions correctas (`expo-doctor` 18/18)
- ✅ `eas credentials` para iOS (APNs key já configurada — `2QK7NN5PZ6`)
- ✅ Firebase config files no repo (`google-services.json`, `GoogleService-Info.plist`)
- ✅ `firebase.json` no repo (analytics off por defeito até ATT consent)

### Build
```bash
# Mac:
git pull origin main
npm install
npm run build:ios:novaqi     # ~25 min (Firebase + static frameworks)
npm run build:android:novaqi # ~15 min
```

### Submit
- **iOS:** Davi prefere Transporter (em vez de `npm run submit:ios:novaqi`)
- **Android:** download `.aab` no EAS + upload manual em Play Console (ainda sem service account `google-play-key.json`)

### App Store Connect — antes do submit 1.0.11
- App Privacy → Data Linked to You → Device ID: marcar Meta + **Google** (purposes Third-Party Advertising + Developer's Advertising + Analytics)
- Adicionar Purchases (RevenueCat subscriptions)
- Adicionar Sensitive Info (diet inclui halal → religious belief)
- Adicionar Crash Data (Firebase recolhe)
- Release Notes: "Convida amigos e ganha scans bónus 🎁. Notificações push para novidades."

### Play Console — antes do submit
- Data Safety: Device or other IDs + App activity → shared com Meta + Google
- Release notes idem

---

## Credenciais — referência rápida

| Item | Valor |
|---|---|
| Apple Team ID | `GS5MM3Y3AX` |
| APNs Key (NovaQI Push) | Key ID `2QK7NN5PZ6` (em uso pelo EAS) |
| Firebase Project | `novaqi-9dd63` |
| Firebase Sender ID | `529528181342` |
| App Store Connect App ID | `6775790620` |
| Bundle ID iOS / package Android | `app.novaqi` |
| FB App ID | `1717962282965252` |
| Apple ID (eas.json) | `daviwazlawick@gmail.com` |
| Apple ID (eas credentials login) | `davi.work.station@gmail.com` |

---

## 1.0.13 — Sessão 2026-07-06 (em build, ainda não submetido)

### 1) Sign in with Apple + Google (NovaQI apenas)

**Decisão de arquitectura:** backend próprio valida os tokens dos providers, NÃO usa Firebase Auth. Motivos:
- Já temos JWT + user model próprio; adicionar Firebase Auth seria duplicar identidades
- `@react-native-firebase/*` continua incompatível com Expo SDK 54 + `useFrameworks: 'static'` (mesmo motivo que revertimos em 1.0.11)
- Firebase continua a servir Analytics/Ads/Push — `google-services.json` + `GoogleService-Info.plist` são só para essas features, não Auth

**Backend:**
- Migração `021_oauth_identities.sql` — adiciona `apple_sub`, `google_sub`, `oauth_provider` em `users`; torna `password_hash` NULLABLE; índices únicos parciais em `apple_sub` e `google_sub`
- `server/src/oauth.js` — `verifyGoogleIdToken` via `google-auth-library` (aceita qualquer audience em `GOOGLE_OAUTH_CLIENT_IDS`), `verifyAppleIdentityToken` via `jose` contra JWKs da Apple (`aud = APPLE_OAUTH_AUDIENCES`, `iss = appleid.apple.com`)
- `server/src/db.js` — `findUserByOAuthSub(provider, sub)`, `linkOAuthToUser(userId, provider, sub)`, `createOAuthUser({ email, provider, sub, disclaimerVersion, referralCodeInput })`. OAuth users nascem com `email_confirmed = true` (o provider já verificou), sem password, com disclaimer aceite
- `POST /auth/google` e `POST /auth/apple` em `server.js` — fluxo: **(a)** procura user por `sub` → **(b)** procura por email → link → **(c)** cria novo. Devolve `{ token, user: { id, email }, isNewUser }`. Em edge case Apple sem email + sem match, devolve `409 apple_email_missing_reauth_required`
- `server/package.json` — adicionadas deps `google-auth-library` + `jose`
- `server/.env` novos (gitignored):
  - `GOOGLE_OAUTH_CLIENT_IDS=<web_client_id>,<ios_client_id>` — comma-separated, aceites como `aud` do id_token
  - `APPLE_OAUTH_AUDIENCES=app.novaqi`

**App:**
- Packages: `expo-apple-authentication` `~8.0.8` + `@react-native-google-signin/google-signin` `^16.1.2`
- `app.config.js` iOS: `usesAppleSignIn: true` (só se NovaQI) — puxa o entitlement `com.apple.developer.applesignin` para o provisioning profile
- `app.config.js` plugins iOS-only: `expo-apple-authentication` + `@react-native-google-signin/google-signin` (config plugin com `iosUrlScheme` = `REVERSED_CLIENT_ID`)
- `src/services/socialAuthService.native.js` — usa **lazy require + try/catch** para carregar os módulos nativos, para permitir que este bundle corra num runtime OTA para 1.0.12 (que não tem os módulos linkados) sem crashar
- `src/services/socialAuthService.js` — web/no-op stub
- `src/components/SocialAuthButtons.js` — renderiza o botão nativo Apple no iOS (`AppleAuthentication.AppleAuthenticationButton`) e um botão Google style guide-compliant. Guard `AppleAuthentication?.AppleAuthenticationButton && ...` para não crashar em runtimes sem o módulo
- `src/context/AuthContext.js` — `signInWithProvider(provider, { disclaimerVersion, referralCode })`. No RegisterScreen passa `DISCLAIMER_VERSION` (aceitação implícita ao tocar, com hint text). No LoginScreen não passa — se user novo tentar login social, backend rejeita com `disclaimer_acceptance is required`
- i18n em pt/en/de/es/fr/it: `auth.or`, `auth.continue_with_google`, `auth.social_failed`, `auth.social_apple_reauth`, `auth.social_terms_hint`
- `eas.json` NovaQI profiles: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`

**Firebase project `novaqi-9dd63`:**
- Web Client ID: `529528181342-k25vds3r9sr0fon0rvs0i4ni3q8utsjd.apps.googleusercontent.com`
- iOS Client ID: `529528181342-vms6qe7ue4d3d1unoentfgvcjrqbtnpd.apps.googleusercontent.com`
- REVERSED_CLIENT_ID: `com.googleusercontent.apps.529528181342-vms6qe7ue4d3d1unoentfgvcjrqbtnpd`
- Android Client ID: `529528181342-2ci41o01dffrqd4ceh6mehfm8ujcb17q.apps.googleusercontent.com` (aparece só depois de SHA-1 adicionado)
- SHA-1 do keystore EAS Android (novaqi-android): `FE:A1:14:DB:2C:0A:5D:EA:5A:7A:26:CD:6E:1F:26:A4:AF:D1:BA:EE` — adicionado no Firebase Console 2026-07-06
- Analytics: ativo (dashboard mostra dados reais); `IS_ANALYTICS_ENABLED=false` no plist é artifact do download

**Fix crítico do build iOS:** `AppCheckCore` (Swift, transitive dep de `GoogleSignIn`) precisa que `GoogleUtilities` + `RecaptchaInterop` gerem module maps. Resolvido com `expo-build-properties` no `app.config.js` — `extraPods` com `modular_headers: true` só para esses dois pods (evita `use_modular_headers!` global). Sem isto, `pod install` falha com "Swift pods cannot yet be integrated as static libraries".

**Account linking automático:** se email do provider bate com user existente (email/password), o backend liga o `sub` automaticamente. Sem confirmação, sem fricção.

**Apple relay email:** aceite tal como veio (`@privaterelay.appleid.com`). User pode trocar depois no `EditPersonalScreen`.

**EAS credentials sync executado 2026-07-06:**
- Provisioning profile `AFRYCGTQ4K` regenerado com o entitlement Apple Sign In (mesmo com `Synced capabilities: No updates` porque o App ID já tinha a capability enabled quando o EAS sync correu)
- Android keystore existente reutilizado; SHA-1 usado para Firebase

**Estado final da sessão:** Build iOS 1.0.13 a correr no EAS. Build Android adiado — sem créditos EAS disponíveis, será feito quando renovarem. Backend deployado, migração aplicada, endpoints testados via curl.

---

### 2) Feature flag `HIDE_FREE_OPTION` (experiência de 1 semana)

Ficheiro: `src/constants/features.js` — flag `HIDE_FREE_OPTION = true`.

**Aplicado em dois pontos:**
- `src/screens/PaywallScreen.js:282` — esconde link "Continue with Free plan" no fim da lista quando `currentPlan === 'free'`
- `src/screens/ProfileSetupScreen.js:229` — esconde link no onboarding (função `handleContinueFree` mantida no código, só o botão foi wrapped)

**Objectivo:** medir se remover o escape hatch aumenta conversões para free trial. A/B experiment de 1 semana.

**Como reverter:** editar `HIDE_FREE_OPTION = false` → commit → OTA. Sem native rebuild.

**Compliance:** o free trial (2 semanas iOS / 15 dias Android via App Store/Play Store) continua visível — Apple 3.1.2(a) aceita. Se removêssemos O TRIAL, aí sim rejeição.

---

### 3) Trial disclosure + trial pill amber

**`plans.trial_disclosure`** — micro-copy abaixo do CTA de subscribe, em 6 idiomas. Explica: *"Grátis por 14 dias. Depois cobrado automaticamente. Cancela quando quiseres nas definições da conta — nada é cobrado durante o período de teste."*
- Renderizado no `PaywallScreen` só se `hasTrial(selected)`
- Renderizado no `ProfileSetupScreen` sempre (durante onboarding é a primeira vez que o user vê preços)

**`plans.trial_pill_ios` / `trial_pill_android`** — pill amber (`Colors.accent`, branco por cima, letter-spacing 0.6, sombra, borderRadius 999) com texto `🎁 2 SEMANAS GRÁTIS` / `🎁 15 DIAS GRÁTIS` em 6 idiomas. Substitui o texto verde 11pt subtil que existia antes.
- `PaywallScreen`: em cada plan card que tem trial (`hasTrial(plan.id)`)
- `ProfileSetupScreen`: em cada plan card (assume trial em ambos os planos)

Cor: `Colors.accent` do brand — dourado no VeganLand (`#D4B06A`), amarelo/laranja no NovaQI (`#E8A020`). Zero branding logic no componente.

---

### 4) Bugs pré-existentes corrigidos

**Bug 1 — `origin is not defined` no `catch` do handler HTTP (`server.js`)**
- Introduzido 2026-05-25 (Fabricio, commit `a85b3211`)
- `const origin` estava dentro do `try`; quando qualquer request faz throw (ex: Anthropic devolve JSON malformado em `analyzeProduct`), o `catch` tentava usar `origin` → `ReferenceError` → `unhandledRejection`. Não matava o processo, mas quebrava a resposta 500 ao cliente e poluía logs
- Fix: mover `const origin = req.headers['origin'] || ''` e `const host = req.headers['host'] || ''` para ANTES do `try`

**Bug 2 — XSS armazenado no admin panel (`server.js`)**
- User input interpolado em HTML sem escape em `htmlAdminPage` (email, diet, monthLabel, joinedFull), `htmlAdminPushPage` (title, body, locale, user_type, route do histórico), `htmlAdminUserPage` (email, diet, allergies, product, brand, source, explanation, concerns)
- Severidade: maioritariamente auto-XSS (só admin entra), mas `u.email` seria XSS armazenado se um user malicioso conseguisse registar email com `<script>...</script>`
- Fix: helper global `esc(s)` no topo de `server.js` (linha 20), aplicado sistematicamente em todos os spots dinâmicos

---

### 5) Runtime versions e OTA — armadilha e workaround

**Lição aprendida:** `runtimeVersion.policy = 'appVersion'` significa que cada OTA é publicado para o runtime igual ao `version` actual em `app.config.js`. Após bumpar version para `1.0.13` (commit `907516d`), o `npm run update:novaqi` publica para runtime `1.0.13` — NÃO chega a users em `1.0.12` (a versão da store).

**Se precisares backportar OTA para uma versão em produção** (ex: `1.0.12`):
```bash
# 1. Editar TEMPORARIAMENTE a version no app.config.js
sed -i.bak "s/version: '1.0.13'/version: '1.0.12'/" app.config.js

# 2. Publicar OTA (agora vai para runtime 1.0.12)
npm run update:novaqi
npm run update:veganland

# 3. Restaurar (NÃO commitar a mudança temporária)
mv app.config.js.bak app.config.js
```

**Cuidado:** o bundle actual do repo pode conter código que depende de módulos nativos ausentes na build de produção (ex: `expo-apple-authentication` não existe em 1.0.12). Antes de fazer OTA para uma versão antiga, guardar TODOS os imports de módulos nativos novos com `try { require(...) } catch {}` (ver `src/services/socialAuthService.native.js` como exemplo).

O flag `--runtime-version` foi REMOVIDO no `eas-cli` 20+; a única forma agora é editar `app.config.js` (ou usar `EXPO_PUBLIC_UPDATES_RUNTIME_VERSION` env var — não testado).

**Decisão actual da sessão:** esperar por 1.0.13 aprovada em vez de OTA backport para 1.0.12. Motivo: menos superfície de risco, sample cleaner para A/B experiment, narrativa unificada no "What's New" (social login + hide free + trial pill juntos).

---

### 6) Componentes e ficheiros novos desta versão

```
src/services/
  socialAuthService.native.js     — Apple + Google native flow (lazy require + try/catch)
  socialAuthService.js            — web/no-op stub
src/components/
  SocialAuthButtons.js            — botão Apple oficial + botão Google style guide
src/constants/
  features.js                     — HIDE_FREE_OPTION flag
server/src/
  oauth.js                        — verifyGoogleIdToken + verifyAppleIdentityToken
server/src/migrations/
  021_oauth_identities.sql        — apple_sub, google_sub, oauth_provider
```

Alterações significativas:
- `src/context/AuthContext.js` — `signInWithProvider`
- `src/services/apiService.js` — `apiOAuthSignIn(provider, payload)`
- `src/screens/LoginScreen.js` — `<SocialAuthButtons />` no fim do card
- `src/screens/RegisterScreen.js` — `<SocialAuthButtons />` com `disclaimerVersion` + `referralCode`
- `src/screens/PaywallScreen.js` — trial pill + trial disclosure + esconder continue-free
- `src/screens/ProfileSetupScreen.js` — trial pill + trial disclosure + esconder continue-free
- `app.config.js` — plugins social + `usesAppleSignIn` + `expo-build-properties` (modular_headers workaround)
- `eas.json` — env vars Google novos, NovaQI profiles apenas
- `package.json` — script `update:novaqi` inclui os env vars Google

---

### 7) Próximos passos ao retomar

1. Confirmar que build iOS 1.0.13 no EAS passou (após o fix `expo-build-properties`)
2. `eas submit --platform ios --latest` → TestFlight → testar Sign in with Apple + Sign in with Google + hide-free + trial pill em dispositivo real
3. Submeter iOS 1.0.13 para App Store Review
4. Quando créditos EAS renovarem: `eas build --platform android --profile novaqi-android` → `eas submit --platform android --latest`
5. **App Store Connect** "What's New" 1.0.13: *"Sign in with Apple and Google for faster signup."*
6. **Data Safety / Nutrition Labels:** NÃO precisam actualização (não coletamos dados novos; `sub` é anónimo)

---

## Sessão 2026-08-06 — Módulo de Nutrição (web-only, OTA-safe)

Tudo o que foi implementado nesta sessão. Nenhuma mudança requer build nativo.

### Módulo de Nutrição — visão geral

Contextos e hooks de nutrição:
- `src/context/NutritionContext.js` — `goals`, `bodyProfile`, `todayLog`, `todayTotals`, `weightHistory`, `logConsumption()`, `deleteConsumption()`, `addWeight()`, `refresh()`
- BD: `consumption_log`, `user_nutrition_goals`, `body_profiles`, `weight_log`

---

### 1) Fix `consumed_at` NOT NULL

`addConsumptionEntry` em `db.js` passava `consumed_at: null` explicitamente no INSERT, quebrando a constraint `NOT NULL DEFAULT now()`. Fix: remover coluna do INSERT e deixar o default da BD actuar.

---

### 2) "I Will Eat It" só para alimentos (não suplementos)

**`ResultScreen.js`** — lógica de detecção de tipo:
- `product_type` adicionado a `fullResult` em `analyze.js` (antes estava ausente → sempre `undefined`)
- `productTypeFromCategories(categoriesTags)` em `analyze.js` detecta suplementos via `categories_tags` do OFF (termos: supplement, vitamin, mineral, multivitamin, probiotic, protein powder, nutraceutical, herbal)
- Client-side: `isFood = !isSupplementByCategory && (!result.product_type || FOOD_PRODUCT_TYPES.has(result.product_type))`
- Botão "I Will Eat It" só aparece quando `isFood === true`

---

### 3) Merge BodyProfile + EditPersonal

`EditPersonalScreen.js` foi reescrito para incluir todos os campos de perfil corporal (sexo, data de nascimento, altura, peso, actividade, objectivo). Antes era um ecrã separado (`BodyProfileScreen`). `ProfileScreen` navega para `EditPersonal` em vez de `BodyProfile` para tudo o que seja informação pessoal.

---

### 4) Análise de prato com câmera web

`PlateAnalysisScreen.js` — câmera web via:
```js
const input = document.createElement('input');
input.type = 'file';
input.accept = 'image/*';
input.capture = 'environment';
input.click();
```
`launchCameraAsync` do Expo no web abre galeria (file picker) — para câmera real no mobile browser é necessário o `capture='environment'` no input nativo.

---

### 5) Análise de prato com avaliação dietética

`anthropic.js` — `analyzePlate(imageBase64, language, profile)` envia o perfil dietético do utilizador (diet + alergias) no prompt e devolve:
- `diet_verdict: { status: 'SAFE'|'CAUTION'|'NOT_SAFE', concerns, explanation }`
- Por item: `item_status`, `item_concern`

`server.js` `/analyze-plate` extrai o perfil do body ou do utilizador na BD.

`PlateAnalysisScreen.js` mostra banner colorido SAFE/CAUTION/NOT_SAFE com dot de estado por item.

---

### 6) Itens editáveis na análise de prato

`PlateAnalysisScreen.js` — funcionalidades:
- Tap num item → modal de edição (nome, grams, kcal, proteína, gordura, carbs, fibra)
- Adicionar item novo (botão "+")
- Autocompletar nome: `FOOD_SUGGESTIONS[language]` com lista por idioma (6 idiomas)
- Editar nome manualmente limpa `item_status`/`item_concern` → forçar re-avaliação
- Qualquer edição/remoção limpa `diet_verdict` (banner some até re-análise)
- Modal usa `<View>` NOT `<ScrollView>` — ScrollView com `keyboardShouldPersistTaps` dentro de Modal bloqueia TouchableOpacity no web

---

### 7) Água rápida no NutritionDashboard + HomeScreen

**NutritionDashboard:** card com +150/250/330/500ml  
**HomeScreen:** card water com +250/+500ml + total ml de hoje  
Ambos chamam `logConsumption({ product_name: 'Water', source: 'manual', water_ml: ml, meal_type: null })`

---

### 8) Fix delete no NutritionDashboard (web)

`Alert.alert` com botões customizados não funciona no web (usa `window.confirm` internamente, que não suporta múltiplos botões).

Fix em `NutritionDashboardScreen.js`:
```js
function handleDelete(id, name) {
  if (Platform.OS === 'web') {
    if (window.confirm(`Delete "${name}"?`)) deleteConsumption(id);
  } else {
    Alert.alert(...);
  }
}
```

---

### 9) Entrada manual de alimentos no NutritionDashboard

Modal com campos: nome, selector de refeição (chips breakfast/lunch/dinner/snack), grams, kcal, proteína, gordura, carbs. Chama `logConsumption` directamente — **sem usar créditos de scan**.

---

### 10) Botão Add Food na HomeScreen

`HomeScreen.js` — botão "✏️ Add food" navega para `NutritionDashboard` com parâmetro `{ openAddFood: true }`. `NutritionDashboardScreen` detecta o parâmetro em `useFocusEffect` e abre o modal automaticamente.

---

### 11) Análise de prato conta como scan do plano

`server.js` `/analyze-plate` — chama `checkAndIncrementScanCounter(claims.userId)` antes de correr a análise. Devolve 429 se o utilizador atingiu o limite mensal. `apiService.js` lança `Error('scan_limit_reached')` em 429. `PlateAnalysisScreen` mostra a mensagem de limite localizada.

---

### 12) Busca de alimentos com autocomplete

**Endpoint:** `GET /nutrition/search?q=...`  
**3 sources em paralelo:**
1. `consumption_log` do próprio utilizador (histórico pessoal, prioridade máxima)
2. `consumption_log` global agregado (média de macros de todos os utilizadores)
3. `products` JOIN `scan_events` — produtos OFF já scaneados, nutrição extraída do JSON: `result->'productInfo'->'offMeta'->'nutrition_100g'`
4. OFF live API fallback (`searchOffProducts()` em `openFoodFacts.js`) com timeout 4s — cobre produtos nunca scaneados na plataforma

**Client:** debounce 350ms, mín 2 chars, sugestões mostradas abaixo do campo de nome. Tap numa sugestão preenche grams/kcal/proteína/gordura/carbs automaticamente.

Campos de nutrição no JSON do OFF (`nutrition_100g`): `energy_kcal`, `proteins`, `carbohydrates`, `fat`, `fiber`, `sugars`, `salt` — todos per 100g.

---

### 13) Pratos recentes na HomeScreen

**Endpoint:** `GET /nutrition/plates` — retorna até 10 entradas de `consumption_log` com `source='plate_photo'`, deduplicadas por `(product_name, consumed_at::date)`, ordenadas por data desc.

`HomeScreen` busca ao montar (quando autenticado) e mostra secção "🍽️ Pratos recentes" abaixo de "Recent scans".

---

### 14) Fixes PlateAnalysis modal delete + webp + scan count (2026-08-06 tarde)

**Delete não funcionava:** `TouchableWithoutFeedback > View (flex:1)` sobrepõe o modal card no web via CSS stacking context — swallows all pointer events including the header delete icon. Fix: substituir por `TouchableOpacity` com `StyleSheet.absoluteFillObject` como backdrop. O modal card fica sempre clicável pois é sibling no DOM, não filho do backdrop.

**WebP rejeitado pela Anthropic:** câmera web devolve imagens webp mas o código enviava sempre `media_type: 'image/jpeg'`. Anthropic rejeita com `"image appears to be a image/webp image"`. Fix: detetar tipo real pelos magic bytes do base64:
- `/9j/` → `image/jpeg`
- `iVBORw` → `image/png`
- `UklGR` → `image/webp`
- `R0lGOD` → `image/gif`

**Scan count badge no home:** mostrava `scanHistory.length` (só barcode scans de `scan_events`). Plate analyses não entram em `scan_events`, então o badge não subia. Fix:
- `AppContext` carrega `usage.count` de `GET /user/me` no login → `monthlyScanCount`
- `addScanToHistory` incrementa `monthlyScanCount` (barcode scans)
- `PlateAnalysisScreen` incrementa `monthlyScanCount` após análise bem-sucedida
- Home badge mostra `monthlyScanCount || scanHistory.length`

**Recalcular macros ao mudar gramas:** ao abrir o modal de edição, guarda rácios per-gram. Ao alterar o campo grams, kcal/prot/fat/carbs/fiber recalculam proporcionalmente.

---

### nginx — novas rotas a adicionar

As seguintes rotas do servidor foram adicionadas mas podem não estar no nginx:
```
/nutrition/.+
/analyze-plate
```
Verificar em `/etc/nginx/sites-available/` e adicionar se necessário.

---

### BD — tabelas novas desta sessão

**`consumption_log`**
- `user_id`, `product_name`, `source` (`'scan'`|`'manual'`|`'plate_photo'`), `grams`, `meal_type`, `calories_kcal`, `protein_g`, `fat_g`, `carbs_g`, `fiber_g`, `sugar_g`, `salt_g`, `water_ml`, `notes`, `consumed_at timestamptz NOT NULL DEFAULT now()`

**`weight_log`**
- `user_id`, `weight_kg`, `recorded_at`

**`user_nutrition_goals`**
- `user_id`, `calories_kcal`, `protein_g`, `fat_g`, `carbs_g`, `fiber_g`, `sugar_g`, `salt_g`, `water_ml`, `is_custom`

**`body_profiles`**
- `user_id`, `sex`, `birth_date`, `height_cm`, `weight_kg`, `activity_level`, `goal`

---

### Ficheiros novos desta sessão

```
src/screens/
  NutritionDashboardScreen.js  — dashboard diário com macros, água, peso, refeições, add food
  NutritionGoalsScreen.js      — configuração de metas (calories, protein, etc.)
  NutritionReportScreen.js     — relatório por período
  PlateAnalysisScreen.js       — foto de prato → análise IA → editar itens → log
  BodyProfileScreen.js         — dados corporais (integrado em EditPersonalScreen)
src/context/
  NutritionContext.js          — goals, todayLog, todayTotals, logConsumption, etc.
```

---

## Sessão 2026-08-07 — Rebrand NovaQI "Icon C" (web-only, OTA e build nativo intocados)

Rebrand visual completo do NovaQI a partir de um design handoff (HTML de referência + README). **Só aplicado ao NovaQI** — todas as mudanças de layout (não só cor) ficam atrás de `Brand.id === 'novaqi'` nos ficheiros partilhados; `src/brand/veganland.js` e o layout do VeganLand ficam intocados.

### 1) Paleta — `src/brand/novaqi.js`

Verde vira a cor de ação primária (era âmbar), âmbar vira accent/secundário:

```js
primary: '#16A75A', primaryDark: '#0A6334', primaryLight: '#E2F7EA', primaryBg: '#F6F3EB',
accent: '#E8991C', accentDark: '#A6610B', accentLight: '#FBEFCF',
forest/darkSurface/navy: '#0E1B14', navyDeep: '#06110C', navyMid: '#143524',
background: '#F6F3EB', backgroundSecondary: '#ECE7DA',
text: '#121814', textLight: '#5A6A63', textMuted: '#7C8B84', border: '#E2DBC9',
safe: '#128A4B', caution: '#C8790F', danger: '#D6453B',
footerScrim: 'rgba(246,243,235,0.94)', // token novo, footer fixo sobre scroll
```

### 2) Ícone "Icon C" — anel + rabo de folha

Concept: anel (lente de scan / "Q" de QI) com um rabo em forma de folha (nutrição), dois tons — anel verde, rabo âmbar. Geometria fonte (viewBox 100×100): `circle cx=46 cy=46 r=30 stroke-width=9` + `path M62 66 C74 72 82 82 84 90 stroke-width=9 round-cap`. Par "bright" para fundos escuros: ring `#2FC472`, tail `#F4B53F`. Par "deep" pra fundos claros: `#16A75A`/`#E8991C`.

- **`src/components/ui/NovaQILogo.js`** — reescrito de View-based target/radar pra View-based Icon C (2 barras rotacionadas aproximando a bezier do rabo, sem depender de SVG lib — este componente entra por OTA). `color` prop controla o anel (default `Colors.primary`), rabo fixo em `Colors.accent`.
- **`assets/novaqi/*.svg`** — todos os 7 ficheiros de logo/ícone vêm agora directo dos SVGs entregues pelo designer (2ª ronda do handoff, `logo-assets/`), não são mais recriados à mão:
  - `novaqi-icon.svg` — square icon fonte (forest bg + par bright), usado por `BrandLogo.js` e como fonte pra regenerar os PNGs
  - `novaqi-favicon.svg` — versão simplificada (só anel, sem rabo — ilegível abaixo de ~32px)
  - `novaqi-logo-light.svg` / `novaqi-logo-dark.svg` — lockup ícone+wordmark (viewBox 320×70, ring r=21 stroke=6)
  - `novaqi-logo-mono.svg` — **mudou de forma**: antes era wordmark completo mono, agora é só o ícone (ring+tail) numa cor só (`#121814`) — reflecte o novo handoff
  - `novaqi-icon-mark-transparent.svg` — novo ficheiro, ring+tail sem fundo, pra contextos que já têm o próprio fundo. **Não está integrado em nenhum componente ainda** (`BrandLogo.js` continua a usar `novaqi-icon.svg`, o quadrado com fundo) — decisão consciente de não mudar o comportamento visual do `BrandLogo` sem pedido explícito.
- **PNGs** (`icon.png`, `adaptive-icon.png`, `icon-512.png`, `splash-icon.png`, `favicon.png`, `notification-icon.png`) regenerados a partir dos SVGs do designer via **Chrome headless** (`--headless --screenshot=... --window-size=W,H file://...svg`), não Pillow — dá anti-aliasing e round-caps correctos do motor de render real, sem os artefactos em dente-de-serra que apareceram numa tentativa anterior com `PIL.ImageDraw.line`.
  - **Armadilha:** Chrome headless devolve PNG **em branco** (totalmente transparente) em `--window-size` pequeno (testado: falha em 48×48 e 96×96, funciona normal a partir de ~512×512). Workaround: renderizar sempre grande (800×800) e reduzir com `PIL.Image.resize(..., LANCZOS)` pros tamanhos pequenos (favicon 48×48, notification-icon 96×96).
  - `icon.png`/`adaptive-icon.png`/`splash-icon.png` são idênticos (cópia directa), `icon-512.png` é o mesmo mark a 512px.

### 3) Streak real (pedido a meio da sessão, sem dado fabricado)

- **`server/src/db.js`** — `getUserStreak(userId)`: dias consecutivos com pelo menos um `scan_events` ou `consumption_log` pro user, terminando hoje ou ontem (senão devolve 0).
- **`GET /auth/me`** devolve agora `{ user, usage, streak }`.
- **`AppContext.js`** expõe `streak`; consumido no badge âmbar do header do `HomeScreen` e na stats row do `ProfileScreen` (streak + scans, 2 stats, sem "treinos" — esse 3º stat nunca existiu no código, só no handoff).

### 4) Anel de calorias — `react-native-svg`

`HomeScreen.js` — componente `CalorieRing` (`Svg`/`Circle` com `strokeDasharray`/`strokeDashoffset`), substitui as 4 barras flat antigas do widget de nutrição. Isto **é** um módulo nativo novo (`react-native-svg` adicionado ao `package.json`) — só entra em produção no próximo `eas build`, não por OTA.

### 5) Páginas server-rendered (fora do sistema `Colors.X`)

O rebrand do app React Native não propaga pra HTML gerado no servidor — são ficheiros separados com cores hardcoded. Corrigidos nesta sessão:
- **`about.js`** — `NOVAQI_TARGET_SVG`/`NOVAQI_TARGET_ICON` (ícone alvo/radar antigo) trocados pelo Icon C, `BRANDS.novaqi` paleta actualizada
- **`support.js`, `legal.js`** — `BRANDS.novaqi.primaryColor`/`.dark` actualizados
- **`email.js`** — cor do e-mail transacional NovaQI + emoji (`🎯` → `🔍`, o alvo já não faz sentido)
- **`server.js`** — `STORE_LINKS['novaqi.app']` (usado por `/get` e a landing de migração VeganLand→NovaQI), mais literais hardcoded em `htmlReferralLanding`/`htmlBrandMigrationLanding` que não passavam por `STORE_LINKS`
- **Painel admin deixado como está** (interno, atrás de login — não é superfície de marca pública)

### 6) Decisão de deploy: só web, OTA e build nativo ficam pra depois

Todo o trabalho desta sessão saiu só via `npm run build:novaqi:deploy` (web export pra `/var/www/novaqi`) + `pm2 restart veganland-api` no servidor `veganland` (SSH configurado em `~/.ssh/config`). **Nenhum `eas update` foi corrido** — o app nativo instalado (iOS/Android) continua na versão anterior até decisão explícita de fazer OTA ou novo build. Isto foi pedido explicitamente pelo utilizador: "deixamos os updates de iOS e Android app pra depois e vamos fazer as trocas todas apenas no web".

**Sem branch** — todo o trabalho desta sessão foi commitado directo em `main` (ver memória `feedback_no_branches.md` — o utilizador nunca quer branches neste repo, mesmo pra mudanças grandes).

---

## Sessão 2026-08-08 — Fixes nutrição + nginx + expand ForestSummaryCard

### 1) nginx novaqi.app — rotas em falta

`/etc/nginx/sites-available/novaqi.app` não tinha as rotas `analyze-plate` e `nutrition/.+` (adicionadas no módulo de nutrição mas nunca inseridas no nginx). Corrigido com `sed` + `nginx -t && systemctl reload nginx`. O veganland.app foi intencionalmente deixado sem estas rotas — o módulo de nutrição é só para NovaQI.

### 2) Migração 030 já aplicada

`030_search_extensions.sql` (unaccent + pg_trgm + índices GIN) foi aplicada às 11h15 antes do commit de hoje — sem acção necessária.

### 3) Fix expand no ForestSummaryCard (NovaQI)

`ForestSummaryCard` só mostrava protein/carbs/fat. O botão `▼ More` existia apenas no card genérico, que não é renderizado no NovaQI (branch `isNovaQI`). Fix:
- `FOREST_BARS_EXTRA` adicionado: `fiber_g`, `sugar_g`, `salt_g`
- `ForestSummaryCard` recebe `expanded` + `onToggleExpand` como props
- Quando `expanded`, renderiza `FOREST_BARS_EXTRA` abaixo das 3 barras principais
- Botão `▼ More / ▲ Less` dentro do card (reutiliza `s.expandBtn`/`s.expandBtnText`)
- Parent passa `expanded` state e `() => setExpanded(!expanded)` (estado já existia, só faltava ligar)

Commit `9bafd82`, deployado em `novaqi.app` via `npm run build:novaqi:deploy`.

### 4) Fix busca de alimentos — filtro kcal removido + expansão AI não re-pesquisa BD

Dois bugs causavam resultados sem sentido (ex: buscar "feijao" devolvia "jelly beans"):

**Bug 1 — `searchOffProducts` filtrava `.filter(p => p.calories_kcal != null)`:** a OFF retorna feijão correctamente mas produtos sem macros preenchidas eram eliminados silenciosamente, deixando <5 resultados e disparando a expansão AI.
- Fix: filtro removido de `server/src/openFoodFacts.js`. Produtos sem macros aparecem na lista; o utilizador preenche à mão se quiser.

**Bug 2 — expansão AI re-pesquisava a BD com termos em inglês (`%beans%`):** quando a expansão gerava ["beans", "black beans", ...], a BD era re-pesquisada com esses padrões → batia em "jelly beans", "coffee beans", "vanilla beans", etc.
- Fix: na expansão, só a OFF live API é re-consultada com o termo traduzido/categoria; a BD nunca volta a ser pesquisada com os termos em inglês (`server/src/server.js`).

Commit `ba4bf52`.

### 5) Fix ProfileScreen — usage count desactualizado após scans

`ProfileScreen` é uma tab permanente (fica mounted). `useEffect([token])` só corria uma vez no mount — o utilizador fazia scans, voltava à tab Profile e via a contagem antiga.
- Fix: `useEffect([token])` → `useFocusEffect(useCallback(..., [token]))`. O `apiGetMe` é re-feito sempre que a tab ganha foco.
- Commit incluído em `b662a95`.

### 6) Badge top-right HomeScreen (NovaQI) — streak + scans

O badge mostrava só o streak ("Days"). Substituído por badge dividido com dois valores:
- Esquerda: 🔥{streak} days
- Direita: {monthlyScanCount || scanHistory.length} scans
- Estilos: `splitBadge`, `splitBadgeCol`, `splitBadgeDivider`, `splitBadgeNum`, `splitBadgeLabel` em `HomeScreen.js`
- O badge do VeganLand (que já mostrava só scans) mantém-se igual.

---

## Sessão 2026-08-11 — Melhoria da busca de alimentos (Add Food modal)

### 1) Fallback AI para alimentos não encontrados em nenhum DB

Quando a busca de alimentos retorna <2 resultados mesmo após expansão AI + OFF live:
- `anthropic.js`: nova função `fetchNutritionalData(query, language)` — pede ao Claude valores nutricionais por 100g para alimentos genéricos (banana, frango, arroz, etc.). Para produtos de marca específica retorna `null` (dados insuficientes).
- `server.js`: após o fallback `expandSearchQuery`, se `merged.length < 2`, chama `fetchNutritionalData` como último recurso. Resultado marcado com `source: 'ai'`.
- Resultados AI aparecem com badge "AI" roxo na lista de sugestões.

### 2) Melhorias UX do modal Add Food (NutritionDashboardScreen.js)

**Grams obrigatório:**
- `handleSaveEntry` valida `grams > 0` antes de guardar. Se vazio, activa `gramsError` state.
- Label do campo mostra "Grams *". Quando `gramsError`, label fica vermelho + borda do input vermelha + "Required" abaixo.
- `gramsError` limpa-se quando o utilizador começa a digitar no campo.

**Lista de resultados melhorada:**
- `suggestBox` passou de `View` para `ScrollView` com `maxHeight: 220` e `keyboardShouldPersistTaps="handled"` — lista scrollável, fácil de seleccionar.
- Cada linha tem `minHeight: 52` para ser fácil de tocar.
- Estado `searching` (bool): indica ao utilizador que a pesquisa está em curso ("🔍 Searching…").
- `handleNameChange` activa `searching=true` antes do debounce e desactiva no `finally`.
- Badge "AI" (fundo roxo claro) nas sugestões vindas do fallback Claude.

**Backdrop e fechamento do modal:**
- `TouchableOpacity absoluteFillObject` como backdrop (padrão já usado em PlateAnalysisScreen).
- `onRequestClose` no Modal para fechar com botão back no Android.
- Botão Cancel também faz `Keyboard.dismiss()`.
- `modalCard` com `maxHeight: '90%'` para não ultrapassar o ecrã.

**Conteúdo do modal em ScrollView:**
- Os campos de meal picker, grams e macros ficam num `ScrollView` com `keyboardShouldPersistTaps="handled"` — garante que tocar nos campos não fecha o teclado.

### 3) Enriquecimento AI para resultados sem dados nutricionais

Quando um produto é encontrado pelo nome mas não tem macros (ex: "batata frita" na tabela OFF sem `nutrition_100g`):
- `server.js` `/nutrition/search`: após fundir todos os resultados, filtra itens com `calories_kcal == null` (até 3), chama `fetchNutritionalData` em paralelo para cada um.
- Se Claude retorna dados, preenche `calories_kcal`, `protein_g`, `fat_g`, `carbs_g`, `fiber_g`, `sugar_g`, `salt_g` no resultado. `source` fica `'ai_enriched'`.
- Badge "AI" roxo também aparece em `source === 'ai_enriched'` (além de `source === 'ai'`).
- Claude retorna `null` para marcas específicas sem dados fiáveis — item fica sem macros, utilizador preenche à mão.

### 4) Apenas gramas (selector ml/unit removido)

Selector de unidade (g/ml/unit) adicionado e depois removido a pedido — mantém-se só gramas para simplicidade. `EMPTY_ENTRY` e `handleSaveEntry` voltaram à forma original com campo `grams` único.

### 5) HomeScreen — logo completo no header (NovaQI)

- Antes: ícone pequeño scan + `BrandName` em texto ("Nova" branco + "QI" verde) — dois elementos separados.
- Depois: `<Image source={require('../../assets/novaqi/novaqi-logo-dark.svg')} style={{ height: 36, width: 166 }} resizeMode="contain" />` — SVG com círculo + wordmark tudo numa peça.
- O SVG `novaqi-logo-dark.svg` tem fundo transparente, texto branco e verde, optimizado para o header escuro (`#0E1B14`).
- VeganLand mantém `BrandName` em texto (sem SVG de logo completo disponível).
- Estilos removidos: `headerTitleRow`, `headerIconWrap`. Adicionado: `headerLogo: { height: 36, width: 166 }`.

Deploy NovaQI web (comando completo obrigatório com env vars):
```
EXPO_PUBLIC_BRAND=novaqi BRAND=novaqi EXPO_PUBLIC_API_URL=https://novaqi.app EXPO_PUBLIC_APP_API_KEY=79se0AyWPbh963SvguuDFi10JsT0Mr9U npx expo export --platform web && cp -r dist/* /var/www/novaqi/
```
**IMPORTANTE:** sem `EXPO_PUBLIC_BRAND=novaqi` o bundle compila como VeganLand — logo, anel de nutrição e layouts NovaQI ficam invisíveis.

---

## Sessão 2026-08-11 (tarde) — Push notifications automáticas de hidratação + diário alimentar

### Arquitectura

Worker `server/src/water-notif.js` com função `runNotifications()` chamada em `server.js` a cada 30 minutos (`setInterval 30×60×1000`). Primeiro disparo 2 minutos após o arranque do servidor.

### Slots de notificação (hora local do utilizador)

| Slot             | Hora local | Tipo  |
|------------------|-----------|-------|
| `water_morning`  | 09:00     | água  |
| `water_midday`   | 13:00     | água  |
| `water_afternoon`| 17:00     | água  |
| `food_morning`   | 08:30     | diário|
| `food_midday`    | 11:50     | diário|
| `food_evening`   | 19:00     | diário|

Janela de disparo: ±20 minutos do alvo (para tolerar cadência de 30 min). Usa `Intl.DateTimeFormat` em Node.js para calcular hora local por timezone de cada utilizador.

### Lógica por tipo

**Água:** personaliza a mensagem com `waterToday` vs `waterGoal`. Salta se meta já atingida. Mensagem contextual (0ml vs parcial vs quase lá).

**Diário alimentar:** convida a registar o consumo da refeição correspondente. Sempre envia (não verifica o que já foi registado — MVP).

### Deep-link nas notificações

- Água → `{ route: 'NutritionDashboard' }` — abre o dashboard
- Diário → `{ route: 'NutritionDashboard', params: { openAddFood: true } }` — abre o dashboard com o modal Add Food já aberto

`usePushNotifications.js` actualizado para passar `params` ao `navigate()`.

### Idiomas

Templates em 6 línguas: `pt`, `en`, `de`, `fr`, `it`, `es`. Usa o `locale` guardado no `push_tokens`.

### Timezone por utilizador

- DB: `ALTER TABLE push_tokens ADD COLUMN timezone TEXT` (migration 031)
- App `usePushNotifications.js`: envia `Intl.DateTimeFormat().resolvedOptions().timeZone` no registo do token
- `apiRegisterPush` + `apiService.js` + endpoint `/push/register` + `upsertPushToken` actualizados para aceitar e guardar `timezone`
- **Sync automático:** `PATCH /push/timezone` actualiza o timezone sem re-registo do token. `AppContext.js` chama `apiSyncPushTimezone(token)` sempre que o token muda (login).

### Anti-spam

Tabela `water_notification_log (user_id, slot, local_date, sent_at, water_ml_at_send)` criada em migration 031. Antes de enviar, verifica se `user_id:slot:local_date` já existe. Usa `ON CONFLICT DO NOTHING` no insert pós-envio.

### Quem recebe

Utilizadores com `push_tokens.timezone IS NOT NULL` (requer app nativo com token Expo) **E** `user_nutrition_goals.water_ml IS NOT NULL AND > 0` (nutrition goals configurados). Activo por defeito — opt-out via revogação de permissões no OS.

---

## Sessão 2026-08-11 (noite) — Fix deploy web NovaQI + OTA nativo

### Bug: web compilado sem brand env var

O bundle web estava a ser compilado sem `EXPO_PUBLIC_BRAND=novaqi`, o que fazia a app correr como VeganLand na web:
- Header mostrava `BrandName` (texto) em vez do logo SVG
- Nutrition widget mostrava barras (layout VeganLand) em vez do anel circular (layout NovaQI)

**Fix:** rebuild com env vars correctos — ver secção "Deploy NovaQI web" acima.

### OTA nativo (expo-updates)

Todas as alterações desta sessão são JS puro — nenhuma requer novo build nativo. Para actualizar utilizadores Android/iOS:
- O projecto usa `expo-updates` com `runtimeVersion: { policy: 'appVersion' }` e `channel: production`
- Correr `eas update --channel production` a partir do Mac com os env vars do perfil `novaqi-ios`
- Utilizadores recebem a actualização automaticamente no próximo arranque (cold start), com janela de 8s no splash

### Timezone automático (concluído)

`AppContext.js` chama `apiSyncPushTimezone(token)` em cada login — timezone do dispositivo fica sempre actualizado no `push_tokens.timezone` sem re-registo do token.

---

## Sessão 2026-08-11 (noite 2) — Logo + anel SVG + broadcast update

### Problema: react-native-svg não está no build nativo actual

`react-native-svg` (`^15.11.2`) foi adicionado ao projecto depois do último build nativo submetido às stores. OTA não consegue adicionar módulos nativos → `Svg`, `Circle`, `Path` mostram "unimplemented component" em iOS e Android.

**Impacto:**
- Logo NovaQI (ícone círculo + handle amarelo) não renderiza
- `CalorieRing` (anel de nutrição) não renderiza

**Fix temporário (OTA, sem novo build):**
- `NovaQILogo`: usa `View` com `borderRadius` (círculo verde) + `Text` "Nova**QI**" — sem SVG
- `CalorieRing`: substituído por barra de progresso horizontal + valor kcal — sem SVG

**Fix definitivo:** no próximo build nativo, `react-native-svg` ficará linked e podemos restaurar o `CalorieRing` com o anel SVG real e o logo com o handle amarelo.

### Logo SVG — história das tentativas

1. `<Image source={require('.svg')}>` → não funciona em native (Image não suporta SVG)
2. `<SvgXml xml={...}>` com `<text>/<tspan>` → "unimplemented component" (react-native-svg não suporta elementos SVG text via SvgXml)
3. `Svg + Circle + Path` → "unimplemented component" (módulo nativo não está no build)
4. ✅ `View borderRadius + Text` → funciona em tudo, sem dependências nativas

### Próximo build nativo — o que restaurar

Quando fizer novo build (necessário de qualquer forma para outras features):
- `HomeScreen.js` `NovaQILogo`: restaurar `Svg + Circle + Path` com o handle amarelo
- `HomeScreen.js` `CalorieRing`: restaurar o anel SVG com `strokeDasharray`/`strokeDashoffset`
- Remover imports desnecessários adicionados durante debugging (`SvgXml`, etc.)

### Broadcast multilíngue — anúncio do update

Script `server/src/scripts/broadcast-update.mjs` envia notificação em 6 línguas a todos os tokens activos. Resultado: **68 entregues**, 49 erros (tokens inválidos/desinstalados — normal).

Mensagens enviadas:
- 🇵🇹 pt: "Actualizámos o NovaQI para ser ainda mais útil. O registo de nutrição chegou!"
- 🇬🇧 en: "We just updated NovaQI to be even more useful for you. A nutrition track is in place!"
- 🇩🇪 de: "Wir haben NovaQI aktualisiert — die Ernährungsverfolgung ist jetzt da!"
- 🇫🇷 fr: "Nous venons de mettre à jour NovaQI. Le suivi nutritionnel est là!"
- 🇮🇹 it: "Abbiamo aggiornato NovaQI. Il monitoraggio nutrizionale è disponibile!"
- 🇪🇸 es: "¡Acabamos de actualizar NovaQI. El seguimiento nutricional ya está disponible!"

Deep-link: `{ route: 'Home' }` — abre a home da app.

### Pendente para próxima sessão

- Novo build nativo (iOS via Transporter + Android via Play Console) para incluir `react-native-svg`
- Após o build: restaurar `CalorieRing` SVG e logo com handle amarelo via OTA
- Comando deploy web (sempre com env vars): ver secção "Deploy NovaQI web" acima

---

## Sessão 2026-08-12 — Fix busca de alimentos genéricos (amendoim, azeitona, etc.)

### Problema

Alimentos genéricos simples (amendoim, azeitona, arroz, etc.) não apareciam nos resultados de busca. O fallback Claude (`fetchNutritionalData`) só disparava quando `merged.length < 2`, mas OFF retornava 2+ produtos de marca (ex: manteiga de amendoim, azeite) que satisfaziam o threshold — sem nunca adicionar uma entrada genérica "Amendoim" ou "Azeitona".

### Fix — `server/src/server.js` (endpoint `/nutrition/search`)

**Antes:** `fetchNutritionalData` corria só quando `merged.length < 2` (após expansão).

**Depois:** corre **em paralelo** com `expandSearchQuery` sempre que resultados < 5, sem latência extra:

```js
const [expansion, aiResult] = await Promise.all([
  expandSearchQuery(q, lang),
  fetchNutritionalData(q, lang).catch(() => null),
]);
// ... second OFF search with expansion ...
// Prepend generic AI result so plain foods appear before branded variants
if (aiResult) merged = mergeSearchResults([[aiResult], merged]);
```

Claude retorna `null` para produtos de marca, por isso não polui os resultados. O resultado genérico é colocado **no início** da lista para o utilizador encontrar facilmente o alimento simples (ex: "Amendoim | 567 kcal").

**Resultado testado:**
- "amendoim" → primeiro resultado: `Amendoim | 567 kcal | src=ai` ✅
- "azeitona" → primeiro resultado: `azeitona | 145 kcal | src=ai` ✅

---

## Sessão 2026-08-13 — Fase 1 Exercícios (web-first, NovaQI only)

### O que foi feito

Feature completa de registo de exercícios físicos integrada com o tracking de calorias.

### Base de dados

- Tabela `exercise_log` criada: `id, user_id, exercise_id, exercise_name, duration_min, calories_burned, local_date, logged_at`
- Índice em `(user_id, local_date)`

### Ficheiros criados

**`src/constants/exercises.js`**
- 27 exercícios com valores MET (Ainsworth et al.), labels em 6 línguas, categorias
- Helpers: `calsBurnedPerMin(met, weight_kg)`, `minutesToBurn(calories, met, weight_kg)`, `calsBurnedForDuration(met, weight_kg, duration_min)`
- `DEFAULT_BURN_EXERCISES = ['running_slow', 'cycling_moderate', 'walking_brisk']`

**`src/screens/ExerciseLogScreen.js`**
- Lista de exercícios com tabs por categoria + favoritos (persistidos via AsyncStorage)
- Estrela de favorito por exercício
- Preview de kcal/30min por exercício (baseado no peso do perfil, default 70kg)
- Modal para registar com duração e preview de kcal em tempo real
- Lista de exercícios de hoje com botão de eliminar

### Ficheiros modificados

**`server/src/server.js`** — 3 endpoints novos:
- `GET /exercise/today?date=YYYY-MM-DD`
- `POST /exercise/log`
- `DELETE /exercise/log/:id`

**`src/services/apiService.js`** — `apiGetTodayExercise`, `apiLogExercise`, `apiDeleteExercise`

**`src/context/NutritionContext.js`**
- Estado `todayExercise`, `todayBurned` (soma de `calories_burned`)
- `logExercise`, `deleteExercise` callbacks
- `todayExercise` carregado em paralelo no `refresh()`
- Expostos via context: `todayExercise`, `todayBurned`, `logExercise`, `deleteExercise`

**`src/navigation/AppNavigator.js`** — `ExerciseLog` adicionado ao stack (em ambos os grupos)

**`src/screens/NutritionDashboardScreen.js`**
- Botão laranja "🏃 Registar exercício" → navega para `ExerciseLog` (só NovaQI)
- `ForestSummaryCard` actualizado: quando `todayBurned > 0`, mostra consumed / burned (laranja) / net (verde) em vez de consumed / remaining / goal

**`src/screens/HomeScreen.js`**
- `todayBurned` consumido do NutritionContext
- "Remaining" no widget muda para "net" quando há exercícios: `goal - consumed + burned`
- Label muda para `nutrition.net`; mostra "🔥 X kcal burned" quando `todayBurned > 0`

**`src/screens/ResultScreen.js`**
- Importa `EXERCISES`, `minutesToBurn`, `getExerciseName`, `DEFAULT_BURN_EXERCISES`
- `bodyProfile` do NutritionContext
- Caixa "Burn equivalent" nos detalhes do produto (só NovaQI, só quando `energy_kcal` disponível)
- Mostra running / cycling / walking com minutos para queimar 100g do produto

**`src/i18n/pt.js, en.js, de.js, fr.js, it.js, es.js`**
- Secção `exercise` com todas as strings
- Secção `nutrition.burned` e `nutrition.net`

### Fórmula MET usada
```
kcal/min = MET × weight_kg × 3.5 / 200
minutes_to_burn = ceil(calories / kcal_per_min)
```

---

## Sessão 2026-08-13 — Fase 2: UX Nutrição + Exercício

### Botão de água (HomeScreen — NovaQI)
- Toque abre um bottom-sheet modal com 5 opções pré-definidas: 150/250/350/500/750 ml + equivalente em copos
- Campo de input personalizado para quantidades arbitrárias
- Mostra total do dia em badge azul no topo do modal

### ExerciseLogScreen — redesign
- Exercícios registados hoje: substituídos chips horizontais por **cards verticais** com borda colorida por categoria, icon bubble, nome, duração e 🔥 kcal
- Hero: strip de categorias abaixo do total queimado (ex: "🔴 Cardio 30′ · 🔵 Força 20′")
- Estrutura: FlatList com `ListHeaderComponent` (hero + log + tabs) para scroll unificado
- `CATEGORY_CONFIG` em exercises.js define cor, bg e label por categoria

### NutritionDashboardScreen — hoje com exercícios inline
- Exercícios do dia aparecem inline logo após o card de macros (só NovaQI)
- Cada exercício: borda colorida por categoria + icon bubble + nome + duração + kcal + botão de apagar
- Link "+" para navegar ao ExerciseLogScreen
- Tabs Hoje/Semana/Mês **removidas** do Dashboard (são apenas para o Relatório)

### NutritionReportScreen — novo formato dia-a-dia
- Card de totais do período: kcal consumidas + queimadas (se houver) + litros de água
- Gráfico de barras de calorias por dia (semana/mês)
- Secções por dia: 🍴 kcal · 🔥 queimado · 💧 água · macros P/C/G · chips de exercícios coloridos
- Tabs Hoje/Semana/Mês com mesmo estilo visual do Dashboard

### HomeScreen — pill queimadas
- Pill "🔥 X kcal" navega para `NutritionDashboard` (não ExerciseLog)

### Smart portion sizing (server/src/anthropic.js)
- `fetchNutritionalData` detecta se a query tem descritores de porção ("2 fatias de pão", "1 banana", "1 copo de leite")
- Se houver quantidade: retorna macros para ESSA PORÇÃO EXACTA + `grams` realista (ex: 2 fatias pão → 60g)
- Se for nome simples: mantém por-100g como antes
- Referências de peso incluídas no prompt: fatia pão=30g, queijo=25g, ovo=55g, banana=120g, copo leite=240g, etc.

### Novos endpoints servidor
- `GET /exercise/history?from=YYYY-MM-DD&to=YYYY-MM-DD` — histórico de exercícios por período

### i18n
- Adicionado `exercise.period_today/week/month` em todas as 6 línguas
- `nutrition.net` renomeado para `restante` em todas as 6 línguas

---

## Sessão 2026-08-17 — Camera choice + Burn comparison + Add food → ResultScreen + Nutrition plan import

### ScanScreen — camera choice modal (NovaQI)
- Botão de câmara abre bottom-sheet modal em vez de ir directo para foto
- Duas opções: "Escanear produto" (rótulo/barcode → `setScanStep('photo')`) e "Análise de prato" (→ `PlateAnalysis`)
- i18n: `scan.camera_choice_title/product/product_sub/plate/plate_sub` em 6 línguas

### ResultScreen + PlateAnalysisScreen — burn comparison com favoritos
- Caixa "Burn equivalent" usa `@exercise_favorites` (AsyncStorage) em vez de `DEFAULT_BURN_EXERCISES`
- Carrega favoritos no mount, embaralha e mostra 3 aleatórios; fallback para defaults se vazio
- PlateAnalysisScreen usa `liveTotal.calories_kcal` (total do prato), não per-100g

### NutritionDashboardScreen — "Add food" → ResultScreen completo
- Quando utilizador selecciona alimento da busca com barcode (OFF live), navega para `ResultScreen` em vez de preencher o form
- Novo endpoint `GET /nutrition/product-info?code=<barcode>`: busca no DB local → fallback OFF live (sem IA, sem crédito)
- `apiGetProductInfo(token, barcode)` em `apiService.js`
- Allergen tags com prefixo `en:` são normalizados no cliente (`.replace(/^[a-z]{2}:/, '')`)
- Overlay de loading `fetchingProduct` durante busca

### NutritionGoalsScreen — import de plano de nutrição (NovaQI)
- Botão "📄 Importar plano de nutrição" (dashed border, só NovaQI) entre a nota e o botão Guardar
- Toque abre bottom-sheet com opções Câmara / Galeria
- Imagem enviada para `POST /nutrition/parse-plan` → Claude Haiku vision extrai goals
- Valores extraídos preenchem automaticamente os campos; não-encontrados ficam inalterados
- Overlay de loading com spinner durante parsing
- `parsePlanFromImage(imageBase64, language)` em `server/src/anthropic.js`
- `apiParsePlan(token, base64, language)` em `apiService.js`
- i18n: `nutrition.import_plan_btn/camera/gallery/loading/empty/error` em 6 línguas

### Novos endpoints servidor
- `GET /nutrition/product-info?code=<barcode>` — dados ricos de produto (DB local + OFF, sem IA)
- `POST /nutrition/parse-plan` — visão Claude extrai metas nutricionais de imagem/documento

---

## Sessão 2026-08-17 (cont.) — ImportPlanButton refactor + BodyProfile/EditPersonal import

### ImportPlanButton (src/components/ImportPlanButton.js) — componente partilhado
- Extrai toda a lógica de import de plano num único componente reutilizável
- Props: `{ language, token, onExtracted, style }`
- Retorna `null` se `Brand.id !== 'novaqi'`
- **Web**: `<View>` com `<input type="file" accept="application/pdf,image/*">` invisível sobreposto — picker abre directamente no click sem gap async (resolve problema de gestos no browser)
- **Native**: `TouchableOpacity` → Modal bottom-sheet com 📷 Câmara / 🖼️ Galeria / 📄 Documento
- Galeria: usa `requestMediaLibraryPermissionsAsync()` explícito antes de abrir
- Documento: aceita PDF e imagens via `expo-document-picker` + `expo-file-system`
- Parse-plan: `parsePlanFromImage` usa `document` block para PDF, `image` block para imagens
- Overlay de loading com spinner durante parsing

### Integração em 3 screens
- **NutritionGoalsScreen**: `onExtracted` actualiza `values` state (todos os FIELDS)
- **BodyProfileScreen**: `onExtracted` navega para `NutritionGoals` com `suggested: extracted`
- **EditPersonalScreen**: `onExtracted` actualiza `goalValues` state via `handleExtracted()`
- Old inline states (`showImportModal`, `parsing`), functions (`pickAndParse`), modal, overlay e styles removidos das 3 screens

### favicon.ico
- Copiado `icon.png` para `assets/novaqi/favicon.png` → build inclui favicon igual ao ícone da app

### server/src/anthropic.js
- `parsePlanFromImage(imageBase64, language, mediaType)` — suporte a PDF via `document` block + images
- `detectMediaType()` e `stripDataUri()` como function declarations hoisted

### server/src/server.js
- `POST /nutrition/parse-plan` com debug logging

---

## Sessão 2026-08-18 — react-native-svg + versão 1.0.16

### Bump de versão (native build obrigatório)
- `app.config.js`: `version: '1.0.15'` → `'1.0.16'`, `versionCode: 18` → `19`
- Commit: `7f4b16a`

### EditPersonalScreen — limpeza final
- Removido código inline de import: `showImportModal`, `parsing`, `pickAndParse`, modal, overlay e styles
- Substituído por `<ImportPlanButton language={language} token={token} onExtracted={handleExtracted} style={{ width: '100%' }} />`
- Adicionado `handleExtracted()` que atualiza `goalValues` via `setGoalValues`
- Removido `useFocusEffect` e `useCallback` (imports desnecessários)

### Fix: react-native-svg 15.11.2 → 15.12.1 (iOS + Android EAS build failure)
- **Erro**: `too many template arguments for class template 'ConcreteShadowNode'` + `use of undeclared identifier 'BaseShadowNode'` em `RNSVGConcreteShadowNode.h`
- **Causa**: RN 0.81 mudou o template C++ `ConcreteShadowNode<>` de 6 para 5 argumentos e removeu o alias `BaseShadowNode`. `react-native-svg` 15.11.2 usa a assinatura antiga.
- **Fix**: `npx expo install --fix` → upgrades automáticos:
  - `react-native-svg`: `^15.11.2` → `15.12.1`
  - `expo`: `~54.0.35` → `~54.0.37`
  - `expo-updates`: `~29.0.18` → `~29.0.20`
- Commit: `419ec2f`
- Afecta **iOS e Android** — ambas as plataformas compilam o mesmo header C++
- Trigger novo build EAS após este commit para ambas as plataformas
- Fix: `readBody` → `readJsonBody` em `/nutrition/measurements` (ReferenceError)

### HomeScreen — restaurar SVG e logo (fallbacks removidos)
- `CalorieRing`: era barra de progresso (fallback sem SVG) → restaurado como anel circular SVG real via `react-native-svg` (`Svg` + `Circle`, strokeDasharray/offset, rotate -90)
- Logo no header: removida função local `NovaQILogo` (só círculo simples) → importado `NovaQILogo` de `src/components/ui/NovaQILogo.js` (anel + cauda, View-based) + texto "Nova**QI**" ao lado
- Commit: `95e8684`

### ImportPlanButton — temporariamente escondido
- Upload de ficheiro não funciona → `return null` após o check `!isNovaQI`
- Para reactivar: remover a linha `return null; // temporarily hidden`
- Commit: `de48a75`

### Apple App Store — rejeição por falta de EULA
- Motivo: app tem subscrições mas não tem link para Termos de Uso nos metadados
- Fix: adicionar `https://novaqi.app/terms` no campo EULA do App Store Connect (não requer novo build)

### Simulação de referrals para teste (ghuto6969@gmail.com, ID 283)
- UPDATE directo na DB: `referral_credit_count=0`, `referral_total_rewarded=3`, `bonus_scans_remaining=15`, `bonus_scans_expires_at=now()+30days`
- Simula 9 amigos qualificados → 3 recompensas × 5 scans = 15 bonus scans
- Sistema: 3 referrals qualificados por recompensa (`REFERRALS_PER_REWARD=3`), 5 scans por recompensa (`REFERRER_REWARD_BONUS=5`)
- Para reverter: UPDATE com todos os valores a 0 / null

---

## Sessão 2026-08-20 — Body Analysis: calibração de medidas + protocolo Shaped

### Ficheiros principais
- `server/src/body_analysis.py` — pipeline de análise (server-side, activo imediatamente)
- `src/screens/BodyAnalysisScreen.js` — UI de upload + resultados

### Correcções de medição

**`measure_limb_perp()`** — parâmetros `t_min`/`t_max` adicionados (default 0.20/0.80):
- Coxa usa `t_min=0.40, t_max=0.75` — evita zona da virilha (era 0.20 → linha na virilha)
- `thigh_y = hip_y + (knee_y - hip_y) * 0.45` (era 0.35) — ponto de profundidade na foto lateral

**Braço (bíceps) — ancorado no cotovelo:**
- `_arm_x_from_elbow()` varre a máscara ao nível do cotovelo para encontrar os bounds reais do braço (em vez do ombro que está dentro do deltoide/tronco)
- Tanto `center_x_min/max` como `ray_x_min/max` restritos ao range do braço → exclui peito
- Forearm usa `_arm_x_from_wrist()` com mesma lógica
- Renomeado `arm_cm` → `bicep_cm` em todo o código e UI

**Coxa — separador medial interpolado:**
- `_leg_sep()` interpola entre `hip_mid` e `knee_mid` no y exacto da medição (era sempre `knee_mid`)
- Evita que as duas coxas sejam medidas como uma só

**Foto lateral — profundidade sem interferência da mão:**
- `_d()` encontra o segmento contíguo da máscara que contém o centro do corpo (`_sbcx` calculado via landmarks anca/joelho/ombro da foto lateral)
- Exclui a mão que sobressai à frente do corpo ao nível da coxa/quadril

**Linha de bíceps na lateral:**
- `measure_ys_side` agora inclui `'bicep'` → a linha amarela aparece na foto lateral

### Protocolo Shaped (CHECKs automáticos)
Todos adicionados como `warnings[]` em `meta.warnings` (não rejeitam):

| Warning | Condição |
|---|---|
| `low_resolution` | imagem < 1200px altura |
| `low_segmentation_confidence` | máscara rembg muito ruidosa (alpha parcial > 45%) |
| `cropped_head` | máscara toca borda superior (≤ 4px) |
| `cropped_feet` | máscara toca borda inferior (≤ 4px) |
| `front_arms_too_close` | ambos os pulsos dentro da largura do quadril |
| `front_legs_together` | separação dos tornozelos < 25% da largura do quadril |
| `side_not_true_profile` | ambos os quadris com visibilidade similar na lateral |
| `side_right_arm_not_raised` | pulso direito > 25% altura abaixo do ombro |

**Nota:** `cropped_head/feet` foram convertidos para aviso simples (a rejeição hard via `sys.exit(1)` causava falha em fotos legítimas onde o rembg toca a borda).

### Pose da foto lateral — protocolo Shaped
- **Lado direito** do corpo para a câmera
- Braço direito esticado para a câmera (para a frente, horizontal)
- Braço esquerdo atrás do corpo
- Ambas as pernas alinhadas (só uma visível de perfil)

### Silhuetas (BodyAnalysisScreen.js)
- Redesenhadas com cores NovaQI (`#16A75A` stroke, sem fill)
- Frente: contorno orgânico, braços ~40° com mão circular, pernas separadas
- Lateral: dois braços esticados para a frente (curvas paralelas em SVG)
- Textos guia: "Braços afastados, pernas abertas, palmas para câmera" / "Lado direito — braço direito esticado, esquerdo atrás"

### Warnings removidos (falsos positivos sistemáticos)
Estes 4 warnings foram eliminados por disparar em fotos correctas:
- `cropped_head` / `cropped_feet` — rembg toca borda normalmente; `scale_calibration_failed` cobre casos reais
- `side_not_true_profile` — MediaPipe estima ambos os quadris mesmo em perfil real
- `side_right_arm_not_raised` — pulso da câmera tem visibilidade baixa por definição no protocolo Shaped

### Silhuetas reais (BodyAnalysisScreen.js)
SVGs substituídos por fotos reais carregadas pelo utilizador:
```js
assets/novaqi/silhouette-front-female.png  (1254×1254)
assets/novaqi/silhouette-front-male.png    (1254×1254)
assets/novaqi/silhouette-side-female.png   (1254×1254)
assets/novaqi/silhouette-side-male.png     (1254×1254)
```
Selecção por sexo: `SILHOUETTES[pose][sex === 'male' ? 'male' : 'female']`

### Quadril — medição por segmento contíguo
`_meas_horiz_body(y)` — nova função que percorre a linha da máscara para encontrar o segmento contíguo mais próximo do centro da imagem (em vez de usar os bounds dos landmarks de anca, que ficam dentro da pélvis e excluíam os glúteos).

### Índice de conicidade — correcção de unidade
A fórmula usava `waist_circ` em cm; a fórmula correcta exige metros: `(waist_circ / 100) / (0.109 × √(kg/altura_m))`.

---

## Sessão 2026-08-20 (continuação) — Medidas peito/pescoço, save completo, ProfileScreen

### Novas medidas: Peito e Pescoço

**Peito (`chest_cm`):**
- `chest_y = shoulder_y + (hip_y - shoulder_y) * 0.15` — nível das axilas
- Front width: `_meas_horiz(chest_y, shoulder_xl, shoulder_xr)` — **bounded por landmarks de ombro** para não medir até ao final dos braços em A-pose
- Side depth: `_d(chest_y)`
- Circunferência: elipse (Ramanujan)

**Pescoço (`neck_cm`):**
- `neck_y = top_y + (shoulder_y - top_y) * 0.65` — 65% do caminho cabeça→ombro (era 0.80 → media clavícula a clavícula)
- Front width: `_meas_horiz(neck_y, shoulder_xl, shoulder_xr)` — bounded para não medir largura da cabeça
- Side depth: `_d(neck_y)`
- Circunferência: elipse
- Overlay: adicionado à foto frontal e lateral

### DB — migração de colunas em falta
```sql
ALTER TABLE body_measurements
  ADD COLUMN IF NOT EXISTS lean_mass_index numeric,
  ADD COLUMN IF NOT EXISTS fat_mass_index  numeric,
  ADD COLUMN IF NOT EXISTS lean_mass_kg    numeric,
  ADD COLUMN IF NOT EXISTS fat_mass_kg     numeric,
  ADD COLUMN IF NOT EXISTS body_water_pct  numeric,
  ADD COLUMN IF NOT EXISTS ree_kcal        numeric,
  ADD COLUMN IF NOT EXISTS score           integer;
```
Aplicado em produção 2026-08-20.

### db.js — saveBodyMeasurements corrigido
- **Bug**: destruturava `arm_cm` mas a análise retorna `bicep_cm` → bíceps nunca era guardado
- **Fix**: destrutura `bicep_cm`, mapeia para coluna `arm_cm`
- Guarda agora: `chest_cm`, `neck_cm`, `lean_mass_index`, `fat_mass_index`, `lean_mass_kg`, `fat_mass_kg`, `body_water_pct`, `ree_kcal`, `score`

### db.js — getBodyMeasurementHistory corrigido
- Retorna `arm_cm as bicep_cm` + todos os novos campos
- Endpoint GET `/body/measurements`: removido guard admin-only (qualquer utilizador autenticado acede ao seu histórico)

### BodyAnalysisScreen.js — save call corrigido
```js
{ ...result.measurements, ...result.indices, ...(result.body_composition || {}),
  score: result.score, confidence, warnings, scale_px_per_cm }
```
Antes: faltavam `body_composition` e `score`.

### apiService.js — nova função
```js
export async function apiGetBodyMeasurements(token)  // GET /body/measurements → history[]
```

### NutritionContext.js — bodyMeasurements
- Estado `bodyMeasurements` adicionado
- Incluído em `Promise.all` no `refresh()`
- Exposto via Context value

### ProfileScreen.js — secção Análise Corporal
Componente `BodyAnalysisCard` (NovaQI only):
- Mostra: **badge de pontuação NovaQI**, data da última análise, botão → navega para BodyAnalysis
- **Grid de perímetros**: chest, neck, bicep, forearm, waist, hip, thigh, calf (8 valores em cm)
- **Composição corporal** (rows): body_fat_pct, lean_mass_kg, fat_mass_kg, body_water_pct, ree_kcal
- **Índices** (rows): bmi, lean_mass_index, fat_mass_index, waist_to_height, waist_to_hip, conicity_index
- Se sem histórico: empty state com CTA "Fazer análise corporal"

### i18n — secção `body_analysis` (6 idiomas)
Chaves adicionadas: `section_title`, `last_analysis`, `score`, `chest_cm`, `neck_cm`, `bicep_cm`, `forearm_cm`, `waist_cm`, `hip_cm`, `thigh_cm`, `calf_cm`, `bmi`, `body_fat_pct`, `lean_mass_kg`, `fat_mass_kg`, `body_water_pct`, `ree_kcal`, `lean_mass_index`, `fat_mass_index`, `waist_to_height`, `waist_to_hip`, `conicity_index`, `no_analysis`, `run_analysis`.
Resolve bug: nomes das medidas apareciam em inglês quando perfil em português.

### i18n — secção `body_analysis_screen` (6 idiomas)
Namespace completo para `src/screens/BodyAnalysisScreen.js`: header, pose guide, foto pickers, calibração, alertas, botão Analisar, disclaimer, cartões (composição, perímetros, índices, referências), modal `?` de info (title/desc/ref/why para cada uma das 18 métricas: chest/neck/bicep/forearm/waist/hip/thigh/calf/bmi/lean_mass_index/fat_mass_index/waist_to_height/waist_to_hip/conicity_index/body_fat/body_water/ree/score), classificações (`cls_low_risk`, `cls_elevated_risk`, `cls_adequate`, `cls_low`, `cls_underweight`, `cls_normal`, `cls_overweight`, `cls_obese`) e labels de gordura (`bf_essential/athletic/normal/obese`). Screen consome via `useApp().language` + `t(language, 'body_analysis_screen.<key>')`. `INFO` estático removido — construído por `buildInfo(language)` em `useMemo`. Resolve bug: a tela inteira aparecia em PT independentemente do idioma do perfil.

### ProfileSetupScreen.js — birthdate completo (DD/MM/AAAA)
Onboarding step 3 (first-time) pedia só `body_birth_year` (4 dígitos → `YYYY-01-01`). Agora pede 3 inputs numéricos lado-a-lado — dia, mês, ano — validados via helper `buildBirthDate(y,m,d)` (usa `new Date(y, m-1, d)` para rejeitar dias inválidos tipo 31/2). Se qualquer campo estiver vazio ou inválido, `birth_date` é `null` (não bloqueia o save, apenas não guarda). Novas i18n keys em `profile_setup.*` nas 6 línguas: `body_birth_date`, `body_birth_day_placeholder`, `body_birth_month_placeholder`. Placeholder de `body_birth_year_placeholder` mudou de `'1990'` para `'AAAA'/'YYYY'/'JJJJ'` etc. Styles `bodyInputDate` (flex:1) e `bodyInputYear` (flex:1.5) para dar mais espaço ao ano.

### Plate scan — assume compliance com a dieta do utilizador
Mudança de modelo: **a análise de prato NÃO faz verificação de dieta**. Prato = refeição servida pelo próprio user na cozinha dele → tudo o que está visível é, por definição, compatível com a dieta escolhida. A verificação SAFE/CAUTION/NOT_SAFE continua a existir mas **apenas para produtos industrializados** (barcode + foto de embalagem em `evaluateProductIngredients`/`analyzeProductByKnowledge`).
- **`server/src/anthropic.js` `analyzePlate()`**: `dietRulesBlock` (SAFE/CAUTION/NOT_SAFE) substituído por `DIET_HINTS` (vegan/vegetarian/pescatarian/halal/kosher/gluten_free/paleo/keto, PT+EN). O prompt instrui o modelo a **nomear** items ambíguos com o qualifier da dieta (ex: "queijo vegan" em vez de "queijo", "frango halal", "massa sem glúten") e a **usar as macros** da versão apropriada. Removidos do schema: `item_status`, `item_concern`, `diet_verdict`. Return agora só devolve `{ items, total }`.
- **`src/screens/PlateAnalysisScreen.js`**: removido `STATUS_CONFIG`, o verdict card, os dots/concerns por item, o helper de invalidação `setResult(r => ({...r, diet_verdict: null}))` nos edits/deletes, o import `PremiumIcon` (deixou de ser usado) e os styles órfãos `verdictCard/verdictIconWrap/verdictStatus/verdictExplanation/verdictConcerns/verdictConcernItem/itemNameRow/itemStatusDot/itemConcern`.
- **Como aplicar**: qualquer nova dieta futura precisa de uma entrada em `DIET_HINTS` no `analyzePlate` (não em regras SAFE/UNSAFE). A verificação de compatibilidade continua a viver no fluxo de scan de produtos e não deve ser reintroduzida em plate scans.

### v1.0.17 — deps nativas pré-instaladas para futuro automatic body scan
Build nativo com **superconjunto de deps** para permitir que a feature futura seja shippable via OTA:
- `react-native-vision-camera@^4.7` (câmara + frame processors)
- `react-native-worklets-core@^1.6` (worklets para frame processors)
- `react-native-fast-tflite@^3.0` (inferência TFLite on-device — CoreML delegate iOS + GPU delegate Android ambos activados)
- `expo-speech@~14.0` (cues de áudio em qualquer idioma)

Ficheiros afectados:
- `package.json` — 4 deps novas + bloco `expo.doctor.reactNativeDirectoryCheck.exclude: ["react-native-fast-tflite"]` (untested-on-new-arch warning silenciado; v3+ funciona OK)
- `babel.config.js` **criado** (não existia) — adiciona `react-native-worklets-core/plugin` (obrigatório para frame processors)
- `app.config.js` — plugins novos: `react-native-vision-camera` (mic **off**, location **off**, frame processors **on**) e `react-native-fast-tflite` (CoreML + Android GPU); bump `version 1.0.16 → 1.0.17` e `versionCode 19 → 20`

**Porquê:** o utilizador quer construir a feature "Automatic body scan" no futuro (câmara + pose detection real-time + countdown falado) purely como OTA. Como Expo OTAs não podem adicionar código nativo, TODAS as libs nativas que possam vir a ser precisas têm de estar presentes no binário desde já.

**Como aplicar:** o próximo `eas build` (v1.0.17) tem tudo. Depois desse build submetido/instalado, novas UIs que importem estas libs saem via `eas update` sem novo build. Nenhum JS foi adicionado nesta versão para consumir estas libs — a feature será construída depois.

### body_analysis.py — HEIC/HEIF support + robust load + sniff logging
User 297 (lumozini) apanhou repetidamente `cannot identify image file '/tmp/ba_front_297_*.jpg'` do PIL — causa raiz: iPhone com "High Efficiency" (default) devolve HEIC via `expo-camera` mesmo com o URI a acabar em `.jpg`. PIL nativo não conhece HEIC/HEIF.

- **Server:** `pillow-heif@1.5` instalada em `/opt/body-analysis-env` e `register_heif_opener()` chamada no import de `body_analysis.py` (silencioso se lib ausente).
- **Server:** `load_image()` reescrita: (1) `_sniff_format()` lê magic bytes e devolve label (`JPEG/PNG/WEBP/HEIF/ftypheic/...`); (2) tenta PIL com `img.load()` para forçar decode; (3) fallback OpenCV se PIL falhar; (4) na falha final, mensagem de erro inclui o formato detectado — logs futuros ficam accionáveis.
- **Client `BodyAnalysisScreen.uriToBase64`:** já não fixa `data:image/jpeg` cegamente — deriva mime da extensão do URI (`png/heic/heif/webp/jpeg`). Fluxo do picker já usava `asset.mimeType` desde 2026-06; agora o fluxo da câmara via `VideoAnalysisScreen` também está correcto.
- **How to apply:** se voltar a aparecer erro de load, procurar `[load-image]` no `pm2 logs veganland-api --err` para ver o formato real. Se for um formato exótico ainda sem suporte, considerar acrescentar `pillow-avif-plugin` ou transcode client-side com `expo-image-manipulator`.

### Body analysis — bicep sanity check + camera pitch capture (2026-08-26)

**Bicep leak fix** (`server/src/body_analysis.py` ~l.1014):
- Regressão observada em Fabricio (user 3, análise id 29): bicep 52.8cm circ (≈18.5cm diâmetro), medindo até ao meio do peito. Causa: `_bicep_separated` retornou None (braço colado ao tronco), fallback `measure_limb_perp` com landmark bounds mediu largura da máscara que engloba torso.
- Guarda pós-fallback: rejeita `bicep_w` se (a) > 40 % da largura ombro-a-ombro, (b) > 2× diâmetro do antebraço, ou (c) > 18 cm absoluto. Ao rejeitar: `bicep_w=None`, remove overlay, adiciona warning `bicep_measurement_rejected`. Confidence cai automaticamente para 0.40 (ramo do `else` já existente).

**Camera pitch capture** (novo — precisa **build nativo** para expo-sensors):
- `expo-sensors@~15.0.8` adicionado ao `package.json`. Import guardado com `try/require` — OTA para builds anteriores (≤1.0.14) não crasha, apenas o indicador de nível não aparece.
- `VideoAnalysisScreen.js`: subscreve `DeviceMotion` no step `front`/`side`, mostra pill de estado (verde ≤5°, amarelo ≤12°, vermelho >12°) e captura `rotation.beta` (radianos → graus) no momento do disparo. Persiste `frontPitch`/`sidePitch` em state e passa via route params `frontPitchDeg`/`sidePitchDeg` para `BodyAnalysisScreen`.
- `BodyAnalysisScreen.js` → `apiBodyAnalyze` envia `frontPitchDeg`/`sidePitchDeg` em `body.front_pitch_deg`/`side_pitch_deg`.
- `server/src/server.js` (POST `/body/analyze`): lê os campos e passa como 7º/8º arg posicional ao script Python (string vazia se ausente).
- `body_analysis.py`: `analyze(..., front_pitch_deg=None, side_pitch_deg=None)`. `|pitch| > 12°` → warnings `camera_tilted_front`/`camera_tilted_side`. Meta expõe `front_pitch_deg`/`side_pitch_deg` para debug. Nenhuma correcção trigonométrica de scale aplicada ainda — só rejeição/aviso.

**How to apply:** 
- OTA imediato distribui a mudança do bicep (pura Python + JS já wrapped). O indicador de pitch só aparece em builds ≥1.0.15 com `expo-sensors` linkado nativamente. Correr `npm run build:ios:novaqi` e `npm run build:android:novaqi` para novo build nativo antes de anunciar a feature.
- Se a rejeição do bicep começar a disparar em fotos boas, relaxar `> 0.40 * shoulder_w` para `0.45` (bodybuilders extremos podem estar perto de 0.35–0.40).
- Para adicionar correcção real de perspectiva no futuro: com `pitch` e `card_scale_front`/`card_front_cy_px` já se pode calcular scale gradient (distância a cada linha y), aplicando `scale_at_y = card_scale_front / (1 - (y - card_y) / card_y * sin(pitch))` — deixado para segunda iteração após ver dados reais.

### 2026-08-26 → 27 — Sprint pré 1.0.18 (bicep, report produto, relatório, i18n fit, email, defensivas)

**Bicep detection — três-tier**
- `body_analysis.py` `_bicep_separated`: agora aceita `mask` override + `width_correction_px` para retry sobre máscaras erodidas.
- Loop de erosão progressivo: 0 → 2 → 4 → 6 → 8 → 12 → 16 → 20 iters (kernel 3×3), cada tentativa aplica `cv2.erode` na máscara e adiciona 2×iters de correcção à largura. Braços encostados ao tronco separam-se em algum destes níveis.
- `_bicep_outer_edge` (novo): se a erosão falhar, estima diâmetro anatomicamente — MediaPipe põe o landmark do braço no centro do humerus; scan outward do landmark até à borda da máscara → half-width × 2 = diâmetro. Log `[bicep-outer-edge] anatomical estimate Xcm`.
- Último recurso: o `measure_limb_perp` original (leaky). Se sobreviver aos guards `bicep_measurement_rejected` / anthropometric fallback ainda entra em jogo.
- **Alerta conhecido:** para fotos onde MediaPipe põe os shoulder landmarks muito próximos (mulheres com braços cruzados / pose torcida), `shoulder_w_cm` chega em ~12 cm e dispara o guard `>40% shoulder` cedo demais. Não é crítico porque o guard de antebraço também pega, mas se precisares afinar: só usar `shoulder_w_cm` como threshold quando estiver na faixa 25-55 cm.

**Report Product review flow (novo)**
- Cliente: `src/screens/ReportProductScreen.js` — 3 fotos obrigatórias (barcode + ingredientes + frente) + 2 opcionais, 4 categorias (produto errado / ingredientes / nutrição / outro), descrição livre. Não conta como scan.
- Server: `POST /product/report` em `server.js` — accepta até 30 MB (nginx location `~ ^/(body|product)/` estendida em ambos os hosts). Envia email para `contact@novaqi.app` com subject `Product review request`. Não incrementa scan counter.
- Email pipeline (`server/src/email.js sendProductReviewEmail`):
  - `sniffImageFormat` por magic bytes (JPEG/PNG/WebP/HEIC/HEIF)
  - HEIC/HEIF → JPEG via `heic_to_jpg.py` (novo helper, reutiliza `/opt/body-analysis-env` + pillow-heif já instalado)
  - Attachments com `contentTransferEncoding: 'base64'` + `contentDisposition: 'attachment'` — sem isto o Gmail iOS escondia as fotos como se fossem inline sem CID
- `ResultScreen.js`: botão antigo "Not my product" (que fazia re-scan) rewired para navigate('ReportProduct') — label mudado para "Reportar informação errada" em 6 idiomas
- **NOVAQI_SMTP_PASS estava stale**: password no `.env` era `NovaQI2026!`, real é `VeganLand2026!` (mesma do VeganLand). Actualizado. Isto explica também por que emails de confirmação/reset para users NovaQI falhavam silenciosamente há semanas.
- **DKIM em falta**: `novaqi.app` e `veganland.app` têm SPF + DMARC `p=quarantine` mas ZERO DKIM. Gmail quarantina automaticamente. Fix requer Davi no Hostinger hPanel → habilitar DKIM + adicionar TXT record.

**Body-fat auto-calc (client-only, EditPersonalScreen)**
- `effectiveBa` useMemo: precedência manual → Navy circumference (waist+neck+height, +hip female) → Deurenberg (bmi+idade+sexo) → última análise por foto → null. Fórmulas espelham `body_analysis.py`. Fonte marcada em `bf_source`; label acima do painel diz "calculado por perímetros" / "estimado por BMI+idade" / "última análise por foto"; confidence 0.50 quando estimado, 0.70 manual.
- Callout no topo da secção "Medidas Corporais" (NovaQI only) sugere fazer análise por foto antes de digitar 9 campos.

**Report screen — range personalizada + lista cronológica**
- `NutritionReportScreen.js`: 4º tab 'custom' com dois inputs YYYY-MM-DD; refetch apenas quando ambos ISO válidos (regex `/^\d{4}-\d{2}-\d{2}$/`).
- Novo endpoint `GET /nutrition/log-range?from=&to=` + `getConsumptionRange` em `db.js` — devolve raw consumption_log entries ordenadas por `consumed_at DESC`.
- Card "Registros" abaixo dos day-sections mostra cada entry com ícone por source (📷 scan · 🍽 plate_photo · ✏️ manual), horário formatado por locale, meal_type, grams e macros.
- i18n em 6 línguas: `exercise.period_custom` / `period_custom_from` / `period_custom_to` + `nutrition.entries_title`.

**Font-fit em CTAs (i18n DE/FR/IT overflow)**
- `numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}` em: Scan Another + Consume/Logged (ResultScreen), Subscribe/Start trial (PaywallScreen), Next/Save/Change plan (ProfileSetupScreen), Save body profile (BodyProfileScreen), Confirm delete + Cancel (DeleteAccountScreen), Allow camera / Take ingredients photo / Dismiss (ScanScreen), Confirm log exercise (ExerciseLogScreen), Log plate (PlateAnalysisScreen).

**Defensivas contra numeric overflow em body profile**
- `saveBodyProfile` em `db.js`: clamp de `height_cm` (50-300) e `weight_kg` (20-500) antes do INSERT. Fora do range → `null` + log `[saveBodyProfile] user X rejected ...`. Antes o Postgres devolvia 22003 (numeric field overflow) e a 500 corrompia o state do NutritionContext no cliente — user via perfil "vazio". A causa raiz era `parseFloat("54,3")` em BodyAnalysisScreen (comma em locales PT/DE/FR) ou input runaway.
- `BodyAnalysisScreen.Field`: novo `_sanitizeDecimal` — vírgula → ponto, só dígitos+ponto, cap 6 chars. Idade limitada a 3 dígitos.
- `EditPersonalScreen.handleSave`: `String(h).replace(',', '.')` antes de parseFloat (como o `BodyProfileScreen` já fazia).

**Camera pitch capture (foi entregue na 1.0.18)**
- `expo-sensors@~15.0.8` adicionado. `VideoAnalysisScreen` subscreve `DeviceMotion.rotation.beta`, mostra pill verde/amarelo/vermelho (≤5°/≤12°/>12°) e captura pitch no snapshot. Threaded route params → `BodyAnalysisScreen` → `apiBodyAnalyze` → server → Python 7º/8º arg. `|pitch|>12°` gera warnings `camera_tilted_front/_side`. Sem correcção real de scale ainda — só rejeição/aviso.

**Force update Android 1.0.18**
- `/app/version` bumpado: `android.min: '1.0.18'` (iOS mantido em 1.0.16). Play Store já lista 1.0.18 para `app.novaqi`, portanto rollout activo — users em ≤1.0.17 caem no `ForceUpdateScreen`.

**How to apply:**
- Bicep: se a rejeição continuar a disparar em fotos boas por causa do shoulder_w_cm=12cm irrealista, adicionar `if 25 <= shoulder_w_cm <= 55: check` — só usar aquela regra quando o shoulder detection é plausível.
- Se aparecer bug de overflow noutra tabela numeric(5,1), aplicar o mesmo padrão de clamp+log de `saveBodyProfile`.
- Report Product: emails chegam ao webmail Hostinger correctamente. Se ainda caírem em spam no Gmail, é DKIM — activa no Hostinger hPanel.

### Funnel events + paywall off no onboarding (2026-09-01, OTA na 1.0.18)
Contexto: 0 conversões RC reais desde Jul/2026; 79% dos users nunca fazem um scan. Objectivo: parar de mostrar paywall no onboarding (não há value ainda) e ganhar telemetria para localizar drop-off.

- **Server:** migração `037_funnel_events.sql` cria `funnel_events(user_id, event_type, brand, platform, app_version, metadata jsonb, created_at)`. Helper `insertFunnelEvent` em `db.js`. Endpoint `POST /events` (auth opcional) em `server.js`. nginx sites `/etc/nginx/sites-enabled/{veganland,novaqi}.app` — regex proxy actualizada com `|events|`.
- **Client:** `src/services/funnelService.js` — `logFunnelEvent(type, metadata, token)` fire-and-forget. Auto-stampa `platform` + `app_version`.
- **Eventos disparados:**
  - `scan_started` / `scan_completed` / `scan_failed` em `ScanScreen.triggerBarcodeSearch` e `runPhotoAnalysis` (metadata: `method` barcode|photo|ingredients, `onboarding`, `status`|`reason`).
  - `paywall_shown` (useEffect mount) e `paywall_dismissed` (handleClose) em `PaywallScreen` (metadata: `source`, `current_plan`, `locked`).
- **Paywall removido do onboarding:** `ProfileSetupScreen.js` (após save quando não precisa onboarding scan), `ResultScreen.js` (3 pontos: feedback 👍, skip, comment submit), `ScanScreen.handleClose` (bail durante onboarding). Todos passam a `navigation.reset({routes:[{name:'Main'}]})`. O paywall só aparece agora se: user clicar Upgrade em Profile, ou esgotar 7 scans/mês (ScanScreen isLimitError → navigate('Paywall')).
- **Deploy:** só JS → OTA via `eas update` (runtime = appVersion 1.0.18).
- **Queries úteis:**
  - Funil por dia: `SELECT DATE(created_at), event_type, COUNT(*) FROM funnel_events GROUP BY 1,2 ORDER BY 1 DESC, 2;`
  - Conversion scan_started → scan_completed: `SELECT COUNT(*) FILTER (WHERE event_type='scan_started') AS started, COUNT(*) FILTER (WHERE event_type='scan_completed') AS completed FROM funnel_events WHERE created_at > now() - interval '7 days';`

### Scan-limit card + ingredients photo sem barcode (2026-09-01)
Sequência no mesmo dia, OTA 1.0.18.

**Scan-limit card (`src/components/ScanLimitCard.js`)** — substitui o `Alert.alert("OK")` do PlateAnalysisScreen e o card genérico do ScanScreen. Título + body ("You've used all 7 scans this month" · "You can still log your meals — just search by name" · "Or upgrade for more scans"), botão primário **Upgrade** → Paywall com `source: 'scan_limit'|'plate_limit'`, botão secundário **Log manually** → NutritionDashboard com `openAddFood: true`. Funnel events novos: `scan_limit_shown`, `scan_limit_log_manually_click`. Também instrumentou `scan_started/completed/failed` no PlateAnalysisScreen.

**Ingredients photo sem barcode (`server/src/analyze.js`)** — o fluxo "não consigo ler o barcode → foto da frente → foto do verso" caía num "Could not identify a packaged product" porque a gate era `if (ingredientsPhotoBase64 && clientBarcode)`. Sem barcode a foto do verso era silenciosamente ignorada e a resposta caía no fallback `NEEDS_PHOTO`. Relaxada a condição para `if (ingredientsPhotoBase64)`:
- **Com barcode** → path antigo intacto (extrair → gravar em `products` → análise em cache partilhada, para futuros scanners herdarem)
- **Sem barcode** → one-shot: `evaluateProductIngredients(extracted, {...}, profile, lang, 'image', productType)` directamente. Não escreve em `products` (sem chave para de-dupe), mas grava em `scan_events` para aparecer no histórico
- Cliente (`ScanScreen.js`, `apiService.js`) passa `pendingResult.product_name/brand` como `hintProductName/hintBrand` para o resultado exibir o nome capturado na foto da frente

### Broadcast freemium (2026-09-01)
Anúncio a todos os users NovaQI: "All basic features are now free" (6 línguas). Push (191 tokens) + email (315 users).

- **Scripts:** `server/src/scripts/broadcast-freemium.mjs` (push, per-locale) e `broadcast-freemium-email.mjs` (email, locale via LEFT JOIN LATERAL a `push_tokens.locale`, EN fallback). Ambos aceitam `--dry-run`; email aceita `--limit N` para smoke test.
- **CTA no email:** botão "Abrir App" (traduzido) → `https://novaqi.app/get`
- **Push:** 191/191 ok, registado em `push_broadcasts`. Distribuição: en 165 · pt 11 · fr 7 · de 4 · it 2 · es 2.
- **Email:** 310/315 ok. **5 falhas com `554 5.7.1 Outbound sending is disabled for this account`** — Hostinger cortou o SMTP após ~310 emails seguidos.

**⚠️ Hostinger SMTP rate limit — impacto amplo:** o bloqueio afecta **todos** os emails saintes (confirmações, resets, report product), não só broadcasts. Se o desbloqueio automático não acontecer em algumas horas, abrir ticket ao suporte Hostinger. Para broadcasts futuros: aumentar pausa entre envios (120ms → 500-1000ms), dividir em lotes com backoff longo, ou mudar para provedor dedicado (Resend/Postmark/SES).

### PlateAnalysisScreen — aviso "Como funciona a análise do prato"
Explica ao user por que os items não são verificados contra a dieta (é impossível distinguir por foto leite animal vs vegetal, queijo vegan vs normal, etc.) e aponta o scan de produto industrializado como o caminho para verificação rigorosa. UI:
- Modal auto-aberto **na 1ª entrada** no ecrã. Persiste dismiss via `AsyncStorage.getItem('@plate_notice_dismissed') === '1'`.
- Botão `ⓘ` sempre visível no header (substituiu o spacer vazio à direita do título). Toque reabre o modal em qualquer altura (não afecta o estado dismissed).
- 2 botões no modal: **"Não mostrar de novo"** (grava `'1'` no AsyncStorage + fecha) e **"Fechar"** (só fecha).
- Novas i18n keys em `nutrition.*` nas 6 línguas: `plate_notice_title`, `plate_notice_body`, `plate_notice_dismiss`, `plate_notice_close`.
