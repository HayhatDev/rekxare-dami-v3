import React, { Suspense, lazy, useMemo } from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { getThemeColors } from '../themes/palette';
import MobileBottomNav from '../components/MobileBottomNav';

const ClaySchedule = lazy(() => import('../components/Schedule/variants/ClaySchedule'));
const ClaritySchedule = lazy(() => import('../components/Schedule/variants/ClaritySchedule'));
const MountainSchedule = lazy(() => import('../components/Schedule/variants/MountainSchedule'));
const ForestSchedule = lazy(() => import('../components/Schedule/variants/ForestSchedule'));
const OceanSchedule = lazy(() => import('../components/Schedule/variants/OceanSchedule'));
const NightSkySchedule = lazy(() => import('../components/Schedule/variants/NightSkySchedule'));

const THEME_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  clay: ClaySchedule as React.LazyExoticComponent<React.FC>,
  clarity: ClaritySchedule as React.LazyExoticComponent<React.FC>,
  mountain: MountainSchedule as React.LazyExoticComponent<React.FC>,
  forest: ForestSchedule as React.LazyExoticComponent<React.FC>,
  ocean: OceanSchedule as React.LazyExoticComponent<React.FC>,
  'night-sky': NightSkySchedule as React.LazyExoticComponent<React.FC>,
};

export default function Schedule() {
  const { themeId, isDark } = useThemeStore();
  const ThemeComponent = THEME_COMPONENTS[themeId] ?? ClaySchedule;
  const colors = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);

  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
        </div>
      }>
        <ThemeComponent />
      </Suspense>
      <MobileBottomNav accent={colors.accent} card={colors.card} cardBorder={colors.cardBorder} inkFaint={colors.inkFaint} bg={colors.bg} />
    </>
  );
}
