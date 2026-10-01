import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Layers, X } from 'lucide-react';
import type { ThemePalette } from '../../themes/palette';
import type { ReviewCard, ReviewGrade } from '../../utils/srs';
import { STATUS_COLORS } from '../../utils/constants';
import { nextIntervalHint } from '../../utils/srs';

interface ReviewSessionProps {
  colors: ThemePalette;
  cards: ReviewCard[];
  onGrade: (cardId: string, grade: ReviewGrade) => void | Promise<void>;
  onExit: () => void;
}

const GREEN = STATUS_COLORS.success;
const RED = STATUS_COLORS.danger;

export default function ReviewSession({ colors, cards, onGrade, onExit }: ReviewSessionProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [reviewed, setReviewed] = useState(0);

  const card = cards[index];
  const total = cards.length;
  const done = reviewed >= total;

  const progress = total === 0 ? 0 : Math.round((reviewed / total) * 100);

  const hints = useMemo(() => {
    if (!card) return null;
    return nextIntervalHint(card);
  }, [card]);

  const formatHint = (grade: ReviewGrade): string => {
    if (!hints) return '—';
    const hint = hints[grade];
    return t(
      hint.unit === 'minutes' ? 'review_unit_minutes' : 'review_unit_days',
      hint.unit === 'minutes' ? '{{n}}m' : '{{n}}d',
      { n: hint.value }
    );
  };

  if (done) {
    return (
      <div className="rounded-3xl border p-8 flex flex-col items-center gap-4 text-center"
        style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
          style={{ background: colors.accent }}>
          <Layers size={24} />
        </div>
        <p className="text-[17px] font-extrabold" style={{ color: colors.ink }}>
          {t('review_session_done', 'Review complete')}
        </p>
        <p className="text-[13px]" style={{ color: colors.inkFaint }}>
          {t('review_session_summary', '{{correct}} of {{total}} correct', {
            correct: correctCount,
            total,
          })}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="mt-1 w-full py-3.5 rounded-2xl text-[14px] font-extrabold transition-transform active:scale-[0.98]"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          {t('review_done', 'Done')}
        </button>
      </div>
    );
  }

  if (!card) return null;

  const revealed = chosen !== null;
  const isCorrect = chosen === card.correct;

  const handleGrade = async (grade: ReviewGrade) => {
    if (chosen === null) return;
    if (chosen === card.correct) setCorrectCount((c) => c + 1);
    await onGrade(card.id, grade);
    setReviewed((r) => r + 1);
    setChosen(null);
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  return (
    <div className="rounded-3xl border p-6 space-y-5"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
          {t('review_due_label', 'Review')} {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={onExit}
          className="text-[12px] font-extrabold" style={{ color: colors.inkFaint }}>
          {t('review_exit', 'Exit')}
        </button>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: colors.accent }} />
      </div>

      {card.subject && (
        <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold"
          style={{ backgroundColor: `${colors.accent}15`, color: colors.accent }}>
          {card.subject}
        </span>
      )}

      <h2 className="text-[17px] leading-relaxed font-extrabold" style={{ color: colors.ink }}>
        {card.question}
      </h2>

      <div className="space-y-2">
        {card.options.map((option, i) => {
          const optionCorrect = i === card.correct;
          const optionChosen = i === chosen;
          let bg = `${colors.accent}08`;
          let border = colors.cardBorder;
          let fg = colors.inkSoft;
          let icon: React.ReactNode = null;

          if (revealed) {
            if (optionCorrect) { bg = `${GREEN}18`; border = GREEN; fg = colors.ink; icon = <Check size={14} color={GREEN} strokeWidth={3} />; }
            else if (optionChosen) { bg = `${RED}14`; border = RED; fg = colors.ink; icon = <X size={14} color={RED} strokeWidth={3} />; }
            else { bg = 'transparent'; border = colors.cardBorder; fg = colors.inkFaint; }
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => !revealed && setChosen(i)}
              disabled={revealed}
              aria-pressed={revealed ? optionChosen : undefined}
              className="w-full text-left px-4 py-3 rounded-2xl text-[13px] font-semibold transition-colors disabled:cursor-default flex items-center gap-2.5"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                style={{ backgroundColor: revealed && optionCorrect ? 'transparent' : `${colors.accent}15`, color: revealed ? fg : colors.accent }}>
                {icon ?? String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="space-y-3">
          <div className="rounded-2xl p-4 space-y-1.5"
            style={{ backgroundColor: isCorrect ? `${GREEN}0E` : `${RED}0E`, border: `1px solid ${isCorrect ? `${GREEN}30` : `${RED}30`}` }}>
            <span className="text-[12px] font-extrabold" style={{ color: isCorrect ? GREEN : RED }}>
              {isCorrect ? t('quiz_correct_answer', 'Correct!') : t('quiz_incorrect_answer', 'Incorrect')}
            </span>
            {card.explanation && (
              <p className="text-[13px] leading-relaxed" style={{ color: colors.inkSoft }}>
                <span className="font-bold">{t('quiz_explanation', 'Explanation')}:</span> {card.explanation}
              </p>
            )}
          </div>

          <div>
            <p className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.inkFaint }}>
              {t('review_how_well', 'How well did you remember?')}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {([0, 1, 2, 3] as ReviewGrade[]).map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => void handleGrade(grade)}
                  className="py-2.5 rounded-xl text-[12px] font-extrabold transition-transform active:scale-95"
                  style={{
                    backgroundColor: `${colors.accent}${grade === 0 ? '22' : '12'}`,
                    color: colors.accent,
                    border: `1px solid ${colors.accent}33`,
                  }}
                >
                  {t(`review_grade_${grade}`, ['Again', 'Hard', 'Good', 'Easy'][grade])}
                  <span className="block text-[10px] font-semibold opacity-70 tabular-nums">
                    {formatHint(grade)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}