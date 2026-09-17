import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { CelebrationOverlay } from '../../CelebrationOverlay';
import { formatTime } from '../../../utils/helpers';
import { SUBJECT_COLORS } from '../../../utils/constants';
import { getMountainTokens } from '../../../lib/mountainTokens';
import { Mountain, Footprints, Map, BarChart3, Sun, Moon, Globe } from 'lucide-react';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { useMemo } from 'react';

export default function MountainHome() {
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

  const tok = useMemo(() => getMountainTokens(isDark), [isDark]);
  const txt = tok.text;

  const todayTimeFormatted = studyData ? formatTime(studyData.daily_seconds) : "00:00";
  const sessionsToday = studyData?.sessions || 0;
  const currentStreak = studyData?.streak || 0;

  const getSubjectColor = (idx: number) => {
    return SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || tok.terrain.trail;
  };

  const currentColor = getSubjectColor(subjects.indexOf(selectedSubject) >= 0 ? subjects.indexOf(selectedSubject) : 0);
  const shortLangLabel = lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN';
  const untouched = secondsLeft >= selectedMinutes * 60;

  // Flag marker follows the actual mountain silhouette instead of a straight line
  const TERRAIN: Array<[number, number]> = [[20, 220], [80, 120], [140, 180], [200, 80], [260, 220]];
  const terrainY = (p: number) => {
    const x = 20 + 240 * p;
    for (let i = 1; i < TERRAIN.length; i++) {
      const [x0, y0] = TERRAIN[i - 1];
      const [x1, y1] = TERRAIN[i];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return 220;
  };
  const flagX = 20 + (progress / 100) * 240;
  const flagY = terrainY(progress / 100);

  const lbl = (label: string) => ({ color: txt.label });

  return (
    <div className={`min-h-[100dvh] transition-colors duration-500 ${isDark ? '' : ''}`} style={{ backgroundColor: tok.palette.bg }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes mtFadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .mt-fade-in { animation: mtFadeIn 0.7s ease-out both; }
        .mt-fade-in-delay { animation: mtFadeIn 0.7s ease-out 0.2s both; }
      `}</style>

      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute -top-20 -right-20 w-96 h-96 opacity-[0.07]" viewBox="0 0 200 200">
          <path d="M40,100 Q60,40 100,50 T160,100 Q140,160 100,150 T40,100 Z" fill={isDark ? tok.terrain.path : tok.terrain.trail} />
        </svg>
        <svg className="absolute bottom-10 -left-10 w-64 h-64 opacity-[0.05]" viewBox="0 0 200 200">
          <path d="M50,120 Q80,60 120,70 T170,130 Q150,180 110,170 T50,120 Z" fill={isDark ? tok.terrain.trail : tok.terrain.path} />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-32" style={{ fontFamily: '"DM Sans", sans-serif' }}>
        {/* Top bar with nav and controls */}
        <div className="relative z-[70] flex flex-wrap items-center justify-between gap-4 mb-12">
          {/* Logo/brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[40%] flex items-center justify-center" style={{ backgroundColor: tok.terrain.trail }}>
              <Mountain className="text-[#E8EEE4]" size={20} />
            </div>
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: txt.ink, fontFamily: 'Fraunces, serif' }}>
              Rekxare Dami
            </h1>
          </div>

          {/* Navigation as map pins */}
          <div className="hidden md:flex items-center gap-2">
            {[{ href: '/schedule', icon: Map, label: t('nav_schedule', 'Schedule') }, { href: '/insights', icon: BarChart3, label: t('nav_insights', 'Insights') }].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href} className="px-4 py-2 rounded-[20px] flex items-center gap-2 transition-all hover:scale-[1.03] shadow-sm" style={{ backgroundColor: tok.surface.chip, color: txt.inkSoft }}>
                <Icon size={16} />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <ProfileDrawer ink={txt.ink} inkFaint={isDark ? 'rgba(232,237,224,0.5)' : 'rgba(43,52,40,0.5)'} card="transparent" cardBorder={isDark ? 'rgba(197,209,191,0.15)' : 'rgba(43,52,40,0.1)'} btnStyle={{ backgroundColor: tok.surface.chip, color: tok.terrain.trail }} />
            <button
              onClick={toggleDark}
              aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')}
              className="w-9 h-9 rounded-[35%] flex items-center justify-center transition-all shadow-sm"
              style={{ backgroundColor: tok.surface.chip, color: isDark ? tok.terrain.gold : tok.terrain.path }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={cycleLang}
              aria-label={t('change_language', 'Change language')}
              className="px-3 h-9 rounded-[20px] flex items-center gap-1.5 transition-all shadow-sm"
              style={{ backgroundColor: tok.surface.chip, color: txt.inkSoft }}
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
            <div className="mt-fade-in rounded-[30px] p-6 backdrop-blur-sm shadow-sm" style={{ backgroundColor: tok.surface.panel }}>
              <div className="space-y-5">
                {/* Today's journey */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2" style={lbl('')}>
                    {t('todays_growth', "Today's Growth")}
                  </div>
                  <div className="text-4xl font-bold" style={{ color: txt.ink, fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                    {todayTimeFormatted}
                  </div>
                </div>

                {/* Sessions as stones */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2" style={lbl('')}>
                    {t('stones_placed', 'Stones Placed')}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-[40%] transition-all"
                        style={{ backgroundColor: i < sessionsToday ? tok.terrain.trail : tok.surface.well }}
                      />
                    ))}
                  </div>
                  <div className="text-xs mt-1" style={lbl('')}>
                    {t('sessions_of_today', { count: sessionsToday })}
                  </div>
                </div>

                {/* Streak as footprints */}
                <div>
                  <div className="text-xs uppercase tracking-wider mb-2" style={lbl('')}>
                    {t('trail_length', 'Trail Length')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints style={{ color: tok.terrain.path }} size={20} />
                    <div className="text-3xl font-bold" style={{ color: txt.ink, fontFamily: 'Fraunces, serif', letterSpacing: '-0.02em' }}>
                      {currentStreak} <span className="text-sm font-normal">{t('streak_days', 'days')}</span>
                    </div>
                  </div>
                </div>

                {/* Goal as elevation */}
                <GoalCard
                  radius={20}
                  colors={{
                    card: tok.surface.well,
                    cardBorder: isDark ? 'rgba(107,142,111,0.2)' : 'rgba(74,93,69,0.15)',
                    ink: txt.ink,
                    inkSoft: txt.inkSoft,
                    inkFaint: txt.label,
                    accent: tok.terrain.trail,
                  }}
                />
              </div>
            </div>

            {/* Streak Calendar */}
            <div className="rounded-[30px] p-6 backdrop-blur-sm shadow-sm" style={{ backgroundColor: tok.surface.panel, border: `1px solid ${isDark ? 'rgba(107,142,111,0.2)' : 'rgba(74,93,69,0.15)'}` }}>
              <StreakCalendar
                streak={studyData?.streak || 0}
                lastStudyDate={studyData?.last_study_date || null}
                accent={tok.terrain.trail}
                accentSoft={isDark ? '#8DAF8F' : '#6B8060'}
                inkFaint={isDark ? 'rgba(232,237,224,0.40)' : 'rgba(43,52,40,0.40)'}
                card="transparent"
              />
            </div>

            {/* Share my progress */}
            <ShareCard
              studyData={studyData}
              radius={30}
              colors={{
                card: tok.surface.panel,
                cardBorder: isDark ? 'rgba(107,142,111,0.2)' : 'rgba(74,93,69,0.15)',
                ink: txt.ink,
                inkSoft: txt.inkSoft,
                inkFaint: txt.label,
                accent: tok.terrain.trail,
              }}
            />
          </div>

          {/* Center - Timer as terrain/mountain */}
          <div className="col-span-1 lg:col-span-6 flex flex-col">
            {/* Terrain selector */}
            <div className="mb-6">
              <div className="text-xs uppercase tracking-wider mb-3" style={lbl('')}>
                {t('choose_terrain', 'Choose Your Terrain')}
              </div>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject, idx) => (
                  <button
                    key={subject}
                    onClick={() => !isActive && setSelectedSubject(subject)}
                    disabled={isActive}
                    aria-pressed={selectedSubject === subject}
                    className="px-4 py-2 rounded-[20px] text-sm font-medium transition-all hover:scale-105 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={selectedSubject === subject
                      ? { backgroundColor: getSubjectColor(idx), color: '#fff' }
                      : { backgroundColor: tok.surface.chip, color: txt.inkSoft }}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer visualization as mountain/terrain */}
            <div className="flex-1 mt-fade-in-delay rounded-[40px] p-6 sm:p-10 flex flex-col items-center justify-center backdrop-blur-sm shadow-lg relative overflow-hidden" style={{ backgroundColor: tok.surface.panel }}>
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
                <svg width="280" height="240" viewBox="0 0 280 240" className="drop-shadow-md" aria-hidden="true">
                  {/* Mountain outline */}
                  <path
                    d="M20,220 L80,120 L140,180 L200,80 L260,220 Z"
                    fill="none"
                    stroke={tok.terrain.outline}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {/* Filled portion (progress) */}
                  <path
                    d="M20,220 L80,120 L140,180 L200,80 L260,220 Z"
                    fill={currentColor}
                    opacity="0.7"
                    clipPath="url(#progressClip)"
                  />
                  <defs>
                    <clipPath id="progressClip">
                      <rect
                        x="0"
                        width="280"
                        y={220 - (progress / 100) * 140}
                        height={(progress / 100) * 140}
                        style={{ transition: 'y 0.9s ease-out, height 0.9s ease-out' }}
                      />
                    </clipPath>
                  </defs>

                  {/* Marker/flag at current position */}
                  <g transform={`translate(${flagX}, ${flagY})`} style={{ transition: 'transform 0.9s ease-out' }}>
                    <circle cx="0" cy="0" r="6" fill={txt.ink} />
                    <circle cx="0" cy="0" r="3" fill={currentColor} />
                  </g>
                </svg>
              </div>

              {/* Timer display */}
              <div className="text-6xl font-bold tracking-tight mb-2" style={{ color: txt.ink, fontFamily: 'Fraunces, serif' }}>
                {formatTime(secondsLeft)}
              </div>
              <span className="sr-only" role="status" aria-live="polite">
                {isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}
              </span>
              <div className="text-sm mb-8" style={lbl('')}>
                {t('of_total_remaining', { total: formatTime(selectedMinutes * 60) })}
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-6 z-10">
                <button
                  onClick={toggle}
                  className="px-8 py-3 rounded-[25px] font-medium transition-all shadow-md hover:shadow-lg hover:scale-[1.02]"
                  style={{
                    backgroundColor: isActive ? tok.terrain.path : tok.terrain.trail,
                    color: '#fff',
                  }}
                >
                  {isActive ? t('pause_journey', 'Pause Journey') : untouched ? t('start_journey', 'Start Journey') : t('resume_journey', 'Resume Journey')}
                </button>
                <button
                  onClick={reset}
                  className="px-6 py-3 rounded-[25px] font-medium transition-all shadow-sm hover:scale-[1.02]"
                  style={{ backgroundColor: tok.surface.chip, color: txt.inkSoft }}
                >
                  {t('reset', 'Reset')}
                </button>
              </div>

              {!isActive && (
                <div className="mb-6 z-10">
                  <MomentumBanner
                    streak={currentStreak}
                    lastStudyDate={studyData?.last_study_date || null}
                    accent={tok.terrain.trail}
                    accentSoft={isDark ? 'rgba(107,142,111,0.18)' : 'rgba(74,93,69,0.12)'}
                    card={tok.surface.panel}
                    cardBorder={isDark ? 'rgba(107,142,111,0.25)' : 'rgba(74,93,69,0.18)'}
                    ink={txt.ink}
                    inkSoft={txt.inkSoft}
                    inkFaint={txt.label}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right column - Duration selection */}
          <div className="col-span-1 lg:col-span-3 space-y-6">
            <div className="mt-fade-in rounded-[30px] p-6 backdrop-blur-sm shadow-sm" style={{ backgroundColor: tok.surface.panel }}>
              <div className="text-xs uppercase tracking-wider mb-4" style={lbl('')}>
                {t('journey_length', 'Journey Length')}
              </div>
              <div className="space-y-2.5">
                {presets.map((duration) => (
                  <button
                    key={duration}
                    onClick={() => !isActive && setSelectedMinutes(duration)}
                    disabled={isActive}
                    aria-pressed={selectedMinutes === duration}
                    className="w-full px-4 py-3 rounded-[20px] text-left font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 shadow-sm"
                    style={selectedMinutes === duration
                      ? { backgroundColor: tok.terrain.trail, color: isDark ? '#E8EEE4' : '#fff' }
                      : { backgroundColor: tok.surface.chip, color: txt.inkSoft }}
                  >
                    {duration} {t('minutes', 'minutes')}
                  </button>
                ))}
              </div>
            </div>

            {/* Session history */}
            <SessionHistoryCard
              radius={30}
              shadow="0 1px 2px 0 rgba(0,0,0,0.05)"
              colors={{
                card: tok.surface.panel,
                cardBorder: isDark ? 'rgba(107,142,111,0.2)' : 'rgba(74,93,69,0.15)',
                ink: txt.ink,
                inkSoft: txt.inkSoft,
                inkFaint: txt.label,
                accent: tok.terrain.trail,
              }}
            />

          </div>
        </div>
      </div>

      <MobileBottomNav
        accent={tok.terrain.trail}
        card="transparent"
        cardBorder={isDark ? 'rgba(107,142,111,0.2)' : 'rgba(74,93,69,0.15)'}
        inkFaint={isDark ? 'rgba(232,237,224,0.40)' : 'rgba(43,52,40,0.40)'}
        bg={tok.palette.bg}
      />
      <CelebrationOverlay isDone={isDone} colorA={tok.terrain.trail} colorB={isDark ? '#D09060' : '#B8794F'} minutes={selectedMinutes} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}
