alter table scan_events
  add column if not exists user_id integer references users(id) on delete set null,
  add column if not exists title text;
