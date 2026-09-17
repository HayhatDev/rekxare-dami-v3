import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import type { ThemePalette } from '../../themes/palette';
import type { QuizQuestion } from '../../services/aiAdvisor';
import { STATUS_COLORS } from '../../utils/constants';

interface QuizPlayerProps {
  colors: ThemePalette;
  questions: QuizQuestion[];
  currentIndex: number;
  answers: number[];
  onAnswer: (index: number) => void;
  onNext: () => void;
}

const GREEN = STATUS_COLORS.success;
const RED = STATUS_COLORS.danger;

export default function QuizPlayer({
  colors,
  questions,
  currentIndex,
  answers,
  onAnswer,
  onNext,
}: QuizPlayerProps) {
  const { t } = useTranslation();

  const q = questions[currentIndex];
  if (!q) return null;

  const total = questions.length;
  const chosen = answers[currentIndex];
  const answered = chosen !== -1;
  const isLast = currentIndex === total - 1;
  const progress = Math.round(((currentIndex + (answered ? 1 : 0)) / total) * 100);

  return (
    <div className="rounded-3xl border p-6 space-y-5"
      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
      {/* Progress */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: colors.inkFaint }}>
          {t('quiz_question_of', 'Question {{current}} of {{total}}', { current: currentIndex + 1, total })}
        </span>
        <span className="text-[12px] font-extrabold tabular-nums" style={{ color: colors.accent }}>
          {progress}%
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.cardBorder }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: colors.accent }} />
      </div>

      {/* Question */}
      <h2 className="text-[17px] leading-relaxed font-extrabold" style={{ color: colors.ink }}>
        {q.question}
      </h2>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((option, i) => {
          const isCorrect = i === q.correct;
          const isChosen = i === chosen;
          let bg = `${colors.accent}08`;
          let border = colors.cardBorder;
          let fg = colors.inkSoft;
          let icon: React.ReactNode = null;

          if (answered) {
            if (isCorrect) { bg = `${GREEN}18`; border = GREEN; fg = colors.ink; icon = <Check size={14} color={GREEN} strokeWidth={3} />; }
            else if (isChosen) { bg = `${RED}14`; border = RED; fg = colors.ink; icon = <X size={14} color={RED} strokeWidth={3} />; }
            else { bg = 'transparent'; border = colors.cardBorder; fg = colors.inkFaint; }
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => !answered && onAnswer(i)}
              disabled={answered}
              className="w-full text-left px-4 py-3 rounded-2xl text-[13px] font-semibold transition-colors disabled:cursor-default flex items-center gap-2.5"
              style={{ backgroundColor: bg, border: `1px solid ${border}`, color: fg }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[11px] font-extrabold"
                style={{ backgroundColor: answered && isCorrect ? 'transparent' : `${colors.accent}15`, color: answered ? fg : colors.accent }}>
                {icon ?? String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {answered && (
        <div className="rounded-2xl p-4 space-y-1.5"
          style={{ backgroundColor: `${GREEN}0E`, border: `1px solid ${GREEN}30` }}>
          <span className="text-[12px] font-extrabold" style={{ color: GREEN }}>
            {chosen === q.correct ? t('quiz_correct_answer', 'Correct!') : t('quiz_incorrect_answer', 'Incorrect')}
          </span>
          {q.explanation && (
            <p className="text-[13px] leading-relaxed" style={{ color: colors.inkSoft }}>
              <span className="font-bold">{t('quiz_explanation', 'Explanation')}:</span> {q.explanation}
            </p>
          )}
        </div>
      )}

      {/* Next / Finish */}
      {answered && (
        <button
          type="button"
          onClick={onNext}
          className="w-full py-3.5 rounded-2xl text-[14px] font-extrabold transition-transform active:scale-[0.98]"
          style={{ backgroundColor: colors.accent, color: '#fff' }}
        >
          {isLast ? t('quiz_finish', 'Finish') : t('quiz_next_question', 'Next question')}
        </button>
      )}
    </div>
  );
}