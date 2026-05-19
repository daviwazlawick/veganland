alter table scan_events
  add column if not exists result jsonb;
