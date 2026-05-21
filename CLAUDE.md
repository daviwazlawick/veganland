# VeganLand — Contexto para Claude Code

## O que é este projeto

App React Native (Expo SDK 54, web target) + servidor Node.js próprio.
Permite escanear produtos (foto ou barcode), analisar ingredientes com IA (Anthropic Claude) e dizer se o produto é adequado ao perfil do utilizador (dieta + alergias).

**Produção:** `https://veganland.app`  
**Servidor:** VPS Ubuntu, `/opt/veganland`, processo PM2 `veganland-api`  
**Owner:** Davi Augusto Wazlawick, 4 Frankfurter Allee, 10247 Berlin, Germany  
**Email:** contact@veganland.app

---

## Stack

| Camada | Tecnologia |
|---|---|
| App | React Native + Expo SDK 54 (web export) |
| Navegação | React Navigation (Stack + Bottom Tabs) |
| Estado | React Context (AppContext + AuthContext) |
| Backend | Node.js puro (sem framework), PM2 |
| Base de dados | PostgreSQL |
| IA | Anthropic Claude (analyze.js + anthropic.js) |
| Email | Nodemailer, SMTP Hostinger smtp.hostinger.com:465 |
| Auth | JWT + bcrypt |
| Browser in-app | expo-web-browser (Safari ViewController) |

---

## Estrutura de ficheiros importantes

```
src/
  screens/
    WelcomeScreen.js        — landing, sem auth
    LoginScreen.js          — login com resend confirmation
    RegisterScreen.js       — registo + check email screen
    ForgotPasswordScreen.js — reset password por email
    HomeScreen.js           — dashboard, histórico de scans
    ScanScreen.js           — câmera + análise
    ResultScreen.js         — resultado SAFE/CAUTION/NOT_SAFE
    ProfileScreen.js        — perfil + settings + legal links
    ProfileSetupScreen.js   — dieta + alergias (usado em edição também)
    EditPersonalScreen.js   — nome + bio + avatar
  context/
    AppContext.js   — profile, language, scan history, saveProfile()
    AuthContext.js  — login, register, logout, token JWT
  services/
    apiService.js   — todas as chamadas HTTP ao servidor
  constants/
    allergies.js    — ALLERGIES[] com id, icon, label por idioma
    diets.js        — DIETS[] com id, icon, label por idioma
    colors.js       — Colors (tema visual)
  i18n/
    index.js        — LANGUAGES[], t(lang, key, params), localeFor()
    en/pt/de/fr/it/es.js — traduções
  components/ui/
    BetaRibbon.js   — ribbon BETA no canto superior direito
    PremiumIcon.js  — ícones SVG custom
    index.js        — exports

server/src/
  server.js     — rotas HTTP
  db.js         — queries PostgreSQL (findProduct com fuzzy fallback)
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
- Fuzzy fallback em `findProduct`: se sem barcode, procura por brand + primeiras 3 palavras do nome na BD (evita knowledge-based para produtos já conhecidos)
- Cache neutral: análise guardada por produto+idioma, perfil aplicado localmente
- `analyzeProductByKnowledge`: fallback quando sem ingredientes

### Resultado
- 3 estados: SAFE / CAUTION / NOT_SAFE
- Card de análise com título + explicação
- Card de ingredientes (chips, flagged em vermelho)
- **Card de alergénios encontrados** (chips âmbar) — mostra alergénios detetados no produto independente do perfil
- Card de concerns (ingredientes problemáticos para o perfil)
- Card "no issues" para SAFE sem concerns

### Legal
- Páginas `/legal/terms`, `/legal/privacy`, `/legal/imprint` servidas pelo servidor Node.js
- Abertas com `expo-web-browser` (Safari ViewController in-app)
- Links no rodapé do ProfileScreen
- Terms checkbox no RegisterScreen (obrigatório)

### i18n
- 6 línguas: PT, EN, DE, FR, IT, ES
- Troca em tempo real (botão de bandeira em Login/Register/Welcome)
- `t(lang, 'key.nested', { param: value })` com fallback para EN

### Design
- Tema verde orgânico, glassmorphism nos cards
- BetaRibbon no canto superior **direito**
- `Colors` em `src/constants/colors.js`
- Safe area com `useSafeAreaInsets()` para bottom padding (tab bar)

---

## Deploy

### Workflow normal (Mac → servidor)
```bash
# No Mac:
git add ... && git commit -m "..." && git push origin main

# No servidor:
cd /opt/veganland && git pull && npm run build:deploy
```

`build:deploy` = `expo export --platform web` + `cp dist/* /var/www/veganland/` + `pm2 restart veganland-api`

### Só reiniciar servidor (sem rebuild web)
```bash
pm2 restart veganland-api --update-env
```

### Ver logs
```bash
pm2 logs veganland-api --lines 50 --nostream
```

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

**`products`**
- `identity_key TEXT UNIQUE` — `barcode:{barcode}` ou `name:{normalized}`
- `barcode TEXT`, `brand TEXT`, `product_name TEXT`
- `ingredients_text TEXT`, `source TEXT`

**`product_analyses`**
- `product_id`, `language`, `result JSONB` — análise neutral cached

---

## nginx — rotas proxy

Arquivo: `/etc/nginx/sites-available/veganland.app`

```nginx
location ~ ^/(analyze-product|health|auth/.+|user/.+|scan/.+|admin/?|admin/user/.+|legal/.+)$ {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    client_max_body_size 10m;
}
```

Após editar: `sudo nginx -t && sudo systemctl reload nginx`

---

## Padrões de código

- Sem comentários desnecessários
- Sem abstrações prematuras
- `t(language, 'section.key')` para todos os textos visíveis
- Quando adicionar string i18n: adicionar nos 6 ficheiros (en/pt/de/fr/it/es)
- `Colors.X` para todas as cores — nunca hardcoded exceto rgba temporários
- Safe area: usar `useSafeAreaInsets()` para bottom padding nas telas com tab bar

---

## Pendente / Próximas ideias

- [ ] Testes end-to-end do fluxo de confirmação de email
- [ ] Admin: endpoint para inserir/editar produtos manualmente na BD
- [ ] Melhorar análise knowledge-based para incluir ingredientes típicos
- [ ] Push notifications
- [ ] App Store / Play Store build (EAS)
