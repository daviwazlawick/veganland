-- Em produção a tabela foi criada à mão; aqui ela nasce por migração.
create table if not exists exercise_log (
  id              serial primary key,
  user_id         integer not null references users(id) on delete cascade,
  exercise_id     text not null,
  exercise_name   text,
  duration_min    numeric(6,1) not null,
  calories_burned numeric(7,1) not null,
  local_date      date not null,
  logged_at       timestamptz not null default now()
);
create index if not exists exercise_log_user_date_idx on exercise_log (user_id, local_date);

create table if not exists scheduled_notification_taps (
  id         serial primary key,
  user_id    integer references users(id) on delete cascade,
  slot       text not null,
  tapped_at  timestamptz not null default now()
);
