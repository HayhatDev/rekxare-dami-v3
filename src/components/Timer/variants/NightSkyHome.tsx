import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime, calculateXPProgress } from '../../../utils/helpers';
import { PRESET_MINUTES, SUBJECT_COLORS } from '../../../utils/constants';

const STARS_COUNT = 50;
const backgroundStars = Array.from({ length: STARS_COUNT }).map((_, i) => {
  const seed1 = Math.sin(i * 1234) * 10000;
  const seed2 = Math.cos(i * 4321) * 10000;
  return {
    x: (seed1 - Math.floor(seed1)) * 320,
    y: (seed2 - Math.floor(seed2)) * 320,
    r: (Math.sin(i * 987) * 10000 - Math.floor(Math.sin(i * 987) * 10000)) * 1.5 + 0.5,
    delay: (seed1 - Math.floor(seed1)) * 5
  };
});

const CONSTELLATION = [
  {x: 60, y: 160},
  {x: 100, y: 120},
  {x: 140, y: 80},
  {x: 200, y: 90},
  {x: 240, y: 150},
  {x: 220, y: 220},
  {x: 160, y: 250},
  {x: 100, y: 230},
  {x: 140, y: 160},
  {x: 180, y: 170}
];

export default function NightSkyHome() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { lang, setLang } = useLangStore();
  const { isDark } = useThemeStore();
  const { data: studyData, isLoading } = useStudyData();
  
  const subjectsObj = t('subjects', { returnObjects: true });
  const subjects = Array.isArray(subjectsObj) ? subjectsObj : ['Math', 'Science', 'History', 'Art', 'Music'];
  const presets = Array.isArray(PRESET_MINUTES) ? PRESET_MINUTES : [15, 25, 45, 60, 90];
  const colors = Array.isArray(SUBJECT_COLORS) ? SUBJECT_COLORS : (typeof SUBJECT_COLORS === 'object' ? Object.values(SUBJECT_COLORS) : ['#6B8FD4', '#E8C54A']);

  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'General');
  const [selectedMinutes, setSelectedMinutes] = useState(presets[1] || 25);
  
  const { secondsLeft, isActive, isDone, progress, toggle, reset } = useTimer(selectedMinutes, selectedSubject);
  
  const cycleLang = () => {
    const next = { en: 'badini', badini: 'ar', ar: 'en' };
    setLang(next[lang as keyof typeof next] as any);
  };
  
  const bg = isDark ? '#06091A' : '#EEF2FA';
  const text = isDark ? '#D8E4F0' : '#06091A';
  const accent = '#6B8FD4';
  const gold = '#E8C54A';
  const border = isDark ? 'rgba(107,143,212,0.2)' : 'rgba(107,143,212,0.3)';

  const activeStarsCount = Math.floor((progress / 100) * CONSTELLATION.length) + (progress > 0 ? 1 : 0);
  const activeStarsMax = Math.min(CONSTELLATION.length, activeStarsCount);

  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-grotesk transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: bg, color: text }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=Space+Mono:wght@400&display=swap');
        .font-grotesk { font-family: 'Space Grotesk', sans-serif; }
        .font-mono-num { font-family: 'Space Mono', monospace; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .star-active { animation: twinkle 2s infinite ease-in-out; }
        .night-border { border: 1px solid ${border}; }
        .night-hover:hover { box-shadow: 0 0 12px 0 rgba(107,143,212,0.2); }
        .nav-link { position: relative; color: inherit; opacity: 0.6; transition: all 0.3s; }
        .nav-link:hover, .nav-link.active { opacity: 1; color: ${accent}; }
      `}</style>

      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: border }}>
        <div className="font-mono-num text-sm tracking-widest flex items-center gap-2" style={{ color: text }}>
          REKXARE DAMI
        </div>
        <nav className="hidden md:flex items-center gap-12 text-sm font-medium uppercase tracking-widest">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`}>Timer</Link>
          <Link href="/schedule" className={`nav-link ${location === '/schedule' ? 'active' : ''}`}>Schedule</Link>
          <Link href="/about" className={`nav-link ${location === '/about' ? 'active' : ''}`}>About</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm font-mono-num">
          <button onClick={cycleLang} className="opacity-60 hover:opacity-100 transition-opacity">
            {lang === 'ar' ? 'AR' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mt-8">
        
        {/* Left Column: Subjects & Presets */}
        <div className="lg:col-span-3 flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <h2 className="text-xs font-mono-num uppercase tracking-[0.2em] opacity-50">Constellations</h2>
            <div className="flex gap-4 flex-wrap">
              {subjects.map((sub, i) => {
                const isSelected = selectedSubject === sub;
                const subColor = colors[i % colors.length] as string;
                return (
                  <div key={sub} className="flex flex-col items-center gap-2">
                    <div className="w-1 h-1 rounded-full transition-colors" style={{ backgroundColor: isSelected ? gold : 'transparent' }} />
                    <button
                      title={sub}
                      onClick={() => !isActive && setSelectedSubject(sub)}
                      className="w-9 h-9 rounded-full transition-all duration-300 flex items-center justify-center text-xs text-white"
                      style={{
                        backgroundColor: subColor,
                        boxShadow: isSelected ? `0 0 0 2px ${bg}, 0 0 0 2px ${gold}` : 'none',
                        opacity: isActive && !isSelected ? 0.3 : 1,
                        filter: isSelected ? 'brightness(1.2)' : 'brightness(0.8)'
                      }}
                    >
                      {sub.substring(0, 2)}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <h2 className="text-xs font-mono-num uppercase tracking-[0.2em] opacity-50">Mission Duration</h2>
            <div className="flex flex-wrap gap-2">
              {presets.map((mins) => (
                <button
                  key={mins}
                  onClick={() => !isActive && setSelectedMinutes(mins as number)}
                  disabled={isActive}
                  className="px-4 py-1.5 text-xs night-border night-hover transition-all font-mono-num rounded-sm"
                  style={{
                    backgroundColor: selectedMinutes === mins ? 'rgba(232,197,74,0.1)' : 'transparent',
                    color: selectedMinutes === mins ? gold : text,
                    borderColor: selectedMinutes === mins ? gold : border,
                    opacity: isActive && selectedMinutes !== mins ? 0.3 : 1
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Timer SVG */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center gap-10">
          <div className="relative w-[320px] h-[320px] flex items-center justify-center night-border rounded-full bg-black/5 dark:bg-white/5 shadow-2xl" style={{ boxShadow: `0 0 40px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(107,143,212,0.1)'}` }}>
            <svg width="320" height="320" className="absolute inset-0 rounded-full">
              {backgroundStars.map((s, i) => (
                <circle 
                  key={`bg-${i}`} 
                  cx={s.x} cy={s.y} r={s.r} 
                  fill={text} 
                  opacity={0.15 + (Math.sin(i)*0.1)} 
                  style={{ animation: `twinkle 4s infinite ${s.delay}s` }}
                />
              ))}
              
              {CONSTELLATION.map((star, i) => {
                if (i === 0) return null;
                const prev = CONSTELLATION[i-1];
                const isActiveLine = i < activeStarsMax;
                return (
                  <line 
                    key={`line-${i}`}
                    x1={prev.x} y1={prev.y} x2={star.x} y2={star.y}
                    stroke={gold}
                    strokeWidth="1"
                    opacity={isActiveLine ? 0.4 : 0}
                    className="transition-opacity duration-1000"
                  />
                );
              })}
              
              {CONSTELLATION.map((star, i) => {
                const isActiveStar = i < activeStarsMax;
                return (
                  <circle 
                    key={`star-${i}`}
                    cx={star.x} cy={star.y} r={isActiveStar ? 3.5 : 1.5}
                    fill={isActiveStar ? gold : text}
                    opacity={isActiveStar ? 1 : 0.15}
                    className={isActiveStar ? "star-active transition-all duration-500" : "transition-all duration-500"}
                    style={{ transformOrigin: `${star.x}px ${star.y}px`, animationDelay: `${i * 0.2}s` }}
                  />
                );
              })}
            </svg>
            
            <div className="absolute z-10 flex flex-col items-center justify-center backdrop-blur-md px-8 py-6 rounded-2xl border" style={{ backgroundColor: isDark ? 'rgba(6,9,26,0.6)' : 'rgba(238,242,250,0.6)', borderColor: border }}>
              <span className="text-5xl font-mono-num tracking-tighter" style={{ color: text, textShadow: `0 0 10px ${isDark ? 'rgba(255,255,255,0.1)' : 'transparent'}` }}>{formatTime(secondsLeft)}</span>
              <span className="text-xs font-mono-num tracking-[0.3em] mt-2 uppercase" style={{ color: accent }}>{selectedSubject}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <button
              onClick={toggle}
              className="px-10 py-3 night-border night-hover transition-all text-sm tracking-[0.2em] uppercase rounded-sm"
              style={{ 
                backgroundColor: isActive ? 'transparent' : 'rgba(232,197,74,0.05)', 
                color: isActive ? text : gold,
                borderColor: isActive ? border : 'rgba(232,197,74,0.3)'
              }}
            >
              {isActive ? 'Pause' : 'Begin'}
            </button>
            <button
              onClick={reset}
              className="px-8 py-3 night-border night-hover transition-all opacity-50 hover:opacity-100 text-sm tracking-[0.2em] uppercase rounded-sm"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Right Column: Observation Log */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="flex flex-col border p-5 gap-4 font-mono-num text-xs bg-black/5 dark:bg-white/5 rounded-sm" style={{ borderColor: border }}>
            <h2 className="uppercase tracking-[0.2em] border-b pb-3 mb-1" style={{ borderColor: border, color: accent }}>Observation Log</h2>
            
            <div className="grid grid-cols-2 gap-y-4 items-center">
              <div className="opacity-50">TOTAL ORBIT</div>
              <div className="text-right text-sm">{isLoading ? '-' : formatTime(studyData?.total_seconds || 0)}</div>
              
              <div className="opacity-50">LOGGED</div>
              <div className="text-right text-sm">{isLoading ? '-' : studyData?.sessions || 0}</div>
              
              <div className="opacity-50">STREAK</div>
              <div className="text-right text-sm">{isLoading ? '-' : `${studyData?.streak || 0}N`}</div>
              
              <div className="opacity-50">XP PROGRESS</div>
              <div className="text-right text-sm">{isLoading ? '-' : `${calculateXPProgress(studyData?.xp_points || 0)}%`}</div>
            </div>
            
            <div className="mt-3 pt-4 border-t" style={{ borderColor: border }}>
              <div className="flex justify-between mb-3">
                <span className="opacity-50 uppercase tracking-widest">Tonight's Goal</span>
                <span>{isLoading ? '-' : Math.round(((studyData?.daily_seconds || 0) / Math.max(1, studyData?.daily_goal_seconds || 1)) * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-black/10 dark:bg-white/10 relative rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full transition-all duration-1000 rounded-full" 
                  style={{ 
                    width: `${isLoading ? 0 : Math.min(100, ((studyData?.daily_seconds || 0) / Math.max(1, studyData?.daily_goal_seconds || 1)) * 100)}%`, 
                    backgroundColor: gold 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}