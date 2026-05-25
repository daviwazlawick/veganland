# VeganLand — Design Specification

**Version:** 1.0  
**Platform:** React Native + Expo SDK 54 (Web + Android)  
**URL:** https://veganland.app

---

## 1. Visual Identity

### Brand
- **Name:** VeganLand
- **Tagline:** "Scan, trust, eat well."
- **Style:** Organic green, glassmorphism, clean and trustworthy
- **Logo font:** Serif (system serif / Georgia)
- **Body font:** System default (-apple-system, sans-serif)

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `primary` | `#7FBF5B` | Buttons, active states, scan bar |
| `primaryDark` | `#1C2B22` | Headers, dark text |
| `primaryLight` | `#B8DDA1` | Subtle highlights |
| `primaryBg` | `#EEF5E8` | Light green backgrounds |
| `accent` | `#D4B06A` | Amber accents, allergen chips |
| `accentDark` | `#8E6C2E` | Amber text |
| `accentLight` | `#F4E8CC` | Amber light backgrounds |
| `forest` | `#2E4736` | Secondary dark green |
| `darkSurface` | `#102822` | Camera overlay, scan button |
| `background` | `#FAF8F4` | Main page background |
| `backgroundSecondary` | `#F5F1E8` | Secondary backgrounds |
| `card` | `#FFFFFF` | Card background |
| `glass` | `rgba(255,255,255,0.76)` | Glassmorphism cards |
| `text` | `#1F1F1F` | Main text |
| `textLight` | `#6B6B6B` | Secondary text |
| `textMuted` | `#9A9A9A` | Placeholder / muted |
| `border` | `#E8E1D5` | Card borders |
| `safe` | `#8FCB72` | Safe status strip |
| `safeLight` | `#EDF7E7` | Safe background |
| `safeDark` | `#2E4736` | Safe text |
| `caution` | `#F2A75A` | Caution status strip |
| `cautionLight` | `#FFF1E2` | Caution background |
| `cautionDark` | `#9A6121` | Caution text |
| `danger` | `#E58A8A` | Not safe status strip |
| `dangerLight` | `#FBEAEA` | Not safe background |
| `dangerDark` | `#8A3D3D` | Not safe text / flagged ingredients |
| `overlay` | `rgba(16,40,34,0.72)` | Full-screen overlays |

### Typography

| Role | Size | Weight | Font |
|---|---|---|---|
| App title (header) | 34px | 700 | Serif |
| Section heading | 22–24px | 700 | Serif |
| Card title | 19px | 800 | System |
| Scan button title | 23px | 900 | System |
| Body | 14–15px | 500–600 | System |
| Label / tag | 11–13px | 700–800 | System |
| Muted / caption | 11–12px | 600 | System |

### Spacing & Radius

| Token | Value |
|---|---|
| Screen padding | 16–20px |
| Card border radius | 20–28px |
| Chip border radius | 14px |
| Button border radius | 14–16px |
| Gap between cards | 12–18px |

### Visual Style
- **Glassmorphism:** `background: rgba(255,255,255,0.76)`, `border: 1px solid rgba(255,255,255,0.72)`
- **Shadows:** `shadowColor: #102822`, `shadowOpacity: 0.06–0.08`, `shadowRadius: 12–40`
- **Button depth:** `borderBottomWidth: 3–5px` with darker color for 3D effect
- **Safe area:** `useSafeAreaInsets()` for bottom padding on tab screens

---

## 2. Navigation Structure

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
    ├── Scan         — camera + analysis
    └── Profile      — settings + usage + account
        └── Result   — SAFE / CAUTION / NOT_SAFE result card
            └── EditPersonal — name + bio + avatar
```

**Bottom Tab Bar:** 2 tabs — Home (🏠) + Profile (👤)  
**Scan** opens as a full-screen modal from the Home tab button.

---

## 3. Screens

---

### 3.1 Welcome Screen

**Route:** `Welcome`  
**Auth required:** No  
**Background:** `Colors.background`

**Components:**
- **Logo area:** "VeganLand" in serif + tagline "Scan, trust, eat well."
- **Subtitle:** "Analyze any product with AI and know if it's safe for your dietary profile."
- **Feature list (3 rows):**
  - 📷 "Take a photo" / "Point at the product label"
  - 🤖 "AI analyzes everything" / "Ingredients verified by AI"
  - ✅ "Instant result" / "Safe, caution or avoid"
- **CTA button:** "Get Started" — `Colors.primary`, full width, serif label
- **Secondary link:** "I already have an account" — text link
- **Language picker:** Row of flag buttons (PT / EN / DE / FR / IT / ES) — top or bottom
- **Beta ribbon:** top-right corner, green badge "BETA"

---

### 3.2 Login Screen

**Route:** `Login`  
**Auth required:** No

**Components:**
- Header: tagline "Your vegan life, simpler"
- Email input field
- Password input field
- "Forgot password?" link
- **Sign In button** — `Colors.primary`, full width
- "Don't have an account? Create account" — text link
- **Warning banner (conditional):** amber background if email not confirmed  
  → "Please confirm your email" + "Resend email" button
- Language picker (flag row)

---

### 3.3 Register Screen

**Route:** `Register`  
**Auth required:** No

**Components:**
- Email, Password, Confirm Password fields
- **Terms checkbox:** "I agree to the Terms & Conditions and Privacy Policy" (required)
  - Terms and Privacy links open in in-app browser
- **Create Account button** — `Colors.primary`, full width
- "Already have an account?" link

**Post-registration:** navigates to Check Email screen if confirmation required.

---

### 3.4 Check Email Screen

**Route:** (inline in Register flow)  
**Purpose:** Inform user a confirmation email was sent.

**Components:**
- Email envelope illustration / icon
- "Check your email"
- "We sent a confirmation link to {{email}}. Click it to activate your account."
- **Resend email button** — outline style
- Back to login link

---

### 3.5 Forgot Password Screen

**Route:** `ForgotPassword`

**Components:**
- Email input
- "Send link" button
- Success state: "Email sent!" + confirmation text
- Back to login link

---

### 3.6 Profile Setup Screen

**Route:** `ProfileSetup`  
**Auth required:** No (used before login for onboarding, and after login for editing)  
**Step indicator:** "Step 1 of 2" / "Step 2 of 2"

**Step 1 — Diet**
- Title: "How do you eat?"
- 6 diet options in a grid/list, each with:
  - Custom SVG icon
  - Name (translated)
  - Description (translated)
  - Selected state: `Colors.primary` border + background

**Step 2 — Allergies & Sensitivities**
- Title: "Allergies or sensitivities?"
- Subtitle: "Includes food, cosmetics, hygiene, and clothing"
- 22 allergy chips in a wrap grid, each with:
  - Custom SVG icon
  - Label (translated)
  - Toggle select/deselect
- "None" option
- **Save Profile button** — `Colors.primary`, full width

---

### 3.7 Home Screen

**Route:** `Home` (Tab 1)  
**Auth required:** Yes

**Header:**
- Left: "VeganLand" (serif 34px) + "What are we scanning today?" (muted 14px)
- Right: dark badge with total scan count + "scans" label

**Profile Card** (glassmorphism):
- Diet icon (64px circle) + diet name + description
- Allergy chips row (horizontal scroll wrap)
- Settings icon button (top right) → navigates to ProfileSetup
- Empty state: "No allergies or sensitivities configured"

**Scan Button** (dark card):
- Background: `Colors.darkSurface`
- Left: green circle (64px) with scan icon
- "Scan Product" (23px bold) + "Point at the Barcode, Label or Ingredients List"
- Right: arrow chevron circle
- Bottom border: 5px `Colors.primary` for depth effect
- Shadow: green glow

**Recent Scans** (up to 5):
- Section title: "Recent Scans (N)"
- Each item: left border color (safe/caution/danger), status icon, status label, product name, date
- Tappable → navigates to Result screen

**Empty state** (no scans):
- Grid of 5 muted icons
- "No scans yet!" + "No products scanned yet"

---

### 3.8 Scan Screen

**Route:** `Scan`  
**Full screen, no tab bar**

**Camera overlay:**
- `CameraView` fills screen (back camera)
- **Top bar:** ✕ close button (left) + "Scan Product" title + spacer
- **Frame:** 280×280px with corner brackets (`Colors.accent`)
- **Hint text:** "Best results pointing at the barcode or ingredient list"
- **Rotating tips pill** (every 3.5s):
  - "Barcode photo = most accurate result"
  - "Ingredient list visible? Even better!"
  - "Product front works too — AI knows many brands"
- **Bottom bar:** Gallery button (left) + Capture button (center, 80px circle)

**Analyzing overlay** (while API call runs):
- Dark semi-transparent overlay
- White glassmorphism card (82% width)
- AI icon (58px) + "Analyzing product..." + "Our AI is checking the ingredients"
- Activity indicator

**Error card overlay** (on any error):
- Same overlay + white glassmorphism card
- Error message text
- "OK" dismiss button (`Colors.primary`)

---

### 3.9 Result Screen

**Route:** `Result`  
**Accessed from:** Scan (after analysis) or Home (history item)

**Header:**
- Product name
- Source badge (image / local database / central database / internet / not found)

**Status banner:**
- Full-width colored strip
- Status label: **SAFE** / **CAUTION** / **AVOID**
- Subtitle text
- Status-specific icon

**Cards (scrollable):**

1. **Analysis card** — explanation text from AI

2. **Ingredients card** — always visible
   - Chips grid (each ingredient as a chip)
   - Flagged ingredients: `Colors.dangerDark` text + bold
   - Empty state: "Ingredients not available" (italic)

3. **Allergens card** — always visible, amber theme (`#FFF8ED`)
   - Allergen chips found in product
   - Empty state: "No allergens detected" (italic)

4. **Concerns card** — shown if concerns exist
   - Yellow/caution background
   - List of problematic ingredients

5. **No issues card** — shown if SAFE + no concerns
   - Green background + checkmark

**Bottom buttons:**
- "Scan Another" (outline) → goes back to Scan
- "Save" / "Share" (optional)

---

### 3.10 Profile Screen

**Route:** `Profile` (Tab 2)

**Header:** "My Profile"

**Personal Hero card:**
- Avatar (photo or initials circle)
- Name + bio
- "Edit" link → EditPersonal screen

**Diet card:**
- Current diet with icon, name, description
- "Edit Profile" button → ProfileSetup

**Allergies card:**
- Chips of selected allergies
- "No allergies or sensitivities registered" if empty

**Language card:**
- Row of 6 language options (PT / EN / DE / FR / IT / ES)
- Active: `Colors.primary` border + checkmark

**Account card:**
- Profile icon + "Account" + user email
- "Sign out" button (danger style)

**Usage card:**
- "SCANS THIS MONTH" label (uppercase)
- Plan badge: **Básico** (green) / **Premium** (amber) / **Admin** (blue)
- Count: `N/30`, `N/100`, or "Unlimited"
- Progress bar (green fill)
- "Resets on {{date}}" caption

**About card:**
- Dark green background
- VeganLand icon + name + tagline text

**Legal footer:**
- "Terms & Conditions · Privacy Policy · Imprint"
- Opens in in-app browser (Safari ViewController / Chrome Custom Tab)

---

### 3.11 Edit Personal Screen

**Route:** `EditPersonal`  
**Auth required:** Yes

**Components:**
- Avatar: tappable circle (photo or initials) → opens image picker
- "Tap to change photo" label
- Name input field
- Bio input field (multiline)
- Save button

---

## 4. Components

### Plan Badge
| Plan | Background | Text Color | Label |
|---|---|---|---|
| Basic | `#EEF5E8` | `#2E4736` | Básico / Basic |
| Premium | `#FFF1E2` | `#9A6121` | Premium |
| Admin | `#E8F0FF` | `#1A3A8F` | Admin |

### Status Config
| Status | Strip Color | Background | Text Color |
|---|---|---|---|
| SAFE | `#8FCB72` | `#EDF7E7` | `#2E4736` |
| CAUTION | `#F2A75A` | `#FFF1E2` | `#9A6121` |
| NOT_SAFE | `#E58A8A` | `#FBEAEA` | `#8A3D3D` |

### Beta Ribbon
- Position: **top-right corner** of Welcome/Landing screen
- Label: "BETA"
- Background: `Colors.primary` (#7FBF5B)
- Text: white, bold, small caps

### Allergy Chip
- Background: `rgba(255,255,255,0.58)` or amber (`#FFF8ED`)
- Border: `Colors.border`
- Icon (SVG) + label text
- Border radius: 14px

### Diet Card
- Border radius: 20px
- Selected: `Colors.primary` border (2px) + `Colors.primaryBg` fill
- Icon: 46px SVG, name bold, description muted

---

## 5. Diets (6)

| ID | Icon | EN | PT | DE | FR | IT | ES |
|---|---|---|---|---|---|---|---|
| `vegan` | vegan | Vegan | Vegano | Vegan | Végane | Vegano | Vegano |
| `vegetarian` | vegetarian | Vegetarian | Vegetariano | Vegetarisch | Végétarien | Vegetariano | Vegetariano |
| `pescatarian` | pescatarian | Pescatarian | Pescetariano | Pescetarisch | Pescétarien | Pescetariano | Pescetariano |
| `gluten_free` | gluten_free | Gluten-Free | Sem Glúten | Glutenfrei | Sans gluten | Senza glutine | Sin gluten |
| `halal` | halal | Halal | Halal | Halal | Halal | Halal | Halal |
| `omnivore` | omnivore | Omnivore | Onívoro | Omnivor | Omnivore | Onnivoro | Omnívoro |

---

## 6. Allergies & Sensitivities (22)

### Food
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

### Cosmetics / Hygiene / Clothing
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

## 7. User Plans

| Plan | Scans/Month | Badge Color |
|---|---|---|
| Basic | 30 | Green |
| Premium | 100 | Amber |
| Admin | Unlimited | Blue |

**Limit reached message:** "You've used all {{limit}} of your monthly scans. Your scans will renew in {{days}} days."

---

## 8. Languages

| Code | Name | Flag |
|---|---|---|
| `pt` | Português | PT |
| `en` | English | EN |
| `de` | Deutsch | DE |
| `fr` | Français | FR |
| `it` | Italiano | IT |
| `es` | Español | ES |

---

## 9. Icons (SVG — PremiumIcon)

All icons are custom SVG rendered via `PremiumIcon` component.

| Name | Used in |
|---|---|
| `vegan` | Vegan diet, empty state, about card |
| `vegetarian` | Vegetarian diet |
| `pescatarian` | Pescatarian diet |
| `gluten_free` | Gluten-free diet |
| `halal` | Halal diet |
| `omnivore` | Omnivore diet |
| `scan` | Scan button, gallery, camera |
| `ai` | Analyzing overlay |
| `safe` | SAFE result |
| `caution` | CAUTION result |
| `danger` | NOT_SAFE result |
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

## 10. App Flow Diagram

```
[Welcome]
    │
    ├── [Login] ──────────────────────────────────┐
    │       │                                      │
    │       ├── Email not confirmed? → Banner      │
    │       │       └── Resend confirmation        │
    │       └── Forgot password? → [ForgotPassword]│
    │                   └── Email sent → Back       │
    │                                              │
    └── [Register] → [Check Email] → (confirm) ───┘
            └── [ProfileSetup] ─────────────────┐
                    Step 1: Diet                 │
                    Step 2: Allergies            │
                                                 ▼
                                         [Main Tabs]
                                         ┌────────────────┐
                                         │ Home  │ Profile │
                                         └────────────────┘
                                              │
                                    [Scan] ◄──┤ (scan button)
                                         │    │
                                  analyze│    │
                                         ▼    │
                                      [Result]│
                                         │    │
                                         └────┘ (scan again)
                                              │
                                     [EditPersonal] (from Profile)
```

---

## 11. Scan Analysis — Result States

### SAFE
- Strip: `#8FCB72` green
- Card: `#EDF7E7` background
- Text: "This product suits your profile"
- Shows: ingredients + allergens + "No issues found!" card

### CAUTION
- Strip: `#F2A75A` amber
- Card: `#FFF1E2` background
- Text: "Check carefully before consuming"
- Shows: ingredients + allergens + concerns list

### NOT_SAFE / AVOID
- Strip: `#E58A8A` red
- Card: `#FBEAEA` background
- Text: "Not recommended for your profile"
- Shows: ingredients (flagged in red) + allergens + concerns list

### Analysis Sources
| Source Key | Display Label |
|---|---|
| `image` | image |
| `cache` | local database |
| `database` | central database |
| `open_food_facts` | internet |
| `knowledge` | uncertain source |
| `missing` | not found |
