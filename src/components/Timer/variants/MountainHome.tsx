import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime } from '../../../utils/helpers';
import { PRESET_MINUTES, SUBJECT_COLORS } from '../../../utils/constants';
import { Mountain, Footprints, Map, Info, Sun, Moon, Globe } from 'lucide-react';

export default function MountainHome() {
  const { t } = useTranslation();
  const subjects = (t('subjects', { returnObjects: true }) || [
    'Mathematics', 'Physics', 'Chemistry', 'English', 
    'Biology', 'History', 'Geography', 'Art', 'Computer Science'
  ]) as string[];
  
  const [selectedSubject, setSelectedSubject] = useState(subjects[0] || 'Mathematics');
  const defaultDurations = PRESET_MINUTES && PRESET_MINUTES.length > 0 ? PRESET_MINUTES : [5, 15, 25, 45, 60];
  const [selectedDuration, setSelectedDuration] = useState(defaultDurations.includes(25) ? 25 : defaultDurations[0]);
  
  const { data, isLoading } = useStudyData();
  const { secondsLeft, isActive, progress, toggle, reset } = useTimer(selectedDuration, selectedSubject);
  const { isDark, toggleDark } = useThemeStore();
  const { lang, setLang } = useLangStore();

  const cycleLang = () => { 
    const next: Record<string, string> = { en: 'badini', badini: 'ar', ar: 'en' }; 
    setLang(next[lang] as any); 
  };

  const todayTimeFormatted = data ? formatTime(data.daily_seconds) : "00:00";
  const sessionsToday = data?.sessions || 0;
  const currentStreak = data?.streak || 0;
  const goalProgress = data?.daily_goal_seconds && data.daily_goal_seconds > 0 
    ? Math.min(100, Math.round((data.daily_seconds / data.daily_goal_seconds) * 100)) 
    : 0;

  const getSubjectColor = (subject: string) => {
    return (SUBJECT_COLORS as any)?.[subject] || (isDark ? '#6B8E6F' : '#4A5D45');
  };

  const currentColor = getSubjectColor(selectedSubject);
  const shortLangLabel = lang === 'ar' ? 'AR' : lang === 'badini' ? 'KU' : 'EN';

  return (
    <div className={`min-h-[100dvh] transition-colors duration-500 ${isDark ? 'bg-[#2B3428]' : 'bg-[#E8EEE4]'}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@400;500&display=swap');
        
        @keyframes drift {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(10px, -10px) rotate(2deg); }
        }
        
        @keyframes drift-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-15px, 8px) rotate(-2deg); }
        }
        
        .animate-drift {
          animation: drift 25s ease-in-out infinite;
        }
        
        .animate-drift-slow {
          animation: drift-slow 35s ease-in-out infinite;
        }
      `}</style>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute -top-20 -right-20 w-96 h-96 opacity-[0.07] animate-drift" viewBox="0 0 200 200">
          <path d="M40,100 Q60,40 100,50 T160,100 Q140,160 100,150 T40,100 Z" fill={isDark ? '#B8794F' : '#4A5D45'} />
        </svg>
        <svg className="absolute bottom-10 -left-10 w-64 h-64 opacity-[0.05] animate-drift-slow" viewBox="0 0 200 200">
          <path d="M50,120 Q80,60 120,70 T170,130 Q150,180 110,170 T50,120 Z" fill={isDark ? '#6B8E6F' : '#8B6F47'} />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-8" style={{ fontFamily: '"DM Sans", sans-serif' }}>
        {/* Top bar with nav and controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-12">
          {/* Logo/brand */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[40%] ${isDark ? 'bg-[#4A5D45]' : 'bg-[#6B8E6F]'} flex items-center justify-center shadow-sm`}>
              <Mountain className="text-[#E8EEE4]" size={20} />
            </div>
            <h1 className={`text-xl font-semibold tracking-tight ${isDark ? 'text-[#E8EEE4]' : 'text-[#2B3428]'}`} style={{ fontFamily: 'Fraunces, serif' }}>
              Rekxare Dami
            </h1>
          </div>

          {/* Navigation as map pins */}
          <div className="flex items-center gap-2">
            <Link href="/schedule" className={`px-4 py-2 rounded-[20px] flex items-center gap-2 transition-all ${isDark ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]' : 'bg-white/60 text-[#4A5D45] hover:bg-white/90'} shadow-sm`}>
              <Map size={16} />
              <span className="text-sm font-medium">Schedule</span>
            </Link>
            <Link href="/about" className={`px-4 py-2 rounded-[20px] flex items-center gap-2 transition-all ${isDark ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]' : 'bg-white/60 text-[#4A5D45] hover:bg-white/90'} shadow-sm`}>
              <Info size={16} />
              <span className="text-sm font-medium">About</span>
            </Link>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDark}
              className={`w-9 h-9 rounded-[35%] flex items-center justify-center transition-all ${isDark ? 'bg-[#3D4A38] text-[#F5D899] hover:bg-[#4A5D45]' : 'bg-white/60 text-[#8B6F47] hover:bg-white/90'} shadow-sm`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={cycleLang}
              className={`px-3 h-9 rounded-[20px] flex items-center gap-1.5 transition-all ${isDark ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]' : 'bg-white/60 text-[#4A5D45] hover:bg-white/90'} shadow-sm`}
            >
              <Globe size={14} />
              <span className="text-xs font-medium">{shortLangLabel}</span>
            </button>
          </div>
        </div>

        {/* Main content grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100 transition-opacity duration-300'}`}>
          {/* Left column - Stats as trail markers */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className={`rounded-[30px] p-6 ${isDark ? 'bg-[#3D4A38]/40' : 'bg-white/40'} backdrop-blur-sm shadow-sm`}>
              <div className="space-y-5">
                {/* Today's journey */}
                <div>
                  <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    Today's Journey
                  </div>
                  <div className={`text-3xl font-bold ${isDark ? 'text-[#E8EEE4]' : 'text-[#2B3428]'}`} style={{ fontFamily: 'Fraunces, serif' }}>
                    {todayTimeFormatted}
                  </div>
                </div>

                {/* Sessions as stones */}
                <div>
                  <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    Stones Placed
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-5 h-5 rounded-[40%] ${i < sessionsToday ? (isDark ? 'bg-[#6B8E6F]' : 'bg-[#4A5D45]') : (isDark ? 'bg-[#3D4A38]' : 'bg-white/60')} shadow-sm transition-all`}
                      />
                    ))}
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    {sessionsToday} of 8 today
                  </div>
                </div>

                {/* Streak as footprints */}
                <div>
                  <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    Trail Length
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints className={isDark ? 'text-[#B8794F]' : 'text-[#8B6F47]'} size={20} />
                    <div className={`text-2xl font-bold ${isDark ? 'text-[#E8EEE4]' : 'text-[#2B3428]'}`} style={{ fontFamily: 'Fraunces, serif' }}>
                      {currentStreak} <span className="text-sm font-normal">days</span>
                    </div>
                  </div>
                </div>

                {/* Goal as elevation */}
                <div>
                  <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    Elevation Gained
                  </div>
                  <div className="relative h-2 rounded-full overflow-hidden" style={{ background: isDark ? '#3D4A38' : '#D8E2D4' }}>
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                      style={{
                        width: `${goalProgress}%`,
                        background: `linear-gradient(90deg, ${isDark ? '#6B8E6F' : '#4A5D45'}, ${isDark ? '#8B6F47' : '#6B8E6F'})`,
                      }}
                    />
                  </div>
                  <div className={`text-xs mt-1 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                    {goalProgress}% of daily goal
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Center - Timer as terrain/mountain */}
          <div className="col-span-1 lg:col-span-6 flex flex-col">
            {/* Terrain selector */}
            <div className="mb-6">
              <div className={`text-xs uppercase tracking-wider mb-3 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                Choose Your Terrain
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={() => setSelectedSubject(subject)}
                    className={`px-4 py-2 rounded-[20px] text-sm font-medium transition-all shadow-sm ${
                      selectedSubject === subject
                        ? 'text-white shadow-md'
                        : isDark
                        ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]'
                        : 'bg-white/50 text-[#4A5D45] hover:bg-white/80'
                    }`}
                    style={
                      selectedSubject === subject
                        ? { backgroundColor: getSubjectColor(subject) }
                        : {}
                    }
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer visualization as mountain/terrain */}
            <div className={`flex-1 rounded-[40px] p-6 sm:p-10 flex flex-col items-center justify-center ${isDark ? 'bg-[#3D4A38]/40' : 'bg-white/40'} backdrop-blur-sm shadow-lg relative overflow-hidden`}>
              {/* Decorative terrain pattern */}
              <svg className="absolute bottom-0 left-0 right-0 opacity-10" viewBox="0 0 1200 400" preserveAspectRatio="none">
                <path
                  d="M0,300 Q200,200 400,250 T800,280 Q1000,260 1200,300 L1200,400 L0,400 Z"
                  fill={currentColor}
                />
                <path
                  d="M0,350 Q300,300 600,320 T1200,340 L1200,400 L0,400 Z"
                  fill={currentColor}
                  opacity="0.5"
                />
              </svg>

              {/* Mountain progress indicator */}
              <div className="relative mb-8 z-10">
                <svg width="280" height="240" viewBox="0 0 280 240" className="drop-shadow-md">
                  {/* Mountain outline */}
                  <path
                    d="M20,220 L80,120 L140,180 L200,80 L260,220 Z"
                    fill="none"
                    stroke={isDark ? '#5D6F58' : '#A8C4A0'}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  
                  {/* Filled portion (progress) */}
                  <defs>
                    <clipPath id="progressClip">
                      <rect x="0" y={220 - (progress / 100) * 140} width="280" height={(progress / 100) * 140} />
                    </clipPath>
                  </defs>
                  <path
                    d="M20,220 L80,120 L140,180 L200,80 L260,220 Z"
                    fill={currentColor}
                    opacity="0.7"
                    clipPath="url(#progressClip)"
                  />
                  
                  {/* Marker/flag at current position */}
                  <g transform={`translate(${20 + (progress / 100) * 240}, ${220 - (progress / 100) * 140})`}>
                    <circle cx="0" cy="0" r="6" fill={isDark ? '#E8EEE4' : '#2B3428'} />
                    <circle cx="0" cy="0" r="3" fill={currentColor} />
                  </g>
                </svg>
              </div>

              {/* Timer display */}
              <div className={`text-6xl font-bold tracking-tight mb-2 ${isDark ? 'text-[#E8EEE4]' : 'text-[#2B3428]'}`} style={{ fontFamily: 'Fraunces, serif' }}>
                {formatTime(secondsLeft)}
              </div>
              <div className={`text-sm mb-8 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                of {formatTime(selectedDuration * 60)} remaining
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6 z-10">
                <button
                  onClick={toggle}
                  className={`px-8 py-3 rounded-[25px] font-medium transition-all shadow-md hover:shadow-lg ${
                    isActive
                      ? isDark
                        ? 'bg-[#B8794F] text-[#2B3428] hover:bg-[#C88A5F]'
                        : 'bg-[#4A5D45] text-white hover:bg-[#5B7C56]'
                      : isDark
                      ? 'bg-[#6B8E6F] text-[#2B3428] hover:bg-[#7B9E7F]'
                      : 'bg-[#6B8E6F] text-white hover:bg-[#7B9E7F]'
                  }`}
                >
                  {isActive ? 'Pause Journey' : 'Resume Journey'}
                </button>
                <button
                  onClick={reset}
                  className={`px-6 py-3 rounded-[25px] font-medium transition-all shadow-sm ${isDark ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]' : 'bg-white/60 text-[#4A5D45] hover:bg-white/90'}`}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Right column - Duration selection */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className={`rounded-[30px] p-6 ${isDark ? 'bg-[#3D4A38]/40' : 'bg-white/40'} backdrop-blur-sm shadow-sm`}>
              <div className={`text-xs uppercase tracking-wider mb-4 ${isDark ? 'text-[#9FB399]' : 'text-[#6B8E6F]'}`}>
                Journey Length
              </div>
              <div className="space-y-2.5">
                {defaultDurations.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => setSelectedDuration(duration)}
                    className={`w-full px-4 py-3 rounded-[20px] text-left font-medium transition-all ${
                      selectedDuration === duration
                        ? isDark
                          ? 'bg-[#6B8E6F] text-[#E8EEE4] shadow-md'
                          : 'bg-[#4A5D45] text-white shadow-md'
                        : isDark
                        ? 'bg-[#3D4A38] text-[#C5D1BF] hover:bg-[#4A5D45]'
                        : 'bg-white/50 text-[#4A5D45] hover:bg-white/80'
                    } shadow-sm`}
                  >
                    {duration} minutes
                  </button>
                ))}
              </div>
            </div>

            {/* Encouragement note */}
            <div className={`rounded-[30px] p-5 ${isDark ? 'bg-[#B8794F]/20 border-2 border-[#B8794F]/30' : 'bg-[#F5D899]/30 border-2 border-[#E5C889]/40'} backdrop-blur-sm`}>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-[#F5D899]' : 'text-[#8B6F47]'}`}>
                Each step forward is progress. The trail is yours to walk at your own pace.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
