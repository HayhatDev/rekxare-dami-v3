# Rekxare Dami v3 — Release Notes

Summaries for every commit in `main..origin/main` (the 10-step remediation lane from `plans/fix-everything-audit.md`). All changes are committed locally on `main`, ahead of `origin/main`. Not yet pushed and not yet applied to the live Supabase project.

## Per-commit summary

### `3246e16` — Bug fixes, RLS groundwork, AI/schedule day-key pinning, i18n, a11y (steps 1, 2, 3, 7, 8)
- Fixed the reported bugs and UI defects from the audit.
- Added `supabase/migrations/0001_rls.sql` — row-level security for `study_data` and `user_prefs` (repo-only until applied live).
- Pinned day-key computation server-side for AI advice and schedule aggregation so a shared timezone-independent definition matches the client.
- Full localization pass: all user-facing strings run through `translations.json`; no raw `day_/time_/trend_` text leaks; every interaction has accessible labels.
- Accessibility fixes (focus management, landmarks, label/skip links) across the app.

### `3aea369` — Quiz daily-limit refund and localization (step 4)
- The daily quiz allowance is consumed only when a quiz actually generates; a failed attempt returns the slot.
- Quiz error states (daily limit, no usable text, auth required) are fully localized in all 4 languages.

### `c6a5216` — OCR unblocked from CSP, self-hosted tesseract + fallback (step 5)
- Photo quiz uploads work again under the Content-Security-Policy by self-hosting the tesseract worker/language assets under `/tessdata/`.
- Kept a network fallback so OCR never fully fails offline-ish; CSP still forbids remote script execution.

### `79d0d9d` — JWT verification hardening (step 6)
- Rejects `alg:none`, unknown algorithms, tokens without/with unknown `kid`, mismatched key types, wrong issuer, and tokens signed with Supabase's leaked public default secret.
- Fails closed (401/503) whenever the secret, JWKS fetch, or issuer is unusable.

### `1e1765a` — Timer increments, midnight attribution, insights trend (step 9)
- Timer now increments the elapsed minute during the running session (not only at completion).
- Sessions crossing midnight are attributed to the day they END, matching the insights calendar.
- Insights trend derives `improving / stable / declining` from the last 7 study days instead of a static label.

### `7e90bd6` — Adversarial review fixes + Playwright guest smoke (step 10)
- **RLS migration now compiles regardless of column type**: every policy compares `user_key::text = auth.uid()::text` (a bare `uuid = text` comparison would abort `CREATE POLICY`).
- **Quiz quota buckets by local calendar day** (shared `dayKey`) instead of UTC — the limit used to roll over at 00:00 UTC, not local midnight.
- **Completed sessions are no longer silently dropped** if study data hasn't hydrated yet — the timer awaits the `[studyData]` query before logging.
- **Malformed JWT headers** (e.g. header decodes to a JSON array) now return 401 instead of an unhandled 500.
- Added `frontend/scripts/e2e-smoke.mjs` (`npm run smoke:e2e`): guest-mode run across all 4 languages — timer start/pause/reset, live language cycling, guest-locked routes, quiz upload surface.

## Verification (Step 10 sweep, all green)
- i18n invariant: 4 languages x 361 keys identical (superset of required keys).
- Backend: `pytest` 21 passed; `compileall` clean.
- Frontend: `tsc --noEmit` clean; vitest 86 passed (9 files); `vite build` succeeded.
- E2E guest smoke PASSED (all 4 langs).
- CSP smoke PASSED twice (en/ar/badini; one cold-cache flake on first run, passed on every re-run) — zero CSP violations.
- Adversarial security review: APPROVE (confirmed fix for low-severity 500-to-401 header handling is included in `7e90bd6`).
- Adversarial code review: REQUEST-CHANGES cleared — all findings fixed and re-verified in `7e90bd6`.

## Flags for human review
- **Kurdish weekday spellings** (`day_mon` … `day_sun`) were written without a native reviewer — please confirm against the language as actually spoken (Badini/Sorani).
- **RLS is repo-only.** The live Supabase project does not have these policies yet; the app will keep returning 403s until `supabase/migrations/0001_rls.sql` is applied. Verify on a copy first, then apply.

## Operations needed before/after push
1. Push: `git push origin main` (currently 6 commits ahead of `origin/main`).
2. Apply RLS live (see `supabase/migrations/0001_rls.sql`); confirm `user_key` column type and grant no overly-permissive policy.
3. Ensure the backend environment sets `SUPABASE_SERVICE_ROLE_KEY` (not just the anon key) for server-side writes to `study_data`.
4. Redeploy frontend (Cloudflare Pages) and backend after push; then re-run `npm run smoke:e2e` and the CSP smoke against the deployed URLs.