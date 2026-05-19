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

const NON_FOOD_TYPES = ['cosmetic', 'clothing', 'cleaning', 'other'];

export async function analyzeProduct({ imageBase64, mediaType, profile, language, userId }) {
  const lang = language || 'pt';
  const imageInspection = await inspectProductImage(imageBase64, lang, mediaType);
  const productType = imageInspection.product_type || 'processed_food';

  let result;
  let product = null;

  if (productType === 'fresh_produce') {
    // Frutas e vegetais in natura: avaliação direta por conhecimento, sem buscar ingredientes
    result = await analyzeProductByKnowledge(imageInspection, profile, lang);

  } else if (NON_FOOD_TYPES.includes(productType)) {
    // Cosméticos, roupas, limpeza: não busca no OpenFoodFacts
    if (imageInspection.ingredients_visible && imageInspection.ingredients_text?.trim()) {
      result = await evaluateProductIngredients(
        imageInspection.ingredients_text.trim(),
        imageInspection,
        profile,
        lang,
        'image',
        productType
      );
    } else if (imageInspection.product_name || imageInspection.brand) {
      result = await analyzeProductByKnowledge(imageInspection, profile, lang);
    } else {
      result = buildMissingIngredientsResult(imageInspection, lang);
    }

  } else {
    // processed_food e supplement: fluxo completo com cache e OpenFoodFacts
    product = await resolveProductIngredients(imageInspection);

    if (product?.ingredients_text) {
      const cachedAnalysis = await findAnalysis(product.id, profile, lang);
      result = cachedAnalysis || await evaluateProductIngredients(
        product.ingredients_text,
        product,
        profile,
        lang,
        product.source || 'unknown',
        productType
      );
      if (!cachedAnalysis) {
        await saveAnalysis(product.id, profile, lang, result);
      }
    } else if (imageInspection.product_name || imageInspection.brand || imageInspection.barcode) {
      result = await analyzeProductByKnowledge(imageInspection, profile, lang);
    } else {
      result = buildMissingIngredientsResult(imageInspection, lang);
    }
  }

  await saveScanEvent({
    productId: product?.id,
    userId: userId || null,
    profile,
    language: lang,
    status: result.status,
    source: result.ingredients_source || product?.source,
    title: result.title || null,
  });

  return {
    ...result,
    productInfo: product || imageInspection,
  };
}
