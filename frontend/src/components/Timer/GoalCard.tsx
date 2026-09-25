import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Check, Minus, Pencil, Plus, X } from 'lucide-react';
import { useStudyData } from '../../hooks/useStudyData';

const GOAL_PRESETS = [30, 60, 90, 120, 180];
const STEP = 5;
const MIN_GOAL = 5;
const MAX_GOAL = 600;

interface GoalCardProps {
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

const wrap = (colors: GoalCardProps['colors'], radius: number, shadow?: string) =>
  ({
    backgroundColor: colors.card,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: radius,
    ...(shadow ? { boxShadow: shadow } : {}),
  });

/**
 * Theme-agnostic daily-goal widget (goal-setting surface for Phase 4).
 * Shows today's progress toward the daily target and lets the user edit the
 * target inline via presets or a stepper. Self-contained styling via palette.
 */
export default function GoalCard({ colors, radius = 16, shadow }: GoalCardProps) {
  const { t } = useTranslation();
  const { data, updateData, isUpdating } = useStudyData();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(60);

  const goalSeconds = data?.daily_goal_seconds || 3600;
  const goalMinutes = Math.round(goalSeconds / 60);
  const doneSeconds = data?.daily_seconds || 0;
  const doneMinutes = Math.floor(doneSeconds / 60);
  const pct = Math.min(100, Math.round((doneSeconds / Math.max(1, goalSeconds)) * 100));
  const remaining = Math.max(0, Math.round((goalSeconds - doneSeconds) / 60));
  const reached = doneSeconds >= goalSeconds;

  const openEditor = () => {
    setDraft(Math.min(MAX_GOAL, Math.max(MIN_GOAL, goalMinutes)));
    setEditing(true);
  };

  const save = async () => {
    const minutes = Math.min(MAX_GOAL, Math.max(MIN_GOAL, draft));
    setEditing(false);
    try {
      await updateData({ daily_goal_seconds: minutes * 60 });
      toast(t('goal_saved', 'Daily goal updated'));
    } catch {
      toast(t('goal_save_error', 'Could not save the goal right now.'));
    }
  };

  if (editing) {
    return (
      <div className="p-5" style={wrap(colors, radius, shadow)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
              {t('goal_edit_title', 'Set Daily Goal')}
            </span>
          </div>
          <button
            onClick={() => setEditing(false)}
            className="transition-all hover:scale-105"
            aria-label={t('goal_cancel', 'Cancel')}
          >
            <X size={15} style={{ color: colors.inkFaint }} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setDraft((d) => Math.max(MIN_GOAL, d - STEP))}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
            aria-label={t('goal_decrease', 'Decrease')}
          >
            <Minus size={15} />
          </button>
          <div className="text-center">
            <span className="text-[32px] font-extrabold tabular-nums leading-none" style={{ color: colors.ink }}>
              {draft}
            </span>
            <div className="text-[11px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.inkFaint }}>
              {t('goal_minutes', 'minutes')}
            </div>
          </div>
          <button
            onClick={() => setDraft((d) => Math.min(MAX_GOAL, d + STEP))}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
            aria-label={t('goal_increase', 'Increase')}
          >
            <Plus size={15} />
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {GOAL_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setDraft(p)}
              className="px-3 py-1.5 text-[12px] font-bold rounded-2xl transition-all hover:scale-105"
              style={{
                backgroundColor: draft === p ? colors.accent : `${colors.accent}10`,
                color: draft === p ? '#fff' : colors.accent,
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          onClick={save}
          disabled={isUpdating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          <Check size={15} />
          {t('goal_save', 'Save goal')}
        </button>
      </div>
    );
  }

  return (
    <div className="p-5" style={wrap(colors, radius, shadow)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }} />
          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('daily_goal', 'Daily Goal')}
          </span>
        </div>
        <button
          onClick={openEditor}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: `${colors.accent}12`, color: colors.accent }}
          aria-label={t('goal_edit', 'Edit goal')}
        >
          <Pencil size={13} />
        </button>
      </div>

      <div className="flex items-end gap-2 mb-3">
        <span className="text-[30px] font-extrabold tabular-nums leading-none" style={{ color: reached ? colors.accent : colors.ink }}>
          {doneMinutes}
        </span>
        <span className="text-[12px] font-bold pb-0.5" style={{ color: colors.inkSoft }}>
          / {goalMinutes} {t('goal_minutes_short', 'min')}
        </span>
      </div>

      <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: colors.cardBorder }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: reached ? colors.accent : `${colors.accent}99` }}
        />
      </div>

      <p className="text-[12px]" style={{ color: reached ? colors.accent : colors.inkFaint }}>
        {reached
          ? t('goal_reached', 'Goal reached - way to go!')
          : t('goal_minutes_left', '{{remaining}} min left to reach your goal', { remaining })}
      </p>
    </div>
  );
}