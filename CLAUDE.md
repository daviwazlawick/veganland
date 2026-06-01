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
    LoginScreen.js          — login com resend confirmation (usa BrandLogo + BrandName)
    RegisterScreen.js       — registo + check email screen (usa BrandLogo + BrandName)
    ForgotPasswordScreen.js — reset password por email
    ForceUpdateScreen.js    — ecrã de bloqueio para updates obrigatórios
    HomeScreen.js           — dashboard, histórico de scans
    ScanScreen.js           — câmera + análise
    ResultScreen.js         — resultado SAFE/CAUTION/NOT_SAFE
    ProfileScreen.js        — perfil + settings + legal links
    ProfileSetupScreen.js   — dieta + alergias (usado em edição também)
    EditPersonalScreen.js   — nome + bio + avatar
  context/
    AppContext.js   — profile, language, scan history (inclui normalized_ingredients + identified_allergens), saveProfile()
    AuthContext.js  — login, register, logout, token JWT
  services/
    apiService.js   — todas as chamadas HTTP ao servidor (inclui apiCheckAppVersion)
  hooks/
    useForceUpdate.js — verifica versão mínima no servidor ao arrancar; devolve { required, storeUrl }
  constants/
    allergies.js    — ALLERGIES[] com id, icon, label por idioma
    diets.js        — DIETS[] com id, icon, label por idioma
    colors.js       — re-exporta Colors do brand activo
  i18n/
    index.js        — LANGUAGES[], t(lang, key, params) com brand overrides, localeFor()
    en/pt/de/fr/it/es.js — traduções (incluem secção 'update' para ForceUpdateScreen)
  components/ui/
    BetaRibbon.js   — ribbon BETA no canto superior direito
    PremiumIcon.js  — ícones (scan = target para NovaQI, câmera para VeganLand)
    BrandName.js    — wordmark split-color
    BrandLogo.js    — círculo de logo brand-aware (SVG novaqi-icon.svg para NovaQI)
    NovaQILogo.js   — ícone target/radar desenhado com Views (usado dentro de BrandLogo e PremiumIcon)
    index.js        — exports

assets/
  novaqi/
    icon.png, adaptive-icon.png, splash-icon.png, favicon.png  — assets nativos NovaQI
    novaqi-icon.svg        — target/radar com fundo navy (usado em BrandLogo)
    novaqi-logo-dark.svg   — lockup completo (ícone + wordmark)
    novaqi-logo-light.svg, novaqi-logo-mono.svg, novaqi-wordmark-dark.svg

server/src/
  server.js     — rotas HTTP (inclui GET /app/version)
  db.js         — queries PostgreSQL (getUserHistory inclui campos do result JSONB)
  analyze.js    — orquestração da análise (cache neutral, applyProfileToAnalysis)
  anthropic.js  — prompts + chamadas Anthropic
  auth.js       — JWT, bcrypt
  email.js      — nodemailer (SMTP Hostinger)
  legal.js      — HTML das páginas legais (Terms, Privacy, Imprint)
  migrate.js    — migrações de BD
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

### Perfil
- Dieta: vegan, vegetarian, pescatarian, glutenFree, halal, omnivore
- Alergias: 22 tipos (alimentares + cosméticos + vestuário)
- Guardado local (AsyncStorage) + servidor (users.diet_id, users.allergy_ids)
- Alterações refletem imediatamente no próximo scan

### Scan / Análise
- Foto da câmera ou galeria
- Barcode shortcut: se barcode detectado, lookup direto na BD (evita re-análise)
- `resolveProductIngredients`: imagem → BD → OpenFoodFacts → null
- Fuzzy fallback em `findProduct`: procura por brand + primeiras 3 palavras do nome
- Cache neutral: análise guardada por produto+idioma, perfil aplicado localmente
- `analyzeProductByKnowledge`: fallback quando sem ingredientes

### Resultado
- 3 estados: SAFE / CAUTION / NOT_SAFE
- Card de análise com título + explicação
- Card de ingredientes — `normalized_ingredients` (normalizado pelo Claude) com fallback para parse do `ingredients_text`; sempre visível
- Card de alergénios encontrados (chips âmbar) — sempre visível
- Card de concerns; card "no issues" para SAFE sem concerns

### Histórico de scans
- Guardado em AsyncStorage (offline) ou servidor (utilizadores autenticados)
- `addScanToHistory` guarda: `normalized_ingredients`, `identified_allergens`, `concerns`, `explanation`
- `getUserHistory` (servidor) extrai os campos do JSONB `result` na tabela `scan_events`
- `loadServerHistory` mapeia todos os campos necessários para o ResultScreen

### Planos de utilizador
- 3 tipos: `basic` (30 scans/mês), `premium` (100 scans/mês), `admin` (ilimitado)
- `SCAN_LIMITS` em `db.js`: `{ basic: 30, premium: 100, admin: null }` — `null` = ilimitado
- `POST /admin/user/:id/set-type` — endpoint de admin para mudar plano
- `getScanUsage` devolve `{ count, limit, resets_at }` — `limit: null` e `resets_at: null` para admin

### Updates obrigatórios (Force Update)
- `GET /app/version` — retorna versão mínima por plataforma (`ios`, `android`, `web`)
- `useForceUpdate` hook — compara versão instalada vs mínima ao arrancar
- `ForceUpdateScreen` — bloqueia o app com link para a loja se versão antiga
- **Para activar update obrigatório:** alterar `min` no handler `/app/version` em `server.js` + `pm2 restart`

### Legal
- Páginas `/legal/terms`, `/legal/privacy`, `/legal/imprint` servidas pelo servidor Node.js
- Abertas com `expo-web-browser` (Safari ViewController in-app)
- `Brand.domain` usado para URLs legais (veganland.app ou novaqi.app)

### i18n
- 6 línguas: PT, EN, DE, FR, IT, ES
- Troca em tempo real (botão de bandeira em Login/Register/Welcome)
- `t(lang, 'key.nested', { param: value })` com fallback para EN
- Brand overrides no `novaqi.js` — só strings que diferem do VeganLand

---

## Deploy — Web

### VeganLand
```bash
# No Mac:
git push origin main

# No servidor:
cd /opt/veganland && git pull && npm run build:deploy
```
`build:deploy` = `expo export --platform web` + `cp dist/* /var/www/veganland/` + `pm2 restart veganland-api`

### NovaQI
```bash
# No servidor:
cd /opt/veganland && git pull && npm run build:novaqi:deploy
```
`build:novaqi:deploy` = build com `BRAND=novaqi EXPO_PUBLIC_API_URL=https://novaqi.app` + `cp dist/* /var/www/novaqi/`

### Só reiniciar servidor (sem rebuild web)
```bash
pm2 restart veganland-api --update-env
```

### Ver logs
```bash
pm2 logs veganland-api --lines 50 --nostream
```

---

## Deploy — Nativo (iOS / Android) com EAS

### Desenvolvimento local
```bash
npm run web              # VeganLand no browser (localhost:8081)
npm run web:novaqi       # NovaQI no browser
npm run start:novaqi     # NovaQI com Expo Go
```

### Build nativo (EAS)
```bash
npm run build:android:novaqi     # AAB para Google Play
npm run build:android:veganland  # AAB para Google Play
npm run build:ios:novaqi         # IPA para App Store
npm run build:ios:veganland      # IPA para App Store
```

### Submeter para lojas
```bash
npm run submit:android:novaqi    # requer google-play-key.json
npm run submit:ios:novaqi        # requer Apple ID configurado
```

### OTA update (JS-only, sem passar pelas lojas)
```bash
npm run update:novaqi     # push update para utilizadores NovaQI
npm run update:veganland  # push update para utilizadores VeganLand
```

### Perfis EAS (`eas.json`)
- `novaqi-android`, `novaqi-ios`, `veganland-android`, `veganland-ios`
- Cada perfil define `BRAND`, `EXPO_PUBLIC_BRAND`, `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_APP_API_KEY` guardado como EAS secret: `eas secret:create`

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
```

---

## BD — colunas importantes

**`users`**
- `email_confirmed BOOLEAN NOT NULL DEFAULT false`
- `email_confirmation_token TEXT`
- `email_confirmation_sent_at TIMESTAMPTZ`
- `diet_id TEXT`, `allergy_ids TEXT[]`
- `user_type TEXT NOT NULL DEFAULT 'basic'` — valores: `basic`, `premium`, `admin`

**`products`**
- `identity_key TEXT UNIQUE` — `barcode:{barcode}` ou `name:{normalized}`
- `barcode TEXT`, `brand TEXT`, `product_name TEXT`
- `ingredients_text TEXT`, `source TEXT`

**`product_analyses`**
- `product_id`, `language`, `result JSONB` — inclui `normalized_ingredients`, `identified_allergens`, `concerns`, `explanation`

**`scan_events`**
- `user_id`, `product_id`, `status`, `title`, `source`, `language`, `result JSONB`, `created_at`
- `result` JSONB tem todos os campos da análise — `getUserHistory` extrai com `result->>'explanation'` etc.

**`scan_counters`**
- `user_id`, `month` (formato `YYYY-MM`), `count INT` — contador mensal por utilizador

---

## nginx — rotas proxy

### VeganLand — `/etc/nginx/sites-available/veganland.app`
- Web root: `/var/www/veganland`
- O path `/novaqi` redireciona (301) para `https://novaqi.app/`

```nginx
location ~ ^/(analyze-product|health|auth/.+|user/.+|scan/.+|admin/?|admin/user/.+|legal/.+|webhook/.+|app/.+)$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
    client_max_body_size 10m;
}
```

### NovaQI — `/etc/nginx/sites-available/novaqi.app`
- Web root: `/var/www/novaqi`
- Domínio dedicado com SSL próprio (Certbot `novaqi.app`)
- Proxy idêntico ao VeganLand — mesmo backend em `127.0.0.1:3000`
- CSP `connect-src` inclui tanto `https://novaqi.app` como `https://veganland.app`

**Nota:** `app/.+` e `webhook/.+` são necessários para `/app/version` (force update) e webhooks (ex. RevenueCat).

Após editar: `sudo nginx -t && sudo systemctl reload nginx`

---

## Padrões de código

- Sem comentários desnecessários
- Sem abstrações prematuras
- `t(language, 'section.key')` para todos os textos visíveis
- Quando adicionar string i18n: adicionar nos 6 ficheiros (en/pt/de/fr/it/es) — usar sempre aspas duplas `"` para evitar conflito com apóstrofes em FR/IT
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

## Pendente / Próximas ideias

- [ ] Integração de pagamento (RevenueCat + Apple IAP + Google Play Billing)
  - Planos: free (7 scans), starter/€2.99 (50 scans), pro/€5.99 (100 scans)
  - Webhook RevenueCat → servidor para actualizar user_type
  - PaywallScreen nova
- [ ] Lançamento Android (conta Google Play em verificação)
- [ ] Lançamento iOS (após Android)
- [ ] google-play-key.json para submissão automática via EAS
- [ ] App Store Connect — criar app NovaQI + produtos IAP
- [ ] Atualizar store_url em /app/version após publicação nas lojas
- [ ] Testes end-to-end do fluxo de confirmação de email
- [ ] Admin: endpoint para inserir/editar produtos manualmente na BD
- [ ] Push notifications
