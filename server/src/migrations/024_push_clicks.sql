-- Push click tracking. Each row is a single user tapping a broadcast
-- (or being deep-linked from it). Combined with push_broadcasts.total_count
-- + ok_count this gives us an open rate. JOIN scan_events on user_id
-- inside a time window for attribution.

CREATE TABLE IF NOT EXISTS push_clicks (
  id            serial PRIMARY KEY,
  broadcast_id  uuid NOT NULL REFERENCES push_broadcasts(id) ON DELETE CASCADE,
  user_id       integer REFERENCES users(id) ON DELETE SET NULL,
  clicked_at    timestamptz NOT NULL DEFAULT now()
);

-- One row per (broadcast, user) — repeated taps by the same user on the
-- same broadcast collapse to a single click for open-rate math.
CREATE UNIQUE INDEX IF NOT EXISTS push_clicks_broadcast_user_unique
  ON push_clicks (broadcast_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS push_clicks_broadcast_idx
  ON push_clicks (broadcast_id);
