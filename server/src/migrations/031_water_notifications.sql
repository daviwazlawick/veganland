-- Push token timezone for scheduling local-hour notifications
ALTER TABLE push_tokens ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Track water reminder notifications sent per user per slot per day
-- Prevents duplicate sends within the same slot
CREATE TABLE IF NOT EXISTS water_notification_log (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slot          TEXT    NOT NULL, -- 'morning' | 'midday' | 'afternoon'
  local_date    DATE    NOT NULL,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  water_ml_at_send INTEGER
);

CREATE INDEX IF NOT EXISTS idx_water_notif_lookup
  ON water_notification_log (user_id, local_date, slot);
