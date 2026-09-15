import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Mountain theme ("study as a journey through the landscape").
 *
 * Single source of truth for the Mountain pages (Home + Schedule + About) so the
 * terrain metaphor, elevation, and label colors are consistent instead of 120+
 * hard-coded hex literals scattered per page. Semantic names map to the palette:
 * - accent    = forest-green trail color
 * - warm      = the worn-earth / path brown
 * - gold      = summit highlight
 * - surface*  = the frost-glass panels
 */
export interface MountainTokens {
  palette: ThemePalette;
  /** semantic terrain colors (aliases over the palette + theme extras) */
  terrain: {
    trail: string;
    path: string;
    gold: string;
    track: string;      // empty progress track
    outline: string;    // mountain silhouette stroke
    outlineSoft: string;
  };
  /** surfaces used by this theme (most use translucent frost-glass) */
  surface: {
    panel: string;      // backdrop-blur card
    panelStrong: string;
    chip: string;       // small control chip
    chipHover: string;
    well: string;       // inset / empty track
  };
  /** label + ink aliases */
  text: {
    ink: string;
    inkSoft: string;
    label: string;      // the uppercase caption green
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  type: { xs: number; sm: number; md: number; lg: number; display: number };
  radius: { chip: number; panel: number; hero: number };
}

export function getMountainTokens(isDark: boolean): MountainTokens {
  const p = getThemeColors('mountain', isDark);
  const trail = isDark ? '#6B8E6F' : '#4A5D45';
  const path = isDark ? '#B8794F' : '#8B6F47';
  const gold = isDark ? '#F5D899' : '#B68A3E';
  const panel = isDark ? 'rgba(34,46,32,0.55)' : 'rgba(255,255,255,0.45)';
  const panelStrong = isDark ? '#222E20' : 'rgba(255,255,255,0.7)';
  const chip = isDark ? 'rgba(61,74,56,0.9)' : 'rgba(255,255,255,0.6)';
  const chipHover = isDark ? 'rgba(74,93,69,0.9)' : 'rgba(255,255,255,0.85)';
  const well = isDark ? '#2E3B2C' : '#D8E2D4';
  const label = isDark ? '#9FB399' : '#6B8E6F';
  const outline = isDark ? '#5D6F58' : '#A8C4A0';
  const outlineSoft = isDark ? '#485A44' : '#C2D6BC';

  return {
    palette: p,
    terrain: { trail, path, gold, track: well, outline, outlineSoft },
    surface: { panel, panelStrong, chip, chipHover, well },
    text: { ink: isDark ? '#E8EEE4' : '#2B3428', inkSoft: isDark ? '#C5D1BF' : '#4A5D45', label },
    space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    type: { xs: 12, sm: 14, md: 16, lg: 20, display: 48 },
    radius: { chip: 20, panel: 30, hero: 40 },
  };
}

/** Accent-derived focus ring for interactive controls. */
export function focusRing(accent: string): string {
  return `0 0 0 3px ${accent}55`;
}
