import {
  analyzeProductByKnowledge,
  buildMissingIngredientsResult,
  evaluateProductIngredients,
  inspectProductImage,
} from './anthropic.js';
import {
  findAnalysis,
  findProduct,
  saveAnalysis,
  saveScanEvent,
  upsertProduct,
} from './db.js';
import { findProductIngredients } from './openFoodFacts.js';

async function resolveProductIngredients(imageInspection) {
  const visibleIngredients = imageInspection.ingredients_visible && imageInspection.ingredients_text?.trim();
  if (visibleIngredients) {
    return upsertProduct({
      ...imageInspection,
      ingredients_text: imageInspection.ingredients_text.trim(),
      source: 'image',
    });
  }

  const dbProduct = await findProduct(imageInspection);
  if (dbProduct?.ingredients_text) {
    return {
      ...dbProduct,
      source: 'database',
    };
  }

  const searchedProduct = await findProductIngredients(imageInspection);
  if (!searchedProduct?.ingredients_text) return null;

  const productForCurrentImage = {
    ...searchedProduct,
    product_name: searchedProduct.product_name || imageInspection.product_name,
    brand: searchedProduct.brand || imageInspection.brand,
    barcode: searchedProduct.barcode || imageInspection.barcode,
    lookup_query: imageInspection.lookup_query,
  };

  return upsertProduct(productForCurrentImage);
}

export async function analyzeProduct({ imageBase64, mediaType, profile, language }) {
  const lang = language || 'pt';
  const imageInspection = await inspectProductImage(imageBase64, lang, mediaType);
  const product = await resolveProductIngredients(imageInspection);

  let result;
  if (product?.ingredients_text) {
    const cachedAnalysis = await findAnalysis(product.id, profile, lang);
    result = cachedAnalysis || await evaluateProductIngredients(
      product.ingredients_text,
      product,
      profile,
      lang,
      product.source || 'unknown'
    );

    if (!cachedAnalysis) {
      await saveAnalysis(product.id, profile, lang, result);
    }
  } else if (imageInspection.product_name || imageInspection.brand || imageInspection.barcode) {
    // Product identified but no ingredient list found — use Claude's knowledge
    result = await analyzeProductByKnowledge(imageInspection, profile, lang);
  } else {
    result = buildMissingIngredientsResult(imageInspection, lang);
  }

  await saveScanEvent({
    productId: product?.id,
    profile,
    language: lang,
    status: result.status,
    source: result.ingredients_source || product?.source,
  });

  return {
    ...result,
    productInfo: product || imageInspection,
  };
}
