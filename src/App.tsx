import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { useInitApp } from './hooks/useInitApp';
import { useSidebarStore } from './stores/useSidebarStore';
import { useThemeStore } from './stores/useThemeStore';
import { THEME_MAP } from './themes/config';

import Home from './pages/Home';
import Schedule from './pages/Schedule';
import About from './pages/About';
import NotFound from './pages/not-found';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Navbar } from './components/Navbar/Navbar';
import { ThemeSwitcher } from './components/ThemeSwitcher/ThemeSwitcher';

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  useInitApp();
  const { isCollapsed } = useSidebarStore();
  const { themeId } = useThemeStore();
  const themeConfig = THEME_MAP[themeId];
  const ownLayout = themeConfig?.ownLayout ?? false;

  // Themes with ownLayout handle their own nav/sidebar
  if (ownLayout) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        {children}
        <ThemeSwitcher />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-secondary/5 dark:bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Navbar + Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'md:pl-[80px]' : 'md:pl-[280px]'}`}>
        <Navbar />
        <main className="flex-1 p-4 md:p-8 overflow-y-auto relative z-10">
          {children}
        </main>
      </div>
      <ThemeSwitcher />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/schedule" component={Schedule} />
        <Route path="/about" component={About} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
