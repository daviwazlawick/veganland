create extension if not exists pgcrypto;

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null unique,
  barcode text,
  brand text,
  product_name text,
  lookup_query text,
  ingredients_text text not null,
  source text not null,
  source_url text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_barcode_unique
  on products (barcode)
  where barcode is not null;

create table if not exists product_analyses (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  profile_key text not null,
  language text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, profile_key, language)
);

create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists scan_events (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete set null,
  user_id integer references users(id) on delete set null,
  profile_key text,
  language text,
  status text,
  source text,
  title text,
  created_at timestamptz not null default now()
);
