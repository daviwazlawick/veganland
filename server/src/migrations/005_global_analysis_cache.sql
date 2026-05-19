-- Remove analyses in old profile-specific format (incompatible with new neutral format)
delete from product_analyses;

-- profile_key is no longer part of the cache key
alter table product_analyses
  alter column profile_key drop not null;

-- Replace unique constraint: (product_id, profile_key, language) → (product_id, language)
alter table product_analyses
  drop constraint product_analyses_product_id_profile_key_language_key;

alter table product_analyses
  add constraint product_analyses_product_id_language_key
  unique (product_id, language);
