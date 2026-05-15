function bestIngredientText(product) {
  return product.ingredients_text
    || product.ingredients_text_en
    || product.ingredients_text_pt
    || product.ingredients_text_es
    || '';
}

function mapOpenFoodFactsProduct(product, source) {
  if (!product) return null;

  const ingredientsText = bestIngredientText(product).trim();
  if (!ingredientsText) return null;

  return {
    product_name: product.product_name || product.generic_name || null,
    brand: product.brands || null,
    barcode: product.code || null,
    ingredients_text: ingredientsText,
    source,
    source_url: product.url || null,
  };
}

async function fetchOpenFoodFactsByBarcode(barcode) {
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!response.ok) return null;

  const data = await response.json();
  if (data.status !== 1) return null;

  return mapOpenFoodFactsProduct(data.product, 'open_food_facts');
}

async function fetchOpenFoodFactsByQuery(query) {
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
  const match = products.map(product => mapOpenFoodFactsProduct(product, 'open_food_facts')).find(Boolean);

  return match || null;
}

export async function findProductIngredients(productIdentity) {
  const barcode = productIdentity?.barcode?.replace(/\D/g, '');
  if (barcode) {
    const barcodeMatch = await fetchOpenFoodFactsByBarcode(barcode);
    if (barcodeMatch) return barcodeMatch;
  }

  const query = productIdentity?.lookup_query
    || [productIdentity?.brand, productIdentity?.product_name].filter(Boolean).join(' ');

  if (!query.trim()) return null;

  return fetchOpenFoodFactsByQuery(query);
}
