import { chromium } from 'playwright';
import zlib from 'zlib';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173';
const LANGS = ['en', 'ar', 'badini'];
const LOAD_TIMEOUT = 90000;

const NO_TEXT = [
  "couldn't read",
  'لم نتمكن',
  'نەشیا',
  'نەمانتوانی',
  'We couldn',
];
const UNAVAILABLE = [
  "Photo reading isn't available",
  'غير متاحة',
  'خوێندنا وێنەن',
  'خوێندنەوەی وێنە',
];
const IN_PROGRESS = ['Creating your quiz', 'إنشاء اختباراتك', 'تاقیکرنێ چێبکە', 'دروستکردنی تاقیکردنەوە'];

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ~c;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makeWhitePng(w, h) {
  const rowBytes = 1 + w * 4;
  const raw = Buffer.alloc(h * rowBytes);
  for (let y = 0; y < h; y++) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < w; x++) {
      const o = y * rowBytes + 1 + x * 4;
      raw[o] = 255;
      raw[o + 1] = 255;
      raw[o + 2] = 255;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

let failed = false;

function fail(reason) {
  failed = true;
  console.error(`  FAIL: ${reason}`);
}

for (const lang of LANGS) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.addInitScript(
    (lng) => {
      try {
        localStorage.setItem('rekxare_lang', lng);
      } catch {}
    },
    lang
  );

  const violations = [];
  const pageErrors = [];
  const consoleLog = [];
  const page = await context.newPage();
  page.on('console', (msg) => {
    const text = `${msg.type()}: ${msg.text()}`;
    consoleLog.push(text);
    if (/Content Security Policy|Refused to (connect|load|execute|frame|apply|create)/.test(text)) {
      violations.push(text);
    }
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  console.log(`\n[${lang}] loading ${BASE} …`);
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: LOAD_TIMEOUT });
  } catch (e) {
    fail(`page did not load: ${e.message}`);
    await context.close();
    continue;
  }

  const guestButton = page.getByRole('button', { name: /Guest|ضيف|میڤان|میوان/ }).first();
  if ((await guestButton.count()) > 0) {
    await guestButton.waitFor({ timeout: LOAD_TIMEOUT });
    await guestButton.click();
    await page.waitForTimeout(500);
  }

  console.log(`[${lang}] navigating to /quiz …`);
  try {
    await page.goto(`${BASE}/quiz`, { waitUntil: 'networkidle', timeout: LOAD_TIMEOUT });
  } catch (e) {
    fail(`/quiz did not load: ${e.message}`);
    await context.close();
    continue;
  }

  const fileInput = page.locator('input[type="file"]');
  if ((await fileInput.count()) === 0) {
    fail('quiz upload file input not found');
    await context.close();
    continue;
  }

  let touchedTessData = false;
  page.on('response', (res) => {
    if (res.url().includes('/tessdata/') && res.status() === 200) touchedTessData = true;
  });

  console.log(`[${lang}] triggering OCR on a blank image …`);
  await fileInput.setInputFiles({
    name: 'blank.png',
    mimeType: 'image/png',
    buffer: makeWhitePng(240, 240),
  });

  const deadline = Date.now() + LOAD_TIMEOUT;
  let body = '';
  while (Date.now() < deadline) {
    await page.waitForTimeout(750);
    body = (await page.locator('body').innerText().catch(() => '')) || '';
    if (NO_TEXT.some((s) => body.includes(s)) || IN_PROGRESS.some((s) => body.includes(s))) break;
    if (UNAVAILABLE.some((s) => body.includes(s))) break;
  }

  const bodyForCsp = body || (await page.content().catch(() => ''));
  if (UNAVAILABLE.some((s) => bodyForCsp.includes(s))) {
    fail(`OCR init was blocked (photo-unavailable fallback shown)${touchedTessData ? '' : '; no /tessdata/ request observed'}`);
  } else if (!touchedTessData) {
    fail(`tesseract never fetched a self-hosted /tessdata/ asset${body ? `; body tail: ${body.slice(-160)}` : ''}`);
    console.error('  console tail:', consoleLog.slice(-12).join(' | '));
  } else {
    console.log(`[${lang}] OCR assets fetched (${touchedTessData ? '/tessdata/* 200' : 'n/a'}) and init was not blocked.`);
    if (!NO_TEXT.some((s) => bodyForCsp.includes(s)) && !IN_PROGRESS.some((s) => bodyForCsp.includes(s))) {
      console.log('  (no recognize result surfaced yet within timeout — init itself succeeded)');
    }
  }

  if (violations.length) {
    fail(`CSP violations (${violations.length}): ${violations.slice(0, 5).join(' | ')}`);
  } else {
    console.log(`[${lang}] zero CSP violations on console.`);
  }
  if (pageErrors.length) {
    const cspy = pageErrors.filter((e) => /tesseract|wasm|WebAssembly|worker/i.test(e));
    if (cspy.length) fail(`OCR-related page errors: ${cspy.slice(0, 3).join(' | ')}`);
  }

  await context.close();
  await browser.close();
}

if (failed) {
  console.error('\nCSP smoke FAILED');
  process.exit(1);
}
console.log('\nCSP smoke PASSED');