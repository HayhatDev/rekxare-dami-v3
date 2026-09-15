import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Clay theme.
 *
 * One shared source of truth so the Clay pages (Timer + Schedule) render the
 * same material, spacing, and type system instead of each page hand-rolling a
 * color object. Elevation shadows and focus rings are derived from a single
 * accent, not re-typed per component.
 */
export interface ClayTokens {
  palette: ThemePalette;
  /** surface elevation scale (0 = flush, 1 = raised card, 2 = pressed/inset) */
  elevation: {
    raised: string;
    inset: string;
    pressed: string;
    active: string;
    cta: string;
  };
  /** spacing scale (px) */
  space: {
    xxs: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  /** type scale (px) */
  type: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    display: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    pill: number;
  };
}

export function getClayTokens(isDark: boolean): ClayTokens {
  const palette = getThemeColors('clay', isDark);
  const accent = palette.accent;

  const softHighlight = `rgba(255,255,255,${isDark ? 0.08 : 0.55})`;
  const softDepth = isDark ? 'rgba(0,0,0,0.4)' : `rgba(180,170,210,0.5)`;

  return {
    palette,
    elevation: {
      raised: `6px 6px 14px ${softDepth}, -3px -3px 10px ${softHighlight}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.85)'}`,
      inset: `inset 3px 3px 6px ${softDepth}, inset -2px -2px 5px ${softHighlight}`,
      pressed: `inset 2px 2px 5px ${softDepth}, inset -1px -1px 3px ${softHighlight}`,
      active: `4px 4px 12px ${accent}4d, -2px -2px 8px ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)'}`,
      cta: `4px 4px 14px ${accent}59, -2px -2px 8px ${softHighlight}, inset 0 1px 0 rgba(255,255,255,0.2)`,
    },
    space: { xxs: 4, xs: 8, sm: 12, md: 16, lg: 24, xl: 32 },
    type: { xs: 11, sm: 13, md: 14, lg: 18, xl: 30, display: 64 },
    radius: { sm: 14, md: 16, lg: 20, pill: 999 },
  };
}

/** Accent-based focus ring shared by interactive elements. */
export function focusRing(accent: string): string {
  return `0 0 0 3px ${accent}55`;
}
