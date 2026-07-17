import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime } from '../../../utils/helpers';
import { PRESET_MINUTES } from '../../../utils/constants';
import { Sun, Moon, Globe, ChevronDown, Check } from 'lucide-react';

export default function PaperHome() {
  const { t } = useTranslation();
  const subjects = (t('subjects', { returnObjects: true }) || [
    'Mathematics', 'Physics', 'Chemistry', 'English', 
    'Biology', 'History', 'Geography', 'Art', 'Computer Science'
  ]) as string[];
  
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'Physics');
  const defaultDurations = PRESET_MINUTES && PRESET_MINUTES.length > 0 ? PRESET_MINUTES : [5, 15, 25, 45, 60];
  const [selectedDuration, setSelectedDuration] = useState(defaultDurations.includes(25) ? 25 : defaultDurations[0]);
  
  const { data, isLoading } = useStudyData();
  const { secondsLeft, isActive, progress, toggle, reset } = useTimer(selectedDuration, selectedSubject);
  const { isDark, toggleDark } = useThemeStore();
  const { lang, setLang } = useLangStore();
  
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [location] = useLocation();

  const currentTab = location === '/schedule' ? 'Schedule' : location === '/about' ? 'About' : 'Timer';

  const todayTimeFormatted = data ? formatTime(data.total_seconds || data.daily_seconds || 0) : "00:00";
  const sessionsToday = data?.sessions || 0;
  const currentStreak = data?.streak || 0;
  const goalProgress = data?.daily_goal_seconds && data.daily_goal_seconds > 0 
    ? Math.min(100, Math.round(((data.daily_seconds || 0) / data.daily_goal_seconds) * 100)) 
    : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@300;400;500&display=swap');
        
        .editorial-wrapper {
          --bg: ${isDark ? '#1A1918' : '#F4EFE6'};
          --ink: ${isDark ? '#F4EFE6' : '#1A1918'};
          --ink-muted: ${isDark ? 'rgba(244, 239, 230, 0.7)' : 'rgba(26, 25, 24, 0.7)'};
          --ink-faint: ${isDark ? 'rgba(244, 239, 230, 0.3)' : 'rgba(26, 25, 24, 0.3)'};
          --ink-border: ${isDark ? 'rgba(244, 239, 230, 0.2)' : 'rgba(26, 25, 24, 0.2)'};
          --accent: ${isDark ? '#D8775A' : '#A94A31'};
        }

        .editorial-wrapper {
          font-family: 'Cormorant Garamond', serif;
          background-color: var(--bg);
          color: var(--ink);
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.04'/%3E%3C/svg%3E");
        }
        
        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }
        
        .editorial-wrapper ::selection {
          background: var(--accent);
          color: var(--bg);
        }

        .nav-link { color: var(--ink-muted); }
        .nav-link:hover { color: var(--ink); }
        .nav-link.active { color: var(--accent); font-weight: bold; }
        
        .duration-btn { color: var(--ink-muted); padding-bottom: 4px; border-bottom: 1px solid transparent; }
        .duration-btn:hover { color: var(--ink); border-bottom: 1px solid var(--ink-faint); }
        .duration-btn.active { color: var(--accent); font-weight: bold; border-bottom: 1px solid var(--accent); }

        .btn-reset { color: var(--ink-muted); }
        .btn-reset:hover { color: var(--ink); }

        .lang-item:hover { background-color: var(--accent); color: var(--bg); }
      `}</style>

      <div className="editorial-wrapper min-h-[100dvh] p-4 md:p-12 lg:p-16 flex flex-col justify-between transition-colors duration-500">
        <div className={`max-w-7xl mx-auto w-full flex flex-col flex-1 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100 transition-opacity duration-300'}`}>
          
          <header className="flex flex-col md:flex-row justify-between items-baseline border-b pb-6 mb-10" style={{ borderColor: 'var(--ink)' }}>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold uppercase tracking-widest leading-none">
                Rekxare Dami
              </h1>
              <p className="text-xl md:text-2xl italic mt-3" style={{ color: 'var(--ink-muted)' }}>
                The Student's Daily Ledger
              </p>
            </div>
            
            <div className="flex items-center gap-8 mt-6 md:mt-0 font-mono text-sm uppercase tracking-widest">
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 transition-colors hover:text-[var(--accent)]"
                >
                  <Globe className="w-4 h-4" strokeWidth={1.5} />
                  <span>{lang === 'ar' ? 'Arabic' : lang === 'badini' ? 'Badini' : 'English'}</span>
                  <ChevronDown className="w-3 h-3" strokeWidth={1.5} />
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 border p-2 z-20 shadow-sm" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--ink)' }}>
                    {[
                      { key: 'en', label: 'English' },
                      { key: 'ar', label: 'Arabic' },
                      { key: 'badini', label: 'Badini Kurdish' }
                    ].map(l => (
                      <button 
                        key={l.key}
                        onClick={() => { setLang(l.key as any); setShowLangMenu(false); }}
                        className="lang-item w-full text-left p-2 flex items-center justify-between transition-colors"
                      >
                        {l.label}
                        {lang === l.key && <Check className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <button 
                onClick={toggleDark}
                className="flex items-center gap-2 hover:text-[var(--accent)] transition-colors"
              >
                {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
                <span>{isDark ? 'Light' : 'Dark'} Mode</span>
              </button>
            </div>
          </header>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
            
            <aside className="lg:col-span-4 flex flex-col gap-12">
              <section>
                <h2 className="text-sm font-mono uppercase tracking-[0.2em] border-b pb-2 mb-4" style={{ borderColor: 'var(--ink)' }}>
                  Table of Contents
                </h2>
                <ul className="space-y-1">
                  {subjects.map((subject, i) => (
                    <li key={subject}>
                      <button 
                        onClick={() => setSelectedSubject(subject)}
                        className="w-full group flex items-baseline justify-between py-2 text-lg transition-colors hover:text-[var(--accent)]"
                        style={{ color: selectedSubject === subject ? 'var(--accent)' : 'inherit', fontWeight: selectedSubject === subject ? 'bold' : 'normal' }}
                      >
                        <span className="flex items-baseline gap-4">
                          <span className="font-mono text-xs" style={{ opacity: 0.5 }}>
                            {String(i + 1).padStart(2, '0')}.
                          </span>
                          <span className={selectedSubject === subject ? 'italic' : ''}>
                            {subject}
                          </span>
                        </span>
                        
                        <span className="flex-1 border-b border-dotted mx-4 relative top-[-6px]" style={{ borderColor: 'var(--ink-faint)' }}></span>
                        
                        <span className="font-mono text-xs" style={{ opacity: 0.7 }}>
                          {selectedSubject === subject ? 'Pg. Current' : `Pg. 0${i + 1}`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-sm font-mono uppercase tracking-[0.2em] border-b pb-2 mb-4" style={{ borderColor: 'var(--ink)' }}>
                  Today's Ledger
                </h2>
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold font-mono">{todayTimeFormatted}</span>
                    <span className="text-sm italic mt-1" style={{ color: 'var(--ink-muted)' }}>Total study time</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold font-mono">{sessionsToday}</span>
                    <span className="text-sm italic mt-1" style={{ color: 'var(--ink-muted)' }}>Sessions complete</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold font-mono">{currentStreak}</span>
                    <span className="text-sm italic mt-1" style={{ color: 'var(--ink-muted)' }}>Day streak</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-bold font-mono" style={{ color: 'var(--accent)' }}>{goalProgress}%</span>
                    <span className="text-sm italic mt-1" style={{ color: 'var(--ink-muted)' }}>Goal progress</span>
                  </div>
                </div>
              </section>
            </aside>

            <main className="lg:col-span-8 border-l-0 lg:border-l lg:pl-20 flex flex-col justify-center pb-12" style={{ borderColor: 'var(--ink)' }}>
              <div className="mb-8">
                <p className="font-mono text-sm tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--accent)' }}>
                  Session Entry — {selectedSubject}
                </p>
                <h2 className="text-4xl italic">Deep Work Focus</h2>
              </div>

              <div className="relative my-12 flex justify-center items-center py-20">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] rounded-full border flex items-center justify-center" style={{ borderColor: 'var(--ink-border)' }}>
                    <div className="w-[280px] h-[280px] md:w-[420px] md:h-[420px] rounded-full border border-dashed flex items-center justify-center" style={{ borderColor: 'var(--ink-faint)' }}>
                      <div className="w-[260px] h-[260px] md:w-[390px] md:h-[390px] rounded-full border" style={{ borderColor: 'var(--ink)', opacity: 0.1 }} />
                    </div>
                  </div>
                  
                  <svg className="absolute w-[320px] h-[320px] md:w-[480px] md:h-[480px] animate-[spin_60s_linear_infinite]" viewBox="0 0 100 100">
                    <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" fill="none" />
                    <text className="text-[4px] font-mono tracking-widest uppercase" fill="var(--ink)" opacity="0.4">
                      <textPath href="#circlePath" startOffset="0%">
                        • REKXARE DAMI • STUDY JOURNAL • VOL 1 • REKXARE DAMI • STUDY JOURNAL • VOL 1
                      </textPath>
                    </text>
                  </svg>
                </div>
                
                <div className="relative z-10 text-center flex flex-col items-center">
                  <div className="text-[120px] md:text-[180px] leading-none font-medium tracking-tight font-mono" style={{ color: 'var(--accent)' }}>
                    {formatTime(secondsLeft)}
                  </div>
                  <div className="mt-4 font-mono text-sm uppercase tracking-[0.3em] flex items-center gap-4">
                    <span className="w-12 h-[1px]" style={{ backgroundColor: 'var(--ink)' }}></span>
                    Remaining of {selectedDuration}m
                    <span className="w-12 h-[1px]" style={{ backgroundColor: 'var(--ink)' }}></span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-12 mt-4">
                <div className="flex gap-8 text-xl uppercase tracking-widest">
                  <button 
                    onClick={toggle}
                    className="relative group overflow-hidden"
                  >
                    <span className="relative z-10">{isActive ? 'Pause' : 'Start'}</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100" style={{ backgroundColor: 'var(--ink)' }}></span>
                  </button>
                  <span style={{ color: 'var(--ink-faint)' }}>/</span>
                  <button onClick={reset} className="btn-reset relative group overflow-hidden transition-colors">
                    <span className="relative z-10">Reset</span>
                    <span className="absolute bottom-0 left-0 w-full h-[1px] transform origin-left transition-transform duration-300 scale-x-0 group-hover:scale-x-100" style={{ backgroundColor: 'var(--ink)' }}></span>
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-6 font-mono text-sm border-t pt-8 w-full max-w-md" style={{ borderColor: 'var(--ink-border)' }}>
                  {defaultDurations.map((dur) => (
                    <button
                      key={dur}
                      onClick={() => setSelectedDuration(dur)}
                      className={`duration-btn transition-colors ${selectedDuration === dur ? 'active' : ''}`}
                    >
                      {dur}m
                    </button>
                  ))}
                </div>
              </div>

            </main>
          </div>
          
          <footer className="mt-16 pt-6 border-t flex justify-between font-mono text-sm uppercase tracking-widest" style={{ borderColor: 'var(--ink)' }}>
            <div className="flex gap-8">
              {[
                { label: 'Timer', href: '/' },
                { label: 'Schedule', href: '/schedule' },
                { label: 'About', href: '/about' }
              ].map((tab, i) => (
                <Link
                  key={tab.label}
                  href={tab.href}
                  className={`nav-link flex items-center gap-3 transition-colors ${currentTab === tab.label ? 'active' : ''}`}
                >
                  <span style={{ opacity: 0.5 }}>{(i+1).toString().padStart(2, '0')}.</span>
                  {tab.label}
                </Link>
              ))}
            </div>
            
            <div className="hidden md:block" style={{ opacity: 0.5 }}>
              Printed in {new Date().getFullYear()}
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
