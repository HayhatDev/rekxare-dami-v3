# Blueprint — Rekxare Dami v3: "Fix Everything" Audit Remediation

Planned: 2026-09-20 · Repo: `HayhatDev/rekxare-dami-v3` (main) · Mode: branch-based (git + gh available)

## Objective

Remediate every verified critical/high/medium finding from the full audit. No new features outside the audit scope. Each step is one PR-sized unit.

Stack notes for every agent:
- Frontend: `frontend/` Vite + React 18 + TS + Tailwind v4. Package manager: `pnpm`.
  - Verify: `pnpm typecheck`, `pnpm build`, `pnpm test` (vitest), `pnpm dev`.
- Backend: `backend/` FastAPI + Supabase (frontend uses **anon key directly** for `study_data`/`user_prefs`; backend service-role for `schedules` + AI). Requirements in `backend/requirements.txt` (no pytest installed — do not assume).
- Language keys live in `frontend/src/i18n/translations.json`, shape `{ lang: { translation: { ... } } }`, langs `badini|en|ar|sorani`. Currently **341 identical keys per lang**.
- Console on this machine is cp1252 — prefix Python with `$env:PYTHONIOENCODING='utf-8'`. PowerShell 5.1; no `&&` in inline commands.

## Dependency graph

```
1 (i18n keys) ──► 2 (Schedule UI localization) ──► 8 (a11y: same variant files)
1 ──► 9 (Insights trend badge + timer)
3 (AI day keys) ── independent lane
4 (Quiz) ── independent lane
5 (OCR/CSP) ── independent lane
6 (JWT hardening) ── independent lane
7 (RLS SQL) ── independent lane
```

Parallel lanes (no shared files): **Lane A** = [1 → 2 → 8], **Lane B** = 3, **Lane C** = 4, **Lane D** = 5, **Lane E** = 6, **Lane F** = 7, **Lane G** = 9 (9 needs 1 merged first for `trend_*` values).

Merge order: any order per lane; 1 → before 2, 8, 9. Lanes B–G may merge in any order.

## Global invariants (verify at every step)

- `pnpm typecheck` passes in `frontend/`.
- `backend` imports cleanly (`python -c "import app.main"` needs env for service key — use `python -m compileall app`) without new runtime deps unless listed.
- No real secrets/keys added to tracked files (`.env*` remain gitignored; only `.example` files are tracked).
- All 4 languages stay key-identical (run the compare script from Step 1).
- No commit without running the step's Verification block.

## Plan mutation protocol

- To **skip** a step: state the reason + exit criteria it can't satisfy, mark `[SKIPPED]` in header, keep file.
- To **split** one: sub-steps inherit the parent's number with letters (e.g. `1a`, `1b`), each self-contained.
- To **insert** one: use the next free two-digit number; update the dependency graph.
- To **abandon**: delete its Tasks, set exit criteria to "none", note why. Never partially complete a step and merge it.

---

## Step 1 — Add missing i18n keys to all 4 languages (foundation)

**Lane:** A · **Order:** first · **Tier:** default · **Recommended skills:** `coding-standards`, `python-testing` (for the compare script only)

**Purpose:** Rest-day chips show raw `day_mon`…, time chips fall back to English, Insights renders raw `trend_*` keys, and the day switcher hardcodes English abbreviations. Root cause: missing keys in `translations.json`.

**Context brief:** `frontend/src/utils/constants.ts` defines `DAY_I18N_KEYS` mapping each English day (`Monday`…) to `day_mon…day_sun` (missing → raw key shown). Variants call `t(\`time_${time}\`, englishDefault)` (`time_any/morning/afternoon/evening` missing → English fallback). `Insights.tsx:~280` calls `t(\`trend_${weekly_trend}\`)` (`trend_up/down/stable` missing → raw key). Existing translation style: flat keys, singular words plain (e.g. `"home": "ماڵە"`); weekday names should be proper nouns in each language.

**Files:** `frontend/src/i18n/translations.json` (only file touched)

**Verification-first (write test):** create `scripts/check-i18n-keys.py` (temp/plans ok, or `frontend/scripts/`) that loads `translations.json`, asserts every lang has exactly the same key set, and asserts the new keys exist in all 4. Fail = non-zero exit.

**Tasks:**
1. Read `frontend/src/i18n/translations.json` + `frontend/src/utils/constants.ts` + `frontend/src/pages/Insights.tsx` around line 280 to lock exact key names in use (`DAY_I18N_KEYS` values; `time_*`; `trend_*`).
2. Add to **all 4 langs**, preserving existing structure/style:
   - Full day names: `day_monday`, `day_tuesday`, `day_wednesday`, `day_thursday`, `day_friday`, `day_saturday`, `day_sunday`.
   - Short/abbreviation day names matching switcher intent: reuse existing `DAY_I18N_KEYS` names `day_mon`, `day_tue`, `day_wed`, `day_thu`, `day_fri`, `day_sat`, `day_sun` (badini: شە، سێ، چار، پێن، ئێن، شەم، یەک — confirm with docs/translations target audience; match existing Kurdish spelling conventions for weekdays already used elsewhere in the file).
   - Time slots: `time_any`, `time_morning`, `time_afternoon`, `time_evening`.
   - Trends: `trend_up`, `trend_down`, `trend_stable`.
3. Create `scripts/check-i18n-keys.py` (compare all langs + assert new keys present), wire it to run in verification only (do NOT add a runtime dep).
4. Run the script + `pnpm typecheck` + `pnpm test`.

**Verification commands:**
```powershell
$env:PYTHONIOENCODING='utf-8'; python scripts/check-i18n-keys.py
pnpm typecheck
pnpm test
```

**Exit criteria:** All 4 langs contain every new key; key sets are identical across langs; `pnpm typecheck`/`test` green. No UI code changed in this step.

---

## Step 2 — Localize Schedule page: day switcher, rest-day chips, time chips, day headings

**Lane:** A · **Order:** after 1 · **Tier:** default · **Recommended skills:** `react-patterns`, `frontend-a11y`, `react-testing`

**Purpose:** Schedule page currently shows English day abbreviations and raw/missing-key text in every language.

**Context brief:** Six variants under `frontend/src/components/Schedule/variants/*.tsx` each contain:
- Day switcher: `DAYS_OF_WEEK.map((day) => <button …>{day.slice(0, 3)}</button>)` → replace with localized short name. Anchor lines: Clay 127/135, Clarity 137/145, Forest 133/141, Mountain 123/131, NightSky 149/157, Ocean 130/138 (grep `slice(0, 3)` to confirm in each).
- Rest-day chips: `t(DAY_I18N_KEYS[day])` → use full names `t(\`day_${day.toLowerCase()}\`)`. Anchors: Clay ~307, Forest ~269, NightSky ~289 area; grep `DAY_I18N_KEYS`.
- Time-preference chips: `t(\`time_${time}\`, 'any'|'morning'|…)` → `t(\`time_${time}\`)`. Anchors: Clay ~296, Forest ~254, Ocean ~249, NightSky ~289, Mountain ~240; grep `time_\$`.
- Day-section headings use `tasks_for_day` with `{day}` — pass the **localized full name** (`t(\`day_${day.toLowerCase()}\`)`) instead of the English `day` from `DAYS_OF_WEEK`.
- `frontend/src/utils/constants.ts`: update `DAY_I18N_KEYS` comment/usage only if needed (rest-day chips switch to `day_${day.toLowerCase()}` full-name keys); keep or repoint `DAY_I18N_KEYS` for the switcher short names — do not leave any key unreferenced that is now dead.

Verification-first: add/extend `frontend/src/components/Schedule/schedule-i18n.test.tsx` (vitest + react-i18next mocked or real) asserting: switcher button text for `Monday` equals the lang's short value, rest-day chip text equals full value, no rendered text contains `day_`/`time_`/`Monday`/`Mon`.

**Files:** `frontend/src/utils/constants.ts`, the 6 Schedule variants, `frontend/src/components/Schedule/*.tsx` (as needed for headings), new test file.

**Tasks:**
1. grep `slice(0, 3)`, `DAY_I18N_KEYS`, `time_${`, and `tasks_for_day` across `frontend/src` to enumerate every site (match all 6 variants + ClaySchedule etc.).
2. Apply localized short names for switcher, localized full names for rest-day chips + section headings, localized time labels.
3. Ensure no raw English weekday or `day_/time_` key string can render (add defensive `t(key)` that throws/fallback visible only in dev — prefer `t(key)` without default so gaps surface in dev).
4. Add the vitest test; run it.

**Verification commands:**
```powershell
pnpm typecheck
pnpm test
pnpm build
```

**Exit criteria:** Switching langs on the Schedule page shows localized days/times in all 6 themes; tests green; `grep` confirms zero remaining `slice(0, 3)` and zero `t(DAY_I18N_KEYS` bare calls.

---

## Step 3 — Make AI always emit canonical English day keys + normalize on ingest

**Lane:** B · **Order:** any · **Tier:** strongest · **Recommended skills:** `python-testing`, `security-reviewer`, `ai-first-engineering`

**Purpose:** AI told to "respond in Kurdish/Arabic" often localizes the JSON day keys; the app only understands `Monday…Sunday`, so days silently vanish.

**Context brief:** `backend/app/routes/ai.py`:
- `LANG_INSTRUCTIONS` (`ai.py:26-31`) says "بە بادینی وەڵام بدەوە…" / "أجب بالعربية."
- `build_generate_prompt` (`ai.py:228-311`) injects it at `ai.py:265` but **never pins the JSON keys**, and the JSON template at `ai.py:291-299` uses English keys.
- Response handling in the same file (schedule branch ~`ai.py:572-582`): `parsed = json.loads(...)`, `parsed.pop("explanation")`, returns everything else as `schedule`. No key validation.
- `schedule.py:22-29`: `DaySchedule` Pydantic with only English fields; unknown keys dropped on POST/POST-merge.
- Frontend `frontend/src/services/scheduleAI.ts:24-27`: offline fallback matches rest days against English `WEEK`.

Verification-first (`backend/tests/test_schedule_keys.py`): import `_normalize_day_keys` (or equivalent) and assert (a) localized keys `["الاثنين", "دووشەممە"…]` map onto correct English days, (b) garbage keys are ignored, (c) English passthrough unchanged. Needs pytest — add dev-only `backend/requirements-dev.txt` with `pytest`, `pytest-asyncio`, `httpx` (httpx already present).

**Tasks:**
1. In `build_generate_prompt`, add an explicit rule (before the JSON template): "The JSON property keys must always be the exact English strings `Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday`. Never translate the keys — only the task names and explanation may be in the student's language."
2. Add `_normalize_day_keys(raw: dict) -> dict` in `ai.py` (or `routes/schedule.py` if shared): accept English keys as-is; map known localized spellings (Arabic weekdays, Kurdish/Cyrillic/CJK best-effort via a curated map) onto English; drop unknown keys; always output all 7 English keys.
3. Apply it in the schedule-generate branch before returning, AND on `DaySchedule` POST: add a Pydantic `@model_validator(mode="before")` in `schedule.py` that runs `_normalize_day_keys` so already-saved/other-client payloads are cleaned.
4. Frontend `scheduleAI.ts`: normalize `rest_days`/result keys defensively (lowercase English alias set) before `buildLocalSchedule` matching; keep server result as-is otherwise.
5. Add `backend/tests/test_schedule_keys.py`; wire `backend/requirements-dev.txt`.

**Verification commands:**
```powershell
pip install -r backend/requirements-dev.txt
$env:PYTHONIOENCODING='utf-8'; python -m pytest backend/tests -q
python -m compileall backend/app
pnpm typecheck
```

**Exit criteria:** `test_schedule_keys.py` green; schedule-generate returns exactly 7 English day keys regardless of `lang`; POST `/api/schedule/me` coerces localized day keys; frontend offline rest-day matching uses canonical names.

---

## Step 4 — Quiz: daily-limit refund on failure + localized counter

**Lane:** C · **Order:** any · **Tier:** default · **Recommended skills:** `react-testing`, `react-patterns`

**Purpose:** (a) `useQuiz.ts:77-80` consumes a daily slot before the API call, burning openings on failures. (b) `QuizUpload.tsx:138` renders `{5} quiz generations left today` in English with literal braces.

**Context brief:** `frontend/src/hooks/useQuiz.ts`: `consumeQuizSlot()` (`:35-49`) increments `localStorage['rekxare_quiz_usage']` at `start()` before `generateQuiz`. `quizDailyRemaining()` (`:23-33`) computes the countdown. `QuizUpload.tsx:138`:
```tsx
t('quiz_daily_remaining', '{count} quiz generations left today').replace('{count}', String(remaining))
```
The key exists in translations as `{{count}} …` (i18next interpolation) but is never used because a default is always passed; `.replace` targets `{count}` not `{{count}}`.

**Tasks:**
1. In `QuizUpload.tsx:138`, use proper interpolation without `.replace`:
   `t('quiz_daily_remaining', { count: remaining, defaultValue: '{{count}} quiz generations left today' })`.
2. In `useQuiz.ts`: move `consumeQuizSlot()` to **after** a successful `generateQuiz`, still gating on `quizDailyRemaining() === 0` up-front for the early `DAILY_LIMIT` UX. On catch, do **not** consume. Keep the shared-tabs semantics of the helper (it is a pure function — add unit coverage).
3. Add/extend `frontend/src/hooks/useQuiz.test.ts` (function-level, no DOM): assert remaining stays `5` after a failed start and drops to `4` after success; assert the `quiz_daily_remaining` interpolation renders the number for each lang (via `i18next.t` with `count`).
4. Ensure `localStorage` in tests is fresh per test (reset before each).

**Verification commands:**
```powershell
pnpm typecheck
pnpm test
pnpm build
```

**Exit criteria:** Counter shows localized string with correct number in all 4 langs; slot consumed only on success; tests green.

---

## Step 5 — Fix OCR (photo-quiz) behind CSP

**Lane:** D · **Order:** any · **Tier:** strongest · **Recommended skills:** `browser-qa`, `security-review` (CSP interplay), `frontend-patterns`

**Purpose:** Photo-quiz OCR is broken in production: the CSP in `frontend/index.html:15` (`script-src 'self'`, no `worker-src`/`blob:`) blocks tesseract.js v7, which by default loads a worker+core from a CDN and needs blob workers/wasm.

**Context brief:** `frontend/index.html:15` CSP meta. `frontend/src/utils/ocr.ts:17-34` lazy-imports `tesseract.js` and calls `createWorker`. `frontend/src/components/Quiz/QuizUpload.tsx` shows a generic error on failure. Deployment is Cloudflare Pages (static `dist/`); Vite injects `__CONNECT_SRC__` at build (`frontend/vite.config.ts` `buildConnectSrc`).

**Approach (pick ONE, document the choice in the PR):**
- **Option A (recommended): self-host worker/core.** Bundle tesseract assets locally:
  `import workerURL from 'tesseract.js/dist/worker.min.js?url'` + core wasm from `tesseract.js-core` via `?url`, pass `workerPath`, `corePath`, `langPath: <same-origin traineddata>` to `createWorker`. Then CSP changes: add `worker-src 'self' blob:;` and confirm `script-src 'self'` stays (worker is same-origin). Do NOT add `'unsafe-eval'` unless tesseract-core requires it on this platform — verify via a preview build + Playwright.
- **Option B:** keep CDN worker and allowlist: `script-src 'self' https://cdn.jsdelivr.net; worker-src 'self' https://cdn.jsdelivr.net blob:;`.
- Add an in-app fallback: if OCR init fails at runtime, surface a translated "photo not supported — paste text instead" message instead of a bare generic error.

Verification-first: after implementing, run a production build (`pnpm build`) then `vite preview` + a Playwright smoke (**fresh browser context**, console error listener asserting zero CSP violations) that loads the Quiz upload view in 3 langs.

**Files:** `frontend/index.html`, `frontend/vite.config.ts` (only if connect-src needs the same-origin asset host), `frontend/src/utils/ocr.ts`, `frontend/src/components/Quiz/QuizUpload.tsx`, HTML lang meta if touched.

**Tasks:**
1. Decide A vs B above; implement the chosen worker/core/language loading.
2. Update CSP directives minimally (add `worker-src 'self' blob:`; Option B adds the CDN host). Never weaken `default-src 'none'` or allow `'unsafe-inline'` for scripts.
3. Add the graceful in-app OCR fallback path.
4. Write/adapt the Playwright CSP-violation smoke (reuse existing `frontend` playwright setup if present — check `frontend/tests` or `e2e` dir first).

**Verification commands:**
```powershell
pnpm build
npx vite preview --port 4173   # then run the Playwright smoke
pnpm typecheck
```

**Exit criteria:** No CSP violations for `tesseract.js` in a fresh production-ish context; photo upload either OCRs or shows the translated fallback; `script-src` remains `'self'`+allowlist only.

---

## Step 6 — Harden JWT verification (alg/iss binding)

**Lane:** E · **Order:** any · **Tier:** strongest · **Recommended skills:** `security-reviewer`, `python-testing`

**Purpose:** `backend/app/utils/auth.py` trusts the attacker-controlled `alg` header, falls back from RS/ES to **HS256 with the static `SUPABASE_JWT_SECRET`**, and never validates `iss`.

**Context brief:** `auth.py`:
- `decode_token` (`:59-111`): `alg = header.get('alg')` → if RS/ES-family, JWKS verify; **anything else** (including `HS256`, `none`, or unknown) falls through to HS256-with-secret at `:96-104`. `kid` mostly trusted (`:69-72`).
- `:73-78` sets `audience="authenticated"` but **no `iss` check**.
- No JWKS `kid`→algorithm-family cross-check.
- `backend/.env` holds `SUPABASE_JWT_SECRET` in cleartext (not committed — gitignored, but treat as sensitive; recommend rotating to a dedicated long random value if HS256 path must stay).

Verification-first (`backend/tests/test_auth.py`, pytest + `pytest-asyncio`; fixture overrides `SUPABASE_URL`/`SUPABASE_JWT_SECRET` env and monkeypatches `_fetch_jwks`):
- A token whose header says `alg: HS256` but lacking a matching `kid`/iss → **rejected**, never verified with the static secret, when it claims an issuer ≠ Supabase.
- `alg: none` → rejected (header pinning).
- RS256 token with valid JWKS signature + correct `iss`/`aud` → accepted.
- Token signed with the leaked-style static secret but wrong `iss` → rejected.

**Tasks:**
1. Pin acceptable algorithms to the JWKS key family: for RS/ES keys accept only `RS256|RS384|RS512` / `ES256|ES384|ES512` **and** require `kid` present and matching a JWKS key of that family; else reject.
2. Remove the implicit "any non-RS/ES alg ⇒ HS256" fall-through. Keep HS256 ONLY when `SUPABASE_JWT_SECRET` is set to a dedicated strong secret, and still require `iss`/`aud`.
3. Add `iss` validation: for Supabase tokens, `iss` must be `<SUPABASE_URL>/auth/v1` (audience `authenticated` stays).
4. Fail closed: no JWKS + RS/ES claim → 401/503 (current behavior), never a silent downgrade to HS256.
5. Write `test_auth.py`; add `backend/requirements-dev.txt`.

**Verification commands:**
```powershell
$env:PYTHONIOENCODING='utf-8'; python -m pytest backend/tests -q
python -m compileall backend/app
```

**Exit criteria:** All auth tests green; alg-confusion + wrong-iss forgery rejected; the app boots with existing real tokens (login flow works against staged Supabase).

---

## Step 7 — Add Supabase RLS policies as repo source-of-truth

**Lane:** F · **Order:** any · **Tier:** default (review with `security-reviewer`) · **Recommended skills:** `postgres-patterns`, `database-reviewer`

**Purpose:** Frontend uses the Supabase **anon key** directly against `study_data` and `user_prefs`. Isolation relies entirely on RLS, but **no `.sql` files exist in the repo** (verified: `**/*.sql` → none). If RLS is missing/unconfigured in the project, any user can read/write everyone's data.

**Context brief:** Tables in use (from `frontend/src/services/supabase.ts`):
- `study_data (user_key uuid PK, data jsonb, updated_at)` — queried via `supabase.from('study_data').select('data').eq('user_key', authUser)` and `.upsert(...)` (`supabase.ts:188,198,248,273,278`).
- `user_prefs (user_key uuid PK, lang, dark_mode, updated_at)` — `supabase.ts:248,256`.
- `schedules (user_key text, schedule jsonb, updated_at)` — backend service-role only (`backend/app/routes/schedule.py:72-76`). Must still not be anon-readable unless intended; keep anon-denied.
- `user_key` on the client = `auth.uid()` (real Supabase UUID). Backend uses `sanitize_key(user["sub"])` → same UUID for signed-in users.

Verification-first: write `supabase/migrations/0001_rls.sql` with, per table: `enable row level security`, `using/with check ((user_key = auth.uid()::text OR user_key = auth.uid()))` (uuid comparison — match actual column type; confirm with the Supabase inspector), anon-applicable policies (`roles: 'authenticated'` receive select/insert/update; anon gets nothing), plus a disable-own/deletion policy if the app deletes. Add a `supabase/README.md` note that these must be applied to the live project (they run server-side; can't execute here).

**Tasks:**
1. Confirm real column types in the live Supabase project (uuid vs text) — executor must read the schema before finalizing casts.
2. Write `supabase/migrations/0001_rls.sql`: `enable` + policies on `study_data`, `user_prefs`, `schedules` (service-role owns schedules; anon/authenticated denied).
3. Add `supabase/README.md`: how to apply (`supabase db push` or SQL editor), and a check that anon cannot select another user's row.
4. Sanity: ensure `mergeStudyData`/guest flows (which use `maybeSingle()` with anon before login) fail gracefully to local fallback — they already do (`supabase.ts:189`), no code change expected.

**Verification commands:**
```powershell
# static SQL lint only (no live DB here)
$env:PYTHONIOENCODING='utf-8'; python -c "open('supabase/migrations/0001_rls.sql', encoding='utf-8').read() and print('sql present')"
```

**Exit criteria:** SQL file committed with RLS enabled on all 3 tables, authenticated-scoped policies, anon denied; README documents application steps + how to verify with two test accounts.

---

## Step 8 — Accessibility batch: skip link, lang attr, focus traps, aria-pressed, labels

**Lane:** A · **Order:** after 2 (same variant files) · **Tier:** default · **Recommended skills:** `frontend-a11y`, `accessibility`, `react-patterns`

**Purpose:** Verified gaps: skip link targets nonexistent `#main-content`; `<html lang>` never updates; AI-schedule dialogs lack focus traps; rest-day/time chips lack `aria-pressed`; time inputs unlabeled + `outline-none` without focus-visible.

**Context brief:**
- Skip link lives in the app shell (grep `#main-content`) — target element missing everywhere (verified: no `id="main-content"` in any `.tsx`).
- `frontend/src/hooks/useCycleLang.ts` toggles `document.documentElement.dir` but not `lang`; set `document.documentElement.lang` to the active locale (`badini|en|ar|sorani`).
- `frontend/src/hooks/useFocusTrap.ts` already exists and is used correctly in `ProfileDrawer.tsx` — reuse it in the AI-schedule dialogs of all 6 Schedule variants.
- Rest-day + time chips (see Step 2 anchors) need `aria-pressed={selected}`.
- Time/task inputs in Schedule variants lack accessible labels and use `outline-none` (`OceanSchedule.tsx:209-217` pattern) → add `aria-label`/`label` and visible `focus-visible` ring in each theme.
- Register/streak color-only indicators will be handled in Step 9; focus/markup here only.

Verification-first: extend the vitest a11y smoke (jsdom) or a Playwright check asserting (a) `document.documentElement.lang` matches locale after switching, (b) a focusable element with `id="main-content"` exists, (c) chips expose `aria-pressed`, (d) AI dialog traps Tab. Use `@testing-library/react` if present; else `vitest` + `jsdom` (check devDeps — `@testing-library/react` not listed; add as devDep only if needed, or verify via Playwright instead of growing deps).

**Files:** app shell + `main.tsx`/`useCycleLang` for `lang`/skip target; 6 Schedule variants for chips/labels/focus traps; test file.

**Tasks:**
1. Add `id="main-content"` to the page container (the `<main>` inside each page or a shared shell) so the skip link lands.
2. `useCycleLang`/init: set `document.documentElement.lang` alongside `dir`.
3. Reuse `useFocusTrap` in the 6 AI-schedule modals; ensure Escape+backdrop close already exist.
4. `aria-pressed` on rest-day/time chips; `aria-label` on all time inputs; replace bare `outline-none` with `focus-visible:outline-*` per theme palette.
5. Add the verification test.

**Verification commands:**
```powershell
pnpm typecheck
pnpm test
pnpm build
```

**Exit criteria:** Keyboard-only traverse of Schedule page: skip link works, Tab order reaches every control with visible focus, chips are toggles with announced state, AI modal traps focus, `<html lang>` matches picker.

---

## Step 9 — Timer correctness + Insights null-safety + localized trend badge

**Lane:** G · **Order:** after 1 (needs `trend_*`) · **Tier:** default · **Recommended skills:** `react-testing`, `silent-failure-hunter`, `frontend-patterns`

**Purpose:** (a) XP/`sessions + 1` increment can be lost on rapid saves (`useTimerSession`/`useTimer` write full snapshots); (b) sessions crossing midnight are attributed to the start day; (c) `Insights.tsx` can crash on `weekly_trend === undefined` and shows raw `trend_*` keys.

**Context brief:** Completion writes live in `frontend/src/hooks/useTimerSession.ts` (and `useTimer.ts` for the running session). Open at completion: `session_log` entry gets built from session start; `daily_seconds`/`sessions`/`xp_points` incremented. The save path is `updateStudyData` (full-object upsert, `supabase.ts:194-203`) — concurrent/multiple completions can clobber. Cross-midnight: entry uses the **start** timestamp's weekday (drives StreakCalendar + daily_seconds keying) — attribute to **end** (completion) date instead. `Insights.tsx:~166` empty-state guard, `~277-281` trend chip construction (`trendColors`/`trendIcons[undefined]`), `~246-262` status badges.

**Tasks:**
1. In the completion path, compute the day/week key from the **completion** timestamp (session end), not start; keep the raw start time for display in the log.
2. Make the increment atomic-enough: build the next state off the latest server-merged value and pass the full next object through one `updateStudyData` (single write per completion); add a guard so a second concurrent completion recomputes from the freshest `data` instead of a stale closure (functional setState + refetch if needed). Do not add new backend endpoints.
3. `Insights.tsx`: null-guard `weekly_trend` (default `'stable'`), guard empty `strengths`/session_log in the empty-state path, and render `t(\`trend_${trend}\`, 'stable')` → now resolves locally (`trend_up/down/stable` from Step 1).
4. Extend `frontend/src/utils/sessionLog.test.ts` and add `Insights`-level vitest cases: crossing-midnight attribution and trend-label rendering for all 3 values + undefined.
5. Run full checks.

**Verification commands:**
```powershell
pnpm typecheck
pnpm test
pnpm build
```

**Exit criteria:** Midnight-crossing session lands on completion-day stats; double-completion doesn't lose XP (test-simulated); Insights never throws on partial data and shows localized trend labels.

---

## Step 10 — Full-invariant sweep + adversarial review gate

**Lane:** — · **Order:** last · **Tier:** strongest · **Recommended skills:** `code-reviewer`, `security-reviewer`, `agent-self-evaluation`, `e2e-testing`

**Purpose:** Final gate before merge of each lane: everything compiles, tests pass, no regressions, security review clean, e2e smoke across all 4 langs + 6 themes on the Schedule page.

**Tasks:**
1. Re-run every step's verification block from the merged `main` on a fresh checkout.
2. Run `scripts/check-i18n-keys.py` (or updated path) → all langs identical + superset of required keys.
3. Delegate an adversarial review sub-agent (code-reviewer + security-reviewer) over the full diff of `main..HEAD`: check the blueprint anti-pattern catalog — local-only fixes, dead `DAY_I18N_KEYS`, hidden HS256 path, permissive CSP, missing RLS grant, English leak regressions.
4. Playwright smoke (existing `frontend` playwright devDep): login-less guest flow + timer start/stop + Schedule lang switch in all 4 langs; assert no console errors, no raw `day_/time_/trend_` text.
5. Open release notes; summarize per-lane merge commits.

**Verification commands:** (from repo root)
```powershell
git fetch origin; git status; git diff main..origin/main --stat
$env:PYTHONIOENCODING='utf-8'; python scripts/check-i18n-keys.py
pnpm typecheck; pnpm test; pnpm build
$env:PYTHONIOENCODING='utf-8'; python -m pytest backend/tests -q
```

**Exit criteria:** All checks green; no open critical/high finding from the audit remains; reviewer sub-agents pass; Playwright smoke clean.

---

## Rollback strategy (per step)

- Each step = one focused PR/commit batch → revert commit to roll back; keep schema/data migrations separate from code.
- Step 1/2/8/9 are additive UI/text — rollback-safe (delete keys + revert variants).
- Step 6 changes auth semantics: if a real user's token fails, roll back the auth commit independently (no data migration); verify a second time against stage.
- Step 7 is additive DDL in repo only (not auto-applied here) — zero runtime rollback risk; still do not apply to live DB until RLS verified in a copy.
- Step 5 changes CSP: keep old CSP line in commit diff description for instant revert if a browser regression appears.

## Risks / callouts

- Kurdish weekday spellings need a native-language check (step 1) — flag any guess for human review.
- Tesseract self-hosting is the flakiest step; Option B (CDN allowlist) is the fastest safe fallback.
- `useQuiz` slot-consume timing affects cross-tab UX (two tabs could both see `4` left) — the localStorage helper already handles date keying; keep a small written note in Test file.
- Backend has **no CI and no pytest yet** — Steps 3/6 introduce `requirements-dev.txt`; recommend a GitHub Action in Step 10 follow-up (out of scope unless user opts in).