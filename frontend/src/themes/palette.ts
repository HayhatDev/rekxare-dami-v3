export interface ThemePalette {
  bg: string;
  card: string;
  cardBorder: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
  accentSoft: string;
  pink: string;
  pinkSoft: string;
  clayShadow: string;
  clayInner: string;
}

/**
 * Shared theme palette. Values mirror the per-variant color objects in
 * src/components/{Timer,Schedule}/variants/* so Insights and not-found stay
 * visually consistent with the themed pages.
 */
export const THEME_COLORS: Record<string, { light: ThemePalette; dark: ThemePalette; font: string }> = {
  clay: {
    light: { bg: '#F0EAF8', card: '#FFFFFF', cardBorder: 'rgba(124,108,176,0.15)', ink: '#2D2B3D', inkSoft: 'rgba(45,43,61,0.75)', inkFaint: 'rgba(45,43,61,0.40)', accent: '#6E5EAE', accentSoft: '#8D7BB9', pink: '#D06880', pinkSoft: 'rgba(208,104,128,0.15)', clayShadow: '6px 6px 14px rgba(180,170,210,0.45), -3px -3px 10px rgba(255,255,255,0.8)', clayInner: 'inset 3px 3px 6px rgba(180,170,210,0.35), inset -2px -2px 5px rgba(255,255,255,0.7)' },
    dark: { bg: '#1E1C2E', card: '#2A2840', cardBorder: 'rgba(124,108,176,0.18)', ink: '#E8E0F0', inkSoft: 'rgba(232,224,240,0.62)', inkFaint: 'rgba(232,224,240,0.40)', accent: '#7C6CB0', accentSoft: '#A08AD0', pink: '#E88FA0', pinkSoft: 'rgba(232,143,160,0.25)', clayShadow: '6px 6px 14px rgba(0,0,0,0.35), -3px -3px 10px rgba(124,108,176,0.08)', clayInner: 'inset 3px 3px 6px rgba(0,0,0,0.25), inset -2px -2px 5px rgba(124,108,176,0.1)' },
    font: "'Nunito', system-ui, sans-serif"
  },
  clarity: {
    light: { bg: '#F5F0E8', card: '#EFE8DB', cardBorder: 'rgba(35,32,25,0.14)', ink: '#232019', inkSoft: 'rgba(35,32,25,0.75)', inkFaint: 'rgba(35,32,25,0.42)', accent: '#A0501C', accentSoft: '#B96E28', pink: '#B85C4A', pinkSoft: 'rgba(184,92,74,0.12)', clayShadow: 'none', clayInner: 'none' },
    dark: { bg: '#161513', card: '#1C1B18', cardBorder: 'rgba(237,232,222,0.14)', ink: '#EDE8DE', inkSoft: 'rgba(237,232,222,0.62)', inkFaint: 'rgba(237,232,222,0.40)', accent: '#D98A3D', accentSoft: '#D98A3D', pink: '#C97C5A', pinkSoft: 'rgba(217,138,61,0.15)', clayShadow: 'none', clayInner: 'none' },
    font: "'DM Sans', system-ui, sans-serif"
  },
  mountain: {
    light: { bg: '#E8EEE4', card: '#DDE6D6', cardBorder: 'rgba(43,52,40,0.15)', ink: '#2B3428', inkSoft: 'rgba(43,52,40,0.75)', inkFaint: 'rgba(43,52,40,0.42)', accent: '#4A5D45', accentSoft: '#55734F', pink: '#B8794F', pinkSoft: 'rgba(184,121,79,0.12)', clayShadow: 'none', clayInner: 'none' },
    dark: { bg: '#1A2418', card: '#222E20', cardBorder: 'rgba(212,232,208,0.12)', ink: '#D4E8D0', inkSoft: 'rgba(212,232,208,0.65)', inkFaint: 'rgba(212,232,208,0.40)', accent: '#6B8E6F', accentSoft: '#8DA882', pink: '#B8794F', pinkSoft: 'rgba(184,121,79,0.15)', clayShadow: 'none', clayInner: 'none' },
    font: "'DM Sans', 'Fraunces', system-ui, sans-serif"
  },
  forest: {
    light: { bg: '#D4E8D0', card: '#C8DBC4', cardBorder: 'rgba(12,22,11,0.12)', ink: '#1A2E18', inkSoft: 'rgba(26,46,24,0.75)', inkFaint: 'rgba(26,46,24,0.40)', accent: '#2E6B2F', accentSoft: '#2A7D2D', pink: '#7C5230', pinkSoft: 'rgba(124,82,48,0.12)', clayShadow: 'none', clayInner: 'none' },
    dark: { bg: '#0C160B', card: '#182317', cardBorder: 'rgba(212,232,208,0.10)', ink: '#D4E8D0', inkSoft: 'rgba(212,232,208,0.60)', inkFaint: 'rgba(212,232,208,0.38)', accent: '#4CAF50', accentSoft: '#6BC96E', pink: '#8B6040', pinkSoft: 'rgba(139,96,64,0.15)', clayShadow: 'none', clayInner: 'none' },
    font: "'DM Sans', 'Lora', system-ui, sans-serif"
  },
  ocean: {
    light: { bg: '#EBF4FB', card: '#E0E9F0', cardBorder: 'rgba(6,16,30,0.10)', ink: '#0A1929', inkSoft: 'rgba(10,25,41,0.75)', inkFaint: 'rgba(10,25,41,0.38)', accent: '#1478A8', accentSoft: '#0B7D74', pink: '#0B7D74', pinkSoft: 'rgba(0,180,168,0.12)', clayShadow: 'none', clayInner: 'none' },
    dark: { bg: '#06101E', card: '#121D2B', cardBorder: 'rgba(204,228,245,0.10)', ink: '#CCE4F5', inkSoft: 'rgba(204,228,245,0.60)', inkFaint: 'rgba(204,228,245,0.38)', accent: '#00C8B8', accentSoft: '#1A90C8', pink: '#1A90C8', pinkSoft: 'rgba(26,144,200,0.15)', clayShadow: 'none', clayInner: 'none' },
    font: "'Plus Jakarta Sans', system-ui, sans-serif"
  },
  'night-sky': {
    light: { bg: '#EEF2FA', card: '#E2E6EF', cardBorder: 'rgba(6,9,26,0.10)', ink: '#1A1F36', inkSoft: 'rgba(26,31,54,0.75)', inkFaint: 'rgba(26,31,54,0.38)', accent: '#3F5B94', accentSoft: '#5472A8', pink: '#8F6D00', pinkSoft: 'rgba(201,160,32,0.12)', clayShadow: 'none', clayInner: 'none' },
    dark: { bg: '#06091A', card: '#131627', cardBorder: 'rgba(216,228,240,0.10)', ink: '#D8E4F0', inkSoft: 'rgba(216,228,240,0.60)', inkFaint: 'rgba(216,228,240,0.38)', accent: '#6B8FD4', accentSoft: '#8AA8E0', pink: '#E8C54A', pinkSoft: 'rgba(232,197,74,0.15)', clayShadow: 'none', clayInner: 'none' },
    font: "'Space Grotesk', system-ui, sans-serif"
  },
};

export function getThemeColors(themeId: string, isDark: boolean): ThemePalette {
  const theme = THEME_COLORS[themeId] || THEME_COLORS.clay;
  return isDark ? theme.dark : theme.light;
}

export function getThemeFont(themeId: string): string {
  return (THEME_COLORS[themeId] || THEME_COLORS.clay).font;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Darken a hex color by `percent` (0–1) toward black, e.g. mixBlack('#6E5EAE', 0.18). */
export function mixBlack(hex: string, percent: number): string {
  const { r, g, b } = parseHex(hex);
  const m = (v: number) => Math.round(v * (1 - percent)).toString(16).padStart(2, '0');
  return `#${m(r)}${m(g)}${m(b)}`;
}

/** Hex → rgba() string with a given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Tonal accent gradient used for hero cards, CTA chips, nav marks.
 * Stays inside one hue family (accent → slightly deeper) instead of jumping
 * to a second hue, which reads as a generic AI-generated violet→pink blend.
 * Computed in JS (no color-mix) so it renders on older mobile browsers too.
 */
export function brandGradient(accent: string, _pink?: string): string {
  return `linear-gradient(150deg, ${accent} 0%, ${mixBlack(accent, 0.18)} 100%)`;
}

/** Faded tonal accent gradient for empty-state / placeholder tiles. */
export function brandGradientSoft(accent: string, _pink?: string): string {
  return `linear-gradient(150deg, ${accent}14 0%, ${accent}28 100%)`;
}
