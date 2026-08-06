-- Nutrition tracking: body profile, daily goals, consumption log, weight log

CREATE TABLE IF NOT EXISTS user_body_profile (
  user_id        integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sex            text,          -- 'male' | 'female' | 'other'
  birth_date     date,
  height_cm      numeric(5,1),
  weight_kg      numeric(5,1),
  activity_level text,          -- 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
  goal           text,          -- 'lose' | 'maintain' | 'gain'
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_nutrition_goals (
  user_id        integer PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  calories_kcal  numeric(7,1),
  protein_g      numeric(6,1),
  fat_g          numeric(6,1),
  carbs_g        numeric(6,1),
  fiber_g        numeric(5,1),
  sugar_g        numeric(5,1),
  salt_g         numeric(5,2),
  water_ml       integer,
  is_custom      boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consumption_log (
  id             serial PRIMARY KEY,
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name   text,
  barcode        text,
  source         text NOT NULL DEFAULT 'scan',  -- 'scan' | 'plate_photo' | 'manual'
  grams          numeric(7,1),
  meal_type      text,   -- 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories_kcal  numeric(7,1),
  protein_g      numeric(6,1),
  fat_g          numeric(6,1),
  carbs_g        numeric(6,1),
  fiber_g        numeric(5,1),
  sugar_g        numeric(5,1),
  salt_g         numeric(5,2),
  water_ml       integer,
  consumed_at    timestamptz NOT NULL DEFAULT now(),
  notes          text
);

CREATE TABLE IF NOT EXISTS weight_log (
  id             serial PRIMARY KEY,
  user_id        integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg      numeric(5,1) NOT NULL,
  recorded_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consumption_log_user_date_idx
  ON consumption_log (user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS weight_log_user_date_idx
  ON weight_log (user_id, recorded_at DESC);
