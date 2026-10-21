-- Per-user push send log for the activation/reactivation funnels.
-- One row per message delivered to a user, so we can:
--   1. decide what the next step is without re-sending
--   2. compute funnel_started_at (= min(sent_at) per user+track)
--   3. join against push_clicks to measure CTR per step/cycle

CREATE TABLE IF NOT EXISTS reactivation_sends (
  id            bigserial PRIMARY KEY,
  user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track         text NOT NULL,            -- 'activation' | 'reactivation'
  cycle         integer NOT NULL,         -- 1..3 for activation; 1 for reactivation (initially)
  step          integer NOT NULL,         -- 1..5
  broadcast_id  uuid REFERENCES push_broadcasts(id) ON DELETE SET NULL,
  locale_sent   text,                     -- actual message locale used (en/pt/es/fr/de/it)
  sent_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, track, cycle, step)
);

CREATE INDEX IF NOT EXISTS reactivation_sends_user_track_idx
  ON reactivation_sends (user_id, track, cycle DESC, step DESC);

CREATE INDEX IF NOT EXISTS reactivation_sends_sent_at_idx
  ON reactivation_sends (sent_at DESC);
