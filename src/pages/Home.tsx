import React, { Suspense, lazy } from 'react';
import { useThemeStore } from '../stores/useThemeStore';

const ClarityHome = lazy(() => import('../components/Timer/variants/ClarityHome'));
const MountainHome = lazy(() => import('../components/Timer/variants/MountainHome'));
const ForestHome = lazy(() => import('../components/Timer/variants/ForestHome'));
const OceanHome = lazy(() => import('../components/Timer/variants/OceanHome'));
const PaperHome = lazy(() => import('../components/Timer/variants/PaperHome'));
const NightSkyHome = lazy(() => import('../components/Timer/variants/NightSkyHome'));

const THEME_COMPONENTS: Record<string, React.LazyExoticComponent<React.FC>> = {
  clarity: ClarityHome,
  mountain: MountainHome,
  forest: ForestHome,
  ocean: OceanHome,
  paper: PaperHome,
  'night-sky': NightSkyHome,
};

export default function Home() {
  const { themeId } = useThemeStore();
  const ThemeComponent = THEME_COMPONENTS[themeId] ?? ClarityHome;

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 border-2 border-current border-t-transparent rounded-full animate-spin opacity-40" />
      </div>
    }>
      <ThemeComponent />
    </Suspense>
  );
}
