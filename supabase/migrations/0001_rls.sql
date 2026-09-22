-- 0001_rls.sql
-- Row Level Security source-of-truth for the Rekxare Dami Supabase project.
--
-- The frontend talks to `study_data` and `user_prefs` directly with the **anon
-- key** (`frontend/src/services/supabase.ts`). Isolation therefore relies
-- entirely on RLS: every row is owned by a single user via `user_key`, and only
-- that user (their `auth.uid()`) may select/insert/update it.
--
-- `schedules` is written exclusively by the backend service-role key, so it is
-- locked down with RLS enabled and NO policies: service-role bypasses RLS,
-- while anon/authenticated clients get nothing.
--
-- IMPORTANT: `user_key` may be a `uuid` column or a `text` column depending on
-- how the table was created. To be safe the policies compare against BOTH
-- `auth.uid()` (uuid) and `auth.uid()::text`, so they behave correctly either
-- way. If you inspect the live schema and `user_key` definitely is `uuid`,
-- the `::text` branch is harmless (it simply equals the uuid's text form).

-- ---------------------------------------------------------------------------
-- study_data (user_key, data jsonb, updated_at)
-- ---------------------------------------------------------------------------
ALTER TABLE public.study_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_data FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "study_data_select_own" ON public.study_data;
CREATE POLICY "study_data_select_own"
  ON public.study_data
  FOR SELECT
  TO authenticated
  USING ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

DROP POLICY IF EXISTS "study_data_insert_own" ON public.study_data;
CREATE POLICY "study_data_insert_own"
  ON public.study_data
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

DROP POLICY IF EXISTS "study_data_update_own" ON public.study_data;
CREATE POLICY "study_data_update_own"
  ON public.study_data
  FOR UPDATE
  TO authenticated
  USING ((user_key = auth.uid()) OR (user_key = auth.uid()::text))
  WITH CHECK ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

-- No anon policies: anonymous clients (before login) receive no rows and
-- rely on the client-side local fallback, which `supabase.ts` already does.

-- ---------------------------------------------------------------------------
-- user_prefs (user_key, lang, dark_mode, updated_at)
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_prefs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_prefs_select_own" ON public.user_prefs;
CREATE POLICY "user_prefs_select_own"
  ON public.user_prefs
  FOR SELECT
  TO authenticated
  USING ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

DROP POLICY IF EXISTS "user_prefs_insert_own" ON public.user_prefs;
CREATE POLICY "user_prefs_insert_own"
  ON public.user_prefs
  FOR INSERT
  TO authenticated
  WITH CHECK ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

DROP POLICY IF EXISTS "user_prefs_update_own" ON public.user_prefs;
CREATE POLICY "user_prefs_update_own"
  ON public.user_prefs
  FOR UPDATE
  TO authenticated
  USING ((user_key = auth.uid()) OR (user_key = auth.uid()::text))
  WITH CHECK ((user_key = auth.uid()) OR (user_key = auth.uid()::text));

-- ---------------------------------------------------------------------------
-- schedules (user_key, schedule jsonb, updated_at) — backend service-role only
-- ---------------------------------------------------------------------------
-- RLS enabled with no policies: the backend's service-role / anon key in
-- `backend/app/utils/supabase.py` (service-role) bypasses RLS. Anyone with the
-- anon key (including a signed-in user's browser) is denied all access.
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules FORCE ROW LEVEL SECURITY;