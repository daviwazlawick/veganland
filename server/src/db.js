import './env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCAN_LIMITS = { basic: 30, premium: 100, admin: null }; // null = unlimited

const DATABASE_URL = process.env.DATABASE_URL || '';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DATA_DIR = path.join(__dirname, '..', '.data');
const LOCAL_USERS_PATH = path.join(LOCAL_DATA_DIR, 'users.json');

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

export async function upsertFreshProduct(product) {
  const name = normalize(product?.product_name || product?.lookup_query || '');
  if (!name) return null;

  const identityKey = `fresh:${name}`;
  const db = await getPool();

  if (!db) return { id: null, identity_key: identityKey, ...product };

  const result = await db.query(
    `insert into products (identity_key, product_name, lookup_query, ingredients_text, source)
     values ($1, $2, $3, '', 'fresh_produce')
     on conflict (identity_key) do update set
       product_name = coalesce(excluded.product_name, products.product_name),
       lookup_query = coalesce(excluded.lookup_query, products.lookup_query),
       updated_at = now()
     returning *`,
    [identityKey, product.product_name || null, product.lookup_query || null]
  );

  return result.rows[0];
}

export async function upsertProductByIdentity(product, source) {
  const identityKey = getIdentityKey(product);
  if (!identityKey) return null;

  const db = await getPool();
  if (!db) return { id: null, identity_key: identityKey, ...product };

  const barcode = product?.barcode?.replace(/\D/g, '') || null;

  const result = await db.query(
    `insert into products (identity_key, barcode, brand, product_name, lookup_query, ingredients_text, source)
     values ($1, $2, $3, $4, $5, '', $6)
     on conflict (identity_key) do update set
       barcode = coalesce(excluded.barcode, products.barcode),
       brand = coalesce(excluded.brand, products.brand),
       product_name = coalesce(excluded.product_name, products.product_name),
       lookup_query = coalesce(excluded.lookup_query, products.lookup_query),
       updated_at = now()
     returning *`,
    [identityKey, barcode, product.brand || null, product.product_name || null, product.lookup_query || null, source]
  );

  return result.rows[0];
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

  if (result.rows[0]) return result.rows[0];

  // Fuzzy fallback: find a stored product with ingredients that matches brand + name
  // (covers the case where the product was stored by barcode but is now looked up by name)
  const brand = (product?.brand || '').trim();
  const nameRaw = (product?.product_name || product?.lookup_query || '').trim();
  const nameWords = nameRaw.split(/\s+/).slice(0, 3).join(' ');
  if (!barcode && brand && nameWords) {
    const fuzzy = await db.query(
      `select * from products
        where ingredients_text is not null
          and brand ilike $1
          and product_name ilike $2
        order by updated_at desc
        limit 1`,
      [`%${brand}%`, `%${nameWords}%`]
    );
    if (fuzzy.rows[0]) return fuzzy.rows[0];
  }

  return null;
}

export async function upsertProduct(product) {
  const db = await getPool();
  if (!db) {
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

  const savedProduct = result.rows[0];
  if (!savedProduct) return null;

  // Merge any name-keyed duplicates into this (authoritative) barcode-keyed row
  // BEFORE invalidating caches, so the delete below also cleans up moved analyses.
  // When the same product was previously scanned without a barcode it gets a
  // separate name: row. We consolidate by re-pointing their analyses here and
  // deleting the stale rows (scan_events already use ON DELETE SET NULL).
  if (barcode) {
    const nameKey = getIdentityKey({ ...product, barcode: null });
    if (nameKey && nameKey !== identityKey) {
      const dup = await db.query(
        `select id from products where identity_key = $1 and id != $2`,
        [nameKey, savedProduct.id]
      );
      for (const row of dup.rows) {
        await db.query(
          `update product_analyses set product_id = $1 where product_id = $2`,
          [savedProduct.id, row.id]
        );
        await db.query(`delete from products where id = $1`, [row.id]);
      }
    }
  }

  // Invalidate knowledge-based cache now that real ingredients are available
  // (covers both original row and any analyses just merged in from name-keyed rows)
  await db.query(
    `delete from product_analyses where product_id = $1 and result->>'ingredients_source' = 'knowledge'`,
    [savedProduct.id]
  );

  return savedProduct;
}

export async function findAnalysis(productId, language) {
  const db = await getPool();
  if (!db || !productId) return null;

  const result = await db.query(
    `select result
       from product_analyses
      where product_id = $1
        and language = $2
      limit 1`,
    [productId, language]
  );

  return result.rows[0]?.result || null;
}

export async function saveAnalysis(productId, language, analysis) {
  const db = await getPool();
  if (!db || !productId) return;

  await db.query(
    `insert into product_analyses (product_id, language, result)
     values ($1, $2, $3)
     on conflict (product_id, language) do update set
       result = excluded.result,
       updated_at = now()`,
    [productId, language, analysis]
  );
}

export async function saveScanEvent({ productId, userId, profile, language, status, source, title, result }) {
  const db = await getPool();
  if (!db) return;

  await db.query(
    `insert into scan_events (product_id, user_id, profile_key, language, status, source, title, result)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [productId || null, userId || null, getProfileKey(profile, language), language, status || null, source || null, title || null, result ? JSON.stringify(result) : null]
  );
}

async function readLocalUsers() {
  try {
    const raw = await fs.readFile(LOCAL_USERS_PATH, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data.users) ? data.users : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeLocalUsers(users) {
  await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  await fs.writeFile(
    LOCAL_USERS_PATH,
    JSON.stringify({ users }, null, 2),
    'utf8'
  );
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    birth_date: user.birth_date || null,
    country: user.country || null,
    city: user.city || null,
    diet_id: user.diet_id || null,
    allergy_ids: Array.isArray(user.allergy_ids) ? user.allergy_ids : [],
    created_at: user.created_at,
    updated_at: user.updated_at || null,
  };
}

export async function createUser(email, passwordHash) {
  const db = await getPool();
  const normalizedEmail = email.toLowerCase().trim();
  if (!db) {
    const users = await readLocalUsers();
    if (users.some(user => user.email === normalizedEmail)) {
      throw new Error('Email already registered');
    }
    const user = {
      id: users.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
      email: normalizedEmail,
      password_hash: passwordHash,
      diet_id: null,
      allergy_ids: [],
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    users.push(user);
    await writeLocalUsers(users);
    return publicUser(user);
  }

  const result = await db.query(
    `insert into users (email, password_hash) values ($1, $2) returning id, email, created_at`,
    [normalizedEmail, passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const db = await getPool();
  const normalizedEmail = email.toLowerCase().trim();
  if (!db) {
    const users = await readLocalUsers();
    return users.find(user => user.email === normalizedEmail) || null;
  }

  const result = await db.query(
    `select id, email, password_hash, email_confirmed, created_at from users where email = $1`,
    [normalizedEmail]
  );
  return result.rows[0] || null;
}

export async function getUserById(id) {
  const db = await getPool();
  if (!db) {
    const users = await readLocalUsers();
    return publicUser(users.find(user => Number(user.id) === Number(id)));
  }

  const result = await db.query(
    `select id, email, name, birth_date, country, city, diet_id, allergy_ids, user_type, created_at, updated_at from users where id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateUserProfile(userId, data) {
  const db = await getPool();

  const allowed = ['name', 'birth_date', 'country', 'city', 'address', 'phone', 'avatar_url', 'diet_id', 'allergy_ids'];

  if (!db) {
    const users = await readLocalUsers();
    const user = users.find(item => Number(item.id) === Number(userId));
    if (!user) return null;

    let changed = false;
    for (const field of allowed) {
      if (data[field] !== undefined) {
        user[field] = field === 'allergy_ids'
          ? (Array.isArray(data[field]) ? data[field] : [])
          : data[field];
        changed = true;
      }
    }

    if (!changed) return null;
    user.updated_at = new Date().toISOString();
    await writeLocalUsers(users);
    return publicUser(user);
  }

  const updates = [];
  const values = [];
  let idx = 1;

  for (const field of allowed) {
    if (data[field] !== undefined) {
      updates.push(`${field} = $${idx}`);
      values.push(field === 'allergy_ids' ? JSON.stringify(data[field]) : data[field]);
      idx++;
    }
  }

  if (updates.length === 0) return null;
  updates.push('updated_at = now()');
  values.push(userId);

  const result = await db.query(
    `update users set ${updates.join(', ')} where id = $${idx}
     returning id, email, name, birth_date, country, city, diet_id, allergy_ids, created_at, updated_at`,
    values
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

export async function getScanById(scanId, userId) {
  const db = await getPool();
  if (!db) return null;

  const result = await db.query(
    `select se.id, se.status, se.title, se.language, se.source, se.result, se.created_at,
            p.product_name, p.brand
       from scan_events se
       left join products p on p.id = se.product_id
      where se.id = $1 and se.user_id = $2`,
    [scanId, userId]
  );
  return result.rows[0] || null;
}

export async function checkAndIncrementScanCounter(userId) {
  const db = await getPool();
  if (!db) return { allowed: true, count: 0, limit: SCAN_LIMITS.basic };

  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const resets_at = `${mon === 12 ? year + 1 : year}-${String(mon === 12 ? 1 : mon + 1).padStart(2, '0')}-01`;

  const userRes = await db.query('select user_type from users where id = $1', [userId]);
  const userType = userRes.rows[0]?.user_type || 'basic';
  const limit = userType in SCAN_LIMITS ? SCAN_LIMITS[userType] : SCAN_LIMITS.basic;

  if (limit === null) return { allowed: true, count: 0, limit: null, resets_at: null };

  const client = await db.connect();
  try {
    await client.query('begin');
    const existing = await client.query(
      'select count from scan_counters where user_id = $1 and month = $2 for update',
      [userId, month]
    );
    const current = existing.rows[0]?.count || 0;
    if (current >= limit) {
      await client.query('commit');
      return { allowed: false, count: current, limit, resets_at };
    }
    await client.query(
      `insert into scan_counters (user_id, month, count) values ($1, $2, 1)
       on conflict (user_id, month) do update set count = scan_counters.count + 1`,
      [userId, month]
    );
    await client.query('commit');
    return { allowed: true, count: current + 1, limit, resets_at };
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

export async function setUserType(userId, userType) {
  const db = await getPool();
  if (!db) return;
  await db.query('update users set user_type = $1 where id = $2', [userType, userId]);
}

export async function storeEmailConfirmationToken(userId, token) {
  const db = await getPool();
  if (!db) return;
  await db.query(
    `update users set email_confirmation_token = $1, email_confirmation_sent_at = now() where id = $2`,
    [token, userId]
  );
}

export async function confirmEmailByToken(token) {
  const db = await getPool();
  if (!db) return null;
  const result = await db.query(
    `update users
        set email_confirmed = true, email_confirmation_token = null
      where email_confirmation_token = $1
        and email_confirmation_sent_at > now() - interval '24 hours'
     returning id, email`,
    [token]
  );
  return result.rows[0] || null;
}

export async function createPasswordResetToken(userId, token) {
  const db = await getPool();
  if (!db) return;
  await db.query(
    `insert into password_reset_tokens (user_id, token, expires_at)
     values ($1, $2, now() + interval '1 hour')`,
    [userId, token]
  );
}

export async function findValidPasswordResetToken(token) {
  const db = await getPool();
  if (!db) return null;
  const result = await db.query(
    `select id, user_id from password_reset_tokens
      where token = $1
        and expires_at > now()
        and used_at is null`,
    [token]
  );
  return result.rows[0] || null;
}

export async function markPasswordResetTokenUsed(tokenId) {
  const db = await getPool();
  if (!db) return;
  await db.query(`update password_reset_tokens set used_at = now() where id = $1`, [tokenId]);
}

export async function updateUserPassword(userId, passwordHash) {
  const db = await getPool();
  if (!db) {
    const users = await readLocalUsers();
    const user = users.find(u => Number(u.id) === Number(userId));
    if (user) {
      user.password_hash = passwordHash;
      await writeLocalUsers(users);
    }
    return;
  }
  await db.query(`update users set password_hash = $1 where id = $2`, [passwordHash, userId]);
}

export async function getAdminStats() {
  const db = await getPool();
  if (!db) return null;

  const month = new Date().toISOString().slice(0, 7);

  const [usersRes, totalScansRes, monthScansRes, recentRes, userStatsRes] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM users`),
    db.query(`SELECT COUNT(*) AS total FROM scan_events`),
    db.query(`SELECT COALESCE(SUM(count), 0) AS total FROM scan_counters WHERE month = $1`, [month]),
    db.query(`SELECT COUNT(*) AS total FROM scan_events WHERE created_at > now() - interval '24 hours'`),
    db.query(`
      SELECT
        u.id, u.email, u.diet_id, u.user_type, u.created_at,
        COUNT(se.id)::int AS total_scans,
        MAX(se.created_at) AS last_scan,
        COALESCE(sc.count, 0) AS scans_this_month
      FROM users u
      LEFT JOIN scan_events se ON se.user_id = u.id
      LEFT JOIN scan_counters sc ON sc.user_id = u.id AND sc.month = $1
      GROUP BY u.id, u.email, u.diet_id, u.user_type, u.created_at, sc.count
      ORDER BY u.created_at DESC
      LIMIT 200
    `, [month]),
  ]);

  return {
    total_users: Number(usersRes.rows[0].total),
    total_scans: Number(totalScansRes.rows[0].total),
    scans_this_month: Number(monthScansRes.rows[0].total),
    scans_last_24h: Number(recentRes.rows[0].total),
    users: userStatsRes.rows,
  };
}

export async function getAdminUserDetail(userId) {
  const db = await getPool();
  if (!db) return null;

  const month = new Date().toISOString().slice(0, 7);

  const [userRes, scansRes, monthRes] = await Promise.all([
    db.query(
      `SELECT id, email, diet_id, allergy_ids, user_type, created_at, updated_at FROM users WHERE id = $1`,
      [userId]
    ),
    db.query(
      `SELECT se.id, se.status, se.title, se.source, se.language, se.created_at,
              p.product_name, p.brand, p.barcode,
              se.result
         FROM scan_events se
         LEFT JOIN products p ON p.id = se.product_id
        WHERE se.user_id = $1
        ORDER BY se.created_at DESC
        LIMIT 200`,
      [userId]
    ),
    db.query(
      `SELECT COALESCE(count, 0) AS count FROM scan_counters WHERE user_id = $1 AND month = $2`,
      [userId, month]
    ),
  ]);

  if (!userRes.rows[0]) return null;

  return {
    user: userRes.rows[0],
    scans: scansRes.rows,
    scans_this_month: Number(monthRes.rows[0]?.count || 0),
  };
}

export async function getScanUsage(userId) {
  const db = await getPool();
  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const resets_at = `${mon === 12 ? year + 1 : year}-${String(mon === 12 ? 1 : mon + 1).padStart(2, '0')}-01`;

  if (!db) return { count: 0, limit: SCAN_LIMITS.basic, resets_at };

  const [usageRes, userRes] = await Promise.all([
    db.query('select count from scan_counters where user_id = $1 and month = $2', [userId, month]),
    db.query('select user_type from users where id = $1', [userId]),
  ]);
  const userType = userRes.rows[0]?.user_type || 'basic';
  const limit = userType in SCAN_LIMITS ? SCAN_LIMITS[userType] : SCAN_LIMITS.basic;

  if (limit === null) return { count: 0, limit: null, resets_at: null };

  return { count: Number(usageRes.rows[0]?.count || 0), limit, resets_at };
}
