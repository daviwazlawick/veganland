#!/usr/bin/env python3
"""
Download and import the OpenFoodFacts product dump into the local off_products table.
Usage: python3 import-off.py [--skip-download]
"""

import csv
import gzip
import os
import sys
import urllib.request
import psycopg2

csv.field_size_limit(10 * 1024 * 1024)  # 10 MB — OFF has very long ingredient lists

DUMP_URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
DUMP_PATH = "/opt/veganland/data/off-products.csv.gz"
BATCH_SIZE = 5000

COLUMNS = [
    "code",
    "product_name",
    "brands",
    "ingredients_text",
    "ingredients_text_en",
    "ingredients_text_pt",
    "ingredients_text_es",
    "ingredients_text_de",
    "ingredients_text_fr",
    "ingredients_text_it",
]


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


def import_dump(conn):
    cur = conn.cursor()

    print("Truncating off_products ...")
    cur.execute("TRUNCATE TABLE off_products")
    conn.commit()

    placeholders = ", ".join(["%s"] * len(COLUMNS))
    upsert_sql = f"""
        INSERT INTO off_products ({", ".join(COLUMNS)})
        VALUES ({placeholders})
        ON CONFLICT (code) DO UPDATE SET
            {", ".join(f"{c} = EXCLUDED.{c}" for c in COLUMNS if c != "code")}
    """

    print(f"Importing from {DUMP_PATH} ...")
    total = 0
    batch = []

    with gzip.open(DUMP_PATH, "rt", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            code = (row.get("code") or "").strip().lstrip("0") or None
            if not code:
                continue

            # At least one ingredient text must exist to be useful
            ingredients = (
                row.get("ingredients_text") or
                row.get("ingredients_text_en") or
                row.get("ingredients_text_pt") or
                row.get("ingredients_text_es") or
                row.get("ingredients_text_de") or
                row.get("ingredients_text_fr") or
                row.get("ingredients_text_it") or
                ""
            ).strip()
            if not ingredients:
                continue

            def col(key):
                v = (row.get(key) or "").strip()
                return v if v else None

            batch.append((
                code,
                col("product_name"),
                col("brands"),
                col("ingredients_text"),
                col("ingredients_text_en"),
                col("ingredients_text_pt"),
                col("ingredients_text_es"),
                col("ingredients_text_de"),
                col("ingredients_text_fr"),
                col("ingredients_text_it"),
            ))

            if len(batch) >= BATCH_SIZE:
                cur.executemany(upsert_sql, batch)
                conn.commit()
                total += len(batch)
                batch = []
                print(f"\r  {total:,} rows imported", end="", flush=True)

    if batch:
        cur.executemany(upsert_sql, batch)
        conn.commit()
        total += len(batch)

    print(f"\nDone. {total:,} rows imported into off_products.")
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
