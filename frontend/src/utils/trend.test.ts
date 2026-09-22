import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeWeeklyTrend, weeklyTrendLabelKey, TREND_LABEL_KEYS } from './trend';

const ROOT = resolve(__dirname, '../../');
const translations = JSON.parse(
  readFileSync(resolve(ROOT, 'src/i18n/translations.json'), 'utf-8')
) as Record<string, { translation: Record<string, string> }>;

describe('weekly trend helpers', () => {
  it('keeps a valid trend unchanged and defaults missing values to stable', () => {
    expect(normalizeWeeklyTrend('improving')).toBe('improving');
    expect(normalizeWeeklyTrend('declining')).toBe('declining');
    expect(normalizeWeeklyTrend('stable')).toBe('stable');
    expect(normalizeWeeklyTrend(undefined)).toBe('stable');
    expect(normalizeWeeklyTrend(null)).toBe('stable');
  });

  it('maps every trend state to an existing i18n label key', () => {
    expect(weeklyTrendLabelKey('improving')).toBe('trend_up');
    expect(weeklyTrendLabelKey('stable')).toBe('trend_stable');
    expect(weeklyTrendLabelKey('declining')).toBe('trend_down');
    expect(weeklyTrendLabelKey(undefined)).toBe('trend_stable');
  });

  it('resolves every trend label to a non-empty string in all locales', () => {
    for (const lang of Object.keys(translations)) {
      const dict = translations[lang].translation;
      for (const key of Object.values(TREND_LABEL_KEYS)) {
        expect(dict[key], `${key} (${lang})`).toBeTruthy();
      }
    }
  });
});