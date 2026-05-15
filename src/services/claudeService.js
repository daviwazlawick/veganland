import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-opus-4-7';

export function hasAnthropicApiKey() {
  return ANTHROPIC_API_KEY.trim().length > 0;
}

function buildProfileDescription(profile, lang) {
  const diet = DIETS.find(d => d.id === profile.dietId);
  const dietLabel = diet ? diet.label[lang] : profile.dietId;
  const allergyLabels = (profile.allergyIds || []).map(id => {
    const allergy = ALLERGIES.find(a => a.id === id);
    return allergy ? allergy.label[lang] : id;
  });
  return { dietLabel, allergyLabels };
}

function extractJson(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');
  return JSON.parse(jsonMatch[0]);
}

async function callClaude(content, maxTokens = 1024) {
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
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

function buildImageInspectionPrompt(lang) {
  if (lang === 'pt') {
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

function buildEvaluationPrompt(ingredientsText, product, profile, lang, source) {
  const { dietLabel, allergyLabels } = buildProfileDescription(profile, lang);
  const allergyText = allergyLabels.length > 0
    ? allergyLabels.join(', ')
    : lang === 'pt' ? 'nenhuma' : 'none';
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ') || 'produto desconhecido';

  if (lang === 'pt') {
    return `Você é um assistente de segurança alimentar especializado. O usuário tem o seguinte perfil dietético:
- Dieta: ${dietLabel}
- Alergias: ${allergyText}

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

  return `You are a specialized food safety assistant. The user has the following dietary profile:
- Diet: ${dietLabel}
- Allergies: ${allergyText}

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

export async function inspectProductImage(imageBase64, lang) {
  const text = await callClaude([
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: imageBase64,
      },
    },
    {
      type: 'text',
      text: buildImageInspectionPrompt(lang),
    },
  ]);

  return extractJson(text);
}

export async function evaluateProductIngredients(ingredientsText, product, profile, lang, source) {
  const text = await callClaude([
    {
      type: 'text',
      text: buildEvaluationPrompt(ingredientsText, product, profile, lang, source),
    },
  ]);

  return extractJson(text);
}

export function buildMissingIngredientsResult(product, lang) {
  const productName = [product?.brand, product?.product_name].filter(Boolean).join(' ');

  if (lang === 'pt') {
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
