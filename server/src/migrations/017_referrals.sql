-- Referral programme
-- A's reward: 1 month of Starter when 3 referrals qualify (referred user does 1 scan + email confirmed)
-- B's reward: 1 month of Starter immediately on registering with a valid code

alter table users
  add column if not exists referral_code text,
  add column if not exists referred_by_user_id integer references users(id) on delete set null,
  add column if not exists promotional_starter_until timestamptz,
  add column if not exists referral_credit_count int not null default 0,
  add column if not exists referral_total_rewarded int not null default 0;

create unique index if not exists users_referral_code_unique on users(referral_code) where referral_code is not null;

create table if not exists referral_events (
  id uuid primary key default gen_random_uuid(),
  referrer_id integer not null references users(id) on delete cascade,
  referred_id integer not null references users(id) on delete cascade,
  status text not null check (status in ('pending','qualified')),
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id),
  check (referrer_id != referred_id)
);

create index if not exists referral_events_referrer_idx on referral_events(referrer_id);
create index if not exists referral_events_referred_idx on referral_events(referred_id);
