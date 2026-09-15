import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { CelebrationOverlay } from '../../CelebrationOverlay';
import { formatTime, calculateXPProgress } from '../../../utils/helpers';
import { SUBJECT_COLORS } from '../../../utils/constants';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import { Moon, Sun } from 'lucide-react';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { getNightSkyTokens } from '../../../lib/nightSkyTokens';

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

const FIELD_STARS = Array.from({ length: 120 }).map((_, i) => {
  const s1 = Math.sin(i * 7919) * 10000;
  const s2 = Math.cos(i * 6271) * 10000;
  const s3 = Math.sin(i * 3571) * 10000;
  return {
    x: (s1 - Math.floor(s1)) * 100,
    y: (s2 - Math.floor(s2)) * 100,
    r: (s3 - Math.floor(s3)) * 1.8 + 0.4,
    delay: (s1 - Math.floor(s1)) * 8,
    dur: 3 + (s2 - Math.floor(s2)) * 5,
    bright: (s3 - Math.floor(s3)) > 0.7,
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
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const {
    selectedSubject, setSelectedSubject,
    selectedMinutes, setSelectedMinutes,
    subjects, presets,
    secondsLeft, isActive, isDone, progress,
    toggle, reset, studyData, isLoading,
    isDark, toggleDark, lang, isRTL, cycleLang, location,
  } = useTimerSession();
  
  const tok = getNightSkyTokens(isDark);
  const bg = tok.surface.bg;
  const text = tok.text.ink;
  const accent = tok.accent.starBlue;
  const starBlueStrong = tok.accent.starBlueStrong;
  const gold = tok.accent.gold;
  const border = tok.border.hairline;
  const bgDeep = tok.surface.ring;

  const activeStarsCount = Math.floor((progress / 100) * CONSTELLATION.length) + (progress > 0 ? 1 : 0);
  const activeStarsMax = Math.min(CONSTELLATION.length, activeStarsCount);

  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-grotesk transition-colors duration-500 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ backgroundColor: bg, color: text }}
    >
      <style>{`
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
        @keyframes nsFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .ns-fade-in { animation: nsFadeIn 0.7s ease-out both; }
        .ns-fade-in-delay { animation: nsFadeIn 0.7s ease-out 0.15s both; }
        @keyframes celebrateBurst { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:0.8} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      {/* Space Background */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
          {/* Full-screen starfield */}
          <svg width="100%" height="100%" className="absolute inset-0">
            <defs>
              <radialGradient id="starBright">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="50%" stopColor="rgba(200,220,255,0.8)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            {FIELD_STARS.map((s, i) => (
              <circle
                key={`field-${i}`}
                cx={`${s.x}%`}
                cy={`${s.y}%`}
                r={s.r}
                fill={s.bright ? 'url(#starBright)' : '#C8DCF8'}
                opacity={s.bright ? 0.9 : 0.35}
              />
            ))}
          </svg>

          {/* Subtle nebula clouds */}
          <div
            className="absolute rounded-full"
            style={{
              width: '500px',
              height: '300px',
              top: '10%',
              left: '-5%',
              background: 'radial-gradient(ellipse, rgba(60,40,120,0.06) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              width: '400px',
              height: '250px',
              bottom: '15%',
              right: '10%',
              background: 'radial-gradient(ellipse, rgba(40,60,120,0.05) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />
        </div>
      )}

      <header className="relative z-[70] px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: border }}>
        <div className="font-mono-num text-sm tracking-widest flex items-center gap-2" style={{ color: text }}>
          REKXARE DAMI
        </div>
        <nav className="hidden md:flex items-center gap-12 text-sm font-medium uppercase tracking-widest">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`}>{t('nav_timer', 'Timer')}</Link>
          <Link href="/schedule" className={`nav-link ${location === '/schedule' ? 'active' : ''}`}>{t('nav_schedule', 'Schedule')}</Link>
          <Link href="/insights" className={`nav-link ${location === '/insights' ? 'active' : ''}`}>{t('nav_insights', 'Insights')}</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm font-mono-num">
          <ProfileDrawer ink={isDark ? '#A8C4E0' : '#1A2744'} inkFaint={isDark ? 'rgba(168,196,224,0.5)' : 'rgba(26,39,68,0.5)'} card={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'} cardBorder={isDark ? 'rgba(168,196,224,0.15)' : 'rgba(26,39,68,0.1)'} btnStyle={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', color: isDark ? '#A8C4E0' : '#1A2744' }} />
          <button onClick={toggleDark} className="opacity-60 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 rounded" aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={cycleLang} className="opacity-60 hover:opacity-100 transition-opacity" aria-label={t('switch_language', 'Switch language')}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pb-28 md:pb-10 py-8">
        {/* Page heading */}
        <div className="flex items-end justify-between mb-8 px-1">
          <div />
          <div className="hidden md:flex items-center gap-2 text-xs font-mono-num tracking-widest uppercase" style={{ color: text, opacity: 0.6 }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? gold : accent, boxShadow: `0 0 8px ${isActive ? gold : accent}` }} />
            <span>{isActive ? t('session_live', 'Session live') : t('ready_to_stargaze', 'Ready to stargaze')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column: Constellations & Mission Duration */}
        <div className="lg:col-span-3 flex flex-col gap-8 ns-fade-in">
          <div className="flex flex-col gap-5 p-5 night-border rounded-sm backdrop-blur-sm" style={{ borderColor: border, backgroundColor: bgDeep }}>
            <h2 className="text-xs font-mono-num uppercase tracking-[0.2em] opacity-50">{t('constellations', 'Constellations')}</h2>
            <div className="flex flex-col gap-2">
              {subjects.map((sub, i) => {
                const isSelected = selectedSubject === sub;
                const subColor = SUBJECT_COLORS[i % SUBJECT_COLORS.length];
                return (
                  <button
                    key={sub}
                    onClick={() => !isActive && setSelectedSubject(sub)}
                    aria-pressed={isSelected}
                    disabled={isActive}
                    className="flex items-center gap-3 px-3 py-2 night-border night-hover transition-all duration-300 font-mono-num text-xs rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: isSelected ? 'rgba(232,197,74,0.08)' : 'transparent',
                      borderColor: isSelected ? gold : border,
                      color: isSelected ? gold : text,
                      opacity: isActive && !isSelected ? 0.35 : 1,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: isSelected ? gold : subColor, boxShadow: isSelected ? `0 0 8px ${gold}` : 'none', transition: 'all 0.3s' }} />
                    <span className="flex-1 truncate">{sub}</span>
                    <span className="text-[10px] tracking-[0.2em] uppercase" style={{ opacity: isSelected ? 0.8 : 0.3 }}>●</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-5 p-5 night-border rounded-sm backdrop-blur-sm" style={{ borderColor: border, backgroundColor: bgDeep }}>
            <h2 className="text-xs font-mono-num uppercase tracking-[0.2em] opacity-50">{t('mission_duration', 'Mission Duration')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((mins) => (
                <button
                  key={mins}
                  onClick={() => !isActive && setSelectedMinutes(mins as number)}
                  disabled={isActive}
                  aria-pressed={selectedMinutes === mins}
                  className="px-3 py-2 text-xs night-border night-hover transition-all font-mono-num rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <div className="lg:col-span-6 flex flex-col items-center justify-center gap-10 ns-fade-in-delay">
          <div className="relative w-[320px] h-[320px] flex items-center justify-center night-border rounded-full bg-black/5 dark:bg-white/5 shadow-2xl" style={{ boxShadow: `0 0 40px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(107,143,212,0.1)'}` }}>
            <svg width="320" height="320" className="absolute inset-0 rounded-full" aria-hidden="true">
              {backgroundStars.map((s, i) => (
                <circle 
                  key={`bg-${i}`} 
                  cx={s.x} cy={s.y} r={s.r} 
                  fill={text} 
                  opacity={0.15 + (Math.sin(i)*0.1)} 
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
              <span className="sr-only" role="status" aria-live="polite">
                {isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}
              </span>
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
              {isActive ? t('pause', 'Pause') : t('begin', 'Begin')}
            </button>
            <button
              onClick={reset}
              className="px-8 py-3 night-border night-hover transition-all opacity-50 hover:opacity-100 text-sm tracking-[0.2em] uppercase rounded-sm"
            >
              {t('reset', 'Reset')}
            </button>
          </div>

          {!isActive && (
            <div>
              <MomentumBanner
                streak={studyData?.streak || 0}
                lastStudyDate={studyData?.last_study_date || null}
                accent={gold}
                accentSoft={isDark ? 'rgba(232,197,74,0.08)' : 'rgba(232,197,74,0.1)'}
                card={bgDeep}
                cardBorder={border}
                ink={text}
                inkSoft={text}
                inkFaint={text}
              />
            </div>
          )}
        </div>

        {/* Right Column: Observation Log + Streak */}
        <div className="lg:col-span-3 flex flex-col gap-8 ns-fade-in">
          <div className="flex flex-col p-5 gap-4 font-mono-num text-xs backdrop-blur-sm night-border rounded-sm" style={{ borderColor: border, backgroundColor: bgDeep }}>
            <h2 className="uppercase tracking-[0.2em] border-b pb-3 mb-1" style={{ borderColor: border, color: accent }}>{t('observation_log', 'Observation Log')}</h2>
            
            <div className="grid grid-cols-2 gap-y-4 items-center">
              <div className="opacity-50">{t('total_orbit', 'Total Orbit').toUpperCase()}</div>
              <div className="text-right text-xl font-semibold">{isLoading ? '-' : formatTime(studyData?.total_seconds || 0)}</div>
              
              <div className="opacity-50">{t('logged', 'Logged').toUpperCase()}</div>
              <div className="text-right text-xl font-semibold">{isLoading ? '-' : studyData?.sessions || 0}</div>
              
              <div className="opacity-50">{t('streak', 'Streak').toUpperCase()}</div>
              <div className="text-right text-xl font-semibold">
                {isLoading ? '-' : (
                  <>
                    {studyData?.streak || 0}
                    <span className="text-xs font-normal opacity-60 ml-1">{t('streak_days', 'days')}</span>
                  </>
                )}
              </div>
              
              <div className="opacity-50">{t('xp_progress', 'XP Progress').toUpperCase()}</div>
              <div className="text-right text-xl font-semibold">{isLoading ? '-' : `${calculateXPProgress(studyData?.xp_points || 0)}%`}</div>
            </div>
          </div>

          <GoalCard
            radius={4}
            colors={{
              card: bgDeep,
              cardBorder: border,
              ink: text,
              inkSoft: text,
              inkFaint: text,
              accent: gold,
            }}
          />

          <div className="p-5 backdrop-blur-sm night-border rounded-sm" style={{ backgroundColor: bgDeep, borderColor: border }}>
            <StreakCalendar streak={studyData?.streak || 0} lastStudyDate={studyData?.last_study_date || null} accent={accent} accentSoft={starBlueStrong} inkFaint={isDark ? 'rgba(216,228,240,0.40)' : 'rgba(6,9,26,0.40)'} card={bgDeep} />
          </div>
        </div>
        </div>

        {/* Bottom band: Session history + Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <SessionHistoryCard
            radius={4}
            colors={{
              card: bgDeep,
              cardBorder: border,
              ink: text,
              inkSoft: text,
              inkFaint: text,
              accent: gold,
            }}
          />
          <ShareCard
            studyData={studyData}
            radius={4}
            colors={{
              card: bgDeep,
              cardBorder: border,
              ink: text,
              inkSoft: text,
              inkFaint: text,
              accent,
            }}
          />
        </div>
      </main>
      <MobileBottomNav accent={accent} card={bgDeep} cardBorder={border} inkFaint={isDark ? 'rgba(216,228,240,0.40)' : 'rgba(6,9,26,0.40)'} bg={bg} />
      <CelebrationOverlay isDone={isDone} colorA={accent} colorB={gold} minutes={selectedMinutes} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}