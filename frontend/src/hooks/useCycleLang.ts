import { useLangStore } from '../stores/useLangStore';
import type { Language } from '../types';

const LANGUAGE_CYCLE: Record<Language, Language> = {
  en: 'badini',
  badini: 'ar',
  ar: 'sorani',
  sorani: 'en'
};

export function useCycleLang() {
  const { lang, setLang } = useLangStore();
  
  const cycleLang = () => {
    setLang(LANGUAGE_CYCLE[lang]);
  };
  
  return { cycleLang, currentLang: lang };
}