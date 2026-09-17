import { describe, it, expect } from 'vitest';
import { buildShareSummary, formatMinutes } from './share';
import { StudyData } from '../types';

const t = (key: string, fallback: string) => fallback;

function base(overrides: Partial<StudyData> = {}): StudyData {
  return {
    total_seconds: 0,
    sessions: 0,
    last_subject: 'Math',
    streak: 0,
    last_study_date: null,
    daily_seconds: 0,
    daily_goal_seconds: 3600,
    xp_points: 0,
    xp_level: 1,
    student_name: '',
    session_log: [],
    ...overrides,
  };
}

describe('formatMinutes', () => {
  it('formats minutes as m / h / h+m', () => {
    expect(formatMinutes(25)).toBe('25m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(75)).toBe('1h 15m');
    expect(formatMinutes(0)).toBe('0m');
  });
});

describe('buildShareSummary', () => {
  it('derives today minutes from daily_seconds', () => {
    const s = buildShareSummary(base({ daily_seconds: 1500 }), t);
    expect(s.todayMinutes).toBe(25);
    expect(s.text).toContain('Today I\'ve studied 25m');
  });

  it('computes level and progress from cumulative xp', () => {
    const s = buildShareSummary(base({ xp_points: 450 }), t);
    expect(s.level).toBe(4);
    expect(s.levelProgress).toBeGreaterThanOrEqual(0);
    expect(s.text).toContain('Level 4');
  });

  it('includes streak, sessions and formatted total focus', () => {
    const s = buildShareSummary(base({ streak: 7, sessions: 12, total_seconds: 3600 }), t);
    expect(s.streak).toBe(7);
    expect(s.sessions).toBe(12);
    expect(s.totalMinutes).toBe(60);
    expect(s.text).toContain('Streak 7d');
    expect(s.text).toContain('12 sessions');
    expect(s.text).toContain('Total focus 1h');
  });

  it('deals with all-zero data without throwing', () => {
    const s = buildShareSummary(base(), t);
    expect(s.level).toBe(1);
    expect(s.todayMinutes).toBe(0);
    expect(s.text).toContain('Level 1');
  });
});
