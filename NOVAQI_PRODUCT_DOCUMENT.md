# NovaQI — Complete Product Document
**Version:** 1.0.13+ | **Last updated:** 2026-08-14
**Purpose:** User manual base · AI ad/video scripting · Marketing content

---

## 1. What Is NovaQI?

NovaQI is a personal nutrition intelligence app that helps you:
- **Instantly analyse food products** — scan a barcode or take a photo and get a clear verdict: is it safe for your diet?
- **Track your nutrition** — log what you eat every day, see calories, macros, water intake and weight trends
- **Log exercise** — record workouts and see how many calories you burned, offsetting what you consumed
- **Analyse full plates** — photograph a meal and get a breakdown of every item on the plate
- **Search and log foods** — search a global food database, add items manually, or let AI estimate nutritional values

The app supports 6 languages: **Portuguese, English, German, French, Italian, Spanish**.

It runs on **iOS, Android, and the web** at [novaqi.app](https://novaqi.app).

---

## 2. Who Is It For?

NovaQI is designed for people who care deeply about what they eat. Core user personas:

| Persona | What they use NovaQI for |
|---|---|
| **Halal consumers** | Verify every ingredient against halal rules before buying |
| **Vegans & vegetarians** | Instant check for animal-derived ingredients |
| **Gluten-free** | Flag hidden gluten in processed foods |
| **Fitness-conscious** | Track calories in vs calories burned |
| **Health-curious** | Understand macros, set nutrition goals, see weekly trends |
| **Families with allergies** | Scan products before giving to children |

---

## 3. Core Value Proposition

> *"Scan once, know instantly. NovaQI reads the label so you don't have to."*

**Pain point solved:** Reading ingredient lists is slow, confusing, and error-prone — especially when you have a diet restriction, a food allergy, or need to verify halal compliance. NovaQI does it in seconds, with AI accuracy.

**Secondary value:** Nutrition tracking without the friction. Instead of manually searching a food database every time, NovaQI combines barcode scanning, plate photo analysis, AI-powered food search, and manual entry — all feeding into a unified daily dashboard.

---

## 4. Subscription Plans

| Plan | Price | Scans/month | Best for |
|---|---|---|---|
| **Free** | €0 | 7 scans | Trying the app |
| **Starter** | €2.99/month | 30 scans | Regular shoppers |
| **Premium** | €5.99/month | 100 scans | Daily trackers + families |

- **Free trial:** 2 weeks free on iOS · 15 days free on Android (Starter and Premium)
- Subscription is auto-renewing and can be cancelled at any time in device settings
- Scans roll over monthly; unused scans do not carry forward
- **Bonus scans** can be earned through the referral programme (see section 12)

---

## 5. Getting Started — User Journey

### Step 1: Download & Open
Available on the App Store and Google Play. Also works in any web browser at novaqi.app.

### Step 2: Disclaimer
On first launch, the app presents a one-time disclaimer explaining that:
- The analysis is AI-generated and should not replace reading the physical label
- The user confirms they will always check the physical label before consuming

The user must tick a checkbox to proceed. This is a safety and compliance requirement.

### Step 3: Create an Account
- Register with **email + password**, or sign in instantly with **Apple** (iOS) or **Google**
- Email registration requires email confirmation before logging in
- OAuth sign-in (Apple/Google) is instant — no email confirmation needed

### Step 4: Set Your Profile
Choose your **diet type:**
- Vegan
- Vegetarian
- Pescatarian
- Gluten-free
- Halal
- Omnivore (general health tracking)

Then choose any **food sensitivities** from 22 options (e.g. nuts, soy, dairy, shellfish, eggs, gluten, sesame, celery, lupin, sulphites, mustard, peanuts, and more).

### Step 5: Scan Your First Product
Tap the scan button. Point the camera at a barcode or a product ingredient list. Get your verdict in seconds.

---

## 6. Product Scanning & Analysis

### How to scan
1. Tap the **scan button** (camera icon) from the home screen
2. Point at a **barcode** — the app looks it up instantly from the database (no AI cost, instant result)
3. Or point at the **ingredient list text** — Claude AI reads and analyses it

### What you get: the Result Screen
The result screen shows one of three verdicts:

| Verdict | Colour | Meaning |
|---|---|---|
| ✅ **Safe** | Green | Product matches your diet and has no flagged allergens |
| ⚠️ **Caution** | Amber | Some ingredients may be borderline for your profile |
| ❌ **Not Safe** | Red | Contains ingredients that don't match your diet |

**What's shown on the result screen:**
- Verdict banner with title and explanation
- Full ingredient list with flagged items highlighted
- Allergen summary (identified allergens)
- Concerns list (specific reasons for caution/not-safe)
- **Disclaimer box** (amber): reminder to always check the physical label
- **"Analysis generated by Claude AI (Anthropic)"** — tappable link

### Halal-specific experience
When your diet is set to **Halal**, NovaQI uses a dedicated ingredient-matching engine that checks every ingredient and E-code against a halal ruleset:

- **Halal ✓** — all ingredients confirmed halal
- **Mashbooh** (caution) — doubtful ingredients (e.g. unspecified E-codes that may be animal-derived)
- **Not Halal** — confirmed haram ingredients (e.g. pork gelatin, lard, alcohol, wine, beer)

You can set your **halal strictness**:
- **Cautious** (default) — flags any doubtful ingredient as mashbooh
- **Moderate** — only flags clearly not-halal ingredients

The halal engine runs entirely on-device for speed and privacy — no ingredient data is sent to external halal databases.

### "I Will Eat It" — log directly from scan result
After scanning a food product (not a supplement), a button **"I Will Eat It"** appears at the bottom of the result screen. Tapping it logs the product to your nutrition diary with one tap — calories and macros are filled automatically from the product data.

### Burn equivalent (fitness context)
For scanned products, the result screen shows a **"Burn equivalent"** box:
- How many minutes of **running**, **cycling**, and **brisk walking** it takes to burn the calories in 100g of this product
- Calculated based on your body weight from your profile

---

## 7. Plate Photo Analysis

### What it is
Take a photo of any **prepared meal or plate** and the AI identifies every item on the plate, estimates portion sizes, and gives you the nutritional breakdown.

### How to use it
1. From the home screen, tap **"📷 Analyse plate"** (or equivalent)
2. The camera opens — take a photo of your meal
3. NovaQI sends the image to Claude AI
4. You get a list of identified items: each with name, estimated grams, kcal, protein, fat, carbs

### After the analysis
- Each item shows its diet verdict (green dot = safe, amber = caution, red = not safe)
- You can **edit any item** — change the name, grams, or any macro value
- You can **add items** the AI missed
- Editing an item removes its diet verdict (re-analyse to recalculate)
- Tap **"Log this meal"** to save all items to your nutrition diary

### Scan limit
Plate analyses count as scans against your monthly plan limit.

---

## 8. Daily Nutrition Dashboard

The nutrition dashboard is the heart of your daily tracking. It shows everything about today at a glance.

### What you see

**Calorie ring / summary**
- Calories consumed today
- Calories burned today (from exercise logs)
- Calories remaining (goal minus consumed plus burned)
- Water consumed today vs your goal

**Macro breakdown**
- Protein (g)
- Carbohydrates (g)
- Fat (g)
- Fibre (g)
- Sugar (g)
- Salt (g)
- Progress bar for each vs your daily goals
- Tap "More" to expand and see fibre, sugar, salt

**Exercise section (inline)**
- All exercises logged today, each showing:
  - Category colour indicator
  - Exercise icon
  - Exercise name
  - Duration (minutes)
  - Calories burned (🔥)
  - Delete button
- Link to log a new exercise

**Food log — what you ate today**
- List of all food entries for today, grouped by meal (breakfast, lunch, dinner, snacks)
- Each entry shows: product name, grams, kcal, and a delete button

**Water log**
- Current water intake vs daily goal
- Quick-add buttons: +150ml, +250ml, +330ml, +500ml

**Weight**
- Latest weight entry
- Link to log weight

### Adding food manually
Tap **"Add Food"** to open the Add Food modal:
1. Type the food name — a smart search appears instantly
2. Select from suggestions (from your history, global averages, scanned products, or AI)
3. Set grams (required)
4. Choose meal type: Breakfast / Lunch / Dinner / Snack
5. Review macros (auto-filled from the database, editable)
6. Tap Save

**AI badge:** if a food is not in any database, Claude AI estimates the nutritional values. These results appear with a purple "AI" badge.

**Smart portion sizing:** if you type "2 slices of bread" or "1 cup of milk", the AI recognises the quantity and returns macros for that exact portion (not per 100g). Typical weights used: 1 slice bread ≈ 30g, 1 slice cheese ≈ 25g, 1 egg ≈ 55g, 1 banana ≈ 120g, 1 apple ≈ 150g, 1 cup milk ≈ 240g.

---

## 9. Water Tracking

### Quick logging from Home Screen
Tap the **water card** on the home screen to open a bottom-sheet popup:
- **Preset options:** 150ml (¾ cup) · 250ml (1 cup) · 350ml (1½ cups) · 500ml (2 cups) · 750ml (3 cups)
- **Custom amount:** type any amount in ml and tap "+"
- Today's total water intake is shown in a blue badge at the top of the popup

### Goal progress
Your water goal is set in Nutrition Goals. The dashboard shows a progress indicator. A blue 💧 icon shows your current intake and your target for the day.

### Hydration notifications (native app only)
The app sends smart push notifications to remind you to drink water at:
- 09:00 — morning hydration reminder
- 13:00 — midday reminder
- 17:00 — afternoon reminder

Notifications are personalised: they show how much water you've had vs your goal. If you've already hit your goal for the day, no notification is sent. Notifications use your device timezone automatically.

---

## 10. Exercise Tracking

### ExerciseLog screen
Accessible from the nutrition dashboard or the burned-calories pill on the home screen.

**Exercise library:**
- 27 exercises across 5 categories: Cardio, Strength, Flexibility, Sports, Other
- Each exercise has a MET value (scientific calorie burn rate)
- Preview shows kcal burned per 30 minutes, based on your body weight

**Tabs by category:**
- All
- Cardio (running, cycling, swimming, jumping rope, HIIT, etc.)
- Strength (weight training, push-ups, pull-ups, yoga, pilates, etc.)
- Flexibility & Recovery
- Sports (football, basketball, tennis, etc.)
- Favourites (starred exercises, saved between sessions)

### Logging an exercise
1. Tap any exercise from the list
2. A modal opens with the exercise name and a duration input
3. Live preview: as you type the duration, the estimated calorie burn updates in real time
4. Tap "Log" to save

### Today's exercise log
At the top of the ExerciseLog screen:
- Total calories burned today (large number)
- **Category breakdown strip:** coloured pills showing duration per category (e.g. "🔴 Cardio 30′ · 🔵 Strength 20′")
- Individual activity cards for each logged exercise:
  - Coloured left border (by category)
  - Category icon bubble
  - Exercise name
  - Duration · 🔥 kcal burned
  - Delete button

### Calorie burn calculation
```
kcal/min = MET × your_weight_kg × 3.5 / 200
total_burned = kcal/min × duration_min
```
Uses your body weight from your profile (defaults to 70kg if not set).

---

## 11. Nutrition Report

Access from the nutrition dashboard. Shows your history across three periods:

### Period tabs
- **Today** — snapshot of today (same data as dashboard)
- **Week** — last 7 days
- **Month** — last 30 days

### What the report shows

**Period summary card (navy):**
- Total kcal consumed
- Total kcal burned (if any exercise logged)
- Total water consumed (in litres)

**Calorie bar chart (week / month only):**
- Vertical bars for each day
- Red goal line showing your daily calorie target
- Bars turn taller as you approach/exceed your goal

**Day-by-day breakdown:**
Each day shows:
- Date header
- 🍴 kcal consumed
- 🔥 kcal burned (if any exercise)
- 💧 water in ml
- Macros: Protein (blue) · Carbs (purple) · Fat (orange) in grams
- Exercise chips: coloured by category, showing exercise name and duration

---

## 12. Nutrition Goals

Set your personal targets in the Nutrition Goals screen (accessible from the dashboard or profile).

### What you can set
- Daily calories (kcal)
- Protein (g)
- Carbohydrates (g)
- Fat (g)
- Fibre (g)
- Sugar (g)
- Salt (g)
- Water (ml)

### How goals are calculated
If you fill in your **body profile** (height, weight, age, sex, activity level, goal), NovaQI can suggest personalised targets automatically. You can always override them manually.

### Body profile
- Sex
- Date of birth
- Height (cm)
- Weight (kg)
- Activity level: Sedentary · Lightly active · Moderately active · Very active · Extremely active
- Goal: Lose weight · Maintain · Gain muscle

---

## 13. Referral Programme

Share NovaQI with friends and earn bonus scans.

### How it works
1. Go to your Profile → "Refer Friends"
2. Share your **unique 6-character code** (or tap "Share" to send it automatically)
3. Your friend registers using your code
4. **Your friend gets:** +10 bonus scans immediately
5. **You get:** +30 bonus scans when 3 of your referred friends make their first scan

The bonus is cumulative — every time a new group of 3 friends qualifies, you earn another +30 scans. No lifetime cap. Bonus scans expire after 30 days (rolling — each new batch extends the expiry).

### Progress bar
The ReferralScreen shows:
- Your referral code (copyable)
- Number of friends who have registered with your code
- Number of friends who have qualified (made their first scan)
- Progress towards your next +30 scan reward
- Total bonus scans earned

Bonus scans are consumed before your regular monthly plan scans.

---

## 14. Push Notifications

NovaQI sends smart push notifications to help you stay on track (native app only — iOS and Android).

### Hydration reminders
Three times a day, if you haven't hit your water goal:
- 09:00: "Good morning — time to hydrate!"
- 13:00: "Midday check — how's your water intake?"
- 17:00: "Afternoon boost — drink some water"

Messages are personalised with your current intake vs goal.

### Food diary reminders
Three prompts a day to log what you've eaten:
- 08:30: breakfast log reminder
- 11:50: late morning / snack reminder
- 19:00: dinner reminder

Tapping a food diary notification opens the Add Food modal directly.

### Notifications are opt-in
You control notification permissions from your device settings. NovaQI never sends promotional spam — only in-app utility reminders.

---

## 15. Profile & Settings

Access via the Profile tab (bottom navigation).

### Personal information
- Name and bio
- Avatar (emoji or photo)
- Email address (editable; if Apple relay email, you can update to your real email)
- Body profile: sex, date of birth, height, weight, activity level, goal

### Diet & sensitivities
- Change your diet type at any time
- Update your food sensitivities (22 options)
- Halal users can change strictness level (Cautious / Moderate)

### Subscription management
- View your current plan (Free / Starter / Premium)
- Upgrade to a higher plan (opens paywall)
- Manage or cancel subscription:
  - iOS: links to Apple subscription management
  - Android: links to Google Play subscription management
- Restore purchases (for reinstalls)

### Usage stats
- Monthly scan count vs plan limit
- Daily streak (number of consecutive days you've scanned or logged food)

### Legal & support
- Privacy Policy
- Terms of Use
- Imprint
- Support (contact form, GDPR compliant)

### Account
- Delete account (removes all data permanently)

---

## 16. Home Screen Overview

The home screen is your daily at-a-glance summary.

### Header (top)
- NovaQI logo (left)
- Top-right badge: 🔥{streak} days · {monthly scans} scans

### Nutrition summary card
- Calories consumed · Calories remaining (or "net" if exercise has been logged)
- 🔥 burned pill (tappable → opens nutrition dashboard)
- Water intake · Water remaining
- Progress ring / bar for today's calories

### Quick actions
- **Scan** — opens camera for barcode or ingredient photo
- **Add Food** — opens nutrition dashboard with Add Food modal
- **Water** — opens water picker popup
- **Plate** — opens plate analysis camera

### Recent scans
- Last products scanned (with verdict colour indicator)

### Recent plates
- Last plate analyses performed (thumbnail + item count)

---

## 17. Food Search — How It Works

When you search for a food in the Add Food modal, NovaQI checks 4 sources simultaneously:

1. **Your personal history** — foods you've logged before (highest priority)
2. **Community averages** — average macros from all NovaQI users who've logged the same food
3. **Scanned products** — products already in the NovaQI database from barcode scans, with full nutritional data
4. **Open Food Facts** — the global open food database (over 3 million products)
5. **Claude AI (fallback)** — if no results found, Claude estimates nutritional values for generic foods (e.g. "almonds", "oat milk", "chicken breast")

**AI enrichment:** if a product is found by name but has no nutritional data, Claude fills in the missing values automatically.

**Smart language support:** searching in Portuguese, German, French, Italian, or Spanish works correctly — the search expands to the English equivalent automatically when needed.

---

## 18. Security & Privacy

- All data is stored securely on European servers (VPS in Germany)
- Passwords are hashed with bcrypt — plain passwords are never stored
- JWTs are used for session authentication
- No food photos or ingredient data are sent to Meta or Google — only anonymised event names (scan, subscribe, etc.) for ad measurement
- ATT (App Tracking Transparency) prompt appears before any tracking begins on iOS
- GDPR-compliant support form and privacy policy at novaqi.app/legal/privacy

---

## 19. Key Screens — Quick Reference

| Screen | How to reach | What it does |
|---|---|---|
| Home | Tab bar | Daily summary, quick actions, recent history |
| Scan | Tap scan button | Camera for barcode or ingredients |
| Result | After scan | Verdict, ingredients, concerns, "I Will Eat It" |
| Plate Analysis | Home → "📷 Analyse plate" | Photo of meal → nutritional breakdown |
| Nutrition Dashboard | Tab bar or "Add Food" | Full daily nutrition tracking |
| Add Food modal | Dashboard → "+" | Search and log any food |
| Water modal | Home → water card | Quick-log water with presets |
| Exercise Log | Dashboard → exercise section | Log workouts, see today's activity |
| Nutrition Report | Dashboard → report button | Weekly/monthly nutrition history |
| Nutrition Goals | Dashboard or Profile | Set daily targets |
| Profile | Tab bar | Settings, subscription, body profile |
| Paywall | Profile → upgrade | Choose a subscription plan |
| Referral | Profile → "Refer Friends" | Share your code, earn bonus scans |
| Edit Personal | Profile → edit | Name, bio, avatar, body profile |

---

## 20. Key Differentiators vs Competitors

| Feature | NovaQI | Generic nutrition apps |
|---|---|---|
| Halal ingredient engine | ✅ Dedicated, on-device | ❌ Not available |
| Barcode + ingredient text scan | ✅ Both | Usually barcode only |
| Plate photo analysis | ✅ AI-powered | Rare, usually basic |
| AI food search fallback | ✅ Claude AI | ❌ Not available |
| Smart portion sizing | ✅ "2 slices of bread" = 60g | ❌ Always 100g |
| Exercise calorie offset | ✅ Integrated in dashboard | ✅ Common |
| Multi-diet support | ✅ Vegan, halal, gluten-free, etc. | Partial |
| Referral programme | ✅ Earn bonus scans | Rare |
| Privacy-first (no photo upload to 3rd parties) | ✅ | Varies |

---

## 21. Sample Ad Scripts & Video Hooks

### Hook 1 — Halal
> *"Is this product really halal? Stop guessing. Open NovaQI, scan the barcode — done. Every ingredient checked in 3 seconds."*

### Hook 2 — Fitness
> *"You burned 400 calories running. But that pastry you grabbed? 380 calories in 3 bites. Track both with NovaQI."*

### Hook 3 — Vegan
> *"E-471. Casein. Whey. Hidden animal ingredients. NovaQI finds them all — so you never have to read a label twice."*

### Hook 4 — Plate analysis
> *"Take a photo of your lunch. NovaQI breaks down every item — calories, protein, fat, carbs. Log it all in one tap."*

### Hook 5 — Simplicity
> *"Scan. Know. Eat. NovaQI takes 3 seconds to tell you if a product is safe for your diet. Free to try — no credit card."*

---

## 22. Frequently Asked Questions

**Q: Does the app work without internet?**
A: Barcode lookups from cached products work offline. New product analyses and AI food search require an internet connection.

**Q: What languages does NovaQI support?**
A: Portuguese, English, German, French, Italian, and Spanish. The app language follows your device language and can be overridden in settings.

**Q: Is my diet data shared with anyone?**
A: No. Your diet type, allergies, and food logs are stored on NovaQI's servers and are never shared with Meta, Google, or any third party.

**Q: Can I use the app without creating an account?**
A: No. An account is required to save your profile, scan history, and nutrition data.

**Q: What happens when I reach my scan limit?**
A: You'll see a message that your monthly limit has been reached. You can upgrade your plan to get more scans, or wait until the next month.

**Q: Can I earn more scans without paying?**
A: Yes — refer friends using your unique code. You earn +30 bonus scans for every 3 friends who make their first scan.

**Q: Does the halal engine cover E-codes?**
A: Yes. The halal rules database covers common E-codes (emulsifiers, stabilisers, colorants, etc.) and flags their halal status or marks them as mashbooh (doubtful) when the source is ambiguous.

**Q: Is the subscription auto-renewing?**
A: Yes. Subscriptions renew automatically. You can cancel at any time in your Apple or Google subscription settings — you keep access until the end of the paid period.

---

*NovaQI — Know what you eat.*
