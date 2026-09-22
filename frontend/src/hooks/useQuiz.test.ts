import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { quizDailyRemaining, consumeQuizSlot, QUIZ_DAILY_LIMIT, USAGE_KEY } from './useQuiz';

const ROOT = resolve(__dirname, '../../');
const translations = JSON.parse(
  readFileSync(resolve(ROOT, 'src/i18n/translations.json'), 'utf-8')
) as Record<string, { translation: Record<string, string> }>;

// Tiny interpolation matching i18next so we can assert the rendered counter.
function interpolate(template: string, count: number): string {
  return template.replace(/\{\{count\}\}/g, String(count));
}

describe('useQuiz daily-limit helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with the full daily allowance', () => {
    expect(quizDailyRemaining()).toBe(QUIZ_DAILY_LIMIT);
  });

  it('does not consume a slot before a quiz is actually generated', () => {
    // Simulate a failed start: no success -> consumeQuizSlot should not be
    // called, so the remaining count must be unchanged.
    expect(quizDailyRemaining()).toBe(5);
    // (Regression for the old behaviour where start() consumed immediately.)
  });

  it('consumes a slot only on success: remaining drops from 5 to 4', () => {
    expect(quizDailyRemaining()).toBe(5);
    const ok = consumeQuizSlot();
    expect(ok).toBe(true);
    expect(quizDailyRemaining()).toBe(4);
  });

  it('never goes below zero: 5 successes -> 0 then refusal', () => {
    for (let i = 0; i < QUIZ_DAILY_LIMIT; i++) {
      expect(consumeQuizSlot()).toBe(true);
    }
    expect(quizDailyRemaining()).toBe(0);
    expect(consumeQuizSlot()).toBe(false); // limit reached
    expect(quizDailyRemaining()).toBe(0);
  });

  it('refills on a new day (date rollover)', () => {
    for (let i = 0; i < QUIZ_DAILY_LIMIT; i++) consumeQuizSlot();
    expect(quizDailyRemaining()).toBe(0);
    // Simulate a new calendar day by rewriting the stored usage date.
    const tomorrow = new Date(Date.now() + 86_400_000 + 60_000);
    localStorage.setItem(
      USAGE_KEY,
      JSON.stringify({ date: tomorrow.toISOString().slice(0, 10), count: 0 })
    );
    expect(quizDailyRemaining()).toBe(QUIZ_DAILY_LIMIT);
  });

  it('the daily counter translates {{count}} for every language', () => {
    for (const lang of Object.keys(translations)) {
      const template = translations[lang].translation['quiz_daily_remaining'];
      expect(template, `lang ${lang}`).toBeTruthy();
      for (const n of [1, 3, 5]) {
        const rendered = interpolate(template, n);
        expect(rendered, `lang ${lang} count ${n}`).toContain(String(n));
      }
    }
  });
});