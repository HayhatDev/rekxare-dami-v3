import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime } from '../../../utils/helpers';
import { PRESET_MINUTES } from '../../../utils/constants';
import { Timer, Calendar, Info, Moon, Sun, Globe } from 'lucide-react';

const FOREST_COLORS = ['#2D5A2E','#4A3728','#1A4A4A','#5A3A1E','#3A4A28','#6B4020','#283828','#4A2838','#284A3A'];

export default function ForestHome() {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const { t } = useTranslation();
  
  const subjectsData = t('subjects', { returnObjects: true });
  const subjects = Array.isArray(subjectsData) && subjectsData.length > 0 
    ? subjectsData 
    : ['Study', 'Reading', 'Coding', 'Writing', 'Math', 'Science', 'History', 'Art', 'Language'];

  const [subjectName, setSubjectName] = useState(subjects[0]);
  const { secondsLeft, isActive, isDone, progress, toggle, reset } = useTimer(selectedMinutes, subjectName);
  const { data, isLoading } = useStudyData();
  const { lang, setLang } = useLangStore();
  const { isDark, toggleDark } = useThemeStore();
  const [location] = useLocation();

  useEffect(() => {
    if (PRESET_MINUTES && PRESET_MINUTES.length > 0) {
      setSelectedMinutes(PRESET_MINUTES[0]);
    }
  }, []);

  const cycleLang = () => { 
    const next: Record<string, string> = { en: 'badini', badini: 'ar', ar: 'en' }; 
    setLang(next[lang] as any); 
  };

  const bgColor = isDark ? '#0C160B' : '#D4E8D0';
  const textColor = isDark ? '#D4E8D0' : '#0C160B';
  const leafGreen = '#4CAF50';
  const barkBrown = '#8B6040';

  const radiusOuter = 160;
  const radiusMiddle = 140;
  const radiusInner = 120;
  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const strokeDashoffsetOuter = circumferenceOuter - ((progress || 0) / 100) * circumferenceOuter;

  // Bark: 139, 96, 64. Leaf: 76, 175, 80.
  const prog = (progress || 0) / 100;
  const r = Math.round(139 + (76 - 139) * prog);
  const g = Math.round(96 + (175 - 96) * prog);
  const b = Math.round(64 + (80 - 64) * prog);
  const dynamicRingColor = `rgb(${r}, ${g}, ${b})`;

  return (
    <div 
      className="min-h-[100dvh] flex flex-col relative overflow-hidden transition-colors duration-700"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500&display=swap');
        .forest-serif { font-family: 'Lora', serif; }
        
        @keyframes sway {
          0%, 100% { transform: translateX(-4px) rotate(-1deg); }
          50% { transform: translateX(4px) rotate(1deg); }
        }
        .animate-sway { animation: sway 8s ease-in-out infinite; }
        
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.003); }
        }
        .animate-breathe { animation: breathe 6s ease-in-out infinite; }
        
        .leaf-shape {
          border-radius: 50% 10% 50% 10%;
        }
      `}</style>

      {/* SVG Background Blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <svg viewBox="0 0 1000 1000" className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] animate-sway fill-current text-[#4CAF50]">
          <path d="M410.5,690.5C310.2,740.3,212.8,797,110,750C7.2,703,-90.4,552.2,-99,446.5C-107.6,340.8,-27.2,280.2,60.5,214.5C148.2,148.8,243.2,78,350.5,75C457.8,72,577.2,136.8,638.5,232.5C699.8,328.2,703,454.8,653.5,548.5C604,642.2,510.8,640.7,410.5,690.5Z" />
        </svg>
        <svg viewBox="0 0 1000 1000" className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] animate-sway fill-current text-[#8B6040]" style={{ animationDelay: '2s' }}>
          <path d="M720,290.5C810.3,374.8,924.8,443.2,950,540.5C975.2,637.8,911.2,764,818,836.5C724.8,909,602.4,927.8,495,920.5C387.6,913.2,295.2,879.8,206.5,807.5C117.8,735.2,32.8,624,43,514.5C53.2,405,158.4,297.2,253.5,218.5C348.6,139.8,433.6,90,528,88.5C622.4,87,720,290.5,720,290.5Z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full animate-breathe min-h-[100dvh]">
        
        {/* Nav */}
        <header className="px-8 py-5 flex justify-between items-center border-b border-current border-opacity-10 backdrop-blur-sm">
          <div className="forest-serif text-xl font-semibold tracking-wide flex items-center gap-2">
            <Globe className="w-5 h-5 opacity-70" />
            Rekxare Dami
          </div>
          <nav className="flex items-center text-sm font-medium">
            <Link href="/" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/' ? 'opacity-100' : 'opacity-60'}`}>
              <Timer className="w-4 h-4" /> Timer
            </Link>
            <div className="w-px h-4 bg-current opacity-20"></div>
            <Link href="/schedule" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/schedule' ? 'opacity-100' : 'opacity-60'}`}>
              <Calendar className="w-4 h-4" /> Schedule
            </Link>
            <div className="w-px h-4 bg-current opacity-20"></div>
            <Link href="/about" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/about' ? 'opacity-100' : 'opacity-60'}`}>
              <Info className="w-4 h-4" /> About
            </Link>
            
            <div className="w-px h-4 bg-current opacity-20 ml-2 mr-4"></div>
            <div className="flex gap-4">
              <button onClick={toggleDark} className="hover:opacity-70 transition-opacity flex items-center justify-center">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={cycleLang} className="hover:opacity-70 transition-opacity uppercase text-xs font-bold tracking-wider">
                {lang === 'ar' ? 'ع' : lang === 'badini' ? 'Bad' : 'EN'}
              </button>
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-5xl mx-auto w-full gap-16 z-20 relative">
          
          {/* Top Stats - Leaf Shaped */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-4xl opacity-90">
            {[
              { label: "Today's Growth", value: formatTime(data?.daily_seconds || 0) },
              { label: "Seeds Planted", value: data?.sessions || 0 },
              { label: "Root Depth", value: `${data?.streak || 0} days` },
              { label: "Canopy Coverage", value: `${Math.round(((data?.daily_seconds || 0) / Math.max(data?.daily_goal_seconds || 3600, 1)) * 100)}%` },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="leaf-shape flex flex-col items-center justify-center p-6 text-center shadow-sm backdrop-blur-sm"
                style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
              >
                <div className="text-xs uppercase tracking-widest opacity-60 mb-2">{stat.label}</div>
                <div className="forest-serif text-xl">{isLoading ? '...' : stat.value}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col md:flex-row items-center gap-16 w-full justify-center mt-4">
            
            {/* Left: Subjects */}
            <div className="flex flex-wrap md:flex-col gap-3 justify-center md:items-end w-full md:w-1/3">
              {subjects.map((sub: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSubjectName(sub)}
                  className={`px-5 py-2.5 rounded-[50px] transition-all duration-300 text-sm whitespace-nowrap ${
                    subjectName === sub ? 'opacity-100 shadow-md scale-105 font-medium' : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: subjectName === sub ? FOREST_COLORS[idx % FOREST_COLORS.length] : 'transparent',
                    color: subjectName === sub ? '#fff' : 'inherit',
                    border: `1px solid ${FOREST_COLORS[idx % FOREST_COLORS.length]}`
                  }}
                >
                  {sub}
                </button>
              ))}
            </div>

            {/* Center: Timer Ring */}
            <div className="relative flex items-center justify-center w-full md:w-auto">
              <svg width="360" height="360" className="transform -rotate-90">
                <circle
                  cx="180" cy="180" r={radiusInner}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.05"
                />
                <circle
                  cx="180" cy="180" r={radiusMiddle}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeOpacity="0.15"
                />
                <circle
                  cx="180" cy="180" r={radiusOuter}
                  fill="none"
                  stroke={dynamicRingColor}
                  strokeWidth="2"
                  strokeDasharray={circumferenceOuter}
                  strokeDashoffset={strokeDashoffsetOuter}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div 
                  className="forest-serif text-7xl font-light tracking-tight mb-2"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatTime(secondsLeft)}
                </div>
                <div className="flex gap-2">
                  {(PRESET_MINUTES || [15, 25, 50, 90]).map((mins: number) => (
                    <button
                      key={mins}
                      onClick={() => setSelectedMinutes(mins)}
                      className={`text-xs px-2 py-1 transition-opacity ${selectedMinutes === mins ? 'opacity-100 font-medium scale-110' : 'opacity-40 hover:opacity-80'}`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex flex-row md:flex-col gap-4 w-full md:w-1/3 md:items-start justify-center">
              <button
                onClick={toggle}
                className="px-8 py-4 rounded-[32px] font-medium tracking-wide transition-all hover:scale-105 shadow-sm"
                style={{ backgroundColor: leafGreen, color: '#fff' }}
              >
                {isActive ? 'Rest' : 'Begin'}
              </button>
              <button
                onClick={reset}
                className="px-8 py-4 rounded-[32px] font-medium tracking-wide transition-all hover:scale-105 opacity-80"
                style={{ backgroundColor: barkBrown, color: '#fff' }}
              >
                Reset
              </button>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
