import {
  analyzeFreshProduce,
  analyzeIngredients,
  analyzeNonFoodByKnowledge,
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
  upsertFreshProduct,
  upsertProduct,
  upsertProductByIdentity,
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

function applyProfileToAnalysis(analysis, profile, language) {
  const diet = profile?.dietId || 'none';
  const allergyIds = Array.isArray(profile?.allergyIds) ? profile.allergyIds : [];

  let concerns = [];
  let status = 'SAFE';

  if (diet === 'vegan') {
    const animalItems = [...(analysis.animal_derived || []), ...(analysis.meat_fish || [])];
    if (animalItems.length > 0) {
      status = 'NOT_SAFE';
      concerns.push(...animalItems);
    }
  } else if (diet === 'vegetarian') {
    if (analysis.meat_fish?.length > 0) {
      status = 'NOT_SAFE';
      concerns.push(...analysis.meat_fish);
    }
  } else if (diet === 'glutenFree') {
    if (analysis.gluten?.length > 0) {
      status = 'NOT_SAFE';
      concerns.push(...analysis.gluten);
    }
  }

  for (const allergyId of allergyIds) {
    const found = analysis.allergens?.[allergyId] || [];
    if (found.length > 0) {
      status = 'NOT_SAFE';
      concerns.push(...found);
    }
  }

  const hasProfile = diet !== 'none' || allergyIds.length > 0;
  const isKnowledgeBased = analysis.ingredients_source === 'knowledge';
  if (hasProfile && !isKnowledgeBased && status === 'SAFE' && analysis.ambiguous?.length > 0) {
    status = 'CAUTION';
    concerns.push(...analysis.ambiguous);
  }

  concerns = [...new Set(concerns)];

  const productName = analysis.product_name || (language === 'pt' ? 'Produto' : 'Product');
  const summary = analysis.summary ? analysis.summary.trim() : '';
  const concernList = concerns.join(', ');

  let title, explanation;

  if (status === 'SAFE') {
    title = language === 'pt' ? `${productName} — adequado para seu perfil` : `${productName} — suitable for your profile`;
    explanation = language === 'pt'
      ? `${summary}${summary ? ' ' : ''}Nenhum ingrediente incompatível com seu perfil foi encontrado.`
      : `${summary}${summary ? ' ' : ''}No ingredients incompatible with your profile were found.`;
  } else if (status === 'CAUTION') {
    title = language === 'pt' ? `${productName} — ingredientes ambíguos` : `${productName} — ambiguous ingredients`;
    explanation = language === 'pt'
      ? `${summary}${summary ? ' ' : ''}Ingredientes com origem incerta: ${concernList}. Verifique o rótulo.`
      : `${summary}${summary ? ' ' : ''}Ingredients with uncertain origin: ${concernList}. Check the label.`;
  } else {
    title = language === 'pt' ? `${productName} — não recomendado` : `${productName} — not recommended`;
    explanation = language === 'pt'
      ? `${summary}${summary ? ' ' : ''}Ingredientes incompatíveis com seu perfil: ${concernList}.`
      : `${summary}${summary ? ' ' : ''}Ingredients incompatible with your profile: ${concernList}.`;
  }

  return {
    status,
    title,
    explanation,
    concerns,
    cannot_read: analysis.cannot_read || false,
    product_name: analysis.product_name,
    ingredients_source: analysis.ingredients_source,
  };
}

const NON_FOOD_SOURCES = new Set(['cosmetic', 'clothing', 'cleaning', 'other']);

export async function analyzeProduct({ imageBase64, mediaType, profile, language, userId, barcode }) {
  const lang = language || 'pt';

  // Barcode shortcut: skip image inspection for known products
  let imageInspection = null;
  if (barcode) {
    const known = await findProduct({ barcode: String(barcode).replace(/\D/g, '') });
    if (known) {
      const src = known.source || 'processed_food';
      imageInspection = {
        product_type: src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food',
        product_name: known.product_name,
        brand: known.brand,
        barcode: known.barcode,
        lookup_query: known.lookup_query,
        ingredients_visible: !!known.ingredients_text,
        ingredients_text: known.ingredients_text || null,
        confidence: 1.0,
      };
    }
  }

  if (!imageInspection) {
    imageInspection = await inspectProductImage(imageBase64, lang, mediaType);
  }

  const productType = imageInspection.product_type || 'processed_food';

  let result;
  let product = null;

  if (productType === 'fresh_produce') {
    // Cache global por alimento in natura + idioma, perfil aplicado localmente
    const freshProduct = await upsertFreshProduct(imageInspection);
    if (freshProduct?.id) {
      let neutralAnalysis = await findAnalysis(freshProduct.id, lang);
      if (!neutralAnalysis) {
        neutralAnalysis = await analyzeFreshProduce(imageInspection, lang);
        await saveAnalysis(freshProduct.id, lang, neutralAnalysis);
      }
      product = freshProduct;
      result = applyProfileToAnalysis(neutralAnalysis, profile, lang);
    } else {
      result = await analyzeProductByKnowledge(imageInspection, profile, lang);
    }

  } else if (NON_FOOD_TYPES.includes(productType)) {
    // Cosméticos, roupas, limpeza: cache global por produto+idioma, perfil aplicado localmente
    if (imageInspection.ingredients_visible && imageInspection.ingredients_text?.trim()) {
      product = await upsertProduct({
        ...imageInspection,
        ingredients_text: imageInspection.ingredients_text.trim(),
        source: 'image',
      });
      if (product?.id) {
        let neutralAnalysis = await findAnalysis(product.id, lang);
        if (!neutralAnalysis) {
          neutralAnalysis = await analyzeIngredients(product.ingredients_text, product, lang, 'image', productType);
          await saveAnalysis(product.id, lang, neutralAnalysis);
        }
        result = applyProfileToAnalysis(neutralAnalysis, profile, lang);
      } else {
        result = await evaluateProductIngredients(imageInspection.ingredients_text.trim(), imageInspection, profile, lang, 'image', productType);
      }
    } else if (imageInspection.product_name || imageInspection.brand) {
      product = await upsertProductByIdentity(imageInspection, productType);
      if (product?.id) {
        let neutralAnalysis = await findAnalysis(product.id, lang);
        if (!neutralAnalysis) {
          neutralAnalysis = await analyzeNonFoodByKnowledge(imageInspection, lang, productType);
          await saveAnalysis(product.id, lang, neutralAnalysis);
        }
        result = applyProfileToAnalysis(neutralAnalysis, profile, lang);
      } else {
        result = await analyzeProductByKnowledge(imageInspection, profile, lang);
      }
    } else {
      result = buildMissingIngredientsResult(imageInspection, lang);
    }

  } else {
    // processed_food e supplement: cache global por produto+idioma, perfil aplicado localmente
    product = await resolveProductIngredients(imageInspection);

    if (product?.ingredients_text) {
      let neutralAnalysis = await findAnalysis(product.id, lang);
      if (!neutralAnalysis) {
        neutralAnalysis = await analyzeIngredients(
          product.ingredients_text,
          product,
          lang,
          product.source || 'unknown',
          productType
        );
        await saveAnalysis(product.id, lang, neutralAnalysis);
      }
      result = applyProfileToAnalysis(neutralAnalysis, profile, lang);
    } else if (imageInspection.product_name || imageInspection.brand || imageInspection.barcode) {
      product = await upsertProductByIdentity(imageInspection, productType);
      if (product?.id) {
        let neutralAnalysis = await findAnalysis(product.id, lang);
        if (!neutralAnalysis) {
          neutralAnalysis = await analyzeNonFoodByKnowledge(imageInspection, lang, productType);
          await saveAnalysis(product.id, lang, neutralAnalysis);
        }
        result = applyProfileToAnalysis(neutralAnalysis, profile, lang);
      } else {
        result = await analyzeProductByKnowledge(imageInspection, profile, lang);
      }
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
    result,
  });

  return {
    ...result,
    productInfo: product || imageInspection,
  };
}
