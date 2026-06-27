#!/usr/bin/env python3
"""
Download and import the OpenFoodFacts product dump into the products table.

- New OFF products are INSERTED.
- Existing OFF products (source = 'open_food_facts') are UPDATED with fresh data.
- Products added via scan (any other source) are NEVER touched — the upsert's
  WHERE clause skips them entirely.

Schema strategy (hybrid):
- Hot-path columns (allergens_tags, traces_tags, categories_tags, labels_tags,
  nutriscore_grade, nova_group, image_url, quantity, serving_size) are promoted
  to native columns for indexable queries.
- The FULL OFF row (all 211 columns) is stored in the `raw` jsonb column —
  any non-promoted field is still accessible as `raw->>'field_name'`.

Usage: python3 import-off.py [--skip-download]
"""

import csv
import gzip
import json
import os
import sys
import urllib.request
import psycopg2
from psycopg2.extras import Json

csv.field_size_limit(10 * 1024 * 1024)

DUMP_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
DUMP_PATH = "/opt/veganland/data/off-products.csv.gz"
BATCH_SIZE = 2000


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    env = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip("'\"")
    return env


def download_dump():
    print(f"Downloading OFF dump to {DUMP_PATH} ...")
    os.makedirs(os.path.dirname(DUMP_PATH), exist_ok=True)

    def progress(count, block_size, total_size):
        pct = int(count * block_size * 100 / total_size) if total_size > 0 else 0
        mb = count * block_size // 1024 // 1024
        print(f"\r  {pct}% ({mb} MB)", end="", flush=True)

    urllib.request.urlretrieve(DUMP_URL, DUMP_PATH, reporthook=progress)
    print()
    print("Download complete.")


def best_ingredients(row):
    for key in ["ingredients_text", "ingredients_text_en", "ingredients_text_pt",
                "ingredients_text_de", "ingredients_text_fr", "ingredients_text_it",
                "ingredients_text_es"]:
        v = (row.get(key) or "").strip()
        if v:
            return v
    return None


def parse_tags(value):
    """OFF stores tag fields as comma-separated values like 'en:milk,en:gluten'.
    Returns a clean list with empty entries removed."""
    if not value:
        return []
    return [t.strip() for t in value.split(",") if t.strip()]


def parse_int(value):
    if not value:
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def clean_row(row):
    """Strip empty strings to None and drop empties so raw JSONB stays compact.
    csv.DictReader collects extra fields from malformed rows into a list under
    key=None — filter those out to avoid AttributeError on .strip()."""
    return {
        k: v.strip()
        for k, v in row.items()
        if k and isinstance(v, str) and v.strip()
    }


def import_dump(conn):
    cur = conn.cursor()

    # Upsert into products:
    # - INSERT new OFF products
    # - UPDATE existing OFF products (source = 'open_food_facts')
    # - DO NOTHING for products added via scan (source != 'open_food_facts')
    upsert_sql = """
        INSERT INTO products (
            identity_key, barcode, brand, product_name, ingredients_text, source,
            allergens_tags, traces_tags, categories_tags, labels_tags,
            nutriscore_grade, nova_group, image_url, quantity, serving_size,
            raw
        )
        VALUES (
            %s, %s, %s, %s, %s, 'open_food_facts',
            %s, %s, %s, %s,
            %s, %s, %s, %s, %s,
            %s
        )
        ON CONFLICT (identity_key) DO UPDATE SET
            brand             = EXCLUDED.brand,
            product_name      = EXCLUDED.product_name,
            ingredients_text  = CASE
                WHEN EXCLUDED.ingredients_text != '' THEN EXCLUDED.ingredients_text
                WHEN products.ingredients_text != '' THEN products.ingredients_text
                ELSE '' END,
            allergens_tags    = EXCLUDED.allergens_tags,
            traces_tags       = EXCLUDED.traces_tags,
            categories_tags   = EXCLUDED.categories_tags,
            labels_tags       = EXCLUDED.labels_tags,
            nutriscore_grade  = EXCLUDED.nutriscore_grade,
            nova_group        = EXCLUDED.nova_group,
            image_url         = EXCLUDED.image_url,
            quantity          = EXCLUDED.quantity,
            serving_size      = EXCLUDED.serving_size,
            raw               = EXCLUDED.raw,
            updated_at        = now()
        WHERE products.source = 'open_food_facts'
    """

    print(f"Importing from {DUMP_PATH} into products table ...")
    total = 0
    batch = []

    with gzip.open(DUMP_PATH, "rt", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            code = (row.get("code") or "").strip() or None
            if not code:
                continue

            def col(key):
                v = (row.get(key) or "").strip()
                return v if v else None

            product_name = col("product_name")
            brand = col("brands")
            ingredients = best_ingredients(row)

            # Skip rows with no identifying info at all
            if not product_name and not brand and not ingredients:
                continue

            batch.append((
                f"barcode:{code}",
                code,
                brand,
                product_name,
                ingredients or '',
                parse_tags(row.get("allergens")),      # 'en:milk,en:gluten' → ['en:milk','en:gluten']
                parse_tags(row.get("traces_tags")),
                parse_tags(row.get("categories_tags")),
                parse_tags(row.get("labels_tags")),
                col("nutriscore_grade"),
                parse_int(row.get("nova_group")),
                col("image_url"),
                col("quantity"),
                col("serving_size"),
                Json(clean_row(row)),                  # full OFF row as JSONB
            ))

            if len(batch) >= BATCH_SIZE:
                cur.executemany(upsert_sql, batch)
                conn.commit()
                total += len(batch)
                batch = []
                print(f"\r  {total:,} rows processed", end="", flush=True)

    if batch:
        cur.executemany(upsert_sql, batch)
        conn.commit()
        total += len(batch)

    print(f"\nDone. {total:,} OFF products merged into products table.")
    cur.close()


def main():
    skip_download = "--skip-download" in sys.argv

    env = load_env()
    db_url = os.environ.get("DATABASE_URL") or env.get("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    if not skip_download or not os.path.exists(DUMP_PATH):
        download_dump()
    else:
        print(f"Skipping download, using existing {DUMP_PATH}")

    conn = psycopg2.connect(db_url)
    try:
        import_dump(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
