import pt from './pt';
import en from './en';
import de from './de';
import fr from './fr';
import it from './it';
import es from './es';

const translations = { pt, en, de, fr, it, es };

export const LANGUAGES = [
  { code: 'pt', name: 'Português', flag: '🇧🇷', locale: 'pt-BR' },
  { code: 'en', name: 'English', flag: '🇺🇸', locale: 'en-US' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', locale: 'de-DE' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', locale: 'fr-FR' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', locale: 'it-IT' },
  { code: 'es', name: 'Español', flag: '🇪🇸', locale: 'es-ES' },
];

export const t = (lang, key, params = {}) => {
  const keys = key.split('.');
  let value = translations[lang] || translations.pt;
  let fallback = translations.en;
  for (const k of keys) {
    value = value?.[k];
    fallback = fallback?.[k];
  }
  const text = value || fallback || key;
  if (typeof text !== 'string') return text;
  return Object.entries(params).reduce(
    (acc, [param, replacement]) => acc.replaceAll(`{{${param}}}`, String(replacement)),
    text
  );
};

export const localeFor = (lang) => LANGUAGES.find(item => item.code === lang)?.locale || 'en-US';

export default translations;
