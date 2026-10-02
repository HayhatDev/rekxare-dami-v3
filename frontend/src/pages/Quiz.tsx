import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Brain, Layers, Loader2 } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';
import { useLangStore } from '../stores/useLangStore';
import { getThemeColors, getThemeFont, brandGradient } from '../themes/palette';
import { useQuiz, quizDailyRemaining, QUIZ_DAILY_LIMIT } from '../hooks/useQuiz';
import { useReviewCards } from '../hooks/useReviewCards';
import { useStudyData } from '../hooks/useStudyData';
import QuizUpload from '../components/Quiz/QuizUpload';
import QuizPlayer from '../components/Quiz/QuizPlayer';
import QuizResults from '../components/Quiz/QuizResults';
import ReviewSession from '../components/Quiz/ReviewSession';
import ImportDeck from '../components/Quiz/ImportDeck';
import type { ReviewCard } from '../utils/srs';

export default function Quiz() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { themeId, isDark } = useThemeStore();
  const { lang } = useLangStore();
  const { data } = useStudyData();
  const [questionCount, setQuestionCount] = useState(5);
  const [reviewing, setReviewing] = useState(false);
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [imported, setImported] = useState(0);

  const c = useMemo(() => getThemeColors(themeId, isDark), [themeId, isDark]);
  const fontFamily = useMemo(() => getThemeFont(themeId), [themeId]);
  const isRTL = lang === 'ar' || lang === 'badini' || lang === 'sorani';

  const quiz = useQuiz();
  const review = useReviewCards();
  const [usedToday, setUsedToday] = useState(() => QUIZ_DAILY_LIMIT - quizDailyRemaining());
  const remaining = Math.max(0, QUIZ_DAILY_LIMIT - usedToday);

  // A review session is a snapshot of what was due when it started. Recomputing
  // the queue on every render would drop cards as they get graded and shift the
  // question under the student mid-session.
  const beginReview = () => {
    const due = review.startReview();
    if (due.length === 0) return;
    setQueue(due);
    setReviewing(true);
  };

  const endReview = () => {
    setReviewing(false);
    setQueue([]);
  };

  const log = data?.session_log ?? [];
  const lastCompleted = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      if (log[i].completed) return log[i];
    }
    return null;
  }, [log]);

  const sessionId = log.find((r) => r.id === lastCompleted?.id)?.id;
  const subject = lastCompleted?.subject || data?.last_subject || '';
  const subjectOptions = t('subjects', { returnObjects: true }) as string[];
  const fallbackSubject = subject || subjectOptions[0] || '';

  async function handleSubmit(text: string) {
    const generated = await quiz.start({
      text,
      subject,
      questionCount,
      lang,
      sessionId,
    });
    if (generated) {
      setUsedToday((n) => n + 1);
      await review.saveDeck(generated, subject);
    }
  }

  async function handleImport(cards: ReviewCard[], cardSubject: string) {
    await review.importCards(cards);
    setImported(cards.length);
  }

  const errorText =
    quiz.error === 'DAILY_LIMIT' ? t('quiz_daily_limit', "You've used your {{count}} quizzes for today. They refill tomorrow — your library and reviews are untouched in the meantime.",
      { count: QUIZ_DAILY_LIMIT })
    : quiz.error === 'RATE_LIMITED' ? t('quiz_rate_limited', "A lot of people are making quizzes right now, so we've paused new ones for a moment. Your {{count}} daily quizzes are still ready to use — please try again in a little while.",
      { count: QUIZ_DAILY_LIMIT })
    : quiz.error === 'NO_USABLE_TEXT' ? t('quiz_no_text', "We couldn't read enough text. Try pasting your notes instead.")
    : quiz.error === 'NOT_ENOUGH_TEXT' ? t('quiz_short_text', 'Please paste a bit more text so we can make good questions.')
    : quiz.error === 'AUTH_REQUIRED' ? t('quiz_auth_hint', 'Please sign in to create quizzes.')
    : quiz.error ? t('quiz_generic_error', 'Something went wrong. Please try again.')
    : null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-[100dvh] flex flex-col antialiased transition-colors duration-500"
      style={{ backgroundColor: c.bg, color: c.ink, fontFamily }}
    >
      <header className="relative z-[70] flex items-center justify-between px-6 md:px-10 h-[72px] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform active:scale-95"
            style={{ backgroundColor: `${c.accent}15`, color: c.accent }}
            aria-label={t('quiz_back', 'Back')}
          >
            <ArrowLeft size={18} style={{ transform: isRTL ? 'rotate(180deg)' : undefined }} />
          </button>
          <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-white"
            style={{ background: brandGradient(c.accent, c.pink) }}>
            <Brain size={20} />
          </div>
          <span className="font-extrabold text-lg tracking-tight">{t('quiz_title', 'AI Quiz')}</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-5 md:px-8 pb-24 pt-4">
        {quiz.phase === 'generating' && (
          <div className="rounded-3xl border p-8 flex flex-col items-center gap-3 text-center"
            style={{ backgroundColor: c.card, borderColor: c.cardBorder }}>
            <Loader2 size={28} className="animate-spin" style={{ color: c.accent }} />
            <p className="text-[15px] font-extrabold" style={{ color: c.ink }}>
              {t('quiz_generating', 'Creating your quiz…')}
            </p>
            <p className="text-[12px]" style={{ color: c.inkFaint }}>
              {t('quiz_generating_hint', 'This can take a few seconds.')}
            </p>
          </div>
        )}

        {quiz.phase === 'idle' && !reviewing && (
          <div className="space-y-4">
            {review.summary.due > 0 && (
              <button
                type="button"
                onClick={beginReview}
                className="w-full rounded-3xl border p-5 flex items-center gap-4 text-left transition-transform active:scale-[0.99]"
                style={{ backgroundColor: c.card, borderColor: c.cardBorder }}
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white"
                  style={{ background: brandGradient(c.accent, c.pink) }}>
                  <Layers size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold" style={{ color: c.ink }}>
                    {t('review_due_title', '{{count}} cards ready to review', { count: review.summary.due })}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: c.inkFaint }}>
                    {t('review_due_hint', 'Memory score {{memory}}%', { memory: review.summary.memory })}
                  </p>
                </div>
              </button>
            )}
            <div className="text-center px-2 pt-1">
              <p className="text-[16px] font-extrabold">{t('quiz_upload_intro', 'Turn what you studied into a quick quiz!')}</p>
              <p className="mt-1 text-[12px]" style={{ color: c.inkFaint }}>
                {t('quiz_upload_hint', 'Photo or PDF of the material you studied')}
              </p>
            </div>
            {errorText && (
              <p className="text-[13px] font-semibold text-center px-4 py-3 rounded-2xl"
                style={{ backgroundColor: `${c.pink}12`, color: c.pink }}>
                {errorText}
              </p>
            )}
            <QuizUpload
              colors={c}
              questionCount={questionCount}
              busy={false}
              remaining={remaining}
              lang={lang}
              onQuestionCountChange={setQuestionCount}
              onSubmit={(text) => void handleSubmit(text)}
            />
            {imported > 0 && (
              <p className="text-[12px] font-semibold text-center px-4 py-2.5 rounded-2xl"
                style={{ backgroundColor: `${c.accent}12`, color: c.accent }}>
                {t('import_done', '{{count}} cards added to your library.', { count: imported })}
              </p>
            )}
            <ImportDeck
              colors={c}
              initialSubject={fallbackSubject}
              room={review.room}
              totalCards={review.cards.length}
              onImport={handleImport}
              onClearLibrary={async () => {
                await review.clearAll();
                setImported(0);
              }}
            />
          </div>
        )}

        {reviewing && (
          <ReviewSession
            colors={c}
            cards={queue}
            onGrade={review.grade}
            onExit={endReview}
          />
        )}

        {quiz.phase === 'playing' && (
          <QuizPlayer
            colors={c}
            questions={quiz.questions}
            currentIndex={quiz.currentIndex}
            answers={quiz.answers}
            onAnswer={quiz.answer}
            onNext={quiz.next}
          />
        )}

        {quiz.phase === 'results' && (
          <QuizResults
            colors={c}
            correctCount={quiz.correctCount}
            total={quiz.questions.length}
            note={quiz.note}
            requestedCount={quiz.requestedCount}
            scoreSaved={quiz.scoreSaved}
            saving={quiz.saving}
            onRetry={quiz.reset}
            onBack={() => navigate('/')}
          />
        )}
      </main>
    </div>
  );
}