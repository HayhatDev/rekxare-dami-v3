import type { SessionRecord } from '../types';

export const MIN_ABANDON_SECONDS = 60;
export const MAX_LOG_ENTRIES = 200;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let _seq = 0;
function makeId(day: string, ts: number): string {
  _seq = (_seq + 1) % 100000;
  return `${day}-${ts.toString(36)}-${_seq.toString(36)}`;
}

export function buildSessionRecord(opts: {
  startedAt: string;
  day: string;
  subject: string;
  plannedMinutes: number;
  focusSeconds: number;
  completed: boolean;
}): SessionRecord {
  return {
    id: makeId(opts.day, Date.now()),
    started_at: opts.startedAt,
    day: opts.day,
    subject: opts.subject,
    planned_minutes: opts.plannedMinutes,
    focus_seconds: opts.focusSeconds,
    completed: opts.completed,
  };
}

export function appendSessionRecord(
  log: SessionRecord[] | undefined,
  record: SessionRecord,
  cap = MAX_LOG_ENTRIES
): SessionRecord[] {
  const next = [...(log || []), record];
  return next.length > cap ? next.slice(next.length - cap) : next;
}

export interface SessionLogStats {
  total: number;
  completed: number;
  abandonCount: number;
  completionRate: number;
  todaySeconds: number;
  todayCount: number;
  todayCompleted: number;
  todayAbandoned: number;
  recent: SessionRecord[];
}

export function sessionLogStats(
  log: SessionRecord[] | undefined,
  now: Date = new Date()
): SessionLogStats {
  const list = log || [];
  const today = dayKey(now);
  const total = list.length;
  const completed = list.filter((r) => r.completed).length;
  const todayRecords = list.filter((r) => r.day === today);
  const todaySeconds = todayRecords.reduce((acc, r) => acc + (r.focus_seconds || 0), 0);
  const todayCompleted = todayRecords.filter((r) => r.completed).length;
  const todayAbandoned = todayRecords.length - todayCompleted;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const recent = [...list].reverse().slice(0, 6);
  return {
    total,
    completed,
    abandonCount: total - completed,
    completionRate,
    todaySeconds,
    todayCount: todayRecords.length,
    todayCompleted,
    todayAbandoned,
    recent,
  };
}

export function formatMinutes(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${h}h`;
}