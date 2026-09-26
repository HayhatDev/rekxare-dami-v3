import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Toaster } from 'sonner';
import React, { Suspense } from 'react';
import { motionTokens } from './lib/motionTokens';
import { useInitApp } from './hooks/useInitApp';
import { useThemeStore } from './stores/useThemeStore';
import { THEME_MAP } from './themes/config';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthGate from './components/Auth/AuthGate';
import GuestLocked from './components/Auth/GuestLocked';
import ErrorBoundary from './components/Auth/ErrorBoundary';
import StudyReminder from './components/StudyReminder';
import InstallApp from './components/InstallApp';

import Home from './pages/Home';
import Schedule from './pages/Schedule';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
const Insights = React.lazy(() => import('./pages/Insights'));
const Quiz = React.lazy(() => import('./pages/Quiz'));
import NotFound from './pages/not-found';
import { ThemeSwitcher } from './components/ThemeSwitcher/ThemeSwitcher';
import { ThemeTransitionOverlay } from './components/ThemeTransitionOverlay';
import { useTranslation } from 'react-i18next';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoutes() {
  const [location] = useLocation();
  const { isGuest } = useAuth();
  const reduce = useReducedMotion();
  const y = reduce ? 0 : motionTokens.distance.sm;
  const pageVariants = {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -y },
  };
  const pageTransition = {
    type: 'tween' as const,
    ease: motionTokens.easing.smooth,
    duration: reduce ? 0.1 : motionTokens.duration.normal,
  };
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        className="min-h-screen"
        id="main-content"
        tabIndex={-1}
      >
        <ErrorBoundary>
          <Switch location={location}>
            <Route path="/" component={Home} />
            <Route path="/schedule">
              {isGuest ? <GuestLocked /> : <Schedule />}
            </Route>
            <Route path="/privacy" component={Privacy} />
            <Route path="/terms" component={Terms} />
            <Route path="/insights">
              {isGuest ? (
                <GuestLocked />
              ) : (
                <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-foreground">...</div>}>
                  <Insights />
                </Suspense>
              )}
            </Route>
            <Route path="/quiz">
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-foreground">...</div>}>
                <Quiz />
              </Suspense>
            </Route>
            <Route component={NotFound} />
          </Switch>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  useInitApp();
  const { themeId } = useThemeStore();
  const { t } = useTranslation();
  const themeConfig = THEME_MAP[themeId];
  const ownLayout = themeConfig?.ownLayout ?? false;

  if (ownLayout) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:outline-none"
        >
          {t('skip_to_content')}
        </a>
        {children}
        <ThemeSwitcher />
      </div>
    );
  }

  return children;
}

function Router() {
  return (
    <Layout>
      <AnimatedRoutes />
      <StudyReminder />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </AuthGate>
        <InstallApp />
      </AuthProvider>
      <ThemeTransitionOverlay />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}

export default App;
