-- Marketing attribution: every hit on /get or /r/:code that carries any
-- utm_* query param is logged here. Combined with users.created_at we can
-- attribute cohorts once the Play Install Referrer / iOS SKAdNetwork
-- surfaces the utm_source in analytics. No cookie, no PII — just the raw
-- click.

CREATE TABLE IF NOT EXISTS link_clicks (
  id                 serial PRIMARY KEY,
  utm_source         text,
  utm_medium         text,
  utm_campaign       text,
  path               text NOT NULL,
  platform_detected  text,
  user_agent         text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS link_clicks_source_created_idx
  ON link_clicks (utm_source, created_at DESC)
  WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS link_clicks_campaign_created_idx
  ON link_clicks (utm_campaign, created_at DESC)
  WHERE utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS link_clicks_created_idx
  ON link_clicks (created_at DESC);
