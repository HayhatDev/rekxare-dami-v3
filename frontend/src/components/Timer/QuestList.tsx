import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, Check, Flame, Repeat } from 'lucide-react';
import { useStudyData } from '../../hooks/useStudyData';
import { dayKey } from '../../utils/sessionLog';
import { evaluateQuests, QuestId, QuestStatus } from '../../utils/quests';

interface QuestListProps {
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
  shadow?: string;
}

const ICONS: Record<QuestId, typeof Flame> = {
  focus: Flame,
  sessions: Repeat,
  variety: BookOpen,
};

/** Progress is already clamped to the target, so the bar cannot overflow. */
function progressPct(status: QuestStatus): number {
  return Math.min(100, Math.round((status.progress / Math.max(1, status.target)) * 100));
}

/**
 * Theme-agnostic daily-quest widget.
 *
 * Renders the three per-day quests and how far the student has got on each.
 * Read-only by design: quests pay out automatically when a session completes
 * them, so there is no claim button that could be missed or double-pressed.
 * Self-contained styling via palette, matching `GoalCard`.
 */
export default function QuestList({ colors, radius = 16, shadow }: QuestListProps) {
  const { t } = useTranslation();
  const { data } = useStudyData();

  // Recomputed per render rather than held in state: the whole point of
  // deriving progress from the session log is that it cannot drift out of sync.
  const statuses = useMemo(
    () => (data ? evaluateQuests(data, dayKey(new Date()), data.daily_quests) : []),
    [data]
  );

  const wrap = useMemo(
    () => ({
      backgroundColor: colors.card,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: radius,
      ...(shadow ? { boxShadow: shadow } : {}),
    }),
    [colors, radius, shadow]
  );

  if (!data) return null;

  const done = statuses.filter((s) => s.complete).length;

  return (
    <div className="p-5" style={wrap}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('daily_quests', 'Daily Quests')}
          </span>
        </div>
        <span
          className="text-[11px] font-bold tabular-nums"
          style={{ color: done === statuses.length ? colors.accent : colors.inkSoft }}
        >
          {t('quests_progress_count', '{{done}} / {{total}}', { done, total: statuses.length })}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {statuses.map((status) => {
          const Icon = ICONS[status.id];
          const settled = status.complete;
          const pct = progressPct(status);

          return (
            <div key={status.id} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: settled ? colors.accent : `${colors.accent}12`,
                  color: settled ? '#fff' : colors.accent,
                }}
              >
                {settled ? <Check size={15} /> : <Icon size={15} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className="text-[12px] font-bold truncate"
                    style={{ color: settled ? colors.ink : colors.inkSoft }}
                  >
                    {t(`quest_${status.id}`, status.id)}
                  </span>
                  <span
                    className="text-[11px] font-bold tabular-nums flex-shrink-0"
                    style={{ color: settled ? colors.accent : colors.inkFaint }}
                  >
                    {status.progress} / {status.target}{' '}
                    {t(`quest_unit_${status.id}`, '')}
                  </span>
                </div>

                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: settled ? colors.accent : `${colors.accent}99` }}
                  />
                </div>
              </div>

              <span
                className="text-[11px] font-bold tabular-nums flex-shrink-0 w-14 text-right"
                style={{ color: settled ? colors.accent : colors.inkFaint }}
              >
                {/* The XP badge describes what an INCOMPLETE quest is worth. Once a quest is
                  complete it shows "Banked", never "+N XP": progress can arrive
                  without a matching claim record (imported history, or a write
                  that rolled back), and promising a reward there would be a
                  promise the app cannot keep. `claimed` stays the write-level
                  dedupe guard in `newlyCompletedQuests`, not the display source
                  of truth. */}
                {settled ? t('quest_banked', 'Banked') : `+${status.xp} ${t('quest_xp_short', 'XP')}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}