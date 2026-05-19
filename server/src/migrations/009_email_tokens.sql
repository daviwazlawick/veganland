alter table users
  add column if not exists email_confirmed boolean not null default false,
  add column if not exists email_confirmation_token text,
  add column if not exists email_confirmation_sent_at timestamptz;

create table if not exists password_reset_tokens (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_prt_token on password_reset_tokens(token);
