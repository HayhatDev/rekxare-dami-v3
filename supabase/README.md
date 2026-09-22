# Supabase

Source-of-truth database configuration for the Rekxare Dami Supabase project.

## Migrations

SQL migrations live in `supabase/migrations/`, applied in filename order.

### 0001_rls.sql — Row Level Security

Enables RLS on `study_data`, `user_prefs`, and `schedules` so that rows are
isolated per user, and the browser's **anon key** cannot read or write another
user's data.

**Important:** this file is DDL that runs server-side in the Supabase project.
It is committed here as source-of-truth but is NOT auto-applied — the live
project must be updated manually.

### How to apply

Option A — Supabase CLI (if installed):

```bash
supabase db push
```

Option B — SQL editor / Dashboard:

1. Open the Supabase dashboard for the project.
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of `supabase/migrations/0001_rls.sql`.
4. Run the query.

### Verifying the live project

Use two test accounts on two different browsers (or an incognito window):

1. Sign in as Account A, add study data and a preference.
2. Sign in as Account B.
3. Open the browser devtools and confirm:

   - `GET /rest/v1/study_data?user_key=eq.<B>` returns only B's row (empty if
     B has no data), never A's row.
   - The same for `user_prefs`.
   - `GET /rest/v1/schedules?...` returns **403/empty** — it is not exposed to
     the browser at all (backend service-role only).

If Account B can see Account A's row, RLS is not applied (or the table uses a
different `user_key` type than the policy covers) — re-check the column type
vs. `auth.uid()` / `auth.uid()::text`.

4. Signed-in users rely on the local fallback in `frontend/src/services/supabase.ts`
   if a request fails, so an empty pre-login result is expected and safe.

### Table reference

| table        | columns                        | client          |
|--------------|--------------------------------|-----------------|
| `study_data` | `user_key`, `data jsonb`, `updated_at` | browser (anon key) |
| `user_prefs` | `user_key`, `lang`, `dark_mode`, `updated_at` | browser (anon key) |
| `schedules`  | `user_key`, `schedule jsonb`, `updated_at` | backend (service-role) |