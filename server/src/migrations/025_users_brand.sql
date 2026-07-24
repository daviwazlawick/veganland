alter table users
  add column if not exists brand text not null default 'novaqi';
create index if not exists idx_users_brand on users(brand);
