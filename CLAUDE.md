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
  context/
    AppContext.js   — profile, language, scan history, saveProfile()
    AuthContext.js  — login, register, logout, token JWT, updateUserType()
  services/
    apiService.js               — chamadas HTTP ao servidor
    purchasesService.native.js  — RevenueCat SDK (iOS/Android)
    purchasesService.js         — no-ops para web
  hooks/
    useForceUpdate.js — verifica versão mínima no servidor ao arrancar
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
  migrate.js      — migrações de BD
  openFoodFacts.js — lookup por barcode e nome
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
- Guardado local (AsyncStorage) + servidor (users.diet_id, users.allergy_ids)

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
- Configuradas em `src/services/purchasesService.native.js` e `eas.json`
- **Nota:** mudança de chaves RC requer novo build nativo (não é OTA)

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
| version | `1.0.10` |
| versionCode (Android) | `12` |
| bundleIdentifier iOS | `app.novaqi` |
| package Android | `app.novaqi` |
| runtimeVersion policy | `appVersion` — OTA só chega a builds com a mesma versão |

**Histórico:**
- 1.0.5 — rejeitado pela Apple (BetaRibbon, planos bloqueados, etc.)
- 1.0.6 — fixes de compliance
- 1.0.7 — fixes adicionais Apple review
- 1.0.8 — **aprovado pela Apple** ✅, RC iOS key corrigida
- 1.0.9 — fixes barcode/OFF fallback, MAY CONTAIN, traces, cache
- 1.0.10 — **Meta SDK + ATT** (CompleteRegistration, StartTrial, Subscribe, Scan); Privacy Policy actualizada

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
# Não usar npm run update:novaqi directamente (falha em modo non-interactive)
EXPO_PUBLIC_BRAND=novaqi EXPO_PUBLIC_API_URL=https://novaqi.app \
EXPO_PUBLIC_APP_API_KEY=79se0AyWPbh963SvguuDFi10JsT0Mr9U \
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_YnmIYLSJyriFzhvfSSnypZCFibv \
EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_yitutMbhXnSxJFnCqDqkNunlogI \
eas update --branch production --message "descrição"
```

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
- `diet_id TEXT`, `allergy_ids TEXT[]`
- `user_type TEXT NOT NULL DEFAULT 'free'` — valores: `free`, `starter`, `premium`, `admin`

**`scan_counters`**
- `user_id`, `month` (formato `YYYY-MM`), `count INT`

**`product_analyses`**
- `product_id`, `language`, `result JSONB` — inclui `normalized_ingredients`, `identified_allergens`, `concerns`, `explanation`

**`scan_events`**
- `user_id`, `product_id`, `status`, `title`, `source`, `language`, `result JSONB`, `created_at`

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
- NovaQI iOS — aprovado pela Apple (v1.0.8 → 1.0.9 em produção)
- Web: novaqi.app + veganland.app

### A submeter (1.0.10)
- [ ] Obter `EXPO_PUBLIC_FB_APP_ID` + `EXPO_PUBLIC_FB_CLIENT_TOKEN` no Meta for Developers
- [ ] Preencher env vars em `eas.json` (perfis novaqi-ios + novaqi-android)
- [ ] Aceitar Data Processing Addendum em Meta Business Settings
- [ ] `npm install` + `npm run build:ios:novaqi` + `npm run build:android:novaqi`
- [ ] Actualizar Privacy Nutrition Labels no App Store Connect (Data Used to Track You)
- [ ] Actualizar Data Safety no Google Play Console
- [ ] Configurar eventos no Meta Events Manager (Subscribe = primary conversion, AEM schema iOS)

### Pendente
- [ ] Lançamento Android (Google Play — conta em verificação)
- [ ] Actualizar `store_url` em `/app/version` após publicação nas lojas
- [ ] Integração RevenueCat completa (IAP products no App Store Connect + Paid Apps Agreement)
- [ ] google-play-key.json para submissão automática via EAS
- [ ] Testes end-to-end do fluxo de confirmação de email
- [ ] Admin: endpoint para inserir/editar produtos manualmente na BD
- [ ] Push notifications
- [ ] Conversions API server-side via webhook RevenueCat (deduplicação com Pixel — fase 2)
