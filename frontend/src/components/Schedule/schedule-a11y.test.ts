import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

const VARIANTS = [
  'ClaySchedule.tsx',
  'ClaritySchedule.tsx',
  'ForestSchedule.tsx',
  'MountainSchedule.tsx',
  'NightSkySchedule.tsx',
  'OceanSchedule.tsx',
];

const readVariant = (name: string) =>
  read(`src/components/Schedule/variants/${name}`);

describe('Schedule a11y wiring', () => {
  it('skip link has a real in-page target (#main-content)', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/href="#main-content"/);
    expect(app).toMatch(/id="main-content"/);
    expect(app).toMatch(/tabIndex=\{-1\}/);
  });

  it('html lang attribute is kept in sync with the picker', () => {
    const store = read('src/stores/useLangStore.ts');
    const init = read('src/hooks/useInitApp.ts');
    expect(store).toMatch(/document\.documentElement\.lang = safe/);
    expect(init).toMatch(/document\.documentElement\.lang = lang/);
  });

  it('global :focus-visible rule exists and overrides outline-none', () => {
    const css = read('src/index.css');
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 2px solid hsl(var(--ring))');
  });

  it('start_time/end_time access keys exist in every language', () => {
    const translations = JSON.parse(
      read('src/i18n/translations.json')
    ) as Record<string, { translation: Record<string, string> }>;
    for (const lang of Object.keys(translations)) {
      expect(translations[lang].translation, `${lang} start_time`).toHaveProperty(
        'start_time'
      );
      expect(translations[lang].translation, `${lang} end_time`).toHaveProperty(
        'end_time'
      );
    }
  });

  it.each(VARIANTS.map(n => [n]))(
    '%s: modal is focus-trapped, chips are toggles, time inputs are labeled',
    (name) => {
      const src = readVariant(name);

      expect(src, 'useFocusTrap imported').toMatch(
        /import \{[^}]*useFocusTrap[^}]*\} from '\.\.\/\.\.\/\.\.\/hooks\/useFocusTrap'/
      );
      expect(src, 'stable close handler').toMatch(
        /const closeAiModal = useCallback\(\(\) => setIsAiModalOpen\(false\), \[\]\);/
      );
      expect(src, 'trap ref created').toMatch(
        /const modalRef = useFocusTrap\(isAiModalOpen, closeAiModal\);/
      );
      expect(src, 'dialog receives trap ref').toMatch(/ref=\{modalRef\}/);

      const pressedCount = (src.match(/aria-pressed=\{/g) ?? []).length;
      expect(pressedCount, `${name} chips/toggles aria-pressed`).toBeGreaterThanOrEqual(
        3
      );

      expect(src, 'start input labeled').toMatch(
        /<input type="time"[\s\S]*?aria-label=\{t\('start_time'\)\}/
      );
      expect(src, 'end input labeled').toMatch(
        /<input type="time"[\s\S]*?aria-label=\{t\('end_time'\)\}/
      );
    }
  );
});