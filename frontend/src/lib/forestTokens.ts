import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Forest theme ("deep canopy, slow breathing — your tree grows
 * as you focus").
 *
 * Centralizes the Forest pages (Home + Schedule + About) so the leaf-green accent,
 * bark-brown earth, and deep-canopy background are consistent instead of hard-coded
 * per page. Semantic names map to the palette:
 * - leafGreen = the live accent (#4CAF50)
 * - bark      = the worn-earth brown
 * - bgDeep    = the deeper canopy background ForestHome uses (bleeds past the shared bg)
 */
export interface ForestTokens {
  palette: ThemePalette;
  accent: {
    leafGreen: string;
    leafSoft: string;
    bark: string;
    bgDeep: string;
  };
  surface: {
    panel: string;    // solid panel (blend of the old 3–6% tint over bgDeep)
    chip: string;     // solid pill chip
  };
  text: {
    ink: string;
    inkSoft: string;
    inkFaint: string;
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  type: { xs: number; sm: number; md: number; lg: number; display: number };
  radius: { chip: number; panel: number; leaf: number };
}

export function getForestTokens(isDark: boolean): ForestTokens {
  const p = getThemeColors('forest', isDark);
  const leafGreen = isDark ? '#4CAF50' : '#2E6B2F';
  const leafSoft = isDark ? '#6BC96E' : '#2A7D2D';
  const bark = isDark ? '#8B6040' : '#7C5230';
  const bgDeep = isDark ? '#060E05' : '#D4E8D0';
  const panel = isDark ? '#081307' : '#CEE1CA';
  const chip = isDark ? '#0A1609' : '#CCDFC8';

  return {
    palette: p,
    accent: { leafGreen, leafSoft, bark, bgDeep },
    surface: { panel, chip },
    text: {
      ink: isDark ? '#D4E8D0' : '#1A2E18',
      inkSoft: isDark ? 'rgba(212,232,208,0.62)' : 'rgba(26,46,24,0.62)',
      inkFaint: isDark ? 'rgba(212,232,208,0.38)' : 'rgba(26,46,24,0.40)',
    },
    space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    type: { xs: 12, sm: 14, md: 16, lg: 20, display: 40 },
    radius: { chip: 50, panel: 32, leaf: 0 },
  };
}

/** Accent-derived focus ring for interactive controls. */
export function forestFocus(accent: string): string {
  return `0 0 0 3px ${accent}55`;
}
