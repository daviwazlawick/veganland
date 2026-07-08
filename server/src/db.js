import './env.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateReferralCode, normalizeCode } from './referralCode.js';

export const SCAN_LIMITS = { free: 7, starter: 30, premium: 100, admin: null }; // null = unlimited

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
       -- Preserve existing OFF raw jsonb (211 cols of nutrition etc.); only
       -- write raw on first insert. Image-extracted upserts should never
       -- overwrite OFF data.
       raw = coalesce(products.raw, excluded.raw),
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

export async function enrichProductFromOff(productId, off) {
  const db = await getPool();
  if (!db || !productId || !off) return null;

  const res = await db.query(
    `update products set
       raw = $1,
       nutriscore_grade = coalesce($2, nutriscore_grade),
       nova_group = coalesce($3, nova_group),
       image_url = coalesce($4, image_url),
       quantity = coalesce($5, quantity),
       serving_size = coalesce($6, serving_size),
       allergens_tags = case when cardinality($7::text[]) > 0 then $7::text[] else allergens_tags end,
       traces_tags = case when cardinality($8::text[]) > 0 then $8::text[] else traces_tags end,
       categories_tags = case when cardinality($9::text[]) > 0 then $9::text[] else categories_tags end,
       labels_tags = case when cardinality($10::text[]) > 0 then $10::text[] else labels_tags end,
       updated_at = now()
     where id = $11
     returning *`,
    [
      off.raw,
      off.nutriscore_grade,
      off.nova_group,
      off.image_url,
      off.quantity,
      off.serving_size,
      off.allergens_tags || [],
      off.traces_tags || [],
      off.categories_tags || [],
      off.labels_tags || [],
      productId,
    ]
  );
  return res.rows[0] || null;
}

export async function updateProductIngredients(productId, ingredientsText) {
  const db = await getPool();
  if (!db || !productId || !ingredientsText?.trim()) return;

  await db.query(
    `update products set ingredients_text = $1, updated_at = now()
     where id = $2 and trim(coalesce(ingredients_text, '')) = ''`,
    [ingredientsText.trim(), productId]
  );
}

export async function disassociateBarcode(barcode) {
  const db = await getPool();
  if (!db || !barcode) return;

  const existing = await db.query(
    `select id, brand, product_name from products where barcode = $1 limit 1`,
    [barcode]
  );
  if (!existing.rows[0]) return;

  const { id, brand, product_name } = existing.rows[0];
  const nameKey = getIdentityKey({ brand, product_name, barcode: null });

  await db.query(
    `update products set barcode = null, identity_key = coalesce($1, identity_key), updated_at = now() where id = $2`,
    [nameKey, id]
  );
  await db.query(`delete from product_analyses where product_id = $1`, [id]);
}

export async function stampBarcode(productId, barcode) {
  const db = await getPool();
  if (!db || !barcode || !productId) return;

  const newKey = `barcode:${barcode}`;

  // If another product already owns this barcode, merge it into this one first
  const dup = await db.query(
    `select id from products where (barcode = $1 or identity_key = $2) and id != $3 limit 1`,
    [barcode, newKey, productId]
  );
  for (const row of dup.rows) {
    await db.query(`update product_analyses set product_id = $1 where product_id = $2`, [productId, row.id]);
    await db.query(`delete from products where id = $1`, [row.id]);
  }

  await db.query(
    `update products set barcode = $1, identity_key = $2, updated_at = now()
     where id = $3 and (barcode is null or barcode != $1)`,
    [barcode, newKey, productId]
  );
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

  // Qualify a pending referral on the first scan. Fire-and-forget — never let
  // referral bookkeeping block or fail the scan response.
  if (userId) qualifyReferralIfPending(userId).catch(err => console.warn('[referral] qualify failed', err?.message));
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

export async function createUser(email, passwordHash, disclaimerVersion = null, referralCodeInput = null) {
  const db = await getPool();
  const normalizedEmail = email.toLowerCase().trim();
  const disclaimerAt = disclaimerVersion ? new Date() : null;
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

  let referrerId = null;
  if (referralCodeInput) {
    const code = normalizeCode(referralCodeInput);
    const ref = await db.query('select id from users where referral_code = $1', [code]);
    referrerId = ref.rows[0]?.id || null;
  }

  let newCode = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateReferralCode();
    const taken = await db.query('select 1 from users where referral_code = $1', [candidate]);
    if (taken.rowCount === 0) { newCode = candidate; break; }
  }

  const result = await db.query(
    `insert into users (email, password_hash, disclaimer_accepted_at, disclaimer_version, referral_code, referred_by_user_id, user_type)
     values ($1, $2, $3, $4, $5, $6, NULL)
     returning id, email, user_type, created_at`,
    [normalizedEmail, passwordHash, disclaimerAt, disclaimerVersion, newCode, referrerId]
  );

  const user = result.rows[0];
  if (referrerId) {
    await db.query(
      `insert into referral_events (referrer_id, referred_id, status)
       values ($1, $2, 'pending')
       on conflict do nothing`,
      [referrerId, user.id]
    );
    // B's instant reward: 10 bonus scans, valid 30 days
    await grantBonusScans(user.id, REFERRED_SIGNUP_BONUS);
  }

  return user;
}

// --- OAuth (Sign in with Apple / Google) ---
// providers: 'apple' | 'google'. Columns are apple_sub / google_sub.
// Users created via OAuth have password_hash = null and email_confirmed = true
// (the identity provider already verified the address, or emitted a relay one).

const OAUTH_SUB_COLUMN = { apple: 'apple_sub', google: 'google_sub' };

function oauthColumn(provider) {
  const col = OAUTH_SUB_COLUMN[provider];
  if (!col) throw new Error(`Unsupported OAuth provider: ${provider}`);
  return col;
}

export async function findUserByOAuthSub(provider, sub) {
  const db = await getPool();
  if (!db || !sub) return null;
  const col = oauthColumn(provider);
  const res = await db.query(
    `select id, email, email_confirmed, user_type, created_at from users where ${col} = $1`,
    [sub]
  );
  return res.rows[0] || null;
}

export async function linkOAuthToUser(userId, provider, sub) {
  const db = await getPool();
  if (!db) throw new Error('No database');
  const col = oauthColumn(provider);
  await db.query(
    `update users set ${col} = $1, oauth_provider = coalesce(oauth_provider, $2) where id = $3`,
    [sub, provider, userId]
  );
}

export async function createOAuthUser({ email, provider, sub, disclaimerVersion, referralCodeInput = null }) {
  const db = await getPool();
  if (!db) throw new Error('No database');
  const normalizedEmail = email.toLowerCase().trim();
  const col = oauthColumn(provider);
  const disclaimerAt = disclaimerVersion ? new Date() : null;

  let referrerId = null;
  if (referralCodeInput) {
    const code = normalizeCode(referralCodeInput);
    const ref = await db.query('select id from users where referral_code = $1', [code]);
    referrerId = ref.rows[0]?.id || null;
  }

  let newCode = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateReferralCode();
    const taken = await db.query('select 1 from users where referral_code = $1', [candidate]);
    if (taken.rowCount === 0) { newCode = candidate; break; }
  }

  const result = await db.query(
    `insert into users (email, ${col}, oauth_provider, email_confirmed,
                        disclaimer_accepted_at, disclaimer_version,
                        referral_code, referred_by_user_id, user_type)
     values ($1, $2, $3, true, $4, $5, $6, $7, NULL)
     returning id, email, user_type, created_at`,
    [normalizedEmail, sub, provider, disclaimerAt, disclaimerVersion, newCode, referrerId]
  );
  const user = result.rows[0];
  if (referrerId) {
    await db.query(
      `insert into referral_events (referrer_id, referred_id, status)
       values ($1, $2, 'pending')
       on conflict do nothing`,
      [referrerId, user.id]
    );
    await grantBonusScans(user.id, REFERRED_SIGNUP_BONUS);
  }
  return user;
}

export const REFERRED_SIGNUP_BONUS = 10;
export const REFERRER_REWARD_BONUS = 30;

// Called when a referred user completes their first scan. Transitions the
// referral_event from pending → qualified, increments the referrer's counter,
// and grants REFERRER_REWARD_BONUS scans every time the counter hits 3.
const REFERRALS_PER_REWARD = 3;

export async function qualifyReferralIfPending(referredUserId) {
  const db = await getPool();
  if (!db) return null;
  const client = await db.connect();
  try {
    await client.query('begin');
    const ev = await client.query(
      `update referral_events
          set status = 'qualified', qualified_at = now()
        where referred_id = $1 and status = 'pending'
        returning referrer_id`,
      [referredUserId]
    );
    if (ev.rowCount === 0) {
      await client.query('commit');
      return null;
    }
    const referrerId = ev.rows[0].referrer_id;

    const counter = await client.query(
      `update users
          set referral_credit_count = referral_credit_count + 1
        where id = $1
        returning referral_credit_count`,
      [referrerId]
    );
    const count = counter.rows[0].referral_credit_count;

    let granted = false;
    if (count >= REFERRALS_PER_REWARD) {
      await client.query(
        `update users
            set referral_credit_count = referral_credit_count - $2,
                referral_total_rewarded = referral_total_rewarded + 1
          where id = $1`,
        [referrerId, REFERRALS_PER_REWARD]
      );
      await client.query('commit');
      await grantBonusScans(referrerId, REFERRER_REWARD_BONUS);
      granted = true;
      return { referrerId, granted };
    }
    await client.query('commit');
    return { referrerId, granted };
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }
}

export async function getReferralStats(userId) {
  const db = await getPool();
  if (!db) return null;
  const [userRes, eventsRes] = await Promise.all([
    db.query(
      `select referral_code, referral_credit_count, referral_total_rewarded,
              bonus_scans_remaining, bonus_scans_expires_at
         from users where id = $1`,
      [userId]
    ),
    db.query(
      `select status, count(*)::int as count
         from referral_events
        where referrer_id = $1
        group by status`,
      [userId]
    ),
  ]);
  const u = userRes.rows[0];
  if (!u) return null;
  const counts = { pending: 0, qualified: 0 };
  for (const row of eventsRes.rows) counts[row.status] = row.count;
  const bonus_active = u.bonus_scans_expires_at && new Date(u.bonus_scans_expires_at) > new Date();
  return {
    code: u.referral_code,
    pending: counts.pending,
    qualified: counts.qualified,
    credit_count: u.referral_credit_count,
    total_rewarded: u.referral_total_rewarded,
    referrals_needed: REFERRALS_PER_REWARD,
    referrer_reward: REFERRER_REWARD_BONUS,
    referred_bonus: REFERRED_SIGNUP_BONUS,
    bonus_remaining: bonus_active ? u.bonus_scans_remaining : 0,
    bonus_expires_at: bonus_active ? u.bonus_scans_expires_at : null,
  };
}

// Redeem a code after registration (e.g. user installed app first, signed up
// without code, then heard about referrals). Only works if the user has no
// referrer yet AND has no qualifying scans yet (to avoid retroactive abuse).
export async function redeemReferralCode(userId, codeInput) {
  const db = await getPool();
  if (!db) return { ok: false, error: 'no_db' };
  const code = normalizeCode(codeInput);
  if (!code) return { ok: false, error: 'invalid_code' };

  const me = await db.query(
    `select referred_by_user_id,
            (select count(*) from scan_events where user_id = $1) as scans
       from users where id = $1`,
    [userId]
  );
  const row = me.rows[0];
  if (!row) return { ok: false, error: 'user_not_found' };
  if (row.referred_by_user_id) return { ok: false, error: 'already_referred' };
  if (Number(row.scans) > 0) return { ok: false, error: 'already_active' };

  const ref = await db.query('select id from users where referral_code = $1', [code]);
  const referrerId = ref.rows[0]?.id;
  if (!referrerId) return { ok: false, error: 'code_not_found' };
  if (referrerId === userId) return { ok: false, error: 'self_referral' };

  await db.query('update users set referred_by_user_id = $1 where id = $2', [referrerId, userId]);
  await db.query(
    `insert into referral_events (referrer_id, referred_id, status)
       values ($1, $2, 'pending') on conflict do nothing`,
    [referrerId, userId]
  );
  await grantBonusScans(userId, REFERRED_SIGNUP_BONUS);
  return { ok: true, referrer_id: referrerId };
}

export async function setUserDisclaimerAccepted(userId, version) {
  const db = await getPool();
  if (!db) return;
  await db.query(
    `update users set disclaimer_accepted_at = now(), disclaimer_version = $2 where id = $1`,
    [userId, version]
  );
}

export async function findUserByEmail(email) {
  const db = await getPool();
  const normalizedEmail = email.toLowerCase().trim();
  if (!db) {
    const users = await readLocalUsers();
    return users.find(user => user.email === normalizedEmail) || null;
  }

  const result = await db.query(
    `select id, email, password_hash, email_confirmed, user_type, created_at from users where email = $1`,
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
            se.result->>'explanation' as explanation,
            se.result->'concerns' as concerns,
            se.result->'normalized_ingredients' as normalized_ingredients,
            se.result->'identified_allergens' as identified_allergens,
            se.result->'traces' as traces,
            (se.result->>'cannot_read')::boolean as cannot_read,
            se.result->'productInfo' as product_info,
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

// Bonus scans live on top of the plan tier. Granting either extends a rolling
// 30-day window so active inviters keep their balance valid. Consumed before
// any monthly counter is touched.
export async function grantBonusScans(userId, amount) {
  const db = await getPool();
  if (!db || !amount) return null;
  const res = await db.query(
    `update users
        set bonus_scans_remaining = case
          when bonus_scans_expires_at is null or bonus_scans_expires_at < now() then $2
          else bonus_scans_remaining + $2
        end,
        bonus_scans_expires_at = now() + interval '30 days'
      where id = $1
      returning bonus_scans_remaining, bonus_scans_expires_at`,
    [userId, amount]
  );
  return res.rows[0] || null;
}

async function tryConsumeBonusScan(client, userId) {
  const res = await client.query(
    `update users
        set bonus_scans_remaining = bonus_scans_remaining - 1
      where id = $1
        and bonus_scans_remaining > 0
        and bonus_scans_expires_at > now()
      returning bonus_scans_remaining, bonus_scans_expires_at`,
    [userId]
  );
  return res.rows[0] || null;
}

export async function checkAndIncrementScanCounter(userId) {
  const db = await getPool();
  if (!db) return { allowed: true, count: 0, limit: SCAN_LIMITS.starter };

  const month = new Date().toISOString().slice(0, 7);
  const [year, mon] = month.split('-').map(Number);
  const resets_at = `${mon === 12 ? year + 1 : year}-${String(mon === 12 ? 1 : mon + 1).padStart(2, '0')}-01`;

  const userRes = await db.query('select user_type from users where id = $1', [userId]);
  const userType = userRes.rows[0]?.user_type;
  // Users without a tier (post-lock signups who haven't paid or redeemed a
  // gift code) can't scan. Client-side paywall blocks the UI; this is the
  // server-side safety net.
  if (!userType) return { allowed: false, count: 0, limit: 0, resets_at };
  const limit = userType in SCAN_LIMITS ? SCAN_LIMITS[userType] : 0;

  if (limit === null) return { allowed: true, count: 0, limit: null, resets_at: null };

  const client = await db.connect();
  try {
    await client.query('begin');

    // Try to consume a bonus scan first — these sit on top of the monthly limit.
    const bonus = await tryConsumeBonusScan(client, userId);
    if (bonus) {
      const monthly = await client.query(
        'select count from scan_counters where user_id = $1 and month = $2',
        [userId, month]
      );
      await client.query('commit');
      return {
        allowed: true,
        count: monthly.rows[0]?.count || 0,
        limit,
        resets_at,
        bonus_remaining: bonus.bonus_scans_remaining,
        bonus_expires_at: bonus.bonus_scans_expires_at,
        used_bonus: true,
      };
    }

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

export async function upsertPushToken({ userId, token, platform, locale }) {
  const db = await getPool();
  if (!db || !token || !platform) return null;
  const res = await db.query(
    `insert into push_tokens (user_id, token, platform, locale)
     values ($1, $2, $3, $4)
     on conflict (token) do update set
       user_id = excluded.user_id,
       platform = excluded.platform,
       locale = coalesce(excluded.locale, push_tokens.locale),
       last_seen_at = now()
     returning id`,
    [userId || null, token, platform, locale || null]
  );
  return res.rows[0]?.id || null;
}

export async function deletePushToken(token) {
  const db = await getPool();
  if (!db || !token) return false;
  const res = await db.query('delete from push_tokens where token = $1', [token]);
  return res.rowCount > 0;
}

export async function listPushTokens({ locale, userType, includeAnonymous = false } = {}) {
  const db = await getPool();
  if (!db) return [];
  const conditions = [];
  const params = [];
  if (!includeAnonymous) conditions.push('pt.user_id is not null');
  if (locale) {
    params.push(locale);
    conditions.push(`pt.locale = $${params.length}`);
  }
  if (userType) {
    params.push(userType);
    conditions.push(`u.user_type = $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  const res = await db.query(
    `select pt.token, pt.platform, pt.locale, pt.user_id
       from push_tokens pt
       left join users u on u.id = pt.user_id
      ${where}
      order by pt.last_seen_at desc`,
    params
  );
  return res.rows;
}

export async function logPushBroadcast({ title, body, locale, userType, route, totalCount, okCount, errorCount, invalidCount }) {
  const db = await getPool();
  if (!db) return null;
  const res = await db.query(
    `insert into push_broadcasts (title, body, locale, user_type, route, total_count, ok_count, error_count, invalid_count)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     returning id`,
    [title, body, locale || null, userType || null, route || null, totalCount, okCount, errorCount, invalidCount]
  );
  return res.rows[0]?.id || null;
}

export async function listPushBroadcasts(limit = 30) {
  const db = await getPool();
  if (!db) return [];
  const res = await db.query(
    `select id, title, body, locale, user_type, route, total_count, ok_count, error_count, invalid_count, created_at
       from push_broadcasts
      order by created_at desc
      limit $1`,
    [limit]
  );
  return res.rows;
}

export async function deleteUserAccount(userId) {
  const db = await getPool();
  if (!db) throw new Error('No database');
  await db.query('DELETE FROM scan_counters WHERE user_id = $1', [userId]);
  await db.query('DELETE FROM users WHERE id = $1', [userId]);
  // scan_events.user_id uses ON DELETE SET NULL — rows are anonymised, not deleted
}

export async function setUserType(userId, userType) {
  const db = await getPool();
  if (!db) return;
  const r = await db.query('update users set user_type = $1 where id = $2', [userType, userId]);
  if (r.rowCount === 0) console.warn(`[webhook] setUserType: user ${userId} not found in DB (RC anonymous purchase?)`);
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

const MODEL_PRICING = {
  'claude-opus-4-7':    { input: 15.00, output: 75.00 },
  'claude-opus-4-5':    { input: 15.00, output: 75.00 },
  'claude-sonnet-4-5':  { input:  3.00, output: 15.00 },
  'claude-haiku-4-5':   { input:  0.80, output:  4.00 },
};

export async function logApiUsage(model, inputTokens, outputTokens) {
  const db = await getPool();
  if (!db) return;
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-opus-4-7'];
  const cost = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  await db.query(
    'INSERT INTO api_usage (model, input_tokens, output_tokens, cost_usd) VALUES ($1, $2, $3, $4)',
    [model, inputTokens, outputTokens, cost]
  );
}

export async function getAdminStats() {
  const db = await getPool();
  if (!db) return null;

  const month = new Date().toISOString().slice(0, 7);

  const [
    usersRes, totalScansRes, monthScansRes, recentScansRes, userStatsRes, costRes,
    newTodayRes, newWeekRes, newMonthRes, planBreakdownRes, signupTrendRes,
    activeWeekRes, confirmedRes, dietStatsRes,
  ] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM users`),
    db.query(`SELECT COUNT(*) AS total FROM scan_events`),
    // Count actual scan_events this month (scan_counters undercounts because
    // it skips unlimited plans and anonymous scans).
    db.query(`SELECT COUNT(*) AS total FROM scan_events WHERE date_trunc('month', created_at) = date_trunc('month', now())`),
    db.query(`SELECT COUNT(*) AS total FROM scan_events WHERE created_at > now() - interval '24 hours'`),
    db.query(`
      SELECT
        u.id, u.email, u.diet_id, u.user_type, u.created_at, u.email_confirmed,
        COUNT(se.id)::int AS total_scans,
        MAX(se.created_at) AS last_scan,
        COUNT(se.id) FILTER (WHERE date_trunc('month', se.created_at) = date_trunc('month', now()))::int AS scans_this_month
      FROM users u
      LEFT JOIN scan_events se ON se.user_id = u.id
      GROUP BY u.id, u.email, u.diet_id, u.user_type, u.created_at, u.email_confirmed
      ORDER BY u.created_at DESC
      LIMIT 200
    `),
    db.query(`SELECT COALESCE(SUM(cost_usd), 0) AS total FROM api_usage WHERE date_trunc('month', created_at) = date_trunc('month', now())`),
    db.query(`SELECT COUNT(*) AS total FROM users WHERE created_at > now() - interval '24 hours'`),
    db.query(`SELECT COUNT(*) AS total FROM users WHERE created_at > now() - interval '7 days'`),
    db.query(`SELECT COUNT(*) AS total FROM users WHERE date_trunc('month', created_at) = date_trunc('month', now())`),
    db.query(`SELECT user_type, COUNT(*)::int AS count FROM users GROUP BY user_type`),
    db.query(`
      SELECT
        to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS signups
      FROM users
      WHERE created_at > now() - interval '28 days'
      GROUP BY 1
      ORDER BY 1
    `),
    db.query(`
      SELECT COUNT(DISTINCT user_id)::int AS total
      FROM scan_events
      WHERE created_at > now() - interval '7 days'
    `),
    db.query(`SELECT COUNT(*) AS total FROM users WHERE email_confirmed = true`),
    db.query(`
      SELECT
        COUNT(*) FILTER (WHERE diet_id IS NULL)::int AS no_diet,
        COUNT(*) FILTER (WHERE diet_id IS NULL AND created_at < '2026-05-19')::int AS no_diet_legacy,
        COUNT(*) FILTER (WHERE diet_id IS NULL AND created_at >= '2026-05-19')::int AS no_diet_recent
      FROM users
    `),
  ]);

  const planBreakdown = { none: 0, free: 0, starter: 0, premium: 0, admin: 0 };
  for (const row of planBreakdownRes.rows) {
    const key = row.user_type ?? 'none';
    planBreakdown[key] = row.count;
  }

  return {
    total_users: Number(usersRes.rows[0].total),
    total_scans: Number(totalScansRes.rows[0].total),
    scans_this_month: Number(monthScansRes.rows[0].total),
    scans_last_24h: Number(recentScansRes.rows[0].total),
    api_cost_this_month: Number(costRes.rows[0].total),
    new_users_today: Number(newTodayRes.rows[0].total),
    new_users_week: Number(newWeekRes.rows[0].total),
    new_users_month: Number(newMonthRes.rows[0].total),
    plan_breakdown: planBreakdown,
    signup_trend: signupTrendRes.rows,
    active_users_7d: Number(activeWeekRes.rows[0].total),
    confirmed_users: Number(confirmedRes.rows[0].total),
    no_diet: Number(dietStatsRes.rows[0].no_diet),
    no_diet_legacy: Number(dietStatsRes.rows[0].no_diet_legacy),
    no_diet_recent: Number(dietStatsRes.rows[0].no_diet_recent),
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

  if (!db) return { count: 0, limit: SCAN_LIMITS.starter, resets_at };

  const [usageRes, userRes] = await Promise.all([
    db.query('select count from scan_counters where user_id = $1 and month = $2', [userId, month]),
    db.query('select user_type, bonus_scans_remaining, bonus_scans_expires_at from users where id = $1', [userId]),
  ]);
  const u = userRes.rows[0] || {};
  const userType = u.user_type;
  const limit = userType && userType in SCAN_LIMITS ? SCAN_LIMITS[userType] : 0;

  const bonus_active = u.bonus_scans_expires_at && new Date(u.bonus_scans_expires_at) > new Date();
  const bonus_remaining = bonus_active ? (u.bonus_scans_remaining || 0) : 0;
  const bonus_expires_at = bonus_active ? u.bonus_scans_expires_at : null;

  if (limit === null) return { count: 0, limit: null, resets_at: null, bonus_remaining, bonus_expires_at };

  return { count: Number(usageRes.rows[0]?.count || 0), limit, resets_at, bonus_remaining, bonus_expires_at };
}
