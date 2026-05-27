alter table users
  add column if not exists disclaimer_accepted_at timestamptz,
  add column if not exists disclaimer_version text;
