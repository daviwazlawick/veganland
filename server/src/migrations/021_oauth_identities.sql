-- OAuth (Sign in with Apple / Google) identity fields on users
-- password_hash becomes nullable so users created via OAuth don't need one.
alter table users alter column password_hash drop not null;

alter table users add column if not exists apple_sub text;
alter table users add column if not exists google_sub text;
alter table users add column if not exists oauth_provider text;

create unique index if not exists users_apple_sub_idx on users (apple_sub) where apple_sub is not null;
create unique index if not exists users_google_sub_idx on users (google_sub) where google_sub is not null;
