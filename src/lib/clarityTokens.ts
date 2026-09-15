import { getThemeColors, ThemePalette } from '../themes/palette';

/**
 * Design tokens for the Clarity theme ("Swiss-precision focus studio" — strict,
 * typographic, neutral-warm).
 *
 * Centralizes the Clarity pages (Home + Schedule + About) so the warm amber
 * accent, warm-paper surfaces, and hairline borders are consistent instead of
 * hard-coded (and drifted) per page. Clarity's identity is typographic: heavy
 * mono/serif type, thin lines, no ambient motion.
 *
 * Landing contract (single source of truth):
 * - Clarity chooses a slightly warmer dark than the shared palette default
 *   canonical values used across Schedule/About, so Home converges onto the
 *   same tokens below rather than a third variant.
 */
export interface ClarityTokens {
  palette: ThemePalette;
  accent: {
    amber: string;
    amberSoft: string;
    pink: string;
    accentInk: string;
  };
  surface: {
    bg: string;
    panel: string;
    card: string;
  };
  line: {
    hairline: string;
    strong: string;
    track: string;
  };
  text: {
    ink: string;
    inkSoft: string;
    inkFaint: string;
  };
  space: { xs: number; sm: number; md: number; lg: number; xl: number };
  type: { xs: number; sm: number; md: number; lg: number; display: number };
}

export function getClarityTokens(isDark: boolean): ClarityTokens {
  const p = getThemeColors('clarity', isDark);
  const ink = p.ink;
  const bg = p.bg;
  const panel = p.card;

  return {
    palette: p,
    accent: {
      amber: p.accent,
      amberSoft: p.accentSoft,
      pink: p.pink,
      accentInk: isDark ? '#161513' : '#F5F0E8',
    },
    surface: { bg, panel, card: p.card },
    line: {
      hairline: p.cardBorder,
      strong: isDark ? 'rgba(237,232,222,0.24)' : 'rgba(35,32,25,0.26)',
      track: isDark ? 'rgba(237,232,222,0.10)' : 'rgba(35,32,25,0.08)',
    },
    text: {
      ink,
      inkSoft: p.inkSoft,
      inkFaint: p.inkFaint,
    },
    space: { xs: 8, sm: 12, md: 16, lg: 24, xl: 40 },
    type: { xs: 10, sm: 12, md: 15, lg: 20, display: 80 },
  };
}
