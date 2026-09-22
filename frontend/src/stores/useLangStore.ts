import { create } from 'zustand';
import { Language, VALID_LANGS } from '../types';
import i18n from '../i18n';

function readLangStored(): Language {
  try {
    const raw = localStorage.getItem('rekxare_lang');
    if (raw && VALID_LANGS.includes(raw as Language)) return raw as Language;
  } catch {}
  return 'badini';
}

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: readLangStored(),
  setLang: (lang) => {
    const safe = VALID_LANGS.includes(lang) ? lang : 'badini';
    try { localStorage.setItem('rekxare_lang', safe); } catch {}
    i18n.changeLanguage(safe);
    document.documentElement.dir = safe === 'ar' || safe === 'badini' || safe === 'sorani' ? 'rtl' : 'ltr';
    document.documentElement.lang = safe;
    set({ lang: safe });
  }
}));