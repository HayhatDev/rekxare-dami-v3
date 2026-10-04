// Daily goal progress, derived fresh from the session log.
//
// Why this exists: `StudyData.daily_seconds` is a persisted counter that is
// only ever rewritten when a session completes (see `computeSessionRewards`).
// Across a day boundary it therefore still holds yesterday's total until the
// student finishes another session. Anything phrased as "today" that reads that
// field is showing stale progress on a new day — a card that says "Goal reached"
// before any work, and a study reminder that stays suppressed for the whole day.
//
// Deriving from the log removes the need for a reset entirely: the correct
// value for any day is computable at any moment, so there is no counter to fall
// out of sync and no write to fail.
//
// `daily_seconds` is still persisted — it is part of the stored shape, is used
// by exports, and older records depend on it — but it is no longer the display
// source of truth for "today".

import type { StudyData } from '../types';
import { completedFocusSecondsOnDay, dayKey } from './sessionLog';

/** Mirrors `DEFAULT_STUDY_DATA.daily_goal_seconds` so one source of truth. */
export const DEFAULT_DAILY_GOAL_SECONDS = 7200;

export interface DailyGoalProgress {
  /** Completed focus seconds so far on the given day. */
  doneSeconds: number;
  goalSeconds: number;
  doneMinutes: number;
  goalMinutes: number;
  /** 0-100, clamped. */
  pct: number;
  reached: boolean;
  remainingMinutes: number;
}

export function dailyGoalProgress(
  data: StudyData | null | undefined,
  day: string = dayKey(new Date())
): DailyGoalProgress {
  const doneSeconds = completedFocusSecondsOnDay(data?.session_log, day);
  // `|| DEFAULT` rather than `?? DEFAULT` so a stored 0 (goal explicitly unset)
  // also falls back instead of dividing by an empty target.
  const goalSeconds = data?.daily_goal_seconds || DEFAULT_DAILY_GOAL_SECONDS;
  return {
    doneSeconds,
    goalSeconds,
    doneMinutes: Math.floor(doneSeconds / 60),
    goalMinutes: Math.round(goalSeconds / 60),
    pct: Math.min(100, Math.round((doneSeconds / Math.max(1, goalSeconds)) * 100)),
    reached: doneSeconds >= goalSeconds,
    remainingMinutes: Math.max(0, Math.round((goalSeconds - doneSeconds) / 60)),
  };
}