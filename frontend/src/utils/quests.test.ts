import { describe, it, expect } from 'vitest';
import {
  QUESTS,
  allQuestsComplete,
  evaluateQuests,
  newlyCompletedQuests,
  nextQuestState,
  questProgress,
  questXpTotal,
  questsCompleteCount,
} from './quests';
import { dayKey } from './sessionLog';
import type { StudyData, SessionRecord } from '../types';

const TODAY = '2026-09-10';
const YESTERDAY = '2026-09-09';

function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: over.id || 'x',
    started_at: `${TODAY}T10:00:00.000Z`,
    day: TODAY,
    subject: 'Math',
    planned_minutes: 30,
    focus_seconds: 1800,
    completed: true,
    ...over,
  };
}

function data(session_log: SessionRecord[] = []): StudyData {
  return {
    total_seconds: 0,
    sessions: session_log.length,
    last_subject: 'Math',
    streak: 0,
    last_study_date: null,
    daily_seconds: 0,
    daily_goal_seconds: 7200,
    xp_points: 0,
    xp_level: 1,
    student_name: 'T',
    session_log,
    review_cards: [],
  };
}

describe('questProgress — all three quests derive from the session log', () => {
  it('is all zero on an empty log', () => {
    expect(questProgress(data(), TODAY)).toEqual({ focus: 0, sessions: 0, variety: 0 });
  });

  it('sums focus minutes from completed sessions on the given day', () => {
    const d = data([session({ focus_seconds: 600 }), session({ focus_seconds: 900 })]);
    expect(questProgress(d, TODAY).focus).toBe(25); // 25 minutes
  });

  it('counts sessions on the given day', () => {
    expect(questProgress(data([session(), session()]), TODAY).sessions).toBe(2);
  });

  it('counts distinct subjects, not session count', () => {
    const d = data([
      session({ subject: 'Math' }),
      session({ subject: 'Math' }),
      session({ subject: 'Physics' }),
    ]);
    expect(questProgress(d, TODAY).variety).toBe(2);
  });

  it('ignores sessions from other days', () => {
    const d = data([
      session({ day: YESTERDAY }),
      session({ day: YESTERDAY }),
      session({ day: '2026-09-01' }),
    ]);
    expect(questProgress(d, TODAY)).toEqual({ focus: 0, sessions: 0, variety: 0 });
  });

  it('ignores abandoned sessions — an unfinished session earns nothing', () => {
    const d = data([session({ completed: false }), session({ completed: false })]);
    expect(questProgress(d, TODAY).sessions).toBe(0);
    expect(questProgress(d, TODAY).focus).toBe(0);
  });

  it('ignores blank subjects rather than counting them as variety', () => {
    const d = data([session({ subject: '' }), session({ subject: '   ' })]);
    expect(questProgress(d, TODAY).variety).toBe(0);
  });

  it('survives a missing session_log', () => {
    const d = data();
    delete (d as Partial<StudyData>).session_log;
    expect(questProgress(d, TODAY).sessions).toBe(0);
  });
});

describe('evaluateQuests — progress is clamped and claims are day-scoped', () => {
  it('marks nothing complete on an empty day', () => {
    const s = evaluateQuests(data(), TODAY);
    expect(s.every((q) => !q.complete)).toBe(true);
    expect(questsCompleteCount(s)).toBe(0);
  });

  it('never reports progress above the target', () => {
    const d = data(Array.from({ length: 10 }, () => session({ focus_seconds: 3600 })));
    const focus = evaluateQuests(d, TODAY).find((q) => q.id === 'focus');
    expect(focus?.progress).toBe(focus?.target);
  });

  it('marks a quest complete once its target is reached', () => {
    const d = data([session({ focus_seconds: 1500 })]);
    expect(evaluateQuests(d, TODAY).find((q) => q.id === 'focus')?.complete).toBe(true);
  });

  it('reports a quest as claimed when today paid out already', () => {
    const d = data([session({ focus_seconds: 1500 })]);
    const s = evaluateQuests(d, TODAY, { day: TODAY, claimed: ['focus'] });
    expect(s.find((q) => q.id === 'focus')?.claimed).toBe(true);
  });

  it('ignores claims belonging to a previous day', () => {
    // Yesterday's payout must not suppress today's, or quests could never be
    // earned again after the first day.
    const d = data([session({ focus_seconds: 1500 })]);
    const s = evaluateQuests(d, TODAY, { day: YESTERDAY, claimed: ['focus'] });
    expect(s.find((q) => q.id === 'focus')?.claimed).toBe(false);
    expect(s.find((q) => q.id === 'focus')?.complete).toBe(true);
  });

  it('reports allQuestsComplete only when every quest is done', () => {
    const partial = data([session({ focus_seconds: 1500 })]);
    const all = data([
      session({ focus_seconds: 1500 }),
      session({ focus_seconds: 60 }),
      session({ focus_seconds: 60 }),
      session({ subject: 'Physics', focus_seconds: 60 }),
    ]);
    expect(allQuestsComplete(evaluateQuests(partial, TODAY))).toBe(false);
    expect(allQuestsComplete(evaluateQuests(all, TODAY))).toBe(true);
  });
});

describe('newlyCompletedQuests — the double-payout guards', () => {
  const finishedFocus = [session({ focus_seconds: 1500 })];

  it('pays out a quest this session brought over the line', () => {
    const before = data([]);
    const after = data(finishedFocus);
    expect(newlyCompletedQuests(before, after, TODAY).map((q) => q.id)).toEqual(['focus']);
  });

  it('does not pay out again for a quest completed by an EARLIER session', () => {
    // The transition check: it was already complete before this session.
    const before = data(finishedFocus);
    const after = data([...finishedFocus, session({ focus_seconds: 60 })]);
    expect(newlyCompletedQuests(before, after, TODAY)).toEqual([]);
  });

  it('does not pay out again when the claim record already lists it', () => {
    // The independent guard. This is what protects against a replayed write
    // after a failed save, where the transition check alone would pay twice.
    const before = data([]);
    const after = data(finishedFocus);
    const state = { day: TODAY, claimed: ['focus' as const] };
    expect(newlyCompletedQuests(before, after, TODAY, state)).toEqual([]);
  });

  it('pays out quests from a previous day again today', () => {
    // Yesterday's session already banked the focus payout. Today starts from
    // zero progress, so crossing 25 minutes again must pay out again.
    const before = data([session({ day: YESTERDAY, focus_seconds: 1500 })]);
    const after = data([...before.session_log, session({ focus_seconds: 1500 })]);
    const state = { day: YESTERDAY, claimed: ['focus' as const] };
    expect(newlyCompletedQuests(before, after, TODAY, state).map((q) => q.id)).toEqual(['focus']);
  });

  it('pays out several quests completed by the same session', () => {
    const before = data([]);
    // One 25-minute session in two subjects finishes focus and variety at once.
    const after = data([session({ subject: 'Math', focus_seconds: 1500 }), session({ subject: 'Physics' })]);
    const ids = newlyCompletedQuests(before, after, TODAY).map((q) => q.id);
    expect(ids).toContain('focus');
    expect(ids).toContain('variety');
  });

  it('pays out nothing when the session changed nothing', () => {
    const d = data([session()]);
    expect(newlyCompletedQuests(d, d, TODAY)).toEqual([]);
  });

  it('ignores an abandoned session entirely', () => {
    const before = data([]);
    const after = data([session({ completed: false, focus_seconds: 5000 })]);
    expect(newlyCompletedQuests(before, after, TODAY)).toEqual([]);
  });
});

describe('questXpTotal', () => {
  it('sums the rewards', () => {
    expect(questXpTotal(QUESTS)).toBe(QUESTS.reduce((a, q) => a + q.xp, 0));
  });

  it('is zero for nothing', () => {
    expect(questXpTotal([])).toBe(0);
  });
});

describe('nextQuestState — the record must not grow without bound', () => {
  it('records a fresh claim for today', () => {
    expect(nextQuestState(null, TODAY, ['focus'])).toEqual({ day: TODAY, claimed: ['focus'] });
  });

  it('adds to an existing list without duplicating', () => {
    const s = nextQuestState({ day: TODAY, claimed: ['focus'] }, TODAY, ['focus']);
    expect(s.claimed).toEqual(['focus']);
  });

  it('keeps earlier claims when a new one arrives', () => {
    const s = nextQuestState({ day: TODAY, claimed: ['focus'] }, TODAY, ['variety']);
    expect(s.claimed.sort()).toEqual(['focus', 'variety']);
  });

  it('drops yesterday instead of accumulating across days', () => {
    const s = nextQuestState({ day: YESTERDAY, claimed: ['focus'] }, TODAY, ['variety']);
    expect(s).toEqual({ day: TODAY, claimed: ['variety'] });
  });

  it('discards claim ids that are not real quests', () => {
    const s = nextQuestState(null, TODAY, ['not-a-quest' as never]);
    expect(s.claimed).toEqual([]);
  });
});