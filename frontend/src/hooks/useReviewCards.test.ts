import { describe, it, expect } from 'vitest';
import { deckFromQuiz, applyGrade, summarize, mergeImported, commitCollection } from './useReviewCards';
import { scheduleCard, cardId, REVIEW_SESSION_LIMIT, createRecallCard, MAX_REVIEW_CARDS } from '../utils/srs';
import type { ReviewCard } from '../utils/srs';
import type { QuizQuestion } from '../services/aiAdvisor';

const NOW = new Date(2026, 8, 2, 10, 0, 0);
const DAY = '2026-09-02';

function q(text: string, correct = 0): QuizQuestion {
  return {
    question: text,
    options: ['4', '5', '3', '6'],
    correct,
    explanation: 'Basic addition.',
  };
}

function deck(existing: ReviewCard[] = []) {
  return deckFromQuiz(existing, [q('What is 2 + 2?'), q('What is 3 + 3?')], 'Math', DAY, NOW);
}

describe('deckFromQuiz', () => {
  it('creates one card per question', () => {
    expect(deck()).toHaveLength(2);
  });

  it('stamps every card with the same deck id', () => {
    const cards = deck();
    expect(cards[0].deck_id).toBe('math:2026-09-02');
    expect(cards[1].deck_id).toBe(cards[0].deck_id);
  });

  it('records the subject on each card', () => {
    expect(deck()[0].subject).toBe('Math');
  });

  it('marks new cards as due immediately', () => {
    expect(deck().every((c) => c.reps === 0 && c.interval_days === 0)).toBe(true);
  });

  it('returns an empty collection when there are no questions', () => {
    expect(deckFromQuiz([], [], 'Math', DAY, NOW)).toEqual([]);
  });

  it('returns the existing collection untouched for no questions', () => {
    const existing = deck();
    expect(deckFromQuiz(existing, [], 'Math', DAY, NOW)).toEqual(existing);
  });

  it('adds to an existing collection rather than replacing it', () => {
    const existing = deckFromQuiz([], [q('Older question')], 'Math', DAY, NOW);
    const merged = deckFromQuiz(existing, [q('Newer question')], 'Math', DAY, NOW);
    expect(merged).toHaveLength(2);
  });

  it('treats the same question on a different day as the same card', () => {
    const a = deckFromQuiz([], [q('Q1')], 'Math', DAY, NOW);
    const b = deckFromQuiz(a, [q('Q1')], 'Math', '2026-09-03', NOW);
    expect(b).toHaveLength(1);
    expect(b[0].deck_id).toBe(a[0].deck_id);
  });

  it('separates the same question under different subjects', () => {
    const a = deckFromQuiz([], [q('Q1')], 'Math', DAY, NOW);
    const b = deckFromQuiz(a, [q('Q1')], 'Physics', DAY, NOW);
    expect(b).toHaveLength(2);
    expect(b[0].id).not.toBe(b[1].id);
  });

  it('does not duplicate a question already in the deck', () => {
    const first = deck();
    const second = deck(first);
    expect(second).toHaveLength(2);
  });

  it('preserves review progress when the same notes are re-quizzed', () => {
    let cards = deck();
    cards = applyGrade(cards, cards[0].id, 2, NOW);
    expect(cards[0].reps).toBe(1);

    const reStudied = deckFromQuiz(cards, [q('What is 2 + 2?')], 'Math', DAY, NOW);
    const sameCard = reStudied.find((c) => c.id === cards[0].id);
    expect(sameCard?.reps).toBe(1);
  });

  it('does not reset an advanced card when regenerating a quiz', () => {
    let cards = deck();
    for (let i = 0; i < 4; i += 1) {
      cards = applyGrade(cards, cards[0].id, 3, NOW);
    }
    const advanced = cards[0].reps;
    expect(advanced).toBe(4);

    const reStudied = deckFromQuiz(cards, [q('What is 2 + 2?')], 'Math', DAY, NOW);
    expect(reStudied.find((c) => c.id === cards[0].id)?.reps).toBe(advanced);
  });

  it('does not mutate the existing collection', () => {
    const existing = deck();
    const snapshot = JSON.parse(JSON.stringify(existing));
    deckFromQuiz(existing, [q('Different question')], 'Math', DAY, NOW);
    expect(existing).toEqual(snapshot);
  });

  it('gives distinct ids to distinct questions', () => {
    const cards = deck();
    expect(cards[0].id).not.toBe(cards[1].id);
  });

  it('derives ids the same way the scheduler does', () => {
    expect(deck()[0].id).toBe(cardId('Math', 'What is 2 + 2?'));
  });
});

describe('applyGrade', () => {
  it('schedules the targeted card', () => {
    const cards = deck();
    const graded = applyGrade(cards, cards[0].id, 2, NOW);
    expect(graded[0].reps).toBe(1);
    expect(graded[0].interval_days).toBe(1);
  });

  it('leaves the other cards alone', () => {
    const cards = deck();
    const graded = applyGrade(cards, cards[0].id, 3, NOW);
    expect(graded[1].reps).toBe(0);
  });

  it('ignores an unknown card id', () => {
    const cards = deck();
    expect(applyGrade(cards, 'does-not-exist', 2, NOW)).toEqual(cards);
  });

  it('does not mutate the input', () => {
    const cards = deck();
    const snapshot = JSON.parse(JSON.stringify(cards));
    applyGrade(cards, cards[0].id, 3, NOW);
    expect(cards).toEqual(snapshot);
  });

  it('matches scheduling the card directly', () => {
    const cards = deck();
    const viaHook = applyGrade(cards, cards[0].id, 3, NOW)[0];
    const direct = scheduleCard(cards[0], 3, NOW);
    expect(viaHook).toEqual(direct);
  });

  it('accumulates intervals across repeated grades', () => {
    let cards = deck();
    const id = cards[0].id;
    for (let i = 0; i < 3; i += 1) cards = applyGrade(cards, id, 2, NOW);
    const target = cards.find((c) => c.id === id);
    expect(target?.reps).toBe(3);
    expect(target?.interval_days).toBeGreaterThan(1);
  });

  it('handles an empty collection', () => {
    expect(applyGrade([], 'nope', 2, NOW)).toEqual([]);
  });
});

describe('summarize', () => {
  it('reports zeroed totals for an empty collection', () => {
    expect(summarize([], NOW)).toEqual({ due: 0, fresh: 0, total: 0, memory: 0 });
  });

  it('counts a fresh deck as all due', () => {
    const s = summarize(deck(), NOW);
    expect(s).toMatchObject({ due: 2, fresh: 2, total: 2, memory: 0 });
  });

  it('drops a graded card out of the due count until it is due again', () => {
    let cards = deck();
    cards = applyGrade(cards, cards[0].id, 2, NOW);
    const s = summarize(cards, NOW);
    expect(s.due).toBe(1);
    expect(s.fresh).toBe(1);
  });

  it('raises the memory score as cards are graded', () => {
    let cards = deck();
    expect(summarize(cards, NOW).memory).toBe(0);
    cards = applyGrade(cards, cards[0].id, 3, NOW);
    expect(summarize(cards, NOW).memory).toBeGreaterThan(0);
  });

  it('keeps memory within 0-100', () => {
    let cards = deck();
    for (const c of [...cards]) {
      for (let i = 0; i < 8; i += 1) cards = applyGrade(cards, c.id, 3, NOW);
    }
    const { memory } = summarize(cards, NOW);
    expect(memory).toBeGreaterThanOrEqual(0);
    expect(memory).toBeLessThanOrEqual(100);
  });

  it('returns a due count bounded by the total', () => {
    let cards = deck();
    for (const c of [...cards]) cards = applyGrade(cards, c.id, 2, NOW);
    const s = summarize(cards, NOW);
    expect(s.due).toBeLessThanOrEqual(s.total);
  });

  it('keeps a session bounded by the review limit', () => {
    const many: ReviewCard[] = Array.from({ length: 50 }, (_, i) => ({
      ...deck()[0],
      id: `bulk-${i}`,
    }));
    expect(summarize(many, NOW).due).toBeGreaterThan(REVIEW_SESSION_LIMIT);
  });
});

describe('mergeImported', () => {
  function recall(front: string, subject = 'Kurdish'): ReviewCard {
    return createRecallCard(front, `english-${front}`, subject, DAY, NOW);
  }

  it('adds cards that are not in the library yet', () => {
    const current = [recall('one')];
    const next = mergeImported(current, [recall('two'), recall('three')]);
    expect(next).toHaveLength(3);
  });

  it('keeps the progress of a card it already has', () => {
    let current = [recall('one'), recall('two')];
    current = applyGrade(current, cardId('Kurdish', 'one'), 3, NOW);
    const studied = current.find((c) => c.question === 'one')!;
    expect(studied.reps).toBe(1);

    const next = mergeImported(current, [recall('one')]);
    expect(next).toHaveLength(2);
    expect(next.find((c) => c.question === 'one')).toEqual(studied);
  });

  it('does not reset the due date of a re-imported card', () => {
    let current = [recall('one')];
    current = applyGrade(current, cardId('Kurdish', 'one'), 3, NOW);
    const before = current.find((c) => c.question === 'one')!.due_at;
    const next = mergeImported(current, [recall('one')]);
    expect(next.find((c) => c.question === 'one')!.due_at).toBe(before);
  });

  it('is a no-op when nothing new is in the file', () => {
    const current = [recall('one')];
    expect(mergeImported(current, [recall('one')])).toHaveLength(1);
  });

  it('returns the library untouched for an empty import', () => {
    const current = [recall('one')];
    expect(mergeImported(current, [])).toBe(current);
  });

  it('never exceeds the cap', () => {
    const current = Array.from({ length: MAX_REVIEW_CARDS - 2 }, (_, i) => recall(`c${i}`));
    const next = mergeImported(current, Array.from({ length: 40 }, (_, i) => recall(`n${i}`)));
    expect(next).toHaveLength(MAX_REVIEW_CARDS);
  });

  it('keeps the studied cards rather than evicting them for fresh ones', () => {
    const base = Array.from({ length: MAX_REVIEW_CARDS - 2 }, (_, i) => recall(`c${i}`));
    const studied = applyGrade(base, base[0].id, 3, NOW);
    const next = mergeImported(studied, [recall('brand-new-1'), recall('brand-new-2')]);
    expect(next).toHaveLength(MAX_REVIEW_CARDS);
    expect(next.some((c) => c.id === studied[0].id)).toBe(true);
    expect(next.filter((c) => c.reps > 0)).toHaveLength(1);
  });

  it('adds nothing when the library is already full', () => {
    const current = Array.from({ length: MAX_REVIEW_CARDS }, (_, i) => recall(`c${i}`));
    expect(mergeImported(current, [recall('new')])).toHaveLength(MAX_REVIEW_CARDS);
  });

  it('deduplicates repeats inside a single file', () => {
    const next = mergeImported([], [recall('one'), recall('one'), recall('two')]);
    expect(next).toHaveLength(2);
  });
});
describe('commitCollection - a failed write must not poison the next one', () => {
  const library = () => deck();

  it('advances the ref optimistically so back-to-back writes compose', async () => {
    const ref = { current: library() };
    const writes: ReviewCard[][] = [];
    const write = async (next: ReviewCard[]) => { writes.push(next); };

    await commitCollection(ref, (c) => applyGrade(c, c[0].id, 2, NOW), write);
    await commitCollection(ref, (c) => applyGrade(c, c[1].id, 2, NOW), write);

    // The second write must see the first write's grade, not the original deck.
    expect(writes[1].find((c) => c.id === ref.current[0].id)?.reps).toBe(1);
    expect(ref.current.every((c) => c.reps === 1)).toBe(true);
  });

  it('restores the previous collection when the write rejects', async () => {
    const before = library();
    const ref = { current: before };
    const boom = async () => { throw new Error('offline'); };

    await expect(commitCollection(ref, () => [], boom)).rejects.toThrow('offline');
    expect(ref.current).toEqual(before);
  });

  it('propagates the failure so the caller can surface it', async () => {
    const ref = { current: library() };
    await expect(
      commitCollection(ref, () => [], async () => { throw new Error('quota exceeded'); })
    ).rejects.toThrow('quota exceeded');
  });

  it('does not let a failed clear wipe the library on the next grade', async () => {
    // The exact chain: "clear all" fails, then the student grades a card.
    const stored = library();
    const ref = { current: stored };
    const failNext = { armed: true };
    const write = async (next: ReviewCard[]) => {
      if (failNext.armed) {
        failNext.armed = false;
        throw new Error('offline');
      }
      stored.splice(0, stored.length, ...next);
    };

    // 1. clear all — fails.
    await expect(commitCollection(ref, () => [], write)).rejects.toThrow('offline');
    // 2. the library must still be intact in the ref, not silently empty.
    expect(ref.current).toHaveLength(2);

    // 3. grading any card must grade the real library, not an empty one.
    await commitCollection(ref, (c) => applyGrade(c, c[0].id, 3, NOW), write);

    expect(stored).toHaveLength(2);
    expect(stored[0].reps).toBe(1);
    expect(stored.every((c) => c.id === library()[0].id || c.id === library()[1].id)).toBe(true);
  });

  it('leaves the ref untouched when the transform itself throws', async () => {
    const before = library();
    const ref = { current: before };
    await expect(
      commitCollection(ref, () => { throw new Error('bad transform'); }, async () => {})
    ).rejects.toThrow('bad transform');
    expect(ref.current).toBe(before);
  });
});
