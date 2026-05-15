import pt from './pt';
import en from './en';

const translations = { pt, en };

export const t = (lang, key) => {
  const keys = key.split('.');
  let value = translations[lang] || translations.pt;
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
};

export default translations;
