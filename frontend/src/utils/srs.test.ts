import { describe, it, expect } from 'vitest';
import {
  cardId,
  createCard,
  scheduleCard,
  isDue,
  dueCards,
  reviewCounts,
  memoryScore,
  masteryScore,
  mergeCards,
  sanitizeReviewCards,
  cardId as cid,
  hashString,
  START_EASE,
  MIN_EASE,
  MAX_EASE,
  MASTERY_INTERVAL_DAYS,
  MAX_INTERVAL_DAYS,
  REVIEW_SESSION_LIMIT,
  LEARNING_DELAY_MS,
  nextIntervalHint,
  type ReviewCard,
  type ReviewGrade,
} from './srs';
import type { QuizQuestion } from '../services/aiAdvisor';

const NOW = new Date(2026, 8, 2, 10, 0, 0);
const DAY = 86_400_000;

function q(text = 'What is 2 + 2?', correct = 0): QuizQuestion {
  return {
    question: text,
    options: ['4', '5', '3', '6'],
    correct,
    explanation: 'Basic addition.',
  };
}

function card(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return { ...createCard(q(), 'Math', 'Math:2026-09-02', NOW), ...overrides };
}

function daysFromNow(days: number): string {
  return new Date(NOW.getTime() + days * DAY).toISOString();
}

describe('cardId — stable identity', () => {
  it('is deterministic for the same subject and question', () => {
    expect(cardId('Math', 'What is 2 + 2?')).toBe(cardId('Math', 'What is 2 + 2?'));
  });

  it('ignores surrounding whitespace and casing', () => {
    expect(cid('Math', '  What is 2 + 2?  ')).toBe(cid('math', 'what is 2 + 2?'));
  });

  it('differs across subjects so decks never cross-contaminate', () => {
    expect(cardId('Math', 'Define entropy')).not.toBe(cardId('Physics', 'Define entropy'));
  });

  it('differs across different questions', () => {
    expect(cid('Math', 'Question A')).not.toBe(cid('Math', 'Question B'));
  });

  it('falls back to a generic bucket when subject is empty', () => {
    expect(cid('', 'Q1').startsWith('general:')).toBe(true);
  });

  it('produces a stable 32-bit hash string', () => {
    expect(hashString('hello')).toBe(hashString('hello'));
    expect(hashString('hello')).not.toBe(hashString('hellp'));
  });
});

describe('createCard', () => {
  it('starts at zero reps, zero interval, due immediately', () => {
    const c = card();
    expect(c.reps).toBe(0);
    expect(c.lapses).toBe(0);
    expect(c.interval_days).toBe(0);
    expect(c.ease).toBe(START_EASE);
    expect(isDue(c, NOW)).toBe(true);
  });

  it('copies options rather than aliasing the source array', () => {
    const source = q();
    const c = createCard(source, 'Math', 'd', NOW);
    source.options.push('7');
    expect(c.options).toHaveLength(4);
  });
});

describe('scheduleCard — grade 0 (Again)', () => {
  it('collapses the interval and schedules a short relearn delay', () => {
    const c = scheduleCard(card({ interval_days: 30 }), 0, NOW);
    expect(c.interval_days).toBe(0);
    expect(c.reps).toBe(1);
    expect(c.lapses).toBe(1);
    expect(new Date(c.due_at).getTime()).toBe(NOW.getTime() + LEARNING_DELAY_MS);
  });

  it('reduces ease but never below the floor', () => {
    const lowered = scheduleCard(card({ ease: 1.4 }), 0, NOW);
    expect(lowered.ease).toBe(MIN_EASE);
  });

  it('is not immediately due (learner gets a retry window)', () => {
    expect(isDue(scheduleCard(card(), 0, NOW), NOW)).toBe(false);
  });
});

describe('scheduleCard — grade 1 (Hard)', () => {
  it('grows the interval only slightly', () => {
    const c = scheduleCard(card({ interval_days: 10 }), 1, NOW);
    expect(c.interval_days).toBe(12);
  });

  it('gives a brand-new card a 1 day interval', () => {
    expect(scheduleCard(card(), 1, NOW).interval_days).toBe(1);
  });

  it('never shortens an interval', () => {
    const c = scheduleCard(card({ interval_days: 1 }), 1, NOW);
    expect(c.interval_days).toBe(1);
  });
});

describe('scheduleCard — grade 2 (Good)', () => {
  it('multiplies the interval by ease', () => {
    const c = scheduleCard(card({ interval_days: 10, ease: 2.5 }), 2, NOW);
    expect(c.interval_days).toBe(25);
  });

  it('graduates a new card to 1 day', () => {
    expect(scheduleCard(card(), 2, NOW).interval_days).toBe(1);
  });

  it('leaves ease unchanged', () => {
    const c = scheduleCard(card({ ease: 2.5 }), 2, NOW);
    expect(c.ease).toBe(2.5);
  });
});

describe('scheduleCard — grade 3 (Easy)', () => {
  it('applies the largest jump and rewards ease', () => {
    const c = scheduleCard(card({ interval_days: 10, ease: 2.5 }), 3, NOW);
    expect(c.interval_days).toBe(33);
    expect(c.ease).toBeCloseTo(2.65, 5);
  });

  it('graduates a new card straight to 3 days', () => {
    expect(scheduleCard(card(), 3, NOW).interval_days).toBe(3);
  });

  it('caps ease at the maximum', () => {
    expect(scheduleCard(card({ ease: MAX_EASE }), 3, NOW).ease).toBe(MAX_EASE);
  });
});

describe('scheduleCard — invariants', () => {
  it('always increments reps', () => {
    (['0', '1', '2', '3'] as const).forEach((_, i) => {
      expect(scheduleCard(card({ reps: 5 }), i as ReviewGrade, NOW).reps).toBe(6);
    });
  });

  it('never mutates the input card', () => {
    const original = card({ interval_days: 5, reps: 2, ease: 2.5 });
    const snapshot = { ...original };
    scheduleCard(original, 3, NOW);
    expect(original).toEqual(snapshot);
  });

  it('produces intervals that grow monotonically as recall improves', () => {
    const base = card({ interval_days: 4, ease: START_EASE });
    const hard = scheduleCard(base, 1, NOW).interval_days;
    const good = scheduleCard(base, 2, NOW).interval_days;
    const easy = scheduleCard(base, 3, NOW).interval_days;
    expect(hard).toBeLessThan(good);
    expect(good).toBeLessThan(easy);
  });

  it('keeps ease inside the valid band across many reviews', () => {
    let c = card();
    for (let i = 0; i < 50; i += 1) c = scheduleCard(c, 3, NOW);
    expect(c.ease).toBeLessThanOrEqual(MAX_EASE);
    for (let i = 0; i < 100; i += 1) c = scheduleCard(c, 0, NOW);
    expect(c.ease).toBeGreaterThanOrEqual(MIN_EASE);
  });

  it('caps the interval so extreme repetition cannot overflow Date', () => {
    let c = card();
    for (let i = 0; i < 200; i += 1) c = scheduleCard(c, 3, NOW);
    expect(c.interval_days).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    expect(Number.isNaN(new Date(c.due_at).getTime())).toBe(false);
  });

  it('keeps due_at consistent with the capped interval', () => {
    let c = card();
    for (let i = 0; i < 200; i += 1) c = scheduleCard(c, 3, NOW);
    const deltaDays =
      (new Date(c.due_at).getTime() - NOW.getTime()) / DAY;
    expect(Math.round(deltaDays)).toBe(c.interval_days);
  });

  it('survives an alternating worst-case review history', () => {
    let c = card();
    for (let i = 0; i < 300; i += 1) {
      c = scheduleCard(c, (i % 2 === 0 ? 3 : 0) as ReviewGrade, NOW);
      expect(Number.isNaN(new Date(c.due_at).getTime())).toBe(false);
      expect(c.interval_days).toBeGreaterThanOrEqual(0);
      expect(c.reps).toBe(i + 1);
    }
  });
});

describe('isDue', () => {
  it('treats brand-new cards as due right away', () => {
    expect(isDue(card(), NOW)).toBe(true);
  });

  it('is due exactly at the boundary', () => {
    const c = card({ reps: 1, due_at: NOW.toISOString(), interval_days: 1 });
    expect(isDue(c, NOW)).toBe(true);
  });

  it('is not due before its date', () => {
    const c = card({ reps: 1, due_at: daysFromNow(3) });
    expect(isDue(c, NOW)).toBe(false);
  });

  it('is due when overdue', () => {
    const c = card({ reps: 1, due_at: daysFromNow(-2) });
    expect(isDue(c, NOW)).toBe(true);
  });

  it('treats an unparseable date as due rather than hiding the card', () => {
    expect(isDue(card({ reps: 1, due_at: 'nonsense' }), NOW)).toBe(true);
  });
});

describe('dueCards', () => {
  const overdue = card({ id: 'a', reps: 1, due_at: daysFromNow(-5) });
  const today = card({ id: 'b', reps: 1, due_at: daysFromNow(-1) });
  const fresh = card({ id: 'c', reps: 1, due_at: daysFromNow(7) });
  const brandNew = card({ id: 'd', reps: 0 });

  it('returns only cards that are actually due', () => {
    expect(dueCards([overdue, today, fresh, brandNew], NOW).map((c) => c.id)).toEqual([
      'a',
      'b',
      'd',
    ]);
  });

  it('puts the most overdue card first', () => {
    expect(dueCards([today, overdue], NOW)[0].id).toBe('a');
  });

  it('caps the session size to keep reviews short', () => {
    const many = Array.from({ length: 60 }, (_, i) =>
      card({ id: `x${i}`, reps: 1, due_at: daysFromNow(-i) })
    );
    expect(dueCards(many, NOW)).toHaveLength(REVIEW_SESSION_LIMIT);
  });

  it('returns an empty array for no cards', () => {
    expect(dueCards([], NOW)).toEqual([]);
  });
});

describe('reviewCounts', () => {
  it('counts due, fresh, and total independently', () => {
    const cards = [
      card({ id: 'a', reps: 1, due_at: daysFromNow(-1) }),
      card({ id: 'b', reps: 0 }),
      card({ id: 'c', reps: 1, due_at: daysFromNow(9) }),
    ];
    expect(reviewCounts(cards, NOW)).toEqual({ due: 2, fresh: 1, total: 3 });
  });

  it('returns zeros for an empty collection', () => {
    expect(reviewCounts([], NOW)).toEqual({ due: 0, fresh: 0, total: 0 });
  });
});

describe('memoryScore', () => {
  it('is 0 with no cards at all', () => {
    expect(memoryScore([])).toBe(0);
  });

  it('is 0 for cards never reviewed', () => {
    expect(memoryScore([card(), card()])).toBe(0);
  });

  it('is 100 when every card is at or beyond the mastery interval', () => {
    const mastered = Array.from({ length: 4 }, () =>
      card({ reps: 5, interval_days: MASTERY_INTERVAL_DAYS })
    );
    expect(memoryScore(mastered)).toBe(100);
  });

  it('stays within 0-100 and always rounds to an integer', () => {
    const mixed = [
      card({ reps: 1, interval_days: 1 }),
      card({ reps: 3, interval_days: 9 }),
      card({ reps: 0 }),
    ];
    const score = memoryScore(mixed);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('rises as intervals lengthen', () => {
    const short = memoryScore([card({ reps: 1, interval_days: 1 })]);
    const long = memoryScore([card({ reps: 4, interval_days: 20 })]);
    expect(long).toBeGreaterThan(short);
  });

  it('agrees with per-card mastery', () => {
    const c = card({ reps: 2, interval_days: 10 });
    expect(masteryScore(c)).toBeCloseTo(Math.log2(11) / Math.log2(MASTERY_INTERVAL_DAYS + 1), 10);
  });
});

describe('mergeCards', () => {
  it('adds new cards without touching existing ones', () => {
    const a = card({ id: 'a', reps: 3, interval_days: 5 });
    const merged = mergeCards([a], [card({ id: 'b' })]);
    expect(merged).toHaveLength(2);
    expect(merged.find((c) => c.id === 'a')?.reps).toBe(3);
  });

  it('updates an existing card in place rather than duplicating it', () => {
    const existing = card({ id: 'a', reps: 1 });
    const graded = scheduleCard(existing, 2, NOW);
    const merged = mergeCards([existing], [graded]);
    expect(merged).toHaveLength(1);
    expect(merged[0].reps).toBe(2);
    expect(merged[0].interval_days).toBe(1);
  });

  it('keeps review progress when the same card is re-added', () => {
    let cards = [card({ id: 'a' })];
    cards = mergeCards(cards, [cards[0]]);
    expect(cards).toHaveLength(1);
    expect(cards[0].reps).toBe(0);
  });

  it('is idempotent for identical input', () => {
    const input = [card({ id: 'a' }), card({ id: 'b' })];
    expect(mergeCards(input, input)).toHaveLength(2);
  });

  it('ignores malformed entries', () => {
    const merged = mergeCards([card({ id: 'a' })], [
      { id: '' } as unknown as ReviewCard,
      null as unknown as ReviewCard,
      { id: 'ok', question: 'q', correct: 0, options: [] } as unknown as ReviewCard,
    ]);
    expect(merged.map((c) => c.id).sort()).toEqual(['a', 'ok']);
  });

  it('caps the collection and evicts the furthest-out cards', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      card({ id: `c${i}`, reps: 3, due_at: daysFromNow(i) })
    );
    const merged = mergeCards(many, [], 5);
    expect(merged).toHaveLength(5);
    expect(merged[0].id).toBe('c0');
  });

  it('does nothing when under the cap', () => {
    expect(mergeCards([card({ id: 'a' })], [], 10)).toHaveLength(1);
  });
});

describe('sanitizeReviewCards', () => {
  it('returns an empty array for non-array input', () => {
    expect(sanitizeReviewCards(undefined)).toEqual([]);
    expect(sanitizeReviewCards(null)).toEqual([]);
    expect(sanitizeReviewCards({ nope: true })).toEqual([]);
  });

  it('keeps well-formed cards', () => {
    const good = card({ id: 'a' });
    expect(sanitizeReviewCards([good])).toHaveLength(1);
  });

  it('drops entries missing required fields', () => {
    const result = sanitizeReviewCards([
      card({ id: 'a' }),
      { id: 'b' } as unknown as ReviewCard,
      { id: 'c', question: 'q' } as unknown as ReviewCard,
      { question: 'q', correct: 0, options: [] } as unknown as ReviewCard,
      'string' as unknown as ReviewCard,
      null,
    ]);
    expect(result.map((c) => c.id)).toEqual(['a']);
  });
});

describe('nextIntervalHint', () => {
  it('reports the 10-minute retry for Again', () => {
    const hints = nextIntervalHint(card(), NOW);
    expect(hints[0]).toEqual({ value: 10, unit: 'minutes' });
  });

  it('reports days once the card has left relearning', () => {
    const graded = card({ reps: 3, interval_days: 6, due_at: daysFromNow(0) });
    const hints = nextIntervalHint(graded, NOW);
    expect(hints[0].unit).toBe('minutes');
    for (const g of [1, 2, 3] as ReviewGrade[]) {
      expect(hints[g].unit).toBe('days');
      expect(hints[g].value).toBeGreaterThan(0);
    }
  });

  it('orders intervals Again < Hard < Good < Easy', () => {
    const graded = card({ reps: 4, interval_days: 10, due_at: daysFromNow(0) });
    const hints = nextIntervalHint(graded, NOW);
    expect(hints[1].value).toBeLessThan(hints[2].value);
    expect(hints[2].value).toBeLessThan(hints[3].value);
  });

  it('never exceeds the maximum interval', () => {
    const strong = card({ reps: 20, ease: 2.8, interval_days: 360, due_at: daysFromNow(0) });
    expect(nextIntervalHint(strong, NOW)[3].value).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('does not mutate the card it was given', () => {
    const original = card({ reps: 2, interval_days: 3, due_at: daysFromNow(0) });
    const before = JSON.stringify(original);
    nextIntervalHint(original, NOW);
    expect(JSON.stringify(original)).toBe(before);
  });
});