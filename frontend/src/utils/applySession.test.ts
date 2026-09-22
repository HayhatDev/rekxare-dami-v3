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
    expect(second.patch.xp_points).toBe((25 + 5) * 2); // 1 XP/min + 5 finish bonus
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