import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2, RefreshCw, Timer } from 'lucide-react';
import type { ThemePalette } from '../../themes/palette';
import { STATUS_COLORS } from '../../utils/constants';

interface QuizResultsProps {
  colors: ThemePalette;
  correctCount: number;
  total: number;
  note: string;
  requestedCount: number;
  scoreSaved: boolean;
  saving: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export default function QuizResults({
  colors,
  correctCount,
  total,
  note,
  requestedCount,
  scoreSaved,
  saving,
  onRetry,
  onBack,
}: QuizResultsProps) {
  const { t } = useTranslation();
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const scoreColor = pct >= 70 ? STATUS_COLORS.success : pct >= 40 ? STATUS_COLORS.warning : STATUS_COLORS.danger;
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (pct / 100) * circumference;
  const generatedFewer = total < requestedCount;

  return (
    <div className="rounded-3xl border p-6 space-y-5"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
      <h2 className="text-[17px] font-extrabold text-center" style={{ color: colors.ink }}>
        {t('quiz_results_title', 'Quiz complete!')}
      </h2>

      {/* Score ring */}
      <div className="flex justify-center">
        <div className="relative w-[120px] h-[120px]">
          <svg viewBox="0 0 104 104" className="w-full h-full -rotate-90">
            <circle cx="52" cy="52" r="46" fill="none" strokeWidth="8" stroke={colors.cardBorder} />
            <circle
              cx="52" cy="52" r="46" fill="none" strokeWidth="8" stroke={scoreColor}
              strokeDasharray={circumference} strokeDashoffset={offset}
              strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-extrabold tabular-nums" style={{ color: colors.ink }}>{pct}%</span>
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
              {t('quiz_score_label', 'Score')}
            </span>
          </div>
        </div>
      </div>

      <p className="text-[13px] font-semibold text-center" style={{ color: colors.inkSoft }}>
        {t('quiz_answers_correct', '{{correct}} of {{total}} correct', { correct: correctCount, total })}
      </p>

      {generatedFewer && (
        <p className="text-[12px] text-center font-semibold px-3 py-2 rounded-xl"
          style={{ backgroundColor: `${colors.pink}10`, color: colors.pink }}>
          {t('quiz_created_fewer', 'We created {{count}} questions - the material didn’t have enough for {{requested}}.', { count: total, requested: requestedCount })}
        </p>
      )}

      {note && (
        <div className="rounded-2xl p-4" style={{ backgroundColor: `${colors.accent}0A`, border: `1px solid ${colors.cardBorder}` }}>
          <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
            {t('quiz_note_title', 'Note')}
          </span>
          <p className="mt-1 text-[13px] leading-relaxed" style={{ color: colors.inkSoft }}>{note}</p>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-[12px] font-semibold" style={{ color: colors.inkFaint }}>
        {saving ? (
          <span className="inline-flex items-center gap-1.5">
            <Loader2 size={14} className="animate-spin" style={{ color: colors.accent }} />
            {t('quiz_saving', 'Saving…')}
          </span>
        ) : scoreSaved ? (
          <span className="inline-flex items-center gap-1.5" style={{ color: STATUS_COLORS.success }}>
            <CheckCircle2 size={14} />
            {t('quiz_saved_hint', 'Score saved to your session log.')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <Timer size={14} />
            {t('quiz_not_saved_hint', 'Score not attached - no completed session found.')}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onRetry}
          className="py-3 rounded-2xl text-[13px] font-extrabold transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}
        >
          <RefreshCw size={15} />
          {t('quiz_new_quiz', 'New quiz')}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="py-3 rounded-2xl text-[13px] font-extrabold transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          <Timer size={15} />
          {t('quiz_back_to_timer', 'Back to timer')}
        </button>
      </div>
    </div>
  );
}