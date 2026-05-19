alter table users
  add column if not exists diet_id text,
  add column if not exists allergy_ids jsonb not null default '[]'::jsonb;
