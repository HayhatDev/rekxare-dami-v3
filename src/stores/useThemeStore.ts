import { create } from 'zustand';
import { ThemeId, } from '../themes/types';
import { DEFAULT_THEME_ID } from '../themes/config';

interface ThemeState {
  themeId: ThemeId;
  isDark: boolean;
  setTheme: (id: ThemeId) => void;
  toggleDark: () => void;
  setDark: (isDark: boolean) => void;
}

function applyTheme(themeId: ThemeId, isDark: boolean) {
  const root = document.documentElement;
  // Remove old theme attrs
  root.setAttribute('data-theme', themeId);
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
}

const storedTheme = (localStorage.getItem('rekxare_theme') as ThemeId) || DEFAULT_THEME_ID;
const storedDark = localStorage.getItem('rekxare_dark') === 'true';

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: storedTheme,
  isDark: storedDark,

  setTheme: (id) => {
    localStorage.setItem('rekxare_theme', id);
    applyTheme(id, get().isDark);
    set({ themeId: id });
  },

  toggleDark: () => {
    const next = !get().isDark;
    localStorage.setItem('rekxare_dark', String(next));
    applyTheme(get().themeId, next);
    set({ isDark: next });
  },

  setDark: (isDark) => {
    localStorage.setItem('rekxare_dark', String(isDark));
    applyTheme(get().themeId, isDark);
    set({ isDark });
  },
}));

// Apply on load
applyTheme(storedTheme, storedDark);
