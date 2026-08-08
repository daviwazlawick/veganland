-- Accent-insensitive + typo-tolerant food search: unaccent() for ILIKE
-- normalization, pg_trgm for trigram GIN indexes (also enables fuzzy
-- similarity() ranking later if needed).
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS products_name_trgm_idx
  ON products USING gin (product_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_brand_trgm_idx
  ON products USING gin (brand gin_trgm_ops);

CREATE INDEX IF NOT EXISTS consumption_log_name_trgm_idx
  ON consumption_log USING gin (product_name gin_trgm_ops);
