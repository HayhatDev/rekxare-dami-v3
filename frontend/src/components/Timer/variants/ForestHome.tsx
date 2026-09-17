import React, { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { CelebrationOverlay } from '../../CelebrationOverlay';
import { formatTime } from '../../../utils/helpers';
import { getForestTokens } from '../../../lib/forestTokens';
import { Timer, Calendar, BarChart3, Moon, Sun, Globe } from 'lucide-react';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { sessionLogStats } from '../../../utils/sessionLog';

const FOREST_COLORS = ['#2D5A2E','#4A3728','#1A4A4A','#5A3A1E','#3A4A28','#6B4020','#283828','#4A2838','#284A3A'];

function GrowingTree({ progress, isDark }: { progress: number; isDark: boolean }) {
  const p = Math.max(0, Math.min(100, progress)) / 100;

  const trunkH = 50 + p * 110;
  const trunkY = 240 - trunkH;
  const trunkW = 14 + p * 4;

  const branchOp = Math.min(1, Math.max(0, (p - 0.12) / 0.2));
  const leafOp = Math.min(1, Math.max(0, (p - 0.25) / 0.25));
  const flowerOp = Math.min(1, Math.max(0, (p - 0.85) / 0.15));

  const sky1 = isDark ? '#0A1A08' : '#B8D8B0';
  const sky2 = isDark ? '#0E240C' : '#D4E8D0';
  const groundDark = isDark ? '#0C160B' : '#8BAA80';
  const groundLight = isDark ? '#152214' : '#A8C4A0';
  const trunkFill = isDark ? '#5A3520' : '#4A3018';
  const trunkDark = isDark ? '#3E2515' : '#352010';
  const branchFill = isDark ? '#4A3018' : '#3E2515';
  const leafA = isDark ? '#3A7A38' : '#2D5A2E';
  const leafB = isDark ? '#5A9A58' : '#4A8B48';
  const leafC = isDark ? '#7ABB78' : '#6BAB68';
  const grassColor = isDark ? '#2A5A28' : '#5A8A50';
  const rootFill = isDark ? 'rgba(90,53,32,0.45)' : 'rgba(74,48,24,0.35)';
  const flowerPink = isDark ? '#E8A0C0' : '#D07090';
  const flowerYellow = isDark ? '#F5D899' : '#E5C889';

  const cx = 160;

  return (
    <svg width="320" height="290" viewBox="0 0 320 290" className="drop-shadow-md">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky1} />
          <stop offset="100%" stopColor={sky2} />
        </linearGradient>
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={trunkDark} />
          <stop offset="40%" stopColor={trunkFill} />
          <stop offset="100%" stopColor={trunkDark} />
        </linearGradient>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
          <feBlend in="SourceGraphic" in2="gray" mode="multiply" />
        </filter>
        <clipPath id="trunkClip">
          <rect x={cx - trunkW / 2 - 2} y={trunkY - 5} width={trunkW + 4} height={trunkH + 10} />
        </clipPath>
      </defs>

      {/* Sky background */}
      <rect x="0" y="0" width="320" height="290" rx="20" fill="url(#sky)" />

      {/* Distant hills */}
      <ellipse cx="80" cy="248" rx="120" ry="30" fill={isDark ? 'rgba(42,90,40,0.25)' : 'rgba(90,138,80,0.2)'} />
      <ellipse cx="240" cy="252" rx="100" ry="25" fill={isDark ? 'rgba(42,90,40,0.2)' : 'rgba(90,138,80,0.15)'} />

      {/* Ground */}
      <rect x="0" y="240" width="320" height="50" rx="0" fill={groundDark} />
      <rect x="0" y="240" width="320" height="8" fill={groundLight} opacity="0.3" />

      {/* Grass blades at base */}
      <g opacity={0.7} stroke={grassColor} strokeWidth="1.5" fill="none" strokeLinecap="round">
        {[120,130,138,145,152,158,164,170,178,185,192,200].map((x, i) => (
          <path key={i} d={`M${x},240 Q${x + (i % 2 === 0 ? -3 : 3)},${234 - (i % 3)} ${x + (i % 2 === 0 ? -1 : 1)},${228 - (i % 4)}`} />
        ))}
      </g>

      {/* Roots */}
      <g opacity={0.55} stroke={rootFill} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <path d={`M${cx},238 Q${cx - 20},254 ${cx - 42},260`} />
        <path d={`M${cx},238 Q${cx - 14},258 ${cx - 28},268`} />
        <path d={`M${cx},238 Q${cx + 18},256 ${cx + 40},262`} />
        <path d={`M${cx},238 Q${cx + 12},260 ${cx + 25},270`} />
        <path d={`M${cx},238 Q${cx - 4},258 ${cx - 8},272`} />
      </g>

      {/* Trunk — organic shape with bark */}
      <path
        d={`M${cx - trunkW / 2},${240} 
            L${cx - trunkW / 2 + 1},${trunkY + 8} 
            Q${cx - trunkW / 2 - 1},${trunkY + 2} ${cx - 2},${trunkY} 
            L${cx + 2},${trunkY} 
            Q${cx + trunkW / 2 + 1},${trunkY + 2} ${cx + trunkW / 2 - 1},${trunkY + 8}
            L${cx + trunkW / 2},${240} Z`}
        fill="url(#trunkGrad)"
        style={{ transition: 'all 0.8s ease-out' }}
      />

      {/* Bark texture */}
      <g clipPath="url(#trunkClip)" opacity={0.35}>
        {trunkH > 25 && [0, 1, 2, 3, 4, 5].map(i => {
          const y = trunkY + 12 + i * (trunkH / 7);
          return (
            <g key={i}>
              <line x1={cx - trunkW / 2 + 2} y1={y} x2={cx - trunkW / 2 + 5} y2={y + 6} stroke={isDark ? '#7A5030' : '#5A3A20'} strokeWidth="0.8" />
              <line x1={cx + 1} y1={y + 3} x2={cx + trunkW / 2 - 3} y2={y + 8} stroke={isDark ? '#7A5030' : '#5A3A20'} strokeWidth="0.8" />
              <circle cx={cx - 3 + (i % 3) * 3} cy={y + 2} r="0.7" fill={isDark ? '#7A5030' : '#5A3A20'} />
            </g>
          );
        })}
      </g>

      {/* Branches */}
      <g opacity={branchOp} stroke={branchFill} strokeWidth="2.5" fill="none" strokeLinecap="round" style={{ transition: 'opacity 0.6s ease-out' }}>
        <path d={`M${cx - 3},${trunkY + 18} Q${cx - 28},${trunkY + 8} ${cx - 42},${trunkY + 2}`} />
        <path d={`M${cx - 3},${trunkY + 42} Q${cx - 35},${trunkY + 32} ${cx - 50},${trunkY + 26}`} />
        {p > 0.35 && <path d={`M${cx - 3},${trunkY + 65} Q${cx - 22},${trunkY + 55} ${cx - 38},${trunkY + 48}`} />}
        <path d={`M${cx + 3},${trunkY + 14} Q${cx + 28},${trunkY + 4} ${cx + 44},${trunkY - 2}`} />
        <path d={`M${cx + 3},${trunkY + 38} Q${cx + 32},${trunkY + 28} ${cx + 52},${trunkY + 22}`} />
        {p > 0.35 && <path d={`M${cx + 3},${trunkY + 60} Q${cx + 20},${trunkY + 50} ${cx + 36},${trunkY + 42}`} />}
      </g>

      {/* Leaf clusters — rounded organic shapes */}
      <g opacity={leafOp} style={{ transition: 'opacity 0.8s ease-out' }}>
        {/* Main canopy top */}
        <ellipse cx={cx} cy={trunkY - 8} rx={22 + p * 18} ry={16 + p * 12} fill={leafA} />
        <ellipse cx={cx - 12} cy={trunkY + 2} rx={16 + p * 10} ry={13 + p * 8} fill={leafB} opacity="0.8" />
        <ellipse cx={cx + 14} cy={trunkY + 4} rx={15 + p * 9} ry={12 + p * 7} fill={leafA} opacity="0.75" />

        {/* Left cluster */}
        <ellipse cx={cx - 45} cy={trunkY + 6} rx={12 + p * 8} ry={10 + p * 6} fill={leafC} opacity="0.55" />
        <ellipse cx={cx - 52} cy={trunkY + 28} rx={10 + p * 6} ry={9 + p * 5} fill={leafB} opacity="0.45" />

        {/* Right cluster */}
        <ellipse cx={cx + 46} cy={trunkY + 2} rx={12 + p * 8} ry={10 + p * 6} fill={leafB} opacity="0.55" />
        <ellipse cx={cx + 50} cy={trunkY + 24} rx={10 + p * 6} ry={9 + p * 5} fill={leafC} opacity="0.45" />

        {/* Depth layers */}
        {p > 0.45 && (
          <>
            <ellipse cx={cx - 8} cy={trunkY - 3} rx={9} ry={7} fill={leafC} opacity="0.35" />
            <ellipse cx={cx + 10} cy={trunkY - 1} rx={8} ry={6} fill={leafA} opacity="0.3" />
          </>
        )}
        {p > 0.65 && (
          <>
            <ellipse cx={cx - 30} cy={trunkY + 14} rx={7} ry={5} fill={leafC} opacity="0.3" />
            <ellipse cx={cx + 32} cy={trunkY + 12} rx={7} ry={5} fill={leafA} opacity="0.3" />
          </>
        )}
      </g>

      {/* Individual leaf shapes scattered on branches */}
      <g opacity={leafOp * 0.6} style={{ transition: 'opacity 0.8s ease-out' }}>
        {[[-38, 6], [-48, 28], [40, 2], [50, 24], [0, -14], [-14, -2], [16, 0]].map(([dx, dy], i) => (
          <ellipse
            key={i}
            cx={cx + dx}
            cy={trunkY + dy}
            rx={3 + (i % 2)}
            ry={2}
            fill={i % 2 === 0 ? leafC : leafB}
            transform={`rotate(${dx * 0.8}, ${cx + dx}, ${trunkY + dy})`}
          />
        ))}
      </g>

      {/* Flower at 100% */}
      <g opacity={flowerOp} style={{ transition: 'opacity 0.5s ease-out' }}>
        {[0, 72, 144, 216, 288].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const px = cx + Math.cos(rad) * 5;
          const py = trunkY - 20 + Math.sin(rad) * 5;
          return <circle key={i} cx={px} cy={py} r="3" fill={flowerPink} opacity="0.8" />;
        })}
        <circle cx={cx} cy={trunkY - 20} r="2.5" fill={flowerYellow} />
      </g>
    </svg>
  );
}

export default function ForestHome() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const {
    selectedSubject, setSelectedSubject,
    selectedMinutes, setSelectedMinutes,
    subjects, presets,
    secondsLeft, isActive, isDone, progress,
    toggle, reset, studyData, isLoading,
    isDark, toggleDark, lang, isRTL, cycleLang, location,
  } = useTimerSession({ presetIndex: 0 });

  const tok = useMemo(() => getForestTokens(isDark), [isDark]);
  const bgColor = tok.accent.bgDeep;
  const textColor = tok.text.ink;
  const leafGreen = tok.accent.leafGreen;
  const barkBrown = tok.accent.bark;
  const logStats = useMemo(() => sessionLogStats(studyData?.session_log), [studyData?.session_log]);

  return (
    <div 
      className="min-h-[100dvh] flex flex-col relative overflow-hidden transition-colors duration-700"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      <style>{`
        .forest-serif { font-family: 'Lora', serif; }
        
        .leaf-shape {
          border-radius: 50% 10% 50% 10%;
        }

        @keyframes foFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .fo-fade-in { animation: foFadeIn 0.7s ease-out both; }
        .fo-fade-in-delay { animation: foFadeIn 0.7s ease-out 0.15s both; }
        @keyframes celebrateBurst { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:0.8} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      {/* SVG Background Blobs (static — dead-band: no infinite sway) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.04]">
        <svg viewBox="0 0 1000 1000" className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] fill-current" style={{ color: tok.accent.leafGreen }}>
          <path d="M410.5,690.5C310.2,740.3,212.8,797,110,750C7.2,703,-90.4,552.2,-99,446.5C-107.6,340.8,-27.2,280.2,60.5,214.5C148.2,148.8,243.2,78,350.5,75C457.8,72,577.2,136.8,638.5,232.5C699.8,328.2,703,454.8,653.5,548.5C604,642.2,510.8,640.7,410.5,690.5Z" />
        </svg>
        <svg viewBox="0 0 1000 1000" className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] fill-current" style={{ color: tok.accent.bark }}>
          <path d="M720,290.5C810.3,374.8,924.8,443.2,950,540.5C975.2,637.8,911.2,764,818,836.5C724.8,909,602.4,927.8,495,920.5C387.6,913.2,295.2,879.8,206.5,807.5C117.8,735.2,32.8,624,43,514.5C53.2,405,158.4,297.2,253.5,218.5C348.6,139.8,433.6,90,528,88.5C622.4,87,720,290.5,720,290.5Z" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col h-full min-h-[100dvh]">
        
        {/* Nav */}
        <header className="relative z-[70] px-8 py-5 flex justify-between items-center border-b border-current border-opacity-10 backdrop-blur-sm">
          <div className="forest-serif text-xl font-semibold tracking-wide flex items-center gap-2">
            <Globe className="w-5 h-5 opacity-70" />
            Rekxare Dami
          </div>
          <nav className="flex items-center text-sm font-medium">
            <div className="hidden md:flex items-center">
            <Link href="/" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/' ? 'opacity-100' : 'opacity-60'}`}>
              <Timer className="w-4 h-4" /> {t('nav_timer', 'Timer')}
            </Link>
            <div className="w-px h-4 bg-current opacity-20"></div>
            <Link href="/schedule" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/schedule' ? 'opacity-100' : 'opacity-60'}`}>
              <Calendar className="w-4 h-4" /> {t('nav_schedule', 'Schedule')}
            </Link>
            <div className="w-px h-4 bg-current opacity-20"></div>
            <Link href="/insights" className={`flex items-center gap-2 px-4 py-2 hover:opacity-70 transition-opacity ${location === '/insights' ? 'opacity-100' : 'opacity-60'}`}>
              <BarChart3 className="w-4 h-4" /> {t('nav_insights', 'Insights')}
            </Link>
            </div>
            
            <div className="w-px h-4 bg-current opacity-20 ml-2 mr-4"></div>
            <div className="flex gap-4 items-center">
              <ProfileDrawer ink={isDark ? '#C5D1BF' : '#2B3428'} inkFaint={isDark ? 'rgba(197,209,191,0.5)' : 'rgba(43,52,40,0.5)'} card={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'} />
              <button onClick={toggleDark} className="relative z-[100] hover:opacity-70 transition-opacity flex items-center justify-center">
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="hover:opacity-70 transition-opacity uppercase text-xs font-bold tracking-wider">
                {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
              </button>
            </div>
          </nav>
        </header>

        {/* Main */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 pb-28 md:pb-10 z-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left rail: stats + streak + insights + share */}
            <aside className="lg:col-span-3 space-y-5">
              {/* Stats */}
              <div className="space-y-4 fo-fade-in">
                {[
                  { label: t('todays_growth', "Today's Growth"), value: formatTime(studyData?.daily_seconds || 0) },
                  { label: t('seeds_planted', 'Seeds Planted'), value: studyData?.sessions || 0 },
                  { label: t('root_depth', 'Root Depth'), value: `${studyData?.streak || 0} ${t('streak_days', 'days')}` },
                  { label: t('completion_rate', 'Completion Rate'), value: isLoading ? '...' : (logStats.total > 0 ? `${logStats.completionRate}%` : '0%') },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="leaf-shape flex flex-col items-center justify-center px-4 py-5 text-center shadow-sm backdrop-blur-sm"
                    style={{ backgroundColor: tok.surface.panel, border: `1px solid ${leafGreen}33` }}
                  >
                    <div className="text-xs uppercase tracking-widest opacity-60 mb-1.5">{stat.label}</div>
                    <div className="forest-serif text-2xl font-semibold">{stat.value}</div>
                  </div>
                ))}
              </div>

              {/* Daily goal */}
              <GoalCard
                radius={0}
                colors={{
                  card: tok.surface.panel,
                  cardBorder: `${leafGreen}33`,
                  ink: textColor,
                  inkSoft: tok.text.inkSoft,
                  inkFaint: tok.text.inkFaint,
                  accent: leafGreen,
                }}
              />

              {/* Streak calendar */}
              <div className="rounded-[32px_8px_32px_8px] p-5 backdrop-blur-sm" style={{ backgroundColor: tok.surface.panel, border: `1px solid ${leafGreen}33` }}>
                <StreakCalendar streak={studyData?.streak || 0} lastStudyDate={studyData?.last_study_date || null} accent={isDark ? '#6BAB68' : '#4A8B48'} accentSoft={isDark ? '#8BCB88' : '#6BAB68'} inkFaint={isDark ? 'rgba(212,232,208,0.40)' : 'rgba(12,22,11,0.40)'} card="transparent" />
              </div>

              {/* Session history */}
              <SessionHistoryCard
                radius={0}
                colors={{
                  card: tok.surface.panel,
                  cardBorder: `${leafGreen}33`,
                  ink: textColor,
                  inkSoft: tok.text.inkSoft,
                  inkFaint: tok.text.inkFaint,
                  accent: leafGreen,
                }}
              />

              {/* Share my progress */}
              <ShareCard
                studyData={studyData}
                radius={0}
                colors={{
                  card: tok.surface.panel,
                  cardBorder: `${leafGreen}33`,
                  ink: textColor,
                  inkSoft: tok.text.inkSoft,
                  inkFaint: tok.text.inkFaint,
                  accent: leafGreen,
                }}
              />
            </aside>

            {/* Center: Growing Tree Timer */}
            <section className="lg:col-span-6 flex flex-col items-center justify-center py-4 fo-fade-in-delay">
              <div aria-hidden="true"><GrowingTree progress={progress} isDark={isDark} /></div>
              <div
                className="forest-serif text-6xl sm:text-7xl font-light tracking-tight mt-4 mb-4"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatTime(secondsLeft)}
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                {isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}
              </span>

              {/* Presets */}
              <div className="flex gap-2.5 mb-8">
                {(presets || [15, 25, 50, 90]).map((mins: number) => (
                  <button
                    key={mins}
                    onClick={() => !isActive && setSelectedMinutes(mins)}
                    disabled={isActive}
                    aria-pressed={selectedMinutes === mins}
                    className={`min-w-[44px] min-h-[32px] text-sm px-3 py-1.5 rounded-[50px] transition-all disabled:opacity-20 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      selectedMinutes === mins ? 'opacity-100 font-medium scale-110' : 'opacity-40 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: selectedMinutes === mins ? leafGreen : 'transparent',
                      color: selectedMinutes === mins ? '#fff' : 'inherit',
                      border: selectedMinutes === mins ? `1px solid ${leafGreen}` : '1px solid transparent',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={toggle}
                  aria-pressed={isActive}
                  className="px-8 py-3.5 rounded-[32px] font-medium tracking-wide transition-all hover:scale-105 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ backgroundColor: leafGreen, color: '#fff' }}
                >
                  {isActive ? t('pause', 'Pause') : t('begin', 'Begin')}
                </button>
                <button
                  onClick={reset}
                  className="px-8 py-3.5 rounded-[32px] font-medium tracking-wide transition-all hover:scale-105 shadow-sm"
                  style={{ backgroundColor: barkBrown, color: '#fff' }}
                >
                  {t('reset', 'Reset')}
                </button>
              </div>

              {!isActive && (
                <div className="mt-6">
                  <MomentumBanner
                    streak={studyData?.streak || 0}
                    lastStudyDate={studyData?.last_study_date || null}
                    accent={leafGreen}
                    accentSoft={isDark ? 'rgba(107,171,104,0.16)' : 'rgba(74,139,72,0.12)'}
                    card={tok.surface.panel}
                    cardBorder={leafGreen + '33'}
                    ink={textColor}
                    inkSoft={tok.text.inkSoft}
                    inkFaint={tok.text.inkFaint}
                  />
                </div>
              )}
            </section>

            {/* Right rail: subject selection */}
            <aside className="lg:col-span-3">
              <div className="rounded-[32px_8px_32px_8px] p-5 backdrop-blur-sm fo-fade-in" style={{ backgroundColor: tok.surface.panel, border: `1px solid ${leafGreen}33` }}>
                <div className="text-xs uppercase tracking-widest opacity-60 mb-4">{t('subjects_title')}</div>
                <div className="flex flex-wrap gap-3 justify-center lg:justify-end lg:flex-col lg:items-end">
                  {subjects.map((sub: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => !isActive && setSelectedSubject(sub)}
                      disabled={isActive}
                      aria-pressed={selectedSubject === sub}
                      className={`px-5 py-2.5 rounded-[50px] transition-all duration-300 text-sm whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                        selectedSubject === sub ? 'opacity-100 shadow-md scale-105 font-medium' : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: selectedSubject === sub ? FOREST_COLORS[idx % FOREST_COLORS.length] : 'transparent',
                        color: selectedSubject === sub ? '#fff' : 'inherit',
                        border: `1px solid ${FOREST_COLORS[idx % FOREST_COLORS.length]}`
                      }}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

          </div>
        </main>
      </div>
      <MobileBottomNav accent={isDark ? '#6BAB68' : '#4A8B48'} card={isDark ? '#152214' : '#FFFFFF'} cardBorder={isDark ? 'rgba(46,107,47,0.18)' : 'rgba(46,107,47,0.12)'} inkFaint={isDark ? 'rgba(212,232,208,0.40)' : 'rgba(12,22,11,0.40)'} bg={isDark ? '#060E05' : '#E4EDE0'} />
      <CelebrationOverlay isDone={isDone} colorA={isDark ? '#6BAB68' : '#4A8B48'} colorB={isDark ? '#A07050' : '#7C5230'} minutes={selectedMinutes} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}
