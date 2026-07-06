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
| version | `1.0.12` |
| versionCode (Android) | `15` |
| bundleIdentifier iOS | `app.novaqi` |
| package Android | `app.novaqi` |
| runtimeVersion policy | `appVersion` — OTA só chega a builds com a mesma versão |
| force update `min` (servidor) | `1.0.12` (iOS + Android) — confirmar em `GET /app/version` |

**Histórico:**
- 1.0.5 — rejeitado pela Apple (BetaRibbon, planos bloqueados, etc.)
- 1.0.6 — fixes de compliance
- 1.0.7 — fixes adicionais Apple review
- 1.0.8 — **aprovado pela Apple** ✅, RC iOS key corrigida
- 1.0.9 — fixes barcode/OFF fallback, MAY CONTAIN, traces, cache
- 1.0.10 — **Meta SDK + ATT** (CompleteRegistration, StartTrial, Subscribe, Scan); Privacy Policy actualizada
- 1.0.11 — **aprovado e em produção** (iOS + Android, Android já publicado na Play Store) — Push Notifications (APNs + FCM via Expo Push Service) + Programa de referência (referrals com bónus de scans). Firebase Analytics SDK foi tentado e **revertido** por incompatibilidade com Expo SDK 54 (ver secção "Firebase Analytics — tentativa revertida")
- 1.0.12 — fix do Meta Client Token (tinha um char a mais no `eas.json`, quebrava auth do SDK), fix de bug no RevenueCat (`entitlementToUserType` dava plano starter grátis via "Restaurar compras"), force update `min` bumped pra 1.0.12 em ambas plataformas

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
eas update --branch production --message "descrição"
```
`npm run update:novaqi` no `package.json` já espelha este comando completo (RC key e FB vars foram corrigidas em 1.0.12), mas historicamente falhava em modo non-interactive — preferir correr o comando manual acima directamente. **Cuidado ao editar esse script:** se faltarem `EXPO_PUBLIC_FB_APP_ID`/`EXPO_PUBLIC_FB_CLIENT_TOKEN`, o OTA desliga o SDK do Meta silenciosamente (`fbConfigured` fica `false`).

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
