import { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../stores/useThemeStore';
import { useCycleLang } from '../hooks/useCycleLang';
import { useLangStore } from '../stores/useLangStore';
import { useDashboardAnalysis } from '../hooks/useDashboardAnalysis';
import { useStudyData } from '../hooks/useStudyData';
import { useSchedule } from '../hooks/useSchedule';
import ProfileDrawer from '../components/Auth/ProfileDrawer';
import MobileBottomNav from '../components/MobileBottomNav';
import LocalInsightsCards from '../components/Insights/LocalInsightsCards';
import { getThemeColors, getThemeFont, brandGradient, brandGradientSoft } from '../themes/palette';
import { STATUS_COLORS } from '../utils/constants';
import { TrendingUp, TrendingDown, Minus, Trophy, Target, Lightbulb, AlertTriangle, RefreshCw, BarChart3, Brain, Sparkles, Sun, Moon } from 'lucide-react';

export default function Insights() {
  const { t } = useTranslation();
  const { themeId, isDark, toggleDark } = useThemeStore();
  const { lang } = useLangStore();
  const [location] = useLocation();
  const isRTL = lang === 'ar' || lang === 'badini' || lang === 'sorani';
  const { data, isLoading, isError, needsAuth, refresh } = useDashboardAnalysis();
  const { data: studyData } = useStudyData();
  const scheduleQuery = useSchedule();

  const c = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);
  const fontFamily = useMemo(() => getThemeFont(themeId), [themeId]);

  const { cycleLang } = useCycleLang();

  const trendIcons = { improving: TrendingUp, stable: Minus, declining: TrendingDown };
  const trendColors = { improving: STATUS_COLORS.success, stable: c.accentSoft, declining: STATUS_COLORS.danger };
  const score = data?.score || 0;
  const scoreColor = score >= 70 ? STATUS_COLORS.success : score >= 40 ? STATUS_COLORS.warning : STATUS_COLORS.danger;
  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (score / 100) * circumference;

  // Entrance choreography state
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Score count-up (ease-out cubic over ~900ms)
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    if (!data) { setDisplayScore(0); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 900;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const navItems = [
    { href: '/', label: t('nav_timer', 'Timer') },
    { href: '/schedule', label: t('nav_schedule', 'Schedule') },
    { href: '/insights', label: t('nav_insights', 'Insights') },
  ];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily }}
    >
      {/* Nav — matches ClayHome structure */}
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white font-extrabold text-sm"
            style={{ background: brandGradient(c.accent, c.pink), boxShadow: c.clayShadow }}>
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight">{t('nav_insights', 'Insights')}</span>
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden md:flex items-center gap-2">
            {navItems.map(item => {
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className="px-4 py-2.5 text-[13px] font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    borderRadius: '16px',
                    backgroundColor: active ? `${c.accent}18` : c.card,
                    color: active ? c.accent : c.inkSoft,
                    border: `1px solid ${active ? `${c.accent}30` : c.cardBorder}`,
                    boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined,
                  }}>
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ProfileDrawer ink={c.ink} inkFaint={c.inkFaint} card={c.card} cardBorder={c.cardBorder}
            btnStyle={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined, border: `1px solid ${c.cardBorder}` }} />
          <button onClick={toggleDark}
            aria-label={isDark ? t('light_mode', 'Light Mode') : t('dark_mode', 'Dark Mode')}
            className="relative z-[100] w-10 h-10 rounded-[14px] flex items-center justify-center text-sm transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined, border: `1px solid ${c.cardBorder}` }}>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={cycleLang}
            aria-label={t('change_language', 'Change language')}
            className="px-3 py-2 rounded-[14px] text-[12px] font-bold transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: c.card, color: c.inkFaint, boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined, border: `1px solid ${c.cardBorder}` }}>
            {lang === 'ar' ? 'AR' : lang === 'sorani' ? 'SO' : lang === 'badini' ? 'BA' : 'EN'}
          </button>
        </nav>
      </header>

      {/* Body */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-6 pb-20 md:pb-10">
        {isLoading ? (
          /* Skeleton loading */
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 h-32 rounded-2xl" style={{ backgroundColor: `${c.accent}10` }} />
              <div className="h-36 rounded-2xl" style={{ backgroundColor: `${c.accent}10` }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-40 rounded-2xl" style={{ backgroundColor: `${c.accent}08` }} />
              <div className="h-40 rounded-2xl" style={{ backgroundColor: `${c.accent}08` }} />
            </div>
            <div className="h-16 rounded-2xl" style={{ backgroundColor: `${c.accent}08` }} />
            <div className="h-48 rounded-2xl" style={{ backgroundColor: `${c.accent}08` }} />
          </div>
        ) : needsAuth ? (
          /* Auth required */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-6"
              style={{ background: brandGradientSoft(c.accent, c.pink), border: `2px dashed ${c.accent}30` }}>
              <Brain className="w-10 h-10" style={{ color: c.accent }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: c.ink }}>{t('sign_in_title', 'Sign in required')}</h2>
            <p className="text-sm max-w-md mb-6 leading-relaxed" style={{ color: c.inkSoft }}>
              {t('sign_in_insights_hint', 'Sign in to unlock AI-powered insights about your study habits and progress.')}
            </p>
          </div>
        ) : isError ? (
          /* API Error */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-6"
              style={{ background: brandGradientSoft(c.accent, c.pink), border: `2px dashed ${c.accent}30` }}>
              <AlertTriangle className="w-10 h-10" style={{ color: STATUS_COLORS.warning }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: c.ink }}>{t('ai_error_title', 'Something went wrong')}</h2>
            <p className="text-sm max-w-md mb-6 leading-relaxed" style={{ color: c.inkSoft }}>
              {t('ai_error_hint', 'Failed to load insights. Please try again.')}
            </p>
            <button onClick={() => refresh()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ backgroundColor: c.accent, color: '#fff', boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined }}>
              <RefreshCw className="w-4 h-4" />
              {t('ai_retry', 'Retry')}
            </button>
          </div>
        ) : !data || (!data.summary && data.strengths.length === 0) ? (
          /* Rich empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-6"
              style={{ background: brandGradientSoft(c.accent, c.pink), border: `2px dashed ${c.accent}30` }}>
              <Brain className="w-10 h-10" style={{ color: c.accent }} />
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: c.ink }}>{t('no_data_title', 'No data yet')}</h2>
            <p className="text-sm max-w-md mb-8 leading-relaxed" style={{ color: c.inkSoft }}>
              {t('no_data_hint', 'Start studying to see your insights here.')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full">
              {[
                { icon: BarChart3, label: t('subject_breakdown', 'Subject Breakdown'), desc: t('no_data_hint', 'Start studying to see your insights here.') },
                { icon: Trophy, label: t('strengths', 'Strengths'), desc: t('no_data_hint', 'Start studying to see your insights here.') },
                { icon: Lightbulb, label: t('recommendations', 'Recommendations'), desc: t('no_data_hint', 'Start studying to see your insights here.') },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02]"
                  style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                  <item.icon className="w-6 h-6 mx-auto mb-2" style={{ color: c.accent }} />
                  <p className="text-xs font-bold mb-1" style={{ color: c.ink }}>{item.label}</p>
                  <p className="text-[11px]" style={{ color: c.inkFaint }}>{t('ai_loading', 'Analyzing your study patterns...')}</p>
                </div>
              ))}
            </div>
            <button onClick={() => refresh()}
              className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ backgroundColor: c.accent, color: '#fff', boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined }}>
              <Sparkles className="w-4 h-4" />
              {t('ai_insights', 'AI Insights')}
            </button>
          </div>
        ) : (
          /* Dashboard content */
          <div className="space-y-6">
            <style>{`
              @keyframes insRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
            {/* Summary + Score */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ opacity: mounted ? 1 : 0, animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) both' }}>
              <div className="lg:col-span-2 rounded-2xl p-6" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium" style={{ color: c.inkFaint }}>{t('summary', 'Summary')}</p>
                  {data.isLocal && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ backgroundColor: `${c.accent}18`, color: c.accent }}>
                      {t('local_insights_badge', 'Local analysis')}
                    </span>
                  )}
                </div>
                <p className="text-base leading-relaxed" style={{ color: c.ink }}>{data.summary}</p>
              </div>
              <div className="rounded-2xl p-6 flex flex-col items-center justify-center relative" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                <svg width="140" height="140" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="54" fill="none" stroke={`${c.accent}20`} strokeWidth="8" />
                  <circle cx="60" cy="60" r="54" fill="none" stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={mounted ? scoreOffset : circumference}
                    transform="rotate(-90 60 60)" style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1) 200ms' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-extrabold" style={{ color: c.ink, fontSize: '3rem', letterSpacing: '-0.03em', lineHeight: 1 }}>{displayScore}</p>
                  <p className="text-xs font-medium" style={{ color: c.inkFaint }}>{t('score', 'Score')}</p>
                  <span className="sr-only" role="status" aria-live="polite">
                    {displayScore === score && score > 0 ? `${score} / 100` : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 90ms both' }}>
              <div className="rounded-2xl p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5" style={{ color: STATUS_COLORS.success }} />
                  <p className="text-sm font-bold" style={{ color: c.ink }}>{t('strengths', 'Strengths')}</p>
                </div>
                <div className="space-y-3">
                  {data.strengths.map((s, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${STATUS_COLORS.success}20`, color: STATUS_COLORS.success }}>{i + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ color: c.inkSoft }}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5" style={{ color: '#F39C12' }} />
                  <p className="text-sm font-bold" style={{ color: c.ink }}>{t('weaknesses', 'Areas to Improve')}</p>
                </div>
                <div className="space-y-3">
                  {data.weaknesses.map((w, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: `${STATUS_COLORS.warning}20`, color: STATUS_COLORS.warning }}>{i + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ color: c.inkSoft }}>{w}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Trend */}
            <div className="rounded-2xl p-5" style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 180ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: c.accent }} />
                  <p className="text-sm font-bold" style={{ color: c.ink }}>{t('weekly_trend', 'Weekly Trend')}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ backgroundColor: `${trendColors[data.weekly_trend]}15` }}>
                  {(() => { const Icon = trendIcons[data.weekly_trend]; return <Icon className="w-4 h-4" style={{ color: trendColors[data.weekly_trend] }} />; })()}
                  <span className="text-sm font-semibold" style={{ color: trendColors[data.weekly_trend] }}>
                    {t(`trend_${data.weekly_trend}`, data.weekly_trend)}
                  </span>
                </div>
              </div>
            </div>

            {/* Subject Breakdown */}
            {data.subject_breakdown.length > 0 && (
              <div className="rounded-2xl p-5" style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 270ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
                <p className="text-sm font-bold mb-4" style={{ color: c.ink }}>{t('subject_breakdown', 'Subject Breakdown')}</p>
                <div className="space-y-3">
                  {data.subject_breakdown.map((s, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium" style={{ color: c.ink }}>{s.subject}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs" style={{ color: c.inkFaint }}>{s.hours}{t('hours_unit')} · {s.percentage}%</span>
                          {s.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.success }} />}
                          {s.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.danger }} />}
                          {s.trend === 'stable' && <Minus className="w-3.5 h-3.5" style={{ color: c.inkFaint }} />}
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${c.accent}15` }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: mounted ? `${s.percentage}%` : '0%',
                            backgroundColor: c.accent,
                            transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1) ${350 + i * 120}ms`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Local, always-current sections: activity, adherence, quiz */}
            <LocalInsightsCards log={studyData?.session_log ?? []} schedule={scheduleQuery.data} />

            {/* Recommendations */}
            <div className="rounded-2xl p-5" style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 360ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5" style={{ color: c.pink }} />
                <p className="text-sm font-bold" style={{ color: c.ink }}>{t('recommendations', 'Recommendations')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl p-3" style={{ backgroundColor: `${c.accent}08`, border: `1px solid ${c.accent}15` }}>
                    <span className="mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>{i + 1}</span>
                    <p className="text-sm leading-relaxed" style={{ color: c.inkSoft }}>{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Refresh */}
            <div className="flex justify-center pt-2">
              <button onClick={() => refresh()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[16px] text-sm font-bold transition-all hover:scale-[1.03] active:scale-[0.97]"
                style={{ backgroundColor: c.accent, color: '#fff', boxShadow: c.clayShadow !== 'none' ? c.clayShadow : undefined }}>
                <RefreshCw className="w-4 h-4" />
                {t('refresh', 'Refresh')}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Theme-specific ambient glow in dark mode */}
      {isDark && themeId !== 'clarity' && (
        <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20"
            style={{ background: `radial-gradient(ellipse, ${c.accent}40, transparent 70%)` }} />
        </div>
      )}

      <MobileBottomNav
        accent={c.accent}
        card={c.card}
        cardBorder={c.cardBorder}
        inkFaint={c.inkFaint}
        bg={c.bg}
      />
    </div>
  );
}
