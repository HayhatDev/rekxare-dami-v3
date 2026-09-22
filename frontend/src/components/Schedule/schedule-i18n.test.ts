import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DAYS_OF_WEEK, DAY_I18N_KEYS } from '../../utils/constants';

const ROOT = resolve(__dirname, '../../../');
const translations = JSON.parse(
  readFileSync(resolve(ROOT, 'src/i18n/translations.json'), 'utf-8')
) as Record<string, { translation: Record<string, string> }>;

const VARIANTS = [
  'ClaySchedule.tsx',
  'ClaritySchedule.tsx',
  'ForestSchedule.tsx',
  'MountainSchedule.tsx',
  'NightSkySchedule.tsx',
  'OceanSchedule.tsx',
];

const readVariant = (name: string) =>
  readFileSync(resolve(ROOT, `src/components/Schedule/variants/${name}`), 'utf-8');

describe('Schedule translations', () => {
  const langs = Object.keys(translations);

  it('all locale key sets are identical for schedule keys', () => {
    const base = new Set(Object.keys(translations[langs[0]].translation));
    for (const lang of langs) {
      const keys = new Set(Object.keys(translations[lang].translation));
      expect([...base].filter(k => !keys.has(k))).toEqual([]);
      expect([...keys].filter(k => !base.has(k))).toEqual([]);
    }
  });

  it('short + full day keys and time-slot keys exist in every language', () => {
    for (const lang of langs) {
      const dict = translations[lang].translation;
      for (const day of DAYS_OF_WEEK) {
        expect(dict, `${day} short (${lang})`).toHaveProperty(DAY_I18N_KEYS[day]);
        expect(dict, `${day} full (${lang})`).toHaveProperty(`day_${day.toLowerCase()}`);
      }
      for (const slot of ['any', 'morning', 'afternoon', 'evening']) {
        expect(dict, `slot ${slot} (${lang})`).toHaveProperty(slot);
      }
      expect(dict).toHaveProperty('tasks_for_day');
      expect(dict).toHaveProperty('no_tasks');
    }
  });

  it('shorthand day keys actually are abbreviated (<=4 chars) in arabic-script locales', () => {
    for (const lang of ['badini', 'sorani', 'ar']) {
      const dict = translations[lang].translation;
      for (const day of DAYS_OF_WEEK) {
        const short = dict[DAY_I18N_KEYS[day]];
        expect(short.length, `${day} short in ${lang}`).toBeLessThanOrEqual(4);
      }
    }
  });

  it('variants no longer leak english-only day/slot keys', () => {
    for (const name of VARIANTS) {
      const src = readVariant(name);
      expect(src, `time_* in ${name}`).not.toMatch(/t\(`time_\$\{/);
      expect(src, `english slice(0,3) in ${name}`).not.toMatch(/\.slice\(0, 3\)/);
      expect(src, `raw selectedDay interpolation in ${name}`).not.toMatch(
        /\{ day: selectedDay \}/
      );
    }
  });
});