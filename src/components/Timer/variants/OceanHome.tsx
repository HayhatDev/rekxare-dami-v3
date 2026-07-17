import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime, calculateXPProgress } from '../../../utils/helpers';
import { PRESET_MINUTES, SUBJECT_COLORS } from '../../../utils/constants';

export default function OceanHome() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { lang, setLang } = useLangStore();
  const { isDark } = useThemeStore();
  const { data: studyData, isLoading } = useStudyData();
  
  const subjectsObj = t('subjects', { returnObjects: true });
  const subjects = Array.isArray(subjectsObj) ? subjectsObj : ['Math', 'Science', 'History', 'Art', 'Music'];
  const presets = Array.isArray(PRESET_MINUTES) ? PRESET_MINUTES : [15, 25, 45, 60, 90];
  const colors = Array.isArray(SUBJECT_COLORS) ? SUBJECT_COLORS : (typeof SUBJECT_COLORS === 'object' ? Object.values(SUBJECT_COLORS) : ['#1A90C8', '#00C8B8']);

  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'General');
  const [selectedMinutes, setSelectedMinutes] = useState(presets[1] || 25);
  
  const { secondsLeft, isActive, isDone, progress, toggle, reset } = useTimer(selectedMinutes, selectedSubject);
  
  const cycleLang = () => {
    const next = { en: 'badini', badini: 'ar', ar: 'en' };
    setLang(next[lang as keyof typeof next] as any);
  };
  
  const bg = isDark ? '#06101E' : '#EBF4FB';
  const text = isDark ? '#C8E4F5' : '#06101E';
  const panelBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
  const border = isDark ? 'rgba(0,200,184,0.3)' : 'rgba(0,200,184,0.2)';
  const waveColor = '#1A90C8';
  const teal = '#00C8B8';
  
  const waterY = 280 - (progress * 2.8);
  const amplitude = 12;
  const pathData = `M 0,${waterY} Q 70,${waterY - amplitude} 140,${waterY} T 280,${waterY} T 420,${waterY} T 560,${waterY} L 560,280 L 0,280 Z`;

  const formatStatValue = (label: string) => {
    if (isLoading || !studyData) return '-';
    switch(label) {
      case 'DEPTH': return formatTime(studyData.total_seconds || 0);
      case 'DIVES': return `${studyData.sessions || 0}`;
      case 'STREAK': return `${studyData.streak || 0} days`;
      case 'SURFACE GOAL': 
        return `${Math.round(((studyData.daily_seconds || 0) / Math.max(1, studyData.daily_goal_seconds || 1)) * 100)}%`;
      default: return '';
    }
  };

  const getStatProgress = (label: string) => {
    if (!studyData) return 0;
    switch(label) {
      case 'DEPTH': return Math.min(100, ((studyData.total_seconds || 0) / 360000) * 100);
      case 'DIVES': return Math.min(100, ((studyData.sessions || 0) / 100) * 100);
      case 'STREAK': return Math.min(100, ((studyData.streak || 0) / 30) * 100);
      case 'SURFACE GOAL': return Math.min(100, ((studyData.daily_seconds || 0) / Math.max(1, studyData.daily_goal_seconds || 1)) * 100);
      default: return 0;
    }
  };

  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-jakarta transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: bg, color: text }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        @keyframes waveMove {
          0% { transform: translateX(0); }
          100% { transform: translateX(-280px); }
        }
        .wave-anim { animation: waveMove 3s infinite linear; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .nav-link { position: relative; color: inherit; opacity: 0.7; transition: opacity 0.2s; }
        .nav-link:hover, .nav-link.active { opacity: 1; }
        .nav-link.active::after { content: ''; position: absolute; bottom: -24px; left: 0; right: 0; height: 2px; background: ${teal}; }
      `}</style>

      <header className="px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: border }}>
        <div className="font-semibold tracking-wider flex items-center gap-3">
          <div className="w-5 h-5 rounded-full" style={{ background: `linear-gradient(135deg, ${waveColor}, ${teal})` }}></div>
          REKXARE DAMI
        </div>
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`}>Timer</Link>
          <Link href="/schedule" className={`nav-link ${location === '/schedule' ? 'active' : ''}`}>Schedule</Link>
          <Link href="/about" className={`nav-link ${location === '/about' ? 'active' : ''}`}>About</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm font-medium">
          <button onClick={cycleLang} className="opacity-70 hover:opacity-100 transition-opacity">
            {lang === 'ar' ? 'العربية' : lang === 'badini' ? 'Badini' : 'English'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        
        {/* Left Column: Stats & Subjects */}
        <div className="lg:col-span-4 flex flex-col gap-12">
          <div className="flex flex-col gap-6">
            <h2 className="text-xs uppercase tracking-widest opacity-60">Deep Dive Subjects</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {subjects.map((sub, i) => {
                const isSelected = selectedSubject === sub;
                const subColor = colors[i % colors.length] as string;
                return (
                  <button
                    key={sub}
                    title={sub}
                    onClick={() => !isActive && setSelectedSubject(sub)}
                    className="flex-shrink-0 w-10 h-10 rounded-full transition-transform hover:scale-110 flex items-center justify-center text-xs text-white font-medium shadow-sm"
                    style={{
                      backgroundColor: subColor,
                      boxShadow: isSelected ? `0 0 0 2px ${bg}, 0 0 0 4px ${teal}` : 'none',
                      opacity: isActive && !isSelected ? 0.4 : 1
                    }}
                  >
                    {sub.substring(0, 2)}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <h2 className="text-xs uppercase tracking-widest opacity-60">Dive Logs</h2>
            <div className="flex flex-col gap-5">
              {['DEPTH', 'DIVES', 'STREAK', 'SURFACE GOAL'].map(stat => (
                <div key={stat} className="flex items-center gap-5">
                  <div className="w-1 h-10 rounded-full bg-black/5 dark:bg-white/5 relative overflow-hidden">
                    <div 
                      className="absolute bottom-0 w-full rounded-full transition-all duration-1000"
                      style={{ height: `${getStatProgress(stat)}%`, backgroundColor: teal }}
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider opacity-50 mb-1">{stat}</span>
                    <span className="text-sm font-semibold">{formatStatValue(stat)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Column: Timer SVG */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center gap-10">
          <div className="relative w-[280px] h-[280px] rounded-[48px] overflow-hidden shadow-2xl shadow-teal-900/10" style={{ backgroundColor: panelBg }}>
            <svg width="280" height="280" className="absolute inset-0">
              <defs>
                <clipPath id="ocean-clip">
                  <rect width="280" height="280" rx="48" />
                </clipPath>
              </defs>
              <g clipPath="url(#ocean-clip)">
                <path 
                  d={pathData} 
                  fill={waveColor} 
                  opacity="0.9" 
                  className="wave-anim transition-all duration-1000" 
                />
                <path 
                  d={`M 0,${waterY+8} Q 70,${waterY+8 + amplitude} 140,${waterY+8} T 280,${waterY+8} T 420,${waterY+8} T 560,${waterY+8} L 560,280 L 0,280 Z`} 
                  fill={teal} 
                  opacity="0.5" 
                  className="wave-anim transition-all duration-1000"
                  style={{ animationDirection: 'reverse', animationDuration: '4s' }}
                />
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none drop-shadow-md">
              <span className="text-[4rem] font-light tracking-tight leading-none text-white">{formatTime(secondsLeft)}</span>
              <span className="text-xs font-semibold tracking-[0.2em] text-white/80 mt-3 uppercase">{selectedSubject}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="px-8 py-3.5 rounded-full text-sm font-semibold tracking-wider transition-transform active:scale-95"
              style={{ 
                backgroundColor: isActive ? 'transparent' : waveColor, 
                color: isActive ? text : '#fff', 
                border: isActive ? `1px solid ${border}` : '1px solid transparent' 
              }}
            >
              {isActive ? 'SURFACE' : 'DIVE IN'}
            </button>
            <button
              onClick={reset}
              className="px-6 py-3.5 rounded-full text-sm font-semibold tracking-wider transition-opacity opacity-50 hover:opacity-100"
              style={{ border: `1px solid ${border}` }}
            >
              RESET
            </button>
          </div>
        </div>

        {/* Right Column: Presets */}
        <div className="lg:col-span-4 flex flex-col gap-6 lg:items-end">
          <h2 className="text-xs uppercase tracking-widest opacity-60 lg:text-right">Plan Dive</h2>
          <div className="flex flex-wrap lg:flex-col gap-3 justify-start lg:justify-end lg:items-end">
            {presets.map((mins) => (
              <button
                key={mins}
                onClick={() => !isActive && setSelectedMinutes(mins as number)}
                disabled={isActive}
                className="px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm"
                style={{
                  backgroundColor: selectedMinutes === mins ? teal : panelBg,
                  color: selectedMinutes === mins ? '#fff' : text,
                  opacity: isActive && selectedMinutes !== mins ? 0.3 : 1,
                  transform: selectedMinutes === mins ? 'scale(1.05)' : 'scale(1)'
                }}
              >
                {mins} Minutes
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}