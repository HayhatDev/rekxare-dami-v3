import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { useSidebarStore } from '../../stores/useSidebarStore';
import { 
  Timer, Calendar, Info, Moon, Sun, Globe, Heart, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Language } from '../../types';

export const Sidebar = () => {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { isDark, toggleDark } = useThemeStore();
  const { lang, setLang } = useLangStore();
  const { isCollapsed, toggleCollapsed } = useSidebarStore();

  const handleLangSwitch = () => {
    const nextLang: Record<Language, Language> = {
      'en': 'badini',
      'badini': 'ar',
      'ar': 'en'
    };
    setLang(nextLang[lang]);
  };

  return (
    <aside 
      className={`h-screen fixed left-0 top-0 hidden md:flex flex-col glass-card border-r border-border/50 shadow-xl z-50 transition-all duration-300 ${
        isCollapsed ? 'w-[80px]' : 'w-[280px]'
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-200 z-10"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className={`p-6 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold text-xl shadow-lg">
          R
        </div>
        {!isCollapsed && (
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">Rekxare Dami</h1>
            <p className="text-xs text-muted-foreground">{t('student')} Mode</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <Link 
          href="/" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
            location === '/' 
              ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl' 
              : 'hover:bg-accent/50 text-foreground'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Timer className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="font-medium">{t('nav_timer')}</span>}
        </Link>
        <Link 
          href="/schedule" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
            location === '/schedule' 
              ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl' 
              : 'hover:bg-accent/50 text-foreground'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Calendar className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="font-medium">{t('nav_schedule')}</span>}
        </Link>
        <Link 
          href="/about" 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
            location === '/about' 
              ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl' 
              : 'hover:bg-accent/50 text-foreground'
          } ${isCollapsed ? 'justify-center' : ''}`}
        >
          <Info className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="font-medium">{t('nav_about')}</span>}
        </Link>
      </nav>

      <div className="p-4 space-y-2 mt-auto border-t border-border/50">
        <button 
          onClick={toggleDark}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-accent/50 hover:scale-105 text-foreground ${
            isCollapsed ? 'justify-center' : 'text-left'
          }`}
          title={isDark ? t('light_mode') : t('dark_mode')}
        >
          {isDark ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
          {!isCollapsed && <span className="font-medium">{isDark ? t('light_mode') : t('dark_mode')}</span>}
        </button>
        
        <button 
          onClick={handleLangSwitch}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-accent/50 hover:scale-105 text-foreground ${
            isCollapsed ? 'justify-center' : 'text-left'
          }`}
          title={lang === 'en' ? 'English' : lang === 'badini' ? 'Badini' : 'العربية'}
        >
          <Globe className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <span className="font-medium">
              {lang === 'en' ? 'English' : lang === 'badini' ? 'Badini' : 'العربية'}
            </span>
          )}
        </button>
        
        {!isCollapsed && (
          <div className="pt-6 pb-2 text-center flex flex-col items-center justify-center text-xs text-muted-foreground animate-fade-in-up">
            <Heart className="w-4 h-4 text-destructive mb-1 animate-pulse" />
            <p>{t('made_with')}</p>
          </div>
        )}
      </div>
    </aside>
  );
};