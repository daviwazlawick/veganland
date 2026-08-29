-- Crowdsource product data via user photos. When a barcode scan misses both
-- the local DB (OFF snapshot) and the OFF web API, users contribute photos of
-- the label and ingredients so the next scanner of the same barcode gets a hit
-- without repeating the whole flow.
--
-- needs_ingredients=true means we have identity (barcode + name) from a label
-- photo but no ingredients yet — the next scanner will be asked to photograph
-- the ingredients label to complete the record.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS label_photo_path       text,
  ADD COLUMN IF NOT EXISTS ingredients_photo_path text,
  ADD COLUMN IF NOT EXISTS barcode_photo_path     text,
  ADD COLUMN IF NOT EXISTS contributor_user_id    integer REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS needs_ingredients      boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_needs_ingredients_idx
  ON products (needs_ingredients) WHERE needs_ingredients = true;

CREATE INDEX IF NOT EXISTS products_contributor_idx
  ON products (contributor_user_id) WHERE contributor_user_id IS NOT NULL;
