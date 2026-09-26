import React, { useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motionTokens';
import { useThemeStore } from '../stores/useThemeStore';
import { getThemeColors } from '../themes/palette';

/**
 * Smooth crossfade whenever the active theme changes.
 *
 * Theme colors are applied as JS inline styles per component, so a plain CSS
 * transition cannot animate them (switching themes mounts an entirely new
 * variant page). Instead this overlay:
 *  1. mounts fully opaque with the NEW theme's background (useLayoutEffect
 *     runs before paint, so the hard swap is never seen),
 *  2. fades out to reveal the re-themed UI.
 * Dark-mode toggles are intentionally skipped: the theme pages animate their
 * own colors via transition-colors, and an extra cover would read as a flash.
 * Reduced-motion cuts the fade to a near-instant snap.
 */
export function ThemeTransitionOverlay() {
  const themeId = useThemeStore((s) => s.themeId);
  const isDark = useThemeStore((s) => s.isDark);
  const reduce = useReducedMotion();
  const [flash, setFlash] = useState(0);
  const prevTheme = useRef(themeId);

  useLayoutEffect(() => {
    if (prevTheme.current !== themeId) {
      prevTheme.current = themeId;
      setFlash((n) => n + 1);
    }
  }, [themeId]);

  if (flash === 0) return null;

  const colors = getThemeColors(themeId, isDark);

  return (
    <motion.div
      key={flash}
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{
        duration: reduce ? 0.01 : motionTokens.duration.normal,
        ease: motionTokens.easing.smooth,
      }}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ backgroundColor: colors.bg }}
      aria-hidden="true"
    />
  );
}