-- App survey: one open-text response per user, fired after the 2nd scan.
CREATE TABLE IF NOT EXISTS app_survey (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  message    TEXT NOT NULL,
  diet_id    TEXT,
  language   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
