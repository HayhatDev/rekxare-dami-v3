import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Ocean theme ("study as a dive — the tide rises as you focus").
 *
 * Centralizes the Ocean pages (Home + Schedule + About) so the deep-water palette,
 * the teal accent, and the underwater signature colors are consistent instead of
 * hard-coded per page. Semantic names map to the palette:
 * - teal        = live accent (#00C8B8 brand teal)
 * - deepblue    = primary button / probe colour
 * - accent variants the shared children (StreakCalendar/MobileBottomNav) use
 */
export interface OceanTokens {
  palette: ThemePalette;
  accent: {
    teal: string;
    deepblue: string;
    sky: string;      // light-mode path A
  };
  surface: {
    panel: string;    // solid panel (blend of the old 3% tint over the page bg)
    well: string;     // inset / empty track
  };
  text: {
    ink: string;
    inkMuted: string;
    inkFaint: string;
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  type: { xs: number; sm: number; md: number; lg: number; display: number };
  radius: { chip: number; panel: number; hero: number };
}

export function getOceanTokens(isDark: boolean): OceanTokens {
  const p = getThemeColors('ocean', isDark);
  const teal = isDark ? '#00C8B8' : '#0B7D74';
  const deepblue = isDark ? '#1A90C8' : '#1478A8';
  const panel = isDark ? '#0D1725' : '#E4EDF3';
  const well = isDark ? '#151E2C' : '#DDE5EC';

  return {
    palette: p,
    accent: {
      teal,
      deepblue,
      sky: '#7EC8E3',
    },
    surface: { panel, well },
    text: {
      ink: isDark ? '#C8E4F5' : '#06101E',
      inkMuted: isDark ? 'rgba(200,228,245,0.65)' : 'rgba(6,16,30,0.75)',
      inkFaint: isDark ? 'rgba(200,228,245,0.40)' : 'rgba(6,16,30,0.42)',
    },
    space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    type: { xs: 12, sm: 14, md: 16, lg: 20, display: 40 },
    radius: { chip: 999, panel: 24, hero: 24 },
  };
}

/** Accent-derived focus ring for interactive controls. */
export function oceanFocus(teal: string): string {
  return `0 0 0 3px ${teal}55`;
}
