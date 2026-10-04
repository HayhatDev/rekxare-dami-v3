import type { StudyData } from '../types';
import { calculateXPLevel, calculateXPProgress } from './rewards';
import { completedFocusSecondsOnDay, dayKey } from './sessionLog';

export interface ShareSummary {
  /** Full shareable block of text (copy / native share body). */
  text: string;
  /** Human-friendly "today" totals, in minutes. */
  todayMinutes: number;
  totalMinutes: number;
  level: number;
  levelProgress: number;
  streak: number;
  sessions: number;
}

type Translate = (key: string, fallback: string) => string;

/** Format minutes into a compact human-readable span, e.g. 120 -> "2h", 75 -> "1h 15m". */
export function formatMinutes(minutes: number): string {
  const m = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/**
 * Build a localized, formatted study-progress summary suitable for sharing
 * (clipboard copy or the native share sheet). Keeps all copy in the app's
 * translation keys so the shared text follows the selected app language.
 */
export function buildShareSummary(
  studyData: Pick<
    StudyData,
    'xp_points' | 'streak' | 'sessions' | 'total_seconds'
  > & { session_log?: StudyData['session_log'] },
  t: Translate,
  appName = 'Rekxare Dami'
): ShareSummary {
  const xp = studyData.xp_points || 0;
  const level = calculateXPLevel(xp);
  const levelProgress = calculateXPProgress(xp);
  // Derived from the log rather than accepting `daily_seconds`, so a shared post
  // can never claim yesterday's total as today's. This text is published
  // publicly, which makes a stale "Today I've studied 2h" the worst place for
  // this value to be wrong.
  const todaySeconds = completedFocusSecondsOnDay(studyData.session_log, dayKey(new Date()));
  const todayMinutes = Math.round(todaySeconds / 60);
  const totalMinutes = Math.round((studyData.total_seconds || 0) / 60);
  const streak = studyData.streak || 0;
  const sessions = studyData.sessions || 0;

  const lines = [
    `${appName}`,
    `${t('share_level', 'Level')} ${level} · ${levelProgress}%`,
    `${t('share_xp', 'XP')} ${xp}`,
    `${t('share_streak', 'Streak')} ${streak}d`,
    `${t('share_today', "Today I've studied")} ${formatMinutes(todayMinutes)}`,
    `${t('share_total', 'Total focus')} ${formatMinutes(totalMinutes)} · ${sessions} ${t('share_sessions', 'sessions')}`,
  ];

  return {
    text: lines.join('\n'),
    todayMinutes,
    totalMinutes,
    level,
    levelProgress,
    streak,
    sessions,
  };
}
