import { describe, it, expect } from 'vitest';
import { guestKeysToClear, mergeStudyData } from './supabase';
import { GuestDeletionState } from './supabase';
import { StudyData } from '../types';

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
    ...overrides,
  };
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
