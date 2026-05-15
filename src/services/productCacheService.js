import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@veganland_product_cache';
const MAX_PRODUCTS = 100;
const MAX_ANALYSES = 200;

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function getProductCacheKey(product) {
  const barcode = product?.barcode?.replace(/\D/g, '');
  if (barcode) return `barcode:${barcode}`;

  const identity = normalize([product?.brand, product?.product_name || product?.lookup_query].filter(Boolean).join(' '));
  if (identity) return `name:${identity}`;

  const ingredients = normalize(product?.ingredients_text);
  if (ingredients) return `ingredients:${simpleHash(ingredients)}`;

  return null;
}

export function getProfileCacheKey(profile, lang) {
  const allergyIds = [...(profile?.allergyIds || [])].sort().join(',');
  return `${lang}:${profile?.dietId || 'none'}:${allergyIds}`;
}

async function readCache() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { products: {}, analyses: {} };

  try {
    const parsed = JSON.parse(raw);
    return {
      products: parsed.products || {},
      analyses: parsed.analyses || {},
    };
  } catch {
    return { products: {}, analyses: {} };
  }
}

async function writeCache(cache) {
  const products = Object.entries(cache.products || {}).slice(-MAX_PRODUCTS);
  const analyses = Object.entries(cache.analyses || {}).slice(-MAX_ANALYSES);

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
    products: Object.fromEntries(products),
    analyses: Object.fromEntries(analyses),
  }));
}

export async function getCachedProduct(product) {
  const key = getProductCacheKey(product);
  if (!key) return null;

  const cache = await readCache();
  return cache.products[key] || null;
}

export async function saveProductToCache(product) {
  const key = getProductCacheKey(product);
  if (!key || !product?.ingredients_text) return null;

  const cache = await readCache();
  const cachedProduct = {
    ...product,
    cache_key: key,
    cached_at: new Date().toISOString(),
  };

  cache.products[key] = cachedProduct;
  await writeCache(cache);

  return cachedProduct;
}

export async function getCachedAnalysis(product, profile, lang) {
  const productKey = getProductCacheKey(product);
  if (!productKey) return null;

  const cache = await readCache();
  return cache.analyses[`${productKey}:${getProfileCacheKey(profile, lang)}`] || null;
}

export async function saveAnalysisToCache(product, profile, lang, analysis) {
  const productKey = getProductCacheKey(product);
  if (!productKey) return null;

  const cache = await readCache();
  const analysisKey = `${productKey}:${getProfileCacheKey(profile, lang)}`;

  cache.analyses[analysisKey] = {
    ...analysis,
    cache_key: analysisKey,
    cached_at: new Date().toISOString(),
  };
  await writeCache(cache);

  return cache.analyses[analysisKey];
}
