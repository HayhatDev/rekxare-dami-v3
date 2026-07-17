import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'wouter';
import { Timer, Calendar, Info, Menu, X, Moon, Sun, Globe } from 'lucide-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { useLangStore } from '../../stores/useLangStore';
import { Language } from '../../types';

export const Navbar = () => {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { isDark, toggleDark } = useThemeStore();
  const { lang, setLang } = useLangStore();

  const handleLangSwitch = () => {
    const nextLang: Record<Language, Language> = {
      'en': 'badini',
      'badini': 'ar',
      'ar': 'en'
    };
    setLang(nextLang[lang]);
  };

  return (
    <>
      <nav className="md:hidden sticky top-0 z-50 w-full glass-card border-b border-border/50 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center font-bold shadow-md">
            R
          </div>
          <span className="font-bold">Rekxare</span>
        </div>
        
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-lg text-foreground hover:bg-accent/50 transition-all duration-300"
        >
          <Menu className="w-6 h-6" />
        </button>
      </nav>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div 
            className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-[280px] glass-card border-l border-border/50 shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            <div className="p-4 flex items-center justify-between border-b border-border/50">
              <span className="font-bold text-lg">Menu</span>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-foreground hover:bg-accent/50 transition-all duration-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
              <Link 
                href="/" 
                onClick={() => setIsDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  location === '/' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'hover:bg-accent/50 text-foreground'
                }`}
              >
                <Timer className="w-5 h-5" />
                <span className="font-medium">{t('nav_timer')}</span>
              </Link>
              <Link 
                href="/schedule" 
                onClick={() => setIsDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  location === '/schedule' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'hover:bg-accent/50 text-foreground'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">{t('nav_schedule')}</span>
              </Link>
              <Link 
                href="/about" 
                onClick={() => setIsDrawerOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  location === '/about' 
                    ? 'bg-primary text-primary-foreground shadow-lg' 
                    : 'hover:bg-accent/50 text-foreground'
                }`}
              >
                <Info className="w-5 h-5" />
                <span className="font-medium">{t('nav_about')}</span>
              </Link>
            </nav>

            <div className="p-4 space-y-2 border-t border-border/50">
              <button 
                onClick={toggleDark}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-accent/50 text-foreground text-left"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                <span className="font-medium">{isDark ? t('light_mode') : t('dark_mode')}</span>
              </button>
              
              <button 
                onClick={handleLangSwitch}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 hover:bg-accent/50 text-foreground text-left"
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">
                  {lang === 'en' ? 'English' : lang === 'badini' ? 'Badini' : 'العربية'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};