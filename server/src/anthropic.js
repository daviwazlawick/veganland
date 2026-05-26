import './env.js';
import { logApiUsage } from './db.js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-7';

export function hasAnthropicApiKey() {
  return ANTHROPIC_API_KEY.trim().length > 0;
}

function extractJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}

function responseLanguage(language) {
  return ({
    pt: 'Portuguese',
    en: 'English',
    de: 'German',
    fr: 'French',
    it: 'Italian',
    es: 'Spanish',
  })[language] || 'English';
}

async function callClaude(content, maxTokens = 1024) {
  if (!hasAnthropicApiKey()) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API error ${response.status}`);
  }

  const data = await response.json();
  const usage = data.usage || { input_tokens: 0, output_tokens: 0 };
  logApiUsage(CLAUDE_MODEL, usage.input_tokens, usage.output_tokens).catch(() => {});
  return data.content?.[0]?.text || '';
}

function buildImageInspectionPrompt(language) {
  if (language === 'pt') {
    return `Analise a imagem e identifique o produto.

Primeiro, classifique o tipo de produto:
- "fresh_produce": frutas, vegetais, cogumelos, ervas frescas in natura (sem embalagem industrializada)
- "processed_food": alimentos embalados, industrializados, com lista de ingredientes
- "cosmetic": cosméticos, maquiagem, creme, shampoo, condicionador, perfume, sabonete
- "clothing": roupas, calçados, bolsas, cintos, acessórios de moda
- "supplement": vitaminas, suplementos esportivos, proteínas em pó, remédios
- "cleaning": produtos de limpeza doméstica, detergente, sabão
- "other": qualquer outro produto não listado acima

Depois extraia:
1. Marca, nome do produto e código de barras se visível
2. Para processed_food, cosmetic e supplement: lista de ingredientes/composição se visível
3. Para clothing: composição do material/tecido se visível (ex: 100% couro, 80% algodão)
4. Para fresh_produce: apenas o nome do alimento (ex: "maçã", "banana")

Responda APENAS com JSON válido neste formato:
{
  "product_type": "fresh_produce|processed_food|cosmetic|clothing|supplement|cleaning|other",
  "product_name": "nome do produto ou null",
  "brand": "marca ou null",
  "barcode": "codigo de barras apenas numeros ou null",
  "lookup_query": "melhor termo curto para busca online ou null",
  "ingredients_visible": true ou false,
  "ingredients_text": "ingredientes ou composição extraídos ou null",
  "confidence": 0.0
}`;
  }

  return `Analyze the image and identify the product.

First, classify the product type:
- "fresh_produce": fresh fruits, vegetables, mushrooms, herbs (not industrially packaged)
- "processed_food": packaged, processed foods with an ingredient list
- "cosmetic": cosmetics, makeup, cream, shampoo, conditioner, perfume, soap
- "clothing": clothes, shoes, bags, belts, fashion accessories
- "supplement": vitamins, sports supplements, protein powder, medicines
- "cleaning": household cleaning products, detergent, soap
- "other": any other product not listed above

Then extract:
1. Brand, product name, and barcode if visible
2. For processed_food, cosmetic and supplement: ingredient/composition list if visible
3. For clothing: material/fabric composition if visible (e.g. 100% leather, 80% cotton)
4. For fresh_produce: just the food name (e.g. "apple", "banana")

Respond ONLY with valid JSON in this format:
{
  "product_type": "fresh_produce|processed_food|cosmetic|clothing|supplement|cleaning|other",
  "product_name": "product name or null",
  "brand": "brand or null",
  "barcode": "barcode digits only or null",
  "lookup_query": "best short search term for online lookup or null",
  "ingredients_visible": true or false,
  "ingredients_text": "extracted ingredients or composition or null",
  "confidence": 0.0
}`;
}

function profileDescription(profile, language) {
  const diet = profile?.dietId || 'none';
  const allergies = Array.isArray(profile?.allergyIds) && profile.allergyIds.length > 0
    ? profile.allergyIds.join(', ')
    : language === 'pt' ? 'nenhuma' : 'none';

  return { diet, allergies };
}

const ANIMAL_INGREDIENTS_COSMETICS_PT = `Derivados animais comuns em cosméticos: lanolina (lã), cera de abelha/beeswax, mel, carmim/cochonilha/E120 (inseto), colágeno, queratina, seda/sericina (inseto), glicerina animal, ácido esteárico animal, caseína (leite), elastina, esqualeno de tubarão, retinol animal, placenta animal.`;

const ANIMAL_INGREDIENTS_COSMETICS_EN = `Common animal ingredients in cosmetics: lanolin (wool), beeswax, honey, carmine/cochineal/E120 (insect), collagen, keratin, silk/sericin (insect), animal glycerin, animal stearic acid, casein (milk), elastin, shark squalene, animal retinol, animal placenta.`;

const ANIMAL_MATERIALS_CLOTHING_PT = `Materiais animais em roupas/acessórios: couro/leather (pele bovina), lã/wool (ovelha), seda/silk (bicho-da-seda), plumas/penas/down (aves), pele/fur (animal), caxemira/cashmere (cabra), angora (coelho), alpaca, camelo, lambswool (ovelha jovem).`;

const ANIMAL_MATERIALS_CLOTHING_EN = `Animal materials in clothing/accessories: leather (bovine skin), wool (sheep), silk (silkworm), down/feathers (birds), fur (animal), cashmere (goat), angora (rabbit), alpaca, camel, lambswool (young sheep).`;

function buildEvaluationPrompt(ingredientsText, product, profile, language, source, productType = 'processed_food') {
  const { diet, allergies } = profileDescription(profile, language);
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || (language === 'pt' ? 'produto desconhecido' : 'unknown product');
  const outputLanguage = responseLanguage(language);

  const isCosmetic = ['cosmetic', 'cleaning', 'supplement'].includes(productType);
  const isClothing = productType === 'clothing';

  if (language === 'pt') {
    let context = '';
    if (isCosmetic) context = `\nEste é um produto não-alimentar (${productType}). Verifique derivados animais na composição.\n${ANIMAL_INGREDIENTS_COSMETICS_PT}`;
    if (isClothing) context = `\nEste é um produto de vestuário/acessório. Verifique materiais de origem animal.\n${ANIMAL_MATERIALS_CLOTHING_PT}`;

    return `Você é um especialista em análise de produtos para diferentes estilos de vida e dietas. O usuário tem o seguinte perfil:
- Dieta/Estilo de vida: ${diet}
- Alergias: ${allergies}
${context}
Produto: ${productName}
Origem: ${source}
Composição/Ingredientes:
${ingredientsText}

Analise e verifique se o produto é adequado para este perfil.

Regras importantes:
- Para dieta "vegan": qualquer ingrediente ou material de origem animal = NOT_SAFE
- Para dieta "vegetarian": carne, peixe, frutos do mar = NOT_SAFE; laticínios e ovos = SAFE
- Para dieta "glutenFree": trigo, centeio, cevada, aveia contaminada = NOT_SAFE
- Para alergias/sensibilidades: o ingrediente, material ou sensibilizante específico = NOT_SAFE
- Se houver ingrediente ambíguo (pode ser animal ou vegetal), use CAUTION

Responda APENAS com JSON válido neste formato exato:
{
  "status": "SAFE" ou "CAUTION" ou "NOT_SAFE",
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação detalhada em português (2-4 frases)",
  "concerns": ["ingrediente ou material problemático"],
  "cannot_read": false,
  "product_name": "${productName}",
  "ingredients_source": "${source}",
  "normalized_ingredients": []
}`;
  }

  let context = '';
  if (isCosmetic) context = `\nThis is a non-food product (${productType}). Check for animal-derived ingredients.\n${ANIMAL_INGREDIENTS_COSMETICS_EN}`;
  if (isClothing) context = `\nThis is a clothing/accessory product. Check for animal-derived materials.\n${ANIMAL_MATERIALS_CLOTHING_EN}`;

  return `You are an expert in product analysis for different lifestyles and diets. The user has this profile:
- Diet/Lifestyle: ${diet}
- Allergies: ${allergies}
${context}
Product: ${productName}
Source: ${source}
Composition/Ingredients:
${ingredientsText}

Analyze and verify if the product is suitable for this profile.

Important rules:
- For "vegan" diet: any animal-derived ingredient or material = NOT_SAFE
- For "vegetarian" diet: meat, fish, seafood = NOT_SAFE; dairy and eggs = SAFE
- For "glutenFree" diet: wheat, rye, barley, contaminated oats = NOT_SAFE
- For allergies/sensitivities: the specific allergen ingredient, material, or sensitizer = NOT_SAFE
- If an ingredient is ambiguous (could be animal or plant), use CAUTION

Respond ONLY with valid JSON in this exact format:
{
  "status": "SAFE" or "CAUTION" or "NOT_SAFE",
  "title": "short title in ${outputLanguage} (max 10 words)",
  "explanation": "detailed explanation in ${outputLanguage} (2-4 sentences)",
  "concerns": ["problematic ingredient or material"],
  "cannot_read": false,
  "product_name": "${productName}",
  "ingredients_source": "${source}",
  "normalized_ingredients": []
}`;
}

function stripDataUri(base64) {
  const match = base64.match(/^data:([^;]+);base64,(.+)$/s);
  if (match) return { data: match[2], type: match[1] };
  return { data: base64, type: null };
}

function detectMediaType(base64) {
  if (base64.startsWith('iVBOR')) return 'image/png';
  if (base64.startsWith('/9j/')) return 'image/jpeg';
  if (base64.startsWith('R0lGOD')) return 'image/gif';
  if (base64.startsWith('UklGR')) return 'image/webp';
  return 'image/jpeg';
}

export async function inspectProductImage(imageBase64, language, mediaType = 'image/jpeg') {
  const { data, type } = stripDataUri(imageBase64);
  imageBase64 = data;
  mediaType = type || detectMediaType(imageBase64);
  const text = await callClaude([
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: imageBase64,
      },
    },
    {
      type: 'text',
      text: buildImageInspectionPrompt(language),
    },
  ]);

  return extractJson(text);
}

function buildNeutralEvaluationPrompt(ingredientsText, product, language, source, productType) {
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || (language === 'pt' ? 'produto desconhecido' : 'unknown product');
  const isCosmetic = ['cosmetic', 'cleaning', 'supplement'].includes(productType);
  const isClothing = productType === 'clothing';
  const outputLanguage = responseLanguage(language);

  if (language === 'pt') {
    let context = '';
    if (isCosmetic) context = `\nEste é um produto não-alimentar (${productType}).\n${ANIMAL_INGREDIENTS_COSMETICS_PT}\n`;
    if (isClothing) context = `\nEste é um produto de vestuário/acessório.\n${ANIMAL_MATERIALS_CLOTHING_PT}\n`;

    return `Você é um especialista em composição de produtos. Analise os ingredientes abaixo e classifique cada componente por categoria — sem julgamento de perfil alimentar.
${context}
Produto: ${productName}
Origem: ${source}
Composição/Ingredientes:
${ingredientsText}

Classifique:
- "animal_derived": todos de origem animal (laticínios, ovos, mel, gelatina, cera de abelha, carmim, colágeno, etc.)
- "meat_fish": carnes, aves, peixes e frutos do mar especificamente
- "gluten": fontes de glúten (trigo, centeio, cevada, aveia)
- "allergens": ingredientes/materiais por categoria padrão de alergia ou sensibilidade, incluindo alimentos, cosméticos, higiene e roupas
- "ambiguous": ingredientes que PODEM ser animais mas sem especificação de origem (ex: "lecitina", "glicerina")
- "summary": descrição neutra da composição em 2-3 frases
- "normalized_ingredients": lista dos ingredientes em português (traduza e normalize do rótulo original, mantendo nomes técnicos)

Responda APENAS com JSON válido:
{
  "product_name": "${productName}",
  "ingredients_source": "${source}",
  "cannot_read": false,
  "summary": "descrição neutra em português",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
  }

  let context = '';
  if (isCosmetic) context = `\nThis is a non-food product (${productType}).\n${ANIMAL_INGREDIENTS_COSMETICS_EN}\n`;
  if (isClothing) context = `\nThis is a clothing/accessory product.\n${ANIMAL_MATERIALS_CLOTHING_EN}\n`;

  return `You are an expert in product composition. Analyze the ingredients below and classify each component by category — without any dietary profile judgment.
${context}
Product: ${productName}
Source: ${source}
Composition/Ingredients:
${ingredientsText}

Classify:
- "animal_derived": all animal-derived (dairy, eggs, honey, gelatin, beeswax, carmine, collagen, etc.)
- "meat_fish": meats, poultry, fish, and seafood specifically
- "gluten": gluten sources (wheat, rye, barley, oats)
- "allergens": ingredients/materials by standard allergy or sensitivity category, including food, cosmetics, hygiene, and clothing
- "ambiguous": ingredients that MAY be animal-derived without specified origin (e.g. "lecithin", "glycerin")
- "summary": neutral description of composition in 2-3 sentences
- "normalized_ingredients": list of ingredient names in ${outputLanguage} (translated and normalized from the original label, keeping technical names)

Respond ONLY with valid JSON:
{
  "product_name": "${productName}",
  "ingredients_source": "${source}",
  "cannot_read": false,
  "summary": "neutral description in ${outputLanguage}",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
}

function buildNonFoodKnowledgeNeutralPrompt(product, language, productType) {
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || (language === 'pt' ? 'produto desconhecido' : 'unknown product');
  const isCosmetic = ['cosmetic', 'cleaning', 'supplement'].includes(productType);
  const isClothing = productType === 'clothing';
  const outputLanguage = responseLanguage(language);

  if (language === 'pt') {
    let context = '';
    if (isCosmetic) context = `\n${ANIMAL_INGREDIENTS_COSMETICS_PT}\n`;
    if (isClothing) context = `\n${ANIMAL_MATERIALS_CLOTHING_PT}\n`;

    return `Você é um especialista com amplo conhecimento de produtos do mercado. A composição não está visível — analise com base no seu conhecimento sobre este produto.
${context}
Produto: ${productName}
Tipo: ${productType}

Classifique os componentes PROVÁVEIS deste produto:
- "animal_derived": derivados animais tipicamente presentes neste tipo de produto
- "meat_fish": sempre vazio para este tipo de produto
- "gluten": vazio, a não ser que haja ingrediente alimentar com glúten
- "allergens": alérgenos/sensibilizantes conhecidos deste produto específico, incluindo alimentos, cosméticos, higiene e roupas
- "ambiguous": componentes sobre os quais há incerteza — prefira aqui em vez de "animal_derived" se não tiver certeza
- "summary": descrição neutra em 2-3 frases
- "normalized_ingredients": prováveis ingredientes/componentes deste produto em português

Responda APENAS com JSON válido:
{
  "product_name": "${productName}",
  "ingredients_source": "knowledge",
  "cannot_read": false,
  "summary": "descrição neutra em português",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
  }

  let context = '';
  if (isCosmetic) context = `\n${ANIMAL_INGREDIENTS_COSMETICS_EN}\n`;
  if (isClothing) context = `\n${ANIMAL_MATERIALS_CLOTHING_EN}\n`;

  return `You are an expert with broad knowledge of market products. The composition is not visible — analyze based on your knowledge of this product.
${context}
Product: ${productName}
Type: ${productType}

Classify the LIKELY components of this product:
- "animal_derived": animal-derived ingredients typically present in this type of product
- "meat_fish": always empty for this type of product
- "gluten": empty unless there is a food ingredient with gluten
- "allergens": known allergens/sensitizers in this specific product, including food, cosmetics, hygiene, and clothing
- "ambiguous": components you are uncertain about — prefer this over "animal_derived" when unsure
- "summary": neutral description in 2-3 sentences
- "normalized_ingredients": likely ingredients/components of this product in ${outputLanguage}

Respond ONLY with valid JSON:
{
  "product_name": "${productName}",
  "ingredients_source": "knowledge",
  "cannot_read": false,
  "summary": "neutral description in ${outputLanguage}",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
}

export async function analyzeNonFoodByKnowledge(product, language, productType) {
  const text = await callClaude([
    { type: 'text', text: buildNonFoodKnowledgeNeutralPrompt(product, language, productType) },
  ]);

  return extractJson(text);
}

function buildFreshProduceNeutralPrompt(product, language) {
  const productName = product?.product_name || (language === 'pt' ? 'alimento in natura' : 'fresh produce');
  const outputLanguage = responseLanguage(language);

  if (language === 'pt') {
    return `Você é um especialista em nutrição. Analise o alimento in natura identificado abaixo.

Alimento: ${productName}

Classifique:
- "animal_derived": vazio para frutas/vegetais/cogumelos (são de origem vegetal por natureza)
- "meat_fish": sempre vazio para alimentos in natura
- "gluten": apenas se for cereal com glúten (trigo, cevada, centeio)
- "allergens": apenas se este alimento for um alérgeno comum (amendoim → peanuts, castanhas → nuts, etc.)
- "ambiguous": geralmente vazio; mencione apenas se houver cobertura de cera comercial com shellac/E904
- "summary": descrição neutra em 1-2 frases
- "normalized_ingredients": nome do alimento em português (ex: ["Maçã Fuji"])

Responda APENAS com JSON válido:
{
  "product_name": "${productName}",
  "ingredients_source": "knowledge",
  "cannot_read": false,
  "summary": "descrição neutra em português",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
  }

  return `You are a nutrition expert. Analyze the fresh produce item identified below.

Item: ${productName}

Classify:
- "animal_derived": empty for fruits/vegetables/mushrooms (plant-based by nature)
- "meat_fish": always empty for fresh produce
- "gluten": only if it is a gluten-containing grain (wheat, barley, rye)
- "allergens": only if this specific food is a common allergen (peanuts → peanuts, tree nuts → nuts, etc.); keep non-food sensitivity arrays empty for fresh produce
- "ambiguous": generally empty; mention only if commercial wax coating with shellac/E904 is likely
- "summary": neutral description in 1-2 sentences
- "normalized_ingredients": food item name in ${outputLanguage} (e.g. ["Fuji Apple"])

Respond ONLY with valid JSON:
{
  "product_name": "${productName}",
  "ingredients_source": "knowledge",
  "cannot_read": false,
  "summary": "neutral description in ${outputLanguage}",
  "animal_derived": [],
  "meat_fish": [],
  "gluten": [],
  "allergens": {
    "dairy": [],
    "eggs": [],
    "gluten": [],
    "nuts": [],
    "tree_nuts": [],
    "peanuts": [],
    "soy": [],
    "shellfish": [],
    "fish": [],
    "sesame": [],
    "wheat": [],
    "fragrance": [],
    "essential_oils": [],
    "latex": [],
    "nickel": [],
    "lanolin": [],
    "formaldehyde": [],
    "parabens": [],
    "sulfates": [],
    "dyes": [],
    "wool": []
  },
  "ambiguous": [],
  "normalized_ingredients": []
}`;
}

export async function analyzeFreshProduce(product, language) {
  const text = await callClaude([
    { type: 'text', text: buildFreshProduceNeutralPrompt(product, language) },
  ]);

  return extractJson(text);
}

export async function analyzeIngredients(ingredientsText, product, language, source, productType = 'processed_food') {
  const text = await callClaude([
    {
      type: 'text',
      text: buildNeutralEvaluationPrompt(ingredientsText, product, language, source, productType),
    },
  ]);

  return extractJson(text);
}

export async function evaluateProductIngredients(ingredientsText, product, profile, language, source, productType = 'processed_food') {
  const text = await callClaude([
    {
      type: 'text',
      text: buildEvaluationPrompt(ingredientsText, product, profile, language, source, productType),
    },
  ]);

  return extractJson(text);
}

function buildKnowledgePrompt(product, profile, language) {
  const { diet, allergies } = profileDescription(profile, language);
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || null;
  const barcode = product?.barcode || null;
  const productType = product?.product_type || 'processed_food';
  const outputLanguage = responseLanguage(language);

  if (language === 'pt') {
    if (productType === 'fresh_produce') {
      return `Você é um especialista em nutrição e estilos de vida.

O usuário tem o seguinte perfil:
- Dieta/Estilo de vida: ${diet}
- Alergias: ${allergies}

Foi fotografado um alimento in natura: ${productName || 'fruta ou vegetal não identificado'}

Alimentos in natura (frutas, vegetais, cogumelos, ervas) são inerentemente de origem vegetal.
- Para dietas vegana, vegetariana, pescatariana e onívora: SEMPRE são SAFE por definição
- Verifique apenas se há alergia específica declarada a este alimento
- Observação: algumas frutas comerciais têm cobertura de cera (carnaúba = vegana; shellac/E904 = não-vegana), mas isso raramente é relevante

Responda APENAS com JSON válido:
{
  "status": "SAFE" ou "NOT_SAFE" (se houver alergia específica),
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação em português (1-2 frases)",
  "concerns": [],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'alimento in natura'}",
  "ingredients_source": "knowledge",
  "normalized_ingredients": ["${productName || 'alimento in natura'}"]
}`;
    }

    const typeContext = productType === 'cosmetic' || productType === 'cleaning'
      ? `\nEste é um produto não-alimentar (${productType}).\n${ANIMAL_INGREDIENTS_COSMETICS_PT}`
      : productType === 'clothing'
        ? `\nEste é um produto de vestuário/acessório.\n${ANIMAL_MATERIALS_CLOTHING_PT}`
        : '';

    return `Você é um especialista com amplo conhecimento de produtos do mercado.

O usuário tem o seguinte perfil:
- Dieta/Estilo de vida: ${diet}
- Alergias: ${allergies}
${typeContext}
Produto identificado na foto: ${productName || 'desconhecido'}${barcode ? ` (código: ${barcode})` : ''}

A composição/ingredientes não estavam visíveis. Use seu conhecimento sobre este produto para determinar se é adequado para este perfil.

Regras:
- Para "vegan": qualquer derivado animal = NOT_SAFE
- Para "vegetarian": carne/peixe = NOT_SAFE
- Para alergias/sensibilidades: ingrediente, material ou sensibilizante específico = NOT_SAFE
- Se incerto sobre a composição do produto, use CAUTION
- Liste os ingredientes típicos conhecidos deste produto em português no campo "normalized_ingredients"

Responda APENAS com JSON válido:
{
  "status": "SAFE" ou "CAUTION" ou "NOT_SAFE",
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação em português (2-3 frases)",
  "concerns": ["ingrediente ou material preocupante"],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'desconhecido'}",
  "ingredients_source": "knowledge",
  "normalized_ingredients": ["ingrediente típico 1", "ingrediente típico 2"]
}`;
  }

  if (productType === 'fresh_produce') {
    return `You are a nutrition and lifestyle expert.

User profile:
- Diet/Lifestyle: ${diet}
- Allergies: ${allergies}

A fresh, unprocessed food was photographed: ${productName || 'unidentified fruit or vegetable'}

Fresh produce (fruits, vegetables, mushrooms, herbs) are inherently plant-based.
- For vegan, vegetarian, pescatarian, and omnivore diets: always SAFE by definition
- Only check if there is a specific declared allergy to this food

Respond ONLY with valid JSON:
{
  "status": "SAFE" or "NOT_SAFE" (only if specific allergy applies),
  "title": "short title in ${outputLanguage} (max 10 words)",
  "explanation": "explanation in ${outputLanguage} (1-2 sentences)",
  "concerns": [],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'fresh produce'}",
  "ingredients_source": "knowledge",
  "normalized_ingredients": ["${productName || 'fresh produce'}"]
}`;
  }

  const typeContext = productType === 'cosmetic' || productType === 'cleaning'
    ? `\nThis is a non-food product (${productType}).\n${ANIMAL_INGREDIENTS_COSMETICS_EN}`
    : productType === 'clothing'
      ? `\nThis is a clothing/accessory product.\n${ANIMAL_MATERIALS_CLOTHING_EN}`
      : '';

  return `You are an expert with broad knowledge of market products.

User profile:
- Diet/Lifestyle: ${diet}
- Allergies: ${allergies}
${typeContext}
Product identified in the photo: ${productName || 'unknown'}${barcode ? ` (barcode: ${barcode})` : ''}

The composition/ingredients were not visible. Use your knowledge about this product to determine if it is suitable for this profile.

Rules:
- For "vegan": any animal-derived ingredient or material = NOT_SAFE
- For "vegetarian": meat/fish = NOT_SAFE
- For allergies/sensitivities: the specific allergen ingredient, material, or sensitizer = NOT_SAFE
- If unsure about product composition, use CAUTION
- List typical known ingredients for this product in ${outputLanguage} under "normalized_ingredients"

Respond ONLY with valid JSON:
{
  "status": "SAFE" or "CAUTION" or "NOT_SAFE",
  "title": "short title in ${outputLanguage} (max 10 words)",
  "explanation": "explanation in ${outputLanguage} (2-3 sentences)",
  "concerns": ["concerning ingredient or material"],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'unknown'}",
  "ingredients_source": "knowledge",
  "normalized_ingredients": ["typical ingredient 1", "typical ingredient 2"]
}`;
}

export async function analyzeProductByKnowledge(product, profile, language) {
  const text = await callClaude([
    {
      type: 'text',
      text: buildKnowledgePrompt(product, profile, language),
    },
  ]);

  return extractJson(text);
}

export function buildMissingIngredientsResult(product, language) {
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ');
  const messages = {
    pt: {
      title: 'Ingredientes não encontrados',
      withProduct: 'A imagem não mostrou ingredientes legíveis e não encontramos uma lista confiável para este produto. Tire uma foto da lista de ingredientes para uma análise segura.',
      withoutProduct: 'Não foi possível identificar o produto nem ler ingredientes na imagem. Tire uma foto da frente do produto ou da lista de ingredientes.',
    },
    en: {
      title: 'Ingredients not found',
      withProduct: 'The image did not show readable ingredients and no reliable ingredient list was found for this product. Take a photo of the ingredient list for a safer analysis.',
      withoutProduct: 'The product could not be identified and no ingredients were readable in the image. Take a photo of the product front or ingredient list.',
    },
    de: {
      title: 'Zutaten nicht gefunden',
      withProduct: 'Das Bild zeigte keine lesbaren Zutaten und es wurde keine verlässliche Zutatenliste für dieses Produkt gefunden. Fotografiere die Zutatenliste für eine sicherere Analyse.',
      withoutProduct: 'Das Produkt konnte nicht erkannt werden und im Bild waren keine Zutaten lesbar. Fotografiere die Vorderseite des Produkts oder die Zutatenliste.',
    },
    fr: {
      title: 'Ingrédients introuvables',
      withProduct: 'L’image ne montrait pas d’ingrédients lisibles et aucune liste fiable n’a été trouvée pour ce produit. Prenez une photo de la liste des ingrédients pour une analyse plus sûre.',
      withoutProduct: 'Le produit n’a pas pu être identifié et aucun ingrédient n’était lisible sur l’image. Prenez une photo de la face avant du produit ou de la liste des ingrédients.',
    },
    it: {
      title: 'Ingredienti non trovati',
      withProduct: 'L’immagine non mostrava ingredienti leggibili e non è stata trovata una lista affidabile per questo prodotto. Scatta una foto della lista ingredienti per un’analisi più sicura.',
      withoutProduct: 'Non è stato possibile identificare il prodotto né leggere ingredienti nell’immagine. Scatta una foto del fronte del prodotto o della lista ingredienti.',
    },
    es: {
      title: 'Ingredientes no encontrados',
      withProduct: 'La imagen no mostró ingredientes legibles y no se encontró una lista fiable para este producto. Toma una foto de la lista de ingredientes para un análisis más seguro.',
      withoutProduct: 'No se pudo identificar el producto ni leer ingredientes en la imagen. Toma una foto del frente del producto o de la lista de ingredientes.',
    },
  };
  const text = messages[language] || messages.en;

  return {
    status: 'CAUTION',
    title: productName || text.title,
    explanation: productName ? text.withProduct : text.withoutProduct,
    concerns: [],
    cannot_read: true,
    product_name: productName || null,
    ingredients_source: 'missing',
    normalized_ingredients: [],
  };
}
