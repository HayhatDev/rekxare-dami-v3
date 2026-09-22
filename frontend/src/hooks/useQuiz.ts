import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { generateQuiz, type QuizQuestion } from '../services/aiAdvisor';
import { useStudyData } from './useStudyData';

export type QuizPhase = 'idle' | 'generating' | 'playing' | 'results';

export type QuizErrorCode =
  | 'DAILY_LIMIT'
  | 'NO_USABLE_TEXT'
  | 'NOT_ENOUGH_TEXT'
  | 'AUTH_REQUIRED'
  | 'GENERIC';

export const QUIZ_DAILY_LIMIT = 5;
export const USAGE_KEY = 'rekxare_quiz_usage';

function usageDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** How many quiz generations remain today (shared across tabs). */
export function quizDailyRemaining(): number {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return QUIZ_DAILY_LIMIT;
    const usage = JSON.parse(raw) as { date: string; count: number };
    if (usage.date !== usageDayKey()) return QUIZ_DAILY_LIMIT;
    return Math.max(0, QUIZ_DAILY_LIMIT - (usage.count || 0));
  } catch {
    return QUIZ_DAILY_LIMIT;
  }
}

/** Consume one daily quiz slot (shared across tabs). Return false when the limit is reached. */
export function consumeQuizSlot(): boolean {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    let count = 0;
    if (raw) {
      const usage = JSON.parse(raw) as { date: string; count: number };
      if (usage.date === usageDayKey()) count = usage.count || 0;
    }
    if (count >= QUIZ_DAILY_LIMIT) return false;
    localStorage.setItem(USAGE_KEY, JSON.stringify({ date: usageDayKey(), count: count + 1 }));
    return true;
  } catch {
    return true;
  }
}

export interface QuizStartOpts {
  text: string;
  subject?: string;
  questionCount: number;
  lang: string;
  sessionId?: string;
  savedLabel?: string;
}

export function useQuiz() {
  const { data, updateData } = useStudyData();
  const sessionIdRef = useRef<string | undefined>(undefined);

  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState<QuizErrorCode | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [requestedCount, setRequestedCount] = useState(5);
  const [saving, setSaving] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  const start = useCallback(
    async (opts: QuizStartOpts): Promise<boolean> => {
      // Early gate for UX: bail out before showing the generating spinner when
      // the daily limit is already reached.
      if (quizDailyRemaining() === 0) {
        setError('DAILY_LIMIT');
        return false;
      }
      sessionIdRef.current = opts.sessionId;
      setError(null);
      setPhase('generating');
      try {
        const res = await generateQuiz({
          text: opts.text,
          subject: opts.subject,
          questionCount: opts.questionCount,
          lang: opts.lang,
        });
        // Consume the daily slot only after a successful generation, so failed
        // requests (network/AI errors) never burn a free quiz.
        consumeQuizSlot();
        setQuestions(res.questions);
        setNote(res.note ?? '');
        setAnswers(new Array(res.questions.length).fill(-1));
        setCorrectCount(0);
        setCurrentIndex(0);
        setRequestedCount(opts.questionCount);
        setScoreSaved(false);
        setPhase('playing');
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        setError(
          msg === 'AUTH_REQUIRED' ? 'AUTH_REQUIRED'
            : msg === 'NO_USABLE_TEXT' ? 'NO_USABLE_TEXT'
            : msg === 'NOT_ENOUGH_TEXT' ? 'NOT_ENOUGH_TEXT'
            : 'GENERIC'
        );
        setPhase('idle');
        return false;
      }
    },
    []
  );

  const answer = useCallback(
    (index: number) => {
      if (phase !== 'playing') return;
      if (answers[currentIndex] !== -1) return;
      const next = [...answers];
      next[currentIndex] = index;
      setAnswers(next);
      if (index === questions[currentIndex]?.correct) setCorrectCount((c) => c + 1);
    },
    [answers, currentIndex, phase, questions]
  );

  const finish = useCallback(
    async (savedHint?: string) => {
      const total = questions.length;
      const correct = correctCount;
      const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
      setPhase('results');

      const log = data?.session_log ?? [];
      let targetIndex = -1;
      if (sessionIdRef.current) targetIndex = log.findIndex((r) => r.id === sessionIdRef.current);
      if (targetIndex === -1) targetIndex = log.length - 1;
      if (targetIndex < 0 || !log[targetIndex]) return;

      const record = log[targetIndex];
      if (!record.completed) return;

      const next = [...log];
      next[targetIndex] = {
        ...record,
        quiz_score: pct,
        quiz_correct: correct,
        quiz_total: total,
      };
      setSaving(true);
      try {
        await updateData({ session_log: next });
        setScoreSaved(true);
        if (savedHint) toast.success(savedHint);
      } catch (e) {
        if (import.meta.env.DEV) console.error('[useQuiz] Failed to save quiz score:', e);
      } finally {
        setSaving(false);
      }
    },
    [correctCount, data?.session_log, questions.length, updateData]
  );

  const next = useCallback(() => {
    if (phase !== 'playing') return;
    if (currentIndex >= questions.length - 1) {
      void finish();
      return;
    }
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, finish, phase, questions.length]);

  const reset = useCallback(() => {
    setPhase('idle');
    setQuestions([]);
    setNote('');
    setError(null);
    setCurrentIndex(0);
    setAnswers([]);
    setCorrectCount(0);
    setScoreSaved(false);
    sessionIdRef.current = undefined;
  }, []);

  return {
    phase,
    questions,
    note,
    error,
    currentIndex,
    answers,
    correctCount,
    requestedCount,
    saving,
    scoreSaved,
    start,
    answer,
    next,
    finish,
    reset,
  };
}