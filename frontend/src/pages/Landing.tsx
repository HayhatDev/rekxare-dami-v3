import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { ArrowRight, Brain, CalendarDays, Flame, LineChart, Palette, Timer, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCycleLang } from '../hooks/useCycleLang';
import { useLangStore } from '../stores/useLangStore';
import { useThemeStore } from '../stores/useThemeStore';
import { THEMES } from '../themes/config';
import { brandGradient, getThemeColors, getThemeFont, mixBlack, withAlpha } from '../themes/palette';
import { analytics } from '../services/analytics';

const RTL_LANGS = ['ar', 'badini', 'sorani'];

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function Landing() {
  const { t } = useTranslation();
  const { signInAsGuest } = useAuth();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();
  const { cycleLang } = useCycleLang();
  const [, setLocation] = useLocation();

  const c = getThemeColors(themeId, isDark);
  const font = getThemeFont(themeId);
  const isRTL = RTL_LANGS.includes(lang);

  const goSignup = () => {
    analytics.event('landing_signup_cta');
    setLocation('/signup');
  };
  const goSignin = () => {
    analytics.event('landing_signin_cta');
    setLocation('/signin');
  };
  const goGuest = () => {
    analytics.event('landing_guest_cta');
    signInAsGuest();
  };

  const features = useMemo(
    () => [
      { icon: Timer, title: t('study_timer'), desc: t('landing_feature_timer_desc', 'Timed focus sessions, subject colors and a daily goal you can actually hit.') },
      { icon: CalendarDays, title: t('schedule_title'), desc: t('landing_feature_schedule_desc', 'Plan the week once, then follow it — with AI help when the plan slips.') },
      { icon: Brain, title: t('quiz_title'), desc: t('landing_feature_quiz_desc', 'Turn what you studied into a quiz in seconds, and review what you miss.') },
      { icon: LineChart, title: t('ai_insights'), desc: t('landing_feature_insights_desc', 'See your streak, focus time and weak spots without a spreadsheet.') },
      { icon: Flame, title: t('streak'), desc: t('landing_feature_streak_desc', 'Streaks, XP and daily quests keep the habit alive on the hard days.') },
      { icon: Palette, title: t('choose_theme'), desc: t('landing_feature_themes_desc', 'Six visual themes and four languages — switch any time, it remembers.') },
    ],
    [t]
  );

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] relative overflow-x-hidden"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily: font }}
    >
      {/* Ambient tones — the same quiet glow the sign-in screen uses */}
      <div
        aria-hidden="true"
        className="absolute -top-44 -right-44 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.accent}10 0%, transparent 70%)` }}
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-44 -left-44 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${c.pink}10 0%, transparent 70%)` }}
      />

      <div className="relative mx-auto max-w-6xl px-5">
        {/* ── Header ── */}
        <header className="flex items-center justify-between py-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-sm"
              style={{ background: brandGradient(c.accent), boxShadow: `0 10px 22px -10px ${withAlpha(c.accent, 0.65)}` }}
            >
              R
            </div>
            <span className="font-extrabold tracking-tight text-[15px]">Rekxare Dami</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cycleLang}
              aria-label={t('change_language', 'Change language')}
              className="px-3 py-1.5 rounded-full text-[12px] font-bold transition-all hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: c.card, color: c.inkFaint, border: `1px solid ${c.cardBorder}` }}
            >
              {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
            </button>
            <button
              onClick={goSignin}
              className="px-4 py-1.5 rounded-full text-[12px] font-bold transition-all hover:scale-[1.04] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{ backgroundColor: c.card, color: c.ink, border: `1px solid ${c.cardBorder}` }}
            >
              {t('auth_sign_in', 'Sign in')}
            </button>
          </div>
        </header>

        {/* ── Hero ── */}
        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center py-12 sm:py-16">
          <div>
            <span
              className="inline-block text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full"
              style={{ backgroundColor: withAlpha(c.accent, 0.12), color: c.accent }}
            >
              {t('landing_badge', 'Free · No ads · Works offline')}
            </span>

            <h1 className="mt-5 text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
              {t('landing_title', 'Study with a calmer kind of focus.')}
            </h1>

            <p className="mt-4 text-[15px] sm:text-base leading-relaxed max-w-xl" style={{ color: c.inkSoft }}>
              {t('landing_subtitle', 'A quiet timer, a weekly plan, AI quizzes and honest insights — everything one study session needs, in four languages.')}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={goSignup}
                className="group px-6 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 inline-flex items-center gap-2"
                style={{ background: brandGradient(c.accent), boxShadow: `0 16px 34px -16px ${withAlpha(c.accent, 0.7)}` }}
              >
                {t('landing_cta_start', 'Start for free')}
                <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
              </button>

              <button
                onClick={goGuest}
                className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: c.card, color: c.ink, border: `1px solid ${c.cardBorder}` }}
              >
                {t('continue_as_guest', 'Continue as Guest')}
              </button>
            </div>

            <p className="mt-4 text-xs leading-relaxed" style={{ color: c.inkFaint }}>
              {t('guest_note', 'Data saved locally only. Sign in to sync across devices.')}
            </p>
          </div>

          {/* Decorative timer preview */}
          <div aria-hidden="true" className="relative hidden sm:block">
            <div
              className="rounded-3xl p-6 sm:p-7"
              style={{
                backgroundColor: c.card,
                border: `1px solid ${c.cardBorder}`,
                boxShadow: `0 28px 70px -32px ${withAlpha(c.ink, 0.32)}`,
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <span
                  className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: withAlpha(c.accent, 0.12), color: c.accent }}
                >
                  {t('focus', 'Focus')}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: c.inkFaint }}>
                  <Flame size={14} style={{ color: c.pink }} />
                  {t('streak', 'Streak')} · 7
                </span>
              </div>

              <div className="relative mx-auto w-[168px] h-[168px]">
                <svg width="168" height="168" viewBox="0 0 120 120" className="w-full h-full">
                  <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke={withAlpha(c.ink, 0.1)} strokeWidth="9" />
                  <circle
                    cx="60"
                    cy="60"
                    r={RING_RADIUS}
                    fill="none"
                    stroke={c.accent}
                    strokeWidth="9"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_CIRCUMFERENCE * 0.32}
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold tabular-nums">25:00</span>
                  <span className="text-[11px] font-semibold mt-1" style={{ color: c.inkFaint }}>
                    {t('session_live', 'In progress')}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between text-[11px] font-bold mb-2" style={{ color: c.inkFaint }}>
                  <span>{t('daily_goal', 'Daily Goal')}</span>
                  <span>42 / 60 min</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: withAlpha(c.ink, 0.1) }}>
                  <div className="h-full rounded-full" style={{ width: '70%', background: brandGradient(c.accent) }} />
                </div>
              </div>
            </div>

            <div
              className="absolute -bottom-5 -left-5 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-xs font-bold"
              style={{
                backgroundColor: c.card,
                border: `1px solid ${c.cardBorder}`,
                boxShadow: `0 18px 40px -20px ${withAlpha(c.ink, 0.4)}`,
              }}
            >
              <Sparkles size={14} style={{ color: c.pink }} />
              {t('quiz_upload_intro', 'Turn what you studied into a quick quiz!')}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="py-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
            {t('landing_features_title', 'Everything a study session needs')}
          </h2>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl p-5 transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3"
                  style={{ background: brandGradient(c.accent), boxShadow: `0 10px 22px -10px ${withAlpha(c.accent, 0.6)}` }}
                >
                  <Icon size={18} />
                </div>
                <h3 className="font-extrabold text-[15px]">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: c.inkSoft }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Themes ── */}
        <section className="py-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center">
            {t('landing_themes_title', 'Six moods, one workspace')}
          </h2>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {THEMES.map((theme) => (
              <div
                key={theme.id}
                className="rounded-3xl p-5"
                style={{
                  backgroundColor: c.card,
                  border: `1px solid ${theme.id === themeId ? c.accent : c.cardBorder}`,
                }}
              >
                <div className="flex gap-1.5 mb-3">
                  {theme.swatches.map((swatch) => (
                    <span key={swatch} className="w-4 h-4 rounded-full" style={{ backgroundColor: swatch }} />
                  ))}
                </div>
                <p className="font-extrabold text-sm">{theme.name}</p>
                <p className="mt-1 text-[13px] leading-relaxed" style={{ color: c.inkSoft }}>
                  {t(theme.descriptionKey, theme.description)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-10">
          <div
            className="rounded-3xl px-6 sm:px-10 py-10 text-center"
            style={{ background: brandGradient(c.accent), color: '#fff' }}
          >
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('landing_cta_title', 'Your next session is one tap away.')}
            </h2>
            <p className="mt-2 text-sm opacity-85">
              {t('landing_cta_sub', 'Try it as a guest — no account needed.')}
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                onClick={goSignup}
                className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: '#ffffff', color: mixBlack(c.accent, 0.55) }}
              >
                {t('landing_cta_start', 'Start for free')}
              </button>
              <button
                onClick={goGuest}
                className="px-6 py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:scale-[1.02] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.45)' }}
              >
                {t('continue_as_guest', 'Continue as Guest')}
              </button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer
          className="mt-4 py-7 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs border-t"
          style={{ color: c.inkFaint, borderColor: c.cardBorder }}
        >
          <div className="flex items-center gap-2 font-bold" style={{ color: c.inkSoft }}>
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold"
              style={{ background: brandGradient(c.accent) }}
            >
              R
            </div>
            © {new Date().getFullYear()} Rekxare Dami
          </div>

          <nav className="flex items-center gap-5">
            <button onClick={() => setLocation('/privacy')} className="hover:underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded">
              {t('nav_privacy', 'Privacy')}
            </button>
            <button onClick={() => setLocation('/terms')} className="hover:underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded">
              {t('nav_terms', 'Terms')}
            </button>
            <button onClick={goSignin} className="hover:underline underline-offset-4 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded">
              {t('auth_sign_in', 'Sign in')}
            </button>
          </nav>
        </footer>
      </div>
    </div>
  );
}
