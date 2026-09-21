-- Decaying-cadence email nudges (day 1, 3, 7, 14 since eligible, then stop)
-- for users who never scanned or never set up a body profile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_email_opt_out BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS onboarding_email_log (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign    TEXT    NOT NULL, -- 'first_scan' | 'body_profile'
  stage       INTEGER NOT NULL, -- 1..4
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_email_unique
  ON onboarding_email_log (user_id, campaign, stage);
