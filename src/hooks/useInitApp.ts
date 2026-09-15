import { useEffect } from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { useLangStore } from '../stores/useLangStore';
import i18n from '../i18n';

export const useInitApp = () => {
  const { isDark } = useThemeStore();
  const { lang } = useLangStore();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' || lang === 'badini' || lang === 'sorani' ? 'rtl' : 'ltr';
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang]);
};