// Daily quests for Rekxare Dami.
//
// Model:
//  - Three short, achievable goals that reset every calendar day. They exist to
//    give a student a reason to open the app BEFORE they have a streak worth
//    protecting, which is the gap streak freezes could not close on their own.
//  - Progress is DERIVED from the session log rather than stored as running
//    counters. Nothing to keep in sync, progress survives a failed write, and
//    "how far along am I" can never disagree with the sessions behind it.
//  - XP is granted once per quest per day. Completion is detected as a
//    transition (not complete -> complete) AND checked against a persisted
//    `claimed` list, so a retried or replayed write cannot pay out twice.
//  - Quest rewards are a bonus ON TOP of session XP, never a replacement, so a
//    student is never worse off for finishing a quest than for ignoring it.

import type { StudyData } from '../types';

export type QuestId = 'focus' | 'sessions' | 'variety';

export interface QuestDef {
  id: QuestId;
  /** Target value, in the unit named by `metric`. */
  target: number;
  /** XP granted when the quest is first completed on a given day. */
  xp: number;
}

export const QUESTS: readonly QuestDef[] = [
  // Reachable in one sitting, which is the point: a quest you cannot finish
  // today is just a guilt trip.
  { id: 'focus', target: 25, xp: 15 },
  { id: 'sessions', target: 3, xp: 15 },
  // Rewards diversification, which is also what the AI advisor recommends.
  { id: 'variety', target: 2, xp: 20 },
] as const;

export const QUEST_IDS: readonly QuestId[] = QUESTS.map((q) => q.id);

/** Persisted per-day claim record. Absent for accounts predating quests. */
export interface DailyQuestState {
  /** `YYYY-MM-DD` the claims below belong to. */
  day: string;
  claimed: QuestId[];
}

export interface QuestStatus extends QuestDef {
  progress: number;
  complete: boolean;
  /** Already paid out today, so the UI can show it as banked. */
  claimed: boolean;
}

function questById(id: string): QuestDef | undefined {
  return QUESTS.find((q) => q.id === id);
}

/**
 * Raw progress per quest for the given day, all derived from the session log.
 *
 * Focus is summed from the log rather than read from `daily_seconds` so that
 * every quest uses one source of truth; `daily_seconds` is a live counter that
 * resets on the first session of a new day and would make the quest set
 * uncomputable for any earlier day.
 */
export function questProgress(data: StudyData, day: string): Record<QuestId, number> {
  const todays = (data.session_log || []).filter((r) => r.day === day && r.completed);
  const minutes = todays.reduce((acc, r) => acc + (r.focus_seconds || 0) / 60, 0);
  const subjects = new Set(todays.map((r) => (r.subject || '').trim()).filter(Boolean));
  return {
    focus: Math.floor(minutes),
    sessions: todays.length,
    variety: subjects.size,
  };
}

/** Whether every quest is finished for the day. */
export function allQuestsComplete(statuses: QuestStatus[]): boolean {
  return statuses.length > 0 && statuses.every((s) => s.complete);
}

export function questsCompleteCount(statuses: QuestStatus[]): number {
  return statuses.filter((s) => s.complete).length;
}

/**
 * Evaluate every quest for the day.
 *
 * `state` may be from a previous day, in which case its claims are ignored:
 * quests are per calendar day, so yesterday's payout must not suppress today's.
 */
export function evaluateQuests(data: StudyData, day: string, state?: DailyQuestState | null): QuestStatus[] {
  const progress = questProgress(data, day);
  const claimsToday = state && state.day === day ? state.claimed || [] : [];
  return QUESTS.map((q) => ({
    ...q,
    progress: Math.min(progress[q.id], q.target),
    complete: progress[q.id] >= q.target,
    claimed: claimsToday.includes(q.id),
  }));
}

/**
 * Quests newly finished by the session that was just logged.
 *
 * Requires the quest to have been INCOMPLETE before this session, so a student
 * who keeps studying past a completed quest is not paid repeatedly. The
 * `claimed` list is a second, independent guard: if a write fails and the
 * session is replayed, the transition check alone would pay out again.
 */
export function newlyCompletedQuests(
  before: StudyData,
  after: StudyData,
  day: string,
  state?: DailyQuestState | null
): QuestDef[] {
  const prior = questProgress(before, day);
  const current = questProgress(after, day);
  const already = state && state.day === day ? state.claimed || [] : [];
  return QUESTS.filter(
    (q) => current[q.id] >= q.target && prior[q.id] < q.target && !already.includes(q.id)
  );
}

/** Total XP owed for the given quests. */
export function questXpTotal(quests: readonly QuestDef[]): number {
  return quests.reduce((acc, q) => acc + q.xp, 0);
}

/**
 * The claim record to persist after awarding `newly`.
 *
 * Rolls over to a fresh empty claim list when the stored record belongs to an
 * earlier day, so the field cannot grow without bound across days.
 */
export function nextQuestState(
  state: DailyQuestState | null | undefined,
  day: string,
  newClaims: QuestId[]
): DailyQuestState {
  const carried = state && state.day === day ? state.claimed || [] : [];
  const merged = [...carried];
  for (const id of newClaims) {
    if (!merged.includes(id)) merged.push(id);
  }
  return {
    day,
    claimed: merged.filter((id): id is QuestId => Boolean(questById(id))),
  };
}