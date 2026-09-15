import { create } from 'zustand';
import { ThemeId, } from '../themes/types';
import { THEMES, DEFAULT_THEME_ID } from '../themes/config';

interface ThemeState {
  themeId: ThemeId;
  isDark: boolean;
  setTheme: (id: ThemeId) => void;
  toggleDark: () => void;
  setDark: (isDark: boolean) => void;
}

// Derive the valid set from THEMES (source of truth) so adding a theme in
// config.ts never requires a second manual list here.
const VALID_THEME_IDS = new Set<string>(THEMES.map((t) => t.id));

function readThemeStored(): ThemeId {
  try {
    const raw = localStorage.getItem('rekxare_theme');
    if (raw && VALID_THEME_IDS.has(raw)) {
      return raw as ThemeId;
    }
  } catch {}
  return DEFAULT_THEME_ID;
}

function readDarkStored(): boolean {
  try { return localStorage.getItem('rekxare_dark') === 'true'; }
  catch { return false; }
}

function applyTheme(themeId: ThemeId, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
  loadThemeFonts(themeId);
}

// Each theme declares the fonts it actually uses. A single <link> is reused
// and repointed on theme change, so we never ship all fonts at once.
const FONT_LINK_ID = 'rekxare-theme-fonts';

function loadThemeFonts(themeId: ThemeId) {
  const theme = THEMES.find((t) => t.id === themeId);
  const url = theme?.fontUrls?.[0];
  let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.id = FONT_LINK_ID;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = url;
}

const storedTheme = readThemeStored();
const storedDark = readDarkStored();

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeId: storedTheme,
  isDark: storedDark,

  setTheme: (id) => {
    try { localStorage.setItem('rekxare_theme', id); } catch {}
    applyTheme(id, get().isDark);
    set({ themeId: id });
  },

  toggleDark: () => {
    const next = !get().isDark;
    try { localStorage.setItem('rekxare_dark', String(next)); } catch {}
    applyTheme(get().themeId, next);
    set({ isDark: next });
  },

  setDark: (isDark) => {
    try { localStorage.setItem('rekxare_dark', String(isDark)); } catch {}
    applyTheme(get().themeId, isDark);
    set({ isDark });
  },
}));

// Apply on load
applyTheme(storedTheme, storedDark);