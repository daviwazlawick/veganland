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
