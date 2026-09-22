import type { StudyData, SessionRecord } from '../types';
import { computeSessionRewards, RewardOutcome } from './rewards';
import { appendSessionRecord, buildSessionRecord, dayKey } from './sessionLog';

export interface SessionEndInput {
  startedAt: string;
  endAt: Date;
  subject: string;
  focusSeconds: number;
  plannedMinutes: number;
}

export interface CompletionOutcome {
  patch: Partial<StudyData>;
  rewards: RewardOutcome;
  record: SessionRecord;
}

/**
 * Compute the full next-state patch for a completed session off the freshest
 * persisted value. The day key (daily/weekly attribution) is derived from the
 * session END timestamp so a session crossing midnight lands on the day it
 * finished; `started_at` stays raw for display.
 */
export function applySessionCompletion(prev: StudyData, opts: SessionEndInput): CompletionOutcome {
  const rewards = computeSessionRewards(prev, {
    minutes: Math.floor(opts.focusSeconds / 60),
    completed: true,
    subject: opts.subject,
    last_subject: prev.last_subject,
    now: opts.endAt,
  });
  const record = buildSessionRecord({
    startedAt: opts.startedAt,
    day: dayKey(opts.endAt),
    subject: opts.subject,
    plannedMinutes: opts.plannedMinutes,
    focusSeconds: opts.focusSeconds,
    completed: true,
  });
  const session_log = appendSessionRecord(prev.session_log, record);
  return {
    patch: {
      total_seconds: rewards.total_seconds,
      sessions: rewards.sessions,
      last_subject: opts.subject,
      daily_seconds: rewards.daily_seconds,
      xp_points: rewards.xp_points,
      xp_level: rewards.xp_level,
      streak: rewards.streak,
      last_study_date: rewards.last_study_date,
      session_log,
    },
    rewards,
    record,
  };
}

/**
 * Append an abandoned session's log entry (log-only; no reward mutation).
 * `day` follows the abandonment (END) timestamp so abandoned sessions that span
 * midnight are attributed to the day they were abandoned, matching completions.
 */
export function applySessionAbandoned(prev: StudyData, opts: SessionEndInput): SessionRecord[] {
  const record = buildSessionRecord({
    startedAt: opts.startedAt,
    day: dayKey(opts.endAt),
    subject: opts.subject,
    plannedMinutes: opts.plannedMinutes,
    focusSeconds: opts.focusSeconds,
    completed: false,
  });
  return appendSessionRecord(prev.session_log, record);
}