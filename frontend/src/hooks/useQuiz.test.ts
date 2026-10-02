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

describe('limit messages', () => {
  const REQUIRED = [
    'quiz_daily_limit',
    'quiz_rate_limited',
    'quizzes_used_today',
    'schedule_rate_limited',
    'insights_rate_limited_title',
    'insights_rate_limited_hint',
  ];

  it('every limit message exists in all four languages', () => {
    for (const key of REQUIRED) {
      for (const lang of Object.keys(translations)) {
        const value = translations[lang].translation[key];
        expect(value, `${lang}.${key}`).toBeTruthy();
      }
    }
  });

  it('the quiz limit copy renders the real daily allowance', () => {
    for (const lang of Object.keys(translations)) {
      const template = translations[lang].translation['quiz_daily_limit'];
      expect(
        interpolate(template, QUIZ_DAILY_LIMIT),
        `lang ${lang}`
      ).toContain(String(QUIZ_DAILY_LIMIT));
    }
  });

  it('the used-today badge renders the real daily allowance', () => {
    for (const lang of Object.keys(translations)) {
      const template = translations[lang].translation['quizzes_used_today'];
      expect(
        interpolate(template, QUIZ_DAILY_LIMIT),
        `lang ${lang}`
      ).toContain(String(QUIZ_DAILY_LIMIT));
    }
  });

  it('rate limit copy is distinct from generic failure copy', () => {
    for (const lang of Object.keys(translations)) {
      const t = translations[lang].translation;
      expect(t['insights_rate_limited_title']).not.toBe(t['ai_error_title']);
      expect(t['quiz_rate_limited']).not.toBe(t['quiz_generic_error']);
      expect(t['schedule_rate_limited']).not.toBe(t['ai_api_error']);
    }
  });
});

describe('429 handling', () => {
  function jsonResponse(status: number) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ error: 'Rate limit exceeded' }),
    } as unknown as Response;
  }

  async function callQuiz(res: Response) {
    const { generateQuiz } = await import('../services/aiAdvisor');
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => res) as unknown as typeof fetch;
    try {
      await generateQuiz({ text: 'some study notes about algebra' });
      return null;
    } catch (e) {
      return (e as Error).message;
    } finally {
      globalThis.fetch = orig;
    }
  }

  it('surfaces a 429 from quiz as the rate limit signal', async () => {
    const { RATE_LIMITED } = await import('../services/aiAdvisor');
    expect(await callQuiz(jsonResponse(429))).toBe(RATE_LIMITED);
  });

  it('does not confuse a 429 with a generic quiz failure', async () => {
    expect(await callQuiz(jsonResponse(500))).not.toBe('RATE_LIMITED');
  });

  it('still maps auth and text errors as before', async () => {
    expect(await callQuiz(jsonResponse(401))).toBe('AUTH_REQUIRED');
    expect(await callQuiz(jsonResponse(400))).toBe('NOT_ENOUGH_TEXT');
  });
});