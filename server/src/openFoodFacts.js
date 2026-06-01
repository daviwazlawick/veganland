import { getPool } from './db.js';

function bestIngredientText(product) {
  return product.ingredients_text
    || product.ingredients_text_en
    || product.ingredients_text_pt
    || product.ingredients_text_es
    || product.ingredients_text_de
    || product.ingredients_text_fr
    || product.ingredients_text_it
    || '';
}

function mapOpenFoodFactsProduct(product) {
  if (!product) return null;

  const ingredientsText = bestIngredientText(product).trim();
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

async function queryLocalOff(barcode) {
  const db = await getPool();
  if (!db) return null;

  // The import script may have stripped leading zeros, so try both the
  // exact barcode and the leading-zero-stripped version in one query.
  const stripped = barcode.replace(/^0+/, '') || barcode;

  const result = await db.query(
    'SELECT * FROM off_products WHERE code = $1 OR ($2 <> $1 AND code = $2) LIMIT 1',
    [barcode, stripped]
  );
  return result.rows[0] ? mapOpenFoodFactsProduct(result.rows[0]) : null;
}

async function fetchByBarcode(barcode) {
  const local = await queryLocalOff(barcode);
  if (local) return local;

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
