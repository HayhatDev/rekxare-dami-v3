import { createClient } from '@supabase/supabase-js';
import { StudyData, ScheduleData, UserPrefs, SessionRecord } from '../types';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl !== '' && supabaseKey !== '';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : null;

function generateSecureId(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export const getUserKey = () => {
  try {
    let key = localStorage.getItem('rekxare_user_key');
    if (!key) {
      key = 'user_' + generateSecureId();
      localStorage.setItem('rekxare_user_key', key);
    }
    return key;
  } catch {
    return 'user_' + generateSecureId();
  }
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  if (!supabase) return {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[Auth] Failed to get session:', err);
  }
  return {};
};

const DEFAULT_STUDY_DATA: StudyData = {
  total_seconds: 0,
  sessions: 0,
  last_subject: '',
  streak: 0,
  last_study_date: null,
  daily_seconds: 0,
  daily_goal_seconds: 7200,
  xp_points: 0,
  xp_level: 1,
  student_name: '',
  session_log: []
};

const DEFAULT_SCHEDULE: ScheduleData = {
  Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
};

function guestKey(suffix: string): string {
  return `rekxare_guest_${getUserKey()}_${suffix}`;
}

// Previous releases persisted guest data under unprefixed localStorage keys
// (e.g. "rekxare_study_data"). The new namespaced keys mean a returning guest
// would otherwise see all their progress "reset". One-time, idempotent
// migration: copy the old value into the new key when the new key is absent.
function migrateLegacyData(newKey: string, legacyKey: string): void {
  try {
    if (!localStorage.getItem(newKey)) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) localStorage.setItem(newKey, legacy);
    }
  } catch {}
}

const localFallback = {
  getStudyData: async (): Promise<StudyData> => {
    try {
      const key = guestKey('study_data');
      migrateLegacyData(key, 'rekxare_study_data');
      const data = localStorage.getItem(key);
      return data ? { ...DEFAULT_STUDY_DATA, ...JSON.parse(data) } : DEFAULT_STUDY_DATA;
    } catch {
      return DEFAULT_STUDY_DATA;
    }
  },
  setStudyData: async (data: StudyData): Promise<void> => {
    try { localStorage.setItem(guestKey('study_data'), JSON.stringify(data)); } catch {}
  },
  getSchedule: async (): Promise<ScheduleData> => {
    try {
      const key = guestKey('schedule');
      migrateLegacyData(key, 'rekxare_schedule');
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : DEFAULT_SCHEDULE;
    } catch {
      return DEFAULT_SCHEDULE;
    }
  },
  setSchedule: async (data: ScheduleData): Promise<void> => {
    try { localStorage.setItem(guestKey('schedule'), JSON.stringify(data)); } catch {}
  },
  getUserPrefs: async (): Promise<UserPrefs> => {
    try {
      const data = localStorage.getItem('rekxare_user_prefs');
      return data ? JSON.parse(data) : { lang: 'badini', dark_mode: false };
    } catch {
      return { lang: 'badini', dark_mode: false };
    }
  },
  setUserPrefs: async (prefs: UserPrefs): Promise<void> => {
    try { localStorage.setItem('rekxare_user_prefs', JSON.stringify(prefs)); } catch {}
  }
};

async function getAuthenticatedUserKey(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id ?? null;
}

/**
 * Pure decision for clearing local guest data after a migration attempt.
 * A payload is only safe to clear when it was persisted upstream (or there was
 * nothing to migrate / the server already had data). If a write failed, the flag
 * stays false so the caller preserves the local copy instead of losing it.
 */
export interface GuestDeletionState {
  hasStudyData: boolean;
  studyServerHasData: boolean;
  studyUpsertOk: boolean;
  hasSchedule: boolean;
  scheduleServerHasData: boolean;
  schedulePostOk: boolean;
}

export function guestKeysToClear(state: GuestDeletionState): { study: boolean; schedule: boolean } {
  return {
    study: !state.hasStudyData || state.studyServerHasData || state.studyUpsertOk,
    schedule: !state.hasSchedule || state.scheduleServerHasData || state.schedulePostOk,
  };
}

/**
 * Union of two study payloads (server row + local copy). Sessions are merged
 * by id so no entry is lost across devices; aggregate counters take the larger
 * value. Used by getStudyData so a signed-in device never clobbers sessions
 * recorded on another device or while offline.
 */
export function mergeStudyData(a: StudyData, b: StudyData): StudyData {
  const byId = new Map<string, SessionRecord>();
  [...a.session_log, ...b.session_log].forEach((r) => {
    if (r && r.id && !byId.has(r.id)) byId.set(r.id, r);
  });
  const session_log = [...byId.values()].sort((x, y) =>
    x.started_at.localeCompare(y.started_at)
  );
  const pickMaxDate = (x: string | null, y: string | null): string | null => {
    if (!x) return y;
    if (!y) return x;
    return x > y ? x : y;
  };
  return {
    total_seconds: Math.max(a.total_seconds, b.total_seconds),
    sessions: Math.max(a.sessions, b.sessions),
    last_subject: a.last_subject || b.last_subject,
    streak: Math.max(a.streak, b.streak),
    last_study_date: pickMaxDate(a.last_study_date, b.last_study_date),
    daily_seconds: Math.max(a.daily_seconds, b.daily_seconds),
    daily_goal_seconds: a.daily_goal_seconds || b.daily_goal_seconds || 7200,
    xp_points: Math.max(a.xp_points, b.xp_points),
    xp_level: Math.max(a.xp_level, b.xp_level),
    student_name: a.student_name || b.student_name,
    session_log,
  };
}

export const api = {
  async getStudyData(): Promise<StudyData> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getStudyData();
    const { data, error } = await supabase.from('study_data').select('data').eq('user_key', authUser).maybeSingle();
    if (error) return localFallback.getStudyData();
    const server = data ? { ...DEFAULT_STUDY_DATA, ...data.data } : DEFAULT_STUDY_DATA;
    const local = await localFallback.getStudyData();
    return mergeStudyData(server, local);
  },
  async updateStudyData(studyData: StudyData): Promise<void> {
    await localFallback.setStudyData(studyData);
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return;
    const { error } = await supabase.from('study_data').upsert({ user_key: authUser, data: studyData, updated_at: new Date().toISOString() });
    if (error) {
      if (import.meta.env.DEV) console.error('[Supabase] Failed to update study_data:', error.message);
      throw new Error(`Failed to save study data: ${error.message}`);
    }
  },
  async getSchedule(): Promise<ScheduleData> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getSchedule();
    try {
      const res = await fetch(`${API_URL}/api/schedule/me`, { headers: await getAuthHeaders() });
      if (res.ok) {
        const data = (await res.json()) as ScheduleData;
        // Trust the server whenever it returns a well-formed schedule — including
        // an intentionally empty one. Only fall back to local storage if the
        // server did not return a usable payload (non-object or empty object).
        if (
          data &&
          typeof data === 'object' &&
          Object.keys(data as object).length > 0 &&
          Object.values(data as object).every((v) => Array.isArray(v))
        ) {
          return data;
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Supabase] Failed to load schedule from backend:', e);
    }
    return localFallback.getSchedule();
  },
  async updateSchedule(schedule: ScheduleData): Promise<void> {
    await localFallback.setSchedule(schedule);
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return;
    try {
      const res = await fetch(`${API_URL}/api/schedule/me`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
        body: JSON.stringify(schedule),
      });
      if (!res.ok) {
        if (import.meta.env.DEV) console.error('[Supabase] Failed to update schedule:', res.status, res.statusText);
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Supabase] Failed to sync schedule to backend:', e);
    }
  },
  async getUserPrefs(): Promise<UserPrefs> {
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return localFallback.getUserPrefs();
    const { data, error } = await supabase.from('user_prefs').select('lang, dark_mode').eq('user_key', authUser).maybeSingle();
    if (error || !data) return localFallback.getUserPrefs();
    return { lang: data.lang, dark_mode: data.dark_mode };
  },
  async updateUserPrefs(prefs: UserPrefs): Promise<void> {
    await localFallback.setUserPrefs(prefs);
    const authUser = await getAuthenticatedUserKey();
    if (!supabase || !authUser) return;
    const { error } = await supabase.from('user_prefs').upsert({ user_key: authUser, lang: prefs.lang, dark_mode: prefs.dark_mode, updated_at: new Date().toISOString() });
    if (error) {
      if (import.meta.env.DEV) console.error('[Supabase] Failed to update user_prefs:', error.message);
      throw new Error(`Failed to save preferences: ${error.message}`);
    }
  },

  async migrateGuestData(): Promise<void> {
    if (!supabase) return;
    const authUser = await getAuthenticatedUserKey();
    if (!authUser) return;
    try {
      const guestStudyData = await localFallback.getStudyData();
      const hasStudyData = guestStudyData.total_seconds > 0 || guestStudyData.sessions > 0;
      let studyServerHasData = false;
      let studyUpsertOk = false;
      if (hasStudyData) {
        const { data: existing } = await supabase.from('study_data').select('data').eq('user_key', authUser).maybeSingle();
        const serverData = existing?.data as StudyData | undefined;
        if (serverData && serverData.total_seconds > 0) {
          studyServerHasData = true; // server already has newer data — nothing to migrate
        } else {
          const { error } = await supabase.from('study_data').upsert({ user_key: authUser, data: guestStudyData, updated_at: new Date().toISOString() });
          studyUpsertOk = !error;
        }
      }

      const guestSchedule = await localFallback.getSchedule();
      const hasSchedule = Object.values(guestSchedule).some((tasks) => tasks.length > 0);
      let scheduleServerHasData = false;
      let schedulePostOk = false;
      if (hasSchedule) {
        try {
          const existingRes = await fetch(`${API_URL}/api/schedule/me`, { headers: await getAuthHeaders() });
          const existingSchedule = existingRes.ok ? await existingRes.json() : null;
          if (!existingSchedule || Object.values(existingSchedule as ScheduleData).every((t) => t.length === 0)) {
            const postRes = await fetch(`${API_URL}/api/schedule/me`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...(await getAuthHeaders()) },
              body: JSON.stringify(guestSchedule),
            });
            schedulePostOk = postRes.ok;
          } else {
            scheduleServerHasData = true; // server already has a schedule — nothing to migrate
          }
        } catch {
          schedulePostOk = false;
        }
      }

      // Remove only the local guest data that was successfully moved upstream.
      const { study, schedule } = guestKeysToClear({
        hasStudyData,
        studyServerHasData,
        studyUpsertOk,
        hasSchedule,
        scheduleServerHasData,
        schedulePostOk,
      });
      const keysToRemove: string[] = [];
      if (study) keysToRemove.push(guestKey('study_data'));
      if (schedule) keysToRemove.push(guestKey('schedule'));
      try {
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[Supabase] Guest data migration failed:', err);
    }
  }
};
