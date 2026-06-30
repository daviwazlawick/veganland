-- Push notification tokens (Expo Push Service)
-- One row per device. Same user may have multiple devices.
-- Token is unique — re-registering refreshes user/locale/last_seen.

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id integer references users(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios','android','web')),
  locale text,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists push_tokens_user_idx on push_tokens(user_id);
create index if not exists push_tokens_last_seen_idx on push_tokens(last_seen_at);
