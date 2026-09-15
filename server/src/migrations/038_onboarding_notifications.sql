-- Daily reminders for users who never scanned / never set up a body profile.
-- One row per user per campaign per local day — prevents duplicate sends.
CREATE TABLE IF NOT EXISTS onboarding_notification_log (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  campaign    TEXT    NOT NULL, -- 'first_scan_reminder' | 'body_profile_reminder'
  local_date  DATE    NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_notif_unique
  ON onboarding_notification_log (user_id, campaign, local_date);
