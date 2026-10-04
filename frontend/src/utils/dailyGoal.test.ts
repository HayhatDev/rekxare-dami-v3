import { describe, it, expect } from 'vitest';
import { dailyGoalProgress, DEFAULT_DAILY_GOAL_SECONDS } from './dailyGoal';
import type { StudyData, SessionRecord } from '../types';

const TODAY = '2026-09-10';
const YESTERDAY = '2026-09-09';

function session(over: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'x',
    started_at: `${TODAY}T10:00:00.000Z`,
    day: TODAY,
    subject: 'Math',
    planned_minutes: 30,
    focus_seconds: 1800,
    completed: true,
    ...over,
  };
}

function data(session_log: SessionRecord[], over: Partial<StudyData> = {}): StudyData {
  return {
    total_seconds: 0,
    sessions: session_log.length,
    last_subject: 'Math',
    streak: 1,
    last_study_date: null,
    daily_seconds: 0,
    daily_goal_seconds: 3600,
    xp_points: 0,
    xp_level: 1,
    student_name: 'T',
    session_log,
    review_cards: [],
    ...over,
  };
}

describe('dailyGoalProgress — the regression this module exists for', () => {
  it('shows ZERO progress on a new day even when yesterday hit the goal', () => {
    // The bug: `daily_seconds` still holds yesterday's total until the student
    // completes another session, so the card reads "Goal reached" on a fresh day.
    const d = data([session({ day: YESTERDAY, focus_seconds: 3600 })], {
      daily_seconds: 3600,
      last_study_date: YESTERDAY,
    });
    const p = dailyGoalProgress(d, TODAY);
    expect(p.doneSeconds).toBe(0);
    expect(p.doneMinutes).toBe(0);
    expect(p.reached).toBe(false);
    expect(p.pct).toBe(0);
    expect(p.remainingMinutes).toBe(60);
  });

  it('ignores a stale daily_seconds counter with no log behind it', () => {
    const d = data([], { daily_seconds: 99999 });
    expect(dailyGoalProgress(d, TODAY).doneSeconds).toBe(0);
  });

  it('reports the previous day correctly when asked for it', () => {
    const d = data([session({ day: YESTERDAY, focus_seconds: 3600 })]);
    const p = dailyGoalProgress(d, YESTERDAY);
    expect(p.doneSeconds).toBe(3600);
    expect(p.reached).toBe(true);
  });
});

describe('dailyGoalProgress — normal operation', () => {
  it('is zero on an empty day', () => {
    const p = dailyGoalProgress(data([]), TODAY);
    expect(p.doneSeconds).toBe(0);
    expect(p.doneMinutes).toBe(0);
    expect(p.reached).toBe(false);
    expect(p.pct).toBe(0);
  });

  it('sums several same-day sessions', () => {
    const d = data([session({ focus_seconds: 600 }), session({ focus_seconds: 900 })]);
    expect(dailyGoalProgress(d, TODAY).doneSeconds).toBe(1500);
  });

  it('reaches the goal exactly at the target', () => {
    const d = data([session({ focus_seconds: 3600 })]);
    const p = dailyGoalProgress(d, TODAY);
    expect(p.reached).toBe(true);
    expect(p.remainingMinutes).toBe(0);
    expect(p.pct).toBe(100);
  });

  it('clamps pct at 100 when the goal is overshot', () => {
    const d = data([session({ focus_seconds: 9999 })]);
    expect(dailyGoalProgress(d, TODAY).pct).toBe(100);
  });

  it('ignores abandoned sessions, matching how the counter accumulates', () => {
    const d = data([session({ completed: false, focus_seconds: 3600 })]);
    expect(dailyGoalProgress(d, TODAY).doneSeconds).toBe(0);
  });

  it('excludes other days', () => {
    const d = data([session({ day: YESTERDAY, focus_seconds: 3600 })]);
    expect(dailyGoalProgress(d, TODAY).doneSeconds).toBe(0);
  });
});

describe('dailyGoalProgress — goal target handling', () => {
  it('uses the stored goal', () => {
    const d = data([session({ focus_seconds: 1800 })], { daily_goal_seconds: 1800 });
    const p = dailyGoalProgress(d, TODAY);
    expect(p.goalMinutes).toBe(30);
    expect(p.reached).toBe(true);
  });

  it('falls back to the shared default when the goal is missing', () => {
    const d = data([session({ focus_seconds: 1800 })]);
    delete (d as Partial<StudyData>).daily_goal_seconds;
    expect(dailyGoalProgress(d, TODAY).goalSeconds).toBe(DEFAULT_DAILY_GOAL_SECONDS);
  });

  it('falls back to the shared default when the goal is stored as 0', () => {
    const d = data([session()], { daily_goal_seconds: 0 });
    expect(dailyGoalProgress(d, TODAY).goalSeconds).toBe(DEFAULT_DAILY_GOAL_SECONDS);
  });

  it('never divides by zero on a 0 goal', () => {
    const d = data([session()], { daily_goal_seconds: 0 });
    const p = dailyGoalProgress(d, TODAY);
    expect(Number.isFinite(p.pct)).toBe(true);
  });
});

describe('dailyGoalProgress — missing data must not throw', () => {
  it('handles undefined and null study data', () => {
    expect(dailyGoalProgress(undefined, TODAY).doneSeconds).toBe(0);
    expect(dailyGoalProgress(null, TODAY).doneSeconds).toBe(0);
  });

  it('handles a record with no session log at all', () => {
    const d = data([]);
    delete (d as Partial<StudyData>).session_log;
    expect(dailyGoalProgress(d, TODAY).doneSeconds).toBe(0);
  });
});