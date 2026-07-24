# NovaQI/VeganLand — Report de Negócio para Claude

Este ficheiro tem 3 blocos:
1. **Checklist de dados** — o que exportar de cada fonte antes de abrir o Claude
2. **Queries SQL** — corre no Postgres do `/opt/veganland` e cola o output
3. **Prompt mestre** — cola no Claude com todos os dados acima anexados

---

## 1. Checklist de dados a recolher

Exporta tudo desde o lançamento até hoje (2026-07-24). Guarda cada bloco num CSV/txt separado com nome claro.

### A. RevenueCat (assinaturas)
No dashboard RevenueCat → **Charts** e **Overview**, exporta CSV mensal:
- [ ] **MRR** mensal (mês a mês)
- [ ] **Active Subscriptions** por produto (starter mensal, starter anual, premium mensal, premium anual — o que existir)
- [ ] **New Trials** por mês
- [ ] **Trial → Paid conversion rate** (%)
- [ ] **Churn rate** mensal e anual
- [ ] **Refund rate**
- [ ] **LTV por cohort** de assinantes (Charts → Customer Lifetime Value)
- [ ] **Revenue por store** (Apple vs Google) — margem líquida difere (Apple/Google 15-30%)
- [ ] **Renewals vs cancellations** dos últimos 90 dias

### B. Meta Ads Manager
Filtro: desde o primeiro dia de campanha até hoje. Exporta com breakdown por **campanha, adset, país, plataforma**:
- [ ] **Total spend** por mês
- [ ] **Impressions, Reach, CPM**
- [ ] **CTR e CPC**
- [ ] **Installs** (via SKAdNetwork + Meta SDK — v1.0.10+)
- [ ] **Cost per Install (CPI)** por campanha
- [ ] **Custom Events attributed**: `CompleteRegistration`, `StartTrial`, `Subscribe`, `Scan` (implementados 2026-06-25)
- [ ] **Cost per CompleteRegistration, Cost per Subscribe**
- [ ] **ROAS** (se tiveres valores de conversão configurados)
- [ ] **Top 5 criativos** por performance
- [ ] **Top 5 audiences** por performance

### C. App Store Connect (iOS)
App Analytics → exporta por mês desde launch:
- [ ] **Impressions** (App Store product page views)
- [ ] **Product Page Views**
- [ ] **Conversion Rate** (impression → install)
- [ ] **Total Downloads** e **First-Time Downloads**
- [ ] **Sessions per active device**
- [ ] **Crashes** e **Crash-free rate**
- [ ] **Ratings & Reviews**: nº total, média, breakdown 1★–5★
- [ ] **Downloads por país** (top 10)
- [ ] **Downloads por keyword/source** (Search vs Browse vs Referral)
- [ ] **Retention D1, D7, D30**

### D. Google Play Console (Android)
Statistics → exporta:
- [ ] **Store listing visitors** e **Store listing acquisitions**
- [ ] **Conversion rate** (visitor → install)
- [ ] **Installs por país** (top 10)
- [ ] **Uninstalls** e **Uninstall rate**
- [ ] **Ratings** (média, distribuição)
- [ ] **Reviews** — top 20 positivas e top 20 negativas
- [ ] **Crashes e ANRs**
- [ ] **Vitals** (bad behaviour rate)
- [ ] **Acquisition source** (organic search, browse, referral, ads)
- [ ] **Retention D1, D7, D30**

### E. Backend Postgres (`/opt/veganland`)
Corre as queries do bloco 2 e cola o output.

---

## 2. Queries SQL para o Postgres

Liga-te ao DB (`psql` na VPS) e corre cada bloco. Nome sugerido: `sql_dump_novaqi.txt`.

```sql
-- =========================================================
-- USERS: crescimento acumulado por mês e por brand
-- =========================================================
SELECT
  DATE_TRUNC('month', created_at) AS mes,
  COUNT(*) AS novos_users,
  SUM(COUNT(*)) OVER (ORDER BY DATE_TRUNC('month', created_at)) AS users_acumulado
FROM users
GROUP BY 1
ORDER BY 1;

-- =========================================================
-- USER TYPE BREAKDOWN (o modelo pós-lock de 2026-07-07)
-- =========================================================
SELECT
  COALESCE(user_type, 'null (locked signup)') AS tipo,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM users
GROUP BY user_type
ORDER BY total DESC;

-- =========================================================
-- FUNIL DE ACTIVATION: signup → primeiro scan → 3+ scans
-- =========================================================
WITH activity AS (
  SELECT u.id, u.created_at,
         COUNT(s.id) AS total_scans,
         MIN(s.created_at) AS first_scan_at
  FROM users u
  LEFT JOIN scan_history s ON s.user_id = u.id
  GROUP BY u.id, u.created_at
)
SELECT
  COUNT(*) AS total_signups,
  COUNT(*) FILTER (WHERE total_scans >= 1) AS activated_1_scan,
  COUNT(*) FILTER (WHERE total_scans >= 3) AS activated_3_scans,
  COUNT(*) FILTER (WHERE total_scans >= 10) AS power_users_10plus,
  ROUND(100.0 * COUNT(*) FILTER (WHERE total_scans >= 1) / NULLIF(COUNT(*),0), 2) AS pct_first_scan,
  ROUND(100.0 * COUNT(*) FILTER (WHERE total_scans >= 3) / NULLIF(COUNT(*),0), 2) AS pct_activated,
  ROUND(EXTRACT(EPOCH FROM AVG(first_scan_at - created_at))/60, 1) AS avg_min_ate_1_scan
FROM activity;

-- =========================================================
-- CONVERSÃO PARA PAGO por cohort mensal
-- =========================================================
SELECT
  DATE_TRUNC('month', u.created_at) AS cohort,
  COUNT(*) AS signups,
  COUNT(*) FILTER (WHERE u.user_type IN ('starter','premium')) AS pagantes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE u.user_type IN ('starter','premium'))
        / NULLIF(COUNT(*),0), 2) AS conv_pct
FROM users u
GROUP BY 1
ORDER BY 1;

-- =========================================================
-- RETENÇÃO por semana (users que voltaram a scannar N dias depois)
-- =========================================================
WITH first_last AS (
  SELECT user_id,
         MIN(created_at) AS first_scan,
         MAX(created_at) AS last_scan,
         COUNT(*) AS scans
  FROM scan_history
  GROUP BY user_id
)
SELECT
  COUNT(*) FILTER (WHERE last_scan - first_scan >= INTERVAL '1 day')  AS retido_d1,
  COUNT(*) FILTER (WHERE last_scan - first_scan >= INTERVAL '7 days') AS retido_d7,
  COUNT(*) FILTER (WHERE last_scan - first_scan >= INTERVAL '30 days') AS retido_d30,
  COUNT(*) FILTER (WHERE last_scan - first_scan >= INTERVAL '90 days') AS retido_d90,
  COUNT(*) AS total_users_com_scan
FROM first_last;

-- =========================================================
-- SCANS por mês (uso do produto)
-- =========================================================
SELECT
  DATE_TRUNC('month', created_at) AS mes,
  COUNT(*) AS total_scans,
  COUNT(DISTINCT user_id) AS scanners_unicos,
  ROUND(1.0 * COUNT(*) / NULLIF(COUNT(DISTINCT user_id),0), 2) AS scans_por_user
FROM scan_history
GROUP BY 1
ORDER BY 1;

-- =========================================================
-- PUSH TOKENS registados (proxy de engagement / opt-in)
-- =========================================================
SELECT
  platform,
  COUNT(*) AS tokens,
  COUNT(DISTINCT user_id) AS users_com_push
FROM push_tokens
GROUP BY platform;

-- =========================================================
-- LOCALE (idiomas) — orienta expansão internacional
-- =========================================================
SELECT
  COALESCE(locale, 'unknown') AS lang,
  COUNT(*) AS users,
  COUNT(*) FILTER (WHERE user_type IN ('starter','premium')) AS pagantes
FROM users
GROUP BY 1
ORDER BY users DESC;

-- =========================================================
-- OAUTH vs EMAIL signup
-- =========================================================
SELECT
  CASE WHEN oauth_provider IS NULL THEN 'email' ELSE oauth_provider END AS metodo,
  COUNT(*) AS users,
  COUNT(*) FILTER (WHERE user_type IN ('starter','premium')) AS pagantes,
  ROUND(100.0 * COUNT(*) FILTER (WHERE user_type IN ('starter','premium'))
        / NULLIF(COUNT(*),0), 2) AS conv_pct
FROM users
GROUP BY 1;
```

> Ajusta nomes de tabelas/colunas se divergirem — verifica em `/opt/veganland/server/src/db.js` antes de correr.

---

## 3. Prompt mestre para colar no Claude

Cria uma nova conversa no Claude e cola o bloco abaixo, substituindo os `<<...>>` pelos ficheiros/dados extraídos acima.

---

```
Actua como consultor sénior de growth + monetização para apps mobile freemium, com background em D2C consumer (Duolingo, Yuka, Fastic, Noom). Vais ajudar-me a decidir onde investir tempo e dinheiro nos próximos 90 dias.

## Contexto do produto

**App:** NovaQI (e brand irmã VeganLand no mesmo codebase, white-label)
**Categoria:** Scanner de códigos de barras que analisa ingredientes de comida — foco em detecção de aditivos não-veganos / não saudáveis. Concorrentes directos: Yuka, Open Food Facts, Foodvisor.
**Stack:** React Native (Expo SDK 54), backend Node/Postgres em VPS Ubuntu.
**Plataformas:** iOS + Android.
**Idade:** Lançado há ~<<X meses>>. Versão actual 1.0.14.
**Localização founder:** Berlin. Mercado inicial: <<PT/BR/DE/global>>.

## Modelo de negócio actual

- **Freemium com paywall forçado** desde 2026-07-07 (v1.0.13+): novos signups têm `user_type = NULL` e são obrigados a passar pelo paywall no cold start. Só saem comprando ou fazendo restore.
- **Users legacy (`user_type = 'free'`):** mantêm 7 scans/mês grátis.
- **Tiers pagos:** starter e premium (mensal + anual via RevenueCat).
- **Aquisição actual:** Meta Ads (SDK nativo desde v1.0.10, eventos: CompleteRegistration, StartTrial, Subscribe, Scan), organic ASO, algum word-of-mouth.
- **Push notifications:** implementado v1.0.11 (Expo Push, iOS activo; Android pendente Firebase).
- **Referral loop:** existe screen `Referral` mas sem incentivo forte definido.

## Dados que anexei abaixo

1. **RevenueCat export** — MRR mensal, active subs, trials, churn, LTV, revenue por store
2. **Meta Ads export** — spend, CPI, cost por evento, top criativos e audiences
3. **App Store Connect** — impressions, page views, conv rate, downloads, ratings, retention
4. **Google Play Console** — visitors, installs, uninstalls, ratings, reviews, retention
5. **Postgres dump** — users por cohort, funil activation, conv por cohort, retenção, scans, push opt-in, locale, oauth vs email

<<COLAR AQUI CADA BLOCO DE DADOS COM CABEÇALHO CLARO>>

## O que quero de ti (nesta ordem, sem pular)

### Parte 1 — Diagnóstico frio
1. **Funil unificado** do install ao subscriber leal (D30). Onde está a maior perda em pontos %? Compara com benchmarks públicos de utility apps freemium (Yuka, Fastic, MyFitnessPal).
2. **Unit economics:** CAC blended, CAC por canal, ARPU, LTV, LTV/CAC, payback period. Diz-me se estou a queimar dinheiro ou a construir um negócio.
3. **Diagnóstico de retenção:** D1/D7/D30 vs benchmark. Onde perco os users que já activaram?
4. **Segmento mais rentável:** que país + idioma + método de signup + tier tem melhor LTV/CAC? Onde devia concentrar spend?

### Parte 2 — Hipóteses de crescimento (top 10 ranqueadas)
Para cada uma:
- Nome curto
- Hipótese em 1 frase (Se X então Y porque Z)
- Métrica alvo e delta esperado
- Effort (S/M/L em dias-dev)
- Confidence (Low/Med/High) baseado em evidência nos dados que anexei
- Score ICE (Impact × Confidence × Ease, escala 1-10)
Ordena por ICE descendente.

### Parte 3 — Recomendações de monetização
- **Pricing:** o preço actual está a maximizar receita? Sugere teste A/B concreto (preço, moeda por país, duração de trial).
- **Paywall:** o modelo de lock forçado (user_type NULL) está a converter melhor ou pior que o legacy freemium (7 scans grátis)? Como saberia? Sugere experimento.
- **Trial:** duração óptima, hard vs soft paywall.
- **Retention hooks pós-purchase** para reduzir churn.

### Parte 4 — Plano 90 dias
Tabela semana-a-semana com: experimento, hipótese, dono, métrica de sucesso, decisão go/no-go. Máximo 3 experimentos em paralelo.

### Parte 5 — Alertas
Lista de 5 riscos ou red flags que vês nos dados que eu ainda não perguntei. Sê directo — se algo está mau, diz.

## Regras de resposta

- Português.
- Sem fluff, sem "excelente pergunta". Vai directo.
- Números com fonte (que bloco de dados usaste).
- Quando faltar dado para responder, di-lo — não inventes.
- Ordena tudo por impacto potencial em MRR nos próximos 90 dias.
```

---

## 4. Como usar isto

1. Corre as queries do bloco 2 na VPS e salva output.
2. Exporta os CSVs de RevenueCat, Meta, App Store, Play Console.
3. Abre nova conversa Claude → cola prompt do bloco 3 → anexa/cola os dados nas secções indicadas.
4. Itera: depois da primeira resposta, pede "aprofunda a hipótese #1 com um brief técnico de implementação para o meu stack RN/Expo + backend Node".

## 5. Bónus — o que faltará mesmo com tudo isto

Coisas que só o Davi sabe e devias adicionar manualmente ao prompt na secção "Contexto":
- **Runway** (quantos meses de budget para ads).
- **Objectivo pessoal 90 dias** (MRR alvo? Users alvo? Break-even?).
- **Constraints** (tempo de dev/semana, se estás sozinho, se podes contratar).
- **Aversão a risco** (queres testar preços agressivos? Cortar features grátis?).
