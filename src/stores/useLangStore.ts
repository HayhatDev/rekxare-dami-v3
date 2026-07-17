import { create } from 'zustand';
import { Language } from '../types';
import i18n from '../i18n';

interface LangState {
  lang: Language;
  setLang: (lang: Language) => void;
}

export const useLangStore = create<LangState>((set) => ({
  lang: (localStorage.getItem('rekxare_lang') as Language) || 'en',
  setLang: (lang) => {
    localStorage.setItem('rekxare_lang', lang);
    i18n.changeLanguage(lang);
    document.documentElement.dir = lang === 'ar' || lang === 'badini' ? 'rtl' : 'ltr';
    set({ lang });
  }
}));