import {
  analyzeFreshProduce,
  analyzeIngredients,
  buildInvalidImageResult,
  buildMissingIngredientsResult,
  evaluateProductIngredients,
  inspectProductImage,
} from './anthropic.js';
import {
  enrichProductFromOff,
  findAnalysis,
  findProduct,
  saveAnalysis,
  saveScanEvent,
  disassociateBarcode,
  stampBarcode,
  updateProductIngredients,
  upsertFreshProduct,
  upsertProduct,
} from './db.js';
import { buildSlimProductInfo, fetchOffEnrichment, findProductIdentity, findProductIngredients } from './openFoodFacts.js';
import { saveScanPhoto } from './photoStorage.js';

// A row is "OFF-enriched" if any of the OFF-only columns are populated or the
// raw blob carries the OFF shape (raw.code is the OFF barcode field).
function needsOffEnrichment(row) {
  if (!row) return false;
  if (row.nutriscore_grade || row.nova_group || row.image_url) return false;
  if (row.raw && typeof row.raw === 'object' && row.raw.code) return false;
  return true;
}

async function enrichKnownRowIfNeeded(row) {
  if (!needsOffEnrichment(row) || !row.barcode) return row;
  try {
    const off = await fetchOffEnrichment(row.barcode);
    if (!off) return row;
    const updated = await enrichProductFromOff(row.id, off);
    return updated || row;
  } catch {
    return row;
  }
}

async function resolveProductIngredients(imageInspection, { contributorUserId = null } = {}) {
  const visibleIngredients = imageInspection.ingredients_visible && imageInspection.ingredients_text?.trim();
  if (visibleIngredients) {
    return upsertProduct({
      ...imageInspection,
      ingredients_text: imageInspection.ingredients_text.trim(),
      source: 'image',
      // Label photo shows the front (and often ingredients on the back). Same
      // photo covers both roles — persist under label_photo_path so future
      // scans of this barcode see a real photo.
      label_photo_path: imageInspection.label_photo_path || null,
      contributor_user_id: contributorUserId,
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
    label_photo_path: imageInspection.label_photo_path || null,
    contributor_user_id: contributorUserId,
  };

  return upsertProduct(productForCurrentImage);
}

// The user identified a product (via barcode or label photo) but we couldn't
// find ingredients anywhere. Persist whatever identity + label photo we have
// so the next scanner can pick up where this one left off, then signal the
// client to prompt for a dedicated ingredients photo.
async function buildNeedsIngredientsResponse(imageInspection, lang, opts = {}) {
  const { contributorUserId = null, knownProduct = null } = opts;

  // Try to persist a stub row — barcode + name + label photo. Skip if we're
  // already looking at a DB row (knownProduct exists) since it's already
  // flagged needs_ingredients=true.
  let stub = knownProduct;
  if (!stub && (imageInspection.product_name || imageInspection.brand) && imageInspection.label_photo_path) {
    stub = await upsertProduct({
      ...imageInspection,
      ingredients_text: null,
      source: 'user_label',
      label_photo_path: imageInspection.label_photo_path,
      contributor_user_id: contributorUserId,
    });
  }

  const productName = [imageInspection.brand, imageInspection.product_name].filter(Boolean).join(' ')
    || stub?.product_name
    || null;

  return {
    status: 'NEEDS_INGREDIENTS_PHOTO',
    product_name: productName,
    brand: imageInspection.brand || stub?.brand || null,
    barcode: imageInspection.barcode || stub?.barcode || null,
    product_id: stub?.id || null,
    productInfo: buildSlimProductInfo(stub || imageInspection),
    // Give the client a friendly title/explanation to display while the user
    // decides whether to confirm the product and take the ingredients photo.
    title: productName || 'Ingredients needed',
    // Reuse missing-ingredients copy for the explanation — same intent.
    explanation: buildMissingIngredientsResult(imageInspection, lang).explanation,
  };
}

const NON_FOOD_TYPES = ['cosmetic', 'clothing', 'cleaning', 'other'];

const SUPPLEMENT_CATEGORY_TERMS = ['supplement', 'vitamin', 'mineral', 'multivitamin', 'probiotic', 'protein powder', 'nutraceutical', 'herbal'];

function productTypeFromCategories(categoriesTags) {
  if (!Array.isArray(categoriesTags) || categoriesTags.length === 0) return null;
  const joined = categoriesTags.join(' ').toLowerCase();
  if (SUPPLEMENT_CATEGORY_TERMS.some(k => joined.includes(k))) return 'supplement';
  return null;
}

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

// Maps each diet to OFF label slugs that certify compatibility.
// When a product carries a matching label, we trust the certification and
// skip the "ambiguous ingredients → CAUTION" escalation — it would otherwise
// flag a vegan-certified product with CAUTION just because lecithin or glycerin
// lacks an explicit plant-origin declaration on the label.
const DIET_CERT_LABELS = {
  vegan:       ['vegan', 'european-vegetarian-union-vegan', 'plant-based'],
  vegetarian:  ['vegetarian', 'vegan', 'european-vegetarian-union', 'european-vegetarian-union-vegan', 'plant-based'],
  gluten_free: ['no-gluten', 'gluten-free'],
  halal:       ['halal'],
  kosher:      ['kosher', 'orthodox-union-kosher'],
};

function normalizeLabel(tag) {
  return String(tag || '').toLowerCase().replace(/^[a-z]{2}:/i, '').trim();
}

function applyProfileToAnalysis(analysis, profile, language, productLabels = []) {
  const diet = profile?.dietId || 'none';
  const allergyIds = Array.isArray(profile?.allergyIds) ? profile.allergyIds : [];
  const normalizedProductLabels = (productLabels || []).map(normalizeLabel);
  const certLabels = DIET_CERT_LABELS[diet] || [];
  const hasDietCertification = certLabels.some(cl => normalizedProductLabels.includes(cl));

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
  if (hasProfile && !isKnowledgeBased && status === 'SAFE' && analysis.ambiguous?.length > 0 && !hasDietCertification) {
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

export async function analyzeProduct({
  imageBase64,           // legacy — treated as label photo
  labelPhotoBase64,      // new: front of product / brand+name
  ingredientsPhotoBase64,// new: back label with ingredients (second step)
  mediaType,
  profile,
  language,
  userId,
  barcode,
  skipBarcodeCache = false,
}) {
  const lang = language || 'pt';
  const contributorUserId = userId || null;
  // Prefer the explicit label field; fall back to imageBase64 for
  // pre-v1.0.19 clients that still send only imageBase64.
  const labelPhoto = labelPhotoBase64 || imageBase64 || null;

  // Barcode shortcut: skip image inspection for known products
  // skipBarcodeCache: user said "wrong product" — disassociate barcode from wrong product first
  let imageInspection = null;
  let knownDbRow = null;
  const clientBarcode = barcode ? String(barcode).replace(/\D/g, '') : null;

  if (skipBarcodeCache && clientBarcode) {
    await disassociateBarcode(clientBarcode);
  }

  // Ingredients photo path: user is completing a previously identified product.
  // Extract ingredients from the photo, write them back to the existing row,
  // then fall through to the normal analysis for that product.
  if (ingredientsPhotoBase64 && clientBarcode) {
    const ingredientsInspection = await inspectProductImage(ingredientsPhotoBase64, lang, mediaType);
    const extracted = ingredientsInspection?.ingredients_text?.trim();
    if (!ingredientsInspection?.ingredients_visible || !extracted) {
      // The user tried but the ingredients aren't legible. Ask again with a
      // clearer explanation — never invent ingredients.
      const stub = await findProduct({ barcode: clientBarcode });
      return {
        status: 'NEEDS_INGREDIENTS_PHOTO',
        product_name: stub?.product_name || null,
        brand: stub?.brand || null,
        barcode: clientBarcode,
        product_id: stub?.id || null,
        productInfo: buildSlimProductInfo(stub),
        title: stub?.product_name || 'Ingredients needed',
        explanation: buildMissingIngredientsResult(stub || {}, lang).explanation,
        ingredients_unreadable: true,
      };
    }
    const stubProduct = await findProduct({ barcode: clientBarcode });
    if (stubProduct?.id) {
      const ingredientsPath = await saveScanPhoto('ingredients', ingredientsPhotoBase64).catch(() => null);
      await updateProductIngredients(stubProduct.id, extracted, {
        ingredientsPhotoPath: ingredientsPath,
        contributorUserId,
        source: 'user_ingredients',
      });
      // Re-fetch so the analysis below sees the freshly written ingredients.
      const refreshed = await findProduct({ barcode: clientBarcode });
      if (refreshed) {
        knownDbRow = refreshed;
        const src = refreshed.source || 'processed_food';
        const catType = productTypeFromCategories(refreshed.categories_tags);
        imageInspection = {
          product_type: catType || (src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food'),
          product_name: refreshed.product_name,
          brand: refreshed.brand,
          barcode: refreshed.barcode,
          lookup_query: refreshed.lookup_query
            || [refreshed.brand, refreshed.product_name].filter(Boolean).join(' ')
            || null,
          ingredients_visible: false,
          ingredients_text: refreshed.ingredients_text || null,
          confidence: 1.0,
        };
      }
    }
  }

  if (!imageInspection && clientBarcode && !skipBarcodeCache) {
    // products table contains both our scans and the full OFF dump (~4.3M).
    // Use whatever we know locally — name/brand alone is enough to skip the
    // online OFF identity lookup further down. If ingredients are missing and
    // an image is provided, the label inspection still runs below.
    let known = await findProduct({ barcode: clientBarcode });
    if (known) {
      known = await enrichKnownRowIfNeeded(known);
      knownDbRow = known;

      // Row exists but is a stub (needs_ingredients=true) and the client
      // didn't send an ingredients photo — bounce them straight to the
      // ingredients step. Skip the label inspection entirely; we already
      // know the identity.
      if (known.needs_ingredients && !ingredientsPhotoBase64) {
        return await buildNeedsIngredientsResponse(
          {
            product_name: known.product_name,
            brand: known.brand,
            barcode: known.barcode,
            label_photo_path: known.label_photo_path,
          },
          lang,
          { knownProduct: known }
        );
      }

      const src = known.source || 'processed_food';
      const catType = productTypeFromCategories(known.categories_tags);
      imageInspection = {
        product_type: catType || (src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food'),
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
  if (!imageInspection && !labelPhoto) {
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
      // Legacy status kept for pre-v1.0.19 clients (they still handle NEEDS_PHOTO
      // by switching to the photo step). New clients treat NEEDS_LABEL_PHOTO
      // and NEEDS_PHOTO as equivalent — the semantic is the same.
      return { status: 'NEEDS_PHOTO', barcode: clientBarcode, productInfo: null };
    }
  }

  if (!imageInspection) {
    imageInspection = await inspectProductImage(labelPhoto, lang, mediaType);

    // Reject non-product images immediately — no further AI calls, no scan event logged
    if (imageInspection.product_type === 'invalid') {
      return { ...buildInvalidImageResult(lang), productInfo: null };
    }

    // Persist the label photo to disk right after successful inspection so
    // downstream upserts can link it to the product.
    const labelPath = await saveScanPhoto('label', labelPhoto).catch(() => null);
    if (labelPath) imageInspection.label_photo_path = labelPath;

    // If Haiku extracted a barcode from the image that the client didn't detect,
    // try a DB lookup before running the full analysis pipeline
    const imageBarcode = imageInspection.barcode?.replace(/\D/g, '');
    if (imageBarcode && !clientBarcode) {
      let known = await findProduct({ barcode: imageBarcode });
      if (known) {
        known = await enrichKnownRowIfNeeded(known);
        const src = known.source || 'processed_food';
        const catType2 = productTypeFromCategories(known.categories_tags);
        imageInspection = {
          ...imageInspection,
          product_type: catType2 || imageInspection.product_type || (src === 'fresh_produce' ? 'fresh_produce' : NON_FOOD_SOURCES.has(src) ? src : 'processed_food'),
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
      result = applyProfileToAnalysis(neutralAnalysis, profile, lang, product?.labels_tags);
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
        result = applyProfileToAnalysis(neutralAnalysis, profile, lang, product?.labels_tags);
      } else {
        result = await evaluateProductIngredients(imageInspection.ingredients_text.trim(), imageInspection, profile, lang, 'image', productType);
      }
    } else {
      result = buildMissingIngredientsResult(imageInspection, lang);
    }

  } else {
    // processed_food e supplement: cache global por produto+idioma, perfil aplicado localmente
    product = await resolveProductIngredients(imageInspection, { contributorUserId });

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
      result = applyProfileToAnalysis(neutralAnalysis, profile, lang, product?.labels_tags);
    } else if (imageInspection.product_name || imageInspection.brand) {
      // We identified the product but couldn't find its ingredient list
      // anywhere. NEVER invent ingredients — we persist the label photo +
      // identity so the next scan can pick up where this one left off, and
      // ask the user to photograph the ingredients label.
      return await buildNeedsIngredientsResponse(imageInspection, lang, {
        contributorUserId,
        knownProduct: knownDbRow,
      });
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
    product_type: productType,
    // knownDbRow has OFF columns (allergens_tags, nutriscore_grade, etc.) that
    // imageInspection lacks — prefer it so offMeta survives when the product
    // exists in our DB but has no ingredients yet.
    productInfo: buildSlimProductInfo(product || knownDbRow || imageInspection),
  };

  const scanId = await saveScanEvent({
    productId: product?.id,
    userId: userId || null,
    profile,
    language: lang,
    status: fullResult.status,
    source: fullResult.ingredients_source || product?.source,
    title: fullResult.title || null,
    result: fullResult,
  });

  if (scanId) fullResult.scan_id = scanId;
  return fullResult;
}
