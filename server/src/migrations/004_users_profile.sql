alter table users
  add column if not exists name text,
  add column if not exists birth_date date,
  add column if not exists country text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists updated_at timestamptz not null default now();
