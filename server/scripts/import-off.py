#!/usr/bin/env python3
"""
Download and import the OpenFoodFacts product dump directly into the products table.
- New OFF products are inserted.
- Existing OFF products (source = 'open_food_facts') are updated with fresh data.
- Products added via scan (any other source) are NEVER touched.
Usage: python3 import-off.py [--skip-download]
"""

import csv
import gzip
import os
import sys
import urllib.request
import psycopg2

csv.field_size_limit(10 * 1024 * 1024)

DUMP_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
DUMP_PATH = "/opt/veganland/data/off-products.csv.gz"
BATCH_SIZE = 5000


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
        print(f"\r  {pct}% ({count * block_size // 1024 // 1024} MB)", end="", flush=True)

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


def import_dump(conn):
    cur = conn.cursor()

    # Upsert into products:
    # - INSERT new OFF products
    # - UPDATE existing OFF products (source = 'open_food_facts') with fresh data
    # - DO NOTHING for products added via scan (different source)
    upsert_sql = """
        INSERT INTO products (identity_key, barcode, brand, product_name, ingredients_text, source)
        VALUES (%s, %s, %s, %s, %s, 'open_food_facts')
        ON CONFLICT (identity_key) DO UPDATE SET
            brand           = EXCLUDED.brand,
            product_name    = EXCLUDED.product_name,
            ingredients_text = EXCLUDED.ingredients_text,
            updated_at      = now()
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

            ingredients = best_ingredients(row)
            if not ingredients:
                continue

            def col(key):
                v = (row.get(key) or "").strip()
                return v if v else None

            batch.append((
                f"barcode:{code}",
                code,
                col("brands"),
                col("product_name"),
                ingredients,
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
