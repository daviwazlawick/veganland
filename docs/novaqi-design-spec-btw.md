# NovaQI — Design Specification

**Version:** 2.0  
**Platform:** React Native + Expo SDK 54 (Web + Android)  
**URL:** novaqi.app  
**Rebrand from:** VeganLand v1.0  

---

## 0. Rebrand Summary

This spec replaces VeganLand entirely. Every reference to "VeganLand" becomes "NovaQI".  
The app is no longer vegan-only — it scans any product (food, cosmetics, cleaning, clothing) for any diet, allergy, or sensitivity.

**What changed:** name, all colors, fonts, copy strings, icon, tagline.  
**What stayed the same:** navigation architecture, screen structure, all 22 allergies, all 6 diets, user plans, languages, auth flow, scan logic.

---

## 1. Visual Identity

### Brand

- **Name:** NovaQI
- **Tagline:** "Scan anything. Know instantly."
- **Style:** Navy depth + citrus warmth. Sophisticated, distinct, trustworthy. Not clinical, not eco-green.
- **Logo font:** Syne 800 (Google Fonts)
- **Body font:** Plus Jakarta Sans (Google Fonts)

### ⚠️ Brand Name Rule — CRITICAL

The app name is **NovaQI** — always written as one single word, exact capitalisation.

| | Example |
|---|---|
| ✅ Correct | NovaQI |
| ❌ Never | Nova QI |
| ❌ Never | Novaqi |
| ❌ Never | NOVAQI |
| ❌ Never | NovaIQ |
| ❌ Never | novaqi |

This rule applies everywhere: UI text, copy strings, code comments, app store listings, legal documents.

---

## 2. Logo System

### Wordmark

- Font: **Syne 800**
- `Nova` rendered in white (on dark bg) or `#1E1B4B` (on light bg)
- `QI` always rendered in `#E8A020` (citrus)
- No space, no hyphen — one word: **NovaQI**
- Letter spacing: `-2` to `-2.5px` at display sizes

### Symbol — Target / Radar Icon

The brand symbol is a precision target/radar — communicates "identify with accuracy" universally without words.

**Construction (base size 52×52px):**
- Outer ring: circle r=16, stroke `#E8A020`, stroke-width 2.8px
- Inner ring: circle r=7, stroke `#E8A020`, stroke-width 2.8px
- Center dot: circle r=3, fill `#E8A020`
- Crosshair lines: 4 lines (top/bottom/left/right), stroke `#E8A020`, stroke-width 2.8px, stroke-linecap round
- Gap between crosshair lines and outer ring: 2px each side

**At favicon size (≤18px):** drop crosshair lines, keep outer ring + inner ring + center dot only.

### Logo Lockups

| Variant | When to use |
|---|---|
| **A — Wordmark only** | Tight spaces, inline text contexts |
| **B — Icon + Wordmark (preferred)** | App header, marketing, press kit |
| **Icon only** | App icon, favicon, small UI contexts |

Lockup B spacing: icon and wordmark separated by **16px** gap, vertically centered.

### Logo Versions

| Version | Background | `Nova` | `QI` | Icon |
|---|---|---|---|---|
| **Dark** (app, splash) | `#1E1B4B` | `#FFFFFF` | `#E8A020` | `#E8A020` |
| **Light** (site, press) | `#F8F7F4` | `#1E1B4B` | `#E8A020` | `#E8A020` |
| **Mono** (print, docs) | any | `#1E1B4B` | `#1E1B4B` | `#1E1B4B` |

### App Icon

- **Shape:** Rounded square — standard iOS/Android corner radius
- **Background:** `#1E1B4B` (navy)
- **Symbol:** Target icon in `#E8A020` (full version with crosshairs)
- **Favicon:** Outer ring + inner ring + center dot only (no crosshairs)

### Scale Reference

| Context | Icon size | Logo size |
|---|---|---|
| App Store / Play Store | 72px | — |
| iPhone home screen | 52px | — |
| Android launcher | 40px | — |
| App header | 34px | Syne 800 34px |
| Notification | 28px | — |
| Favicon | 18px (simplified) | — |

---

## 3. Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#E8A020` | Buttons, active states, scan frame, QI wordmark, icon |
| `primaryDark` | `#B87600` | Button bottom border (3D depth), pressed state |
| `primaryLight` | `#FFF3D6` | Light citrus backgrounds, selected states |
| `primaryBg` | `#FFFBEB` | Subtle tint backgrounds |
| `navy` | `#1E1B4B` | App header, dark surfaces, scan button bg, about card |
| `navyDeep` | `#13112E` | Camera overlay, deepest dark surface |
| `navyMid` | `#2D2A5E` | Secondary dark surface, profile card bg |
| `background` | `#F8F7F4` | Main page background |
| `backgroundSecondary` | `#F0EEE8` | Secondary backgrounds |
| `card` | `#FFFFFF` | Card background |
| `glass` | `rgba(255,255,255,0.82)` | Glassmorphism cards |
| `text` | `#1A1918` | Main text |
| `textLight` | `#6B6B72` | Secondary text |
| `textMuted` | `#9A9AA6` | Placeholder / muted |
| `border` | `#E4E2DC` | Card borders |
| `safe` | `#059669` | OK status strip |
| `safeLight` | `#ECFDF5` | OK background |
| `safeDark` | `#065F46` | OK text |
| `caution` | `#D97706` | Caution status strip |
| `cautionLight` | `#FFFBEB` | Caution background |
| `cautionDark` | `#92400E` | Caution text |
| `danger` | `#DC2626` | Avoid status strip |
| `dangerLight` | `#FEF2F2` | Avoid background |
| `dangerDark` | `#991B1B` | Avoid text / flagged ingredients |
| `overlay` | `rgba(19,17,46,0.80)` | Full-screen overlays |

---

## 4. Typography

| Role | Size | Weight | Font |
|---|---|---|---|
| App title / Logo | 34px | 800 | Syne |
| Section heading | 22–24px | 700 | Syne |
| Card title | 19px | 700 | Syne |
| Scan button title | 23px | 800 | Syne |
| Body | 14–15px | 500 | Plus Jakarta Sans |
| Label / tag | 11–13px | 600–700 | Plus Jakarta Sans |
| Muted / caption | 11–12px | 400–500 | Plus Jakarta Sans |

---

## 5. Spacing & Radius

| Token | Value |
|---|---|
| Screen padding | 16–20px |
| Card border radius | 20–28px |
| Chip border radius | 14px |
| Button border radius | 14–16px |
| Gap between cards | 12–18px |

---

## 6. Visual Style

- **Glassmorphism:** `background: rgba(255,255,255,0.82)`, `border: 1px solid rgba(255,255,255,0.72)`
- **Shadows:** `shadowColor: #1E1B4B`, `shadowOpacity: 0.08–0.12`, `shadowRadius: 12–40`
- **Button depth:** `borderBottomWidth: 3–5px` using `Colors.primaryDark` (`#B87600`)
- **Scan button glow:** `shadowColor: #E8A020`, `shadowOpacity: 0.30`, `shadowRadius: 18`
- **Safe area:** `useSafeAreaInsets()` for bottom padding on tab screens
- **Header surface:** always `Colors.navy` (`#1E1B4B`) — never light

---

## 7. Navigation Structure

```
Root (Stack)
├── Welcome          — unauthenticated landing
├── Login            — email + password
├── Register         — new account + terms
├── ForgotPassword   — email reset link
├── CheckEmail       — post-registration confirmation
├── ProfileSetup     — diet + allergies (also used for editing)
└── Main (Bottom Tabs)
    ├── Home         — dashboard + scan history
    ├── Scan         — camera + analysis (full-screen modal)
    └── Profile      — settings + usage + account
        └── Result   — OK / CAUTION / AVOID result card
            └── EditPersonal — name + bio + avatar
```

**Bottom Tab Bar:** 2 tabs — Home + Profile  
**Active tab color:** `Colors.primary` (`#E8A020`)  
**Tab bar background:** `Colors.card` (`#FFFFFF`)  
**Scan** opens as a full-screen modal from the Home tab scan button.

---

## 8. Screens

---

### 8.1 Welcome Screen

**Route:** `Welcome`  
**Auth required:** No  
**Background:** `Colors.background`

**Components:**
- **Logo area:** NovaQI lockup B (icon + wordmark) — dark version on light bg → use light version here + tagline "Scan anything. Know instantly."
- **Subtitle:** "Scan any product — food, cosmetics, clothing, cleaning — and get an instant verdict for your profile."
- **Feature list (3 rows):**
  - 📷 "Scan anything" / "Barcode, label, or ingredient list"
  - 🤖 "AI reads it all" / "Ingredients, allergens, additives"
  - ✅ "Instant verdict" / "OK, caution or avoid — in seconds"
- **CTA button:** "Start Scanning" — `Colors.primary`, full width, Syne 800, `borderBottomWidth: 4px` `Colors.primaryDark`
- **Secondary link:** "I already have an account" — text link in `Colors.navy`
- **Language picker:** Row of flag buttons (PT / EN / DE / FR / IT / ES)
- **Beta ribbon:** top-right corner, `Colors.primary` background, `Colors.navy` text "BETA", rotated 45°

---

### 8.2 Login Screen

**Route:** `Login`  
**Auth required:** No

**Components:**
- Header: tagline "Know what's in everything" — Syne 800
- Email input field
- Password input field + "Forgot password?" link in `Colors.primary`
- **Sign In button** — `Colors.primary`, full width, Syne 800
- Conditional warning banner (`Colors.cautionLight`): email not confirmed → "Resend email" button
- "Don't have an account? Create account" — text link
- Language picker (flag row)

---

### 8.3 Register Screen

**Route:** `Register`  
**Auth required:** No

**Components:**
- Email, Password, Confirm Password fields
- **Terms checkbox:** "I agree to the Terms & Conditions and Privacy Policy" (required)
  - Terms and Privacy links open in in-app browser
- **Create Account button** — `Colors.primary`, full width
- "Already have an account?" link

**Post-registration:** navigates to Check Email screen.

---

### 8.4 Check Email Screen

**Route:** inline in Register flow  

**Components:**
- Email envelope icon in `Colors.primary`
- "Check your email" — Syne 800
- "We sent a confirmation link to {{email}}. Click it to activate your account."
- **Resend email button** — outline style in `Colors.navy`
- Back to login link

---

### 8.5 Forgot Password Screen

**Route:** `ForgotPassword`

**Components:**
- Email input
- "Send link" button — `Colors.primary`
- Success state: "Email sent!" + confirmation text
- Back to login link

---

### 8.6 Profile Setup Screen

**Route:** `ProfileSetup`  
**Auth required:** No (onboarding) and Yes (editing)  
**Step indicator:** "Step 1 of 2" / "Step 2 of 2" in `Colors.primary`

**Step 1 — Diet**
- Title: "What's your diet?" — Syne 800
- 6 diet cards in grid, each with:
  - Custom SVG icon
  - Name (translated)
  - Description (translated)
  - Selected: `Colors.primary` border 2px + `Colors.primaryBg` fill

**Step 2 — Allergies & Sensitivities**
- Title: "Allergies or sensitivities?" — Syne 800
- Subtitle: "Covers food, cosmetics, hygiene, and clothing"
- 22 allergy chips in wrap grid — tap to toggle
- Selected chip: `Colors.primary` border + `Colors.primaryLight` fill
- "None" option
- **Save Profile button** — `Colors.primary`, full width, Syne 800

---

### 8.7 Home Screen

**Route:** `Home` (Tab 1)  
**Auth required:** Yes

**Header (navy surface `Colors.navy`):**
- Left: "NovaQI" Syne 800 — `Nova` white + `QI` `#E8A020` + "What are we checking today?" muted white
- Right: light badge with total scan count + "scans" label

**Profile Card** (glassmorphism on `Colors.navyMid`):
- `rgba(255,255,255,0.82)` card
- Diet icon (64px circle in `Colors.primaryLight`) + diet name + description
- Allergy chips row (horizontal scroll wrap)
- Settings icon button top right in `Colors.primary` → ProfileSetup
- Empty state: "No allergies or sensitivities configured"

**Scan Button** (navy dark card):
- Background: `Colors.navy`
- Left: citrus circle 64px (`Colors.primary`) with target icon in `Colors.navy`
- "Scan Product" Syne 800 white + "Food, cosmetics, clothing, cleaning products" muted white
- Right: arrow chevron circle in `Colors.primary`
- Bottom border: 5px `Colors.primaryDark`
- Shadow: citrus glow `shadowColor: #E8A020`

**Recent Scans** (up to 5):
- Section title: "Recent Scans (N)" — Syne 700
- Each item: left border color (safe/caution/danger) + status icon + status label + product name + date
- Tappable → Result screen

**Empty state:**
- Grid of 5 muted icons
- "No scans yet!" + "Scan your first product to get started"

---

### 8.8 Scan Screen

**Route:** `Scan`  
**Full screen, no tab bar**

**Camera overlay:**
- `CameraView` fills screen (back camera)
- **Top bar:** ✕ close (left) + "Scan Product" Syne 800 white + spacer
- **Frame:** 280×280px corner brackets in `Colors.primary` (`#E8A020`)
- **Hint text:** "Best results pointing at the barcode or ingredient list"
- **Rotating tips pill** every 3.5s, `rgba(255,255,255,0.15)` bg:
  - "Barcode photo = most accurate result"
  - "Ingredient list visible? Even better!"
  - "Product front works too — AI knows many brands"
- **Bottom bar:** Gallery button (left, white icon) + Capture button (center, 80px circle `Colors.primary`)

**Analyzing overlay:**
- `Colors.overlay` background `rgba(19,17,46,0.80)`
- White glassmorphism card 82% width, border-radius 24px
- Target icon 58px in `Colors.primary` + "Analyzing product..." Syne 700 + "NovaQI AI is reading the ingredients" muted
- Activity indicator in `Colors.primary`

**Error card overlay:**
- Same overlay + white glassmorphism card
- Error message + "OK" button in `Colors.primary`

---

### 8.9 Result Screen

**Route:** `Result`  
**Accessed from:** Scan or Home history

**Header:**
- Product name — Syne 800
- Source badge — `Colors.primaryLight` bg + `Colors.primaryDark` text

**Status banner:**
- Full-width colored strip
- Label: **OK** / **CAUTION** / **AVOID** — Syne 800
- Subtitle text + status icon

**Cards (scrollable):**
1. **Analysis card** — AI explanation in Plus Jakarta Sans
2. **Ingredients card** — always visible; flagged: `Colors.dangerDark` bold; empty: "Ingredients not available"
3. **Allergens card** — always visible; bg `Colors.primaryBg`; empty: "No allergens detected"
4. **Concerns card** — if concerns exist; bg `Colors.cautionLight`
5. **No issues card** — if OK + no concerns; bg `Colors.safeLight` + checkmark `Colors.safe`

**Bottom:**
- "Scan Another" outline button `Colors.navy` border → Scan
- "Save" / "Share" optional

---

### 8.10 Profile Screen

**Route:** `Profile` (Tab 2)

**Header:** "My Profile" — Syne 800 white on `Colors.navy`

**Personal Hero card:**
- Avatar (photo or initials circle in `Colors.primaryLight`)
- Name Syne 700 + bio Plus Jakarta Sans
- "Edit" link in `Colors.primary` → EditPersonal

**Diet card:**
- Current diet icon + name + description
- "Edit Profile" button `Colors.primary` → ProfileSetup

**Allergies card:**
- Selected allergy chips — `Colors.primaryLight` bg + `Colors.primaryDark` text
- Empty: "No allergies or sensitivities registered"

**Language card:**
- 6 language buttons (PT / EN / DE / FR / IT / ES)
- Active: `Colors.primary` border + checkmark

**Account card:**
- Email + "Sign out" button (`Colors.dangerLight` style)

**Usage card:**
- "SCANS THIS MONTH" — Plus Jakarta Sans 600 uppercase
- Plan badge + count (`N/30`, `N/100`, Unlimited)
- Progress bar — `Colors.primary` fill on `Colors.border` track
- "Resets on {{date}}" caption

**About card:**
- Background: `Colors.navy`
- NovaQI target icon + "NovaQI" wordmark (white + `#E8A020` QI) + "Scan anything. Know instantly."

**Legal footer:**
- "Terms & Conditions · Privacy Policy · Imprint" — in-app browser

---

### 8.11 Edit Personal Screen

**Route:** `EditPersonal`  
**Auth required:** Yes

**Components:**
- Avatar circle (`Colors.primaryLight`) — tappable → image picker
- "Tap to change photo" in `Colors.primary`
- Name input
- Bio input (multiline)
- Save button — `Colors.primary`, full width

---

## 9. Components

### Plan Badges

| Plan | Background | Text | Label |
|---|---|---|---|
| Basic | `#FFF3D6` | `#B87600` | Basic |
| Premium | `#FFFBEB` | `#92400E` | Premium |
| Admin | `#EEF0FF` | `#1E1B4B` | Admin |

### Status Config

| Status | Strip | Background | Text | Label |
|---|---|---|---|---|
| OK | `#059669` | `#ECFDF5` | `#065F46` | OK / Looks good for your profile |
| CAUTION | `#D97706` | `#FFFBEB` | `#92400E` | CAUTION / Check before using |
| AVOID | `#DC2626` | `#FEF2F2` | `#991B1B` | AVOID / Not suitable for your profile |

### Beta Ribbon
- Top-right corner of Welcome screen
- Background: `Colors.primary` (`#E8A020`)
- Text: "BETA", `Colors.navy`, bold, small caps, rotated 45°

### Glassmorphism Card
- `background: rgba(255,255,255,0.82)`
- `border: 1px solid rgba(255,255,255,0.72)`
- `border-radius: 28px`
- `shadowColor: #1E1B4B`, `shadowOpacity: 0.10`

### Allergy Chip
- Default: `background: rgba(255,255,255,0.58)`, border `Colors.border`
- Cosmetics/Clothing: `background: Colors.primaryBg`, border `Colors.primaryLight`
- Border radius: 14px

### Diet Card
- Border radius: 20px
- Unselected: `Colors.card` + `Colors.border`
- Selected: `Colors.primary` border 2px + `Colors.primaryBg` fill
- Icon: 46px SVG, name Syne 700, description muted

### Analysis Sources

| Key | Label |
|---|---|
| `image` | image |
| `cache` | local database |
| `database` | central database |
| `open_food_facts` | internet |
| `knowledge` | uncertain source |
| `missing` | not found |

---

## 10. Diets (6) — unchanged

| ID | EN | PT | DE | FR | IT | ES |
|---|---|---|---|---|---|---|
| `vegan` | Vegan | Vegano | Vegan | Végane | Vegano | Vegano |
| `vegetarian` | Vegetarian | Vegetariano | Vegetarisch | Végétarien | Vegetariano | Vegetariano |
| `pescatarian` | Pescatarian | Pescetariano | Pescetarisch | Pescétarien | Pescetariano | Pescetariano |
| `gluten_free` | Gluten-Free | Sem Glúten | Glutenfrei | Sans gluten | Senza glutine | Sin gluten |
| `halal` | Halal | Halal | Halal | Halal | Halal | Halal |
| `omnivore` | Omnivore | Onívoro | Omnivor | Omnivore | Onnivoro | Omnívoro |

---

## 11. Allergies & Sensitivities (22) — unchanged

### Food (12)

| ID | EN | PT |
|---|---|---|
| `peanuts` | Peanuts | Amendoim |
| `tree_nuts` | Tree Nuts | Nozes |
| `dairy` | Dairy | Laticínios |
| `eggs` | Eggs | Ovos |
| `gluten` | Gluten | Glúten |
| `soy` | Soy | Soja |
| `shellfish` | Shellfish | Crustáceos |
| `fish` | Fish | Peixe |
| `sesame` | Sesame | Gergelim |
| `corn` | Corn | Milho |
| `sulfites` | Sulfites | Sulfitos |
| `mustard` | Mustard | Mostarda |

### Cosmetics / Hygiene / Clothing (10)

| ID | EN | PT |
|---|---|---|
| `fragrance` | Fragrance | Fragrâncias |
| `essential_oils` | Essential Oils | Óleos essenciais |
| `latex` | Latex | Látex |
| `nickel` | Nickel | Níquel |
| `lanolin` | Lanolin | Lanolina |
| `formaldehyde` | Formaldehyde | Formaldeído |
| `parabens` | Parabens | Parabenos |
| `sulfates` | Sulfates | Sulfatos |
| `dyes` | Dyes | Corantes |
| `wool` | Wool | Lã |

---

## 12. User Plans — unchanged

| Plan | Scans/Month | Badge bg | Badge text |
|---|---|---|---|
| Basic | 30 | `#FFF3D6` | `#B87600` |
| Premium | 100 | `#FFFBEB` | `#92400E` |
| Admin | Unlimited | `#EEF0FF` | `#1E1B4B` |

**Limit reached:** "You've used all {{limit}} of your monthly scans. Your scans will renew in {{days}} days."  
Counter resets 1st of each month via `scan_counters` table — logic unchanged.

---

## 13. Languages (6) — unchanged

| Code | Name |
|---|---|
| `pt` | Português |
| `en` | English |
| `de` | Deutsch |
| `fr` | Français |
| `it` | Italiano |
| `es` | Español |

Persists via AsyncStorage. All strings via `t(language, 'section.key')` with English fallback.

---

## 14. Icons (SVG — PremiumIcon)

All icons rendered via `PremiumIcon` component.  
Primary color context is now `Colors.primary` (`#E8A020`) — previously green.

| Name | Used in |
|---|---|
| `scan` / target | Scan button, camera, app icon, logo symbol |
| `vegan` | Vegan diet, empty state, about card |
| `vegetarian` | Vegetarian diet |
| `pescatarian` | Pescatarian diet |
| `gluten_free` | Gluten-free diet |
| `halal` | Halal diet |
| `omnivore` | Omnivore diet |
| `ai` | Analyzing overlay |
| `safe` | OK result |
| `caution` | CAUTION result |
| `danger` | AVOID result |
| `profile` | Profile tab, account row |
| `home` | Home tab, empty state |
| `settings` | Edit profile button |
| `peanuts` | Peanut allergy |
| `tree_nuts` | Tree nut allergy |
| `dairy` | Dairy allergy |
| `eggs` | Egg allergy |
| `gluten` | Gluten sensitivity |
| `soy` | Soy allergy |
| `shellfish` | Shellfish allergy |
| `fish` | Fish allergy |
| `sesame` | Sesame allergy |
| `corn` | Corn sensitivity |
| `sulfites` | Sulfite sensitivity |
| `mustard` | Mustard allergy |
| `fragrance` | Fragrance sensitivity |
| `essential_oils` | Essential oils |
| `latex` | Latex allergy |
| `nickel` | Nickel sensitivity |
| `lanolin` | Lanolin sensitivity |
| `formaldehyde` | Formaldehyde sensitivity |
| `parabens` | Parabens sensitivity |
| `sulfates` | Sulfates sensitivity |
| `dyes` | Dyes sensitivity |
| `wool` | Wool sensitivity |

---

## 15. App Flow — unchanged

```
[Welcome]
    │
    ├── [Login] ──────────────────────────────────────────┐
    │       │                                              │
    │       ├── Email not confirmed → caution banner       │
    │       │       └── "Resend email" button              │
    │       └── "Forgot password?" → [ForgotPassword]      │
    │                   └── Email sent → Back to login     │
    │                                                      │
    └── [Register] ──► [Check Email] ──► (user confirms)  │
            └── [ProfileSetup]  ──────────────────────────┘
                    Step 1: Diet
                    Step 2: Allergies
                    "Save Profile"
                                                  [Main Tabs]
                                               ┌─────────────────┐
                                               │ Home  │ Profile │
                                               └─────────────────┘
                                                    │
                           ┌────────────────────────┤
                           │                        │
                        [Scan] ◄── tap "Scan Product" button
                           │
                    Camera opens
                           │
                    Photo captured / Gallery selected
                           │
                    API call → analysis
                           │
                    ┌──────┴──────┐
                    │             │
                  Error        [Result]
               (error card)      │
                  │              ├── OK    ──────────────┐
                  ▼              ├── CAUTION ────────────┤
              Dismiss            └── AVOID ──────────────┘
                                          │
                                  "Scan Another" → [Scan]
                                  History item → [Result] from [Home]

    [Profile]
        └── "Edit Profile" → [ProfileSetup]
        └── Avatar / Name / Bio → [EditPersonal]
        └── "Sign out" → [Welcome]
```

---

## 16. Result States

### OK
- Strip: `#059669`
- Card bg: `#ECFDF5`
- Text: "Looks good for your profile"
- Shows: ingredients + allergens + no issues card

### CAUTION
- Strip: `#D97706`
- Card bg: `#FFFBEB`
- Text: "Check before using"
- Shows: ingredients + allergens + concerns list

### AVOID
- Strip: `#DC2626`
- Card bg: `#FEF2F2`
- Text: "Not suitable for your profile"
- Shows: ingredients flagged in `#991B1B` bold + allergens + concerns list

---

## 17. Copy Strings — full change log from VeganLand

| Location | VeganLand (old) | NovaQI (new) |
|---|---|---|
| App name | VeganLand | NovaQI |
| Domain | veganland.app | novaqi.app |
| Tagline | "Scan, trust, eat well." | "Scan anything. Know instantly." |
| Welcome subtitle | "Analyze any product with AI and know if it's safe for your dietary profile." | "Scan any product — food, cosmetics, clothing, cleaning — and get an instant verdict for your profile." |
| Feature row 1 title | "Take a photo" | "Scan anything" |
| Feature row 1 sub | "Point at the product label" | "Barcode, label, or ingredient list" |
| Feature row 2 title | "AI analyzes everything" | "AI reads it all" |
| Feature row 2 sub | "Ingredients verified by AI" | "Ingredients, allergens, additives" |
| Feature row 3 title | "Instant result" | "Instant verdict" |
| Feature row 3 sub | "Safe, caution or avoid" | "OK, caution or avoid — in seconds" |
| Welcome CTA | "Get Started" | "Start Scanning" |
| Login tagline | "Your vegan life, simpler" | "Know what's in everything" |
| Home header title | "VeganLand" | "NovaQI" |
| Home header subtitle | "What are we scanning today?" | "What are we checking today?" |
| Scan button subtitle | "Point at the Barcode, Label or Ingredients List" | "Food, cosmetics, clothing, cleaning products" |
| Profile setup step 1 | "How do you eat?" | "What's your diet?" |
| Profile setup step 2 subtitle | "Includes food, cosmetics, hygiene, and clothing" | "Covers food, cosmetics, hygiene, and clothing" |
| Analyzing overlay line 2 | "Our AI is checking the ingredients" | "NovaQI AI is reading the ingredients" |
| About card tagline | "Scan, trust, eat well." | "Scan anything. Know instantly." |
| SAFE label | SAFE | OK |
| SAFE subtitle | "This product suits your profile" | "Looks good for your profile" |
| CAUTION subtitle | "Check carefully before consuming" | "Check before using" |
| NOT_SAFE label | NOT_SAFE | AVOID |
| NOT_SAFE subtitle | "Not recommended for your profile" | "Not suitable for your profile" |
| Legal footer | "VeganLand Design Specification · veganland.app" | "NovaQI · novaqi.app" |
