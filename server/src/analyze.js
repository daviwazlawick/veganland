import {
  analyzeFreshProduce,
  analyzeIngredients,
  buildInvalidImageResult,
  buildMissingIngredientsResult,
  evaluateProductIngredients,
  inspectProductImage,
} from './anthropic.js';
import {
  findAnalysis,
  findProduct,
  saveAnalysis,
  saveScanEvent,
  disassociateBarcode,
  stampBarcode,
  upsertFreshProduct,
  upsertProduct,
} from './db.js';
import { buildSlimProductInfo, findProductIdentity, findProductIngredients } from './openFoodFacts.js';

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
  // Product exists in our DB with ingredients and was created by a user scan
  // (not imported from OFF) — don't override it with potentially wrong OFF data.
  // If ingredients are empty, allow OFF to fill them in.
  if (dbProduct?.ingredients_text && dbProduct.source !== 'open_food_facts') {
    return null;
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

const ALLERGEN_ALIASES = {
  tree_nuts: ['tree_nuts', 'nuts'],
  gluten: ['gluten', 'wheat'],
};

function resultText(language, key, params = {}) {
  const messages = {
    pt: {
      product: 'Produto',
      safeTitle: '{{product}} — adequado para seu perfil',
      safeExplanation: 'Nenhum ingrediente incompatível com seu perfil foi encontrado.',
      cautionTitle: '{{product}} — ingredientes ambíguos',
      cautionExplanation: 'Ingredientes com origem incerta: {{concerns}}. Verifique o rótulo.',
      notSafeTitle: '{{product}} — não recomendado',
      notSafeExplanation: 'Ingredientes incompatíveis com seu perfil: {{concerns}}.',
      tracesNote: 'Aviso de contaminação cruzada no rótulo: pode conter traços de {{traces}}. Isso não é um ingrediente da receita.',
    },
    en: {
      product: 'Product',
      safeTitle: '{{product}} — suitable for your profile',
      safeExplanation: 'No ingredients incompatible with your profile were found.',
      cautionTitle: '{{product}} — ambiguous ingredients',
      cautionExplanation: 'Ingredients with uncertain origin: {{concerns}}. Check the label.',
      notSafeTitle: '{{product}} — not recommended',
      notSafeExplanation: 'Ingredients incompatible with your profile: {{concerns}}.',
      tracesNote: 'Cross-contamination warning on label: may contain traces of {{traces}}. This is not a recipe ingredient.',
    },
    de: {
      product: 'Produkt',
      safeTitle: '{{product}} — passend für dein Profil',
      safeExplanation: 'Es wurden keine Zutaten gefunden, die mit deinem Profil unvereinbar sind.',
      cautionTitle: '{{product}} — mehrdeutige Zutaten',
      cautionExplanation: 'Zutaten mit unklarer Herkunft: {{concerns}}. Prüfe das Etikett.',
      notSafeTitle: '{{product}} — nicht empfohlen',
      notSafeExplanation: 'Mit deinem Profil unvereinbare Zutaten: {{concerns}}.',
      tracesNote: 'Kreuzkontaminationshinweis auf dem Etikett: kann Spuren von {{traces}} enthalten. Dies ist keine Rezeptzutat.',
    },
    fr: {
      product: 'Produit',
      safeTitle: '{{product}} — adapté à votre profil',
      safeExplanation: 'Aucun ingrédient incompatible avec votre profil n’a été trouvé.',
      cautionTitle: '{{product}} — ingrédients ambigus',
      cautionExplanation: 'Ingrédients d’origine incertaine : {{concerns}}. Vérifiez l’étiquette.',
      notSafeTitle: '{{product}} — non recommandé',
      notSafeExplanation: 'Ingrédients incompatibles avec votre profil : {{concerns}}.',
      tracesNote: "Avertissement de contamination croisée sur l'étiquette : peut contenir des traces de {{traces}}. Ceci n'est pas un ingrédient de la recette.",
    },
    it: {
      product: 'Prodotto',
      safeTitle: '{{product}} — adatto al tuo profilo',
      safeExplanation: 'Non sono stati trovati ingredienti incompatibili con il tuo profilo.',
      cautionTitle: '{{product}} — ingredienti ambigui',
      cautionExplanation: 'Ingredienti di origine incerta: {{concerns}}. Controlla l’etichetta.',
      notSafeTitle: '{{product}} — non consigliato',
      notSafeExplanation: 'Ingredienti incompatibili con il tuo profilo: {{concerns}}.',
      tracesNote: "Avviso di contaminazione crociata sull'etichetta: può contenere tracce di {{traces}}. Non è un ingrediente della ricetta.",
    },
    es: {
      product: 'Producto',
      safeTitle: '{{product}} — adecuado para tu perfil',
      safeExplanation: 'No se encontraron ingredientes incompatibles con tu perfil.',
      cautionTitle: '{{product}} — ingredientes ambiguos',
      cautionExplanation: 'Ingredientes de origen incierto: {{concerns}}. Revisa la etiqueta.',
      notSafeTitle: '{{product}} — no recomendado',
      notSafeExplanation: 'Ingredientes incompatibles con tu perfil: {{concerns}}.',
      tracesNote: 'Advertencia de contaminación cruzada en la etiqueta: puede contener trazas de {{traces}}. No es un ingrediente de la receta.',
    },
  };

  const text = (messages[language] || messages.en)[key] || messages.en[key] || key;
  return Object.entries(params).reduce(
    (acc, [param, replacement]) => acc.replaceAll(`{{${param}}}`, String(replacement)),
    text
  );
}

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
    const keys = ALLERGEN_ALIASES[allergyId] || [allergyId];
    const found = keys.flatMap(key => analysis.allergens?.[key] || []);
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

  const productName = analysis.product_name || resultText(language, 'product');
  const summary = analysis.summary ? analysis.summary.trim() : '';
  const concernList = concerns.join(', ');

  let title, explanation;

  if (status === 'SAFE') {
    title = resultText(language, 'safeTitle', { product: productName });
    explanation = `${summary}${summary ? ' ' : ''}${resultText(language, 'safeExplanation')}`;
  } else if (status === 'CAUTION') {
    title = resultText(language, 'cautionTitle', { product: productName });
    explanation = `${summary}${summary ? ' ' : ''}${resultText(language, 'cautionExplanation', { concerns: concernList })}`;
  } else {
    title = resultText(language, 'notSafeTitle', { product: productName });
    explanation = `${summary}${summary ? ' ' : ''}${resultText(language, 'notSafeExplanation', { concerns: concernList })}`;
  }

  const traces = Array.isArray(analysis.traces) && analysis.traces.length > 0 ? analysis.traces : null;
  if (traces) {
    const tracesText = resultText(language, 'tracesNote', { traces: traces.join(', ') });
    // Prepend traces note so it's visible even on short explanations
    explanation = `${explanation}\n\n${tracesText}`;
  }

  const identified_allergens = Object.entries(analysis.allergens || {})
    .filter(([, items]) => Array.isArray(items) && items.length > 0)
    .map(([key]) => key);

  return {
    status,
    title,
    explanation,
    concerns,
    cannot_read: analysis.cannot_read || false,
    product_name: analysis.product_name,
    ingredients_source: analysis.ingredients_source,
    identified_allergens,
    normalized_ingredients: Array.isArray(analysis.normalized_ingredients) ? analysis.normalized_ingredients : [],
    traces: traces || [],
  };
}

const NON_FOOD_SOURCES = new Set(['cosmetic', 'clothing', 'cleaning', 'other']);

export async function analyzeProduct({ imageBase64, mediaType, profile, language, userId, barcode, skipBarcodeCache = false }) {
  const lang = language || 'pt';

  // Barcode shortcut: skip image inspection for known products
  // skipBarcodeCache: user said "wrong product" — disassociate barcode from wrong product first
  let imageInspection = null;
  let knownDbRow = null;
  const clientBarcode = barcode ? String(barcode).replace(/\D/g, '') : null;

  if (skipBarcodeCache && clientBarcode) {
    await disassociateBarcode(clientBarcode);
  }

  if (clientBarcode && !skipBarcodeCache) {
    // products table contains both our scans and the full OFF dump (~4.3M).
    // Use whatever we know locally — name/brand alone is enough to skip the
    // online OFF identity lookup further down. If ingredients are missing and
    // an image is provided, the label inspection still runs below.
    const known = await findProduct({ barcode: clientBarcode });
    if (known) {
      knownDbRow = known;
      const src = known.source || 'processed_food';
      imageInspection = {
        product_type: src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food',
        product_name: known.product_name,
        brand: known.brand,
        barcode: known.barcode,
        lookup_query: known.lookup_query
          || [known.brand, known.product_name].filter(Boolean).join(' ')
          || null,
        // ingredients_visible is the "saw it in the image" flag; data came from
        // DB so leave it false to skip the image-extracted upsert path (which
        // would otherwise overwrite the OFF raw blob and nutrition data).
        ingredients_visible: false,
        ingredients_text: known.ingredients_text || null,
        confidence: 1.0,
      };
    }
  }

  // Nothing local AND no image → last resort: hit OFF web API for name/brand
  if (!imageInspection && !imageBase64) {
    if (clientBarcode) {
      const offIdentity = await findProductIdentity(clientBarcode);
      if (offIdentity) {
        imageInspection = {
          product_type: 'processed_food',
          product_name: offIdentity.product_name,
          brand: offIdentity.brand,
          barcode: clientBarcode,
          lookup_query: [offIdentity.brand, offIdentity.product_name].filter(Boolean).join(' '),
          ingredients_visible: false,
          ingredients_text: null,
          confidence: 0.9,
        };
      }
    }
    if (!imageInspection) {
      return { status: 'NEEDS_PHOTO', barcode: clientBarcode, productInfo: null };
    }
  }

  if (!imageInspection) {
    imageInspection = await inspectProductImage(imageBase64, lang, mediaType);

    // Reject non-product images immediately — no further AI calls, no scan event logged
    if (imageInspection.product_type === 'invalid') {
      return { ...buildInvalidImageResult(lang), productInfo: null };
    }

    // If Haiku extracted a barcode from the image that the client didn't detect,
    // try a DB lookup before running the full analysis pipeline
    const imageBarcode = imageInspection.barcode?.replace(/\D/g, '');
    if (imageBarcode && !clientBarcode) {
      const known = await findProduct({ barcode: imageBarcode });
      if (known) {
        const src = known.source || 'processed_food';
        imageInspection = {
          ...imageInspection,
          product_type: src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food',
          product_name: known.product_name || imageInspection.product_name,
          brand: known.brand || imageInspection.brand,
          barcode: known.barcode,
          ingredients_visible: !!known.ingredients_text,
          ingredients_text: known.ingredients_text || null,
          confidence: 1.0,
        };
      }
    }

    // Always stamp the scanner barcode onto imageInspection so it gets saved
    // with the product — next scan of the same barcode finds it immediately.
    if (clientBarcode) {
      imageInspection.barcode = clientBarcode;
    }
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
      result = buildMissingIngredientsResult(imageInspection, lang);
    }

  } else if (NON_FOOD_TYPES.includes(productType)) {
    // Cosméticos, roupas, limpeza: cache global por produto+idioma, perfil aplicado localmente
    if (imageInspection.ingredients_visible && imageInspection.ingredients_text?.trim()) {
      product = await upsertProduct({
        ...imageInspection,
        ingredients_text: imageInspection.ingredients_text.trim(),
        source: productType,
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
    } else {
      result = buildMissingIngredientsResult(imageInspection, lang);
    }
  }

  if (clientBarcode && product?.id) {
    await stampBarcode(product.id, clientBarcode);
  }

  // Build the final response (with productInfo + offMeta) and persist that
  // same blob — otherwise scan history reopens without the OFF UI.
  const fullResult = {
    ...result,
    // knownDbRow has OFF columns (allergens_tags, nutriscore_grade, etc.) that
    // imageInspection lacks — prefer it so offMeta survives when the product
    // exists in our DB but has no ingredients yet.
    productInfo: buildSlimProductInfo(product || knownDbRow || imageInspection),
  };

  await saveScanEvent({
    productId: product?.id,
    userId: userId || null,
    profile,
    language: lang,
    status: fullResult.status,
    source: fullResult.ingredients_source || product?.source,
    title: fullResult.title || null,
    result: fullResult,
  });

  return fullResult;
}
