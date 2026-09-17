import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { formatTime } from '../../../utils/helpers';
import { SUBJECT_COLORS } from '../../../utils/constants';
import { getClayTokens } from '../../../lib/clayTokens';
import { brandGradient } from '../../../themes/palette';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import { CelebrationOverlay, isStreakMilestone } from '../../CelebrationOverlay';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { Timer, CheckCircle2, Flame, Target, Moon, Sun } from 'lucide-react';

export default function ClayHome() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const {
    selectedSubject, setSelectedSubject,
    selectedMinutes, setSelectedMinutes,
    subjects, presets, secondsLeft, isActive, isDone, progress,
    toggle, reset, studyData: data, isLoading,
    isDark, toggleDark, lang, isRTL, cycleLang, location,
  } = useTimerSession({ stripEmojis: true, presetIndex: 2 });

  const tok = useMemo(() => getClayTokens(isDark), [isDark]);
  const c = tok.palette;

  const getSubjectColor = (idx: number) => SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || c.accent;

  const size = 340;
  const stroke = 10;
  const radius = size / 2 - stroke;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - ((progress || 0) / 100) * circumference;
  const pct = Math.round(progress || 0);
  const goalPct = Math.round(((data?.daily_seconds || 0) / Math.max(data?.daily_goal_seconds || 3600, 1)) * 100);

  const stats = [
    { label: t('focus', 'Focus'), value: formatTime(data?.total_seconds || 0), icon: Timer },
    { label: t('sessions', 'Sessions'), value: String(data?.sessions ?? 0).padStart(2, '0'), icon: CheckCircle2 },
    { label: t('streak', 'Streak'), value: `${data?.streak ?? 0}d`, icon: Flame },
    { label: t('daily_goal', 'Goal'), value: `${Math.min(goalPct, 999)}%`, icon: Target },
  ];

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer') },
    { href: '/schedule', label: t('nav_schedule', 'Schedule') },
    { href: '/insights', label: t('nav_insights', 'Insights') },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col relative antialiased transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'Nunito', system-ui, sans-serif" }}
    >
      <style>{`
        .clay-card { background: ${c.card}; border-radius: 24px; border: 1px solid ${c.cardBorder}; box-shadow: ${tok.elevation.raised}; }
        .clay-inset { border-radius: 20px; box-shadow: ${tok.elevation.inset}; }
        .clay-btn { border-radius: 16px; box-shadow: ${tok.elevation.raised}; transition: all 0.25s ease; }
        .clay-btn:hover { transform: translateY(-2px) scale(1.02); }
        .clay-btn:active { transform: translateY(1px) scale(0.98); box-shadow: ${tok.elevation.pressed}; }
        @keyframes celebratePulse { 0%,100%{box-shadow:0 0 0 0 ${c.accent}40} 50%{box-shadow:0 0 30px 10px ${c.accent}20} }
        @keyframes timerPop { 0%{opacity:0;transform:scale(0.96) translateY(8px)} 60%{transform:scale(1.01) translateY(0)} 100%{opacity:1;transform:scale(1) translateY(0)} }
        .timer-pop { animation: timerPop 0.5s cubic-bezier(0.34,1.3,0.64,1) both; }
        ${isDone ? '.celebrate-ring { animation: celebratePulse 0.9s ease-in-out 2; }' : ''}
      `}</style>

      {/* Nav */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-extrabold text-sm" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.raised }}>
            R
          </div>
          <span className="font-extrabold text-lg tracking-tight">Rekxare Dami</span>
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href} className="px-4 py-2.5 text-[13px] font-bold clay-btn" style={{ backgroundColor: active ? c.accent : c.card, color: active ? '#fff' : c.inkSoft, boxShadow: active ? tok.elevation.active : tok.elevation.raised }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder} btnStyle={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: tok.elevation.raised }} />
          <button onClick={toggleDark} aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')} className="relative z-[100] w-10 h-10 rounded-[14px] flex items-center justify-center text-sm clay-btn" style={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: tok.elevation.raised }}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={cycleLang} aria-label={t('change_language', 'Change language')} className="px-3 py-2 rounded-[14px] text-[12px] font-bold clay-btn" style={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: tok.elevation.raised }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </nav>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 pb-28 md:pb-10 py-8">
        {/* Page heading */}
        <div className="flex items-end justify-between mb-8 px-1">
          <div />
          <div className="hidden md:flex items-center gap-2 text-xs font-bold" style={{ color: c.inkSoft }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? c.pink : c.accent, boxShadow: `0 0 8px ${isActive ? c.pink : c.accent}` }} />
            <span>{isActive ? t('session_live', 'Session live') : t('ready_to_go', 'Ready to shape')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
          {/* Left Column: Focus areas + stats */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Focus Areas card */}
            <div className="clay-card p-6">
              <h3 className="font-extrabold text-[13px] uppercase tracking-wider mb-4" style={{ color: c.inkFaint }}>{t('focus_areas', 'Focus Areas')}</h3>
              <div className="space-y-1.5">
                {subjects.map((sub, idx) => {
                  const active = selectedSubject === sub;
                  return (
                    <button key={`${sub}-${idx}`} onClick={() => setSelectedSubject(sub)} aria-pressed={active} className="w-full flex items-center gap-3 py-2.5 px-3 rounded-[14px] transition-all duration-250 text-left focus-visible:outline focus-visible:outline-2" style={{ outlineColor: c.accent, backgroundColor: active ? c.pinkSoft : 'transparent', boxShadow: active ? tok.elevation.pressed : 'none' }}>
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getSubjectColor(idx), boxShadow: active ? `0 0 0 3px ${getSubjectColor(idx)}33` : 'none', transform: active ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.25s' }} />
                      <span className="flex-1 text-[14px] font-semibold" style={{ color: active ? c.ink : c.inkSoft }}>{sub}</span>
                      {active && <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.accent }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Focus — the one number this screen is about */}
            <div className="clay-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center text-white" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.raised }}>
                <Timer className="w-5 h-5" strokeWidth={2.25} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: c.inkFaint }}>{t('focus', 'Focus')}</div>
                <div className="font-extrabold leading-tight" style={{ fontSize: tok.type.xl, letterSpacing: '-0.02em' }}>{formatTime(data?.total_seconds || 0)}</div>
              </div>
            </div>

            {/* Supporting stats */}
            <div className="grid grid-cols-3 gap-3">
              {stats.slice(1).map((s) => (
                <div key={s.label} className="clay-card p-3 text-center">
                  <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: c.accent }} strokeWidth={2.25} />
                  <div className="font-extrabold" style={{ fontSize: tok.type.lg, letterSpacing: '-0.02em' }}>{s.value}</div>
                  <div className="text-[11px] font-semibold" style={{ color: c.inkFaint }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Center Column: Timer */}
          <section className="lg:col-span-6 flex flex-col items-center justify-center py-4 relative">
            {/* Ambient glow in dark mode */}
            {isDark && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${c.accent}12 0%, transparent 70%)` }} />
            )}
            {/* Presets */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {(presets.length ? presets : [15, 25, 50, 90]).map((mins: number) => {
                const active = selectedMinutes === mins;
                return (
                  <button key={mins} onClick={() => !isActive && setSelectedMinutes(mins)} disabled={isActive} className="px-5 py-2.5 text-[13px] font-bold clay-btn disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: active ? c.accent : c.card, color: active ? '#fff' : c.inkSoft, boxShadow: active ? tok.elevation.active : tok.elevation.raised }}>
                    {mins}m
                  </button>
                );
              })}
            </div>

            {/* Timer ring */}
            <div className={`relative flex items-center justify-center clay-inset p-6 timer-pop ${isDone ? 'celebrate-ring' : ''}`} style={{ width: size + 40, height: size + 40, maxWidth: '90vw', aspectRatio: '1' }}>
              <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto -rotate-90" role="img" aria-label={`${t('study_timer', 'Study timer')}: ${formatTime(secondsLeft)} ${isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}`}>
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={c.cardBorder} strokeWidth={stroke} />
                <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={`url(#clayGrad)`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22, 1, 0.36, 1)' }} />
                <defs>
                  <linearGradient id="clayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={c.accent} />
                    <stop offset="100%" stopColor={`color-mix(in srgb, ${c.accent} 78%, black 22%)`} />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-2" aria-live="polite" aria-atomic="true">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isActive ? c.pink : c.inkFaint, opacity: isActive ? 0.9 : 0.55 }} />
                  <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: c.inkFaint }}>{isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}</span>
                </div>
                <div className="font-extrabold" style={{ fontSize: 'clamp(3.5rem, 12vw, 6rem)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  {formatTime(secondsLeft)}
                </div>
                <div className="mt-2 flex items-center gap-2 text-[13px] font-bold" style={{ color: c.inkSoft }}>
                  <span>{selectedSubject}</span>
                  <span style={{ color: c.cardBorder }}>·</span>
                  <span style={{ color: c.accent }}>{pct}%</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-10">
              <button onClick={toggle} className="px-10 py-4 text-[14px] font-extrabold text-white clay-btn" style={{ background: brandGradient(c.accent, c.pink), boxShadow: tok.elevation.cta }}>
                {isActive ? t('pause', 'Pause') : t('start', 'Start')}
              </button>
              <button onClick={reset} className="px-8 py-4 text-[14px] font-bold clay-btn" style={{ backgroundColor: c.card, color: c.inkSoft, boxShadow: tok.elevation.raised }}>
                {t('reset', 'Reset')}
              </button>
            </div>

            {!isActive && (
              <div className="mt-8">
                <MomentumBanner
                  streak={data?.streak || 0}
                  lastStudyDate={data?.last_study_date || null}
                  accent={c.accent}
                  accentSoft={c.accentSoft}
                  card={c.card}
                  cardBorder={c.cardBorder}
                  ink={c.ink}
                  inkSoft={c.inkSoft}
                  inkFaint={c.inkFaint}
                />
              </div>
            )}
          </section>

          {/* Right Column: Goal + Streak */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Daily Goal */}
            <GoalCard
              radius={24}
              shadow={tok.elevation.raised}
              colors={{
                card: c.card,
                cardBorder: c.cardBorder,
                ink: c.ink,
                inkSoft: c.inkSoft,
                inkFaint: c.inkFaint,
                accent: c.accent,
              }}
            />

            {/* Streak Calendar */}
            <div className="clay-card p-5">
              <StreakCalendar
                streak={data?.streak || 0}
                lastStudyDate={data?.last_study_date || null}
                accent={c.accent}
                accentSoft={c.accentSoft}
                inkFaint={c.inkFaint}
                card={c.card}
              />
            </div>
          </div>
        </div>

        {/* Bottom band: Session history + Share */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <SessionHistoryCard
            radius={24}
            shadow={tok.elevation.raised}
            colors={{
              card: c.card,
              cardBorder: c.cardBorder,
              ink: c.ink,
              inkSoft: c.inkSoft,
              inkFaint: c.inkFaint,
              accent: c.accent,
            }}
          />
          <ShareCard
            studyData={data}
            radius={24}
            colors={{
              card: c.card,
              cardBorder: c.cardBorder,
              ink: c.ink,
              inkSoft: c.inkSoft,
              inkFaint: c.inkFaint,
              accent: c.accent,
            }}
          />
        </div>
      </main>

      <MobileBottomNav accent={c.accent} card={c.card} cardBorder={c.cardBorder} inkFaint={c.inkFaint} bg={c.bg} />

      <CelebrationOverlay isDone={isDone} colorA={c.accent} colorB={c.pink} minutes={selectedMinutes} celebrate={isStreakMilestone(data?.streak || 0)} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}
