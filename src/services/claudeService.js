import { DIETS } from '../constants/diets';
import { ALLERGIES } from '../constants/allergies';

function buildProfileDescription(profile, lang) {
  const diet = DIETS.find(d => d.id === profile.dietId);
  const dietLabel = diet ? diet.label[lang] : profile.dietId;
  const allergyLabels = (profile.allergyIds || []).map(id => {
    const allergy = ALLERGIES.find(a => a.id === id);
    return allergy ? allergy.label[lang] : id;
  });
  return { dietLabel, allergyLabels };
}

function buildPrompt(profile, lang) {
  const { dietLabel, allergyLabels } = buildProfileDescription(profile, lang);
  const allergyText = allergyLabels.length > 0
    ? allergyLabels.join(', ')
    : lang === 'pt' ? 'nenhuma' : 'none';

  if (lang === 'pt') {
    return `Você é um assistente de segurança alimentar especializado. O usuário tem o seguinte perfil dietético:
- Dieta: ${dietLabel}
- Alergias: ${allergyText}

Analise a imagem do produto (rótulo, lista de ingredientes, embalagem) e verifique se é seguro para este perfil.

IMPORTANTE: Procure pela lista de ingredientes e informações nutricionais visíveis na imagem.

Responda APENAS com JSON válido neste formato exato:
{
  "status": "SAFE" ou "CAUTION" ou "NOT_SAFE",
  "title": "título curto em português (máximo 10 palavras)",
  "explanation": "explicação detalhada em português (2-4 frases)",
  "concerns": ["ingrediente1", "ingrediente2"],
  "cannot_read": false
}

Se não conseguir ler os ingredientes claramente, use cannot_read: true e status: "CAUTION".
Seja conservador: na dúvida, use CAUTION em vez de SAFE.`;
  }

  return `You are a specialized food safety assistant. The user has the following dietary profile:
- Diet: ${dietLabel}
- Allergies: ${allergyText}

Analyze the product image (label, ingredient list, packaging) and verify if it is safe for this profile.

IMPORTANT: Look for the ingredient list and nutritional information visible in the image.

Respond ONLY with valid JSON in this exact format:
{
  "status": "SAFE" or "CAUTION" or "NOT_SAFE",
  "title": "short title in English (max 10 words)",
  "explanation": "detailed explanation in English (2-4 sentences)",
  "concerns": ["ingredient1", "ingredient2"],
  "cannot_read": false
}

If you cannot clearly read the ingredients, use cannot_read: true and status: "CAUTION".
Be conservative: when in doubt, use CAUTION instead of SAFE.`;
}

export async function analyzeProduct(imageBase64, profile, lang, apiKey) {
  const prompt = buildPrompt(profile, lang);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
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
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Invalid response format');

  return JSON.parse(jsonMatch[0]);
}
