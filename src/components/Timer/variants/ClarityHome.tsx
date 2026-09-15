import { useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimerSession } from '../../../hooks/useTimerSession';
import { CelebrationOverlay } from '../../CelebrationOverlay';
import { formatTime } from '../../../utils/helpers';
import { SUBJECT_COLORS } from '../../../utils/constants';
import ProfileDrawer from '../../Auth/ProfileDrawer';
import StreakCalendar from '../../StreakCalendar';
import MobileBottomNav from '../../MobileBottomNav';
import { getClarityTokens } from '../../../lib/clarityTokens';
import MomentumBanner from '../MomentumBanner';
import ShareCard from '../ShareCard';
import GoalCard from '../GoalCard';
import SessionHistoryCard from '../SessionHistoryCard';
import { sessionLogStats } from '../../../utils/sessionLog';

// The i18n strings ship with decorative emoji prefixes; the Clarity theme is
// strictly typographic, so we strip any leading pictographs for a clean look.
const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function ClarityHome() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const {
    selectedSubject, setSelectedSubject,
    selectedMinutes, setSelectedMinutes,
    subjects: rawSubjects, presets,
    secondsLeft, isActive, isDone, progress,
    toggle, reset, studyData, isLoading,
    isDark, toggleDark, lang, isRTL, cycleLang, location,
  } = useTimerSession({ stripEmojis: true, presetIndex: 2 });

  const subjects = useMemo(() => rawSubjects.map(clean), [rawSubjects.join('|')]);

  // --- Palette -------------------------------------------------------------
  const c = useMemo(() => {
    const tok = getClarityTokens(isDark);
    return {
      bg: tok.surface.bg,
      panel: tok.surface.panel,
      card: tok.surface.panel,
      ink: tok.text.ink,
      inkSoft: tok.text.inkSoft,
      inkFaint: tok.text.inkFaint,
      line: tok.line.hairline,
      lineStrong: tok.line.strong,
      track: tok.line.track,
      accent: tok.accent.amber,
      accentSoft: tok.accent.amberSoft,
      pink: tok.accent.pink,
      accentInk: tok.accent.accentInk,
    };
  }, [isDark]);

  const getSubjectColor = (idx: number) => SUBJECT_COLORS[idx % SUBJECT_COLORS.length] || c.accent;

  // --- Progress ring -------------------------------------------------------
  const size = 460;
  const stroke = 1.5;
  const radius = size / 2 - 30;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - ((progress || 0) / 100) * circumference;
  const pct = Math.round(progress || 0);

  const logStats = useMemo(() => sessionLogStats(studyData?.session_log), [studyData?.session_log]);

  const ledger = [
    { label: clean(t('total_time', 'Total Focus')), value: formatTime(studyData?.total_seconds || 0) },
    { label: clean(t('sessions', 'Sessions')), value: String(studyData?.sessions ?? 0).padStart(2, '0') },
    { label: t('streak', 'Streak'), value: `${studyData?.streak ?? 0} ${t('streak_days', 'days')}` },
    { label: t('completion_rate', 'Completion'), value: logStats.total > 0 ? `${logStats.completionRate}%` : '0%' },
  ];

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer'), n: '01' },
    { href: '/schedule', label: t('nav_schedule', 'Schedule'), n: '02' },
    { href: '/insights', label: t('nav_insights', 'Insights'), n: '03' },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        .cl-mono { font-family: 'DM Mono', ui-monospace, monospace; }
        .cl-serif { font-family: 'Fraunces', Georgia, serif; }
        .cl-clock { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
        @keyframes clFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .cl-fade-in { animation: clFadeIn 0.6s ease-out both; }
        .cl-fade-in-delay { animation: clFadeIn 0.6s ease-out 0.15s both; }
        @keyframes celebrateBurst { 0%{transform:scale(0);opacity:1} 50%{transform:scale(1.3);opacity:0.8} 100%{transform:scale(1.6);opacity:0} }
      `}</style>

      {/* ---- Masthead ---- */}
      <header
        className="relative z-[70] flex items-center justify-between px-6 md:px-10 lg:px-14 h-[68px] shrink-0 border-b"
        style={{ borderColor: c.line }}
      >
        <div className="flex items-baseline gap-3">
          <span className="cl-mono text-[13px] tracking-[0.28em] uppercase font-medium">Rekxare Dami</span>
          <span className="cl-mono text-[11px] tracking-[0.2em] uppercase hidden sm:inline" style={{ color: c.inkFaint }}>
            / {t('focus_studio', 'Focus Studio')}
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-baseline gap-1.5 px-2.5 sm:px-3 py-2 text-[13px] transition-opacity"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                <span className="cl-mono text-[11px]" style={{ color: c.accent }}>{item.n}</span>
                <span className={active ? 'font-semibold' : 'font-normal group-hover:opacity-100'}>{item.label}</span>
              </Link>
            );
          })}
          </div>
          <span className="w-px h-4 mx-1.5 sm:mx-3" style={{ backgroundColor: c.lineStrong }} />
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.panel} cardBorder={c.lineStrong} />
          <button
            onClick={toggleDark}
            className="relative z-[100] cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100"
            style={{ opacity: 0.7 }}
          >
            {isDark ? t('light', 'Light') : t('dark', 'Dark')}
          </button>
          <button
            onClick={cycleLang}
            aria-label={t('change_language', 'Change language')}
            className="cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100"
            style={{ opacity: 0.7 }}
          >
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </nav>
      </header>

      {/* ---- Body ---- */}
      <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[1280px] mx-auto w-full">
        {/* Left rail */}
        <aside
          className="cl-fade-in w-full lg:w-[360px] shrink-0 flex flex-col justify-between px-6 md:px-10 lg:px-8 py-8 lg:py-10 border-b lg:border-b-0 lg:border-e"
          style={{ borderColor: c.line }}
        >
          {/* Focus areas */}
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="cl-mono text-[11px] tracking-[0.28em] uppercase" style={{ color: c.inkFaint }}>
                {t('focus_areas', 'Focus Areas')}
              </h2>
              <span className="cl-mono text-[11px]" style={{ color: c.inkFaint }}>
                {String(subjects.length).padStart(2, '0')}
              </span>
            </div>

            <ul>
              {subjects.map((sub, idx) => {
                const active = selectedSubject === sub;
                return (
                  <li key={`${sub}-${idx}`}>
                    <button
                      onClick={() => setSelectedSubject(sub)}
                      aria-pressed={active}
                      className="group w-full flex items-center gap-3.5 py-2.5 text-start transition-all focus-visible:outline focus-visible:outline-1"
                      style={{ borderBottom: `1px solid ${c.line}`, outlineColor: c.accent }}
                    >
                      <span
                        className="shrink-0 rounded-full transition-transform duration-300"
                        style={{
                          width: 8,
                          height: 8,
                          backgroundColor: getSubjectColor(idx),
                          transform: active ? 'scale(1.35)' : 'scale(1)',
                          boxShadow: active ? `0 0 0 4px ${getSubjectColor(idx)}22` : 'none',
                        }}
                      />
                      <span
                        className="flex-1 text-[15px] transition-all"
                        style={{
                          fontWeight: active ? 600 : 400,
                          color: active ? c.ink : c.inkSoft,
                          letterSpacing: active ? '0' : '0.005em',
                        }}
                      >
                        {sub}
                      </span>
                      <span
                        className="cl-mono text-[11px] transition-opacity"
                        style={{ color: c.accent, opacity: active ? 1 : 0 }}
                      >
                        ●
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Activity ledger */}
          <section className="mt-10">
            <h2 className="cl-mono text-[11px] tracking-[0.28em] uppercase mb-4" style={{ color: c.inkFaint }}>
              {t('activity_ledger', 'Activity Ledger')}
            </h2>
            <div className="border" style={{ borderColor: c.line, backgroundColor: c.panel }}>
              {isLoading ? (
                <div className="cl-mono text-[11px] px-4 py-5" style={{ color: c.inkFaint }}>
                  {t('loading_ledger', 'Loading ledger...')}
                </div>
              ) : (
                ledger.map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${c.line}` }}
                  >
                    <span className="text-[13px]" style={{ color: c.inkSoft }}>{row.label}</span>
                    <span className="cl-mono text-[16px] font-medium" style={{ letterSpacing: '-0.02em' }}>{row.value}</span>
                  </div>
                ))
              )}
            </div>
            <p className="cl-mono text-[11px] tracking-[0.2em] uppercase mt-3" style={{ color: c.inkFaint }}>
              {t('clarity_last')} · {studyData?.last_subject ? studyData.last_subject : t('no_session', 'No session yet')}
            </p>
          </section>

          {/* Daily goal */}
          <section className="mt-8">
            <GoalCard
              radius={0}
              colors={{
                card: c.panel,
                cardBorder: c.line,
                ink: c.ink,
                inkSoft: c.inkSoft,
                inkFaint: c.inkFaint,
                accent: c.accent,
              }}
            />
          </section>

          {/* Streak Calendar */}
          <section className="mt-8 border p-6" style={{ borderColor: c.line, backgroundColor: c.panel }}>
            <StreakCalendar
              streak={studyData?.streak || 0}
              lastStudyDate={studyData?.last_study_date || null}
              accent={c.accent}
              accentSoft={c.accentSoft}
              inkFaint={c.inkFaint}
              card={c.card}
            />
          </section>

          {/* Share my progress */}
          <section className="mt-4">
            <ShareCard
              studyData={studyData}
              radius={0}
              colors={{
                card: c.panel,
                cardBorder: c.line,
                ink: c.ink,
                inkSoft: c.inkSoft,
                inkFaint: c.inkFaint,
                accent: c.accent,
              }}
            />
          </section>

          {/* Session history */}
          <section className="mt-4">
            <SessionHistoryCard
              radius={0}
              colors={{
                card: c.panel,
                cardBorder: c.line,
                ink: c.ink,
                inkSoft: c.inkSoft,
                inkFaint: c.inkFaint,
                accent: c.accent,
              }}
            />
          </section>

        </aside>

        {/* Timer stage */}
        <section className="cl-fade-in-delay flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-10 relative">
          {/* Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 lg:mb-14">
            {(presets.length ? presets : [15, 25, 50, 90]).map((mins) => {
              const active = selectedMinutes === mins;
              return (
                <button
                  key={mins}
                  onClick={() => !isActive && setSelectedMinutes(mins)}
                  disabled={isActive}
                  aria-pressed={active}
                  className="cl-mono text-[11px] tracking-[0.1em] px-4 py-2 border transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-1"
                  style={{
                    backgroundColor: active ? c.accent : 'transparent',
                    color: active ? c.accentInk : c.inkSoft,
                    borderColor: active ? c.accent : c.line,
                    outlineColor: c.accent,
                  }}
                >
                  {mins}<span style={{ opacity: 0.6 }}>M</span>
                </button>
              );
            })}
          </div>

          {/* Clock + ring */}
          <div className="relative flex items-center justify-center" style={{ width: size, maxWidth: '86vw' }}>
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-auto -rotate-90"
              aria-hidden="true"
            >
              <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={c.track} strokeWidth={stroke} />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={c.accent}
                strokeWidth={stroke * 2}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
<span
                  className="cl-mono text-[11px] tracking-[0.34em] uppercase mb-3 flex items-center gap-2"
                  style={{ color: c.inkFaint }}
                  aria-live="polite"
                  aria-atomic="true"
                >
                <span
                  className="inline-block rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: isActive ? c.accent : c.inkFaint,
                    animation: isActive ? 'clPulse 1.6s ease-in-out infinite' : 'none',
                  }}
                />
                {isActive ? t('focusing', 'Focusing') : t('ready', 'Ready')}
              </span>

              <div className="cl-serif cl-clock font-light" style={{ fontSize: 'clamp(4.5rem, 13vw, 8.5rem)', lineHeight: 0.9 }}>
                {formatTime(secondsLeft)}
              </div>

              <div className="mt-4 flex items-center gap-2 cl-mono text-[11px] tracking-[0.12em] uppercase" style={{ color: c.inkSoft }}>
                <span>{selectedSubject}</span>
                <span style={{ color: c.line }}>·</span>
                <span style={{ color: c.accent }}>{pct}%</span>
              </div>
            </div>

            <style>{`@keyframes clPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.35;transform:scale(.8)} }`}</style>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 mt-12 lg:mt-16">
            <button
              onClick={toggle}
              className="cl-mono text-[12px] tracking-[0.18em] uppercase px-12 py-4 transition-all duration-200 hover:brightness-95 hover:scale-[1.03]"
              style={{ backgroundColor: c.accent, color: c.accentInk }}
            >
              {isActive ? t('pause', 'Pause') : t('start', 'Start')}
            </button>
            <button
              onClick={reset}
              className="cl-mono text-[12px] tracking-[0.18em] uppercase px-10 py-4 border transition-colors duration-200 hover:opacity-80"
              style={{ borderColor: c.lineStrong, color: c.inkSoft }}
            >
              {t('reset', 'Reset')}
            </button>
          </div>

          {!isActive && (
            <div className="mt-10">
              <MomentumBanner
                streak={studyData?.streak || 0}
                lastStudyDate={studyData?.last_study_date || null}
                accent={c.accent}
                accentSoft={c.accentSoft}
                card={c.card}
                cardBorder={c.line}
                ink={c.ink}
                inkSoft={c.inkSoft}
                inkFaint={c.inkFaint}
              />
            </div>
          )}
        </section>
      </main>
      <MobileBottomNav accent={c.accent} card={c.panel} cardBorder={c.line} inkFaint={c.inkFaint} bg={c.bg} />
      <CelebrationOverlay isDone={isDone} colorA={c.accent} colorB={c.pink} minutes={selectedMinutes} onQuiz={() => navigate('/quiz')} />
    </div>
  );
}
