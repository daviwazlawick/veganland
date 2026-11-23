-- Colunas que a análise corporal grava e que em produção entraram sem migração.
alter table body_measurements
  add column if not exists forearm_cm numeric(5,1),
  add column if not exists calf_cm numeric(5,1),
  add column if not exists bmi numeric(5,1),
  add column if not exists lean_mass_index numeric(6,2),
  add column if not exists fat_mass_index numeric(6,2),
  add column if not exists waist_to_height numeric(6,3),
  add column if not exists waist_to_hip numeric(6,3),
  add column if not exists conicity_index numeric(6,3),
  add column if not exists fat_mass_kg numeric(6,1),
  add column if not exists lean_mass_kg numeric(6,1),
  add column if not exists body_water_pct numeric(5,1),
  add column if not exists ree_kcal numeric(7,1),
  add column if not exists score numeric(6,1),
  add column if not exists confidence jsonb,
  add column if not exists warnings jsonb,
  add column if not exists scale_px_per_cm numeric(8,3),
  add column if not exists source text;
