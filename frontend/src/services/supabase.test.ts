import { describe, it, expect, beforeEach } from 'vitest';
import { guestKeysToClear, mergeStudyData, mergeReviewCards, userKey, guestCacheOwnedBy } from './supabase';
import { GuestDeletionState } from './supabase';
import { StudyData, ReviewCard } from '../types';
import { createCard } from '../utils/srs';
import type { QuizQuestion } from './aiAdvisor';

function study(overrides: Partial<StudyData> = {}): StudyData {
  return {
    total_seconds: 0,
    sessions: 0,
    last_subject: '',
    streak: 0,
    last_study_date: null,
    daily_seconds: 0,
    daily_goal_seconds: 7200,
    xp_points: 0,
    xp_level: 1,
    student_name: '',
    session_log: [],
    review_cards: [],
    ...overrides,
  };
}

const quizQuestion: QuizQuestion = {
  question: 'What is 2 + 2?',
  options: ['4', '5', '3', '6'],
  correct: 0,
  explanation: 'Basic addition.',
};

function card(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return { ...createCard(quizQuestion, 'Math', 'Math:2026-09-02'), ...overrides };
}

const session = (id: string, startedAt: string) => ({
  id,
  started_at: startedAt,
  day: startedAt.slice(0, 10),
  subject: 'Math',
  planned_minutes: 30,
  focus_seconds: 1800,
  completed: true,
});

function state(overrides: Partial<GuestDeletionState> = {}): GuestDeletionState {
  return {
    hasStudyData: true,
    studyServerHasData: false,
    studyUpsertOk: false,
    hasSchedule: true,
    scheduleServerHasData: false,
    schedulePostOk: false,
    ...overrides,
  };
}

describe('guestKeysToClear — regression: never wipe local data whose server write failed', () => {
  it('keeps both keys when both writes failed', () => {
    const r = guestKeysToClear(state());
    expect(r.study).toBe(false);
    expect(r.schedule).toBe(false);
  });

  it('keeps schedule key when the schedule POST failed, but clears study data on upsert success', () => {
    const r = guestKeysToClear(state({ studyUpsertOk: true, schedulePostOk: false }));
    expect(r.study).toBe(true);
    expect(r.schedule).toBe(false);
  });

  it('keeps study key when the upsert failed, but clears schedule on POST success', () => {
    const r = guestKeysToClear(state({ studyUpsertOk: false, schedulePostOk: true }));
    expect(r.study).toBe(false);
    expect(r.schedule).toBe(true);
  });

  it('clears both when both writes succeeded', () => {
    const r = guestKeysToClear(state({ studyUpsertOk: true, schedulePostOk: true }));
    expect(r.study).toBe(true);
    expect(r.schedule).toBe(true);
  });

  it('clears study key when there was no guest study data to migrate', () => {
    const r = guestKeysToClear(state({ hasStudyData: false }));
    expect(r.study).toBe(true);
    expect(r.schedule).toBe(false);
  });

  it('clears study key when the server already has newer study data', () => {
    const r = guestKeysToClear(state({ studyServerHasData: true }));
    expect(r.study).toBe(true);
    expect(r.schedule).toBe(false);
  });

  it('clears schedule key when there was no guest schedule to migrate', () => {
    const r = guestKeysToClear(state({ hasSchedule: false }));
    expect(r.schedule).toBe(true);
    expect(r.study).toBe(false);
  });

  it('clears schedule key when the server already has a schedule', () => {
    const r = guestKeysToClear(state({ scheduleServerHasData: true }));
    expect(r.schedule).toBe(true);
    expect(r.study).toBe(false);
  });
});

describe('mergeStudyData — cross-device merge never loses session history', () => {
  it('unions session_log by id, deduping identical overlap', () => {
    const a = study({ session_log: [session('s1', '2026-09-10T10:00:00Z')] });
    const b = study({
      session_log: [
        session('s1', '2026-09-10T10:00:00Z'),
        session('s2', '2026-09-11T10:00:00Z'),
      ],
    });
    const r = mergeStudyData(a, b);
    expect(r.session_log.map((s) => s.id).sort()).toEqual(['s1', 's2']);
    expect(r.session_log).toHaveLength(2);
  });

  it('takes the max of totals, counters, streak and xp', () => {
    const r = mergeStudyData(
      study({ total_seconds: 7200, sessions: 4, streak: 3, xp_points: 50, xp_level: 2 }),
      study({ total_seconds: 3600, sessions: 6, streak: 1, xp_points: 80 }),
    );
    expect(r.total_seconds).toBe(7200);
    expect(r.sessions).toBe(6);
    expect(r.streak).toBe(3);
    expect(r.xp_points).toBe(80);
    expect(r.xp_level).toBe(2);
  });

  it('prefers the most recent last_study_date and keeps goal fallback', () => {
    const r = mergeStudyData(
      study({ last_study_date: '2026-09-01', daily_goal_seconds: 0 }),
      study({ last_study_date: '2026-09-10', daily_goal_seconds: 5400 }),
    );
    expect(r.last_study_date).toBe('2026-09-10');
    expect(r.daily_goal_seconds).toBe(5400);
  });

  it('keeps an existing last_subject over an unknown one', () => {
    const r = mergeStudyData(study({ last_subject: '' }), study({ last_subject: 'Physics' }));
    expect(r.last_subject).toBe('Physics');
  });
});

describe('local cache scoping — accounts never read each other on the same browser', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses distinct keys for two different authenticated users', () => {
    expect(userKey('study_data', 'user-A')).not.toBe(userKey('study_data', 'user-B'));
    expect(userKey('schedule', 'user-A')).not.toBe(userKey('schedule', 'user-B'));
  });

  it('uses the guest key when no authenticated user is present', () => {
    expect(userKey('study_data', null)).toBe(userKey('study_data', ''));
    // guest keys are stable per browser; user keys are per-account
    expect(userKey('study_data', 'user-A')).not.toBe(userKey('study_data', null));
  });

  it('unsigns an on-device cache written by a different account', () => {
    // Simulate the migration guard: a guest stamp belongs to the current user,
    // but a cache lingering on a browser that has seen other accounts does not.
    localStorage.setItem('rekxare_guest_owner_study_data', 'guest');
    expect(guestCacheOwnedBy('user-A', 'study_data')).toBe(true);
  });

  it('does not migrate a legacy cache once a second account exists on the browser', () => {
    localStorage.setItem('rekxare_known_accounts', 'user-A,user-B');
    localStorage.removeItem('rekxare_guest_owner_study_data');
    expect(guestCacheOwnedBy('user-B', 'study_data')).toBe(false);
    expect(guestCacheOwnedBy('user-A', 'study_data')).toBe(false);
  });

  it('migrates a legacy cache when only one account has ever been seen', () => {
    localStorage.setItem('rekxare_known_accounts', 'user-A');
    localStorage.removeItem('rekxare_guest_owner_study_data');
    expect(guestCacheOwnedBy('user-A', 'study_data')).toBe(true);
  });
});

describe('mergeReviewCards — review history is additive, never rolled back', () => {
  it('unions cards from both devices', () => {
    const other = createCard({ ...quizQuestion, question: 'Define entropy' }, 'Math', 'Math:2026-09-02');
    const merged = mergeReviewCards([card()], [other]);
    expect(merged).toHaveLength(2);
  });

  it('treats a card as the same card even if its text is re-saved', () => {
    const merged = mergeReviewCards([card()], [card({ explanation: 'edited' })]);
    expect(merged).toHaveLength(1);
  });

  it('keeps the more-advanced copy when one device has reviewed further', () => {
    const stale = card({ reps: 1, interval_days: 1 });
    const advanced = card({ reps: 5, interval_days: 20 });
    const merged = mergeReviewCards([advanced], [stale]);
    expect(merged).toHaveLength(1);
    expect(merged[0].reps).toBe(5);
    expect(merged[0].interval_days).toBe(20);
  });

  it('is order-independent at equal rep counts', () => {
    const a = card({ reps: 2, due_at: '2026-09-01T00:00:00.000Z' });
    const b = card({ reps: 2, due_at: '2026-09-20T00:00:00.000Z' });
    expect(mergeReviewCards([a], [b])[0].due_at).toBe(a.due_at);
    expect(mergeReviewCards([b], [a])[0].due_at).toBe(a.due_at);
  });

  it('does not resurrect a card to zero reps from a stale device', () => {
    const graded = card({ reps: 3, interval_days: 6, lapses: 1 });
    const stale = card({ reps: 0, interval_days: 0, lapses: 0 });
    expect(mergeReviewCards([graded], [stale])[0].reps).toBe(3);
  });

  it('drops malformed entries instead of merging them', () => {
    const merged = mergeReviewCards([card()], [
      { id: '' } as ReviewCard,
      null as unknown as ReviewCard,
    ]);
    expect(merged).toHaveLength(1);
  });

  it('tolerates undefined collections from older payloads', () => {
    expect(mergeReviewCards(undefined, undefined)).toEqual([]);
    expect(mergeReviewCards(undefined, [card()])).toHaveLength(1);
  });

  it('survives repeated merges without growing', () => {
    let cards = [card()];
    for (let i = 0; i < 5; i += 1) cards = mergeReviewCards(cards, cards);
    expect(cards).toHaveLength(1);
  });
});

describe('mergeStudyData — review decks survive a cross-device read', () => {
  it('preserves review_cards through the merge', () => {
    const merged = mergeStudyData(study({ review_cards: [card()] }), study());
    expect(merged.review_cards).toHaveLength(1);
  });

  it('defaults to an empty collection when neither side has cards', () => {
    expect(mergeStudyData(study(), study()).review_cards).toEqual([]);
  });

  it('unions decks recorded on two different devices', () => {
    const merged = mergeStudyData(
      study({ review_cards: [card({ id: 'a', question: 'Q-A' })] }),
      study({ review_cards: [card({ id: 'b', question: 'Q-B' })] })
    );
    expect(merged.review_cards.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });
});
