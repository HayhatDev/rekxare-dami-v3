import { describe, it, expect, beforeAll } from 'vitest';
import i18n from '../i18n';
import { buildLocalDashboard } from './localInsights';
import type { StudyData, ScheduleData, SessionRecord } from '../types';

/**
 * A streak survives days the student did not study, because a freeze bridges
 * them. So `streak` and "study days in the last 7" measure different things and
 * can disagree — and these tests pin the rule that keeps the dashboard from
 * contradicting itself when they do.
 */

const emptySchedule = {} as ScheduleData;

// Pin the language so the assertions below can match real copy. The app
// defaults to Badini, so without this these strings would not be English.
beforeAll(async () => {
  await i18n.changeLanguage('en');
});

function sessionOn(dayOffset: number, base: Date): SessionRecord {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return {
    id: `s${dayOffset}`,
    started_at: `${day}T10:00:00.000Z`,
    day,
    subject: 'Math',
    planned_minutes: 30,
    focus_seconds: 1800,
    completed: true,
  };
}

/**
 * buildLocalDashboard reads the real clock for its trailing 7-day window, so the
 * session dates are relative to today rather than to a fixed date.
 */
function dataWith(streak: number, sessionDayOffsets: number[]): StudyData {
  const now = new Date();
  return {
    total_seconds: 1800 * sessionDayOffsets.length,
    sessions: sessionDayOffsets.length,
    last_subject: 'Math',
    streak,
    last_study_date: now.toDateString(),
    daily_seconds: 1800,
    daily_goal_seconds: 7200,
    xp_points: 100,
    xp_level: 2,
    student_name: 'Test',
    session_log: sessionDayOffsets.map((o) => sessionOn(o, now)),
    review_cards: [],
  };
}

const streakStrength = (streak: number) => `You're on a ${streak}-day study streak`;
const citesStreak = (d: { strengths: string[] }, streak: number) =>
  d.strengths.includes(streakStrength(streak));
const lowConsistency = (d: { weaknesses: string[] }) =>
  d.weaknesses.some((w) => w.includes('consistency builds momentum'));

describe('buildLocalDashboard — streak strength must not contradict the consistency warning', () => {
  it('never claims a streak strength while also reporting low consistency', () => {
    // The freeze scenario: a long streak maintained across days with no sessions.
    const d = buildLocalDashboard(dataWith(20, [0]), emptySchedule);

    expect(citesStreak(d, 20)).toBe(false);
    expect(lowConsistency(d)).toBe(true);
  });

  it('does not cite the streak when only two of the last seven days are studied', () => {
    const d = buildLocalDashboard(dataWith(15, [0, -1]), emptySchedule);
    expect(citesStreak(d, 15)).toBe(false);
    expect(lowConsistency(d)).toBe(true);
  });

  it('still shows the streak strength when the recent week supports it', () => {
    const d = buildLocalDashboard(dataWith(6, [-1, -2, -3, -4, -5, -6]), emptySchedule);

    expect(citesStreak(d, 6)).toBe(true);
    expect(lowConsistency(d)).toBe(false);
  });

  it('cites the streak when exactly three recent days are studied', () => {
    // 3 is the documented consistency threshold, so the two rules agree here.
    const d = buildLocalDashboard(dataWith(3, [0, -1, -2]), emptySchedule);
    expect(citesStreak(d, 3)).toBe(true);
    expect(lowConsistency(d)).toBe(false);
  });

  it('does not cite a streak of 1 even with a full week', () => {
    const d = buildLocalDashboard(dataWith(1, [0, -1, -2, -3]), emptySchedule);
    expect(citesStreak(d, 1)).toBe(false);
  });

  it('never pairs the streak strength with the consistency weakness', () => {
    for (const offsets of [[0], [0, -1], [0, -1, -2], [-1, -2, -3, -4, -5, -6], [0, -1, -2, -3, -4, -5, -6]]) {
      const d = buildLocalDashboard(dataWith(12, offsets), emptySchedule);
      const hasStreakStrength = d.strengths.some((s) => s.includes('study streak'));
      expect(hasStreakStrength && lowConsistency(d)).toBe(false);
    }
  });

  it('still reports the real streak in the summary even when it is not a strength', () => {
    // Suppressing it as a strength must not hide the number itself: the summary
    // is a factual readout, the strengths list is an editorial judgement.
    const d = buildLocalDashboard(dataWith(20, [0]), emptySchedule);
    expect(d.summary).toContain('20');
  });
});

describe('buildLocalDashboard ΓÇö the daily goal must agree with the goal card', () => {
  // `goal_pct` is not exposed; it surfaces as these copy strings.
  const goalWeakness = (d: { weaknesses: string[] }) =>
    d.weaknesses.some((w) => w.includes("of today's goal"));
  const goalStrength = (d: { strengths: string[] }) =>
    d.strengths.some((s) => s.includes('of your daily goal'));
  const nagsAboutGoal = (d: { recommendations: string[] }) =>
    d.recommendations.some((r) => r.includes('Finish your daily goal'));

  it('does not count abandoned sessions toward the daily goal', () => {
    const now = new Date();
    const abandoned = { ...sessionOn(0, now), completed: false };
    const d = buildLocalDashboard({ ...dataWith(1, []), session_log: [abandoned] }, emptySchedule);
    expect(goalWeakness(d)).toBe(true);
    expect(goalStrength(d)).toBe(false);
    expect(nagsAboutGoal(d)).toBe(true);
  });

  it('credits completed sessions toward the daily goal', () => {
    // 1800s of a 7200s goal = 25%.
    const d = buildLocalDashboard(dataWith(1, [0]), emptySchedule);
    expect(d.weaknesses.join(' ')).toContain("25% of today's goal");
  });

  it('credits a second same-day session so the goal can be met', () => {
    const now = new Date();
    const log = [
      { ...sessionOn(0, now), id: 'a' },
      { ...sessionOn(0, now), id: 'b' },
    ];
    const d = buildLocalDashboard(
      { ...dataWith(2, []), session_log: log },
      emptySchedule
    );
    expect(d.strengths.join(' ')).toContain('50% of your daily goal');
  });

  it('reads today from the log, so a new day starts back at zero', () => {
    // `daily_seconds` still holds a full day, but nothing is logged today.
    const d = buildLocalDashboard({ ...dataWith(9, [-1]), daily_seconds: 7200 }, emptySchedule);
    expect(d.weaknesses.join(' ')).toContain("0% of today's goal");
    expect(goalStrength(d)).toBe(false);
  });
});