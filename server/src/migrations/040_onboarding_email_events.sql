-- Open/click tracking for the onboarding email nudges. One row per
-- (user, campaign, stage, event_type) — first open and first click only,
-- repeats don't inflate the count.
CREATE TABLE IF NOT EXISTS onboarding_email_events (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign    TEXT    NOT NULL,
  stage       INTEGER NOT NULL,
  event_type  TEXT    NOT NULL CHECK (event_type IN ('open', 'click')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_email_events_unique
  ON onboarding_email_events (user_id, campaign, stage, event_type);
