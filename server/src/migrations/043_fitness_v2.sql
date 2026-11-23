-- NovaQI V2: perfil de fitness do onboarding, plano de dieta + treino gerado pela IA
-- e o registro de carga de cada série.

create table if not exists fitness_profile (
  user_id    integer primary key references users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists fitness_plan (
  id         serial primary key,
  user_id    integer not null references users(id) on delete cascade,
  targets    jsonb not null,
  diet       jsonb,
  workout    jsonb,
  created_at timestamptz not null default now()
);
create index if not exists fitness_plan_user_idx on fitness_plan (user_id, created_at desc);

create table if not exists workout_set_log (
  id            serial primary key,
  user_id       integer not null references users(id) on delete cascade,
  local_date    date not null,
  day_key       text,
  exercise_key  text not null,
  exercise_name text,
  set_index     integer not null,
  weight_kg     numeric(6,2),
  reps          integer,
  logged_at     timestamptz not null default now(),
  unique (user_id, local_date, exercise_key, set_index)
);
create index if not exists workout_set_log_user_idx on workout_set_log (user_id, exercise_key, local_date desc);
