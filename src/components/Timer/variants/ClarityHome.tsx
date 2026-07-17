import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useTimer } from '../../../hooks/useTimer';
import { useStudyData } from '../../../hooks/useStudyData';
import { useThemeStore } from '../../../stores/useThemeStore';
import { useLangStore } from '../../../stores/useLangStore';
import { formatTime } from '../../../utils/helpers';
import { PRESET_MINUTES, SUBJECT_COLORS } from '../../../utils/constants';

// The i18n strings ship with decorative emoji prefixes; the Clarity theme is
// strictly typographic, so we strip any leading pictographs for a clean look.
const clean = (s: string) =>
  s.replace(/^[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\s]+/u, '').trim();

export default function ClarityHome() {
  const { t } = useTranslation();

  const subjectsData = t('subjects', { returnObjects: true });
  const rawSubjects = Array.isArray(subjectsData) && subjectsData.length > 0
    ? (subjectsData as string[])
    : ['Study', 'Reading', 'Coding', 'Writing', 'Math', 'Science', 'History', 'Art', 'Language'];
  const subjects = useMemo(() => rawSubjects.map(clean), [rawSubjects.join('|')]);

  const [selectedMinutes, setSelectedMinutes] = useState(PRESET_MINUTES[2] ?? 25);
  const [subjectName, setSubjectName] = useState(subjects[0]);

  const { secondsLeft, isActive, progress, toggle, reset } = useTimer(selectedMinutes, subjectName);
  const { data, isLoading } = useStudyData();
  const { lang, setLang } = useLangStore();
  const { isDark, toggleDark } = useThemeStore();
  const [location] = useLocation();

  const isRTL = lang === 'ar' || lang === 'badini';

  // Keep selected subject valid if language (and thus subject labels) changes.
  useEffect(() => {
    if (!subjects.includes(subjectName)) setSubjectName(subjects[0]);
  }, [subjects, subjectName]);

  const cycleLang = () => {
    const next: Record<string, string> = { en: 'badini', badini: 'ar', ar: 'en' };
    setLang(next[lang] as any);
  };

  // --- Palette -------------------------------------------------------------
  const c = useMemo(() => {
    if (isDark) {
      return {
        bg: '#161513',
        panel: '#1C1B18',
        ink: '#EDE8DE',
        inkSoft: 'rgba(237, 232, 222, 0.62)',
        inkFaint: 'rgba(237, 232, 222, 0.40)',
        line: 'rgba(237, 232, 222, 0.14)',
        lineStrong: 'rgba(237, 232, 222, 0.24)',
        accent: '#D98A3D',
        accentInk: '#161513',
        track: 'rgba(237, 232, 222, 0.10)',
      };
    }
    return {
      bg: '#F5F0E8',
      panel: '#EFE8DB',
      ink: '#232019',
      inkSoft: 'rgba(35, 32, 25, 0.64)',
      inkFaint: 'rgba(35, 32, 25, 0.42)',
      line: 'rgba(35, 32, 25, 0.14)',
      lineStrong: 'rgba(35, 32, 25, 0.26)',
      accent: '#C0692A',
      accentInk: '#F5F0E8',
      track: 'rgba(35, 32, 25, 0.08)',
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

  const goalPct = Math.round(
    ((data?.daily_seconds || 0) / Math.max(data?.daily_goal_seconds || 3600, 1)) * 100,
  );

  const ledger = [
    { label: clean(t('total_time', 'Total Focus')), value: formatTime(data?.total_seconds || 0) },
    { label: clean(t('sessions', 'Sessions')), value: String(data?.sessions ?? 0).padStart(2, '0') },
    { label: 'Streak', value: `${data?.streak ?? 0} ${(data?.streak ?? 0) === 1 ? 'day' : 'days'}` },
    { label: 'Daily Goal', value: `${Math.min(goalPct, 999)}%` },
  ];

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer'), n: '01' },
    { href: '/schedule', label: t('nav_schedule', 'Schedule'), n: '02' },
    { href: '/about', label: t('nav_about', 'About'), n: '03' },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300&display=swap');
        .cl-mono { font-family: 'DM Mono', ui-monospace, monospace; }
        .cl-serif { font-family: 'Fraunces', Georgia, serif; }
        .cl-clock { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
      `}</style>

      {/* ---- Masthead ---- */}
      <header
        className="flex items-center justify-between px-6 md:px-10 lg:px-14 h-[68px] shrink-0 border-b"
        style={{ borderColor: c.line }}
      >
        <div className="flex items-baseline gap-3">
          <span className="cl-mono text-[13px] tracking-[0.28em] uppercase font-medium">Rekxare Dami</span>
          <span className="cl-mono text-[10px] tracking-[0.2em] uppercase hidden sm:inline" style={{ color: c.inkFaint }}>
            / Focus Studio
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-baseline gap-1.5 px-2.5 sm:px-3 py-2 text-[13px] transition-opacity"
                style={{ opacity: active ? 1 : 0.6 }}
              >
                <span className="cl-mono text-[9px]" style={{ color: c.accent }}>{item.n}</span>
                <span className={active ? 'font-semibold' : 'font-normal group-hover:opacity-100'}>{item.label}</span>
              </Link>
            );
          })}
          <span className="w-px h-4 mx-1.5 sm:mx-3" style={{ backgroundColor: c.lineStrong }} />
          <button
            onClick={toggleDark}
            className="cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100"
            style={{ opacity: 0.7 }}
          >
            {isDark ? 'Light' : 'Dark'}
          </button>
          <button
            onClick={cycleLang}
            className="cl-mono text-[11px] tracking-[0.14em] uppercase px-2.5 py-1.5 transition-opacity hover:opacity-100"
            style={{ opacity: 0.7 }}
          >
            {lang === 'ar' ? 'العربية' : lang === 'badini' ? 'کوردی' : 'EN'}
          </button>
        </nav>
      </header>

      {/* ---- Body ---- */}
      <main className="flex-1 flex flex-col lg:flex-row w-full max-w-[1280px] mx-auto w-full">
        {/* Left rail */}
        <aside
          className="w-full lg:w-[360px] shrink-0 flex flex-col justify-between px-6 md:px-10 lg:px-8 py-8 lg:py-10 border-b lg:border-b-0 lg:border-e"
          style={{ borderColor: c.line }}
        >
          {/* Focus areas */}
          <section>
            <div className="flex items-baseline justify-between mb-6">
              <h2 className="cl-mono text-[10px] tracking-[0.28em] uppercase" style={{ color: c.inkFaint }}>
                {t('focus_areas', 'Focus Areas')}
              </h2>
              <span className="cl-mono text-[10px]" style={{ color: c.inkFaint }}>
                {String(subjects.length).padStart(2, '0')}
              </span>
            </div>

            <ul>
              {subjects.map((sub, idx) => {
                const active = subjectName === sub;
                return (
                  <li key={`${sub}-${idx}`}>
                    <button
                      onClick={() => setSubjectName(sub)}
                      className="group w-full flex items-center gap-3.5 py-2.5 text-start transition-all"
                      style={{ borderBottom: `1px solid ${c.line}` }}
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
                        className="cl-mono text-[10px] transition-opacity"
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
            <h2 className="cl-mono text-[10px] tracking-[0.28em] uppercase mb-4" style={{ color: c.inkFaint }}>
              {t('activity_ledger', 'Activity Ledger')}
            </h2>
            <div className="border" style={{ borderColor: c.line, backgroundColor: c.panel }}>
              {isLoading ? (
                <div className="cl-mono text-[11px] px-4 py-5" style={{ color: c.inkFaint }}>
                  Loading ledger…
                </div>
              ) : (
                ledger.map((row, i) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between px-4 py-3"
                    style={{ borderTop: i === 0 ? 'none' : `1px solid ${c.line}` }}
                  >
                    <span className="text-[13px]" style={{ color: c.inkSoft }}>{row.label}</span>
                    <span className="cl-mono text-[13px] font-medium">{row.value}</span>
                  </div>
                ))
              )}
            </div>
            <p className="cl-mono text-[9px] tracking-[0.2em] uppercase mt-3" style={{ color: c.inkFaint }}>
              Last · {data?.last_subject && data.last_subject !== '—' ? data.last_subject : 'No session yet'}
            </p>
          </section>
        </aside>

        {/* Timer stage */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:py-10 relative">
          {/* Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10 lg:mb-14">
            {(PRESET_MINUTES.length ? PRESET_MINUTES : [15, 25, 50, 90]).map((mins) => {
              const active = selectedMinutes === mins;
              return (
                <button
                  key={mins}
                  onClick={() => setSelectedMinutes(mins)}
                  className="cl-mono text-[11px] tracking-[0.1em] px-4 py-2 border transition-all duration-200"
                  style={{
                    backgroundColor: active ? c.accent : 'transparent',
                    color: active ? c.accentInk : c.inkSoft,
                    borderColor: active ? c.accent : c.line,
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
                className="cl-mono text-[10px] tracking-[0.34em] uppercase mb-3 flex items-center gap-2"
                style={{ color: c.inkFaint }}
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
                <span>{subjectName}</span>
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
              className="cl-mono text-[12px] tracking-[0.18em] uppercase px-12 py-4 transition-all duration-200 hover:brightness-95"
              style={{ backgroundColor: c.accent, color: c.accentInk }}
            >
              {isActive ? t('pause', 'Pause') : t('start', 'Start')}
            </button>
            <button
              onClick={reset}
              className="cl-mono text-[12px] tracking-[0.18em] uppercase px-10 py-4 border transition-colors duration-200"
              style={{ borderColor: c.lineStrong, color: c.inkSoft }}
            >
              {t('reset', 'Reset')}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
