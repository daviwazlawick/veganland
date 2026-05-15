export const DIETS = [
  {
    id: 'vegan',
    icon: '🌱',
    label: { pt: 'Vegano', en: 'Vegan' },
    description: { pt: 'Sem nenhum produto animal', en: 'No animal products whatsoever' },
    restrictions: ['meat', 'fish', 'dairy', 'eggs', 'honey', 'gelatin', 'lard', 'whey', 'casein', 'albumin'],
  },
  {
    id: 'vegetarian',
    icon: '🥗',
    label: { pt: 'Vegetariano', en: 'Vegetarian' },
    description: { pt: 'Sem carne ou peixe', en: 'No meat or fish' },
    restrictions: ['meat', 'fish', 'gelatin', 'lard'],
  },
  {
    id: 'pescatarian',
    icon: '🐟',
    label: { pt: 'Pescetariano', en: 'Pescatarian' },
    description: { pt: 'Vegetariano + peixe', en: 'Vegetarian + fish' },
    restrictions: ['meat', 'gelatin', 'lard'],
  },
  {
    id: 'gluten_free',
    icon: '🌾',
    label: { pt: 'Sem Glúten', en: 'Gluten-Free' },
    description: { pt: 'Sem trigo, cevada ou centeio', en: 'No wheat, barley or rye' },
    restrictions: ['gluten', 'wheat', 'barley', 'rye', 'oats'],
  },
  {
    id: 'halal',
    icon: '☪️',
    label: { pt: 'Halal', en: 'Halal' },
    description: { pt: 'Conforme a lei islâmica', en: 'Compliant with Islamic law' },
    restrictions: ['pork', 'alcohol', 'lard', 'gelatin_pork'],
  },
  {
    id: 'omnivore',
    icon: '🍽️',
    label: { pt: 'Onívoro', en: 'Omnivore' },
    description: { pt: 'Sem restrições alimentares', en: 'No dietary restrictions' },
    restrictions: [],
  },
];
