import { useMemo, useState, useEffect } from 'react';
import { useThemeStore } from '../../stores/useThemeStore';
import { useTranslation } from 'react-i18next';
import { getThemeColors } from '../../themes/palette';
import { STATUS_COLORS } from '../../utils/constants';
import { formatMinutes } from '../../utils/sessionLog';
import { weeklyActivity, subjectFocus, planAdherence, quizMastery } from '../../services/localInsights';
import { TrendingUp, TrendingDown, Minus, CalendarCheck, Target, BookOpenCheck } from 'lucide-react';
import type { SessionRecord, ScheduleData } from '../../types';

interface LocalInsightsCardsProps {
  log: SessionRecord[];
  schedule?: ScheduleData;
}

export default function LocalInsightsCards({ log, schedule }: LocalInsightsCardsProps) {
  const { themeId, isDark } = useThemeStore();
  const { t } = useTranslation();
  const c = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const week = useMemo(() => weeklyActivity(log), [log]);
  const subjects = useMemo(() => subjectFocus(log), [log]);
  const adherence = useMemo(() => planAdherence(log, schedule), [log, schedule]);
  const quizzes = useMemo(() => quizMastery(log), [log]);

  const maxMin = Math.max(1, ...week.map((d) => d.minutes));

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-5"
        style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" style={{ color: c.accent }} />
            <p className="text-sm font-bold" style={{ color: c.ink }}>{t('weekly_activity', 'Weekly Activity')}</p>
          </div>
          <span className="text-xs" style={{ color: c.inkFaint }}>{t('last_7_days', 'Last 7 days')}</span>
        </div>
        <div className="flex items-end justify-between gap-2 h-28">
          {week.map((d, i) => {
            const h = Math.round((d.minutes / maxMin) * 100);
            const isToday = i === week.length - 1;
            const label = new Date(`${d.date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' });
            return (
              <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                <span className="text-[11px] font-medium" style={{ color: c.inkFaint }}>{formatMinutes(Math.round(d.minutes * 60))}</span>
                <div className="w-full rounded-lg flex items-end" style={{ height: 64, backgroundColor: `${c.accent}10` }}>
                  <div
                    className="w-full rounded-lg transition-all duration-700"
                    style={{ height: `${mounted ? h : 0}%`, backgroundColor: isToday ? c.accent : `${c.accent}66` }}
                  />
                </div>
                <span className="text-[11px] font-semibold" style={{ color: isToday ? c.ink : c.inkFaint }}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {subjects.length > 0 && (
        <div
          className="rounded-2xl p-5"
          style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 90ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}
        >
          <p className="text-sm font-bold mb-4" style={{ color: c.ink }}>{t('focus_by_subject', 'Focus by Subject')}</p>
          <div className="space-y-3">
            {subjects.map((s, i) => (
              <div key={s.subject}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium" style={{ color: c.ink }}>{s.subject}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: c.inkFaint }}>{formatMinutes(s.minutes * 60)} · {s.pct}%</span>
                    {s.trend === 'up' && <TrendingUp className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.success }} />}
                    {s.trend === 'down' && <TrendingDown className="w-3.5 h-3.5" style={{ color: STATUS_COLORS.danger }} />}
                    {s.trend === 'stable' && <Minus className="w-3.5 h-3.5" style={{ color: c.inkFaint }} />}
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${c.accent}15` }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: mounted ? `${s.pct}%` : '0%',
                      backgroundColor: c.accent,
                      transition: `width 900ms cubic-bezier(0.22, 1, 0.36, 1) ${i * 120}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="rounded-2xl p-5"
        style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 180ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: c.pink }} />
            <p className="text-sm font-bold" style={{ color: c.ink }}>{t('plan_adherence', 'Plan Adherence')}</p>
          </div>
          {adherence.planned > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold"
              style={{ backgroundColor: `${c.accent}18`, color: c.accent }}
            >
              {Math.round((adherence.done / adherence.planned) * 100)}%
            </span>
          )}
        </div>
        {adherence.planned === 0 ? (
          <p className="text-sm" style={{ color: c.inkSoft }}>{t('plan_none_today', 'No study plan for today')}</p>
        ) : adherence.done >= adherence.planned ? (
          <p className="text-sm" style={{ color: STATUS_COLORS.success }}>{t('plan_all_done', 'All planned tasks done today')}</p>
        ) : (
          <div>
            <p className="text-sm mb-2" style={{ color: c.inkSoft }}>{t('plan_done_today', { done: adherence.done, planned: adherence.planned })}</p>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${c.accent}15` }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: mounted ? `${Math.round((adherence.done / adherence.planned) * 100)}%` : '0%',
                  backgroundColor: c.accent,
                  transition: 'width 900ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      <div
        className="rounded-2xl p-5"
        style={{ animation: 'insRise 600ms cubic-bezier(0.32, 0.72, 0.24, 1) 270ms both', backgroundColor: c.card, border: `1px solid ${c.cardBorder}` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpenCheck className="w-5 h-5" style={{ color: STATUS_COLORS.warning }} />
          <p className="text-sm font-bold" style={{ color: c.ink }}>{t('quiz_performance', 'Quiz Performance')}</p>
        </div>
        {quizzes.length === 0 ? (
          <p className="text-sm" style={{ color: c.inkSoft }}>{t('quiz_no_scores', 'Complete a quiz to see your mastery')}</p>
        ) : (
          <div className="space-y-2.5">
            {quizzes.map((q) => (
              <div key={q.subject} className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate" style={{ color: c.ink }}>{q.subject}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs" style={{ color: c.inkFaint }}>{q.correct}/{q.total}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{ backgroundColor: `${q.score >= 70 ? STATUS_COLORS.success : STATUS_COLORS.warning}20`, color: q.score >= 70 ? STATUS_COLORS.success : STATUS_COLORS.warning }}
                  >
                    {q.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}