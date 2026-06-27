-- Add OpenFoodFacts hot-path columns to products.
-- The full OFF row (all 211 columns) is stored in the existing raw jsonb column,
-- so anything not promoted here is still queryable as raw->>'field_name'.
alter table products
  add column if not exists allergens_tags  text[]   not null default '{}',
  add column if not exists traces_tags     text[]   not null default '{}',
  add column if not exists categories_tags text[]   not null default '{}',
  add column if not exists labels_tags     text[]   not null default '{}',
  add column if not exists nutriscore_grade text,
  add column if not exists nova_group       smallint,
  add column if not exists image_url        text,
  add column if not exists quantity         text,
  add column if not exists serving_size     text;

create index if not exists products_allergens_tags_idx  on products using gin (allergens_tags);
create index if not exists products_traces_tags_idx     on products using gin (traces_tags);
create index if not exists products_categories_tags_idx on products using gin (categories_tags);
create index if not exists products_labels_tags_idx     on products using gin (labels_tags);
