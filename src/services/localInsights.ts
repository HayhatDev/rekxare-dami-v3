import i18n from '../i18n';
import type { StudyData, ScheduleData, SessionRecord, Task, DayName } from '../types';
import type { DashboardData } from './aiAdvisor';
import { dayKey } from '../utils/sessionLog';

const DAY_NAMES: DayName[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayNameOf(now: Date): DayName {
  return DAY_NAMES[now.getDay()];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isoTs(now: Date, offsetDays: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function minutesOn(log: SessionRecord[], dateKey: string): number {
  return log
    .filter((r) => r.day === dateKey)
    .reduce((acc, r) => acc + ((r.focus_seconds || 0) / 60), 0);
}

export interface WeekDayBar {
  date: string;
  minutes: number;
}

export function weeklyActivity(log: SessionRecord[], now: Date = new Date()): WeekDayBar[] {
  const out: WeekDayBar[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    out.push({ date: dayKey(d), minutes: Number(minutesOn(log, dayKey(d)).toFixed(1)) });
  }
  return out;
}

export interface SubjectFocusEntry {
  subject: string;
  minutes: number;
  lastMinutes: number;
  pct: number;
  trend: 'up' | 'down' | 'stable';
  hours: number;
}

export function subjectFocus(log: SessionRecord[], now: Date = new Date()): SubjectFocusEntry[] {
  const thisStart = isoTs(now, -6);
  const lastStart = isoTs(now, -13);
  const buckets = new Map<string, { cur: number; prev: number }>();
  for (const r of log) {
    const subject = r.subject || 'General';
    const b = buckets.get(subject) || { cur: 0, prev: 0 };
    if (r.day >= thisStart) b.cur += (r.focus_seconds || 0) / 60;
    else if (r.day >= lastStart && r.day < thisStart) b.prev += (r.focus_seconds || 0) / 60;
    buckets.set(subject, b);
  }
  const total = [...buckets.values()].reduce((acc, b) => acc + b.cur, 0);
  return [...buckets.entries()]
    .map<SubjectFocusEntry>(([subject, b]) => {
      const pct = total > 0 ? Math.round((b.cur / total) * 100) : 0;
      const ratio = b.prev > 0 ? b.cur / b.prev : b.cur > 0 ? 2 : 0;
      const trend: SubjectFocusEntry['trend'] = b.cur > 0 && b.prev === 0 ? 'up' : ratio > 1.1 ? 'up' : ratio < 0.9 ? 'down' : 'stable';
      return {
        subject,
        minutes: Math.round(b.cur),
        lastMinutes: Math.round(b.prev),
        pct,
        trend,
        hours: b.cur / 60,
      };
    })
    .filter((e) => e.minutes > 0 || e.lastMinutes > 0)
    .sort((a, b) => b.minutes - a.minutes || b.lastMinutes - a.lastMinutes);
}

function minutesOfDay(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export interface PlanAdherence {
  planned: number;
  done: number;
}

export function planAdherence(
  log: SessionRecord[],
  schedule: ScheduleData | undefined,
  now: Date = new Date()
): PlanAdherence {
  const tasks: Task[] = (schedule && schedule[dayNameOf(now)]) || [];
  const studyTasks = tasks.filter((t) => t.type !== 'break');
  if (studyTasks.length === 0) return { planned: 0, done: 0 };
  const today = dayKey(now);
  let done = 0;
  for (const task of studyTasks) {
    if (task.done) {
      done++;
      continue;
    }
    const startMin = minutesOfDay(task.start);
    const endMin = minutesOfDay(task.end);
    const covered = log.some((r) => {
      if (r.day !== today) return false;
      const d = new Date(r.started_at);
      if (Number.isNaN(d.getTime())) return false;
      const m = d.getHours() * 60 + d.getMinutes();
      if (endMin <= startMin) return m >= startMin || m < endMin;
      return m >= startMin && m < endMin;
    });
    if (covered) done++;
  }
  return { planned: studyTasks.length, done };
}

export interface QuizSubjectEntry {
  subject: string;
  score: number;
  correct: number;
  total: number;
}

export function quizMastery(log: SessionRecord[]): QuizSubjectEntry[] {
  const perSubject = new Map<string, SessionRecord>();
  for (const r of log) {
    if (r.completed && typeof r.quiz_score === 'number') {
      const subject = r.subject || 'General';
      const prev = perSubject.get(subject);
      if (!prev || r.started_at > prev.started_at) perSubject.set(subject, r);
    }
  }
  return [...perSubject.entries()]
    .map(([subject, r]) => ({
      subject,
      score: r.quiz_score as number,
      correct: r.quiz_correct || 0,
      total: r.quiz_total || 0,
    }))
    .sort((a, b) => b.score - a.score);
}

export function buildLocalDashboard(studyData: StudyData, schedule: ScheduleData): DashboardData {
  const log = studyData.session_log || [];
  const now = new Date();
  const t = (key: string, opts?: Record<string, unknown>) => i18n.t(key, opts);

  const hours = studyData.total_seconds / 3600;
  const sessions = studyData.sessions || log.length;
  const streak = studyData.streak || 0;

  const thisStart = isoTs(now, -6);
  const lastStart = isoTs(now, -13);
  const daysStudied = new Set(log.filter((r) => r.day >= thisStart).map((r) => r.day)).size;
  const goalMinutes = (studyData.daily_goal_seconds || 7200) / 60;
  const todayMinutes = Number(minutesOn(log, dayKey(now)).toFixed(1));
  const goalPct = goalMinutes > 0 ? Math.round(Math.min(100, (todayMinutes / goalMinutes) * 100)) : 0;

  const totalThis = log.filter((r) => r.day >= thisStart).reduce((acc, r) => acc + (r.focus_seconds || 0), 0);
  const totalPrev = log.filter((r) => r.day >= lastStart && r.day < thisStart).reduce((acc, r) => acc + (r.focus_seconds || 0), 0);
  const weeklyTrend: DashboardData['weekly_trend'] =
    totalThis > totalPrev * 1.15 ? 'improving' : totalThis < totalPrev * 0.85 ? 'declining' : 'stable';

  const strengths: string[] = [];
  if (daysStudied >= 3) strengths.push(t('local_consistency_strength', { days: daysStudied }));
  if (streak >= 2) strengths.push(t('local_streak_strength', { streak }));
  if (goalPct >= 50) strengths.push(t('local_goal_strength', { pct: goalPct }));

  const weaknesses: string[] = [];
  if (daysStudied < 3) weaknesses.push(t('local_low_consistency', { days: daysStudied }));
  if (goalPct < 50) weaknesses.push(t('local_goal_low', { pct: goalPct }));

  const recommendations: string[] = [t('local_rec_consistency')];
  if (goalMinutes > 0 && todayMinutes < goalMinutes) recommendations.push(t('local_rec_goal'));
  const focus = subjectFocus(log, now);
  if (focus.length <= 1) recommendations.push(t('local_rec_subjects'));

  const score = Math.min(100, Math.round(40 + (daysStudied / 7) * 30 + (goalPct / 100) * 30));

  return {
    summary: t('local_summary', {
      hours: hours.toFixed(1).replace(/\.0$/, ''),
      sessions,
      streak,
    }),
    strengths,
    weaknesses,
    weekly_trend: weeklyTrend,
    subject_breakdown: focus.slice(0, 5).map((e) => ({
      subject: e.subject,
      hours: Number(e.hours.toFixed(1)),
      percentage: e.pct,
      trend: e.trend,
    })),
    recommendations: recommendations.slice(0, 3),
    score,
    isLocal: true,
  };
}