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
//  - A streak freeze protects ONE missed day. A student who misses a single day
//    and holds a freeze keeps the streak alive instead of dropping to 1, because
//    losing a long streak to one sick day is the fastest way to make someone
//    abandon the app. One freeze covers one day only: a longer absence still
//    resets, so freezing cannot be used to bridge a whole missed week.

export const XP_PER_MINUTE = 1;
export const XP_FINISH_BONUS = 5;
export const XP_VARIETY_BONUS = 10;

/** Freezes are granted every time the streak reaches a multiple of this. */
export const STREAK_FREEZE_MILESTONE = 7;

/** Upper bound on banked freezes, so nobody hoards an unlimited safety net. */
export const STREAK_FREEZE_CAP = 3;

/**
 * Freezes granted to a student whose saved data predates the feature.
 *
 * Existing users have no `streak_freezes` key at all, and a launch where the
 * safety net reads zero for everyone would be a safety net nobody can see.
 */
export const STREAK_FREEZE_STARTING_GRANT = 1;

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

/** 0-100 percent toward the next level, rounded to a whole percentage point. */
export function calculateXPProgress(xp: number): number {
  const level = calculateXPLevel(xp);
  const start = xpForLevelStart(level);
  const next = xpForNextLevel(level);
  const span = Math.max(1, next - start);
  const pct = ((Math.max(0, xp) - start) / span) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

export interface RewardInput {
  xp_points: number;
  sessions: number;
  streak: number;
  last_study_date: string | null;
  total_seconds: number;
  daily_seconds: number;
  /** Absent in data saved before streak freezes existed. */
  streak_freezes?: number;
}

export interface RewardOutcome {
  total_seconds: number;
  sessions: number;
  daily_seconds: number;
  xp_points: number;
  xp_level: number;
  streak: number;
  last_study_date: string | null;
  streak_freezes: number;
  // New XP gained this completion, broken down for UX (toasts).
  xp_earned: number;
  finish_bonus: number;
  variety_bonus: number;
  leveled_up: boolean;
  previous_level: number;
  /** A freeze was spent to bridge a single missed day. */
  freeze_used: boolean;
  /** The streak crossed a milestone and banked a freeze. */
  freeze_earned: boolean;
}

// NOTE: last_study_date uses the long `Date.prototype.toDateString()` format
// (e.g. "Wed Sep 02 2026") to preserve compatibility with data already
// persisted by the original timer implementation. Changing this format would
// reset existing users' streaks.
function toDateString(d: Date): string {
  return d.toDateString();
}

function daysAgoString(today: Date, days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - days);
  return toDateString(d);
}

/**
 * How many whole days separate the last study from `today`.
 *
 * Compares against generated date strings rather than parsing the stored value,
 * so the stored `toDateString()` format stays the only contract and no locale or
 * engine parsing difference can silently widen the gap.
 *
 * Returns `null` when the date is unparseable in this format, which the caller
 * treats as "treat it as a long absence" — the safe direction, since it resets
 * rather than crediting a streak it cannot prove.
 */
function daysSinceStudy(lastStudy: string | null | undefined, today: Date, span: number): number | null {
  if (!lastStudy) return null;
  for (let gap = 0; gap <= span; gap += 1) {
    if (lastStudy === daysAgoString(today, gap)) return gap;
  }
  return null;
}

/** Normalise a possibly-missing or corrupt freeze count. */
export function normalizeFreezes(value: number | undefined | null): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return STREAK_FREEZE_STARTING_GRANT;
  return Math.min(STREAK_FREEZE_CAP, Math.floor(value));
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

  let freezes = normalizeFreezes(prev.streak_freezes);
  let freeze_used = false;

  // Streak logic by gap: same day = no change, consecutive day = +1, exactly one
  // missed day = spend a freeze to survive, anything longer = reset to 1.
  let newStreak = prev.streak || 0;
  if (prev.last_study_date !== today) {
    const gap = daysSinceStudy(prev.last_study_date, now, 2);
    if (gap === 1) {
      newStreak += 1;
    } else if (gap === 2 && freezes > 0) {
      newStreak += 1;
      freezes -= 1;
      freeze_used = true;
    } else {
      newStreak = 1;
    }
  }

  // Bank a freeze at each milestone, capped. Gated on the streak having actually
  // ADVANCED this session: the milestone is a number the streak rests on for a
  // whole day, so without this guard every extra session on the milestone day
  // would bank another freeze. Counted on the new streak so a freeze-bridged day
  // that lands on a milestone still earns.
  const streakAdvanced = newStreak !== (prev.streak || 0);
  let freeze_earned = false;
  if (
    streakAdvanced &&
    newStreak > 0 &&
    newStreak % STREAK_FREEZE_MILESTONE === 0 &&
    freezes < STREAK_FREEZE_CAP
  ) {
    freezes += 1;
    freeze_earned = true;
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
    streak_freezes: freezes,
    xp_earned,
    finish_bonus,
    variety_bonus,
    leveled_up: newLevel > previous_level,
    previous_level,
    freeze_used,
    freeze_earned,
  };
}
