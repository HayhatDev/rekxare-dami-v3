/**
 * Background-preload the theme variant chunks (per-theme Home + Schedule).
 *
 * Pages resolve their themed surface via React.lazy on the active themeId, so
 * switching themes mounts a chunk that may not be loaded yet — and while it
 * loads, the Suspense fallback (clay `bg-background`) flashes under the theme
 * transition overlay. Warming these chunks up front makes theme switches
 * instant with no fallback flash. Fired when the theme picker opens, so the
 * user's very first pick is still instant; the lazy routes keep the initial
 * bundle small.
 */
const HOME_VARIANTS: Array<() => Promise<unknown>> = [
  () => import('../components/Timer/variants/ClayHome'),
  () => import('../components/Timer/variants/ClarityHome'),
  () => import('../components/Timer/variants/MountainHome'),
  () => import('../components/Timer/variants/ForestHome'),
  () => import('../components/Timer/variants/OceanHome'),
  () => import('../components/Timer/variants/NightSkyHome'),
];

const SCHEDULE_VARIANTS: Array<() => Promise<unknown>> = [
  () => import('../components/Schedule/variants/ClaySchedule'),
  () => import('../components/Schedule/variants/ClaritySchedule'),
  () => import('../components/Schedule/variants/MountainSchedule'),
  () => import('../components/Schedule/variants/ForestSchedule'),
  () => import('../components/Schedule/variants/OceanSchedule'),
  () => import('../components/Schedule/variants/NightSkySchedule'),
];

let started = false;

export function preloadThemeVariants() {
  if (started) return;
  started = true;
  const loaders = [...HOME_VARIANTS, ...SCHEDULE_VARIANTS];
  // Fire-and-forget; resolve order is irrelevant. Keep the promise alive so
  // nothing is GC'd mid-flight. Dynamic import() executes the module once, so
  // the same chunk is later reused by React.lazy with no second network fetch.
  void Promise.allSettled(loaders.map((load) => load()));
}