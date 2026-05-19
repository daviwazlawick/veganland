import './env.js';

const DATABASE_URL = process.env.DATABASE_URL || '';

// Lazy-load pg only when DATABASE_URL is provided
let pool = null;

export async function getPool() {
  if (!DATABASE_URL) return null;
  if (pool) return pool;

  const { default: pg } = await import('pg');
  pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  });
  return pool;
}

// Expose pool for /health check (may be null when DB is not configured)
export { pool };

export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function getIdentityKey(product) {
  const barcode = product?.barcode?.replace(/\D/g, '');
  if (barcode) return `barcode:${barcode}`;

  const identity = normalize([product?.brand, product?.product_name || product?.lookup_query].filter(Boolean).join(' '));
  if (identity) return `name:${identity}`;

  return null;
}

export function getProfileKey(profile, language) {
  const allergyIds = [...(profile?.allergyIds || [])].sort().join(',');
  return `${language}:${profile?.dietId || 'none'}:${allergyIds}`;
}

export async function findProduct(product) {
  const db = await getPool();
  if (!db) return null;

  const barcode = product?.barcode?.replace(/\D/g, '');
  const identityKey = getIdentityKey(product);

  const result = await db.query(
    `select *
       from products
      where ($1::text is not null and barcode = $1)
         or ($2::text is not null and identity_key = $2)
      order by updated_at desc
      limit 1`,
    [barcode || null, identityKey]
  );

  return result.rows[0] || null;
}

export async function upsertProduct(product) {
  const db = await getPool();
  if (!db) {
    // Without DB, return a synthetic product object so analysis still proceeds
    return { id: null, ...product };
  }

  const barcode = product?.barcode?.replace(/\D/g, '') || null;
  const identityKey = getIdentityKey(product);

  if (!identityKey || !product?.ingredients_text) return null;

  const result = await db.query(
    `insert into products (
       identity_key, barcode, brand, product_name, lookup_query,
       ingredients_text, source, source_url, raw
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     on conflict (identity_key) do update set
       barcode = coalesce(excluded.barcode, products.barcode),
       brand = coalesce(excluded.brand, products.brand),
       product_name = coalesce(excluded.product_name, products.product_name),
       lookup_query = coalesce(excluded.lookup_query, products.lookup_query),
       ingredients_text = excluded.ingredients_text,
       source = excluded.source,
       source_url = excluded.source_url,
       raw = excluded.raw,
       updated_at = now()
     returning *`,
    [
      identityKey,
      barcode,
      product.brand || null,
      product.product_name || null,
      product.lookup_query || null,
      product.ingredients_text,
      product.source || 'unknown',
      product.source_url || null,
      product,
    ]
  );

  return result.rows[0];
}

export async function findAnalysis(productId, profile, language) {
  const db = await getPool();
  if (!db || !productId) return null;

  const profileKey = getProfileKey(profile, language);
  const result = await db.query(
    `select result
       from product_analyses
      where product_id = $1
        and profile_key = $2
        and language = $3
      limit 1`,
    [productId, profileKey, language]
  );

  return result.rows[0]?.result || null;
}

export async function saveAnalysis(productId, profile, language, analysis) {
  const db = await getPool();
  if (!db || !productId) return;

  const profileKey = getProfileKey(profile, language);
  await db.query(
    `insert into product_analyses (product_id, profile_key, language, result)
     values ($1, $2, $3, $4)
     on conflict (product_id, profile_key, language) do update set
       result = excluded.result,
       updated_at = now()`,
    [productId, profileKey, language, analysis]
  );
}

export async function saveScanEvent({ productId, userId, profile, language, status, source, title }) {
  const db = await getPool();
  if (!db) return;

  await db.query(
    `insert into scan_events (product_id, user_id, profile_key, language, status, source, title)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [productId || null, userId || null, getProfileKey(profile, language), language, status || null, source || null, title || null]
  );
}

export async function createUser(email, passwordHash) {
  const db = await getPool();
  if (!db) throw new Error('Database not available');

  const result = await db.query(
    `insert into users (email, password_hash) values ($1, $2) returning id, email, created_at`,
    [email.toLowerCase().trim(), passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const db = await getPool();
  if (!db) return null;

  const result = await db.query(
    `select id, email, password_hash, created_at from users where email = $1`,
    [email.toLowerCase().trim()]
  );
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const db = await getPool();
  if (!db) return null;

  const result = await db.query(
    `select id, email, created_at from users where id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getUserHistory(userId, limit = 50) {
  const db = await getPool();
  if (!db) return [];

  const result = await db.query(
    `select se.id, se.status, se.title, se.language, se.source, se.created_at,
            p.product_name, p.brand
       from scan_events se
       left join products p on p.id = se.product_id
      where se.user_id = $1
      order by se.created_at desc
      limit $2`,
    [userId, limit]
  );
  return result.rows;
}