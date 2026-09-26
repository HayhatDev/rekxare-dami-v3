import { create } from 'zustand';
import { ThemeId, } from '../themes/types';
import { THEMES, DEFAULT_THEME_ID } from '../themes/config';
import { getThemeColors, hexToHslTriplet } from '../themes/palette';

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

// index.css defines these as `hsl(var(--x))` HSL-triplet custom properties
// with CLAY defaults baked in. The themed pages paint from the JS palette
// inline, so the CSS-variable surfaces (login loader, Suspense fallbacks,
// Layout wrapper, dialogs, sheets) stay clay unless synced here. Setting them
// to the active theme palette removes the clay flashes on login and theme
// switches while keeping every `bg-background`/`text-foreground` surface in
// sync with the theme.
function applyThemeCssVars(themeId: ThemeId, isDark: boolean) {
  const c = getThemeColors(themeId, isDark);
  const vars: Record<string, string> = {
    '--background': c.bg,
    '--foreground': c.ink,
    '--card': c.card,
    '--card-foreground': c.ink,
    '--card-border': c.cardBorder,
    '--popover': c.card,
    '--popover-foreground': c.ink,
    '--popover-border': c.cardBorder,
    '--border': c.cardBorder,
    '--input': c.cardBorder,
    '--muted': c.card,
    '--muted-foreground': c.inkSoft,
    '--ring': c.accent,
    '--primary': c.accent,
    '--accent': c.accent,
    '--secondary': c.pink,
    '--sidebar': c.card,
    '--sidebar-foreground': c.ink,
    '--sidebar-border': c.cardBorder,
    '--sidebar-primary': c.accent,
    '--sidebar-accent': c.card,
    '--sidebar-accent-foreground': c.ink,
    '--sidebar-ring': c.accent,
    '--chart-1': c.accent,
    '--chart-2': c.pink,
    '--chart-3': c.accentSoft,
    '--chart-4': c.accent,
    '--chart-5': c.pink,
  };
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, hexToHslTriplet(v));
  }
  // theme-init.js paints html/body inline at boot; refresh it on every change
  // too so native-scrolled overscroll rubber-band matches the active theme.
  root.style.backgroundColor = c.bg;
  const body = document.body;
  if (body) body.style.backgroundColor = c.bg;
}

function applyTheme(themeId: ThemeId, isDark: boolean) {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  if (isDark) root.classList.add('dark');
  else root.classList.remove('dark');
  applyThemeCssVars(themeId, isDark);
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