/**
 * Motion system tokens — single source of truth for durations, easing and
 * distances. Use these instead of ad-hoc values so motion stays consistent
 * and is easy to tune in one place.
 */

export const motionTokens = {
  duration: {
    fast: 0.18,
    normal: 0.35,
    slow: 0.6,
  },
  easing: {
    /** Standard smooth ease for most UI transitions. */
    smooth: [0.22, 1, 0.36, 1] as [number, number, number, number],
    /** Rapid entrance / exit ease. */
    sharp: [0.4, 0, 0.2, 1] as [number, number, number, number],
    /** Slight over-shoot, great for spring-like reveals. */
    spring: [0.34, 1.3, 0.64, 1] as [number, number, number, number],
  },
  distance: {
    sm: 8,
    md: 16,
    lg: 24,
  },
};

/** Convenience shortcut for a standard tween transition. */
export const standardTransition = (duration = motionTokens.duration.normal) => ({
  duration,
  ease: motionTokens.easing.smooth,
});

/**
 * Detect low-end devices by combining CPU cores and available memory.
 * Returns `true` when animations should be shortened or disabled.
 */
export function isLowEndDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (mem !== undefined && mem <= 2) return true;
  if (mem === undefined && navigator.hardwareConcurrency <= 4) return true;
  return false;
}
