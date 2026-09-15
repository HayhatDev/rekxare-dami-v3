// Reward system for Rekxare Dami.
//
// Model:
//  - `xp_points` is CUMULATIVE (never resets).
//  - `xp_level` is derived from `xp_points` via a sqrt curve so early levels
//    feel fast and later levels slow down, keeping progression motivating.
//  - A completed session earns time-based XP (1 XP per minute studied) plus:
//      * a finish bonus for reaching 0s (reward finishing, not just seat time)
//      * a variety bonus for studying a subject different from the last one
//        (rewards the diversification the AI advisor also recommends).
//  - The daily streak increments when consecutive calendar days are studied.

export const XP_PER_MINUTE = 1;
export const XP_FINISH_BONUS = 5;
export const XP_VARIETY_BONUS = 10;

// Curve constant: level = floor(sqrt(xp / LEVEL_BASE)) + 1
export const LEVEL_BASE = 50;

/** Cumulative XP required to ENTER the level that contains the given XP. */
export function xpForLevelStart(level: number): number {
  const n = Math.max(1, level) - 1;
  return LEVEL_BASE * n * n;
}

/** Cumulative XP at the START of the next level (exclusive upper bound). */
export function xpForNextLevel(level: number): number {
  const n = Math.max(1, level);
  return LEVEL_BASE * n * n;
}

/** 1-based level from cumulative XP. */
export function calculateXPLevel(xp: number): number {
  const n = Math.floor(Math.sqrt(Math.max(0, xp) / LEVEL_BASE));
  return n + 1;
}

/** 0-100 percent toward the next level. */
export function calculateXPProgress(xp: number): number {
  const level = calculateXPLevel(xp);
  const start = xpForLevelStart(level);
  const next = xpForNextLevel(level);
  const span = Math.max(1, next - start);
  const pct = ((Math.max(0, xp) - start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
}

export interface RewardInput {
  xp_points: number;
  sessions: number;
  streak: number;
  last_study_date: string | null;
  total_seconds: number;
  daily_seconds: number;
}

export interface RewardOutcome {
  total_seconds: number;
  sessions: number;
  daily_seconds: number;
  xp_points: number;
  xp_level: number;
  streak: number;
  last_study_date: string | null;
  // New XP gained this completion, broken down for UX (toasts).
  xp_earned: number;
  finish_bonus: number;
  variety_bonus: number;
  leveled_up: boolean;
  previous_level: number;
}

// NOTE: last_study_date uses the long `Date.prototype.toDateString()` format
// (e.g. "Wed Sep 02 2026") to preserve compatibility with data already
// persisted by the original timer implementation. Changing this format would
// reset existing users' streaks.
function toDateString(d: Date): string {
  return d.toDateString();
}

function yesterdayString(today: Date): string {
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  return toDateString(y);
}

/**
 * Compute the updated study data after a completed study session.
 *
 * @param prev   Current persisted study data.
 * @param opts   Session details.
 */
export function computeSessionRewards(
  prev: RewardInput,
  opts: {
    minutes: number;
    completed: boolean;
    subject: string;
    last_subject?: string;
    now?: Date;
  }
): RewardOutcome {
  const now = opts.now || new Date();
  const today = toDateString(now);
  const minutes = Math.max(0, Math.floor(opts.minutes));
  const finished = Boolean(opts.completed);

  const finish_bonus = finished ? XP_FINISH_BONUS : 0;
  const variety_bonus =
    opts.subject && opts.last_subject && opts.subject !== opts.last_subject
      ? XP_VARIETY_BONUS
      : 0;

  const xp_earned = minutes * XP_PER_MINUTE + finish_bonus + variety_bonus;
  const newXp = (prev.xp_points || 0) + xp_earned;
  const newLevel = calculateXPLevel(newXp);
  const previous_level = calculateXPLevel(prev.xp_points || 0);

  // Streak logic: same day = no change, consecutive day = +1, gap = reset to 1.
  let newStreak = prev.streak || 0;
  if (prev.last_study_date !== today) {
    if (prev.last_study_date === yesterdayString(now)) {
      newStreak += 1;
    } else {
      newStreak = 1;
    }
  }

  // daily_seconds is a per-calendar-day total: reset it when the last study was
  // on a previous day, otherwise accumulate across same-day sessions.
  const studiedToday = prev.last_study_date === today;
  const newDailySeconds = studiedToday
    ? (prev.daily_seconds || 0) + minutes * 60
    : minutes * 60;

  return {
    total_seconds: (prev.total_seconds || 0) + minutes * 60,
    sessions: (prev.sessions || 0) + 1,
    daily_seconds: newDailySeconds,
    xp_points: newXp,
    xp_level: newLevel,
    streak: newStreak,
    last_study_date: today,
    xp_earned,
    finish_bonus,
    variety_bonus,
    leveled_up: newLevel > previous_level,
    previous_level,
  };
}
