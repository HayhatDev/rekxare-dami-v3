import { chromium } from 'playwright';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const LANGS = ['badini', 'en', 'ar', 'sorani'];
const CYCLE = { en: 'badini', badini: 'ar', ar: 'sorani', sorani: 'en' };
const RTL = ['ar', 'badini', 'sorani'];
const LOAD_TIMEOUT = 120000;

const T = require('../src/i18n/translations.json');
const STATE = {};
for (const lang of LANGS) {
  const d = T[lang].translation;
  STATE[lang] = {
    start: d.start,
    pause: d.pause,
    reset: d.reset,
    signInGoogle: d.sign_in_google,
    langLabels: [d.change_language, d.switch_language].filter(Boolean),
  };
}

// Raw i18n keys that must never surface as visible copy.
const KEY_RE = /(?:trend_[a-z]+|day_(?:mon|tue|wed|thu|fri|sat|sun)|time_[a-z]+|daily_[a-z_]+|weekly_[a-z_]+|change_language|switch_language|skip_to_content|sign_in_google|guest_locked_title)/;

const ALL_LANG_LABELS = LANGS.flatMap((l) => STATE[l].langLabels);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let failed = false;
function fail(reason) {
  failed = true;
  console.error(`  FAIL: ${reason}`);
}

const browser = await chromium.launch();

for (const lang of LANGS) {
  const st = STATE[lang];
  console.log(`\n=== [${lang}] guest smoke ===`);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(
    (l) => {
      try {
        localStorage.setItem('rekxare_lang', l);
        localStorage.setItem('rekxare_guest_mode', 'true');
      } catch {}
    },
    lang
  );

  const pageErrors = [];
  const consoleErrs = [];
  const cspViolations = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    const text = m.text();
    if (m.type() === 'error') consoleErrs.push(text);
    if (/Content Security Policy|Refused to (connect|load|execute|frame|apply|create)/.test(text)) {
      cspViolations.push(text);
    }
  });

  const meta = () => page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir }));

  // ---- Timer home: start / pause / reset ----
  console.log(`  / timer start-pause-reset …`);
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: LOAD_TIMEOUT });
  const startBtn = page.getByRole('button', { name: st.start, exact: true }).first();
  await startBtn.waitFor({ timeout: LOAD_TIMEOUT });

  let m = await meta();
  if (m.lang !== lang) fail(`html[lang]=${m.lang}, expected ${lang}`);
  const wantDir = RTL.includes(lang) ? 'rtl' : 'ltr';
  if (m.dir !== wantDir) fail(`html[dir]=${m.dir}, expected ${wantDir}`);

  let body = await page.locator('body').innerText().catch(() => '');
  if (KEY_RE.test(body)) fail(`raw key leaked on /: ${body.match(KEY_RE)[0]}`);

  await startBtn.click();
  await page.getByRole('button', { name: st.pause, exact: true }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(3200);
  const pauseBtn = page.getByRole('button', { name: st.pause, exact: true }).first();
  await pauseBtn.click();
  await page.getByRole('button', { name: st.start, exact: true }).first().waitFor({ timeout: 10000 });
  await page.getByRole('button', { name: st.reset, exact: true }).first().click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(800);

  const langBtn = page.getByRole('button', { name: new RegExp(st.langLabels.map(esc).join('|')) }).first();
  await langBtn.waitFor({ timeout: 10000 });
  const langClick = () =>
    page.evaluate((labels) => {
      const btn = Array.from(document.querySelectorAll('button')).find((b) => labels.includes(b.getAttribute('aria-label')));
      if (!btn) return false;
      btn.click();
      return true;
    }, ALL_LANG_LABELS);

  // ---- Language cycle through all 4 locales on the live UI ----
  let seq = lang;
  for (let i = 0; i < 3; i++) {
    seq = CYCLE[seq];
    const clicked = await langClick();
    if (!clicked) fail(`lang button not clickable for ${lang} (cycle step ${i + 1})`);
    await page.waitForTimeout(400);
    m = await meta();
    if (m.lang !== seq) fail(`cycle step ${i + 1}: html[lang]=${m.lang}, expected ${seq}`);
    const wantDirS = RTL.includes(seq) ? 'rtl' : 'ltr';
    if (m.dir !== wantDirS) fail(`cycle step ${i + 1}: html[dir]=${m.dir}, expected ${wantDirS}`);
    body = await page.locator('body').innerText().catch(() => '');
    if (KEY_RE.test(body)) fail(`raw key leaked after cycle to ${seq}: ${body.match(KEY_RE)[0]}`);
  }

  const locked = async (path) => {
    console.log(`  ${path} (guest-locked) …`);
    await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: LOAD_TIMEOUT });
    await page.getByRole('button', { name: st.signInGoogle, exact: true }).first().waitFor({ timeout: LOAD_TIMEOUT });
    body = await page.locator('body').innerText().catch(() => '');
    if (body.trim().length < 10) fail(`${path} rendered empty`);
    if (KEY_RE.test(body)) fail(`raw key leaked on ${path}: ${body.match(KEY_RE)[0]}`);
  };

  await locked('/schedule');
  await locked('/insights');

  console.log(`  /quiz (upload surface) …`);
  await page.goto(`${BASE}/quiz`, { waitUntil: 'load', timeout: LOAD_TIMEOUT });
  const fileInput = page.locator('input[type="file"]');
  try {
    await fileInput.first().waitFor({ state: 'attached', timeout: LOAD_TIMEOUT });
  } catch {
    fail('/quiz file input not found');
  }

  if (pageErrors.length) fail(`page errors (${pageErrors.length}): ${pageErrors.slice(0, 5).join(' | ')}`);
  const benign = /Failed to load resource|net::(?:ERR_|ABORTED)|PR_CONNECT_RESET|404|aborted/i;
  const realErrs = consoleErrs.filter((e) => !benign.test(e));
  if (realErrs.length) fail(`console errors (${realErrs.length}): ${realErrs.slice(0, 5).join(' | ')}`);
  if (cspViolations.length) fail(`CSP violations (${cspViolations.length}): ${cspViolations.slice(0, 5).join(' | ')}`);

  await context.close();
}

await browser.close();

if (failed) {
  console.error('\nE2E smoke FAILED');
  process.exit(1);
}
console.log('\nE2E smoke PASSED');