-- Onboarding feedback + generic scan feedback (thumbs up/down).
--
-- New signups (user_type = NULL) get one guided scan before hitting the
-- paywall. After the scan they rate the result — the rating is stored here
-- and, for thumbs-down during onboarding, an email is dispatched to the
-- brand's contact address so we can iterate on false positives.
--
-- Table is designed to also hold feedback from paying users in phase 2
-- (thumbs on every result). No user_type filter at the SQL level — the
-- server decides who can post.

CREATE TABLE IF NOT EXISTS scan_feedback (
  id           serial PRIMARY KEY,
  scan_id      uuid REFERENCES scan_events(id) ON DELETE CASCADE,
  user_id      integer REFERENCES users(id) ON DELETE CASCADE,
  rating       text NOT NULL CHECK (rating IN ('up', 'down')),
  comment      text,
  is_onboarding boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scan_feedback_user_created_idx
  ON scan_feedback (user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS scan_feedback_scan_user_unique_idx
  ON scan_feedback (scan_id, user_id);

-- One-time free scan flag for null-tier signups. Flips true after the
-- first successful scan; combined with SCAN_LIMITS logic in db.js.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_scan_used boolean NOT NULL DEFAULT false;
