-- Store marketing attribution + platform on each user row so the admin
-- panel can answer "which campaign brought this user in?" and "what OS
-- are they on?" without having to correlate anonymous link_clicks
-- against signup timestamps.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS platform_os  text; -- 'ios' | 'android' | 'web'

CREATE INDEX IF NOT EXISTS users_utm_source_idx   ON users (utm_source)   WHERE utm_source   IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_utm_campaign_idx ON users (utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_platform_os_idx  ON users (platform_os) WHERE platform_os  IS NOT NULL;
