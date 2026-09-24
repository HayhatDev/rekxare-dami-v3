import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Night Sky theme ("a night of focus — your constellation
 * connects star by star as you study").
 *
 * Centralizes the NightSky pages (Home + Schedule + About) so the star-blue
 * accent, gold starlight, and indigo near-black background are consistent
 * instead of hard-coded per page. Semantic names:
 * - starBlue  = the constellation accent (#6B8FD4 dark / #5B7DB9 light)
 * - gold      = starlight / connected-constellation signal color
 * - bgDeep    = the light-indigo surface used for cards and panels
 */
export interface NightSkyTokens {
  palette: ThemePalette;
  accent: {
    starBlue: string;
    starBlueStrong: string;
    gold: string;
    goldSoft: string;
  };
  surface: {
    bg: string;
    panel: string;
    ring: string;
  };
  border: {
    hairline: string;
    strong: string;
  };
  text: {
    ink: string;
    inkSoft: string;
    inkFaint: string;
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  type: { xs: number; sm: number; md: number; lg: number; display: number };
}

export function getNightSkyTokens(isDark: boolean): NightSkyTokens {
  const p = getThemeColors('night-sky', isDark);
  const starBlue = p.accent;
  const starBlueStrong = p.accentSoft;
  const gold = isDark ? '#E8C54A' : '#8F6D00';
  const bgDeep = isDark ? '#0E1428' : '#FFFFFF';
  const panel = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)';
  const hairline = isDark ? 'rgba(107,143,212,0.2)' : 'rgba(107,143,212,0.3)';

  return {
    palette: p,
    accent: { starBlue, starBlueStrong, gold, goldSoft: isDark ? '#E8C54A' : '#9C7A12' },
    surface: { bg: p.bg, panel, ring: bgDeep },
    border: { hairline, strong: hairline },
    text: {
      ink: p.ink,
      inkSoft: p.inkSoft,
      inkFaint: p.inkFaint,
    },
    space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 40 },
    type: { xs: 12, sm: 14, md: 16, lg: 20, display: 48 },
  };
}
