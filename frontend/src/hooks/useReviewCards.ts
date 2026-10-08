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
  MAX_REVIEW_CARDS,
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

/**
 * Folds an imported deck into the existing library.
 *
 * Two rules keep an import from destroying work the student already did:
 *  - a card whose id is already present is skipped, so re-importing a deck
 *    cannot reset its `reps`, `ease`, or `due_at`;
 *  - fresh cards are trimmed to the remaining room, because `mergeCards`
 *    resolves the cap by due date and would otherwise evict the cards a
 *    student has studied longest.
 */
export function mergeImported(current: ReviewCard[], incoming: ReviewCard[]): ReviewCard[] {
  if (incoming.length === 0) return current;
  const known = new Set(current.map((c) => c.id));
  const fresh = incoming.filter((c) => !known.has(c.id));
  const room = Math.max(0, MAX_REVIEW_CARDS - current.length);
  return mergeCards(current, fresh.slice(0, room));
}

/**
 * Applies an optimistic update through a ref and writes it, rolling the ref
 * back if the write fails.
 *
 * The rollback is the point. A failed write never changes `data.review_cards`,
 * so the hook's resync (which only reacts to a new array identity) cannot
 * recover on its own. Without this, the ref keeps whatever value the failed
 * write installed: after a failed "clear all" it holds `[]` while the UI still
 * renders the full library, and the next grade computes from `[]` and persists
 * it — silently destroying every card and all review progress.
 *
 * Taking the ref as a parameter keeps this testable without a DOM.
 */
export async function commitCollection<T>(
  ref: { current: T },
  transform: (current: T) => T,
  write: (next: T) => Promise<void>
): Promise<T> {
  const previous = ref.current;
  const next = transform(previous);
  ref.current = next;
  try {
    await write(next);
  } catch (err) {
    ref.current = previous;
    throw err;
  }
  return next;
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
      await commitCollection(cardsRef, transform, (next) => updateData({ review_cards: next }));
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

  /**
   * Adds imported cards, keeping the progress of any card already in the
   * library. See `mergeImported` for the two rules this enforces.
   */
  const importCards = useCallback(
    async (incoming: ReviewCard[]): Promise<number> => {
      if (incoming.length === 0) return 0;
      await commit((current) => mergeImported(current, incoming));
      return cardsRef.current.length;
    },
    [commit]
  );

  const clearAll = useCallback(async (): Promise<void> => {
    await commit(() => []);
  }, [commit]);

  return {
    cards,
    summary,
    room: Math.max(0, MAX_REVIEW_CARDS - cardsRef.current.length),
    saveDeck,
    importCards,
    grade,
    startReview,
    clearAll,
    isUpdating,
    hasDeck: cards.length > 0,
  };
}