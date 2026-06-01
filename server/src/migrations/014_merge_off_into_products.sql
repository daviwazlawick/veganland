-- Merge off_products into products.
-- ON CONFLICT DO NOTHING preserves any product already added via scan.
insert into products (identity_key, barcode, brand, product_name, ingredients_text, source)
select
  'barcode:' || code,
  code,
  brands,
  product_name,
  coalesce(
    nullif(trim(ingredients_text), ''),
    nullif(trim(ingredients_text_en), ''),
    nullif(trim(ingredients_text_pt), ''),
    nullif(trim(ingredients_text_de), ''),
    nullif(trim(ingredients_text_fr), ''),
    nullif(trim(ingredients_text_it), ''),
    nullif(trim(ingredients_text_es), '')
  ),
  'open_food_facts'
from off_products
where code is not null
on conflict (identity_key) do nothing;
