import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useStudyData } from '../../hooks/useStudyData';
import { formatMinutes, sessionLogStats } from '../../utils/sessionLog';

interface SessionHistoryCardProps {
  colors: {
    card: string;
    cardBorder: string;
    ink: string;
    inkSoft: string;
    inkFaint: string;
    accent: string;
    accentSoft?: string;
  };
  radius?: number;
  maxItems?: number;
  shadow?: string;
}

const wrap = (colors: SessionHistoryCardProps['colors'], radius: number, shadow?: string) =>
  ({
    backgroundColor: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: radius,
    ...(shadow ? { boxShadow: shadow } : {}),
  });

/**
 * Theme-agnostic effectiveness surface (session-history for Phase 4).
 * Shows completion rate, day snapshot and the most recent sessions from the
 * local/cloud session log. Self-contained styling via the passed palette.
 */
export default function SessionHistoryCard({ colors, radius = 16, maxItems = 4, shadow }: SessionHistoryCardProps) {
  const { t } = useTranslation();
  const { data } = useStudyData();
  const stats = useMemo(() => sessionLogStats(data?.session_log), [data?.session_log]);
  const items = stats.recent.slice(0, maxItems);
  const hasData = stats.total > 0;

  return (
    <div className="p-5" style={wrap(colors, radius, shadow)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('session_log', 'Session Log')}
          </span>
        </div>
        {hasData && (
          <span className="text-[11px] font-bold px-2 py-1 rounded-full" style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}>
            {t('session_log_total', '{count} total').replace('{count}', String(stats.total))}
          </span>
        )}
      </div>

      {!hasData ? (
        <p className="text-[12px] leading-relaxed" style={{ color: colors.inkFaint }}>
          {t('session_log_empty', 'No sessions yet - finish your first focus block!')}
        </p>
      ) : (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-bold" style={{ color: colors.inkSoft }}>
                {t('completion_rate', 'Completion rate')}
              </span>
              <span className="text-[12px] font-extrabold tabular-nums" style={{ color: colors.accent }}>
                {stats.completionRate}%
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.completionRate}%`, backgroundColor: colors.accent }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.accent}10` }}>
              <div className="text-[16px] font-extrabold tabular-nums leading-none" style={{ color: colors.ink }}>
                {stats.completed}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.inkFaint }}>
                {t('session_finished', 'finished')}
              </div>
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.accent}06` }}>
              <div className="text-[16px] font-extrabold tabular-nums leading-none" style={{ color: colors.ink }}>
                {stats.abandonCount}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.inkFaint }}>
                {t('session_missed', 'missed')}
              </div>
            </div>
            <div className="p-2 rounded-xl" style={{ backgroundColor: `${colors.accent}10` }}>
              <div className="text-[16px] font-extrabold tabular-nums leading-none" style={{ color: colors.ink }}>
                {formatMinutes(stats.todaySeconds)}
              </div>
              <div className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.inkFaint }}>
                {t('session_today', 'today')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: r.completed ? colors.accent : colors.inkFaint }}
                />
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-semibold truncate" style={{ color: colors.ink }}>
                    {r.subject || ''}
                  </span>
                  <span className="block text-[11px]" style={{ color: colors.inkFaint }}>
                    {r.completed
                      ? formatMinutes(r.focus_seconds)
                      : `${formatMinutes(r.focus_seconds)} / ${r.planned_minutes}m`}
                  </span>
                </span>
                {r.completed && (
                  <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                {typeof r.quiz_score === 'number' && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}>
                    {t('quiz_score_badge', 'Quiz {{score}}%', { score: r.quiz_score })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}