import { useCallback, useMemo, useRef } from 'react';
import { useStudyData } from './useStudyData';
import {
  createCard,
  deckId,
  dueCards,
  memoryScore,
  mergeCards,
  reviewCounts,
  scheduleCard,
  type ReviewGrade,
  type ReviewCard,
} from '../utils/srs';
import { dayKey } from '../utils/sessionLog';
import type { QuizQuestion } from '../services/aiAdvisor';

export interface ReviewSummary {
  due: number;
  fresh: number;
  total: number;
  memory: number;
}

/**
 * Builds a review deck from a freshly generated quiz. Cards already in the
 * collection keep their scheduling progress: re-quizzing the same material
 * must never reset a card back to zero reps, or review progress would be
 * destroyed every time a student regenerates a quiz from the same notes.
 */
export function deckFromQuiz(
  existing: ReviewCard[],
  questions: QuizQuestion[],
  subject: string,
  day: string = dayKey(new Date()),
  now: Date = new Date()
): ReviewCard[] {
  const deck = deckId(subject, day);
  const known = new Set(existing.map((c) => c.id));
  const incoming = questions
    .map((q) => createCard(q, subject, deck, now))
    .filter((c) => !known.has(c.id));
  return mergeCards(existing, incoming);
}

/** Applies one grade to one card and returns the updated collection. */
export function applyGrade(
  existing: ReviewCard[],
  cardId: string,
  grade: ReviewGrade,
  now: Date = new Date()
): ReviewCard[] {
  const index = existing.findIndex((c) => c.id === cardId);
  if (index === -1) return existing;
  const next = [...existing];
  next[index] = scheduleCard(next[index], grade, now);
  return next;
}

export function summarize(cards: ReviewCard[], now: Date = new Date()): ReviewSummary {
  const counts = reviewCounts(cards, now);
  return { ...counts, memory: memoryScore(cards) };
}

export function useReviewCards() {
  const { data, updateData, isUpdating } = useStudyData();

  const cards = useMemo(() => data?.review_cards ?? [], [data?.review_cards]);

  const summary = useMemo(() => summarize(cards), [cards]);

  /**
   * Grading happens one card at a time but the persisted write is asynchronous,
   * so two grades in quick succession could both read the same stale collection
   * and the second would erase the first. Reads go through this ref, which is
   * updated optimistically, while genuine server responses still resync it.
   */
  const cardsRef = useRef<ReviewCard[]>(cards);
  const syncedRef = useRef<ReviewCard[] | null>(null);
  if (data?.review_cards !== syncedRef.current) {
    syncedRef.current = data?.review_cards ?? [];
    cardsRef.current = syncedRef.current;
  }

  const commit = useCallback(
    async (transform: (current: ReviewCard[]) => ReviewCard[]): Promise<void> => {
      const next = transform(cardsRef.current);
      cardsRef.current = next;
      await updateData({ review_cards: next });
    },
    [updateData]
  );

  const saveDeck = useCallback(
    async (questions: QuizQuestion[], subject: string): Promise<number> => {
      if (questions.length === 0) return 0;
      const before = cardsRef.current.length;
      await commit((current) => deckFromQuiz(current, questions, subject));
      return cardsRef.current.length - before;
    },
    [commit]
  );

  const grade = useCallback(
    async (cardId: string, value: ReviewGrade): Promise<void> => {
      await commit((current) => applyGrade(current, cardId, value));
    },
    [commit]
  );

  const startReview = useCallback(
    (now: Date = new Date()): ReviewCard[] => dueCards(cardsRef.current, now),
    []
  );

  const clearAll = useCallback(async (): Promise<void> => {
    await commit(() => []);
  }, [commit]);

  return {
    cards,
    summary,
    saveDeck,
    grade,
    startReview,
    clearAll,
    isUpdating,
    hasDeck: cards.length > 0,
  };
}