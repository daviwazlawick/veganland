-- History of push broadcasts sent from the admin panel.
-- One row per POST /admin/push/broadcast call.

create table if not exists push_broadcasts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  locale text,
  user_type text,
  route text,
  total_count integer not null default 0,
  ok_count integer not null default 0,
  error_count integer not null default 0,
  invalid_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists push_broadcasts_created_idx on push_broadcasts(created_at desc);
