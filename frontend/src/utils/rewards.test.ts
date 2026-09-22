import { describe, it, expect } from 'vitest';
import {
  computeSessionRewards,
  calculateXPLevel,
  calculateXPProgress,
  xpForLevelStart,
  xpForNextLevel,
  XP_FINISH_BONUS,
  XP_VARIETY_BONUS,
  XP_PER_MINUTE,
} from './rewards';
import { RewardInput } from './rewards';

function base(overrides: Partial<RewardInput> = {}): RewardInput {
  return {
    xp_points: 0,
    sessions: 0,
    streak: 0,
    last_study_date: null,
    total_seconds: 0,
    daily_seconds: 0,
    ...overrides,
  };
}

// Fixed "now" so streak/date logic is deterministic.
const NOW = new Date(2026, 8, 2, 10, 0, 0); // Wed Sep 02 2026
const TODAY = NOW.toDateString();

describe('calculateXPLevel', () => {
  it('starts at level 1', () => {
    expect(calculateXPLevel(0)).toBe(1);
    expect(calculateXPLevel(49)).toBe(1);
  });

  it('levels up at 50, 200, 450 (sqrt curve, base 50)', () => {
    expect(calculateXPLevel(50)).toBe(2);
    expect(calculateXPLevel(200)).toBe(3);
    expect(calculateXPLevel(450)).toBe(4);
  });

  it('never goes below 1 for negative xp', () => {
    expect(calculateXPLevel(-100)).toBe(1);
  });
});

describe('calculateXPProgress', () => {
  it('returns 0-100 int-bounded within the current level', () => {
    expect(calculateXPProgress(0)).toBe(0);
    expect(calculateXPProgress(49)).toBeGreaterThan(0);
    expect(calculateXPProgress(49)).toBeLessThan(100);
    expect(calculateXPProgress(50)).toBe(0); // exactly at next level boundary
  });

  it('returns a whole number (no floating point like 26.6666)', () => {
    // Level 2 (xp 50-200): 90xp is 40/150 * 100 = 26.666... -> must be integer.
    const p = calculateXPProgress(90);
    expect(Number.isInteger(p)).toBe(true);
    expect(p).toBe(27);
  });

  it('is monotonic within a level', () => {
    const a = calculateXPProgress(10);
    const b = calculateXPProgress(40);
    expect(b).toBeGreaterThan(a);
  });
});

describe('level boundary helpers', () => {
  it('computes consistent level spans', () => {
    // Level 1 spans [0, 50), level 2 spans [50, 200)
    expect(xpForLevelStart(1)).toBe(0);
    expect(xpForNextLevel(1)).toBe(50);
    expect(xpForLevelStart(2)).toBe(50);
    expect(xpForNextLevel(2)).toBe(200);
  });
});

describe('computeSessionRewards — XP', () => {
  it('awards 1 XP per minute when not finished', () => {
    const r = computeSessionRewards(base(), {
      minutes: 25,
      completed: false,
      subject: 'Math',
      last_subject: 'Math',
      now: NOW,
    });
    expect(r.xp_earned).toBe(25 * XP_PER_MINUTE);
    expect(r.xp_points).toBe(25);
  });

  it('awards finish bonus when completed', () => {
    const r = computeSessionRewards(base(), {
      minutes: 25,
      completed: true,
      subject: 'Math',
      last_subject: 'Math',
      now: NOW,
    });
    expect(r.xp_earned).toBe(25 * XP_PER_MINUTE + XP_FINISH_BONUS);
    expect(r.xp_points).toBe(30);
  });

  it('awards variety bonus when subject differs from last_subject', () => {
    const r = computeSessionRewards(base(), {
      minutes: 25,
      completed: true,
      subject: 'Physics',
      last_subject: 'Math',
      now: NOW,
    });
    expect(r.xp_earned).toBe(25 * XP_PER_MINUTE + XP_FINISH_BONUS + XP_VARIETY_BONUS);
  });

  it('does not add variety bonus for the same subject', () => {
    const r = computeSessionRewards(base(), {
      minutes: 25,
      completed: true,
      subject: 'Math',
      last_subject: 'Math',
      now: NOW,
    });
    expect(r.variety_bonus).toBe(0);
  });
});

describe('computeSessionRewards — time & sessions', () => {
  it('adds seconds to total and daily (same-day accumulation)', () => {
    const r = computeSessionRewards(
      base({ total_seconds: 3600, daily_seconds: 600, last_study_date: TODAY }),
      {
        minutes: 25,
        completed: true,
        subject: 'Math',
        last_subject: 'Math',
        now: NOW,
      }
    );
    expect(r.total_seconds).toBe(3600 + 25 * 60);
    expect(r.daily_seconds).toBe(600 + 25 * 60);
    expect(r.sessions).toBe(1);
  });

  it('resets daily_seconds at a day boundary (starts fresh for the new day)', () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    // Studied yesterday with a large accumulated daily total that must NOT carry over.
    const r = computeSessionRewards(
      base({ total_seconds: 3600, daily_seconds: 5400, last_study_date: yesterday.toDateString() }),
      { minutes: 25, completed: true, subject: 'Math', last_subject: 'Math', now: NOW }
    );
    expect(r.daily_seconds).toBe(25 * 60); // old daily total dropped for new day
    expect(r.total_seconds).toBe(3600 + 25 * 60); // lifetime total still accumulates
  });

  it('keeps accumulating daily_seconds for multiple same-day sessions', () => {
    const r = computeSessionRewards(
      base({ daily_seconds: 25 * 60, last_study_date: TODAY }),
      { minutes: 25, completed: true, subject: 'Math', last_subject: 'Math', now: NOW }
    );
    expect(r.daily_seconds).toBe(50 * 60);
  });
});

describe('computeSessionRewards — streak', () => {
  it('sets streak to 1 on first-ever study', () => {
    const r = computeSessionRewards(base({ streak: 0, last_study_date: null }), {
      minutes: 25,
      completed: true,
      subject: 'Math',
      now: NOW,
    });
    expect(r.streak).toBe(1);
    expect(r.last_study_date).toBe(TODAY);
  });

  it('keeps streak unchanged when studying again the same day', () => {
    const r = computeSessionRewards(
      base({ streak: 3, last_study_date: TODAY }),
      { minutes: 25, completed: true, subject: 'Math', now: NOW }
    );
    expect(r.streak).toBe(3);
  });

  it('increments streak on a consecutive day', () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const r = computeSessionRewards(
      base({ streak: 2, last_study_date: yesterday.toDateString() }),
      { minutes: 25, completed: true, subject: 'Math', now: NOW }
    );
    expect(r.streak).toBe(3);
  });

  it('resets streak when a day was skipped', () => {
    const twoDaysAgo = new Date(NOW);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const r = computeSessionRewards(
      base({ streak: 5, last_study_date: twoDaysAgo.toDateString() }),
      { minutes: 25, completed: true, subject: 'Math', now: NOW }
    );
    expect(r.streak).toBe(1);
  });
});

describe('computeSessionRewards — level-up detection', () => {
  it('flags leveled_up when crossing the curve threshold', () => {
    // At 45 XP, +5 finish bonus crosses to 50 -> level 2.
    const r = computeSessionRewards(base({ xp_points: 45 }), {
      minutes: 0,
      completed: false,
      subject: 'Math',
      last_subject: 'Math',
      now: NOW,
    });
    // minutes=0 => no time XP, but finish_bonus=0 (not completed), so xp stays 45.
    expect(r.xp_points).toBe(45);
    expect(calculateXPLevel(45)).toBe(1);

    const r2 = computeSessionRewards(base({ xp_points: 45 }), {
      minutes: 0,
      completed: true,
      subject: 'Math',
      last_subject: 'Math',
      now: NOW,
    });
    expect(r2.xp_points).toBe(45 + XP_FINISH_BONUS); // 50
    expect(r2.xp_level).toBe(2);
    expect(r2.leveled_up).toBe(true);
    expect(r2.previous_level).toBe(1);
  });
});
