// Labels worth surfacing in the UI — keeps the chip row useful instead of
// flooding it with internal OFF tags like 'en:open-food-facts-categorization'.
const INTERESTING_LABELS = new Set([
  'vegan', 'vegetarian', 'plant-based',
  'organic', 'bio', 'demeter', 'ecocert', 'eu-organic',
  'gluten-free', 'no-gluten',
  'lactose-free', 'dairy-free', 'no-lactose',
  'palm-oil-free', 'no-palm-oil',
  'fair-trade', 'fairtrade', 'max-havelaar',
  'no-gmo', 'gmo-free', 'non-gmo', 'without-gmo',
  'kosher', 'halal',
  'sugar-free', 'no-sugar', 'low-sugar', 'no-added-sugar',
  'no-preservatives', 'no-artificial-flavors', 'no-artificial-colors',
  'whole-grain', 'high-protein', 'high-fiber', 'low-fat',
  'raw', 'fsc',
]);

function cleanTag(tag) {
  return String(tag || '').replace(/^[a-z]{2}:/i, '').trim();
}

function readEnergyKcal100g(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kcalKeys = ['energy-kcal_100g', 'energy-kcal_value'];
  for (const key of kcalKeys) {
    const n = Number(raw[key]);
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  // energy_100g is kJ in OFF
  const kj = Number(raw['energy_100g']);
  if (Number.isFinite(kj) && kj > 0) return Math.round(kj / 4.184);
  return null;
}

function readNutrient(raw, key) {
  if (!raw || typeof raw !== 'object') return null;
  const n = Number(raw[key]);
  if (!Number.isFinite(n) || n < 0) return null;
  // 2 decimals for sub-1g values, 1 decimal otherwise
  return n < 1 ? Math.round(n * 100) / 100 : Math.round(n * 10) / 10;
}

export function buildOffMeta(product) {
  if (!product || typeof product !== 'object') return null;

  const raw = (product.raw && typeof product.raw === 'object') ? product.raw : {};

  const allCategories = (Array.isArray(product.categories_tags) ? product.categories_tags : [])
    .map(cleanTag).filter(Boolean);
  // OFF orders tags general → specific; keep the most specific tail
  const categories = [...new Set(allCategories.slice(-4).reverse())]
    .slice(0, 3)
    .map(t => t.replace(/-/g, ' '));

  const labels = [...new Set(
    (Array.isArray(product.labels_tags) ? product.labels_tags : [])
      .map(cleanTag)
      .filter(t => INTERESTING_LABELS.has(t))
  )].slice(0, 4).map(t => t.replace(/-/g, ' '));

  const traces = [...new Set(
    (Array.isArray(product.traces_tags) ? product.traces_tags : [])
      .map(cleanTag).filter(Boolean)
  )].map(t => t.replace(/-/g, ' '));

  const nutrition_100g = {
    energy_kcal: readEnergyKcal100g(raw),
    proteins: readNutrient(raw, 'proteins_100g'),
    carbohydrates: readNutrient(raw, 'carbohydrates_100g'),
    sugars: readNutrient(raw, 'sugars_100g'),
    fat: readNutrient(raw, 'fat_100g'),
    saturated_fat: readNutrient(raw, 'saturated-fat_100g'),
    fiber: readNutrient(raw, 'fiber_100g'),
    salt: readNutrient(raw, 'salt_100g'),
  };
  const hasNutrition = Object.values(nutrition_100g).some(v => v != null);

  const offMeta = {
    nutriscore_grade: product.nutriscore_grade && product.nutriscore_grade !== 'unknown'
      ? String(product.nutriscore_grade).toUpperCase()
      : null,
    nova_group: product.nova_group || null,
    nutrition_100g: hasNutrition ? nutrition_100g : null,
    categories,
    labels,
    traces,
    image_url: product.image_url || null,
    quantity: product.quantity || null,
    serving_size: product.serving_size || null,
  };

  const hasAnything = offMeta.nutriscore_grade || offMeta.nova_group || hasNutrition
    || categories.length || labels.length || traces.length
    || offMeta.image_url || offMeta.quantity || offMeta.serving_size;
  return hasAnything ? offMeta : null;
}

export function buildSlimProductInfo(productOrInspection) {
  if (!productOrInspection) return null;
  return {
    product_name: productOrInspection.product_name || null,
    brand: productOrInspection.brand || null,
    barcode: productOrInspection.barcode || null,
    source: productOrInspection.source || null,
    ingredients_text: productOrInspection.ingredients_text || null,
    offMeta: buildOffMeta(productOrInspection),
  };
}

function mapOpenFoodFactsProduct(product) {
  if (!product) return null;

  const ingredientsText = (product.ingredients_text || product.generic_name || '').trim();
  if (!ingredientsText) return null;

  return {
    product_name: product.product_name || product.generic_name || null,
    brand: product.brands || null,
    barcode: product.code || null,
    ingredients_text: ingredientsText,
    source: 'open_food_facts',
    source_url: product.url || null,
    raw: product,
  };
}

async function fetchByBarcode(barcode) {
  // OFF data is now in the products table — this is only called as a web fallback
  // for barcodes not found locally at all.
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 1) return null;

  return mapOpenFoodFactsProduct(data.product);
}

async function fetchByQuery(query) {
  const params = [
    'search_simple=1',
    'action=process',
    `search_terms=${encodeURIComponent(query)}`,
    'json=1',
    'page_size=10',
    'fields=code,product_name,generic_name,brands,ingredients_text,ingredients_text_en,ingredients_text_pt,ingredients_text_es,url',
  ].join('&');

  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`);
  if (!response.ok) return null;

  const data = await response.json();
  const products = Array.isArray(data.products) ? data.products : [];

  return products.map(mapOpenFoodFactsProduct).find(Boolean) || null;
}

export async function findProductIdentity(barcode) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=code,product_name,generic_name,brands`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.status !== 1) return null;
  const p = data.product;
  const name = p.product_name || p.generic_name || null;
  if (!name && !p.brands) return null;
  return { product_name: name, brand: p.brands || null, barcode };
}

export async function findProductIngredients(productIdentity) {
  const barcode = productIdentity?.barcode?.replace(/\D/g, '');
  if (barcode) {
    const barcodeMatch = await fetchByBarcode(barcode);
    if (barcodeMatch) return barcodeMatch;
  }

  const query = productIdentity?.lookup_query
    || [productIdentity?.brand, productIdentity?.product_name].filter(Boolean).join(' ');

  if (!query.trim()) return null;

  return fetchByQuery(query);
}
