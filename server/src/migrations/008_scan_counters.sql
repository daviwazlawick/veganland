create table if not exists scan_counters (
  user_id integer not null references users(id) on delete cascade,
  month   text    not null,
  count   integer not null default 0,
  primary key (user_id, month)
);
