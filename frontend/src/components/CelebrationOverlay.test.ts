import { describe, it, expect } from 'vitest';
import { isStreakMilestone, shouldCelebrate } from './CelebrationOverlay';

describe('isStreakMilestone — unchanged milestone rules', () => {
  it('celebrates the first day', () => {
    expect(isStreakMilestone(1)).toBe(true);
  });

  it('celebrates every fifth day', () => {
    for (const n of [5, 10, 15, 20]) expect(isStreakMilestone(n)).toBe(true);
  });

  it('does not celebrate an ordinary day', () => {
    for (const n of [2, 3, 4, 6, 7, 13, 14]) expect(isStreakMilestone(n)).toBe(false);
  });

  it('does not celebrate a zero streak', () => {
    expect(isStreakMilestone(0)).toBe(false);
  });
});

describe('shouldCelebrate — a freeze-saved streak is the better outcome, so it gets confetti', () => {
  // Without this, breaking a streak celebrated (reset to 1) while saving one did
  // not (a preserved 13 is not a milestone) — the reward punished good behaviour.
  it('celebrates a freeze-bridged day that is not otherwise a milestone', () => {
    expect(isStreakMilestone(13)).toBe(false);
    expect(shouldCelebrate(13, true)).toBe(true);
  });

  it('still celebrates a plain milestone without a freeze', () => {
    expect(shouldCelebrate(5, false)).toBe(true);
  });

  it('stays quiet on an ordinary day with no freeze', () => {
    expect(shouldCelebrate(3, false)).toBe(false);
  });

  it('celebrates a freeze-bridged first day', () => {
    expect(shouldCelebrate(1, true)).toBe(true);
  });

  it('celebrates a freeze-bridged 7-day milestone', () => {
    expect(shouldCelebrate(7, true)).toBe(true);
  });

  it('does not celebrate a zero-streak day with no freeze', () => {
    expect(shouldCelebrate(0, false)).toBe(false);
  });

  it('treats a freeze as worth celebrating even at an unusual streak', () => {
    // The streak value is irrelevant once a freeze fired; the outcome is the news.
    expect(shouldCelebrate(2, true)).toBe(true);
    expect(shouldCelebrate(97, true)).toBe(true);
  });
});