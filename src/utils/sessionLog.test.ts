import { describe, it, expect } from 'vitest';
import {
  dayKey,
  buildSessionRecord,
  appendSessionRecord,
  sessionLogStats,
  formatMinutes,
  MIN_ABANDON_SECONDS,
  MAX_LOG_ENTRIES,
} from './sessionLog';
import { SessionRecord } from '../types';

const NOW = new Date(2026, 8, 2, 10, 0, 0); // Wed Sep 02 2026

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 't-1',
    started_at: '2026-09-02T10:00:00.000Z',
    day: '2026-09-02',
    subject: 'Math',
    planned_minutes: 25,
    focus_seconds: 1500,
    completed: true,
    ...overrides,
  };
}

describe('dayKey', () => {
  it('formats local date as YYYY-MM-DD', () => {
    expect(dayKey(new Date(2026, 8, 2, 10, 0, 0))).toBe('2026-09-02');
  });

  it('zero-pads month and day', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('buildSessionRecord', () => {
  it('builds a completed record', () => {
    const r = buildSessionRecord({
      startedAt: '2026-09-02T10:00:00.000Z',
      day: '2026-09-02',
      subject: 'Biology',
      plannedMinutes: 40,
      focusSeconds: 2400,
      completed: true,
    });
    expect(r.day).toBe('2026-09-02');
    expect(r.subject).toBe('Biology');
    expect(r.planned_minutes).toBe(40);
    expect(r.focus_seconds).toBe(2400);
    expect(r.completed).toBe(true);
    expect(r.started_at).toBe('2026-09-02T10:00:00.000Z');
  });

  it('generates unique ids', () => {
    const a = buildSessionRecord({ startedAt: 'x', day: '2026-09-02', subject: 's', plannedMinutes: 25, focusSeconds: 100, completed: false });
    const b = buildSessionRecord({ startedAt: 'x', day: '2026-09-02', subject: 's', plannedMinutes: 25, focusSeconds: 100, completed: false });
    expect(a.id).not.toBe(b.id);
  });
});

describe('appendSessionRecord', () => {
  it('handles an undefined log (legacy stored data)', () => {
    const r = record();
    expect(appendSessionRecord(undefined, r)).toEqual([r]);
  });

  it('appends to the end (newest last)', () => {
    const a = record({ id: 'a' });
    const b = record({ id: 'b' });
    expect(appendSessionRecord([a], b).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('caps the log and drops the oldest entries', () => {
    const first = record({ id: 'oldest' });
    let log = appendSessionRecord(undefined, first);
    for (let i = 0; i < MAX_LOG_ENTRIES; i++) {
      log = appendSessionRecord(log, record({ id: `r${i}` }));
    }
    expect(log.length).toBe(MAX_LOG_ENTRIES);
    expect(log.some((x) => x.id === 'oldest')).toBe(false);
    expect(log[log.length - 1].id).toBe(`r${MAX_LOG_ENTRIES - 1}`);
  });

  it('respects a custom cap', () => {
    let log = appendSessionRecord(undefined, record({ id: 'a' }), 2);
    log = appendSessionRecord(log, record({ id: 'b' }), 2);
    log = appendSessionRecord(log, record({ id: 'c' }), 2);
    expect(log.map((x) => x.id)).toEqual(['b', 'c']);
  });
});

describe('formatMinutes', () => {
  it('formats minutes-only', () => {
    expect(formatMinutes(0)).toBe('0m');
    expect(formatMinutes(25 * 60)).toBe('25m');
  });

  it('formats whole hours', () => {
    expect(formatMinutes(120 * 60)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(75 * 60)).toBe('1h 15m');
    expect(formatMinutes(61 * 60)).toBe('1h 01m');
  });
});

describe('sessionLogStats', () => {
  it('returns zeros for an empty/undefined log', () => {
    const s1 = sessionLogStats(undefined, NOW);
    expect(s1.total).toBe(0);
    expect(s1.completionRate).toBe(0);
    expect(s1.todaySeconds).toBe(0);
    const s2 = sessionLogStats([], NOW);
    expect(s2).toEqual(s1);
  });

  it('computes completion rate over all entries', () => {
    const log = [
      record({ id: 'a', completed: true }),
      record({ id: 'b', completed: false }),
      record({ id: 'c', completed: true }),
    ];
    const s = sessionLogStats(log, NOW);
    expect(s.total).toBe(3);
    expect(s.completed).toBe(2);
    expect(s.abandonCount).toBe(1);
    expect(s.completionRate).toBe(67); // 2/3 rounds to 67
  });

  it('filters today by day key', () => {
    const log = [
      record({ id: 'today1', day: '2026-09-02', focus_seconds: 600, completed: true }),
      record({ id: 'today2', day: '2026-09-02', focus_seconds: 300, completed: false }),
      record({ id: 'yesterday', day: '2026-09-01', focus_seconds: 900, completed: true }),
    ];
    const s = sessionLogStats(log, NOW);
    expect(s.todayCount).toBe(2);
    expect(s.todayCompleted).toBe(1);
    expect(s.todayAbandoned).toBe(1);
    expect(s.todaySeconds).toBe(900);
  });

  it('returns recent entries newest first', () => {
    const log = [
      record({ id: 'old', day: '2026-09-01' }),
      record({ id: 'new', day: '2026-09-02' }),
    ];
    const s = sessionLogStats(log, NOW);
    expect(s.recent.map((x) => x.id)).toEqual(['new', 'old']);
  });
});

describe('constants', () => {
  it('requires 60s of focus before a session counts as abandoned', () => {
    expect(MIN_ABANDON_SECONDS).toBe(60);
  });
});