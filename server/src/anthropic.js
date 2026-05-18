import './env.js';

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
  return data.content?.[0]?.text || '';
}

function buildImageInspectionPrompt(language) {
  if (language === 'pt') {
    return `Analise a imagem de um produto alimentício.

Objetivo:
1. Identificar marca, nome do produto e código de barras se estiver visível.
2. Extrair a lista de ingredientes se ela estiver visível.
3. Se a foto NÃO mostrar ingredientes legíveis, ainda tente identificar o produto para uma busca externa posterior.

Responda APENAS com JSON válido neste formato:
{
  "product_name": "nome do produto ou null",
  "brand": "marca ou null",
  "barcode": "codigo de barras apenas numeros ou null",
  "lookup_query": "melhor termo curto para buscar ingredientes online ou null",
  "ingredients_visible": true ou false,
  "ingredients_text": "ingredientes extraidos ou null",
  "confidence": 0.0
}`;
  }

  return `Analyze this food product image.

Goal:
1. Identify brand, product name, and barcode if visible.
2. Extract the ingredient list if it is visible.
3. If the photo does NOT show readable ingredients, still identify the product for a later external lookup.

Respond ONLY with valid JSON in this format:
{
  "product_name": "product name or null",
  "brand": "brand or null",
  "barcode": "barcode digits only or null",
  "lookup_query": "best short search term for online ingredient lookup or null",
  "ingredients_visible": true or false,
  "ingredients_text": "extracted ingredients or null",
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

function buildEvaluationPrompt(ingredientsText, product, profile, language, source) {
  const { diet, allergies } = profileDescription(profile, language);
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || 'produto desconhecido';

  if (language === 'pt') {
    return `Você é um assistente de segurança alimentar especializado. O usuário tem o seguinte perfil dietético:
- Dieta: ${diet}
- Alergias: ${allergies}

Produto: ${productName}
Origem dos ingredientes: ${source}
Ingredientes:
${ingredientsText}

Analise os ingredientes e verifique se o produto é seguro para este perfil.

Responda APENAS com JSON válido neste formato exato:
{
  "status": "SAFE" ou "CAUTION" ou "NOT_SAFE",
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação detalhada em português (2-4 frases)",
  "concerns": ["ingrediente1", "ingrediente2"],
  "cannot_read": false,
  "product_name": "${productName}",
  "ingredients_source": "${source}"
}

Seja conservador: na dúvida, use CAUTION em vez de SAFE.`;
  }

  return `You are a specialized food safety assistant. The user has this dietary profile:
- Diet: ${diet}
- Allergies: ${allergies}

Product: ${productName}
Ingredient source: ${source}
Ingredients:
${ingredientsText}

Analyze the ingredients and verify if the product is safe for this profile.

Respond ONLY with valid JSON in this exact format:
{
  "status": "SAFE" or "CAUTION" or "NOT_SAFE",
  "title": "short title in English (max 10 words)",
  "explanation": "detailed explanation in English (2-4 sentences)",
  "concerns": ["ingredient1", "ingredient2"],
  "cannot_read": false,
  "product_name": "${productName}",
  "ingredients_source": "${source}"
}

Be conservative: when in doubt, use CAUTION instead of SAFE.`;
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

export async function evaluateProductIngredients(ingredientsText, product, profile, language, source) {
  const text = await callClaude([
    {
      type: 'text',
      text: buildEvaluationPrompt(ingredientsText, product, profile, language, source),
    },
  ]);

  return extractJson(text);
}

function buildKnowledgePrompt(product, profile, language) {
  const { diet, allergies } = profileDescription(profile, language);
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || null;
  const barcode = product?.barcode || null;

  if (language === 'pt') {
    return `Você é um especialista em segurança alimentar com amplo conhecimento de produtos do mercado.

O usuário tem o seguinte perfil dietético:
- Dieta: ${diet}
- Alergias: ${allergies}

Produto identificado na foto: ${productName || 'desconhecido'}${barcode ? ` (código de barras: ${barcode})` : ''}

Não foi possível obter a lista de ingredientes deste produto. Use seu conhecimento sobre este produto (composição típica, categoria, marca) para:
1. Determinar se provavelmente é adequado para o perfil dietético
2. Listar ingredientes típicos que podem ser problemáticos

IMPORTANTE: Seja conservador. Se não tiver certeza sobre o produto, use CAUTION.

Responda APENAS com JSON válido neste formato:
{
  "status": "SAFE" ou "CAUTION" ou "NOT_SAFE",
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação em português mencionando que a análise é baseada no conhecimento geral do produto (2-4 frases)",
  "concerns": ["ingrediente ou aspecto preocupante"],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'desconhecido'}",
  "ingredients_source": "knowledge"
}`;
  }

  return `You are a food safety expert with broad knowledge of market products.

User dietary profile:
- Diet: ${diet}
- Allergies: ${allergies}

Product identified in the photo: ${productName || 'unknown'}${barcode ? ` (barcode: ${barcode})` : ''}

The ingredient list for this product was not available. Use your knowledge about this product (typical composition, category, brand) to:
1. Determine if it is likely suitable for the dietary profile
2. List typical ingredients that may be problematic

IMPORTANT: Be conservative. If unsure about the product, use CAUTION.

Respond ONLY with valid JSON in this format:
{
  "status": "SAFE" or "CAUTION" or "NOT_SAFE",
  "title": "short title in English (max 10 words)",
  "explanation": "explanation in English mentioning the analysis is based on general product knowledge (2-4 sentences)",
  "concerns": ["concerning ingredient or aspect"],
  "cannot_read": false,
  "knowledge_based": true,
  "product_name": "${productName || 'unknown'}",
  "ingredients_source": "knowledge"
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

  if (language === 'pt') {
    return {
      status: 'CAUTION',
      title: productName || 'Ingredientes não encontrados',
      explanation: productName
        ? 'A imagem não mostrou ingredientes legíveis e não encontramos uma lista confiável para este produto. Tire uma foto da lista de ingredientes para uma análise segura.'
        : 'Não foi possível identificar o produto nem ler ingredientes na imagem. Tire uma foto da frente do produto ou da lista de ingredientes.',
      concerns: [],
      cannot_read: true,
      product_name: productName || null,
      ingredients_source: 'missing',
    };
  }

  return {
    status: 'CAUTION',
    title: productName || 'Ingredients not found',
    explanation: productName
      ? 'The image did not show readable ingredients and no reliable ingredient list was found for this product. Take a photo of the ingredient list for a safer analysis.'
      : 'The product could not be identified and no ingredients were readable in the image. Take a photo of the product front or ingredient list.',
    concerns: [],
    cannot_read: true,
    product_name: productName || null,
    ingredients_source: 'missing',
  };
}
