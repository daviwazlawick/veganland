-- Diet-based push filtering. Admin panel can now select one or more
-- diets when broadcasting; the array is persisted so the history row
-- shows which diets were targeted.

ALTER TABLE push_broadcasts
  ADD COLUMN IF NOT EXISTS diets_filter text[];
