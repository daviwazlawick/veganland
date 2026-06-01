create table if not exists off_products (
  code         text primary key,
  product_name text,
  brands       text,
  ingredients_text    text,
  ingredients_text_en text,
  ingredients_text_pt text,
  ingredients_text_es text,
  ingredients_text_de text,
  ingredients_text_fr text,
  ingredients_text_it text
);

create index if not exists off_products_name_idx on off_products (lower(product_name));
