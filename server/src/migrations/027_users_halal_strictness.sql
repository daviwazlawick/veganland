-- Halal experience: per-user strictness preference. NULL is treated as
-- 'cautious' by the client (see src/constants/halalRules.js). Only halal
-- users see the setting; other diets never write it. Column is nullable
-- and independent from diet_id so a user can flip diets without losing
-- the preference.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS halal_strictness text;
