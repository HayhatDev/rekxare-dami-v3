import { useEffect } from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { useLangStore } from '../stores/useLangStore';

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
    document.documentElement.dir = lang === 'ar' || lang === 'badini' ? 'rtl' : 'ltr';
  }, [lang]);
};