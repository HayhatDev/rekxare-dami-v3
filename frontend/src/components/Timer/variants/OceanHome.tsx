import React, { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { CelebrationOverlay, isStreakMilestone } from '../../CelebrationOverlay';
import { formatTime, calculateXPProgress } from '../../../utils/helpers';
import { SUBJECT_COLORS } from '../../../utils/constants';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { sessionLogStats } from '../../../utils/sessionLog';
import { getOceanTokens } from '../../../lib/oceanTokens';
import { Moon, Sun } from 'lucide-react';

function TideTimer({ progress, secondsLeft, selectedSubject, isDark }: {
  progress: number;
  secondsLeft: number;
  selectedSubject: string;
  isDark: boolean;
}) {
  const p = Math.max(0, Math.min(100, progress)) / 100;

  // The tide line is the whole signal of the scene: it is driven purely by
  // progress and eases smoothly. Everything else is static, so the moment
  // reads as calm and purposeful instead of busy.
  const waterY = 280 - p * 240;
  const skyH = waterY;

  // The scene always renders in the deep-ocean palette (dark sky + water) so the
  // timer readout stays white-on-dark and never disappears against a light page.
  const skyTop = '#020810';
  const skyBot = '#0A1E38';
  const waterDeep = '#041828';
  const waterMid = '#082840';
  const waterLight = '#104060';
  const sandColor = '#3A3020';
  const sandDark = '#2A2218';
  const seaweedColor = '#2A6830';
  const sunColor = isDark ? '#E8C54A' : '#F2D37A';

  const rise = { transition: 'transform 0.8s ease-out' } as const;

  return (
    <svg width="100%" height="100%" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="ocSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skyTop} />
          <stop offset="100%" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id="ocWater" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={waterLight} />
          <stop offset="50%" stopColor={waterMid} />
          <stop offset="100%" stopColor={waterDeep} />
        </linearGradient>
        <clipPath id="ocClip">
          <rect width="320" height="320" rx="24" />
        </clipPath>
      </defs>

      <g clipPath="url(#ocClip)">
        {/* Sky */}
        <rect x="0" y="0" width="320" height="320" fill="url(#ocSky)" />

        {/* Sun / moon — static, dims as the sea covers the horizon */}
        {skyH > 40 && (
          <g opacity={Math.min(1, skyH / 60)}>
            <circle cx="250" cy={Math.min(skyH - 20, 50)} r="18" fill={sunColor} />
            <circle cx="250" cy={Math.min(skyH - 20, 50)} r="30" fill={sunColor} opacity="0.25" />
          </g>
        )}

        {/* Beach — a quiet band that stays just above the waterline */}
        <g style={{ transform: `translateY(${waterY - 28}px)`, ...rise }}>
          <path d="M-4,12 Q40,5 80,12 T160,12 T240,12 T324,12 L324,324 L-4,324 Z" fill={sandColor} />
        </g>
        <g style={{ transform: `translateY(${waterY - 20}px)`, ...rise, opacity: 0.5 }}>
          <path d="M-4,12 Q40,5 80,12 T160,12 T240,12 T324,12 L324,324 L-4,324 Z" fill={sandDark} />
        </g>

        {/* Seaweed — anchored to the floor, visible only at low tide */}
        <g opacity="0.5">
          {[40, 80, 200, 260].map((x, i) => (
            <path
              key={`sw-${i}`}
              d={`M${x},320 Q${x + 4},${292 - i * 5} ${x - 3},${270 - i * 8} Q${x + 5},${258 - i * 8} ${x + 2},${250 - i * 8}`}
              stroke={seaweedColor}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </g>

        {/* Water — rises and falls with progress */}
        <g style={{ transform: `translateY(${waterY - 10}px)`, ...rise }}>
          <path d="M-4,10 Q40,4 80,10 T160,10 T240,10 T324,10 L324,324 L-4,324 Z" fill="url(#ocWater)" />
          <path d="M-4,10 Q40,4 80,10 T160,10 T240,10 T324,10" fill="none" stroke={isDark ? 'rgba(220,240,255,0.22)' : 'rgba(255,255,255,0.45)'} strokeWidth="2" />
        </g>

        {/* Timer text — floats on the waterline */}
        <g>
          <text
            x="160"
            y={Math.max(45, waterY - 12)}
            textAnchor="middle"
            fill={isDark ? '#C8E4F5' : '#fff'}
            fontSize="42"
            fontWeight="300"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            style={{ transition: 'y 0.8s ease-out' }}
          >
            {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
          </text>
          <text
            x="160"
            y={Math.max(62, waterY + 6)}
            textAnchor="middle"
            fill={isDark ? 'rgba(200,228,245,0.6)' : 'rgba(255,255,255,0.7)'}
            fontSize="10"
            fontWeight="600"
            letterSpacing="0.15em"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            style={{ transition: 'y 0.8s ease-out' }}
          >
            {selectedSubject.toUpperCase()}
          </text>
        </g>
      </g>
    </svg>
  );
}

export default function OceanHome() {
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
  
  const tok = useMemo(() => getOceanTokens(isDark), [isDark]);
  const bg = tok.palette.bg;
  const text = tok.text.ink;
  const panelBg = tok.surface.panel;
  const wellBg = tok.surface.well;
  const border = isDark ? 'rgba(0,200,184,0.3)' : 'rgba(0,200,184,0.2)';
  const teal = tok.accent.teal;

  const logStats = useMemo(() => sessionLogStats(studyData?.session_log), [studyData?.session_log]);

  const formatStatValue = (id: string) => {
    if (isLoading || !studyData) return '-';
    switch(id) {
      case 'depth': return formatTime(studyData.total_seconds || 0);
      case 'dives': return `${studyData.sessions || 0}`;
      case 'streak': return `${studyData.streak || 0} ${t('streak_days', 'days')}`;
      case 'completion': return logStats.total > 0 ? `${logStats.completionRate}%` : '0%';
      default: return '';
    }
  };

  const getStatProgress = (id: string) => {
    if (!studyData) return 0;
    switch(id) {
      case 'depth': return Math.min(100, ((studyData.total_seconds || 0) / 360000) * 100);
      case 'dives': return Math.min(100, ((studyData.sessions || 0) / 100) * 100);
      case 'streak': return Math.min(100, ((studyData.streak || 0) / 30) * 100);
      case 'completion': return logStats.completionRate;
      default: return 0;
    }
  };

  const diveLogs = [
    { id: 'depth', label: t('total_time', 'Total Time') },
    { id: 'dives', label: t('sessions', 'Sessions') },
    { id: 'streak', label: t('streak', 'Streak') },
    { id: 'completion', label: t('completion_short', 'Completion') },
  ];

  return (
    <div 
      className="min-h-[100dvh] flex flex-col font-jakarta transition-colors duration-500 overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ backgroundColor: bg, color: text }}
    >
      <style>{`
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .nav-link { position: relative; color: inherit; opacity: 0.7; transition: opacity 0.2s; }
        .nav-link:hover, .nav-link.active { opacity: 1; }
        .nav-link.active::after { content: ''; position: absolute; bottom: -24px; left: 0; right: 0; height: 2px; background: ${teal}; }
        @keyframes ocFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        .oc-fade-in { animation: ocFadeIn 0.7s ease-out both; }
        .oc-fade-in-delay { animation: ocFadeIn 0.7s ease-out 0.15s both; }
      `}</style>

      {/* Ambient depth glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] rounded-full blur-[120px]" style={{ backgroundColor: isDark ? 'rgba(0,200,184,0.05)' : 'rgba(20,120,168,0.09)' }} />
        <div className="absolute bottom-[-20%] -right-32 w-[34rem] h-[34rem] rounded-full blur-[140px]" style={{ backgroundColor: isDark ? 'rgba(26,144,200,0.06)' : 'rgba(0,180,168,0.07)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[22rem] h-[22rem] rounded-full blur-[100px]" style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)' }} />
      </div>

      <header className="relative z-[70] px-6 py-5 flex items-center justify-between border-b" style={{ borderColor: border }}>
        <div className="font-semibold tracking-wider flex items-center gap-3">
          <div className="w-5 h-5 rounded-full" style={{ background: `linear-gradient(150deg, ${tok.accent.deepblue}, color-mix(in srgb, ${tok.accent.deepblue} 78%, black 22%))` }}></div>
          REKXARE DAMI
        </div>
        <nav className="hidden md:flex items-center gap-10 text-sm font-medium">
          <Link href="/" className={`nav-link ${location === '/' ? 'active' : ''}`}>{t('nav_timer', 'Timer')}</Link>
          <Link href="/schedule" className={`nav-link ${location === '/schedule' ? 'active' : ''}`}>{t('nav_schedule', 'Schedule')}</Link>
          <Link href="/insights" className={`nav-link ${location === '/insights' ? 'active' : ''}`}>{t('nav_insights', 'Insights')}</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm font-medium">
          <ProfileDrawer ink={isDark ? '#B0D4E8' : '#1A3A5C'} inkFaint={isDark ? 'rgba(176,212,232,0.5)' : 'rgba(26,58,92,0.5)'} card={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)'} cardBorder={isDark ? 'rgba(176,212,232,0.15)' : 'rgba(26,58,92,0.1)'} btnStyle={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)', color: isDark ? '#B0D4E8' : '#1A3A5C' }} />
          <button
            onClick={toggleDark}
            aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')}
            className="opacity-70 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 rounded"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={cycleLang} className="opacity-70 hover:opacity-100 transition-opacity focus-visible:outline focus-visible:outline-2 rounded" aria-label={t('switch_language', 'Switch language')}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pb-28 md:pb-10 py-8">
        <div className="flex items-end justify-between mb-8 px-1">
          <div />
          <div className="hidden md:flex items-center gap-2 text-xs font-medium" style={{ color: isDark ? 'rgba(200,228,245,0.6)' : 'rgba(26,90,130,0.65)' }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: teal, boxShadow: `0 0 8px ${teal}` }} />
            <span>{isActive ? t('session_live', 'Session live') : t('ready_to_dive', 'Ready to focus')}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
          {/* Left Column: Subjects & Stats */}
          <div className="lg:col-span-3 flex flex-col gap-8 oc-fade-in">
            <section className="rounded-[24px] p-6 backdrop-blur-sm oc-fade-in" style={{ backgroundColor: panelBg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isDark ? '#60B8E0' : '#1478A8' }} />
                <h2 className="text-xs uppercase tracking-widest opacity-60">{t('deep_dive_subjects', 'Subjects')}</h2>
              </div>
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
                      className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-sm font-medium transition-all duration-200 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{
                        backgroundColor: isSelected ? `${subColor}26` : 'transparent',
                        border: `1px solid ${isSelected ? `${subColor}99` : 'transparent'}`,
                        color: text,
                        opacity: isActive && !isSelected ? 0.4 : 1,
                      }}
                    >
                      <span
                        className="shrink-0 w-2.5 h-2.5 rounded-full transition-transform"
                        style={{ backgroundColor: subColor, transform: isSelected ? 'scale(1.3)' : 'scale(1)' }}
                      />
                      <span className="truncate">{sub}</span>
                      {isSelected && (
                        <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider" style={{ color: subColor }}>
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[24px] p-6 backdrop-blur-sm" style={{ backgroundColor: panelBg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tok.accent.teal }} />
                <h2 className="text-xs uppercase tracking-widest opacity-60">{t('dive_logs', 'Stats')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {diveLogs.map(({ id, label }) => (
                  <div key={id} className="rounded-[16px] p-4" style={{ backgroundColor: wellBg, border: `1px solid ${border}` }}>
                    <span className="block text-[11px] uppercase tracking-wider opacity-50 mb-1.5">{label}</span>
                    <span className="block text-lg font-semibold leading-tight">{formatStatValue(id)}</span>
                    <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,200,184,0.15)' }}>
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${getStatProgress(id)}%`, backgroundColor: teal }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Center Column: Tide Timer */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center gap-7 py-2 oc-fade-in-delay">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
              <span style={{ color: isDark ? 'rgba(200,228,245,0.55)' : 'rgba(26,90,130,0.78)' }}>{t('tide_level', 'Tide Level')}</span>
              <span className="font-bold" style={{ color: teal }}>{Math.round(progress)}%</span>
              <span className="text-[11px] tracking-wider" style={{ color: isDark ? 'rgba(200,228,245,0.35)' : 'rgba(26,90,130,0.85)' }}>
                {isActive ? `${selectedMinutes} ${t('minutes', 'mins')}` : t('calm_waters', 'Ready')}
              </span>
            </div>

            <div
              className="relative p-[6px] rounded-[28px] transition-all duration-700"
              style={{
                background: `conic-gradient(${teal} ${progress}%, ${isDark ? 'rgba(200,228,245,0.1)' : 'rgba(20,120,168,0.14)'} 0%)`,
              }}
            >
              <div className="relative w-[320px] h-[320px] rounded-[22px] overflow-hidden"
                aria-hidden="true"
                style={{ boxShadow: `0 16px 56px ${isDark ? 'rgba(0,20,40,0.6)' : 'rgba(20,120,168,0.22)'}` }}
              >
                <TideTimer
                  progress={progress}
                  secondsLeft={secondsLeft}
                  selectedSubject={selectedSubject}
                  isDark={isDark}
                />
              </div>
            </div>
            <div className="sr-only" role="status" aria-live="polite">
              {isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggle}
                aria-pressed={isActive}
                className="px-9 py-3.5 rounded-full text-sm font-semibold tracking-wider transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  backgroundColor: isActive ? 'transparent' : tok.accent.deepblue,
                  color: isActive ? text : '#fff',
                  border: isActive ? `1px solid ${border}` : '1px solid transparent',
                  boxShadow: isActive ? 'none' : `0 6px 20px ${isDark ? 'rgba(26,144,200,0.3)' : 'rgba(20,120,168,0.25)'}`,
                }}
              >
                {isActive ? t('pause', 'Pause').toUpperCase() : t('start', 'Start').toUpperCase()}
              </button>
              <button
                onClick={reset}
                className="px-7 py-3.5 rounded-full text-sm font-semibold tracking-wider transition-opacity opacity-50 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ border: `1px solid ${border}` }}
              >
                {t('reset', 'Reset').toUpperCase()}
              </button>
            </div>

            {!isActive && (
              <div>
                <MomentumBanner
                  streak={studyData?.streak || 0}
                  lastStudyDate={studyData?.last_study_date || null}
                  accent={teal}
                  accentSoft={isDark ? 'rgba(0,200,184,0.14)' : 'rgba(0,180,168,0.1)'}
                  card={panelBg}
                  cardBorder={border}
                  ink={text}
                  inkSoft={tok.text.inkMuted}
                  inkFaint={tok.text.inkFaint}
                />
              </div>
            )}
          </div>

          {/* Right Column: Presets + Streak */}
          <div className="lg:col-span-3 flex flex-col gap-8 oc-fade-in">
            <section className="rounded-[24px] p-6 backdrop-blur-sm" style={{ backgroundColor: panelBg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tok.accent.deepblue }} />
                <h2 className="text-xs uppercase tracking-widest opacity-60">{t('plan_dive', 'Presets')}</h2>
              </div>
              <div className="flex flex-col gap-2">
                {presets.map((mins) => (
                  <button
                    key={mins}
                    onClick={() => !isActive && setSelectedMinutes(mins as number)}
                    disabled={isActive}
                    aria-pressed={selectedMinutes === mins}
                    className="flex items-center justify-between px-4 py-3 rounded-[14px] text-sm font-semibold transition-all duration-200 hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      backgroundColor: selectedMinutes === mins ? teal : 'transparent',
                      color: selectedMinutes === mins ? '#fff' : text,
                      border: `1px solid ${selectedMinutes === mins ? teal : border}`,
                      opacity: isActive && selectedMinutes !== mins ? 0.3 : 1,
                      transform: selectedMinutes === mins ? 'scale(1.03)' : 'scale(1)',
                    }}
                  >
                    <span>{mins}</span>
                    <span className="text-[11px] font-normal opacity-70">{t('minutes', 'Minutes')}</span>
                  </button>
                ))}
              </div>
            </section>

            <GoalCard
              radius={24}
              colors={{
                card: panelBg,
                cardBorder: border,
                ink: text,
                inkSoft: tok.text.inkMuted,
                inkFaint: tok.text.inkFaint,
                accent: teal,
              }}
            />

            <section className="rounded-[24px] p-5 backdrop-blur-sm" style={{ backgroundColor: panelBg, border: `1px solid ${border}` }}>
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isDark ? '#3898C8' : '#1478A8' }} />
                <h2 className="text-xs uppercase tracking-widest opacity-60">{t('dive_streak', 'Streak')}</h2>
              </div>
              <StreakCalendar streak={studyData?.streak || 0} lastStudyDate={studyData?.last_study_date || null} accent={isDark ? '#3898C8' : '#1478A8'} accentSoft={isDark ? '#60B8E0' : '#3898C8'} inkFaint={isDark ? 'rgba(204,228,245,0.40)' : 'rgba(6,16,30,0.40)'} card="transparent" />
            </section>
          </div>
        </div>

        {/* Bottom band: Session history + Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <SessionHistoryCard
            radius={24}
            colors={{
              card: panelBg,
              cardBorder: border,
              ink: text,
              inkSoft: tok.text.inkMuted,
              inkFaint: tok.text.inkFaint,
              accent: teal,
            }}
          />
          <ShareCard
            studyData={studyData}
            radius={24}
            colors={{
              card: panelBg,
              cardBorder: border,
              ink: text,
              inkSoft: tok.text.inkMuted,
              inkFaint: tok.text.inkFaint,
              accent: teal,
            }}
          />
        </div>
      </main>
      <MobileBottomNav accent={isDark ? '#3898C8' : '#1478A8'} card={isDark ? '#0E1E30' : '#FFFFFF'} cardBorder={isDark ? 'rgba(20,120,168,0.18)' : 'rgba(20,120,168,0.12)'} inkFaint={isDark ? 'rgba(204,228,245,0.40)' : 'rgba(6,16,30,0.40)'} bg={isDark ? '#030A14' : '#EBF4FB'} />
      <CelebrationOverlay isDone={isDone} colorA={isDark ? '#3898C8' : '#1478A8'} colorB={isDark ? '#20D0C0' : '#00B4A8'} minutes={selectedMinutes} celebrate={isStreakMilestone(studyData?.streak || 0)} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}