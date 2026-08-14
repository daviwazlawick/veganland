CREATE TABLE IF NOT EXISTS body_measurements (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  waist_cm     NUMERIC(5,1),
  hips_cm      NUMERIC(5,1),
  chest_cm     NUMERIC(5,1),
  arm_cm       NUMERIC(5,1),
  thigh_cm     NUMERIC(5,1),
  neck_cm      NUMERIC(5,1),
  body_fat_pct NUMERIC(4,1),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_body_measurements_user ON body_measurements(user_id, recorded_at DESC);
