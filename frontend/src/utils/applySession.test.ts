import { describe, it, expect } from 'vitest';
import { applySessionCompletion, applySessionAbandoned } from './applySession';
import { dayKey } from './sessionLog';
import type { StudyData } from '../types';

function baseStudyData(overrides: Partial<StudyData> = {}): StudyData {
  return {
    total_seconds: 7200,
    sessions: 3,
    last_subject: 'Math',
    streak: 2,
    last_study_date: new Date(2026, 8, 2).toDateString(), // Wed Sep 02 2026
    daily_seconds: 1800,
    daily_goal_seconds: 7200,
    xp_points: 150,
    xp_level: 2,
    student_name: 'Test',
    session_log: [],
    review_cards: [],
    ...overrides,
  };
}

describe('applySessionCompletion', () => {
  it('attributes a midnight-crossing session to the END day', () => {
    const start = new Date(2026, 8, 2, 23, 50, 0); // Sep 02 23:50
    const end = new Date(2026, 8, 3, 0, 10, 0); // Sep 03 00:10
    const { record } = applySessionCompletion(baseStudyData(), {
      startedAt: start.toISOString(),
      endAt: end,
      subject: 'Biology',
      focusSeconds: 20 * 60,
      plannedMinutes: 25,
    });
    expect(dayKey(start)).toBe('2026-09-02'); // sanity: start was the previous day
    expect(record.day).toBe(dayKey(end));
    expect(record.day).toBe('2026-09-03');
    expect(record.started_at).toBe(start.toISOString()); // raw display preserved
  });

  it('two completions computed from the freshest prev never lose XP/increments', () => {
    const base = baseStudyData({
      last_study_date: null,
      daily_seconds: 0,
      streak: 0,
      sessions: 0,
      xp_points: 0,
      total_seconds: 0,
    });
    const end = () => new Date(2026, 8, 2, 12, 0, 0);
    const first = applySessionCompletion(base, {
      startedAt: '2026-09-02T11:00:00.000Z',
      endAt: end(),
      subject: 'Math',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    // Second completion recomputes from the FIRST patch, not the stale base.
    const afterFirst = { ...base, ...first.patch };
    const second = applySessionCompletion(afterFirst, {
      startedAt: '2026-09-02T12:30:00.000Z',
      endAt: end(),
      subject: 'Math',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    expect(first.patch.sessions).toBe(1);
    expect(second.patch.sessions).toBe(2);
    expect(second.patch.total_seconds).toBe(25 * 60 * 2);
    expect(second.patch.session_log?.length).toBe(2);
    // Same-day accumulation: daily_seconds keeps growing and XP keeps growing.
    expect(second.patch.daily_seconds).toBe(25 * 60 * 2);
    // Session XP is 30 each (25 x 1/min + 5 finish bonus), so 60, plus the 15 XP
    // focus-quest bonus the FIRST session earned. The second session did not
    // re-earn it: the quest was already complete and already claimed.
    expect(first.rewards.quest_bonus).toBe(15);
    expect(second.rewards.quest_bonus).toBe(0);
    expect(second.patch.xp_points).toBe(60 + 15);
  });

  it('settles quest XP and the claim record in the same patch as the session', () => {
    // Two writes could disagree: a quest paying out that was never marked
    // claimed, or marked claimed without paying. One patch cannot.
    const base = baseStudyData({
      last_study_date: null,
      daily_seconds: 0,
      streak: 0,
      sessions: 0,
      xp_points: 0,
      total_seconds: 0,
      session_log: [],
    });
    const { patch, rewards } = applySessionCompletion(base, {
      startedAt: '2026-09-02T11:00:00.000Z',
      endAt: new Date(2026, 8, 2, 12, 0, 0),
      subject: 'Math',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    expect(rewards.quest_bonus).toBeGreaterThan(0);
    expect(patch.xp_points).toBe(rewards.xp_earned + rewards.quest_bonus);
    expect(patch.daily_quests?.claimed).toContain('focus');
    expect(patch.daily_quests?.day).toBe(dayKey(new Date(2026, 8, 2, 12, 0, 0)));
  });

  it('never pays a quest twice across three sessions in one day', () => {
    const base = baseStudyData({
      last_study_date: null,
      daily_seconds: 0,
      streak: 0,
      sessions: 0,
      xp_points: 0,
      total_seconds: 0,
      session_log: [],
    });
    const end = new Date(2026, 8, 2, 12, 0, 0);
    let state = base;
    let totalQuestXp = 0;
    // Chained through each patch, the way the timer persists them.
    for (let i = 0; i < 3; i++) {
      const r = applySessionCompletion(state, {
        startedAt: '2026-09-02T11:00:00.000Z',
        endAt: end,
        subject: 'Math',
        focusSeconds: 15 * 60,
        plannedMinutes: 15,
      });
      totalQuestXp += r.rewards.quest_bonus;
      state = { ...state, ...r.patch };
    }
    // 3 x 15 min in one subject crosses focus on the 2nd session and the
    // 3-session count on the 3rd. Nothing is paid twice.
    expect(totalQuestXp).toBe(15 + 15);
    expect(state.daily_quests?.claimed.sort()).toEqual(['focus', 'sessions']);
    expect(state.xp_points).toBe(3 * (15 + 5) + 30);
  });

  it('pays a quest again on the next day', () => {
    const base = baseStudyData({
      last_study_date: null,
      daily_seconds: 0,
      streak: 0,
      sessions: 0,
      xp_points: 0,
      total_seconds: 0,
      session_log: [],
    });
    const day1 = applySessionCompletion(base, {
      startedAt: '2026-09-02T11:00:00.000Z',
      endAt: new Date(2026, 8, 2, 12, 0, 0),
      subject: 'Math',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    const afterDay1 = { ...base, ...day1.patch };
    const day2 = applySessionCompletion(afterDay1, {
      startedAt: '2026-09-03T11:00:00.000Z',
      endAt: new Date(2026, 8, 3, 12, 0, 0),
      subject: 'Math',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    expect(day1.rewards.quest_bonus).toBe(15);
    expect(day2.rewards.quest_bonus).toBe(15); // yesterday's payout does not carry over
    expect(day2.patch.daily_quests?.claimed).toEqual(['focus']);
    expect(day2.patch.daily_quests?.day).toBe('2026-09-03');
  });

  it('resets daily_seconds and bumps the streak when landing on a new day', () => {
    const base = baseStudyData({ daily_seconds: 1800 }); // last study: Sep 02
    const end = new Date(2026, 8, 3, 9, 0, 0); // new day
    const { patch } = applySessionCompletion(base, {
      startedAt: '2026-09-03T08:35:00.000Z',
      endAt: end,
      subject: 'Chemistry',
      focusSeconds: 25 * 60,
      plannedMinutes: 25,
    });
    expect(patch.daily_seconds).toBe(25 * 60); // not 1800 + 1500
    expect(patch.streak).toBe(3); // consecutive day after Sep 02
  });

  it('keeps started_at raw and never mutates the input log', () => {
    const base = baseStudyData();
    const out = applySessionCompletion(base, {
      startedAt: 'clean-ts',
      endAt: new Date(2026, 8, 2, 10, 0, 0),
      subject: 'Biology',
      focusSeconds: 600,
      plannedMinutes: 15,
    });
    expect(out.record.started_at).toBe('clean-ts');
    expect(base.session_log.length).toBe(0);
    expect(out.patch.session_log?.length).toBe(1);
  });
});

describe('applySessionAbandoned', () => {
  it('attributes an abandoned session to the abandonment (end) day', () => {
    const start = new Date(2026, 8, 2, 23, 55, 0);
    const end = new Date(2026, 8, 3, 0, 5, 0);
    const next = applySessionAbandoned(baseStudyData(), {
      startedAt: start.toISOString(),
      endAt: end,
      subject: 'Math',
      focusSeconds: 10 * 60,
      plannedMinutes: 25,
    });
    expect(next[0].day).toBe('2026-09-03');
    expect(next[0].completed).toBe(false);
  });

  it('does not mutate aggregates (log-only write)', () => {
    const base = baseStudyData();
    applySessionAbandoned(base, {
      startedAt: 'x',
      endAt: new Date(2026, 8, 2, 10, 0, 0),
      subject: 'Math',
      focusSeconds: 90,
      plannedMinutes: 25,
    });
    expect(base.session_log.length).toBe(0);
  });
});