import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../..');
const translations = JSON.parse(
  readFileSync(resolve(ROOT, 'src/i18n/translations.json'), 'utf-8')
) as Record<string, Record<string, unknown>>;

const languages = Object.keys(translations);

/** Flattens nested groups (e.g. `subjects`) into dotted leaf keys. */
function leaves(node: unknown, prefix = ''): Array<[string, unknown]> {
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([key, value]) =>
    value && typeof value === 'object'
      ? leaves(value, `${prefix}${key}.`)
      : [[`${prefix}${key}`, value]] as Array<[string, unknown]>
  );
}

const englishLeaves = new Map(leaves(translations.en.translation));
const englishKeys = [...englishLeaves.keys()].sort();

// The save/sync toasts added with the unsaved-work reliability work. A student
// who cannot store their schedule or finish a session has to be told in their
// own language, so these are asserted explicitly rather than left to key parity.
const SAVE_ERROR_KEYS = [
  'session_save_error_title',
  'session_save_error_desc',
  'schedule_save_error_title',
  'schedule_save_error_desc',
  'schedule_save_failed_title',
  'schedule_save_failed_desc',
];

describe('translations', () => {
  it('covers the four supported languages', () => {
    expect([...languages].sort()).toEqual(['ar', 'badini', 'en', 'sorani']);
  });

  it('keeps every message under the translation namespace', () => {
    // i18next resolves nested keys, so a message parked at the language root is
    // never looked up: it renders as the raw key at runtime while still looking
    // present when counting keys in the file.
    for (const lang of languages) {
      expect(Object.keys(translations[lang]).sort()).toEqual(['translation']);
    }
  });

  it('defines the same leaf keys in every language', () => {
    for (const lang of languages) {
      const keys = leaves(translations[lang].translation).map(([key]) => key).sort();
      expect(keys, `leaf keys differ in ${lang}`).toEqual(englishKeys);
    }
  });

  it('has no empty message', () => {
    for (const lang of languages) {
      const empty = leaves(translations[lang].translation)
        .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
        .map(([key]) => key);
      expect(empty, `empty messages in ${lang}`).toEqual([]);
    }
  });

  it('translates the unsaved-work warnings in every language', () => {
    for (const lang of languages) {
      const messages = new Map(leaves(translations[lang].translation));
      for (const key of SAVE_ERROR_KEYS) {
        expect(messages.get(key), `missing or empty ${lang}.${key}`).toBeTruthy();
      }
    }
  });

  it('does not reuse one language string for another language', () => {
    // A copy-paste that leaves English text in the Kurdish or Arabic file passes
    // every other check here, so the two RTL locales are compared explicitly.
    for (const lang of ['ar', 'badini', 'sorani'] as const) {
      const messages = new Map(leaves(translations[lang].translation));
      const untranslated = SAVE_ERROR_KEYS.filter((key) => messages.get(key) === englishLeaves.get(key));
      expect(untranslated, `${lang} still shows English for: ${untranslated.join(', ')}`).toEqual([]);
    }
  });
});