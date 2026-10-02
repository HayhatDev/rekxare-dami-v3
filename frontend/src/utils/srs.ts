import type { QuizQuestion } from '../services/aiAdvisor';

export type ReviewGrade = 0 | 1 | 2 | 3;

export interface ReviewCard {
  id: string;
  deck_id: string;
  subject: string;
  question: string;
  /** Empty for recall cards, which show a single free-text answer instead. */
  options: string[];
  correct: number;
  explanation: string;
  /** Back-of-card text for recall cards. Absent on multiple-choice cards. */
  answer?: string;
  ease: number;
  interval_days: number;
  due_at: string;
  reps: number;
  lapses: number;
  created_at: string;
}

/**
 * Anki, Quizlet and most CSV decks are two-sided: a front and a back, with no
 * distractors. Those cannot be expressed as multiple choice without inventing
 * wrong answers, so recall cards carry no options and reveal one answer text.
 */
export function isRecallCard(card: ReviewCard): boolean {
  return !Array.isArray(card.options) || card.options.length === 0;
}

export const MIN_EASE = 1.3;
export const MAX_EASE = 2.8;
export const START_EASE = 2.5;
export const LEARNING_DELAY_MS = 10 * 60 * 1000;
export const MASTERY_INTERVAL_DAYS = 21;
export const MAX_REVIEW_CARDS = 300;
export const REVIEW_SESSION_LIMIT = 20;
export const MAX_INTERVAL_DAYS = 365;

const DAY_MS = 86_400_000;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export function hashString(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export function cardId(subject: string, question: string): string {
  return `${bucket(subject)}:${hashString(question.trim().toLowerCase())}`;
}

export function deckId(subject: string, day: string): string {
  return `${bucket(subject)}:${day}`;
}

function bucket(subject: string): string {
  return (subject || 'general').trim().toLowerCase() || 'general';
}

export function createCard(
  question: QuizQuestion,
  subject: string,
  deck: string,
  now: Date = new Date()
): ReviewCard {
  return {
    id: cardId(subject, question.question),
    deck_id: deck,
    subject,
    question: question.question,
    options: [...question.options],
    correct: question.correct,
    explanation: question.explanation,
    ease: START_EASE,
    interval_days: 0,
    due_at: now.toISOString(),
    reps: 0,
    lapses: 0,
    created_at: now.toISOString(),
  };
}

export function createRecallCard(
  front: string,
  back: string,
  subject: string,
  deck: string,
  now: Date = new Date()
): ReviewCard {
  return {
    id: cardId(subject, front),
    deck_id: deck,
    subject,
    question: front,
    options: [],
    correct: 0,
    explanation: '',
    answer: back,
    ease: START_EASE,
    interval_days: 0,
    due_at: now.toISOString(),
    reps: 0,
    lapses: 0,
    created_at: now.toISOString(),
  };
}

export function scheduleCard(
  card: ReviewCard,
  grade: ReviewGrade,
  now: Date = new Date()
): ReviewCard {
  let ease = card.ease;
  let interval = card.interval_days;
  let lapses = card.lapses;

  switch (grade) {
    case 0:
      interval = 0;
      lapses += 1;
      break;
    case 1:
      interval = interval <= 0 ? 1 : Math.round(interval * 1.2);
      break;
    case 2:
      interval = interval <= 0 ? 1 : Math.round(interval * ease);
      break;
    default:
      interval = interval <= 0 ? 3 : Math.round(interval * ease * 1.3);
      break;
  }

  if (grade === 0) ease -= 0.2;
  else if (grade === 1) ease -= 0.15;
  else if (grade === 3) ease += 0.15;

  ease = clamp(Number(ease.toFixed(4)), MIN_EASE, MAX_EASE);
  interval = clamp(interval, 0, MAX_INTERVAL_DAYS);

  const delay = grade === 0 ? LEARNING_DELAY_MS : interval * DAY_MS;

  return {
    ...card,
    ease,
    interval_days: interval,
    lapses,
    due_at: new Date(now.getTime() + delay).toISOString(),
    reps: card.reps + 1,
  };
}

export interface IntervalHint {
  value: number;
  unit: 'minutes' | 'days';
}

/**
 * What each grade would schedule, without mutating the card. The units are
 * returned unformatted so the UI can render them in the active language.
 */
export function nextIntervalHint(
  card: ReviewCard,
  now: Date = new Date()
): Record<ReviewGrade, IntervalHint> {
  const projected: Record<ReviewGrade, ReviewCard> = {
    0: scheduleCard(card, 0, now),
    1: scheduleCard(card, 1, now),
    2: scheduleCard(card, 2, now),
    3: scheduleCard(card, 3, now),
  };
  const toHint = (c: ReviewCard): IntervalHint =>
    c.interval_days === 0
      ? { value: Math.round(LEARNING_DELAY_MS / 60_000), unit: 'minutes' }
      : { value: c.interval_days, unit: 'days' };
  return {
    0: toHint(projected[0]),
    1: toHint(projected[1]),
    2: toHint(projected[2]),
    3: toHint(projected[3]),
  };
}

export function isDue(card: ReviewCard, now: Date = new Date()): boolean {
  if (card.reps === 0) return true;
  const due = new Date(card.due_at).getTime();
  if (Number.isNaN(due)) return true;
  return due <= now.getTime();
}

export function dueCards(
  cards: ReviewCard[],
  now: Date = new Date(),
  limit: number = REVIEW_SESSION_LIMIT
): ReviewCard[] {
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, limit);
}

export function reviewCounts(
  cards: ReviewCard[],
  now: Date = new Date()
): { due: number; fresh: number; total: number } {
  let due = 0;
  let fresh = 0;
  for (const card of cards) {
    if (card.reps === 0) fresh += 1;
    if (isDue(card, now)) due += 1;
  }
  return { due, fresh, total: cards.length };
}

export function masteryScore(card: ReviewCard): number {
  if (card.reps === 0 || card.interval_days <= 0) return 0;
  return clamp(
    Math.log2(card.interval_days + 1) / Math.log2(MASTERY_INTERVAL_DAYS + 1),
    0,
    1
  );
}

export function memoryScore(cards: ReviewCard[]): number {
  if (cards.length === 0) return 0;
  const sum = cards.reduce((acc, c) => acc + masteryScore(c), 0);
  return Math.round((sum / cards.length) * 100);
}

export function mergeCards(
  existing: ReviewCard[],
  incoming: ReviewCard[],
  limit: number = MAX_REVIEW_CARDS
): ReviewCard[] {
  const byId = new Map<string, ReviewCard>();
  for (const card of existing) {
    if (card?.id) byId.set(card.id, card);
  }
  for (const card of incoming) {
    if (!card?.id) continue;
    const prev = byId.get(card.id);
    byId.set(card.id, prev ? { ...prev, ...card } : card);
  }
  const all = [...byId.values()];
  if (all.length <= limit) return all;
  return all
    .sort((a, b) => {
      const dueDiff = new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      return dueDiff !== 0 ? dueDiff : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    })
    .slice(0, limit);
}

export function isReviewCard(value: unknown): value is ReviewCard {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<ReviewCard>;
  if (typeof c.id !== 'string' || c.id.length === 0) return false;
  if (typeof c.question !== 'string') return false;
  // Multiple choice needs a real option list; recall cards instead need the
  // answer text they reveal.
  if (Array.isArray(c.options) && c.options.length > 0) {
    return typeof c.correct === 'number' && c.correct >= 0 && c.correct < c.options.length;
  }
  return typeof c.answer === 'string' && c.answer.trim().length > 0;
}

export function sanitizeReviewCards(value: unknown): ReviewCard[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isReviewCard);
}