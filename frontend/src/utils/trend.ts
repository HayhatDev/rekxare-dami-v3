import type { DashboardData } from '../services/aiAdvisor';

export type WeeklyTrend = DashboardData['weekly_trend'];

/** i18n label keys per weekly-trend state (trend_up/down/stable exist in every locale). */
export const TREND_LABEL_KEYS: Record<WeeklyTrend, string> = {
  improving: 'trend_up',
  stable: 'trend_stable',
  declining: 'trend_down',
};

export function normalizeWeeklyTrend(trend: WeeklyTrend | undefined | null): WeeklyTrend {
  return trend ?? 'stable';
}

export function weeklyTrendLabelKey(trend: WeeklyTrend | undefined | null): string {
  return TREND_LABEL_KEYS[normalizeWeeklyTrend(trend)];
}