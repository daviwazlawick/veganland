-- Product funnel events. Generic append-only log used to reconstruct the
-- onboarding -> scan -> paywall funnel that currently has no visibility.
-- user_id is nullable so we can also log events from anonymous sessions
-- (e.g. paywall shown before signup). metadata is JSONB so we can attach
-- context (scan source, error code, plan selected) without new columns
-- for each event type. brand lets us split VeganLand vs NovaQI.

CREATE TABLE IF NOT EXISTS funnel_events (
  id          bigserial PRIMARY KEY,
  user_id     integer REFERENCES users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,
  brand       text,
  platform    text,
  app_version text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS funnel_events_type_created_idx
  ON funnel_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS funnel_events_user_created_idx
  ON funnel_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
